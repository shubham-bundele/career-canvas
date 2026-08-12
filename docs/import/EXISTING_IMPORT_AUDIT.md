# Existing Import Audit

## Import Manager (src/js/modules/import-manager.js)
- **JSON Import**: Verified Working — validates schema, migrates, generates new ID, confirms via modal
- **Plain Text Import**: Working with Limitations — basic section detection (experience, education, skills etc.), name/email/phone regex, creates document with custom sections
- **Backup Import**: Verified Working — imports multiple documents, master profile, settings
- **File Picker**: Working — accepts .json and .txt only
- **Drop Zone**: Working — drag-and-drop with visual feedback
- **Field Mapping**: Working with Limitations — only maps name, email, phone via modal dialog
- **DOCX Import**: Not Present
- **PDF Import**: Not Present
- **OCR**: Not Present
- **Document Type Detection**: Not Present — always creates 'resume'
- **Section Type Mapping**: Not Present — all sections become 'custom'
- **Duplicate Detection**: Not Present
- **Draft Recovery**: Not Present
- **Image Import**: Not Present

## Import Route
- Route: /import (registered in app.js)
- Rendered by: ImportManager.renderImportView()
- Entry: Dashboard "Import" quick action button

## Document Creation
- Uses createEmptyDocument() from schema.js
- Always creates type 'resume'
- Maps name/email/phone to personalInfo
- All detected sections become sectionType: 'custom'
