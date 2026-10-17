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
- `src/data/sources/` holds extracts of the NIST PDFs: requirement text from SP 800-171 Rev 2
  (`scripts/extract_800_171r2.py`) and assessment objectives from SP 800-171A
  (`scripts/extract_800_171a.py`); usage is in each script. A test fails if any requirement's text
  drifts from Rev 2 or its objective IDs drift from 800-171A.
- Progress is stored in `localStorage` under `n171tracker.v1`.
- `#/dev` (dev server only) lists schema problems and unreviewed content entries.
- Production builds include a Content-Security-Policy with `connect-src 'none'`, so the browser
  blocks any network request the app might try to make after the page loads.
- `public/_headers` adds security headers (including `frame-ancestors 'none'`) on Cloudflare Pages
  and Netlify. GitHub Pages ignores it and can't set response headers.
- Open tabs stay in sync: an edit in one tab is picked up by the others instead of being overwritten.

## Deploy

The site is published to GitHub Pages at https://marcusabrams.github.io/contractorready/ by
`.github/workflows/deploy.yml`:

- Every push and pull request runs the type check, tests, `npm audit`, and build.
- A push to `main` that passes those checks is deployed. Pull requests are checked but never deployed.
- One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
- To roll back, revert the bad commit on `main` (the revert deploys automatically), or re-run the
  deploy job of an earlier successful workflow run from the **Actions** tab.

Dependabot (`.github/dependabot.yml`) opens weekly update pull requests for npm packages and GitHub
Actions; each runs the same checks.

## Build progress

- [x] 1. Scaffold Vite + React + TS, routing, layout
- [x] 2. Content schema, sample requirements, browser and detail views
- [x] 3. Progress state, localStorage persistence, export/import, reset
- [x] 4. Dashboard
- [x] 5. Print summary
- [x] 6. About/disclaimer page
- [ ] 7. Generate and review real content, family by family (all 110 drafted; human review pending, 0 of 110 reviewed)
- [ ] 8. Deploy
