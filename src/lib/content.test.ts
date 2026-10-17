import { describe, expect, it } from "vitest";
import { compareIds, content, groupByFamily, requirements, validateContent } from "./content";
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

  // Families are added one at a time (build step 7). Each finished family must be
  // complete: exactly 3.F.1 through 3.F.N, in order, per NIST SP 800-171 Rev 2.
  it.each([
    ["Access Control", "3.1", 22],
    ["Personnel Security", "3.9", 2],
  ] as const)("%s (%s.x) is complete with %i requirements", (family, prefix, count) => {
    const ids = requirements.filter((r) => r.family === family).map((r) => r.id);
    expect(ids).toEqual(Array.from({ length: count }, (_, i) => `${prefix}.${i + 1}`));
  });

  // Enabled once the full content set is generated (build step 7).
  it.todo("contains exactly 110 requirements across 14 families");
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
