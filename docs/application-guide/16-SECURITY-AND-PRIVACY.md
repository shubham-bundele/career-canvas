# Security and Privacy

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Local-First Architecture

All document processing occurs in the browser. Resume content, personal information, and career data never leave the user's device unless the user explicitly:
1. Uses AI analysis (sends resume text to Groq API via server proxy)
2. Signs in with Supabase (sends identity data only, not documents)
3. Exports and shares files manually

---

## Data Classification

| Category | Data | Storage | Network |
|----------|------|---------|---------|
| **Local Private** | Documents, personal info, sections, photos | IndexedDB | Never transmitted |
| **Local Preferences** | Theme, zoom, autosave settings | localStorage | Never transmitted |
| **Tool State** | Timeline events, packages, links, templates | localStorage | Never transmitted |
| **Analysis Results** | Match analyses, skills matrices | IndexedDB | Never transmitted |
| **Transient** | Undo history, preview HTML, edit state | Memory | Never transmitted |
| **Account Identity** | Email, display name (if signed in) | Supabase | Supabase servers |
| **AI Analysis** | Resume text (if AI feature used) | Not persisted | Groq API via Vercel proxy |
| **Secrets** | API keys | localStorage or server env | Groq API |

---

## Import Sanitization

### DOCX Import
- Strips `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<button>` elements
- Removes all `on*` event handler attributes
- Uses Mammoth.js HTML conversion (no raw ZIP extraction)

### Rich-Text Sanitization
- `src/js/utils/rich-text-sanitizer.js` sanitizes contenteditable output
- Blocks script injection via event handlers
- Strips unsafe HTML elements

### URL Validation
- Floating toolbar link insertion rejects `javascript:` URLs
- Theme import sanitizes token values against `url()`, `expression()`, `javascript:`

---

## File Size Limits

| Operation | Limit |
|-----------|-------|
| File import (all formats) | 50 MB |
| PDF Studio file open | 100 MB |
| PDF Studio page count | 500 pages |
| Photo upload | 2 MB |
| AI resume text | 15,000 characters |
| Theme import | 100 KB |

---

## Authentication Security

- Supabase PKCE flow for enhanced security
- Service role key never exposed to browser
- Account deletion via server-side API with token verification
- No session data stored in cookies
- Auth tokens managed by Supabase client library

---

## External Services

| Service | Purpose | Data Sent | User Consent |
|---------|---------|-----------|--------------|
| **Supabase** | Authentication (optional) | Email, password, display name | Explicit sign-up |
| **Groq API** | AI resume analysis (optional) | Resume text (max 15K chars) | Explicit button click |
| **CDN Libraries** | Import parsing | None (library download only) | Implicit on import |

### CDN Dependencies
- Mammoth.js v1.8.0 (jsdelivr CDN) — DOCX parsing
- PDF.js v4.4.168 (cdnjs CDN) — PDF parsing and viewing
- Tesseract.js v5 (jsdelivr CDN) — OCR
- Supabase JS v2 (jsdelivr CDN) — Authentication

---

## Service Worker

The service worker (`sw.js`) defines a stale-while-revalidate caching strategy. However, it is **effectively disabled** by an inline script in `index.html` that unregisters all service workers and deletes all caches on every page load. This means:
- No offline support is currently active
- No cached responses are served
- All requests go to the network

---

## Backup Safety

- Full backup exports all 11 IndexedDB stores as a single JSON file
- Backup files are plain text (not encrypted)
- Users should store backups securely as they may contain personal information
- Import backup performs merge (upsert) — does not overwrite existing documents

---

## Privacy Controls

### Settings Page
- Declares: "All your data stays on this device"
- Declares: "No tracking cookies or analytics"
- Declares: "No data shared with third parties"
- Declares: "Photos stored locally as data URLs"

### Privacy Studio (`/privacy-check`)
- Scans documents for sensitive information
- Detects: phone numbers, emails, addresses, government IDs, private URLs
- Offers redaction with configurable placeholders

### Data Deletion
- "Clear All Data" in Settings: permanently deletes all IndexedDB data
- Account deletion: removes Supabase account via admin API
- No remote backups to delete (data is local-only)

---

## Limitations

- Photos stored as base64 data URLs can be large (up to 2MB)
- API keys stored in localStorage are visible to browser extensions
- Backup files are not encrypted
- No rate limiting on client-side operations
- Service Worker disabled — no offline protection
- CDN library loads reveal that the user is using CareerCanvas to CDN providers
