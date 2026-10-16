# NIST 800-171 Tracker: Project Spec

## Purpose
A free, no-account, static web app that helps small government contractors:
**understand** their NIST SP 800-171 Rev 2 requirements, **track** what they've completed, and **know** what's left.

This is a self-tracking aid. It is NOT an assessment, a compliance guarantee, or legal advice.

## Constraints (non-negotiable)
- Static site only. No backend, no accounts, no analytics, no third-party network calls at runtime.
- Never collect or transmit user data. All progress lives in the browser (localStorage) plus user-controlled JSON export/import.
- Users must never be prompted to enter CUI. Show a warning on notes fields: "Don't enter CUI or sensitive details here."
- Free hosting target: GitHub Pages or Cloudflare Pages.
- Stack: Vite + React + TypeScript. Minimal dependencies. No UI framework required; plain CSS is fine.
- Accessible (keyboard navigable, sufficient contrast) and works well on mobile.

## Scope
Baseline: NIST SP 800-171 Rev 2 (110 requirements, 14 families), the basis for CMMC Level 2.

### MVP features
1. **Requirements browser**: grouped by the 14 families; filter by status and owner; search by ID or keyword.
2. **Requirement detail view**: official text, plain-English explanation, why it matters, examples, typical evidence, plus user fields (status, owner, due date, notes).
3. **Dashboard**: overall percent complete, percent by family, list of "still to address" items.
4. **Local persistence**: autosave to localStorage; JSON export and import as backup; "reset all data" with confirmation.
5. **Printable summary**: a print-optimized view (print CSS) so "Save as PDF" works. Includes org name, date, status counts, and per-requirement status/owner/notes.
6. **About and disclaimer page**: what this is, what it isn't, privacy statement (nothing leaves your browser).

### Phase 2 (do not build yet)
- SPRS score calculator
- Scoping step ("where does CUI live?")
- SSP-style export
- Owner-based task views

## Data model

### Content: `src/data/requirements.json`
Content is separate from UI so wording can be fixed without touching code.

```json
{
  "version": "rev2-YYYY-MM",
  "requirements": [
    {
      "id": "3.1.1",
      "family": "Access Control",
      "text": "Official requirement text",
      "plainEnglish": "Plain-English explanation",
      "whyItMatters": "One or two sentences",
      "examples": ["Concrete example"],
      "evidence": ["Typical artifact an assessor would ask for"],
      "sprsPoints": null,
      "objectives": ["3.1.1[a]"],
      "relatedIds": ["3.1.2"],
      "reviewed": false
    }
  ]
}
```

Notes:
- `sprsPoints` stays `null` in the MVP. It is filled in Phase 2 from the official DoD Assessment Methodology only, never from model memory.
- `reviewed` is flipped to `true` by a human after checking the entry. The UI should not show a visible "unreviewed" state to end users, but a dev-only view should list unreviewed entries.

### User progress: localStorage key `n171tracker.v1`

```json
{
  "schemaVersion": 1,
  "org": { "name": "" },
  "progress": {
    "3.1.1": {
      "status": "not_started",
      "owner": "",
      "dueDate": null,
      "notes": "",
      "updatedAt": "ISO-8601"
    }
  }
}
```

- `status` is one of: `not_started`, `in_progress`, `implemented`, `not_applicable`.
- Key progress by requirement ID so content updates don't break saved data.
- Import must validate `schemaVersion` and shape, and fail with a clear message rather than corrupting existing data.
- Wrap all storage reads/writes in try/catch; the app must work (without saving) if storage is unavailable.

## Content generation workflow
1. Source: NIST SP 800-171 Rev 2 and NIST SP 800-171A (for objectives). Use official text verbatim for `text` and `objectives`.
2. Generate `plainEnglish`, `whyItMatters`, `examples`, and `evidence` one family at a time (not all 110 in one pass).
3. Plain English should be written for a non-security owner of a 10-person company: short sentences, no jargon without explanation, no invented requirements.
4. Mark every generated entry `reviewed: false`. A human reviews each family and flips the flag.
5. Do not state that any specific action guarantees compliance or passes an assessment.

## Tests and validation
- Schema check: every requirement has all required fields non-empty (except `sprsPoints`); IDs are unique; `relatedIds` all resolve.
- Count check: exactly 110 requirements across 14 families.
- Persistence tests: save/load round trip; import rejects malformed files; reset clears data.
- Print view renders all requirements without clipping.

## Suggested build order
1. Scaffold Vite + React + TS; set up routing and a basic layout.
2. Create the content schema and a handful of sample requirements; build the browser and detail views against them.
3. Add progress state, localStorage persistence, and export/import.
4. Build the dashboard.
5. Build the print summary.
6. Add the About/disclaimer page.
7. Generate and review real content family by family.
8. Deploy to a free static host.

## Acceptance criteria (MVP)
- A new user can open the site and start tracking within one minute, with no sign-up.
- Refreshing the page preserves all progress.
- Exported JSON can be re-imported on another browser and restores the same state.
- The printed summary is readable and complete.
- No network requests are made after the initial page load.
- Disclaimer is visible on first load and on the printed summary.
