# Known Limitations

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Critical Limitations

| Feature | Severity | Current Behavior | User Impact | Workaround |
|---------|----------|-----------------|-------------|------------|
| **No DOCX export** | High | Only PDF (print), JSON, TXT, MD, HTML export | Cannot share as editable Word file | Export as PDF or HTML |
| **PDF export via print** | Medium | Uses browser print dialog, not programmatic PDF | Quality depends on browser; no batch export | Use Chrome with "Save as PDF" |
| **Service Worker disabled** | Medium | Inline script unregisters all SWs on load | No offline support | Always maintain network connection |
| **No cloud sync** | Medium | Auth is identity-only, no document sync | Cannot access docs on other devices | Export/import backups manually |

## Feature Limitations

| Feature | Severity | Current Behavior | Workaround |
|---------|----------|-----------------|------------|
| **QR codes (Link/QR Studio)** | High | Generates visual approximation, NOT scannable | Use external QR generator |
| **Localization Studio** | Medium | Only 199 lines; minimal UI implementation | Manual date/format adjustments |
| **AI Formatter** | Medium | Requires Groq API key or Vercel deployment | Use local Smart Formatter instead |
| **Duplicate detection** | Low | Infrastructure exists but not wired into DOCX/PDF import paths | Check manually for duplicates |
| **Experience Calculator** | Low | Data lost when modal closes; doesn't read from resume | Re-enter data each time |
| **PDF Studio** | Low | Viewing only; no editing, merging, or annotation | Use external PDF editor |

## Import Limitations

| Format | Limitation |
|--------|-----------|
| **DOCX** | Complex layouts, tables, and advanced formatting may not be preserved |
| **PDF** | Two-column detection is heuristic-based; may misidentify layouts |
| **PDF (scanned)** | OCR accuracy depends on scan quality; requires CDN access for Tesseract.js |
| **Plain Text** | Section detection relies on common header patterns; unusual formats may not parse correctly |
| **All formats** | Maximum 50MB file size |

## Export Limitations

| Format | Limitation |
|--------|-----------|
| **PDF** | No programmatic generation; relies on browser print-to-PDF |
| **HTML** | Inline styles only; no external CSS; may not match preview exactly |
| **Markdown** | Loses all visual formatting and design settings |
| **Plain Text** | Loses all structure beyond section headings |
| **DOCX** | Not available |

## Browser Limitations

| Limitation | Impact |
|-----------|--------|
| IndexedDB storage limits vary by browser | Large photo collections may hit limits |
| Private/incognito mode may clear storage | Data lost on window close |
| `document.execCommand()` is deprecated | Rich-text editing may have issues in future browsers |
| Print-to-PDF varies by browser | Layout differences between Chrome, Firefox, Safari |
| CDN dependencies require internet | DOCX, PDF import and OCR need network for first load |

## Mobile Limitations

| Limitation | Impact |
|-----------|--------|
| Drag-and-drop requires mouse | Keyboard reorder available as alternative |
| Rich-text popup editor is basic on mobile | Formatting toolbar may be cramped |
| Photo upload depends on device camera/gallery | File picker behavior varies |
| Preview zoom calculations may vary | Some templates may not scale perfectly |

## Performance Risks

| Risk | Scenario | Mitigation |
|------|----------|------------|
| Large documents with many sections | Preview rendering may be slow | Debounced at 300ms |
| Many large photos (data URLs) | IndexedDB storage consumption | 2MB per-photo limit |
| Many saved documents | Dashboard loading time | Lazy rendering, pagination not implemented |
| Complex template rendering | CPU-intensive on mobile | Simplified templates for mobile not available |

## Authentication Limitations

| Limitation | Impact |
|-----------|--------|
| Requires Vercel deployment for API routes | Auth does not work with plain static hosting |
| No local auth fallback | Cannot authenticate without Supabase |
| Session expiry handling | User may need to re-authenticate |
| No multi-device sync | Auth provides identity only |
| Account deletion requires service role key | Admin must configure `SUPABASE_SERVICE_ROLE_KEY` |

## Testing Gaps

| Area | Gap |
|------|-----|
| Import flows | No automated tests |
| Export flows | No automated tests |
| Authentication | No automated tests |
| Dashboard operations | No automated tests |
| Mobile responsiveness | No automated tests |
| Accessibility | No automated WCAG testing |
| Cross-browser | No automated cross-browser testing |
