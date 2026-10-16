import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

// Production-only Content-Security-Policy. `connect-src 'none'` makes the
// browser itself enforce "no network requests after page load". It is left out
// of the dev server because Vite's HMR needs a websocket and an inline script.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function cspPlugin(): Plugin {
  return {
    name: "n171-csp",
    apply: "build",
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }];
    },
  };
}

// base "./" keeps asset paths relative so the build works on GitHub Pages
// project sites and Cloudflare Pages without extra configuration.
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: "./",
  test: {
    environment: "node",
  },
});
