import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { requirements } from "../lib/content";
import { emptyData } from "../lib/storage";
import type { AppData } from "../lib/types";
import { PrintSummary } from "./PrintSummary";

function sample(): AppData {
  const d = emptyData();
  d.org.name = "Acme Machining";
  d.progress["3.1.1"] = { status: "implemented", owner: "Pat", dueDate: null, notes: "Enforced in M365.\nReviewed quarterly.", updatedAt: "x" };
  d.progress["3.5.3"] = { status: "in_progress", owner: "Sam", dueDate: "2026-11-15", notes: "", updatedAt: "x" };
  return d;
}

const render = (data: AppData) =>
  renderToStaticMarkup(<PrintSummary data={data} requirements={requirements} generatedOn="2026-10-17" />);

/** Text content of the rendered markup, with tags removed and whitespace collapsed. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("PrintSummary", () => {
  it("shows the organization name and the date it was generated", () => {
    const t = text(render(sample()));
    expect(t).toContain("Acme Machining");
    expect(t).toContain("Oct 17, 2026");
  });

  it("says when no organization name has been set", () => {
    expect(text(render(emptyData()))).toContain("Organization not set");
  });

  it("includes the disclaimer", () => {
    expect(text(render(sample()))).toContain("not an assessment, a compliance guarantee, or legal advice");
  });

  it("shows percent complete and the count for each status", () => {
    const t = text(render(sample()));
    expect(t).toContain(`1 of ${requirements.length} requirements`);
    expect(t).toMatch(/Implemented 1\b/);
    expect(t).toMatch(/In progress 1\b/);
    expect(t).toMatch(new RegExp(`Not started ${requirements.length - 2}\\b`));
    expect(t).toMatch(/Not applicable 0\b/);
  });

  it("lists every requirement exactly once", () => {
    const html = render(sample());
    for (const r of requirements) {
      expect(html.match(new RegExp(`data-req-id="${r.id.replace(/\./g, "\\.")}"`, "g"))).toHaveLength(1);
    }
  });

  it("shows each requirement's status, owner, due date, and notes", () => {
    const html = render(sample());
    const row = (id: string) => text(html.split(`data-req-id="${id}"`)[1].split("</tr>")[0]);
    expect(row("3.1.1")).toContain("Implemented");
    expect(row("3.1.1")).toContain("Pat");
    expect(row("3.1.1")).toContain("Enforced in M365.");
    expect(row("3.5.3")).toContain("In progress");
    expect(row("3.5.3")).toContain("Nov 15, 2026");
    expect(row("3.9.1")).toContain("Not started");
  });

  it("escapes notes rather than rendering them as HTML", () => {
    const d = sample();
    d.progress["3.1.1"].notes = '<img src=x onerror="alert(1)">';
    const html = render(d);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
