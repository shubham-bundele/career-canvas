# CareerCanvas — Complete Application Guide

> **Version:** 1.0 | **Generated:** 2026-08-12 | **Verification scope:** Full source code audit + asset verification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture](#2-architecture)
3. [Routes](#3-routes)
4. [Feature Catalog](#4-feature-catalog)
5. [Document Types](#5-document-types)
6. [Editor](#6-editor)
7. [Templates and Themes](#7-templates-and-themes)
8. [Career Tools](#8-career-tools)
9. [Import and Export](#9-import-and-export)
10. [Authentication](#10-authentication)
11. [Storage](#11-storage)
12. [Security and Privacy](#12-security-and-privacy)
13. [Accessibility](#13-accessibility)
14. [Testing](#14-testing)
15. [Known Limitations](#15-known-limitations)
16. [Implementation Status](#16-implementation-status)
17. [Maintainer Notes](#17-maintainer-notes)
18. [Glossary](#18-glossary)
19. [Detailed Documents](#19-detailed-documents)

---

## 1. Executive Summary

CareerCanvas is a free, local-first, browser-based career document toolkit built with vanilla JavaScript. It enables users to create, edit, and export professional resumes, CVs, cover letters, reference sheets, and LinkedIn profile drafts entirely within their browser — with zero server-side persistence, zero tracking, and zero registration required.

**Key numbers:** 68 templates, 12 app themes, 34 routes, 11 IndexedDB stores, 21 career tools and studios, 6 document types, 28 test files, 80+ JavaScript modules.

All document processing happens locally. Optional server-side features (Supabase authentication, Groq AI analysis) require Vercel deployment with environment variables configured.

---

## 2. Architecture

| Component | Technology |
|-----------|-----------|
| Framework | Vanilla JavaScript (ES modules, no framework) |
| Routing | Hash-based SPA router (`#/path`) |
| State | Centralized StateManager with undo/redo (100 max history) |
| Storage | IndexedDB (11 stores) + localStorage (~30 keys) |
| Templates | 68 templates via TemplateEngine registry |
| Themes | 12 application themes via ThemeEngine |
| Server | Static files + 3 optional Vercel API routes |
| Auth | Optional Supabase (email, magic link, Google OAuth) |
| AI | Optional Groq API proxy for resume analysis |

**Entry point:** `index.html` loads `src/js/app.js` as ES module. The `CareerCanvasApp` class orchestrates all systems.

**Service Worker:** Defined in `sw.js` but disabled by an inline script in `index.html`.

---

## 3. Routes

**34 routes total:** 6 core, 1 import, 3 career tools, 14 studios, 9 authentication, 1 hidden (stress-lab)

| Category | Routes |
|----------|--------|
| Core | `/dashboard`, `/editor/:id`, `/templates`, `/master-profile`, `/applications`, `/settings` |
| Import | `/import` |
| Career Tools | `/job-matcher`, `/skills-matrix`, `/pdf-studio` |
| Studios | `/theme-studio`, `/section-studio`, `/packages`, `/timeline`, `/consistency`, `/privacy-check`, `/localization`, `/portfolio`, `/links-qr`, `/optimizer`, `/a11y-inspector`, `/versions`, `/data-backup`, `/stress-lab` |
| Auth | `/welcome`, `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/account/profile`, `/account/security` |

Default route: `/dashboard`. Public routes bypass auth gate. `/editor/:id` auto-grants guest access.

See [03-APPLICATION-ROUTES.md](application-guide/03-APPLICATION-ROUTES.md) for complete details.

---

## 4. Feature Catalog

### Core Platform (6)
Dashboard, Resume/CV Editor, Template Gallery, Master Profile, Application Tracker, Settings

### Career Tools (6)
Job Description Matcher, Skills Evidence Matrix, ATS Checker, Experience Calculator, Application Tracker, Smart Formatter

### Studios (16)
PDF Studio, Section Studio, Theme Studio, Data Studio, Consistency Studio, Timeline Studio, Privacy Studio, Version Studio, Package Studio, Portfolio Studio, Link/QR Studio, Localization Studio, Space Optimizer, Stress Lab, A11y Inspector, AI Formatter

See [02-FEATURE-INVENTORY.md](application-guide/02-FEATURE-INVENTORY.md) for complete status.

---

## 5. Document Types

| Type | Default Template | Default Sections | Schema Constant |
|------|-----------------|-----------------|-----------------|
| Resume | ATS Essential | 6 (Summary, Experience, Education, Skills, Projects, Certifications) | `resume` |
| CV | ATS Academic | 10 (adds Publications, Awards, Languages, Volunteer, Research) | `cv` |
| Academic CV | ATS Academic | Same as CV (uses `cv` type internally) | `cv` |
| Cover Letter | Standard Cover Letter | Letter body with recipient fields | `coverLetter` |
| Reference Sheet | Standard References | Professional References list | `referenceSheet` |
| LinkedIn Draft | ATS Essential | Uses Resume flow internally | `resume` |

33 section types defined in schema; 11 rendered in editor with specific entry fields.

---

## 6. Editor

The editor (`src/js/modules/editor.js`, 4813 lines) provides a 3-panel layout:
- **Left:** Form fields, section navigator with search/filter
- **Center:** Live preview with zoom controls (25-200%, fit-to-width)
- **Right:** Writing tips, ATS analysis, guidance

**Key parameters:**
- Autosave: 1000ms delay, 3 retries with exponential backoff
- Undo/redo: 50 max history, 500ms push debounce
- Preview update: 300ms debounce
- Photo: JPEG/PNG/WebP, max 2MB
- Keyboard: Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+P (print), Ctrl+Shift+A (ATS)

**Design Studio:** Slide-in drawer with 7 typography presets, 37 fonts, 8 design control groups, and own undo/redo (20 max).

**ATS Mode:** Enforces safe fonts, single column, no photo, dark text, neutral accent.

See [07-EDITOR-FLOW.md](application-guide/07-EDITOR-FLOW.md) for complete details.

---

## 7. Templates and Themes

Three separate design systems:

| System | Scope | Count | Persistence |
|--------|-------|-------|-------------|
| App Themes | UI chrome | 12 (11 built-in + 1 system) | localStorage |
| Doc Templates | Resume layout/rendering | 68 across 9 categories | Per-document in IndexedDB |
| Doc Design | Typography, colors, spacing | Per-document | Per-document in IndexedDB |

**Template categories:** ATS (10), Professional (10), Technical (5), Creative (5), Executive (8), Academic (8), Student (8), Cover Letter (8), References (6)

See [12-TEMPLATE-AND-THEME-SYSTEM.md](application-guide/12-TEMPLATE-AND-THEME-SYSTEM.md) for complete details.

---

## 8. Career Tools

| Tool | Purpose | Route | Processing |
|------|---------|-------|-----------|
| **Job Matcher** | Resume vs. JD keyword comparison | `/job-matcher` | 100% local, weighted scoring |
| **Skills Matrix** | Skill evidence strength analysis | `/skills-matrix` | 100% local, 140+ alias dictionary |
| **ATS Checker** | 17-point ATS compatibility analysis | Inline in editor | 100% local, percentage score |
| **Experience Calculator** | Total experience with overlap merging | Modal overlay | In-memory only |
| **Smart Formatter** | 100-point formatting analysis + auto-fix | Editor panel | Local + optional AI (Groq) |

See [13-CAREER-TOOLS.md](application-guide/13-CAREER-TOOLS.md) for complete details.

---

## 9. Import and Export

### Import (5 formats)
JSON, DOCX (Mammoth.js CDN), PDF (PDF.js CDN), Scanned PDF (Tesseract.js OCR), Plain Text, Full Backup

### Export (7 formats)
JSON, Plain Text, Markdown, HTML, PDF (via print dialog), Full Backup, Selective Backup

**Not supported:** DOCX export

See [08-IMPORT-EXPORT-FLOW.md](application-guide/08-IMPORT-EXPORT-FLOW.md) for complete details.

---

## 10. Authentication

**Provider:** Supabase (optional — requires configuration)

**States:** Initializing → Guest / Unauthenticated / Authenticated / Expired / ConfigError / ProviderError / Offline

**Guest mode** is the default. All features work without an account. Auth provides identity only — no cloud sync.

See [09-AUTHENTICATION-FLOW.md](application-guide/09-AUTHENTICATION-FLOW.md) for complete details.

---

## 11. Storage

**IndexedDB:** `careercanvas-db` v4 with 11 object stores (documents, masterProfile, jobDescriptions, applications, contentLibrary, snapshots, images, designPresets, matchAnalyses, skillsMatrices, customSections)

**localStorage:** ~30 keys for preferences, auth state, tool configurations

All data is local. No server-side storage of documents.

See [11-STORAGE-ARCHITECTURE.md](application-guide/11-STORAGE-ARCHITECTURE.md) for complete details.

---

## 12. Security and Privacy

- All document processing is local (browser-only)
- No tracking cookies or analytics
- Import sanitization strips dangerous HTML elements and event handlers
- URL validation rejects `javascript:` protocols
- Theme import sanitizes CSS values against injection
- External network calls only for: optional Supabase auth, optional Groq AI, CDN library loading

See [16-SECURITY-AND-PRIVACY.md](application-guide/16-SECURITY-AND-PRIVACY.md) for complete details.

---

## 13. Accessibility

Implemented features: semantic HTML, ARIA labels/roles, keyboard navigation, focus management, reduced motion support, high contrast themes, adjustable font size, and an Accessibility Inspector tool.

No formal WCAG conformance audit has been performed.

See [15-ACCESSIBILITY-AND-RESPONSIVENESS.md](application-guide/15-ACCESSIBILITY-AND-RESPONSIVENESS.md) for complete details.

---

## 14. Testing

28 browser-based test files using a custom minimal framework. Coverage focuses on editor features (23 files), career tools (5 files), and studios (2 files).

**Major gaps:** No tests for dashboard, import/export, authentication, routing, IndexedDB, or mobile responsiveness.

See [17-TEST-COVERAGE.md](application-guide/17-TEST-COVERAGE.md) for complete details.

---

## 15. Known Limitations

**Critical:** No DOCX export, PDF export via print dialog only, service worker disabled, no cloud sync, QR codes are visual placeholders (not scannable), Localization Studio minimal implementation.

**Configuration-dependent:** AI analysis requires Groq API key, authentication requires Supabase setup, both require Vercel deployment.

See [18-KNOWN-LIMITATIONS.md](application-guide/18-KNOWN-LIMITATIONS.md) for complete details.

---

## 16. Implementation Status

| Status | Count |
|--------|-------|
| Complete (source verified) | 19 features |
| Working with limitations | 6 features |
| Partially implemented | 2 features |
| Requires external configuration | 2 features |
| Disabled | 1 feature (Service Worker) |

See [19-IMPLEMENTATION-STATUS.md](application-guide/19-IMPLEMENTATION-STATUS.md) for the full matrix.

---

## 17. Maintainer Notes

**Start:** `npx http-server . -p 8080 --cors -c-1`
**Test:** Open `http://localhost:8080/tests/<filename>` in browser
**No build step required** — pure ES modules

See [20-MAINTAINER-GUIDE.md](application-guide/20-MAINTAINER-GUIDE.md) for adding features, templates, themes, stores, and routes.

---

## 18. Glossary

See [22-GLOSSARY.md](application-guide/22-GLOSSARY.md) for terminology definitions.

---

## 19. Detailed Documents

| Document | Path |
|----------|------|
| Executive Overview | [docs/application-guide/01-EXECUTIVE-OVERVIEW.md](application-guide/01-EXECUTIVE-OVERVIEW.md) |
| Feature Inventory | [docs/application-guide/02-FEATURE-INVENTORY.md](application-guide/02-FEATURE-INVENTORY.md) |
| Application Routes | [docs/application-guide/03-APPLICATION-ROUTES.md](application-guide/03-APPLICATION-ROUTES.md) |
| User Journeys | [docs/application-guide/04-USER-JOURNEYS.md](application-guide/04-USER-JOURNEYS.md) |
| Application Flow | [docs/application-guide/05-APPLICATION-FLOW.md](application-guide/05-APPLICATION-FLOW.md) |
| New Document Flow | [docs/application-guide/06-NEW-DOCUMENT-FLOW.md](application-guide/06-NEW-DOCUMENT-FLOW.md) |
| Editor Flow | [docs/application-guide/07-EDITOR-FLOW.md](application-guide/07-EDITOR-FLOW.md) |
| Import & Export Flow | [docs/application-guide/08-IMPORT-EXPORT-FLOW.md](application-guide/08-IMPORT-EXPORT-FLOW.md) |
| Authentication Flow | [docs/application-guide/09-AUTHENTICATION-FLOW.md](application-guide/09-AUTHENTICATION-FLOW.md) |
| Data Flow | [docs/application-guide/10-DATA-FLOW.md](application-guide/10-DATA-FLOW.md) |
| Storage Architecture | [docs/application-guide/11-STORAGE-ARCHITECTURE.md](application-guide/11-STORAGE-ARCHITECTURE.md) |
| Template & Theme System | [docs/application-guide/12-TEMPLATE-AND-THEME-SYSTEM.md](application-guide/12-TEMPLATE-AND-THEME-SYSTEM.md) |
| Career Tools | [docs/application-guide/13-CAREER-TOOLS.md](application-guide/13-CAREER-TOOLS.md) |
| PDF Studio | [docs/application-guide/14-PDF-STUDIO.md](application-guide/14-PDF-STUDIO.md) |
| Accessibility | [docs/application-guide/15-ACCESSIBILITY-AND-RESPONSIVENESS.md](application-guide/15-ACCESSIBILITY-AND-RESPONSIVENESS.md) |
| Security & Privacy | [docs/application-guide/16-SECURITY-AND-PRIVACY.md](application-guide/16-SECURITY-AND-PRIVACY.md) |
| Test Coverage | [docs/application-guide/17-TEST-COVERAGE.md](application-guide/17-TEST-COVERAGE.md) |
| Known Limitations | [docs/application-guide/18-KNOWN-LIMITATIONS.md](application-guide/18-KNOWN-LIMITATIONS.md) |
| Implementation Status | [docs/application-guide/19-IMPLEMENTATION-STATUS.md](application-guide/19-IMPLEMENTATION-STATUS.md) |
| Maintainer Guide | [docs/application-guide/20-MAINTAINER-GUIDE.md](application-guide/20-MAINTAINER-GUIDE.md) |
| Diagram Index | [docs/application-guide/21-DIAGRAM-INDEX.md](application-guide/21-DIAGRAM-INDEX.md) |
| Glossary | [docs/application-guide/22-GLOSSARY.md](application-guide/22-GLOSSARY.md) |
| Verification Evidence | [docs/application-guide/VERIFICATION-EVIDENCE.md](application-guide/VERIFICATION-EVIDENCE.md) |
