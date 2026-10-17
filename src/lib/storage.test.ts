import { describe, expect, it } from "vitest";
import {
  CORRUPT_BACKUP_KEY,
  LAST_EXPORT_KEY,
  STORAGE_KEY,
  clearData,
  emptyData,
  isValidDate,
  loadData,
  loadLastExport,
  parseData,
  parseDataText,
  saveData,
  saveLastExport,
  serializeForExport,
  type KeyValueStore,
} from "./storage";
import type { AppData } from "./types";

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

function sample(): AppData {
  return {
    schemaVersion: 1,
    org: { name: "Acme Machining" },
    progress: {
      "3.1.1": { status: "implemented", owner: "Pat", dueDate: "2026-12-01", notes: "Done in M365", updatedAt: "2026-10-01T12:00:00.000Z" },
      "3.5.3": { status: "in_progress", owner: "", dueDate: null, notes: "", updatedAt: "2026-10-02T12:00:00.000Z" },
    },
  };
}

describe("save/load round trip", () => {
  it("restores exactly what was saved", () => {
    const store = memoryStore();
    expect(saveData(store, sample())).toBe(true);
    expect(loadData(store)).toEqual({ data: sample() });
  });

  it("returns empty data when nothing is saved", () => {
    expect(loadData(memoryStore())).toEqual({ data: emptyData() });
  });

  it("exported JSON re-imports to the same state", () => {
    const result = parseDataText(serializeForExport(sample()));
    expect(result).toEqual({ ok: true, data: sample() });
  });

  it("keeps progress for IDs not in the current content", () => {
    const d = sample();
    d.progress["3.14.7"] = { ...d.progress["3.5.3"] };
    expect(parseData(d)).toEqual({ ok: true, data: d });
  });
});

describe("storage unavailable", () => {
  it("works without storage", () => {
    expect(loadData(null)).toEqual({ data: emptyData() });
    expect(saveData(null, sample())).toBe(false);
    expect(clearData(null)).toBe(false);
  });

  it("never throws when storage throws", () => {
    expect(loadData(throwingStore)).toEqual({ data: emptyData() });
    expect(saveData(throwingStore, sample())).toBe(false);
    expect(clearData(throwingStore)).toBe(false);
  });
});

describe("unreadable saved data", () => {
  it("starts fresh with a warning and keeps a copy of the original", () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, "{not json");
    const result = loadData(store);
    expect(result.data).toEqual(emptyData());
    expect(result.warning).toBeTruthy();
    expect(store.getItem(CORRUPT_BACKUP_KEY)).toBe("{not json");
  });
});

describe("import validation", () => {
  const reject = (value: unknown) => {
    const r = typeof value === "string" ? parseDataText(value) : parseData(value);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
  };

  it("rejects invalid JSON", () => reject("this is not json"));
  it("rejects non-objects", () => {
    reject([]);
    reject(null);
    reject("\"a string\"");
  });
  it("rejects a missing or wrong schemaVersion", () => {
    const { schemaVersion: _omit, ...noVersion } = sample();
    reject(noVersion);
    reject({ ...sample(), schemaVersion: 2 });
  });
  it("rejects a malformed org or progress", () => {
    reject({ ...sample(), org: null });
    reject({ ...sample(), org: { name: 5 } });
    reject({ ...sample(), progress: [] });
  });
  it("rejects malformed entries", () => {
    const entry = sample().progress["3.1.1"];
    reject({ ...sample(), progress: { "3.1.1": { ...entry, status: "done" } } });
    reject({ ...sample(), progress: { "3.1.1": { ...entry, owner: null } } });
    reject({ ...sample(), progress: { "3.1.1": { ...entry, dueDate: "next week" } } });
    reject({ ...sample(), progress: { "3.1.1": { ...entry, notes: undefined } } });
    reject({ ...sample(), progress: { "3.1.1": "implemented" } });
  });

  it("rejects keys that aren't requirement IDs, including __proto__", () => {
    const entry = sample().progress["3.1.1"];
    reject({ ...sample(), progress: { "not-an-id": entry } });
    reject(JSON.parse(`{"schemaVersion":1,"org":{"name":""},"progress":{"__proto__":${JSON.stringify(entry)}}}`));
  });

  it("rejects impossible due dates", () => {
    const entry = sample().progress["3.1.1"];
    reject({ ...sample(), progress: { "3.1.1": { ...entry, dueDate: "2026-13-45" } } });
    reject({ ...sample(), progress: { "3.1.1": { ...entry, dueDate: "2026-02-30" } } });
  });

  it("drops unknown extra fields", () => {
    const withExtra = { ...sample(), extra: true, org: { name: "X", ssn: "nope" } };
    const r = parseData(withExtra);
    expect(r.ok && r.data).toEqual({ ...sample(), org: { name: "X" } });
  });

  it("a rejected import leaves saved data untouched", () => {
    const store = memoryStore();
    saveData(store, sample());
    const before = store.getItem(STORAGE_KEY);
    expect(parseDataText("{\"schemaVersion\": 1}").ok).toBe(false);
    expect(store.getItem(STORAGE_KEY)).toBe(before);
  });
});

describe("isValidDate", () => {
  it("accepts real dates and rejects others", () => {
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-1-05")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("reset", () => {
  it("also deletes the copy of unreadable data", () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, "{not json");
    loadData(store);
    expect(store.getItem(CORRUPT_BACKUP_KEY)).not.toBeNull();
    clearData(store);
    expect([...store.map.keys()]).toEqual([]);
  });

  it("clears saved data", () => {
    const store = memoryStore();
    saveData(store, sample());
    expect(clearData(store)).toBe(true);
    expect(store.getItem(STORAGE_KEY)).toBeNull();
    expect(loadData(store)).toEqual({ data: emptyData() });
  });
});

describe("export stamp (exportedAt)", () => {
  it("reads old backups that have no exportedAt", () => {
    const old = JSON.stringify(sample());
    const r = parseDataText(old);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual(sample());
      expect(r.exportedAt).toBeUndefined();
    }
  });

  it("adds exportedAt to exported files and returns it on import, outside the app data", () => {
    const text = serializeForExport(sample(), "2026-10-17T15:05:00.000Z");
    expect(JSON.parse(text).exportedAt).toBe("2026-10-17T15:05:00.000Z");
    const r = parseDataText(text);
    expect(r).toEqual({ ok: true, data: sample(), exportedAt: "2026-10-17T15:05:00.000Z" });
    if (r.ok) expect("exportedAt" in r.data).toBe(false);
  });

  it("keeps schemaVersion 1 in exported files", () => {
    expect(JSON.parse(serializeForExport(sample(), "2026-10-17T15:05:00.000Z")).schemaVersion).toBe(1);
  });

  it("rejects a malformed exportedAt instead of guessing", () => {
    const bad = (exportedAt: unknown) => parseData({ ...sample(), exportedAt });
    expect(bad("yesterday").ok).toBe(false);
    expect(bad(12345).ok).toBe(false);
    expect(bad(null).ok).toBe(false);
  });

  it("never saves exportedAt into the browser's copy", () => {
    const store = memoryStore();
    const r = parseDataText(serializeForExport(sample(), "2026-10-17T15:05:00.000Z"));
    if (r.ok) saveData(store, r.data);
    expect(store.getItem(STORAGE_KEY)).not.toContain("exportedAt");
  });
});

describe("last export time", () => {
  it("is null before any export and round-trips after one", () => {
    const store = memoryStore();
    expect(loadLastExport(store)).toBeNull();
    expect(saveLastExport(store, "2026-10-17T15:05:00.000Z")).toBe(true);
    expect(store.getItem(LAST_EXPORT_KEY)).toBe("2026-10-17T15:05:00.000Z");
    expect(loadLastExport(store)).toBe("2026-10-17T15:05:00.000Z");
  });

  it("ignores an unreadable stored value", () => {
    const store = memoryStore();
    store.setItem(LAST_EXPORT_KEY, "garbage");
    expect(loadLastExport(store)).toBeNull();
  });

  it("never throws when storage is missing or throws", () => {
    expect(loadLastExport(null)).toBeNull();
    expect(saveLastExport(null, "2026-10-17T15:05:00.000Z")).toBe(false);
    expect(loadLastExport(throwingStore)).toBeNull();
    expect(saveLastExport(throwingStore, "2026-10-17T15:05:00.000Z")).toBe(false);
  });

  it("is cleared by reset", () => {
    const store = memoryStore();
    saveData(store, sample());
    saveLastExport(store, "2026-10-17T15:05:00.000Z");
    clearData(store);
    expect([...store.map.keys()]).toEqual([]);
  });
});
