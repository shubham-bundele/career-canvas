# Maintainer Guide

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Local Development

### Start Command
```bash
npx http-server . -p 8080 --cors -c-1
```
Opens at `http://localhost:8080`

### Start with Auto-Open
```bash
npx http-server . -p 8080 --cors -c-1 -o
```

### Test Command
Open test files directly in the browser:
```
http://localhost:8080/tests/feature1-state.test.html
```
No automated test runner is configured. Tests are run individually by opening HTML files.

---

## Directory Structure

```
careercanvas/
├── index.html              # Single-page app entry point
├── sw.js                   # Service Worker (currently disabled)
├── package.json            # Project metadata and scripts
├── .env.example            # Environment variable template
├── 404.html                # Custom 404 page
├── api/                    # Vercel serverless functions
│   ├── ai-analyze.js       # Groq AI proxy
│   ├── public-config.js    # Auth config endpoint
│   └── delete-account.js   # Account deletion endpoint
├── src/
│   ├── css/                # 32 CSS files
│   │   ├── variables.css   # CSS custom properties
│   │   ├── reset.css       # CSS reset
│   │   ├── base.css        # Base element styles
│   │   ├── layout.css      # App shell layout
│   │   ├── components.css  # Shared UI components
│   │   ├── editor.css      # Editor styles
│   │   └── ...             # Per-feature CSS files
│   └── js/
│       ├── app.js          # Application entry point
│       ├── core/           # Core infrastructure
│       │   ├── db.js       # IndexedDB abstraction
│       │   ├── router.js   # Hash-based SPA router
│       │   ├── schema.js   # Document schema definitions
│       │   ├── state.js    # State management with undo/redo
│       │   ├── events.js   # Event bus
│       │   ├── migration.js # Schema migration system
│       │   ├── template-engine.js # Template registry
│       │   └── theme-engine.js    # App theme system
│       ├── modules/        # Feature modules (~40 files)
│       ├── templates/      # Template renderers (10 files)
│       ├── data/           # Static data (4 files)
│       ├── utils/          # Utility functions (4 files)
│       └── auth/           # Authentication (4 files)
├── tests/                  # 28 browser-based test files
└── docs/                   # Documentation
```

---

## Adding Features

### Adding a Route
1. Create module in `src/js/modules/your-feature.js`
2. Export a class with a `render(db)` method returning an HTMLElement
3. In `app.js`, register route: `this.router.on('/your-route', () => this.showView('your-view'));`
4. Add case in `showView()` switch statement
5. Optionally add navigation link in desktop nav and mobile drawer
6. Create CSS file if needed in `src/css/your-feature.css`
7. Add CSS link in `index.html`

### Adding a Document Type
1. Add constant in `schema.js` `DOCUMENT_TYPES`
2. Add case in `getDocumentTypeDefaults()` with default sections and template
3. Add wizard steps in `onboarding.js` `STEPS_BY_TYPE`
4. Map wizard selection in `getDocumentType()`
5. Update import type detection in `import-manager.js` `detectDocumentType()`
6. Add dashboard filter if needed

### Adding a Section Type
1. Add constant in `schema.js` `SECTION_TYPES`
2. Add title in `DEFAULT_SECTION_TITLES`
3. Create factory function (e.g., `createNewSectionItem()`)
4. Add rendering logic in `editor.js` entry editor section
5. Update import parser section mapping

### Adding a Template
1. Create template object in appropriate category file (`src/js/templates/`)
2. Template must implement: `{ id, name, description, category, docTypes, atsLevel, columnCount, photoSupport, supportedPageSizes, render(doc, design) }`
3. Add to the category's exported array
4. Template is automatically registered via `templates/index.js`

### Adding a Theme
1. Add theme object in `theme-engine.js` `BUILT_IN_THEMES` array
2. Each theme provides 27+ CSS token values
3. Theme is automatically available in Theme Studio

### Adding a Career Tool
1. Create module in `src/js/modules/your-tool.js`
2. Export class with `render(db)` method
3. Register route in `app.js`
4. Add navigation link in Tools dropdown
5. Create CSS file and link in `index.html`

### Adding an IndexedDB Store
1. Add store name to `STORES` constant in `db.js`
2. Add creation logic in `createStores()` with key path and indexes
3. Increment `DB_VERSION` (currently 4)
4. Add version check: `if (!db.objectStoreNames.contains(STORES.NEW_STORE))`

### Adding an Import Format
1. Add method in `import-manager.js` (e.g., `importNewFormat(file)`)
2. Add format card in `renderImportView()`
3. Add handling in `handleFormatSelect()` and drop zone handler
4. Add file validation in `validateFile()`

### Adding an Export Format
1. Add format constant in `export-manager.js` `EXPORT_FORMATS`
2. Add export method (e.g., `exportNewFormat(document)`)
3. Add conversion method if needed
4. Add menu item in editor's `showExportMenu()`
5. Add case in `handleExport()`

### Adding a Vercel API Route
1. Create function in `api/your-route.js`
2. Export default async handler with `(req, res)` signature
3. Add CORS headers
4. Use environment variables for secrets
5. Never expose private keys to the browser

---

## Service Worker Updates

The service worker is currently disabled. To re-enable:
1. Remove the inline script in `index.html` that unregisters SWs
2. Update `CACHE_NAME` version in `sw.js`
3. Update `STATIC_ASSETS` list to include all necessary files
4. Test offline behavior

---

## Environment Variables

| Variable | Required For | Where Set |
|----------|-------------|-----------|
| `SUPABASE_URL` | Authentication | Vercel dashboard |
| `SUPABASE_ANON_KEY` | Authentication | Vercel dashboard |
| `PUBLIC_SITE_URL` | Auth redirects | Vercel dashboard |
| `AUTH_MAGIC_LINK_ENABLED` | Magic link auth | Vercel dashboard |
| `AUTH_GOOGLE_ENABLED` | Google OAuth | Vercel dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Account deletion | Vercel dashboard |
| `GROQ_API_KEY` | AI analysis | Vercel dashboard |
