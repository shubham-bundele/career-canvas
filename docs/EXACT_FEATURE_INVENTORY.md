# CareerCanvas Feature Inventory

## Dashboard Features
| Feature | Route | Status |
|---------|-------|--------|
| Create New Document (+ New button) | Modal dialog | Repaired — events wired |
| Onboarding Wizard | Overlay on first visit | Repaired — DOM queries, localStorage key |
| My Documents (card grid) | #/dashboard | Repaired — loads from IndexedDB |
| Open Document (card click) | #/editor/:id | Repaired — event payload fix |
| Duplicate Document | Dashboard card action | Repaired — event handler added |
| Rename Document | Dashboard card action | Repaired — event handler added |
| Export Document | Dashboard card action | Repaired — creates JSON download |
| Archive Document | Dashboard card action | Working — uses db.put |
| Delete Document | Dashboard card action | Repaired — event handler added |
| Search Documents | Dashboard search bar | Working |
| Filter Documents | Dashboard filter buttons | Working |
| Sort Documents | Dashboard sort dropdown | Working |
| Storage Info | Dashboard footer | Working |

## Editor Features
| Feature | Route | Status |
|---------|-------|--------|
| Resume Editor | #/editor/:id | Working — loads doc, shows form + preview |
| Personal Info Section | Editor left panel | Working |
| Experience Section | Editor left panel | Working |
| Education Section | Editor left panel | Working |
| Skills Section | Editor left panel | Working |
| Projects Section | Editor left panel | Working |
| Certifications Section | Editor left panel | Working |
| Languages Section | Editor left panel | Working |
| Live Preview | Editor center panel | Working |
| Autosave | Debounced save | Working |
| Undo/Redo | Toolbar buttons | Working |
| Template Selector | Toolbar dropdown | Working |
| Page Size Selector | Toolbar dropdown | Working |
| ATS Mode Toggle | Toolbar button | Working |
| Print | Toolbar button | Repaired — print manager fixed |
| Export Dropdown | Toolbar | Working |

## Navigation
| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | #/dashboard | Working |
| Master Profile | #/master-profile | Working |
| Applications | #/applications | Working |
| Templates | #/templates | Working |
| Settings | #/settings | Working |
| Theme Toggle | Header button | Working |
| Experience Calculator | Header button | Working — preserved |

## Tools
| Feature | Route | Status |
|---------|-------|--------|
| Template Gallery | #/templates | Working |
| ATS Checker | Editor right panel | Working |
| Experience Calculator | Popup | Working — preserved |
| Export JSON | Export manager | Repaired |
| Export Plain Text | Export manager | Working |
| Import JSON | Import manager | Repaired |
| Full Backup Export | Settings / Dashboard | Repaired — event handler |
| Full Backup Import | Settings | Working |

## Settings
| Feature | Route | Status |
|---------|-------|--------|
| Theme (Light/Dark/System) | #/settings | Working |
| Default Page Size | #/settings | Working |
| Autosave Toggle | #/settings | Working |
| Accessibility Options | #/settings | Working |
| Privacy Info | #/settings | Working |
| Keyboard Shortcuts | #/settings | Working |
| Print Tips | #/settings | Working |
| Clear All Data | #/settings | Working |

## Templates
- 10 ATS templates
- 10 Professional templates
- 5 Technical templates
- 5 Creative templates
- 5 Cover Letter templates
- 3 Reference templates
- **Total: 38 templates**
