# CareerCanvas Route Map

## Registered Routes (from app.js setupRoutes)
| Route | View | Handler | Description |
|-------|------|---------|-------------|
| `#/dashboard` | dashboard | `Dashboard` class | Main landing page, document list |
| `#/editor/:id` | editor | `ResumeEditor` class | Document editor with live preview |
| `#/templates` | templates | `TemplateGallery` class | Template browser |
| `#/master-profile` | master-profile | `MasterProfile` class | Career profile management |
| `#/applications` | applications | `ApplicationTracker` class | Job application tracking |
| `#/settings` | settings | `SettingsPanel` class | Application settings |
| `#/import` | import | `ImportManager` | Import documents |

## Default Route
`#/dashboard` (redirects here when no hash or unknown hash)

## Navigation
- Top nav bar: Dashboard, Profile, Applications, Templates, Settings
- Header actions: Exp Calculator (overlay), + New (modal), Theme Toggle
- Router uses hash-based navigation (`window.location.hash`)
- Back/Forward use `window.history`
- Route guard: warns on unsaved changes before navigation

## Route Parameters
- `/editor/:id` — document UUID

## 404 Handling
- Unmatched routes redirect to `#/dashboard`
- In-app fallback renders "Page not found" with dashboard link

## GitHub Pages Compatibility
- 404.html provides redirect for deep links
- All paths use relative references
