import { describe, expect, it } from "vitest";
import { listOwners } from "./progress";
import { emptyData } from "./storage";

describe("listOwners", () => {
  it("returns distinct trimmed owners, alphabetically, without blanks", () => {
    const d = emptyData();
    const e = { status: "in_progress" as const, dueDate: null, notes: "", updatedAt: "x" };
    d.progress["3.1.1"] = { ...e, owner: " Sam " };
    d.progress["3.1.2"] = { ...e, owner: "alex" };
    d.progress["3.5.1"] = { ...e, owner: "Sam" };
    d.progress["3.5.2"] = { ...e, owner: "  " };
    expect(listOwners(d)).toEqual(["alex", "Sam"]);
  });
});
