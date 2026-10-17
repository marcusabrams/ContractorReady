# NIST 800-171 Tracker

A free, no-account, static web app that helps small government contractors understand their
NIST SP 800-171 Rev 2 requirements, track what they've completed, and see what's left.
All progress stays in the browser. See [SPEC.md](SPEC.md) for the full spec.

> This is a self-tracking aid. It is not an assessment, a compliance guarantee, or legal advice.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # content schema, persistence, and filter tests
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

- Content lives in `src/data/requirements.json`, separate from the UI.
- `src/data/sources/nist-sp800-171a.json` holds the official requirement text and assessment
  objectives, extracted from NIST SP 800-171A by `scripts/extract_800_171a.py` (instructions in the
  script). A test fails if any requirement's text or objective IDs drift from it.
- Progress is stored in `localStorage` under `n171tracker.v1`.
- `#/dev` (dev server only) lists schema problems and unreviewed content entries.
- Production builds include a Content-Security-Policy with `connect-src 'none'`, so the browser
  blocks any network request the app might try to make after the page loads.
- `public/_headers` adds security headers (including `frame-ancestors 'none'`) on Cloudflare Pages
  and Netlify. GitHub Pages ignores it and can't set response headers.
- Open tabs stay in sync: an edit in one tab is picked up by the others instead of being overwritten.

## Build progress

- [x] 1. Scaffold Vite + React + TS, routing, layout
- [x] 2. Content schema, sample requirements, browser and detail views
- [x] 3. Progress state, localStorage persistence, export/import, reset
- [x] 4. Dashboard
- [x] 5. Print summary
- [x] 6. About/disclaimer page
- [ ] 7. Generate and review real content, family by family (drafted: Access Control 22/22, unreviewed)
- [ ] 8. Deploy
