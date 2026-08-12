# User Journeys

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## 1. First-Time Visitor

**Starting point:** Direct URL or search engine result
**Preconditions:** No localStorage data, no IndexedDB data

### Steps
1. Browser loads `index.html`, app initializes
2. Auth system checks for configuration — if no Supabase config, proceeds silently
3. No `cc_auth_guest` or `onboardingComplete` found in localStorage
4. App auto-sets guest mode (`cc_auth_guest = 'true'`)
5. Router navigates to `/dashboard`
6. Dashboard renders with empty state ("No documents yet")
7. Quick action buttons displayed: New Resume, New CV, New Cover Letter, Import, Export All

**Storage changes:** `cc_auth_guest` set in localStorage
**Success result:** User sees empty dashboard with creation options

---

## 2. Continue as Guest

**Starting point:** `/welcome` landing page (if auth is configured)
**Preconditions:** Auth system is configured but user has no account

### Steps
1. User views welcome page with feature showcase
2. Clicks "Continue as Guest" button
3. `continueAsGuest()` in auth-service sets `cc_auth_guest = 'true'` in localStorage
4. Auth state updated to `GUEST`
5. Router navigates to `/dashboard`

**Storage changes:** `cc_auth_guest` in localStorage
**Success result:** Full app access without registration

---

## 3. Create a Resume

**Starting point:** Dashboard
**Preconditions:** Guest or authenticated

### Steps
1. Click "New Resume" quick action button
2. Onboarding wizard opens as full-screen overlay with starfield animation
3. Step 1: Document Type — "Resume" pre-selected
4. Step 2: Career Level — choose from Entry/Mid/Senior/Executive/Career Change
5. Step 3: Resume Goal — choose from General/Tailor to Job/ATS-Friendly/Visual/Portfolio
6. Step 4: Page Format — choose A4 or US Letter
7. Click "Get Started"
8. `createEmptyDocument('resume')` creates document with 6 default sections
9. Document saved to IndexedDB `documents` store
10. `onboardingComplete` set in localStorage
11. Router navigates to `/editor/:id`

**Routes:** `/dashboard` → `/editor/:id`
**Storage changes:** New document in IndexedDB, `onboardingComplete` in localStorage
**Success result:** Editor opens with empty resume ready for editing

---

## 4. Create a CV

**Starting point:** Dashboard
**Steps:** Same as Resume but with CV-specific wizard steps (Career Level: Graduate/Experienced/Senior/Executive; CV Purpose: General/Targeted/International/Technical) and 10 default sections

---

## 5. Create an Academic CV

**Starting point:** Dashboard
**Steps:** Same flow with Academic Stage options (Grad Student through Full Professor) and academic-specific CV purpose options. Uses `cv` document type internally.

---

## 6. Create a Cover Letter

**Starting point:** Dashboard
**Steps:** Wizard with Letter Type (Application/Interest/Referral/Networking), Tone (Formal/Professional/Conversational/Creative), and Page Format. Creates `coverLetter` document type with dedicated letter fields (recipient, salutation, body, closing).

---

## 7. Create a Reference Sheet

**Starting point:** Dashboard
**Steps:** Wizard with Reference Count (3/4/5+) and Page Format. Creates `referenceSheet` document type with single References section.

---

## 8. Create a LinkedIn Draft

**Starting point:** Dashboard
**Steps:** Wizard with Profile Goal (Job Search/Networking/Thought Leadership/Business Dev) and Profile Tone. Uses `resume` document type internally.

---

## 9. Import a DOCX Resume

**Starting point:** Dashboard or `/import` page

### Steps
1. Click "Import" or navigate to `/import`
2. Select "Word Document (.docx)" format card or drag-and-drop file
3. File validated (size ≤ 50MB, .docx extension, not .doc or .docm)
4. Mammoth.js loaded from CDN, converts DOCX to HTML
5. Embedded images extracted and classified
6. `parseHTMLContent()` walks DOM, identifies sections via heading patterns
7. `detectDocumentType()` classifies as resume, CV, or academic CV
8. Field mapping UI opens with 5 tabs: Contact Info, Sections, Images, Options, Preview
9. User reviews/edits mapped fields, includes/excludes sections and images
10. Duplicate detection runs (fingerprint + name matching)
11. If duplicate found: dialog offers Open Existing, Import as New, or Replace
12. Click "Confirm Import"
13. `createDocumentFromParsed()` builds full document with structured items
14. Document saved to IndexedDB
15. Router navigates to `/editor/:id`

**External dependencies:** Mammoth.js v1.8.0 (CDN)
**Limitations:** Layout may differ from original; complex formatting may not be preserved

---

## 10. Import a PDF Resume

**Starting point:** Dashboard or `/import` page

### Steps
1. Select PDF file or drag-and-drop
2. PDF.js loaded from CDN, document opened
3. Text extracted page by page with two-column layout detection
4. If extracted text < 50 characters: OCR dialog shown
   - User selects language from 16 options (default: English)
   - Tesseract.js loaded from CDN
   - Each page rendered to canvas at 300 DPI
   - OCR runs with progress bar and cancel button
5. If text extraction successful: `parsePlainText()` identifies sections
6. Same field mapping flow as DOCX import
7. Document created and saved

**External dependencies:** PDF.js v4.4.168 (CDN), optionally Tesseract.js v5 (CDN)

---

## 11. Select a Template

**Starting point:** `/templates` route

### Steps
1. Browse 68 templates across 9 categories
2. Filter by document type tab (Resumes, Cover Letters, References, All)
3. Use search or sidebar filters (Style, Level, Layout, Photo, Typography)
4. Click template card to open preview modal
5. Modal shows full-size preview, metadata, color/font presets
6. Optionally compare 2 templates side-by-side
7. Click "Use This Template"
8. New document created with template applied
9. Router navigates to `/editor/:id`

**Storage changes:** New document in IndexedDB, template favorites in localStorage
**Limitations:** Template comparison limited to 2 templates

---

## 12. Customize Document Design

**Starting point:** Editor (`/editor/:id`)

### Steps
1. Click "Design" button in preview controls or mobile Design tab
2. Design Studio drawer slides open from right
3. Quick Styles section shows 7 typography presets
4. Font Manager provides font family, size, and line height controls
5. Full Design Panel offers 8 groups of controls
6. Changes reflected immediately in preview (300ms debounce)
7. Autosave triggers after 1 second of inactivity
8. Close drawer via Escape, backdrop click, or close button

---

## 13. Run Job Description Matcher

**Starting point:** `/job-matcher` route

### Steps
1. Click "New Analysis" to start
2. Select a saved resume from document list
3. Paste or enter job description (title, company, URL, full text)
4. Click "Analyze"
5. Local keyword extraction runs (no external API)
6. Results show: match percentage, category breakdown (Hard Skills, Tools, Certs, etc.)
7. View matched terms, missing terms, resume-only terms with evidence
8. Export analysis as JSON or plain text
9. Optionally create a "tailored copy" of the resume

**Storage changes:** Analysis saved to IndexedDB `matchAnalyses`, JD saved to `jobDescriptions`
**Limitations:** Matching is keyword-based, not semantic

---

## 14. Run Skills Evidence Matrix

**Starting point:** `/skills-matrix` route

### Steps
1. Select a resume from document list
2. Click "Analyze Skills"
3. Analyzer extracts all skills from content using 140+ alias dictionary
4. Each skill gets evidence strength: Strong/Moderate/Limited/Listed Only
5. Results show: summary cards, sortable matrix table, expandable evidence panels
6. Export as CSV, JSON, or text report
7. Add discovered skills back to resume's Skills section

**Storage changes:** Analysis saved to IndexedDB `skillsMatrices`

---

## 15. Export a Document

**Starting point:** Editor toolbar or mobile Export tab

### Steps
1. Open Export dropdown menu
2. Select format: PDF, Plain Text, JSON, Markdown, HTML
3. **PDF:** Browser print dialog opens; use "Save as PDF" option
4. **Other formats:** File downloaded immediately
5. Filename generated from: person name + target role + document type + extension

**Limitations:** PDF export quality depends on browser's print-to-PDF implementation

---

## 16. Backup and Restore

### Export Full Backup
1. Settings page or Data Studio → "Export Backup"
2. All 11 IndexedDB stores exported to single JSON file
3. File named `CareerCanvas_Backup_<date>.json`

### Restore from Backup
1. Settings page → "Import Backup" or Data Studio import
2. Select backup JSON file
3. Validation and preview of contents
4. Import with merge (existing documents not overwritten)

---

## 17. Archive and Restore

### Archive
1. Dashboard → document card → More actions → "Archive"
2. Document's `archived` flag set to `true` in IndexedDB
3. Document hidden from default view

### Restore
1. Dashboard → switch to "Archived" filter
2. Find archived document → "Unarchive"
3. Document's `archived` flag set to `false`

---

## 18. Delete a Document

**Starting point:** Dashboard

### Steps
1. Document card → More actions → "Delete"
2. Confirmation dialog shows document name
3. Click "Delete" to confirm
4. `db.delete('documents', id)` removes from IndexedDB
5. Dashboard refreshes

**Warning:** Deletion is permanent. No trash/recycle bin.

---

## 19. Sign Out While Preserving Local Data

**Starting point:** Authenticated state

### Steps
1. Click account button → "Sign Out"
2. `signOut()` clears Supabase session
3. Auth state changes to `GUEST`
4. All IndexedDB documents remain intact
5. All localStorage preferences remain
6. User can continue working as guest

**Important:** Local documents are never deleted by sign-out
