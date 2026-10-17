import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutPage } from "./AboutPage";

// Strip tags and decode the entities React escapes, so assertions read like the page does.
const text = renderToStaticMarkup(<AboutPage />)
  .replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ");

describe("AboutPage", () => {
  it("says what the tool is not", () => {
    expect(text).toContain("not an assessment, a compliance guarantee, or legal advice");
  });

  it("states that nothing leaves the browser", () => {
    expect(text).toContain("Nothing you enter leaves your browser");
  });

  it("warns that clearing browser data deletes progress", () => {
    expect(text).toContain("Clearing your browser's site data deletes your progress");
  });

  it("tells people not to enter CUI", () => {
    expect(text).toContain("Don't enter CUI");
  });

  it("names the baseline it tracks", () => {
    expect(text).toContain("NIST SP 800-171 Revision 2");
  });
});
