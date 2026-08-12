# CareerCanvas Dashboard Module Inventory

## Navigation Modules
| Module | Route | Entry Point | Status |
|--------|-------|-------------|--------|
| Dashboard | #/dashboard | app-nav-link | Working (needs visual polish) |
| Master Profile | #/master-profile | app-nav-link | UI renders, needs testing |
| Applications | #/applications | app-nav-link | UI renders, needs testing |
| Templates | #/templates | app-nav-link | UI renders, needs testing |
| Settings | #/settings | app-nav-link | UI renders, needs testing |

## Header Actions
| Control | ID | Status |
|---------|-----|--------|
| Experience Calculator | btn-exp-calc | Working (PRESERVE) |
| + New Document | btn-new-document | Working (creates doc via modal) |
| Theme Toggle | btn-theme-toggle | Working |

## Dashboard Features
| Feature | Implementation | Status |
|---------|---------------|--------|
| Document cards grid | dashboard.js | Renders from IndexedDB |
| Search documents | dashboard.js | Implemented |
| Filter by type | dashboard.js | Implemented |
| Sort documents | dashboard.js | Implemented |
| Open document | dashboard.js → event | Working |
| Duplicate document | dashboard.js → event | Working |
| Rename document | dashboard.js → event | Working |
| Export document | dashboard.js → event | Working |
| Archive document | dashboard.js | Working |
| Delete document | dashboard.js → event | Working |
| Storage info | dashboard.js | Working |

## Onboarding Wizard
| Step | Content | Status |
|------|---------|--------|
| Step 1 | Document Type (6 options) | Working |
| Step 2 | Career Level (8 options) | Working |
| Step 3 | Starting Method (6 options) | Working |
| Step 4 | Resume Goal (6 options) | Working |
| Step 5 | Page Format (4 options) | Working |
| Complete | Creates doc, opens editor | Working |
| Skip | Goes to dashboard | Working |

## Editor (Resume Builder)
| Feature | Status |
|---------|--------|
| 3-panel layout | Renders |
| Personal info form | Working |
| Add Section dropdown | Fixed (refreshLeftPanel) |
| Section accordions | Working |
| Live preview | Fixed (template ID, section types) |
| Autosave | Working |
| Undo/Redo | Fixed (no save loop) |
| Template selector | Fixed (real template IDs) |
| Page size selector | Working |
| Print button | Partially working |
| Export dropdown | Needs testing |

## Selected Module for Phase 2: Resume Builder
Reason: Core module that provides the most direct user value, currently has the most bugs (field mismatches, preview issues), and is needed by all document types.
