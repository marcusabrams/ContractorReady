import { describe, expect, it } from "vitest";
import { href, parseHash } from "./router";

describe("parseHash", () => {
  it("parses routes", () => {
    expect(parseHash("").name).toBe("home");
    expect(parseHash("#/").name).toBe("home");
    expect(parseHash("#/requirements/3.1.1")).toEqual({ name: "requirement", id: "3.1.1" });
    expect(parseHash("#/data").name).toBe("data");
    expect(parseHash("#/print").name).toBe("print");
    expect(parseHash("#/nope").name).toBe("notFound");
  });
  it("round-trips the filter query", () => {
    const q = new URLSearchParams({ q: "mfa & admin", status: "in_progress" });
    const route = parseHash(href.requirements(q));
    expect(route.name === "requirements" && route.query.toString()).toBe(q.toString());
  });
});
