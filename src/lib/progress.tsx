import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STORAGE_KEY, clearData, emptyData, getBrowserStorage, loadData, parseDataText, saveData } from "./storage";
import type { AppData, ProgressEntry } from "./types";

export const DEFAULT_ENTRY: Omit<ProgressEntry, "updatedAt"> = {
  status: "not_started",
  owner: "",
  dueDate: null,
  notes: "",
};

export function entryFor(data: AppData, id: string): ProgressEntry {
  return data.progress[id] ?? { ...DEFAULT_ENTRY, updatedAt: "" };
}

/** Distinct, non-empty owner names in alphabetical order. */
export function listOwners(data: AppData): string[] {
  const owners = new Set(Object.values(data.progress).map((e) => e.owner.trim()).filter(Boolean));
  return [...owners].sort((a, b) => a.localeCompare(b));
}

interface ProgressContextValue {
  data: AppData;
  /** False when localStorage is blocked or unavailable; the app still works but nothing persists. */
  storageAvailable: boolean;
  /** True when the most recent write to storage failed (for example, storage is full). */
  saveFailed: boolean;
  /** Message shown when previously saved data couldn't be read on startup. */
  loadWarning?: string;
  dismissLoadWarning: () => void;
  getEntry: (id: string) => ProgressEntry;
  updateEntry: (id: string, patch: Partial<Omit<ProgressEntry, "updatedAt">>) => void;
  setOrgName: (name: string) => void;
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getBrowserStorage(), []);
  const [initial] = useState(() => loadData(store));
  const [data, setData] = useState<AppData>(initial.data);
  const [loadWarning, setLoadWarning] = useState(initial.warning);
  const [saveFailed, setSaveFailed] = useState(false);
  // The object currently persisted (or deliberately not persisted). Autosave
  // writes only when `data` is a different object, so the initial render and
  // StrictMode's repeated effects never write unchanged data.
  const persisted = useRef<AppData>(initial.data);

  useEffect(() => {
    if (!store || data === persisted.current) return;
    persisted.current = data;
    setSaveFailed(!saveData(store, data));
  }, [data, store]);

  // Keep tabs in sync. Without this, two open tabs each autosave their own copy
  // and the last one to save silently erases the other's edits. The browser fires
  // "storage" only in the *other* tabs, so there is no echo back to the writer.
  useEffect(() => {
    if (!store) return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || (e.key !== STORAGE_KEY && e.key !== null)) return;
      let next: AppData;
      if (e.newValue === null) {
        next = emptyData(); // another tab reset (key removed) or cleared all storage
      } else {
        const parsed = parseDataText(e.newValue);
        if (!parsed.ok) return; // ignore an unreadable write; keep what this tab has
        next = parsed.data;
      }
      persisted.current = next; // already in storage, so don't write it back
      setData(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  const updateEntry = useCallback<ProgressContextValue["updateEntry"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [id]: { ...entryFor(prev, id), ...patch, updatedAt: new Date().toISOString() },
      },
    }));
  }, []);

  const setOrgName = useCallback((name: string) => setData((prev) => ({ ...prev, org: { name } })), []);
  const replaceAll = useCallback((next: AppData) => setData(next), []);
  const resetAll = useCallback(() => {
    const fresh = emptyData();
    persisted.current = fresh;
    setSaveFailed(store !== null && !clearData(store));
    setData(fresh);
  }, [store]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      data,
      storageAvailable: store !== null,
      saveFailed,
      loadWarning,
      dismissLoadWarning: () => setLoadWarning(undefined),
      getEntry: (id) => entryFor(data, id),
      updateEntry,
      setOrgName,
      replaceAll,
      resetAll,
    }),
    [data, store, saveFailed, loadWarning, updateEntry, setOrgName, replaceAll, resetAll],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
