# PDF Studio

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Overview

**Route:** `/pdf-studio`
**Source:** `src/js/modules/pdf-studio.js` (477 lines)
**Status:** COMPLETE (Stage 1 — Viewing)

PDF Studio is a local-only PDF viewer and inspector. It does **not** edit PDFs or generate PDFs from resume documents. It is a standalone tool for viewing, navigating, and searching existing PDF files.

---

## Capabilities (Stage 1 — Implemented)

| Feature | Status | Description |
|---------|--------|-------------|
| **Open PDF** | Working | File picker or drag-and-drop |
| **Page rendering** | Working | PDF.js renders pages to HTML canvas |
| **Page thumbnails** | Working | First 50 pages shown as thumbnail strip |
| **Navigation** | Working | Previous/Next buttons, page number input |
| **Zoom** | Working | In/Out buttons, Fit to Width |
| **Text search** | Working | Search across all pages with highlighting |
| **File metadata** | Working | Modal showing title, author, producer, dates, page count, file size |
| **Keyboard shortcuts** | Working | Arrow keys for navigation |

---

## File Limits

| Limit | Value |
|-------|-------|
| Max file size | 100 MB |
| Max pages | 500 |
| Accepted type | `.pdf` only |

---

## External Dependency

PDF.js v4.4.168 loaded from CDN:
- Main: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs`
- Worker: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

---

## Not Implemented (Future Stages)

The landing page within PDF Studio notes these as planned future features:

| Stage | Features | Status |
|-------|----------|--------|
| Stage 2 | Page reorder, split, merge, delete, rotate | Not implemented |
| Stage 3 | Text overlays, cover-and-replace, form fill | Not implemented |
| Stage 4 | Annotations, highlights, stamps, signatures | Not implemented |
| Stage 5 | Headers/footers, page numbers, watermarks | Not implemented |
| Stage 6 | Redaction, OCR integration | Not implemented |

---

## Important Distinctions

| Capability | PDF Studio | Resume Export |
|-----------|------------|--------------|
| View existing PDFs | Yes | No |
| Generate PDFs from resumes | No | Yes (via print dialog) |
| Edit PDF text directly | No | N/A |
| Merge multiple PDFs | No | N/A |
| Add annotations | No | N/A |

PDF Studio is a **viewer**, not a PDF editor. Resume PDF export is handled separately via the Export Manager's print-to-PDF flow.

---

## Storage

PDF Studio does not persist any data. Files are loaded into memory and released when the user navigates away. No PDF content is stored in IndexedDB or localStorage.

---

## Privacy

PDF files are processed entirely in the browser using PDF.js. No file content is uploaded to any server. The PDF.js library itself is loaded from a public CDN (cdnjs.cloudflare.com).
