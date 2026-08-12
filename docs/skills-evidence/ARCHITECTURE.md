# Skills Evidence Matrix — Architecture

## Module Purpose
Analyze resume documents to identify skills, find evidence supporting each skill across all sections, and present a transparent matrix showing evidence strength.

## Integration Points
- **Database**: IndexedDB via `Database` class (db.js). DB version 2, stores: documents, masterProfile, jobDescriptions, applications, contentLibrary, snapshots, images, designPresets, matchAnalyses. New store `skillsMatrices` required (DB version bump to 3).
- **Router**: Hash-based router (router.js). New route: `/skills-matrix`
- **Events**: EventBus singleton (events.js). New events: `skillsMatrix:*`
- **State**: StateManager (state.js) for in-session state
- **Schema**: Document schema (schema.js) — SCHEMA_VERSION 1, 33+ section types
- **Dashboard**: Quick action entry point
- **Job Matcher**: Optional integration via matchAnalyses store
- **Export/Print**: Reuse existing patterns from export-manager.js, print-manager.js

## Key Design Decisions
1. **New DB store** `skillsMatrices` — avoid polluting documents store. Requires version bump to 3 with backward-compatible migration.
2. **Route**: `/skills-matrix` — follows existing pattern (/dashboard, /templates, /applications)
3. **Nav entry**: Added to dashboard quick actions as a Career Tool, not main nav (keeps nav clean)
4. **Local-only analysis**: All skill matching done in-browser with deterministic rules — no AI/API calls
5. **No auto-modification**: Never add/remove skills without explicit user confirmation
6. **Fingerprint-based staleness**: Hash of resume lastModified + section count to detect changes

## File Structure
```
src/js/modules/skills-matrix.js          — Main module (view, routing, UI)
src/js/modules/skills-matrix-analyzer.js  — Analysis engine (extraction, normalization, matching)
src/js/modules/skills-matrix-data.js      — Skill aliases, categories, normalization maps
src/css/skills-matrix.css                 — All module styles
```

## Data Flow
1. User selects resume → loads from IndexedDB
2. Analyzer extracts text from all sections
3. Skills normalized via alias/abbreviation maps
4. Evidence matched per skill per section
5. Strength assessed via transparent rules
6. Matrix rendered with filters/search/sort
7. User can confirm/reject/reconcile
8. Matrix saved to `skillsMatrices` store
