import raw from "../data/glossary.json";
import type { Requirement } from "./types";

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: GlossaryEntry[] = raw.terms;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word, case-sensitive match, allowing a plural "s" ("VPNs"). Case-sensitive so
 * ordinary words are never mistaken for an acronym. A hyphen counts as a word boundary,
 * so "FIPS-validated" matches FIPS.
 */
const patterns = new Map(glossary.map((g) => [g.term, new RegExp(`(?<!\\w)${escape(g.term)}s?(?!\\w)`)]));

/** Glossary entries whose term appears in the requirement's plain-language fields, in glossary order. */
export function termsIn(requirement: Requirement): GlossaryEntry[] {
  const text = [requirement.plainEnglish, requirement.whyItMatters, ...requirement.examples, ...requirement.evidence].join("\n");
  return glossary.filter((g) => patterns.get(g.term)!.test(text));
}

export function validateGlossary(entries: GlossaryEntry[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const { term, definition } of entries) {
    if (typeof term !== "string" || !term.trim()) errors.push("A glossary entry is missing its term");
    if (typeof definition !== "string" || !definition.trim()) errors.push(`${term}: definition is missing or empty`);
    if (seen.has(term)) errors.push(`${term}: duplicate term`);
    seen.add(term);
  }
  return errors;
}
