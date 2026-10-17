import { groupByFamily } from "./content";
import { entryFor } from "./progress";
import { STATUSES, type AppData, type Family, type ProgressEntry, type Requirement, type Status } from "./types";

/** "Addressed" means nothing more to do: implemented, or not applicable to this organization. */
const isAddressed = (s: Status) => s === "implemented" || s === "not_applicable";

/** Whole-number percentage, rounded down so 100% only appears when every item is addressed. */
export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.floor((part / total) * 100);
}

export interface Summary {
  total: number;
  counts: Record<Status, number>;
  addressed: number;
  percent: number;
}

export function summarize(requirements: Requirement[], data: AppData): Summary {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const r of requirements) counts[entryFor(data, r.id).status]++;
  const addressed = counts.implemented + counts.not_applicable;
  return { total: requirements.length, counts, addressed, percent: percent(addressed, requirements.length) };
}

export interface FamilyProgress {
  family: Family;
  total: number;
  addressed: number;
  inProgress: number;
  percent: number;
}

export function familyProgress(requirements: Requirement[], data: AppData): FamilyProgress[] {
  return groupByFamily(requirements).map(({ family, items }) => {
    const statuses = items.map((r) => entryFor(data, r.id).status);
    const addressed = statuses.filter(isAddressed).length;
    return {
      family,
      total: items.length,
      addressed,
      inProgress: statuses.filter((s) => s === "in_progress").length,
      percent: percent(addressed, items.length),
    };
  });
}

/** Both dates are YYYY-MM-DD, so string comparison is date comparison. */
export function isOverdue(dueDate: string | null, today: string): boolean {
  return dueDate !== null && dueDate < today;
}

/** Today's date in the viewer's own time zone, as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface OpenItem {
  requirement: Requirement;
  entry: ProgressEntry;
  overdue: boolean;
}

/**
 * Requirements not yet addressed, most urgent first: overdue, then by due date,
 * then undated. Ties keep content (document) order.
 */
export function stillToAddress(requirements: Requirement[], data: AppData, today: string): OpenItem[] {
  const items = requirements
    .map((requirement) => {
      const entry = entryFor(data, requirement.id);
      return { requirement, entry, overdue: isOverdue(entry.dueDate, today) };
    })
    .filter((i) => !isAddressed(i.entry.status));
  // Array.prototype.sort is stable, so equal keys stay in document order.
  return items.sort((a, b) => {
    const da = a.entry.dueDate ?? "9999-99-99";
    const db = b.entry.dueDate ?? "9999-99-99";
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

/**
 * Formats a YYYY-MM-DD due date for display. Formatting in UTC keeps the calendar
 * date as entered; `new Date("2026-10-01")` would show as Sep 30 in US time zones.
 */
export function formatDueDate(date: string, locale?: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
}
