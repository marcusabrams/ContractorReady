import { describe, expect, it } from "vitest";
import nist171a from "../data/sources/nist-sp800-171a.json";
import nistRev2 from "../data/sources/nist-sp800-171r2.json";
import { compareIds, content, getRequirement, groupByFamily, objectivesFor, requirements, validateContent } from "./content";
import { FAMILIES, type ContentFile, type Requirement } from "./types";

describe("requirements.json", () => {
  it("passes the schema check", () => {
    expect(validateContent(content)).toEqual([]);
  });

  it("lists requirements in document order", () => {
    const ids = requirements.map((r) => r.id);
    expect([...ids].sort(compareIds)).toEqual(ids);
  });

  it("defines exactly 14 families", () => {
    expect(FAMILIES).toHaveLength(14);
  });

  // Requirement count per family in NIST SP 800-171 Rev 2, in document order (3.1 through 3.14).
  const FAMILY_COUNTS = [22, 3, 9, 9, 11, 3, 6, 9, 2, 6, 3, 4, 16, 7];

  it.each(FAMILIES.map((family, i) => [family, `3.${i + 1}`, FAMILY_COUNTS[i]] as const))(
    "%s (%s.x) is complete with %i requirements",
    (family, prefix, count) => {
      const ids = requirements.filter((r) => r.family === family).map((r) => r.id);
      expect(ids).toEqual(Array.from({ length: count }, (_, i) => `${prefix}.${i + 1}`));
    },
  );

  it("contains exactly 110 requirements across 14 families", () => {
    expect(requirements).toHaveLength(110);
    expect(new Set(requirements.map((r) => r.family)).size).toBe(14);
  });
});

describe("validateContent", () => {
  const base = (): Requirement => structuredClone(requirements[0]);
  const file = (...reqs: Requirement[]): ContentFile => ({ version: "test", requirements: reqs });

  it("flags empty required fields", () => {
    const r = { ...base(), plainEnglish: " ", examples: [] };
    const errors = validateContent(file(r));
    expect(errors.some((e) => e.includes("plainEnglish"))).toBe(true);
    expect(errors.some((e) => e.includes("examples"))).toBe(true);
  });

  it("allows null sprsPoints", () => {
    expect(validateContent(file({ ...base(), relatedIds: [], sprsPoints: null }))).toEqual([]);
  });

  it("flags duplicate IDs", () => {
    const r = { ...base(), relatedIds: [] };
    expect(validateContent(file(r, { ...r }))).toContain(`${r.id}: duplicate id`);
  });

  it("flags relatedIds that don't resolve", () => {
    const errors = validateContent(file({ ...base(), relatedIds: ["3.99.1"] }));
    expect(errors.some((e) => e.includes("3.99.1"))).toBe(true);
  });

  it("flags unknown families", () => {
    const r = { ...base(), relatedIds: [], family: "Made Up" } as unknown as Requirement;
    expect(validateContent(file(r)).some((e) => e.includes("unknown family"))).toBe(true);
  });
});

describe("helpers", () => {
  it("compares IDs numerically", () => {
    expect(compareIds("3.1.2", "3.1.10")).toBeLessThan(0);
    expect(compareIds("3.10.1", "3.9.2")).toBeGreaterThan(0);
  });

  it("groups by family in document order", () => {
    const groups = groupByFamily(requirements);
    const order = groups.map((g) => FAMILIES.indexOf(g.family));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("official text and objectives match NIST", () => {
  // Extracted from the NIST PDFs by scripts/extract_800_171r2.py and scripts/extract_800_171a.py.
  // Rev 2 is the authority for requirement wording; 800-171A is the source of objectives.
  const rev2 = new Map(nistRev2.requirements.map((r) => [r.id, r.text]));
  const assess = new Map(nist171a.requirements.map((r) => [r.id, r]));

  it("source extracts have all 110 requirements, and 800-171A has 320 objectives", () => {
    expect(nistRev2.requirements).toHaveLength(110);
    expect(nist171a.requirements).toHaveLength(110);
    expect(nist171a.requirements.reduce((n, r) => n + r.objectives.length, 0)).toBe(320);
  });

  it("the two NIST documents word every requirement the same, except a comma in 3.3.2", () => {
    const differing = nistRev2.requirements.filter((r) => assess.get(r.id)?.text !== r.text).map((r) => r.id);
    expect(differing).toEqual(["3.3.2"]);
  });

  it.each(requirements.map((r) => [r.id, r] as const))("%s text matches Rev 2 and objectives match 800-171A", (_id, r) => {
    expect(r.text).toBe(rev2.get(r.id));
    expect(r.objectives).toEqual(assess.get(r.id)!.objectives.map((o) => o.id));
  });
});

describe("objectivesFor", () => {
  it("returns each objective's ID and its NIST SP 800-171A wording, in order", () => {
    const objs = objectivesFor(getRequirement("3.1.1")!);
    expect(objs).toHaveLength(6);
    expect(objs[0]).toEqual({ id: "3.1.1[a]", text: "authorized users are identified." });
    expect(objs[5].id).toBe("3.1.1[f]");
  });

  it("handles a requirement with a single unlabeled objective", () => {
    expect(objectivesFor(getRequirement("3.9.1")!)).toEqual([
      { id: "3.9.1", text: "individuals are screened prior to authorizing access to organizational systems containing CUI." },
    ]);
  });
});

describe("content cleanup rules", () => {
  // A specific setting in an example (a lockout count, a timeout, a retention period,
  // a review or scan frequency) must read as an example, not as the requirement.
  const POLICY_NUMBER =
    /\b\d+ (minutes?|hours?|days?|years?|characters?|passwords?|failed)\b|\b(once|each|every|a|one|two) (year|week|month|quarter)s?\b|\b(monthly|weekly|annual(ly)?|quarterly|yearly|first week)\b|\blast \d+\b/i;
  // Fixed by contract, not chosen by the organization: DFARS 252.204-7012's 72-hour reporting rule.
  const FIXED_BY_RULE = new Set(["3.6.2"]);

  it("examples that give a specific setting read as examples", () => {
    const offenders = requirements
      .filter((r) => !FIXED_BY_RULE.has(r.id))
      .flatMap((r) => r.examples.filter((e) => POLICY_NUMBER.test(e)).map((e) => `${r.id}: ${e}`))
      .filter((s) => !/: For example, /.test(s) && !s.endsWith("or whatever your policy sets."));
    expect(offenders).toEqual([]);
  });

  it.each(["3.1.8", "3.5.6", "3.5.8", "3.11.3", "3.14.1"])("%s says the requirement sets no specific number", (id) => {
    expect(getRequirement(id)!.plainEnglish).toContain(
      "The requirement doesn't set a specific number. Choose one that fits your risk and write it down.",
    );
  });

  it("3.9.1 evidence contains no instructions about this app", () => {
    expect(getRequirement("3.9.1")!.evidence.join(" ")).not.toContain("in this tool");
  });

  it("3.5.3 does not overstate what a second factor does", () => {
    expect(getRequirement("3.5.3")!.whyItMatters).toContain("A second factor blocks many of those attempts.");
  });

  it("3.1.17 names current Wi-Fi standards and the settings to turn off", () => {
    expect(getRequirement("3.1.17")!.examples[0]).toBe(
      "The office Wi-Fi uses WPA3 or WPA2, the current secure Wi-Fi standards. Older settings such as WEP, or an open network with no password, are turned off.",
    );
  });
});
