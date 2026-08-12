# Career Tools

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Tool Summary

| Tool | Route | Access | Storage | External Deps | Status |
|------|-------|--------|---------|--------------|--------|
| Job Description Matcher | `/job-matcher` | Lazy route | IDB: matchAnalyses, jobDescriptions | None | Complete |
| Skills Evidence Matrix | `/skills-matrix` | Lazy route | IDB: skillsMatrices | None | Complete |
| ATS Checker | — | Inline in editor | None (stateless) | None | Complete |
| Experience Calculator | — | Modal overlay | None (in-memory) | None | Complete |
| Application Tracker | `/applications` | Eager route | IDB: applications, jobDescriptions | None | Complete |
| Smart Formatter | — | Editor panel | None (stateless) | Groq API (optional) | Complete |

---

## 1. Job Description Matcher

**Route:** `/job-matcher` | **Source:** `src/js/modules/job-matcher.js` (1496 lines)

### Purpose
Compares a resume against a pasted job description using local, deterministic, rule-based keyword extraction. Produces match percentage, category breakdown, and detailed term analysis.

### Workflow
1. Select a saved resume from document list
2. Paste job description (title, company, URL, full text)
3. Click "Analyze" — all processing is local
4. View results: overall match %, category breakdown, matched/missing/resume-only terms

### Analysis Method
- Multi-word phrase dictionary (~70 phrases)
- Abbreviation mapping (~30 mappings: js→javascript, k8s→kubernetes, etc.)
- Related-term clusters (~20 clusters)
- Technical term recognition
- Category weighting: Hard Skills (2.5x), Tools (2.0x), Certifications (2.0x), Education (1.5x), Soft Skills (0.5x)
- Importance classification: Required (3x), Repeated (2x), Preferred (1.5x), Mentioned (1x)

### Outputs
- Match percentage (0-100%)
- Per-category breakdown with progress bars
- Matched terms with evidence locations
- Missing terms with importance badges
- Resume-only terms
- Export as JSON or plain text
- Create "tailored copy" of resume linked to analysis

### Privacy
All analysis runs locally. No data sent to any server.

---

## 2. Skills Evidence Matrix

**Route:** `/skills-matrix` | **Source:** `src/js/modules/skills-matrix.js` + `skills-matrix-analyzer.js` + `skills-matrix-data.js` (2197 lines total)

### Purpose
Analyzes a resume to identify all skills, determine evidence strength, and detect skills mentioned in content but missing from the Skills section.

### Workflow
1. Select a resume from document list
2. Click "Analyze Skills"
3. View matrix with strength indicators and evidence details
4. Export or add discovered skills back to resume

### Analysis Method
- 140+ skill alias dictionary for matching
- Evidence extraction from all section types
- Strength scoring: metrics (+2), results (+2), certification (+2), recency (+1), project (+1)
- Strength levels: Strong (≥6), Moderate (≥3), Limited (<3), Listed Only (no evidence)
- Staleness detection via document fingerprint

### Outputs
- Summary cards (total, strong, moderate, limited, listed-only, missing)
- Sortable/filterable matrix table
- Expandable evidence panels with excerpts and timelines
- Export as CSV, JSON, or text report
- Add discovered skills back to resume

---

## 3. ATS Checker

**Access:** Inline in editor (toolbar button or sidebar toggle) | **Source:** `src/js/modules/ats-checker.js` (881 lines)

### Purpose
Evaluates a document for ATS (Applicant Tracking System) compatibility using 17 rule-based checks.

### 17 Checks

| # | Check | Category |
|---|-------|----------|
| 1 | Full Name Present | Contact |
| 2 | Contact Information | Contact |
| 3 | Professional Summary | Content |
| 4 | Section Headings | Structure |
| 5 | Date Format | Formatting |
| 6 | Content Sections | Content |
| 7 | Images in Content | Layout |
| 8 | Layout Structure | Layout |
| 9 | Font Selection | Formatting |
| 10 | Tables | Layout |
| 11 | Document Length | Content |
| 12 | Measurable Achievements | Content |
| 13 | Action Verbs | Content |
| 14 | Measurable Results | Content |
| 15 | Skills Section | Content |
| 16 | Text Formatting | Formatting |
| 17 | Text vs Images | Layout |
| 18 | Keyword Matching | Keywords (only with JD) |

### ATS Mode Enforcement
When ATS Mode is toggled on, the editor enforces: minimum 10pt font, safe font families, single column, dark text, neutral accent, no photo.

### Score
`Math.round((passedChecks / totalChecks) * 100)` — displayed as percentage with color coding (green ≥80, yellow ≥50, red <50).

---

## 4. Experience Calculator

**Access:** Modal overlay (from Tools menu or floating panel) | **Source:** `src/js/modules/experience-calculator.js` (563 lines)

### Purpose
Calculates total professional experience from manually entered work history, handling overlapping periods.

### Features
- Add/remove work entries (title, dates, "currently working")
- Autocomplete suggestions for job titles and companies
- Overlap detection and merged-range calculation
- Display toggle: years+months or months-only

### Limitations
- In-memory only — data lost when dialog closes
- Does not read from existing resume sections

---

## 5. Application Tracker

**Route:** `/applications` | **Source:** `src/js/modules/application-tracker.js` (472 lines)

### Purpose
CRUD manager for tracking job applications through a status pipeline.

### Status Pipeline
Saved → Applied → Screening → Interview → Offer → Accepted/Rejected/Withdrawn

### Features
- Add applications: position, company, location, salary, status, date, URL, contact, notes, tags
- Save job descriptions separately (title, company, URL, text, requirements)
- Stats bar: total, applied, in-progress, offers, rejected
- Search and status filtering
- Inline status change on cards

---

## 6. Smart Formatter

**Access:** Editor panel overlay | **Source:** `src/js/modules/smart-formatter.js` (362 lines) + AI integration in editor

### Purpose
Rule-based document formatting analyzer with optional AI-powered suggestions.

### Local Analysis (100-point scoring)
- Contact completeness (name, email, phone)
- Section structure (experience, education, skills)
- Summary length (10-80 words optimal)
- First-person pronoun detection
- Weak opening phrase detection (10 phrases)
- Bullet metrics and length analysis
- Document length estimation
- Punctuation consistency

### Auto-Fix
- Remove double spaces
- Trim whitespace
- Remove OCR/import artifacts
- Strip bullet characters from achievements
- Remove empty items
- Fix phone-number formatting

### AI Analysis (Optional — requires Groq API)
- "AI Analyze" — per-item suggestions via Groq
- "AI Summary" — generates 40-60 word professional summary
- Requires server proxy at `/api/ai-analyze` or user's own API key
