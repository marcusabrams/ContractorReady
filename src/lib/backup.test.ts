import { describe, expect, it } from "vitest";
import { changesSince, formatTimestamp, latestUpdate, mergeData, needsBackupReminder } from "./backup";
import { emptyData } from "./storage";
import type { AppData, ProgressEntry } from "./types";

function entry(updatedAt: string, patch: Partial<ProgressEntry> = {}): ProgressEntry {
  return { status: "in_progress", owner: "", dueDate: null, notes: "", updatedAt, ...patch };
}

function data(orgName: string, progress: Record<string, ProgressEntry>): AppData {
  return { ...emptyData(), org: { name: orgName }, progress };
}

describe("mergeData", () => {
  it("takes the file's entry when the file's change is newer", () => {
    const current = data("Acme", { "3.1.1": entry("2026-10-01T00:00:00.000Z", { owner: "Pat" }) });
    const incoming = data("Acme", { "3.1.1": entry("2026-10-05T00:00:00.000Z", { owner: "Sam" }) });
    const { data: merged, summary } = mergeData(current, incoming);
    expect(merged.progress["3.1.1"].owner).toBe("Sam");
    expect(summary.fileNewer).toEqual(["3.1.1"]);
    expect(summary.yoursNewer).toEqual([]);
  });

  it("keeps your entry when your change is newer", () => {
    const current = data("Acme", { "3.1.1": entry("2026-10-05T00:00:00.000Z", { owner: "Pat" }) });
    const incoming = data("Acme", { "3.1.1": entry("2026-10-01T00:00:00.000Z", { owner: "Sam" }) });
    const { data: merged, summary } = mergeData(current, incoming);
    expect(merged.progress["3.1.1"].owner).toBe("Pat");
    expect(summary.yoursNewer).toEqual(["3.1.1"]);
    expect(summary.fileNewer).toEqual([]);
  });

  it("keeps your entry on a tie", () => {
    const t = "2026-10-03T12:00:00.000Z";
    const current = data("Acme", { "3.1.1": entry(t, { owner: "Pat" }) });
    const incoming = data("Acme", { "3.1.1": entry(t, { owner: "Sam" }) });
    const { data: merged, summary } = mergeData(current, incoming);
    expect(merged.progress["3.1.1"].owner).toBe("Pat");
    expect(summary.tied).toEqual(["3.1.1"]);
    expect(summary.fileNewer).toEqual([]);
  });

  it("keeps IDs found on only one side", () => {
    const current = data("Acme", { "3.1.2": entry("2026-10-01T00:00:00.000Z") });
    const incoming = data("Acme", { "3.5.3": entry("2026-10-01T00:00:00.000Z") });
    const { data: merged, summary } = mergeData(current, incoming);
    expect(Object.keys(merged.progress).sort()).toEqual(["3.1.2", "3.5.3"]);
    expect(summary.onlyInFile).toEqual(["3.5.3"]);
    expect(summary.onlyHere).toEqual(["3.1.2"]);
  });

  it("lists IDs in requirement order", () => {
    const t = "2026-10-01T00:00:00.000Z";
    const incoming = data("", { "3.1.10": entry(t), "3.1.2": entry(t), "3.10.1": entry(t), "3.9.2": entry(t) });
    expect(mergeData(emptyData(), incoming).summary.onlyInFile).toEqual(["3.1.2", "3.1.10", "3.9.2", "3.10.1"]);
  });

  it("keeps your organization name unless it is empty", () => {
    expect(mergeData(data("Acme", {}), data("Other Co", {})).data.org.name).toBe("Acme");
    expect(mergeData(data("", {}), data("Other Co", {})).data.org.name).toBe("Other Co");
    expect(mergeData(data("   ", {}), data("Other Co", {})).data.org.name).toBe("Other Co");
    expect(mergeData(data("Acme", {}), data("", {})).data.org.name).toBe("Acme");
  });

  it("reports which organization name was used", () => {
    expect(mergeData(data("Acme", {}), data("Other Co", {})).summary.orgName).toBe("kept");
    expect(mergeData(data("", {}), data("Other Co", {})).summary.orgName).toBe("fromFile");
  });

  it("does not mutate its inputs, and returns copies of the entries", () => {
    const current = data("", { "3.1.1": entry("2026-10-01T00:00:00.000Z"), "3.1.2": entry("2026-10-09T00:00:00.000Z") });
    const incoming = data("Other Co", { "3.1.1": entry("2026-10-05T00:00:00.000Z"), "3.5.3": entry("2026-10-01T00:00:00.000Z") });
    const before = structuredClone({ current, incoming });
    const { data: merged } = mergeData(current, incoming);
    expect({ current, incoming }).toEqual(before);
    expect(merged.progress["3.1.1"]).not.toBe(incoming.progress["3.1.1"]);
    expect(merged.progress["3.1.2"]).not.toBe(current.progress["3.1.2"]);
    expect(merged.progress).not.toBe(current.progress);
    expect(merged.org).not.toBe(current.org);
  });

  it("treats an unparseable updatedAt as the oldest", () => {
    const good = "2020-01-01T00:00:00.000Z";
    // File entry unreadable: yours wins.
    let r = mergeData(data("", { "3.1.1": entry(good, { owner: "Pat" }) }), data("", { "3.1.1": entry("not a date", { owner: "Sam" }) }));
    expect(r.data.progress["3.1.1"].owner).toBe("Pat");
    expect(r.summary.yoursNewer).toEqual(["3.1.1"]);
    // Your entry unreadable (including an empty string): the file wins.
    r = mergeData(data("", { "3.1.1": entry("", { owner: "Pat" }) }), data("", { "3.1.1": entry(good, { owner: "Sam" }) }));
    expect(r.data.progress["3.1.1"].owner).toBe("Sam");
    expect(r.summary.fileNewer).toEqual(["3.1.1"]);
    // Both unreadable: a tie, so yours is kept.
    r = mergeData(data("", { "3.1.1": entry("junk", { owner: "Pat" }) }), data("", { "3.1.1": entry("also junk", { owner: "Sam" }) }));
    expect(r.data.progress["3.1.1"].owner).toBe("Pat");
    expect(r.summary.tied).toEqual(["3.1.1"]);
  });

  it("compares instants, not strings", () => {
    // Same moment written two ways is a tie; a later moment with an earlier-sorting string still wins.
    let r = mergeData(data("", { "3.1.1": entry("2026-10-01T10:00:00Z") }), data("", { "3.1.1": entry("2026-10-01T12:00:00+02:00") }));
    expect(r.summary.tied).toEqual(["3.1.1"]);
    r = mergeData(data("", { "3.1.1": entry("2026-10-01T10:00:00Z") }), data("", { "3.1.1": entry("2026-10-01T09:00:00-05:00") }));
    expect(r.summary.fileNewer).toEqual(["3.1.1"]);
  });
});

describe("changesSince", () => {
  const d = data("", {
    "3.1.1": entry("2026-10-01T00:00:00.000Z"),
    "3.1.2": entry("2026-10-10T00:00:00.000Z"),
    "3.1.3": entry("2026-10-12T00:00:00.000Z"),
    "3.1.4": entry("garbage"),
  });

  it("counts every tracked requirement when there has never been an export", () => {
    expect(changesSince(d, null)).toBe(4);
    expect(changesSince(emptyData(), null)).toBe(0);
  });

  it("counts only requirements changed after the last export", () => {
    expect(changesSince(d, "2026-10-05T00:00:00.000Z")).toBe(2);
    expect(changesSince(d, "2026-10-20T00:00:00.000Z")).toBe(0);
  });

  it("does not count a change made at the same moment as the export", () => {
    expect(changesSince(d, "2026-10-12T00:00:00.000Z")).toBe(0);
  });

  it("treats an unreadable last-export time as never exported", () => {
    expect(changesSince(d, "not a date")).toBe(4);
  });
});

describe("needsBackupReminder", () => {
  const now = new Date("2026-10-31T12:00:00.000Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

  it("is false when there are no unexported changes", () => {
    expect(needsBackupReminder(0, null, now)).toBe(false);
    expect(needsBackupReminder(0, daysAgo(60), now)).toBe(false);
  });

  it("is true when there are changes and no export has ever been made", () => {
    expect(needsBackupReminder(3, null, now)).toBe(true);
    expect(needsBackupReminder(3, "not a date", now)).toBe(true);
  });

  it("is true only when the last export is more than 14 days old", () => {
    expect(needsBackupReminder(3, daysAgo(13), now)).toBe(false);
    expect(needsBackupReminder(3, daysAgo(14), now)).toBe(false);
    expect(needsBackupReminder(3, daysAgo(15), now)).toBe(true);
  });
});

describe("latestUpdate", () => {
  it("returns the most recent readable change time", () => {
    const d = data("", {
      "3.1.1": entry("2026-10-01T00:00:00.000Z"),
      "3.1.2": entry("2026-10-12T08:30:00.000Z"),
      "3.1.3": entry("junk"),
    });
    expect(latestUpdate(d)).toBe("2026-10-12T08:30:00.000Z");
  });

  it("is null when nothing has a readable change time", () => {
    expect(latestUpdate(emptyData())).toBeNull();
    expect(latestUpdate(data("", { "3.1.1": entry("") }))).toBeNull();
  });
});

describe("formatTimestamp", () => {
  it("formats an ISO timestamp as a date and time", () => {
    expect(formatTimestamp("2026-10-17T15:05:00.000Z", "en-US", "UTC")).toBe("Oct 17, 2026, 3:05 PM");
  });

  it("returns the input unchanged when it is not a readable date", () => {
    expect(formatTimestamp("junk", "en-US", "UTC")).toBe("junk");
  });
});
