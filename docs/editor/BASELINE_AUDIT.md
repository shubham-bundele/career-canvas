# Editor Baseline Audit

## Current Architecture

### State Management
- Document stored as `this.document` on the ResumeEditor class instance
- NO centralized state store — state lives directly on the class
- normalizeDocument() bridges flat schema → nested editor structure (metadata, design, settings)
- saveDocument() syncs nested structure → flat schema before persisting

### Data Flow
```
Field onChange → mutate this.document directly → handleFieldChange() →
  → markUnsaved() (updates save status)
  → scheduleAutosave() (1s debounce → saveDocument())
  → schedulePreviewUpdate() (300ms debounce → updatePreview())
```

### History (Undo/Redo)
- Array of JSON-stringified document snapshots
- pushHistory() called on save (not on every change)
- handleUndo/Redo restores full document snapshot
- Max 50 history entries
- BUG: undo/redo was calling handleFieldChange (fixed to call updatePreview only)

### Persistence
- IndexedDB via this.db.put('documents', this.document)
- Autosave with 1000ms debounce
- Save status: 'saved', 'saving', 'unsaved'

### Preview
- templateEngine.render(templateId, document, design)
- Updates on 300ms debounce after field changes
- Template ID from this.document.design.template

### Known Issues
1. State is mutated directly (no immutability) — risky for undo/redo
2. pushHistory called on every save, creating redundant snapshots
3. No command/transaction system — just full document snapshots
4. DOM is read for some operations (not pure state-driven)
5. normalizeDocument mutates the document in place
6. No stable section/entry ID validation

### Files
- src/js/modules/editor.js (2134 lines) — monolithic editor
- src/js/core/schema.js (596 lines) — document schema, factory functions
- src/js/core/state.js (495 lines) — StateManager class (NOT used by editor)
- src/js/core/db.js (469 lines) — IndexedDB abstraction

### What Works
- Loading documents from IndexedDB ✓
- Personal info editing ✓
- Section accordion expand/collapse ✓
- Add section dropdown ✓
- Text and list section editing ✓
- Experience/education/project/skill/cert/language entry editing ✓
- Achievement bullets add/delete/reorder ✓
- Template switching ✓
- Page size switching ✓
- ATS mode toggle ✓
- Autosave ✓
- Preview rendering ✓
- Cover letter fields ✓

### What Needs Improvement for Feature 1
- Document state should be the single source of truth
- All mutations should go through a controlled update path
- Preview should derive entirely from state
- UI should re-render from state, not mix DOM reads with state
