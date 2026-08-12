# Integration Points for Job Description Matcher

## 1. Dashboard Entry
- Add Matcher to dashboard quick actions or career tools section
- Follow existing pattern: icon + label + click handler
- Emit event or use router.navigate() to open matcher

## 2. Navigation
- Add route `#/job-matcher` in app.js setupRoutes()
- Add nav link in app-nav or as career tool entry
- Follow existing view lifecycle: constructor -> render() -> destroy()

## 3. Database
- `jobDescriptions` store ALREADY EXISTS with indexes for company, role, lastModified, tags
- Need NEW store: `matchAnalyses` — requires DB version bump to 2
- Migration: check if store exists in onupgradeneeded, create if missing
- Use existing Database CRUD API

## 4. Resume Selection
- Query `documents` store for type='resume' or type='cv'
- Filter out archived by default
- Use existing document schema fields: name, type, templateId, targetRole, lastModified

## 5. Resume Content Extraction
- Read document from `documents` store
- Extract text from: personalInfo.professionalTitle, personalInfo.resumeHeadline
- Extract from sections: summary content, experience items (jobTitle, company, responsibilities, achievements, technologies), education items, skills items, projects, certifications
- Use existing schema field paths

## 6. Tailored Copy Creation
- Use `cloneDocument(doc, newName)` from schema.js
- Add matcher-specific metadata (linkedJobDescriptionId, linkedAnalysisId)
- Save via `db.put('documents', copy)`
- Navigate to editor: `router.navigate('/editor/' + copy.id)`

## 7. Export
- Follow existing export pattern: Blob -> ObjectURL -> download link -> click -> revoke
- Use `sanitizeFilename()` for download names

## 8. Print
- Follow existing print.css patterns
- Add print-specific styles for matcher report
- Use `@media print` to hide navigation, filters, buttons

## 9. Toast Notifications
- Use `window.CC.toast.show(message, type)` or `toast.success()`, `toast.error()`

## 10. Modal Dialogs
- Use `window.CC.modal.show(options)` for confirmations
- Use `window.CC.modal.confirm(message)` for delete confirmations

## 11. Event Bus
- Emit relevant events for cross-module communication
- Follow naming convention: `matcher:analyze`, `matcher:save`, etc.

## 12. Global Context
- Register matcher in window.CC if needed for cross-module access

## 13. Export All Backup
- app.js `dashboard:exportAll` handler lists stores to export
- Must add `matchAnalyses` store to backup list
