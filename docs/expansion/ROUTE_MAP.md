# CareerCanvas Route Map — Current + Planned

## Current Routes (9)
| Route | View | Module |
|-------|------|--------|
| `#/dashboard` | Dashboard | dashboard.js |
| `#/editor/:id` | Editor | editor.js |
| `#/templates` | Template Gallery | template-gallery.js |
| `#/master-profile` | Master Profile | master-profile.js |
| `#/applications` | Application Tracker | application-tracker.js |
| `#/settings` | Settings | settings.js |
| `#/job-matcher` | JD Matcher | job-matcher.js (lazy) |
| `#/skills-matrix` | Skills Matrix | skills-matrix.js (lazy) |
| `#/import` | Import | import-manager.js |

## Planned New Routes
| Route | View | Module | Priority |
|-------|------|--------|----------|
| `#/theme-studio` | Theme Studio | theme-studio.js (lazy) | Module 1 |
| `#/section-studio` | Section Studio | section-studio.js (lazy) | Module 3 |
| `#/pdf-studio` | PDF Studio | pdf-studio.js (lazy) | Module 4 |
| `#/packages` | Document Packages | package-studio.js (lazy) | Module 5 |
| `#/timeline` | Career Timeline | timeline-studio.js (lazy) | Module 6 |
| `#/consistency` | Consistency Check | consistency-studio.js (lazy) | Module 7 |
| `#/privacy-check` | Privacy Check | privacy-studio.js (lazy) | Module 8 |
| `#/localization` | Localization | localization-studio.js (lazy) | Module 9 |
| `#/portfolio` | Portfolio | portfolio-studio.js (lazy) | Module 10 |
| `#/links-qr` | Links & QR | link-qr-studio.js (lazy) | Module 11 |
| `#/optimizer` | Space Optimizer | optimizer.js (lazy) | Module 12 |
| `#/a11y-inspector` | Accessibility Inspector | a11y-inspector.js (lazy) | Module 13 |
| `#/versions` | Version History | version-studio.js (lazy) | Module 14 |
| `#/data-backup` | Data & Backup | data-studio.js (lazy) | Module 15 |

All new routes use dynamic import (lazy loading).
Template Studio (Module 2) extends existing #/templates route rather than creating a new one.
Template Stress Lab (Module 16) is developer-only, no route needed.
