import raw from "../data/requirements.json";
import assessment from "../data/sources/nist-sp800-171a.json";
import { FAMILIES, type ContentFile, type Family, type Requirement } from "./types";

export const content = raw as ContentFile;
export const requirements: Requirement[] = content.requirements;

const byId = new Map(requirements.map((r) => [r.id, r]));

export function getRequirement(id: string): Requirement | undefined {
  return byId.get(id);
}

export interface Objective {
  id: string;
  text: string;
}

/** Objective wording from NIST SP 800-171A, keyed by objective ID (e.g. "3.1.1[a]"). */
const objectiveText = new Map(assessment.requirements.flatMap((r) => r.objectives.map((o) => [o.id, o.text] as const)));

/** The requirement's assessment objectives with their official wording, in order. */
export function objectivesFor(requirement: Requirement): Objective[] {
  return requirement.objectives.map((id) => ({ id, text: objectiveText.get(id) ?? "" }));
}

/** Families in document order, each with its requirements. Empty families are omitted. */
export function groupByFamily(list: Requirement[]): { family: Family; items: Requirement[] }[] {
  return FAMILIES.map((family) => ({ family, items: list.filter((r) => r.family === family) })).filter(
    (g) => g.items.length > 0,
  );
}

/** Compare IDs like "3.1.2" < "3.1.10" numerically. */
export function compareIds(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const STRING_FIELDS = ["id", "family", "text", "plainEnglish", "whyItMatters"] as const;
const LIST_FIELDS = ["examples", "evidence", "objectives"] as const;

/**
 * Schema check for the content file. Returns a list of problems (empty = valid).
 * Every field must be present and non-empty except `sprsPoints` (null in the MVP)
 * and `relatedIds` (may be empty, but every entry must resolve).
 */
export function validateContent(file: ContentFile): string[] {
  const errors: string[] = [];
  if (typeof file.version !== "string" || !file.version) errors.push("Missing content version");
  if (!Array.isArray(file.requirements)) return [...errors, "requirements must be an array"];

  const ids = new Set<string>();
  for (const r of file.requirements) {
    const label = r.id || "(no id)";
    for (const f of STRING_FIELDS) {
      if (typeof r[f] !== "string" || !r[f].trim()) errors.push(`${label}: ${f} is missing or empty`);
    }
    for (const f of LIST_FIELDS) {
      const v = r[f];
      if (!Array.isArray(v) || v.length === 0 || v.some((s) => typeof s !== "string" || !s.trim())) {
        errors.push(`${label}: ${f} must be a non-empty list of non-empty strings`);
      }
    }
    if (!Array.isArray(r.relatedIds)) errors.push(`${label}: relatedIds must be a list`);
    if (!(r.sprsPoints === null || typeof r.sprsPoints === "number")) errors.push(`${label}: sprsPoints must be null or a number`);
    if (typeof r.reviewed !== "boolean") errors.push(`${label}: reviewed must be true or false`);
    if (!(FAMILIES as readonly string[]).includes(r.family)) errors.push(`${label}: unknown family "${r.family}"`);
    if (!/^3\.\d{1,2}\.\d{1,2}$/.test(r.id)) errors.push(`${label}: id must look like 3.x.y`);
    if (ids.has(r.id)) errors.push(`${label}: duplicate id`);
    ids.add(r.id);
  }
  for (const r of file.requirements) {
    for (const rel of r.relatedIds ?? []) {
      if (!ids.has(rel)) errors.push(`${r.id}: relatedIds entry "${rel}" does not match any requirement`);
      if (rel === r.id) errors.push(`${r.id}: relatedIds must not reference itself`);
    }
  }
  return errors;
}
