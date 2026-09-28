# CareerCanvas Project Structure

## Root
```
c:\resume builder\
  index.html              — Single-page app entry point
  404.html                — GitHub Pages fallback
  package.json            — Project metadata (no build tooling)
  sw.js                   — Service Worker (currently unregistered on load)
  tools/debug.html        — Debug utility page (dev only)
  tools/responsive-test.html — Responsive testing page (dev only)
  tools/*.bat             — Windows dev helpers (portable, repo-relative)
  DEPLOY.md               — Deployment instructions
  .gitignore              — Excludes node_modules, .local-backup, IDE files
```

## Source Structure
```
src/
  js/
    app.js                — Application entry, instantiates all singletons, registers routes
    core/
      db.js               — IndexedDB abstraction (singleton Database class)
      router.js           — Hash-based Router (singleton)
      events.js           — EventBus pub/sub (singleton)
      state.js            — StateManager with undo/redo, snapshots, batching
      schema.js           — Document schema definitions, factory functions, validation
      template-engine.js  — Template registry and rendering
      migration.js        — Data migration utilities
    modules/
      dashboard.js        — Main dashboard view
      editor.js           — Resume editor (~124KB, ~3500 lines, central module)
      onboarding.js       — First-use wizard
      template-gallery.js — Template browser and applier
      design-panel.js     — Design Studio drawer
      font-manager.js     — Typography controls
      ats-checker.js      — ATS analysis module
      export-manager.js   — Export functionality
      import-manager.js   — Import functionality
      master-profile.js   — Career profile manager
      application-tracker.js — Job application tracker
      settings.js         — App settings panel
      experience-calculator.js — Experience calculator (DO NOT MODIFY)
      modal.js            — Modal dialog system (singleton)
      toast.js            — Toast notification system (singleton)
      autocomplete.js     — Autocomplete for form fields
      floating-toolbar.js — Selection-based formatting toolbar
    templates/
      index.js            — Template registry, calls registerAllTemplates()
      ats-templates.js    — ATS-optimized templates
      professional-templates.js — Professional templates
      technical-templates.js    — Technical templates
      creative-templates.js     — Creative templates
      cover-letter-templates.js — Cover letter templates
      reference-templates.js    — Reference sheet templates
    data/
      sample-data.js      — Sample resume data
      autocomplete-data.js — 700+ autocomplete suggestions
      writing-tips.js     — Context-sensitive writing tips
      typography-presets.js — Typography preset definitions
    utils/
      sanitize.js         — XSS prevention, HTML encoding, input validation
      format.js           — Date, time, number formatting
      id.js               — UUID v4, short ID, sortable ID generation
      rich-text-sanitizer.js — Rich text content sanitization
    workers/              — Web Worker directory (empty/unused)
  css/
    variables.css         — Design system tokens (colors, spacing, typography, shadows)
    reset.css             — CSS reset and normalization
    base.css              — Base element styles
    layout.css            — Grid system, header, nav, responsive layout
    components.css        — Buttons, forms, cards, badges, tabs
    dashboard.css         — Dashboard-specific styles
    editor.css            — Editor-specific styles (~50KB)
    templates.css         — Template rendering styles
    print.css             — Print media styles
    onboarding.css        — Onboarding wizard styles
    utilities.css         — Utility classes
    experience-calculator.css — Calculator-specific styles
    font-manager.css      — Font manager styles
  assets/                 — Static assets directory
  data/                   — Static data files
```

## Documentation
```
docs/
  DASHBOARD_MODULE_INVENTORY.md
  EXACT_FEATURE_INVENTORY.md
  LOCAL_FUNCTIONALITY_AUDIT.md
  SELECTED_MODULE_SPECIFICATION.md
  editor/               — Editor implementation documentation
  design-studio/        — Design studio documentation
  modules/              — Module-level documentation
```

## Tests
```
tests/
  feature1-state.test.html through feature23-ats-restrictions.test.html
  (23 browser-based test files, run via http://localhost:8082/tests/)
```

## Key Architecture Decisions
- Single-page app with hash-based routing (no build step)
- All data stored locally in IndexedDB (careercanvas-db, version 1)
- ES modules loaded directly by browsers
- Global context exposed via `window.CC` object
- Singleton pattern for Database, Router, EventBus, Toast, Modal
- Service Worker is currently unregistered on every page load (line 68-76 of index.html)
