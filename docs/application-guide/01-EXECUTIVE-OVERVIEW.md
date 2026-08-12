# Executive Overview

> CareerCanvas Application Guide | Generated: 2026-08-12 | Version: 1.0

---

## One-Paragraph Summary

CareerCanvas is a free, local-first, browser-based career document toolkit that enables users to create, edit, and export professional resumes, CVs, cover letters, reference sheets, and LinkedIn profile drafts entirely within their browser. All data is stored in IndexedDB and localStorage with zero server-side persistence, zero tracking, and zero registration required. The application provides 68 document templates across 9 categories, 12 application themes, a full-featured rich-text editor with undo/redo and autosave, and a suite of 21 career tools and studios including a Job Description Matcher, Skills Evidence Matrix, ATS Checker, PDF Studio, and more.

---

## Detailed Executive Summary

### What CareerCanvas Is

CareerCanvas is a single-page web application (SPA) built with vanilla JavaScript (no framework) that provides a comprehensive career document authoring toolkit. It runs entirely in the browser with optional server-side features (authentication via Supabase, AI analysis via Groq) available only when deployed to Vercel with environment variables configured.

### Intended Users

- Job seekers creating resumes and cover letters
- Professionals maintaining CVs and career documentation
- Students preparing their first job applications
- Academics building research CVs and teaching portfolios
- Career changers restructuring their experience narrative
- Anyone who values privacy and wants to avoid cloud-based resume services

### Main Value Proposition

- **Completely free**: No paywall, no watermark, no registration required
- **Privacy-first**: All document processing happens locally in the browser
- **No vendor lock-in**: Export to JSON, PDF, Markdown, HTML, or Plain Text
- **Professional quality**: 68 templates designed for specific industries and roles
- **Comprehensive tooling**: Built-in ATS analysis, job matching, skills tracking, and more

### Architecture

| Aspect | Implementation |
|--------|---------------|
| **Framework** | Vanilla JavaScript (ES modules) |
| **Routing** | Hash-based SPA router (`#/path`) |
| **State** | Centralized StateManager with undo/redo |
| **Storage** | IndexedDB (11 object stores) + localStorage (~30 keys) |
| **Templates** | 68 templates rendered via TemplateEngine |
| **Themes** | 12 application UI themes via ThemeEngine |
| **Server** | Static file hosting; 3 optional Vercel API routes |
| **Auth** | Optional Supabase (email/password, magic link, Google OAuth) |
| **AI** | Optional Groq API proxy for resume analysis |

### Supported Document Types

| Type | Default Template | Default Sections |
|------|-----------------|-----------------|
| Resume | ATS Essential | 6 sections (Summary, Experience, Education, Skills, Projects, Certifications) |
| CV | ATS Academic | 10 sections (adds Publications, Awards, Languages, Volunteer, Research) |
| Cover Letter | Standard Cover Letter | Letter body with recipient fields |
| Reference Sheet | Standard References | Professional References list |
| LinkedIn Draft | (uses Resume flow) | Wizard-guided profile content |
| Academic CV | (uses CV flow) | Extended academic sections |

### Main Editors

- **Resume/CV Editor**: 3-panel layout (form, preview, guidance) with section management, entry CRUD, drag-and-drop reorder, popup rich-text editing, floating format toolbar, and design studio drawer
- **Cover Letter Editor**: Dedicated fields for recipient, salutation, body, and closing
- **Reference Sheet Editor**: Contact card layout for professional references

### Career Tools (21 total)

| Category | Tools |
|----------|-------|
| **Analysis** | ATS Checker, Smart Formatter, Consistency Studio, Accessibility Inspector, Space Optimizer |
| **Matching** | Job Description Matcher, Skills Evidence Matrix |
| **Tracking** | Application Tracker, Experience Calculator |
| **Design** | Theme Studio, Section Studio, Design Panel, Font Manager |
| **Data** | Data Studio, Version Studio, Timeline Studio, Privacy Studio |
| **Output** | PDF Studio, Portfolio Studio, Package Studio, Link/QR Studio |
| **Other** | Localization Studio, Stress Lab (developer tool), AI Formatter |

### Import and Export

| Direction | Formats |
|-----------|---------|
| **Import** | JSON, DOCX (via Mammoth.js), PDF (via PDF.js + optional Tesseract OCR), Plain Text, Full Backup |
| **Export** | JSON, Plain Text, Markdown, HTML, PDF (via print dialog), Full Backup, Selective Backup |

Note: DOCX export is not implemented. PDF export uses the browser's print-to-PDF dialog.

### Authentication Model

- **Guest mode** (default): Full functionality with no account required
- **Authenticated mode** (optional): Supabase email/password, magic link, or Google OAuth
- All data remains local regardless of authentication state
- Cloud synchronization is not implemented

### Storage Model

- **IndexedDB** (`careercanvas-db` v4): 11 object stores for documents, profiles, analyses, snapshots, and custom definitions
- **localStorage**: ~30 keys for preferences, theme, draft recovery, and tool configurations
- **No server-side storage**: Authentication is identity-only; no document data is stored remotely

### Privacy Model

- All document processing is local (browser-only)
- No tracking cookies or analytics
- No data sent to external servers except:
  - Optional Supabase authentication (identity only)
  - Optional Groq AI analysis (resume text sent to AI API via server proxy)
  - CDN loads for PDF.js, Mammoth.js, and Tesseract.js during import operations
- Photos stored as data URLs in IndexedDB, never uploaded

### Deployment Model

- **Local development**: `npx http-server . -p 8080 --cors -c-1`
- **Production**: Static hosting on any platform; Vercel recommended for optional API routes
- **Service Worker**: Defined in `sw.js` but effectively disabled by an inline script in `index.html` that unregisters all service workers on load

### Current Maturity

CareerCanvas is a functional application with comprehensive feature coverage. The core document editing, template rendering, import/export, and career tools are fully implemented. Authentication and AI features require external service configuration. Some tools (Link/QR QR-code generation, Localization Studio) have limited implementations. The codebase is 35,000+ lines of JavaScript across 80+ modules with 28 browser-based test files.

### Known Limitations

- No DOCX export
- PDF export uses browser print dialog (no programmatic PDF generation)
- QR code generation produces visual approximations, not scannable codes
- AI features require Vercel deployment with Groq API key
- Authentication requires Vercel deployment with Supabase configuration
- Service Worker is disabled (no offline support currently active)
- No cloud synchronization of documents
- No collaborative editing
- No mobile-native app
