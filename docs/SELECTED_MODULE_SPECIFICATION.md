# Selected Module: Resume Builder

## Reason for Selection
The Resume Builder is the core module that provides the most direct user value. It is the primary document creation and editing experience. All other document types (CV, Cover Letter, etc.) depend on the same editor architecture. Fixing this module first provides maximum impact.

## Current Known Issues
1. Template rendering issues — field name mismatches between editor and schema (FIXED)
2. Achievements stored as objects vs strings (FIXED)
3. Technologies stored as arrays (FIXED)
4. Undo/redo triggered autosave loop (FIXED)
5. refreshLeftPanel used wrong parent element (FIXED)
6. Template selector showed fake template names (FIXED)
7. getSectionType needed in templates (FIXED)
8. Preview styling minimal — needs embedded CSS in templates

## Module Scope
### Entry Points
- Onboarding wizard → "Get Started" → creates doc → opens editor
- Dashboard → "+" New button → creates doc → opens editor
- Dashboard → document card click → opens editor

### Layout
- Desktop: 3-panel (left editor ~380px, center preview flex, right guidance ~280px)
- Mobile: tab-based (Edit, Preview, Design, Export)
- Top toolbar with doc name, template selector, page size, ATS mode, undo/redo, export, print

### Resume Sections
1. Personal Information (always present)
2. Summary (text section)
3. Objective (text section)
4. Work Experience (list section with entries)
5. Education (list section)
6. Projects (list section)
7. Skills (list section)
8. Certifications (list section)
9. Languages (list section)
10. Publications (list section)
11. Awards & Honors (list section)
12. Volunteer Work (list section)

### Each List Section Supports
- Add Entry
- Edit Entry (expand to form)
- Delete Entry (with confirmation)
- Duplicate Entry
- Move Up / Move Down
- Hide / Show
- Entry-specific fields

### Data Persistence
- Autosave (1-second debounce)
- Manual Save (Ctrl+S)
- IndexedDB via Database.put('documents', doc)
- Document structure: flat fields + normalizeDocument() bridges to nested

### Template Rendering
- templateEngine.render(templateId, documentData, designSettings)
- Templates use getSectionType() to detect section types
- Templates handle both editor format and sample data format

## Acceptance Criteria
1. Editor opens with correct document loaded from IndexedDB
2. Personal info fields update document state
3. Sections can be added via dropdown menu
4. Text sections show textarea, list sections show entry manager
5. Entries can be added, edited, duplicated, deleted, reordered
6. Preview updates live as user types
7. Template selector shows all registered templates
8. Changing template updates preview immediately
9. Autosave works (1-second debounce after field change)
10. Save status indicator shows "Saved", "Saving...", "Unsaved changes"
11. Ctrl+S forces save
12. Ctrl+Z/Y for undo/redo
13. Document persists after page refresh
14. Document reopens correctly from dashboard
15. Print button opens browser print dialog
16. Export creates downloadable file
