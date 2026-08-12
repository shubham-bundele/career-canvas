# Job Description Matcher — Architecture

## Module Identity
- **Name**: Job Description Matcher
- **Route**: `#/job-matcher`
- **Entry File**: `src/js/modules/job-matcher.js`
- **CSS File**: `src/css/job-matcher.css`

## Integration Pattern
Follows the existing CareerCanvas view pattern:
1. Register route in `app.js` setupRoutes()
2. Create `JobMatcher` class with constructor(db, events) and render()/destroy()
3. app.showView() instantiates and renders like other views
4. Uses window.CC for toast, modal, router access

## Dashboard Placement
- Add "Job Matcher" card to dashboard quick actions area
- Position after existing document creation buttons, before Import/Export
- Icon: magnifying glass or target icon (text-based, not emoji-dependent for accessibility)

## Navigation
- Add `#/job-matcher` route to app.js
- Add navigation link in header nav bar
- Support browser back/forward/refresh
- Support direct URL navigation

## Database Strategy
- **jobDescriptions store**: ALREADY EXISTS at DB v1 — use directly
- **matchAnalyses store**: NEW — requires DB version bump to v2
- Migration: backward-compatible, only adds the new store
- If DB is already at v1, onupgradeneeded creates only the new store

## View Architecture
```
JobMatcher
  ├── ResumeSelector        — Step 1: pick a resume
  ├── JobDescriptionEditor  — Step 2: create/load job description
  ├── AnalysisRunner        — Step 3: run comparison
  ├── ResultsPanel          — Step 4: view results
  ├── SavedAnalysisList     — Sidebar: saved analyses
  └── ReportExporter        — Export/print results
```

## State Management
- Local component state (not global StateManager)
- Selected resume ID, job description ID, analysis state
- Current filters, search terms, sort order
- Analysis results held in memory during session
- Persisted to IndexedDB on save

## Event Integration
- Uses existing eventBusSingleton for cross-module events
- Custom events: matcher:analyze, matcher:save, matcher:export
- Listens for document:delete to handle relationship cleanup

## Web Worker Decision
- NOT using Web Worker for v1
- Analysis runs synchronously with progress feedback via setTimeout chunking
- If profiling shows >100ms blocking, add Web Worker in performance step
