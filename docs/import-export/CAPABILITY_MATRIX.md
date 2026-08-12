# Import/Export Capability Matrix — Complete Audit

## Audit Date: 2026-08-11

## IMPORT STATUS

| # | Format | Status | Parser | Detection | Mapping | Finalization |
|---|--------|--------|--------|-----------|---------|-------------|
| 1 | CC JSON single doc | VERIFIED WORKING | importJSON | schema validate | N/A (direct) | new ID + db.put |
| 2 | CC full backup | VERIFIED WORKING | importAllData | version check | N/A | per-doc migrate |
| 3 | DOCX | VERIFIED WORKING | mammoth CDN | parseHTMLContent | showFieldMapping | createDocumentFromParsed |
| 4 | PDF (text) | VERIFIED WORKING | PDF.js CDN | parsePlainText | showFieldMapping | createDocumentFromParsed |
| 5 | PDF (scanned) | NOT PRESENT | — | — | — | — |
| 6 | Plain text file | VERIFIED WORKING | parsePlainText | line-based | showFieldMapping | createDocumentFromParsed |
| 7 | Pasted text | VERIFIED WORKING | parsePlainText | line-based | showFieldMapping | createDocumentFromParsed |
| 8 | Markdown | NOT PRESENT | — | — | — | — |
| 9 | HTML file | NOT PRESENT | — | — | — | — |

## EXPORT STATUS

| # | Format | Status | Method | Output |
|---|--------|--------|--------|--------|
| 1 | JSON | VERIFIED WORKING | exportJSON | Raw document blob |
| 2 | Plain Text | VERIFIED WORKING | exportPlainText | Structured text |
| 3 | Markdown | VERIFIED WORKING | exportMarkdown | MD with headings |
| 4 | HTML | VERIFIED WORKING | exportHTML | Standalone HTML |
| 5 | PDF | WORKING WITH LIMITATIONS | window.print() | Print dialog |
| 6 | DOCX | NOT PRESENT | — | — |
| 7 | Full backup | WORKING WITH LIMITATIONS | exportAllData | Only 3/11 stores |

## KEY GAPS REQUIRING FIX

1. **Export All incomplete** — only exports documents, settings, masterProfile; misses jobDescriptions, applications, contentLibrary, snapshots, images, designPresets, matchAnalyses, skillsMatrices, customSections
2. **No unified finalization** — DOCX/PDF/text each create docs independently
3. **No import read-back verification** — stored doc not compared after put()
4. **JSON export lacks envelope** — no app name, schema version, timestamp wrapper
5. **No export operation ID** — double-click produces duplicate downloads
6. **HTML export title not escaped** — potential XSS if name contains HTML
7. **Markdown export missing** — skills, projects, certifications, custom sections partially handled
8. **Cover letter text export** — convertToPlainText assumes resume-like item structure
