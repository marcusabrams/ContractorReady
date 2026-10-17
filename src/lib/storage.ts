import { STATUSES, type AppData, type ProgressEntry } from "./types";

export const STORAGE_KEY = "n171tracker.v1";
/** Where unreadable saved data is moved so it is never silently overwritten. */
export const CORRUPT_BACKUP_KEY = "n171tracker.v1.unreadable-backup";
export const SCHEMA_VERSION = 1;
/** Largest backup file we will read. A full backup with long notes is well under 1 MB. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** The subset of the Web Storage API we use, so tests can pass an in-memory fake. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function emptyData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, org: { name: "" }, progress: {} };
}

/** Returns window.localStorage if it exists and is writable, otherwise null. */
export function getBrowserStorage(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = "__n171tracker_probe__";
    s.setItem(probe, probe);
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export type ParseResult = { ok: true; data: AppData } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ID_RE = /^3\.\d{1,2}\.\d{1,2}$/;

/** True for a real calendar date in YYYY-MM-DD form (rejects 2026-13-45, 2026-02-30). */
export function isValidDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/**
 * Validates an unknown value (from storage or an imported file) against the
 * schemaVersion 1 shape. Returns a fresh, clean copy on success; unknown extra
 * fields are dropped.
 */
export function parseData(value: unknown): ParseResult {
  if (!isObject(value)) return { ok: false, error: "The file doesn't contain a tracker backup (expected a JSON object)." };
  if (value.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        value.schemaVersion === undefined
          ? "The file is missing a schemaVersion, so it doesn't look like a tracker backup."
          : `Unsupported schemaVersion ${JSON.stringify(value.schemaVersion)}. This version of the tracker reads version ${SCHEMA_VERSION}.`,
    };
  }
  if (!isObject(value.org) || typeof value.org.name !== "string") {
    return { ok: false, error: "The backup's organization section is missing or malformed." };
  }
  if (!isObject(value.progress)) return { ok: false, error: "The backup's progress section is missing or malformed." };

  const progress: Record<string, ProgressEntry> = {};
  for (const [id, entry] of Object.entries(value.progress)) {
    // Allowlisting the key shape also rules out "__proto__" and similar keys.
    if (!ID_RE.test(id)) return { ok: false, error: `The backup contains an unrecognized requirement ID ${JSON.stringify(id)}.` };
    if (!isObject(entry)) return { ok: false, error: `Progress for ${id} is malformed.` };
    const { status, owner, dueDate, notes, updatedAt } = entry;
    if (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status)) {
      return { ok: false, error: `Progress for ${id} has an unknown status ${JSON.stringify(status)}.` };
    }
    if (typeof owner !== "string") return { ok: false, error: `Progress for ${id} has a malformed owner.` };
    if (!(dueDate === null || (typeof dueDate === "string" && isValidDate(dueDate)))) {
      return { ok: false, error: `Progress for ${id} has a malformed due date (expected YYYY-MM-DD or null).` };
    }
    if (typeof notes !== "string") return { ok: false, error: `Progress for ${id} has malformed notes.` };
    if (typeof updatedAt !== "string") return { ok: false, error: `Progress for ${id} has a malformed updatedAt.` };
    progress[id] = { status: status as ProgressEntry["status"], owner, dueDate, notes, updatedAt };
  }
  return { ok: true, data: { schemaVersion: SCHEMA_VERSION, org: { name: value.org.name }, progress } };
}

/** Parses JSON text (an imported file) and validates it. Never throws. */
export function parseDataText(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file isn't valid JSON. Choose a backup file exported from this tracker." };
  }
  return parseData(json);
}

export interface LoadResult {
  data: AppData;
  /** Set when saved data existed but couldn't be read; it was moved to CORRUPT_BACKUP_KEY. */
  warning?: string;
}

export function loadData(store: KeyValueStore | null): LoadResult {
  if (!store) return { data: emptyData() };
  let text: string | null;
  try {
    text = store.getItem(STORAGE_KEY);
  } catch {
    return { data: emptyData() };
  }
  if (text === null) return { data: emptyData() };
  const result = parseDataText(text);
  if (result.ok) return { data: result.data };
  try {
    store.setItem(CORRUPT_BACKUP_KEY, text);
  } catch {
    // Best effort only.
  }
  return {
    data: emptyData(),
    warning: `Your saved progress couldn't be read (${result.error}) A copy was kept in this browser, and the tracker started fresh.`,
  };
}

export function saveData(store: KeyValueStore | null, data: AppData): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Deletes everything the tracker has stored in this browser, including any unreadable-data copy. */
export function clearData(store: KeyValueStore | null): boolean {
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY);
    store.removeItem(CORRUPT_BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}

export function serializeForExport(data: AppData): string {
  return JSON.stringify(data, null, 2) + "\n";
}
