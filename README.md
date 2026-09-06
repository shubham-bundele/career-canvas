# CareerCanvas

**Free AI-powered resume builder** -- no paywall, no watermark, no registration required.

Build resumes, CVs, cover letters, reference sheets, and LinkedIn drafts entirely in your browser. All data stays on your device unless you opt into AI features.

---

## Features

### Document Types

- Resume / CV
- Cover Letter
- Reference Sheet
- LinkedIn Draft

### Editor

- WYSIWYG contenteditable editing with live preview
- Drag-and-drop section reordering
- Undo / redo history
- Autosave to IndexedDB
- Floating toolbar (bold, italic, link, AI rewrite)
- Autocomplete suggestions for skills, job titles, and action verbs
- Rich text sanitization on paste

### AI Features (18)

All AI features use **Gemini (Llama 3.3 70B)** or **Gemini** via a server proxy or direct key.

| # | Feature | Description |
|---|---------|-------------|
| 1 | Per-bullet improve | Rewrite a single bullet point for impact |
| 2 | AI generate bullets | Generate experience bullets from a job title |
| 3 | AI summary | Generate a professional summary from resume content |
| 4 | AI skills extractor | Extract skills from resume text |
| 5 | Grammar check | Fix grammar and phrasing issues |
| 6 | Cover letter generator | Generate a cover letter from resume + job description |
| 7 | ATS AI fix | Rewrite content to pass ATS keyword checks |
| 8 | Smart Format AI analyze | AI-powered formatting analysis and fixes |
| 9 | AI rewrite selection | Rewrite highlighted text via floating toolbar |
| 10 | Interview prep | Generate interview questions from resume |
| 11 | Follow-up email | Draft a post-interview follow-up email |
| 12 | LinkedIn importer | Parse LinkedIn profile data into a resume |
| 13 | Bulk bullet enhancer | Improve all bullets in a section at once |
| 14 | AI resume from JD | Generate a tailored resume from a job description |
| 15 | JD matcher AI enhancement | AI-powered job description matching improvements |
| 16 | AI content condenser | Shorten content while preserving key information |
| 17 | AI resume translator | Translate resume content to other languages |
| 18 | AI smart parser | Parse uploaded files into structured resume data |

### Templates (68 templates across 9 categories)

| Category | Count |
|----------|-------|
| ATS-Optimized | 10 |
| Professional | 10 |
| Academic | 8 |
| Executive | 8 |
| Student | 8 |
| Cover Letter | 8 |
| Reference | 6 |
| Technical | 5 |
| Creative | 5 |

All templates support photo placement, custom color schemes, and font selection.

### Import

- Drag-and-drop multi-file import
- Supported formats: PDF, JSON, DOCX, TXT, HTML
- AI smart parser with confidence indicators
- Duplicate detection and merge import
- Template auto-match and section reorder
- Progress bar for batch imports

### Export

- PDF (via browser print)
- JSON (full document data)
- Markdown
- HTML
- Plain Text

### Tools & Studios

| Tool | Description |
|------|-------------|
| Design Studio | Colors, fonts, spacing, layout customization |
| Template Gallery | Browse and preview all 68 templates |
| ATS Checker | Score resume against ATS requirements |
| Job Description Matcher | Compare resume against a job posting |
| Skills Matrix | Visualize and analyze skill coverage |
| Experience Calculator | Calculate total years of experience |
| Theme Studio | Create and manage custom color themes |
| Space Optimizer | Fit content to target page count |
| Section Studio | Custom section types and ordering |
| PDF Studio | PDF-specific layout controls |
| Timeline Studio | Visual career timeline |
| Portfolio Studio | Attach work samples and links |
| Link & QR Studio | Add QR codes and smart links |
| Version Studio | Track document versions |
| Data Studio | Analytics on resume content |
| Consistency Studio | Check formatting consistency |
| Privacy Studio | Redact sensitive information |
| Localization Studio | Region-specific formatting |
| Package Studio | Bundle documents for applications |
| A11y Inspector | Accessibility audit |
| Stress Lab | Test template rendering edge cases |
| Font Manager | Custom font loading and pairing |

### Privacy

- 100% local storage (IndexedDB) for all core features
- No server uploads unless AI features are used
- AI requests go through a Vercel proxy or direct to Gemini/Gemini
- Optional Supabase auth for cloud sync (not required)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Vanilla JavaScript (ES Modules) |
| Storage | IndexedDB via custom `Database` class |
| Styling | CSS Custom Properties, no preprocessor |
| Routing | Hash-based SPA router |
| State | Custom `StateManager` + `EventBus` |
| AI | Gemini API (Llama 3.3 70B) / Google Gemini |
| Auth | Supabase (optional) |
| Hosting | Vercel (serverless functions for AI proxy) |
| Build | None -- no bundler, no transpiler |

---

## Quick Start

```bash
# Clone the repo
git clone <repo-url> && cd careercanvas

# Start a local server (any static server works)
npx http-server . -p 8080 --cors -c-1

# Or use the npm script
npm start
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## AI Setup

CareerCanvas AI works in two modes:

### Deployed (Vercel)

The `/api/ai-analyze` serverless function proxies requests to Gemini. Users never need an API key.

1. Deploy to Vercel
2. Add `GROQ_API_KEY` in Vercel environment variables
3. AI features work automatically for all users

### Local Development

Without a server proxy, you can use AI features by providing your own key:

- **Gemini**: Get a free key at [console.gemini.com](https://console.gemini.com), paste it in the Smart Format panel
- **Gemini**: Use a Google AI key (prefix `AIza`)
- Keys are stored in `localStorage` and never sent to any server other than the AI provider

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for full deployment instructions covering Vercel, Netlify, GitHub Pages, and static hosting.

---

## Project Structure

```
careercanvas/
  index.html              # SPA entry point
  404.html                # Fallback for SPA routing
  sw.js                   # Service worker (offline support)
  package.json            # Scripts and metadata
  api/
    ai-analyze.js         # Vercel serverless: AI proxy to Gemini
    public-config.js      # Vercel serverless: public config
    delete-account.js     # Vercel serverless: account deletion
  src/
    css/                  # 32 CSS files (no preprocessor)
      variables.css       # Design tokens
      reset.css           # CSS reset
      base.css            # Base styles
      layout.css          # App shell layout
      components.css      # Shared components
      editor.css          # Editor styles
      dashboard.css       # Dashboard styles
      templates.css       # Template rendering
      print.css           # Print/PDF styles
      *.css               # Per-module styles (studios, tools)
    js/
      app.js              # Application entry, bootstrapping
      core/               # 8 core modules
        db.js             # IndexedDB wrapper
        router.js         # Hash-based SPA router
        events.js         # Event bus (pub/sub)
        state.js          # State manager
        schema.js         # Document schema & validation
        template-engine.js# Template registration & rendering
        theme-engine.js   # Theme management
        migration.js      # DB migration logic
      modules/            # 40 feature modules
        editor.js         # Resume editor (WYSIWYG)
        dashboard.js      # Document list & management
        ai-formatter.js   # AI integration (Gemini/Gemini)
        smart-formatter.js# Rule-based formatting (no AI)
        import-manager.js # Multi-format import
        export-manager.js # Multi-format export
        ...               # Studios, tools, UI components
      templates/          # 10 template files, 68 templates
        index.js          # Template registry
        ats-templates.js
        professional-templates.js
        creative-templates.js
        technical-templates.js
        executive-templates.js
        student-templates.js
        academic-templates.js
        cover-letter-templates.js
        reference-templates.js
      auth/               # 4 auth modules (Supabase)
      data/               # 4 data files (samples, tips, presets)
      utils/              # 4 utility modules (sanitize, format, id)
```

---

## Architecture

```
index.html
  --> src/js/app.js (CareerCanvasApp)
        |
        |--> core/db.js         IndexedDB CRUD
        |--> core/router.js     Hash routing (#/dashboard, #/editor/:id, ...)
        |--> core/events.js     Global event bus (singleton)
        |--> core/state.js      In-memory state management
        |--> core/schema.js     Document schema + empty doc factory
        |--> core/template-engine.js   Template registry + rendering
        |--> core/theme-engine.js      CSS custom property themes
        |
        |--> modules/*          Feature modules (lazy-loaded per route)
        |--> templates/*        68 HTML/CSS template definitions
        |--> auth/*             Supabase auth (optional)
```

**Key patterns:**
- Singleton event bus for cross-module communication
- Hash-based routing with lazy module initialization
- Documents stored as structured JSON in IndexedDB (personalInfo, sections, design, settings)
- Templates are pure functions: `(data, options) => HTML string`
- AI formatter auto-detects provider from API key prefix (`gsk_` = Gemini, `AIza` = Gemini)
- Server proxy (`/api/ai-analyze`) keeps API keys off the client in production

---

## License

MIT
