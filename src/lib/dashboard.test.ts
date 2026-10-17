import { describe, expect, it } from "vitest";
import { familyProgress, formatDueDate, isOverdue, percent, stillToAddress, summarize } from "./dashboard";
import { emptyData } from "./storage";
import type { AppData, ProgressEntry, Requirement } from "./types";

function req(id: string, family: Requirement["family"]): Requirement {
  return {
    id,
    family,
    text: `Text ${id}`,
    plainEnglish: "p",
    whyItMatters: "w",
    examples: ["e"],
    evidence: ["v"],
    sprsPoints: null,
    objectives: [`${id}[a]`],
    relatedIds: [],
    reviewed: false,
  };
}

const REQS = [
  req("3.1.1", "Access Control"),
  req("3.1.2", "Access Control"),
  req("3.5.1", "Identification and Authentication"),
  req("3.5.2", "Identification and Authentication"),
  req("3.9.1", "Personnel Security"),
];

function track(d: AppData, id: string, patch: Partial<ProgressEntry>) {
  d.progress[id] = { status: "not_started", owner: "", dueDate: null, notes: "", updatedAt: "x", ...patch };
}

describe("percent", () => {
  it("rounds down so 100% only appears when everything is addressed", () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(200, 200)).toBe(100);
  });

  it("is 0 when there is nothing to count", () => {
    expect(percent(0, 0)).toBe(0);
  });
});

describe("summarize", () => {
  it("counts untracked requirements as not started", () => {
    const s = summarize(REQS, emptyData());
    expect(s).toEqual({
      total: 5,
      counts: { not_started: 5, in_progress: 0, implemented: 0, not_applicable: 0 },
      addressed: 0,
      percent: 0,
    });
  });

  it("treats implemented and not applicable as addressed", () => {
    const d = emptyData();
    track(d, "3.1.1", { status: "implemented" });
    track(d, "3.5.1", { status: "not_applicable" });
    track(d, "3.9.1", { status: "in_progress" });
    const s = summarize(REQS, d);
    expect(s.addressed).toBe(2);
    expect(s.percent).toBe(40);
    expect(s.counts).toEqual({ not_started: 2, in_progress: 1, implemented: 1, not_applicable: 1 });
  });

  it("ignores saved progress for IDs that are not in the content", () => {
    const d = emptyData();
    track(d, "3.14.7", { status: "implemented" });
    expect(summarize(REQS, d).addressed).toBe(0);
  });
});

describe("familyProgress", () => {
  it("returns one row per family with content, in document order", () => {
    const d = emptyData();
    track(d, "3.1.1", { status: "implemented" });
    track(d, "3.1.2", { status: "in_progress" });
    track(d, "3.9.1", { status: "not_applicable" });
    expect(familyProgress(REQS, d)).toEqual([
      { family: "Access Control", total: 2, addressed: 1, inProgress: 1, percent: 50 },
      { family: "Identification and Authentication", total: 2, addressed: 0, inProgress: 0, percent: 0 },
      { family: "Personnel Security", total: 1, addressed: 1, inProgress: 0, percent: 100 },
    ]);
  });
});

describe("isOverdue", () => {
  it("is true only for a due date strictly before today", () => {
    expect(isOverdue("2026-10-16", "2026-10-17")).toBe(true);
    expect(isOverdue("2026-10-17", "2026-10-17")).toBe(false);
    expect(isOverdue(null, "2026-10-17")).toBe(false);
  });
});

describe("stillToAddress", () => {
  it("excludes implemented and not applicable requirements", () => {
    const d = emptyData();
    track(d, "3.1.1", { status: "implemented" });
    track(d, "3.1.2", { status: "not_applicable" });
    expect(stillToAddress(REQS, d, "2026-10-17").map((i) => i.requirement.id)).toEqual(["3.5.1", "3.5.2", "3.9.1"]);
  });

  it("puts overdue first, then soonest due date, then undated items in ID order", () => {
    const d = emptyData();
    track(d, "3.1.1", { dueDate: "2026-12-01" });
    track(d, "3.1.2", { dueDate: "2026-10-01", status: "in_progress" });
    track(d, "3.5.1", { dueDate: "2026-11-01" });
    const items = stillToAddress(REQS, d, "2026-10-17");
    expect(items.map((i) => i.requirement.id)).toEqual(["3.1.2", "3.5.1", "3.1.1", "3.5.2", "3.9.1"]);
    expect(items.map((i) => i.overdue)).toEqual([true, false, false, false, false]);
  });

  it("includes each item's progress entry, defaulting untracked ones", () => {
    const d = emptyData();
    track(d, "3.5.2", { owner: "Sam", status: "in_progress" });
    const item = stillToAddress(REQS, d, "2026-10-17").find((i) => i.requirement.id === "3.5.2");
    expect(item?.entry.owner).toBe("Sam");
    expect(stillToAddress(REQS, d, "2026-10-17")[0].entry.status).toBe("not_started");
  });
});

describe("formatDueDate", () => {
  it("formats the calendar date as written, regardless of time zone", () => {
    // new Date("2026-10-01") is UTC midnight, which is Sep 30 in US time zones.
    expect(formatDueDate("2026-10-01", "en-US")).toBe("Oct 1, 2026");
  });
});
