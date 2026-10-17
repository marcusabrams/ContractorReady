import { describe, expect, it } from "vitest";
import { getRequirement, requirements } from "./content";
import { glossary, termsIn, validateGlossary } from "./glossary";
import type { Requirement } from "./types";

describe("glossary", () => {
  it("is valid", () => {
    expect(validateGlossary(glossary)).toEqual([]);
  });

  it("defines the expected terms", () => {
    expect(glossary.map((g) => g.term).sort()).toEqual(
      ["CUI", "DFARS", "DLP", "DMZ", "FIPS", "MDM", "MFA", "SSP", "VPN", "VoIP"].sort(),
    );
  });

  it.each(glossary.map((g) => [g.term] as const))("%s appears in at least one entry", (term) => {
    expect(requirements.some((r) => termsIn(r).some((g) => g.term === term))).toBe(true);
  });

  it("flags invalid entries", () => {
    const errors = validateGlossary([
      { term: "CUI", definition: "x" },
      { term: "CUI", definition: "" },
    ]);
    expect(errors.some((e) => e.includes("duplicate"))).toBe(true);
    expect(errors.some((e) => e.includes("definition"))).toBe(true);
  });
});

describe("termsIn", () => {
  const entry = (text: string): Requirement => ({ ...getRequirement("3.1.1")!, plainEnglish: text, whyItMatters: "", examples: [], evidence: [] });

  it("finds terms in plainEnglish, whyItMatters, examples, and evidence, in glossary order", () => {
    const r = { ...entry("Use MFA."), whyItMatters: "Protect CUI.", examples: ["A VPN."], evidence: ["SSP"] };
    expect(termsIn(r).map((g) => g.term)).toEqual(["CUI", "MFA", "VPN", "SSP"]);
  });

  it("does not look at the official text", () => {
    expect(termsIn({ ...entry("Nothing here."), text: "Protect CUI." })).toEqual([]);
  });

  it("matches whole words, including plurals and hyphenated forms", () => {
    expect(termsIn(entry("Remote access includes VPNs.")).map((g) => g.term)).toEqual(["VPN"]);
    expect(termsIn(entry("Use FIPS-validated encryption.")).map((g) => g.term)).toEqual(["FIPS"]);
    expect(termsIn(entry("MFAX and xCUI and DMZed are not terms."))).toEqual([]);
  });

  it("is case-sensitive, so ordinary words are not mistaken for terms", () => {
    expect(termsIn(entry("the dmz and a vpn"))).toEqual([]);
  });

  it("lists each term once", () => {
    expect(termsIn(entry("MFA, MFA, and more MFA.")).map((g) => g.term)).toEqual(["MFA"]);
  });
});
