# CareerCanvas Architecture

Developer reference for understanding, navigating, and modifying the CareerCanvas codebase.

---

## 1. Overview

CareerCanvas is a browser-based resume, CV, and career document builder.

- **Stack**: Vanilla JavaScript, ES Modules, CSS Custom Properties. No framework, no build step, no bundler.
- **Size**: ~80K lines across 106 files (74 JS, 32 CSS).
- **Storage**: IndexedDB (11 object stores) for all user data. No backend database required.
- **Theming**: CSS Custom Properties with a dedicated ThemeEngine (light/dark built-in themes, user-customizable).
- **Deployment**: Static hosting + 3 Vercel serverless functions for AI and auth.
- **Offline**: Service worker (`sw.js`) caches static assets for offline use.

---

## 2. Entry Point

```
index.html
  -> <link> 32 CSS files (eagerly loaded)
  -> <script type="module" src="src/js/app.js">
       -> CareerCanvasApp class
```

### Init Flow (`CareerCanvasApp.init()`)

1. **Database** -- `new Database().open()` initializes IndexedDB
2. **Templates** -- `registerAllTemplates()` registers all document templates
3. **Global Context** -- `window.CC` object exposes core services (db, events, router, toast, etc.)
4. **Routes** -- 33 routes registered on hash-based router
5. **Shell** -- Header, nav, mobile drawer, toast/modal containers rendered
6. **Theme** -- `ThemeEngine.init()` applies persisted or system-default theme
7. **Auth** -- `initializeAuth()` (non-blocking; app works as guest if Supabase is not configured)
8. **Router Start** -- Hash router begins matching; first-time visitors go to `/welcome`

### Global Context (`window.CC`)

All core services are accessible via `window.CC`:

```
CC.db             // Database instance
CC.state          // StateManager
CC.events         // EventBus singleton
CC.router         // Router
CC.toast          // Toast notifications
CC.modal          // Modal manager
CC.templateEngine // Template registry
CC.exportManager  // Export pipeline
CC.importManager  // Import pipeline
CC.atsChecker     // ATS scoring
CC.themeEngine    // App theme management
CC.app            // CareerCanvasApp instance
```

---

## 3. Core Modules (`src/js/core/`)

### `db.js` -- IndexedDB Wrapper

Promise-based CRUD over 11 object stores:

| Store              | Purpose                                |
|--------------------|----------------------------------------|
| `documents`        | Resume/CV/cover letter documents       |
| `masterProfile`    | User's master profile data             |
| `jobDescriptions`  | Saved job descriptions for matching    |
| `applications`     | Job application tracking records       |
| `contentLibrary`   | Reusable content snippets              |
| `snapshots`        | Document version snapshots             |
| `images`           | Photo/logo blobs                       |
| `designPresets`    | Saved design configurations            |
| `matchAnalyses`    | JD-to-resume match results             |
| `skillsMatrices`   | Skills matrix data                     |
| `customSections`   | User-defined section templates         |

Database name: `careercanvas-db`, version 5 (`documents` has an `ownerId` index for
per-user queries; v4 databases upgrade non-destructively on open. `db.getDocumentsByOwner()`
prefers the index and falls back to in-memory filtering).

### `router.js` -- Hash-based Router

- Routes use `#/path` format with parameter support (`/editor/:id`).
- `setGuard()` supports async navigation guards (unsaved-changes prompt, auth gating).
- Emits `route:change` and `route:beforeChange` events.
- Default route: `/dashboard`.

### `events.js` -- Event Bus

Singleton pub/sub system with namespace support (`document:*` wildcards).

Key event groups:

| Namespace    | Events                                              |
|--------------|-----------------------------------------------------|
| `document:`  | create, open, save, delete, duplicate, rename, export |
| `editor:`    | change, focus, blur, undo, redo                     |
| `state:`     | change, reset, snapshot                              |
| `route:`     | change, beforeChange                                 |
| `ui:`        | modalOpen, modalClose, notification, loading         |
| `db:`        | ready, error, storageWarning                         |
| `template:`  | apply, change                                        |
| `export:`    | start, complete, error                               |
| `app:`       | ready, error, offline, online                        |

### `schema.js` -- Document Schema

Defines the canonical document structure.

- **Document types**: resume, cv, coverLetter, referenceSheet, portfolio, onePager
- **35 section types**: personalInfo, professionalSummary, professionalExperience, education, skills, projects, certifications, publications, volunteer, languages, interests, custom, and 23 more
- `createEmptyDocument()` factory generates a valid blank document with UUID

### `state.js` -- State Manager

Observable state store with:
- Dot-notation path access (`state.get('user.profile.name')`)
- Immutable updates with change notification
- Undo/redo history (100-entry ring buffer)
- Named snapshots for save points
- Batch mode for grouped changes

### `template-engine.js` -- Template Registry

Manages template registration and lookup:
- Each template provides: `id`, `name`, `category`, `docTypes`, `atsLevel`, `columnCount`, `photoSupport`, `render(doc, designVars)`
- Templates self-register via `registerAllTemplates()` at boot
- Supports filtering by category, doc type, ATS level, etc.

### `theme-engine.js` -- App Theme System

Controls the application UI theme (not document/print templates):
- Built-in light and dark themes with full semantic token sets
- User-created custom themes stored in localStorage
- System preference detection (`prefers-color-scheme`)
- Tokens applied as CSS custom properties on `:root`

### `migration.js` -- Schema Migration

Versioned migration runner:
- Tracks version in localStorage
- Sequential migration functions transform data from version N to N+1
- Currently at schema version 1

---

## 4. Module Architecture (`src/js/modules/`)

40 modules, each a class with `render()` returning a DOM element and `destroy()` for cleanup.

### Core Application Modules

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `Dashboard`               | `dashboard.js`              | Document list, stats, quick actions              |
| `ResumeEditor`            | `editor.js`                 | Main document editor with live preview           |
| `OnboardingWizard`        | `onboarding.js`             | First-run wizard for new document creation       |
| `DesignPanel`             | `design-panel.js`           | Template/design customization sidebar            |
| `TemplateGallery`         | `template-gallery.js`       | Browse and preview all templates                 |
| `MasterProfile`           | `master-profile.js`         | Central profile data shared across documents     |
| `ApplicationTracker`      | `application-tracker.js`    | Track job applications and statuses              |
| `SettingsPanel`           | `settings.js`               | App-wide settings (AI keys, preferences)         |

### Export/Import

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `ExportManager`           | `export-manager.js`         | PDF, HTML, JSON, text, markdown export           |
| `ExportWizard`            | `export-wizard.js`          | Guided export with page-fit optimization         |
| `ImportManager`           | `import-manager.js`         | Import from JSON, PDF, DOCX, LinkedIn, plain text|
| `PrintManager`            | `print-manager.js`          | Browser print dialog integration                 |

### AI-Powered

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `AiFormatter`             | `ai-formatter.js`           | 15 AI methods (summary, improve, grammar, etc.)  |
| `SmartFormatter`          | `smart-formatter.js`        | Local formatting rules (no AI)                   |
| `ATSChecker`              | `ats-checker.js`            | ATS compatibility scoring                        |

### Editor Enhancements

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `FloatingToolbar`         | `floating-toolbar.js`       | Context toolbar on text selection                |
| `Autocomplete`            | `autocomplete.js`           | Smart text completion in editor fields           |
| `FontManager`             | `font-manager.js`           | Google Fonts integration and font loading        |

### Career Tools

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `JobMatcher`              | `job-matcher.js`            | Compare resume against job description           |
| `SkillsMatrix`            | `skills-matrix.js`          | Skills assessment and visualization              |
| `SkillsMatrixAnalyzer`    | `skills-matrix-analyzer.js` | Skills gap analysis engine                       |
| `SkillsMatrixData`        | `skills-matrix-data.js`     | Industry skills database                         |
| `ExperienceCalculator`    | `experience-calculator.js`  | Total experience duration calculator (modal)     |
| `SpaceOptimizer`          | `space-optimizer.js`        | Content space/density optimization               |

### Studio Tools

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `ThemeStudio`             | `theme-studio.js`           | Create and edit app themes                       |
| `SectionStudio`           | `section-studio.js`         | Custom section type builder                      |
| `PdfStudio`               | `pdf-studio.js`             | Advanced PDF layout control                      |
| `PackageStudio`           | `package-studio.js`         | Multi-document application packages              |
| `TimelineStudio`          | `timeline-studio.js`        | Visual career timeline                           |
| `ConsistencyStudio`       | `consistency-studio.js`     | Cross-section consistency checker                |
| `PrivacyStudio`           | `privacy-studio.js`         | PII detection and redaction                      |
| `LocalizationStudio`      | `localization-studio.js`    | Resume translation/localization                  |
| `PortfolioStudio`         | `portfolio-studio.js`       | Portfolio page builder                           |
| `LinkQrStudio`            | `link-qr-studio.js`        | Shareable links and QR codes                     |
| `A11yInspector`           | `a11y-inspector.js`         | Accessibility audit                              |
| `VersionStudio`           | `version-studio.js`         | Document version history and diff                |
| `DataStudio`              | `data-studio.js`            | Data export/backup management                    |
| `StressLab`               | `stress-lab.js`             | Template stress testing with edge-case data      |

### UI Primitives

| Module                    | File                        | Description                                      |
|---------------------------|-----------------------------|--------------------------------------------------|
| `Toast`                   | `toast.js`                  | Non-blocking notification toasts                 |
| `Modal`                   | `modal.js`                  | Modal dialog manager                             |

### Key Patterns

- **DOM creation**: Modules use `document.createElement()` -- no JSX, no template literals in innerHTML for user data.
- **Lifecycle**: `render()` builds and returns the root element; `destroy()` removes event listeners and cleans up.
- **Lazy loading**: Career tools and studio modules use dynamic `import()` -- only loaded when the route is visited.
- **Event cleanup**: Modules store unsubscribe functions from `events.on()` and call them in `destroy()`.

---

## 5. Template System (`src/js/templates/`)

### How Templates Work

Each template is an object with:

```js
{
  id: 'template-id',
  name: 'Display Name',
  category: 'professional',      // Category for gallery filtering
  docTypes: ['resume', 'cv'],    // Which document types it supports
  atsLevel: 'high',              // ATS friendliness: high | medium | low
  columnCount: 1,                // Layout columns (1 or 2)
  photoSupport: true,            // Whether it renders a photo
  render(doc, designVars) { ... } // Returns HTML string
}
```

The `render` function receives the document data and a `designVars` object containing CSS variable overrides (colors, fonts, spacing). Templates output self-contained HTML with inline `<style>` blocks using CSS custom properties.

### Template Categories (9 categories)

| Category       | File                           | Description                       |
|----------------|--------------------------------|-----------------------------------|
| ATS            | `ats-templates.js`             | Optimized for applicant tracking  |
| Professional   | `professional-templates.js`    | Classic business layouts          |
| Technical      | `technical-templates.js`       | Developer/engineer focused        |
| Creative       | `creative-templates.js`        | Design-forward layouts            |
| Cover Letter   | `cover-letter-templates.js`    | Letter-format templates           |
| References     | `reference-templates.js`       | Reference sheet layouts           |
| Student        | `student-templates.js`         | Entry-level/academic              |
| Executive      | `executive-templates.js`       | Senior leadership focused         |
| Academic       | `academic-templates.js`        | CV/research-oriented              |

All templates are registered at boot via `registerAllTemplates()` in `src/js/templates/index.js`.

### Photo Support

Templates with `photoSupport: true` call a `renderPhoto(doc, designVars)` helper that renders the user's photo (stored as a blob in the `images` IndexedDB store) with configurable size, shape, and border.

---

## 6. AI Architecture

### Client Module: `src/js/modules/ai-formatter.js`

The `AiFormatter` class provides 15 AI-powered methods:

| Method                | Mode (API)        | Returns                              |
|-----------------------|-------------------|---------------------------------------|
| `analyzeResume()`     | (default)         | Array of issue objects                |
| `improveText()`       | `improve`         | Improved text string                  |
| `generateSummary()`   | `summary`         | Professional summary text             |
| `generateBullets()`   | `generate-bullets` | Array of achievement bullets          |
| `extractSkills()`     | `extract-skills`  | Array of skill strings                |
| `generateCoverLetter()` | `cover-letter`  | Cover letter text                     |
| `checkGrammar()`      | `grammar`         | Array of correction objects           |
| `generateInterviewPrep()` | `interview-prep` | Formatted interview Q&A           |
| `parseLinkedIn()`     | `parse-linkedin`  | Structured profile JSON               |
| `generateResumeFromJD()` | `resume-from-jd` | Resume skeleton JSON                |
| `condenseBullets()`   | `condense`        | Array of condensed strings            |
| `generateSkillEvidence()` | `skill-evidence` | Array of evidence bullets           |
| `bulkImprove()`       | `bulk-improve`    | Array of improved bullets             |
| `generateFollowUpEmail()` | `follow-up-email` | Email text                         |
| `translateResume()`   | `translate`       | Translated content                    |

Additional server-side modes: `jd-enhance`, `tone`, `parse` (17 total API modes).

### Server Proxy: `api/ai-analyze.js`

Vercel serverless function that:
1. Receives `{ resumeText, mode, context }` from the client
2. Builds mode-specific system/user prompts
3. Proxies to Groq API with server-side `GROQ_API_KEY`
4. Returns `{ result: string }` to client

Provider: **Groq** (model: `llama-3.3-70b-versatile`), temperature 0.3, max 2048 tokens, 30s timeout.

### Dual-Mode Operation

```
Deployed (Vercel):     Client -> /api/ai-analyze -> Groq API
Local dev (own key):   Client -> Groq API directly (or Gemini)
```

- Server proxy is the default path -- users never need an API key.
- Optional: users can configure their own Groq or Gemini key in Settings for direct calls.
- Provider auto-detected by key prefix: `gsk_` = Groq, `AIza` = Gemini.

---

## 7. Authentication (`src/js/auth/`)

### Files

| File              | Purpose                                                  |
|-------------------|----------------------------------------------------------|
| `auth-config.js`  | Fetches Supabase credentials from `/api/public-config` (prod), `window.__CC_AUTH_CONFIG__`, or gitignored `local-config.js` (localhost dev only) |
| `auth-state.js`   | Singleton state manager with subscriber pattern          |
| `auth-service.js` | Supabase client init, sign-in/up/out, session management |
| `auth-ui.js`      | Login, signup, password reset, account pages (DOM)       |
| `user-store.js`   | Per-user ownership: `ownerId` tagging/filter, legacy adoption, guest-data wipe |
| `cloud-store.js`  | Optional Supabase `user_documents` mirror (offline-first, best-effort) |

### Design Principles

- **Optional**: Auth is non-blocking. The app works fully without Supabase configured.
- **Guest mode**: Default. Guest documents (`ownerId === 'guest'`) are temporary — usable during the session, never synced, dashboard shows a guest banner, and they are wiped on sign-in/sign-up/sign-out. No account required.
- **Signed-in mode**: Every `documents` write is auto-tagged with the user's id (`db.js` choke point). Dashboard shows only that user's saved resumes; the editor blocks opening other owners' docs by URL. Legacy untagged docs are adopted once on login.
- **Cloud sync**: When configured, `user_documents` (RLS: owner-only) mirrors documents — dashboard merges (newer `lastModified` wins, local-only pushed up), editor autosave mirrors. IndexedDB stays the source of truth; all cloud calls fail soft.
- **Auth statuses**: `initializing`, `authenticated`, `unauthenticated`, `guest`, `expired`, `configError`, `providerError`, `offline`.
- **Route guarding**: Public routes (`/welcome`, `/login`, `/signup`, etc.) are accessible without auth. All other routes require either guest mode or authentication.
- **Intended route**: When auth redirects to login, the originally requested route is preserved and restored after sign-in.

### Design Principles

- **Optional**: Auth is non-blocking. The app works fully without Supabase configured.
- **Guest mode**: Default. All data stored locally in IndexedDB. No account required.
- **Auth statuses**: `initializing`, `authenticated`, `unauthenticated`, `guest`, `expired`, `configError`, `providerError`, `offline`.
- **Route guarding**: Public routes (`/welcome`, `/login`, `/signup`, etc.) are accessible without auth. All other routes require either guest mode or authentication.
- **Intended route**: When auth redirects to login, the originally requested route is preserved and restored after sign-in.

---

## 8. Data Flow

### Document Lifecycle

```
Create (Onboarding/New)
  -> schema.createEmptyDocument()
  -> db.put('documents', doc)
  -> router.navigate('/editor/:id')

Edit
  -> Editor renders doc with template
  -> User edits fields (contenteditable / inputs)
  -> Autosave debounced (1.5s idle)
  -> db.put('documents', doc)

Export
  -> ExportManager/ExportWizard
  -> Render template to HTML
  -> Convert: PDF (print), HTML (download), JSON, text, markdown
```

### Import Pipeline

```
File selected (JSON / PDF / DOCX / TXT / LinkedIn)
  -> ImportManager detects format
  -> Parser extracts structured data
  -> AI parse mode for unstructured text (optional)
  -> Review/map screen for field confirmation
  -> Create new document or merge into existing
```

### AI Request Flow

```
User triggers AI action (e.g., "Improve bullet")
  -> AiFormatter.improveText(text, context)
  -> Extract text, strip HTML
  -> POST /api/ai-analyze { resumeText, mode: 'improve', context }
     (or direct Groq/Gemini call if user has own key)
  -> Parse response (text or JSON depending on mode)
  -> Apply result to document field
  -> Autosave triggers
```

---

## 9. CSS Architecture (`src/css/`)

### Load Order (defined in `index.html`)

1. `variables.css` -- Design tokens (colors, spacing, typography, shadows, radii)
2. `reset.css` -- CSS reset / normalize
3. `base.css` -- Element defaults, typography, scrollbars
4. `layout.css` -- App shell, header, nav, main content area, mobile drawer
5. `components.css` -- Buttons, cards, form elements, badges, dropdowns
6. Module-specific files (one per feature/studio)
7. `utilities.css` -- Utility classes (spacing, flex, text, visibility)
8. `print.css` -- `@media print` rules for document output

### Theming

- App themes use CSS custom properties set on `:root` by ThemeEngine.
- Document templates use their own inline styles (isolated from app theme).
- Dark mode is a full theme swap (not a media query toggle) -- all semantic tokens change.
- ~25 semantic tokens: `--bg-primary`, `--text-primary`, `--color-primary`, `--border-primary`, etc.

### File Count: 32 CSS files

Core (8): variables, reset, base, layout, components, utilities, print, templates
Module-specific (22): dashboard, editor, onboarding, design-panel, font-manager, auth, skills-matrix, job-matcher, theme-studio, section-studio, pdf-studio, package-studio, timeline-studio, consistency-studio, privacy-studio, localization-studio, portfolio-studio, link-qr-studio, space-optimizer, a11y-inspector, version-studio, data-studio, stress-lab
Feature (2): experience-calculator, font-manager

---

## 10. API Routes (`api/`)

Three Vercel serverless functions:

| Route                | File                 | Method | Purpose                                          |
|----------------------|----------------------|--------|--------------------------------------------------|
| `/api/ai-analyze`    | `ai-analyze.js`      | POST   | AI proxy: 17 modes via Groq (Llama 3.3 70B)     |
| `/api/public-config` | `public-config.js`   | GET    | Returns Supabase URL/keys for client-side auth   |
| `/api/delete-account`| `delete-account.js`  | POST   | Deletes user account via Supabase service role   |

Environment variables required:
- `GROQ_API_KEY` -- For AI features
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` -- For auth
- `PUBLIC_SITE_URL` -- For auth redirects

---

## 11. File Tree Summary

```
careercanvas/
  index.html                    # Single HTML entry point
  404.html                      # SPA fallback for Vercel
  sw.js                         # Service worker (offline caching)
  package.json                  # Metadata only (no build scripts)
  api/
    ai-analyze.js               # AI serverless proxy
    public-config.js            # Auth config endpoint
    delete-account.js           # Account deletion endpoint
  src/
    css/                        # 32 CSS files
      variables.css             # Design tokens
      reset.css                 # CSS reset
      base.css                  # Element defaults
      layout.css                # App shell layout
      components.css            # Shared components
      ...                       # Module-specific styles
    js/
      app.js                    # Application entry point
      core/                     # 8 core modules
        db.js                   # IndexedDB wrapper
        router.js               # Hash router
        events.js               # Event bus
        schema.js               # Document schema
        state.js                # State manager
        template-engine.js      # Template registry
        theme-engine.js         # Theme system
        migration.js            # Schema migrations
      modules/                  # 40 feature modules
        editor.js               # Document editor
        dashboard.js            # Document dashboard
        ...                     # See Section 4
      templates/                # 10 template files
        index.js                # Template aggregator
        ats-templates.js        # ATS-optimized templates
        professional-templates.js
        technical-templates.js
        creative-templates.js
        cover-letter-templates.js
        reference-templates.js
        student-templates.js
        executive-templates.js
        academic-templates.js
      auth/                     # 4 auth files
        auth-config.js
        auth-state.js
        auth-service.js
        auth-ui.js
      data/                     # 4 data files
        sample-data.js          # Onboarding sample data
        writing-tips.js         # Editor writing guidance
        autocomplete-data.js    # Autocomplete suggestions
        typography-presets.js   # Font/typography presets
      utils/                    # 4 utility files
        id.js                   # UUID generation
        format.js               # Date/number formatting
        sanitize.js             # HTML sanitization
        rich-text-sanitizer.js  # Rich text paste cleaning
```

---

## 12. Key Conventions

- **No framework**: All DOM manipulation is imperative (`createElement`, `innerHTML` for static markup, `textContent` for user data).
- **ES Modules**: All imports use browser-native `import`/`export`. No CommonJS, no bundler.
- **Singleton services**: EventBus, AuthState, and the `window.CC` global context are singletons.
- **Lazy imports**: Heavy modules (studios, career tools) use dynamic `import()` to reduce initial load.
- **Local-first**: All data persists in IndexedDB. Server/cloud features (AI, auth) are optional enhancements.
- **No build step**: The app runs directly from source files. `package.json` exists for metadata, not for npm scripts.
