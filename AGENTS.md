# AGENTS.md — CareerCanvas LLM Operating Manual (READ FIRST)

> **RULE 0 — MANDATORY FOR EVERY LLM / AGENT WORKING ON THIS REPO**
>
> 1. **Read this file fully BEFORE writing any code.** It is the persistent context for all LLMs (Codex, Claude, Gemini, Groq, local models, human-assisted agents).
> 2. **Keep this file alive.** Whenever you introduce or change any architecture, convention, contract, script, route, store, template rule, CSS rule, AI mode, auth flow, secret, or test workflow, you **MUST update this file in the same change** (same commit/PR) so the next LLM sees the new truth.
> 3. If this file contradicts older docs (`README.md`, `docs/ARCHITECTURE.md`, `SETUP.md`, `DEPLOY.md`), **this file wins** — then fix the outdated doc and note it in `CHANGELOG.md`.
> 4. If a requested change would violate a **DON'T** below, **refuse or propose a compliant alternative** and explain why.

---

## 1. What this project is

**CareerCanvas** — free, privacy-first, local-first resume/CV/cover-letter builder.

- **Stack:** Vanilla JavaScript (ES Modules), no framework, **no bundler, no transpiler, no build step**. Runs directly from source via any static server (`npx http-server . -p 8080 --cors -c-1`).
- **Entry:** `index.html` → `src/js/app.js` (`CareerCanvasApp`).
- **Storage:** IndexedDB via `src/js/core/db.js` (DB name `careercanvas-db`). All user documents stay on-device. `localStorage` only for prefs/auth flags (`cc_auth_guest`, `onboardingComplete`, theme, AI keys). Every `documents` write is auto-tagged with `ownerId` (`db.js` choke point): signed-in user's id, or `'guest'`. `documents` has an `ownerId` index (DB v5; read via `db.getDocumentsByOwner()` or `loadOwnerDocuments()` in `user-store.js`, which prefers the index and falls back to a full scan); bumping DB version requires a non-destructive upgrade path in `db.js` `onupgradeneeded` + `docs/ARCHITECTURE.md` + `CHANGELOG.md` updates. Optional cloud mirror: Supabase `public.user_documents` (RLS owner-only) via `src/js/auth/cloud-store.js` (offline-first, best-effort, never throws; guests never synced).
- **Routing:** Hash SPA (`#/dashboard`, `#/editor/:id`, …) via `src/js/core/router.js`. Default `/dashboard`.
- **State/events:** `src/js/core/state.js` (StateManager) + `src/js/core/events.js` (EventBus singleton, also on `window.CC.events`).
- **Global context:** `window.CC = { state, db, events, router, toast, modal, templateEngine, exportManager, importManager, atsChecker, themeEngine, app }`. Use it; don't re-instantiate singletons.
- **Templates:** 68 templates in `src/js/templates/` as pure functions `(doc, designVars) => HTML string`, registered at boot via `registerAllTemplates()`.
- **Styling:** 32 plain CSS files linked in `index.html`. Design tokens in `src/css/variables.css`. No preprocessor, no Tailwind.
- **Server code:** Only 3 Vercel serverless functions in `api/` (`ai-analyze.js`, `public-config.js`, `delete-account.js`). Everything else is static.
- **Dev helpers:** `tools/` holds dev-only pages + Windows helpers (`debug.html`, `responsive-test.html`, `*.bat`) — never linked from the app, never cached by `sw.js`. Reports live under `docs/audit/` and `docs/runbook/`, never at repo root.
- **Deploy contract:** `index.html`, `404.html`, `sw.js`, `manifest.json`, `icon.svg`, `api/`, `src/`, `package.json` MUST stay at repo root (Vercel + static hosts expect them there). Don't move them into subfolders.
- **AI:** Optional. Server proxy `/api/ai-analyze` (Groq `llama-3.3-70b-versatile` / Gemini) or direct user key in local dev.
- **Auth:** Optional Supabase. App **must work fully as guest** with zero env vars.

Key references: `README.md` (features), `docs/ARCHITECTURE.md` (deep dive), `SETUP.md` (local run), `DEPLOY.md` (hosting + env vars), `CHANGELOG.md` (history).

---

## 2. DO — required patterns

### General workflow (every task)

- [ ] DO read `AGENTS.md` (this file) + the files you will touch + `docs/ARCHITECTURE.md` § relevant to your area before editing.
- [ ] DO keep changes minimal and scoped. Prefer editing existing files over creating new ones.
- [ ] DO verify with real execution: `npm run lint` (`node scripts/lint.mjs`), `npm test` (`vitest run` for `tests/unit/`), `npm run check` (`node scripts/smoke-check.mjs`). For UI routes, also load `http://localhost:8080/#/dashboard` and check DevTools console for errors.
- [ ] DO update `CHANGELOG.md` for user-visible or contract changes.
- [ ] DO update **this file** when you change any convention/contract listed in Rule 0.

### JavaScript / modules — DO

- DO write **vanilla JS ES Modules** (`import`/`export`). No CommonJS (`require`), no JSX, no TypeScript syntax in `src/` or `api/` (note: `tsconfig.json` exists but source is plain JS — `node --check` must pass).
- DO follow the module lifecycle: class with **`render()` returning a DOM `Element`** and **`destroy()` removing listeners/timers/subscriptions**. Views with pending debounced work (editor autosave) must also flush on `visibilitychange` (hidden) + `pagehide` and in `destroy()` — closing the tab never runs `destroy()`.
- DO create DOM with `document.createElement()` + `textContent` for any user data. `innerHTML` is allowed **only for static markup** or output already passed through `encodeHTML` / `src/js/utils/sanitize.js` / `rich-text-sanitizer.js`.
- DO communicate cross-module via **EventBus** (`document:*`, `editor:*`, `template:*`, `export:*`, `route:*`, `app:*`, `ui:*`, `db:*` — see `src/js/core/events.js` `EVENTS`) or `window.CC` services. Store `events.on()` unsubscribe fns and call them in `destroy()`.
- DO lazy-load heavy studios/tools with dynamic `await import('./modules/<name>.js')` exactly like `app.js` `showView()` does. Eager-import only shell-critical modules (db, router, events, state, schema, template-engine, theme-engine, toast, modal, dashboard, editor).
- DO use `src/js/core/schema.js` factories (`createEmptyDocument()`, `createItem.*`) and `validateDocument()` / `migrateDocument()` / `cloneDocument()` for document shapes. Never hand-roll document objects.
- DO use `generateUUID()` / `generateId()` from `src/js/utils/id.js` for new ids.
- DO debounce autosaves (~1.5s idle), set `lastModified = new Date().toISOString()`, and go through `db.put('documents', doc)`.
- DO add a route in **both** `setupRoutes()` and the header/nav + mobile drawer in `app.js` when adding a page; add auth-gated routes to the guard's non-public list (public routes: `/welcome /login /signup /verify-email /forgot-password /reset-password /auth/callback /import /privacy /terms /features /about /faq /roadmap /contact /accessibility /changelog`).

### IndexedDB / State / Router — DO

- DO access stores only through the `Database` wrapper (`get/put/getAll/delete`). Known stores: `documents, masterProfile, jobDescriptions, applications, contentLibrary, snapshots, images, designPresets, matchAnalyses, skillsMatrices, customSections`. Never bump DB version or rename stores without a `migration.js` path + backup/export test.
- DO use `state.get('dotted.path')` / immutable updates / snapshots for ephemeral UI state; persist user data in IndexedDB, prefs in `localStorage`.
- DO respect the router guard: prompt on `hasUnsavedChanges()`, enforce guest-or-auth gate, preserve `authState.setIntendedRoute()` for post-login redirect.

### Templates — DO

- DO implement templates as objects `{ id, name, category, docTypes, atsLevel, columnCount, photoSupport, render(doc, designVars) }` and register them in `src/js/templates/index.js` (`registerAllTemplates`).
- DO `encodeHTML()` every user-supplied string inside `render()`. DO use `designVars` CSS custom properties for colors/fonts/spacing; keep template styles self-contained/inline so they are isolated from the app theme and print correctly.
- DO declare correct `atsLevel` (`high|medium|low`) and `columnCount` (`1|2`); ATS templates must stay single-column, standard fonts, no text-in-image.

### CSS — DO

- DO put tokens in `src/css/variables.css`, shell in `layout.css`, shared atoms in `components.css`, one file per studio/tool, print rules only in `print.css`.
- DO respect `index.html` `<link>` load order (variables → reset → base → layout → components → module files → utilities → print). When adding a CSS file, add its `<link>` in the correct position in `index.html`.
- DO support dark mode via semantic tokens (`--bg-*, --text-*, --color-primary, --border-*`), never hard-coded colors for chrome UI. DO add `aria-*`, focus states, `.skip-link`, and mobile-drawer entries for new nav.
- DO use `attachTiltEffect()` from `src/js/utils/sanitize.js` for card hover tilt (rAF-throttled, settles when the pointer stops, skips under reduced-motion). Never put infinite float animations on clickable cards — perpetually moving targets can't be clicked reliably by mouse/assistive-tech/automation (WCAG 2.2.2).

### AI (`api/ai-analyze.js` + `src/js/modules/ai-formatter.js`) — DO

- DO route production AI through `/api/ai-analyze` POST `{ resumeText, mode, context }`. Supported modes include `summary, improve, generate-bullets, extract-skills, cover-letter, grammar, jd-enhance, tone, interview-prep, parse-linkedin, resume-from-jd, condense, skill-evidence, bulk-improve, follow-up-email, translate, analyze, resume-score, keyword-optimization/ats-fix, parse`.
- DO enforce server limits: `MAX_INPUT_LENGTH = 15000` chars, 30s abort timeout, 30 req/min rate-limit. Strip HTML before sending; send minimal text needed.
- DO keep the import pipeline name-safe: `parseResumeLocal()` reads the name from the RAW first line (never spell-corrected); `cleanExtractedText()` never merges the header block (no joins onto line 1, never onto/into email/url lines). Data exports (json/text/markdown/html) warn-and-continue on validation findings — only pdf/docx hard-block with an override. Settings backup import is add-only (`db.create`, duplicates skipped) per its dialog promise.
- DO auto-detect provider by key prefix (`gsk_` = Groq, `AIza` = Gemini) on the client; default to server proxy so users never need a key.
- DO parse defensively (AI returns text *or* JSON depending on mode) and surface errors via toast, never silent failure.
- DO declare dev-agent MCP servers in `opencode.json` (`context7`, `gh_grep`, `playwright`, `supabase` remote-scoped via `?project_ref=` + `?features=`); verify with `opencode mcp list` + `opencode mcp auth supabase` for OAuth. Never put secrets in it — use `{env:VAR}` refs. The `playwright` server must use the pinned global binary (`playwright-mcp --headless`, via `npm install -g @playwright/mcp@0.0.82`) — never `npx -y @playwright/mcp@latest` (resolves to an alpha, hits the registry on every launch, breaks cold starts). After editing `opencode.json`, reload MCP servers in the client.

### Auth / secrets / privacy — DO

- DO keep auth optional and non-blocking (boot awaits `initializeAuth()` in a bounded ~4s race, the router guard awaits `waitForInit()` the same way — never an unbounded wait); guest mode (`cc_auth_guest === 'true'`) must unlock all local features. Fresh guests enter via `app.enterAsGuest()` (setup wizard over dashboard); returning guests with docs skip it. Guest documents are **temporary**: never cloud-synced, dashboard shows a guest banner, `ownerId === 'guest'` docs are wiped on sign-in/sign-up/sign-out (`user-store.js` `clearGuestData`). Both sign-in entries (dashboard banner, header guest menu) first offer a one-click backup via `dashboard:exportAll` when `countGuestDocuments() > 0`. Signup requires Terms+Privacy checkbox (button disabled until checked). Email verification completes via PKCE `exchangeCodeForSession()` in `handleAuthCallback()` — never rely on `getSession()` alone for callback links. Signed-in users see only their own docs (dashboard owner filter + editor ownership guard); legacy untagged docs are adopted once via `adoptLegacyDocuments()`. Never overwrite another owner's `ownerId`. The editor re-checks ownership on every save (`saveDocument()` blocks + redirects on foreign docs) and implements `hasUnsavedChanges()` so the router guard prompts on pending autosaves.
- DO read Supabase config from `/api/public-config`, `window.__CC_AUTH_CONFIG__`, or dev-only gitignored `src/js/auth/local-config.js` (localhost only — see `local-config.example.js`; never commit real keys). DO keep `SUPABASE_SERVICE_ROLE_KEY` **server-side only** (`api/delete-account.js`). Production login requires `SUPABASE_URL` + `SUPABASE_ANON_KEY` in Vercel env.
- DO use fictional sample data, never real PII in code, tests, or docs. Never log resume content, keys, or tokens to console.
- DO copy `.env.example` to `.env.local` (gitignored) for local secrets; configure real values only in Vercel env dashboard.

### Tests / scripts — DO

- DO add/extend `tests/unit/*.test.js` (vitest) for logic changes and run `npm test`.
- DO keep browser smoke tests in `tests/*.test.html` loadable via `http://localhost:8080/tests/<file>`.
- DO run `npm run lint`, `npm run audit:all` (`audit-imports, audit-contracts, audit-classes, audit-css`), and `npm run check` before declaring done. `scripts/lint.mjs` fails on secrets (`sk-…`, `AIza…`, `ghp_…`, `xox…`) and on `node --check` syntax errors.

---

## 3. DON'T — forbidden / high-risk

- DON'T add React, Vue, Angular, jQuery, Tailwind, Bootstrap, Sass/Less, bundlers (webpack/vite/rollup/esbuild), transpilers, or any npm runtime dependency. This repo is intentionally **zero-dependency** (only `typescript` + `vitest` as devDeps). If you think a dep is needed, stop and ask.
- DON'T convert modules to CommonJS, add `package.json` build scripts that compile, or check in `dist/` / `node_modules/` / `.env` / `.local-backup/`.
- DON'T use `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` with unsanitized user data. DON'T set `href/src` from user input without `sanitizeURL()`. DON'T allow `javascript:` / `data:` URLs.
- DON'T use native `confirm()` / `prompt()` / `alert()` for user decisions — they auto-dismiss in automation, can't be styled or focus-trapped, and can render behind overlays. Use `window.CC.modal.confirm/prompt/alert` (promise-based; X/Escape safely cancels), or an inline two-step confirm (wizard Skip pattern) when a modal would stack under another overlay.
- DON'T hardcode API keys, Supabase URLs/keys, JWTs, or real emails in code, tests, HTML, or docs. DON'T commit `.env.local` or paste real keys into `index.html`'s `__CC_AUTH_CONFIG__` (empty defaults only in repo).
- DON'T expose `GROQ_API_KEY` / `GEMINI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` to the browser. Server keys stay in `api/*` env only.
- DON'T upload documents, send full IndexedDB dumps, or add tracking/analytics/cookies. Core features must make **zero external network calls** (AI/auth are the only exceptions, user-initiated).
- DON'T break offline support: don't remove `sw.js` registration handling (`index.html` registers `sw.js` on `load`), don't make boot depend on network/AI/auth. When adding shell assets (CSS/JS linked from `index.html`), add them to `sw.js` `STATIC_ASSETS` and bump `CACHE_NAME` — `tests/unit/offline-cache.test.js` enforces this (never cache `src/js/auth/local-config.js` or `tools/`).
- DON'T change `SCHEMA_VERSION`, DB name/version, store names, document shape, template registration contract, EventBus event names, route paths, or CSS token names without updating `schema.js`/`migration.js`, `docs/ARCHITECTURE.md`, this file, and `CHANGELOG.md` together.
- DON'T bypass the router (no `location.href` page reloads, no direct DOM replacement of `#app` outside `app.js`), don't skip `destroy()` cleanup, don't leave dangling `events.on()` listeners, timers, or `URL.createObjectURL` blobs.
- DON'T put app-theme CSS inside document templates or document content inside app-theme selectors — the two systems are isolated.
- DON'T invent new AI modes, prompt contracts, or response shapes without implementing both client (`ai-formatter.js`) and server (`api/ai-analyze.js`) sides plus validation and docs.
- DON'T weaken ATS templates (no multi-column, no canvas text, no icon-only meaning) and don't claim ATS guarantees.
- DON'T edit generated/minified artifacts, `.git/` internals, or another author's uncommitted changes. DON'T `git commit/push`, change git config, or force-push unless explicitly asked.
- DON'T create new top-level markdown docs proactively; update this file + `CHANGELOG.md` + the relevant existing doc instead.

---

## 4. Definition of done (LLM checklist)

1. `npm run lint` → `LINT OK`; `npm test` → all pass; `npm run check` → smoke OK.
2. No console errors on `/dashboard`, `/editor/:id`, `/templates`, `/settings`, and any route you touched.
3. No secrets introduced (`lint` secret scan passes; `git status` shows no `.env*` other than `.env.example`).
4. XSS check: all new user-data rendering uses `textContent` / `encodeHTML` / sanitizers; URLs via `sanitizeURL`.
5. Lifecycle check: new views/modules implement `render` + `destroy`, unsubscribe events, lazy-load where appropriate.
6. Docs check: `CHANGELOG.md` entry added; **this file updated if any Rule-0 area changed**; `docs/ARCHITECTURE.md` updated if architecture changed.

---

## 5. How to update this file (self-maintenance)

When your change affects anything in Rule 0:

1. Edit the smallest matching DO/DON'T section (keep bullets short, imperative, file-pathed like `src/js/core/db.js:42`).
2. Keep the header `RULE 0` block verbatim — never delete it.
3. Add a `CHANGELOG.md` line referencing the behavior + this file update.
4. Mention the `AGENTS.md` update explicitly in your final summary to the user.

*Last verified against: `src/js/app.js` boot/router/shell, `src/js/core/*` (8 modules), `src/js/modules/*` (43 modules), `src/js/auth/*` (7 tracked files: auth-config/service/state/ui + user-store/cloud-store/local-config.example; plus gitignored `local-config.js`), `src/js/templates/*`, `src/css/*` (33 files via `index.html`), `api/*.js` (3 functions), Supabase `public.user_documents` (RLS owner-only), `sw.js` (`careercanvas-v18`, full shell asset list), root `manifest.json` + `icon.svg`, `opencode.json` (pinned `playwright-mcp` binary), `tests/unit/` (27 files), `scripts/lint.mjs`, `package.json` scripts, `docs/ARCHITECTURE.md`, `.env.example`, `.gitignore`.*
