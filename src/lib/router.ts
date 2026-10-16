import { useEffect, useState } from "react";

/**
 * Minimal hash router. Hash URLs (#/requirements/3.1.1) work on any static host,
 * including GitHub Pages, with no server rewrite rules and no extra dependency.
 */
export type Route =
  | { name: "home" }
  | { name: "requirements"; query: URLSearchParams }
  | { name: "requirement"; id: string }
  | { name: "data" }
  | { name: "dev" }
  | { name: "notFound" };

export function parseHash(hash: string): Route {
  const [rawPath, rawQuery = ""] = hash.replace(/^#/, "").split("?");
  const parts = rawPath.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "requirements" && parts.length === 1) return { name: "requirements", query: new URLSearchParams(rawQuery) };
  if (parts[0] === "requirements" && parts.length === 2) return { name: "requirement", id: parts[1] };
  if (parts[0] === "data" && parts.length === 1) return { name: "data" };
  if (parts[0] === "dev" && parts.length === 1 && import.meta.env.DEV) return { name: "dev" };
  return { name: "notFound" };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parseHash(hash);
}

export const href = {
  home: () => "#/",
  requirements: (query?: URLSearchParams) => {
    const q = query?.toString();
    return q ? `#/requirements?${q}` : "#/requirements";
  },
  requirement: (id: string) => `#/requirements/${encodeURIComponent(id)}`,
  data: () => "#/data",
  dev: () => "#/dev",
};
