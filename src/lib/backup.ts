import { compareIds } from "./content";
import type { AppData, ProgressEntry } from "./types";

/** Milliseconds since the epoch, or -Infinity for a missing or unreadable timestamp (it counts as oldest). */
function time(iso: string | null | undefined): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? -Infinity : t;
}

/** How long a backup can go before the reminder appears, if there are unexported changes. */
export const BACKUP_REMINDER_DAYS = 14;

export interface MergeSummary {
  /** In both; the file's change is newer, so the file's entry is used. */
  fileNewer: string[];
  /** In both; your change is newer, so your entry is kept. */
  yoursNewer: string[];
  /** In both with the same change time; your entry is kept. */
  tied: string[];
  /** Only in the file; added. */
  onlyInFile: string[];
  /** Only in this browser; kept. */
  onlyHere: string[];
  /** Which organization name the result uses. */
  orgName: "kept" | "fromFile";
}

/**
 * Merges an imported backup into the current data without mutating either. Per
 * requirement ID the entry with the later updatedAt wins; a tie keeps the current
 * entry; IDs on only one side are kept; an unreadable updatedAt counts as oldest.
 * The current organization name is kept unless it is empty.
 */
export function mergeData(current: AppData, incoming: AppData): { data: AppData; summary: MergeSummary } {
  const summary: MergeSummary = { fileNewer: [], yoursNewer: [], tied: [], onlyInFile: [], onlyHere: [], orgName: "kept" };
  const progress: Record<string, ProgressEntry> = {};
  const ids = [...new Set([...Object.keys(current.progress), ...Object.keys(incoming.progress)])].sort(compareIds);

  for (const id of ids) {
    const mine = current.progress[id];
    const theirs = incoming.progress[id];
    if (mine && theirs) {
      const diff = time(theirs.updatedAt) - time(mine.updatedAt);
      // -Infinity - -Infinity is NaN: both unreadable, which is a tie.
      if (diff > 0) {
        progress[id] = { ...theirs };
        summary.fileNewer.push(id);
      } else {
        progress[id] = { ...mine };
        (diff < 0 ? summary.yoursNewer : summary.tied).push(id);
      }
    } else if (theirs) {
      progress[id] = { ...theirs };
      summary.onlyInFile.push(id);
    } else {
      progress[id] = { ...mine };
      summary.onlyHere.push(id);
    }
  }

  const useFileName = current.org.name.trim() === "" && incoming.org.name.trim() !== "";
  if (useFileName) summary.orgName = "fromFile";
  return {
    data: { schemaVersion: current.schemaVersion, org: { name: useFileName ? incoming.org.name : current.org.name }, progress },
    summary,
  };
}

/**
 * Number of tracked requirements changed after the last export. With no readable
 * last export, every tracked requirement counts. Org name edits aren't counted.
 */
export function changesSince(data: AppData, lastExport: string | null): number {
  const since = time(lastExport);
  const entries = Object.values(data.progress);
  if (since === -Infinity) return entries.length;
  return entries.filter((e) => time(e.updatedAt) > since).length;
}

/** True when there are unexported changes and the last export is over 14 days old, or there has never been one. */
export function needsBackupReminder(changes: number, lastExport: string | null, now: Date = new Date()): boolean {
  if (changes === 0) return false;
  const since = time(lastExport);
  return since === -Infinity || now.getTime() - since > BACKUP_REMINDER_DAYS * 86_400_000;
}

/** The most recent readable change time in the data, or null when there is none. */
export function latestUpdate(data: AppData): string | null {
  let best: string | null = null;
  for (const e of Object.values(data.progress)) {
    if (time(e.updatedAt) > time(best)) best = e.updatedAt;
  }
  return best;
}

/** A timestamp as a short date and time in the viewer's locale; unreadable input is returned as is. */
export function formatTimestamp(iso: string, locale?: string, timeZone?: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(t);
}
