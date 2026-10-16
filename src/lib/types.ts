export type Status = "not_started" | "in_progress" | "implemented" | "not_applicable";

export const STATUSES: readonly Status[] = ["not_started", "in_progress", "implemented", "not_applicable"];

export const STATUS_LABELS: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  implemented: "Implemented",
  not_applicable: "Not applicable",
};

/** The 14 NIST SP 800-171 Rev 2 families, in document order (3.1 through 3.14). */
export const FAMILIES = [
  "Access Control",
  "Awareness and Training",
  "Audit and Accountability",
  "Configuration Management",
  "Identification and Authentication",
  "Incident Response",
  "Maintenance",
  "Media Protection",
  "Personnel Security",
  "Physical Protection",
  "Risk Assessment",
  "Security Assessment",
  "System and Communications Protection",
  "System and Information Integrity",
] as const;

export type Family = (typeof FAMILIES)[number];

export interface Requirement {
  id: string;
  family: Family;
  text: string;
  plainEnglish: string;
  whyItMatters: string;
  examples: string[];
  evidence: string[];
  sprsPoints: number | null;
  objectives: string[];
  relatedIds: string[];
  reviewed: boolean;
}

export interface ContentFile {
  version: string;
  requirements: Requirement[];
}

export interface ProgressEntry {
  status: Status;
  owner: string;
  /** YYYY-MM-DD, or null when no due date is set. */
  dueDate: string | null;
  notes: string;
  /** ISO-8601 timestamp of the last edit. */
  updatedAt: string;
}

export interface AppData {
  schemaVersion: 1;
  org: { name: string };
  progress: Record<string, ProgressEntry>;
}
