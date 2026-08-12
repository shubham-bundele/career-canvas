# Theme Studio Baseline Audit

## Existing Theme Architecture

### Current System
- CSS custom properties in `src/css/variables.css` (348 lines)
- Light mode: default `:root` values
- Dark mode: `[data-theme="dark"]` selector AND `@media (prefers-color-scheme: dark)` for system
- Theme toggle: `app.js` toggles between 'light' and 'dark' via `data-theme` attribute
- Persistence: `localStorage.getItem('cc_theme')` — stores 'light' or 'dark'
- No theme flash prevention (theme applied after JS loads)

### Existing Variables (43 semantic tokens)
**Backgrounds:** bg-primary, bg-secondary, bg-tertiary, bg-elevated, bg-overlay, bg-hover, bg-active, bg-disabled
**Text:** text-primary, text-secondary, text-tertiary, text-muted, text-disabled, text-inverse, text-link, text-link-hover
**Borders:** border-primary, border-secondary, border-focus, border-error, border-success
**Colors:** color-primary (+ light/dark/50-900), color-secondary, color-accent, success, warning, error, info
**Shadows:** shadow-sm through shadow-2xl, shadow-focus
**Scrollbar:** scrollbar-track, scrollbar-thumb, scrollbar-thumb-hover

### Hard-coded Colors (Migration Needed)
- 98 hex color values in CSS files (outside variables.css)
- 140 rgb/rgba values in CSS files
- Many in components.css, editor.css, dashboard.css, onboarding.css
- Gradient colors use hard-coded hex (e.g., `linear-gradient(135deg, #2563eb, #1d4ed8)`)

### Current Theme Toggle
- Binary: light ↔ dark
- Single button in header (🌙/☀️)
- No system-theme auto-detection while toggling
- No theme preview
- No custom themes

### Print Isolation
- `src/css/print.css` uses `@media print` — separate from app theme
- Resume templates have their own designVars system — isolated from app theme
- Document colors use CSS variables scoped to template elements

### What Works
- Light/dark toggle functions
- Most components respond to data-theme changes
- Variables cascade properly

### What Needs Improvement
- No theme gallery
- No custom themes
- No theme preview
- No import/export
- No contrast validation
- Hard-coded colors bypass theme system
- No theme flash prevention
- No system-theme listener (only media query)
- No theme schema/versioning
