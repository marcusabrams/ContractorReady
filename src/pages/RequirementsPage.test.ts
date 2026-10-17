import { describe, expect, it } from "vitest";
import { requirements } from "../lib/content";
import { emptyData } from "../lib/storage";
import type { AppData } from "../lib/types";
import { filterRequirements } from "./RequirementsPage";

function data(): AppData {
  const d = emptyData();
  d.progress["3.1.1"] = { status: "implemented", owner: "Pat", dueDate: null, notes: "conditional access policy", updatedAt: "x" };
  d.progress["3.5.3"] = { status: "in_progress", owner: "Sam", dueDate: null, notes: "", updatedAt: "x" };
  return d;
}
const ids = (q: string, status = "", owner = "", family = "") =>
  filterRequirements(requirements, data(), { q, status, owner, family }).map((r) => r.id);

describe("filterRequirements", () => {
  it("returns everything with no filters", () => {
    expect(ids("")).toHaveLength(requirements.length);
  });
  it("searches by ID prefix", () => {
    expect(ids("3.5")).toEqual(["3.5.1", "3.5.2", "3.5.3"]);
  });
  it("treats an ID search as whole number segments, not a substring", () => {
    // "3.2" must not match 3.3.2, and "3.1.1" must not match 3.1.10 through 3.1.19.
    expect(ids("3.2")).toEqual(["3.2.1", "3.2.2", "3.2.3"]);
    expect(ids("3.1.1")).toEqual(["3.1.1"]);
    expect(ids("3.1.")).toHaveLength(22);
  });
  it("searches by keyword, case-insensitively", () => {
    expect(ids("MULTIFACTOR")).toEqual(["3.5.3"]);
  });
  it("searches the user's notes", () => {
    expect(ids("conditional access")).toEqual(["3.1.1"]);
  });
  it("filters by status, treating untracked items as not started", () => {
    expect(ids("", "implemented")).toEqual(["3.1.1"]);
    expect(ids("", "not_started")).not.toContain("3.1.1");
    expect(ids("", "not_started")).toContain("3.9.1");
  });
  it("filters by owner and unassigned", () => {
    expect(ids("", "", "Sam")).toEqual(["3.5.3"]);
    expect(ids("", "", "__unassigned__")).not.toContain("3.1.1");
  });
  it("filters by exact family", () => {
    expect(ids("", "", "", "Personnel Security")).toEqual(["3.9.1", "3.9.2"]);
  });
});
