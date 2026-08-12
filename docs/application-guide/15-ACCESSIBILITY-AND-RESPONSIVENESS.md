# Accessibility and Responsiveness

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Accessibility Features Implemented

Note: No formal WCAG conformance audit has been performed. The following accessibility features are present in the implementation.

### Semantic Structure
- Semantic HTML landmarks (header, main, nav, section)
- ARIA labels on interactive elements
- ARIA roles on option cards (`role="radio"`, `role="listbox"`, `role="tab"`)
- Form labels associated with inputs

### Keyboard Operation
- All navigation links keyboard-accessible
- Tab navigation through form fields
- Enter/Space to activate buttons and cards
- Escape to close modals, drawers, and overlays
- Arrow keys for section/entry reorder in editor
- Editor keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+P, Ctrl+Shift+A)

### Focus Management
- Focus trapped in modal dialogs
- Focus returned to trigger element on modal close
- Visible focus indicators (outline/ring styles)
- Skip-to-content functionality via semantic structure

### Screen Reader Support
- `aria-hidden="true"` on decorative elements (icons, animations)
- `aria-label` on icon-only buttons
- `aria-expanded` on dropdown triggers
- `aria-live` regions for toast notifications
- Status text for save indicator

### Reduced Motion
- `prefers-reduced-motion` media query respected
- All animations disabled when reduced motion is active
- Setting available in Settings > Accessibility
- Onboarding starfield animation disabled

### High Contrast
- Two high-contrast themes (light and dark)
- `forced-colors` media query support in some components
- Setting available in Settings > Accessibility
- Strong focus indicators

### Font Size
- UI font size adjustable (Small, Medium, Large, Extra Large)
- Document preview uses independent sizing
- Settings > Accessibility > Font Size

### Accessibility Inspector Tool
- Route: `/a11y-inspector`
- Analyzes documents for accessibility issues
- 8 check types: contrast ratio, font sizes, heading hierarchy, link clarity, text density, alt text
- WCAG 4.5:1 contrast ratio threshold
- Findings with severity levels and suggestions

---

## Responsive Design

### Breakpoints

| Breakpoint | Target |
|-----------|--------|
| ≥1280px | Large desktop |
| 1024-1279px | Laptop |
| 768-1023px | Tablet |
| 640-767px | Large phone |
| ≤480px | Small phone |

### Layout Adaptations

| Component | Desktop | Mobile |
|-----------|---------|--------|
| Navigation | Horizontal nav bar with dropdown | Hamburger menu + slide-out drawer |
| Editor | 3-panel side-by-side | Tab-switched single panel |
| Template Gallery | Multi-column grid with sidebar filters | Single column, horizontal filters |
| Dashboard | Multi-column card grid | Single column |
| Modals | Centered with max-width | Full-screen |
| Design Studio | Side drawer (clamp 340-440px) | Full-width |
| Toasts | Bottom-right cards | Bottom-center snackbar style |

### Mobile Editor
- 4 bottom tabs: Edit, Preview, Design, Export
- Tab bar with 60px min-height touch targets
- Preview scales to viewport width
- `data-mobile-view` attribute controls panel visibility

### Touch Targets
- Minimum 36-44px on interactive elements in mobile views
- Editor action buttons sized up from 28px to 36px on mobile
- Font manager controls enlarged for touch
- Design panel controls enlarged for touch

### CSS Architecture
- 32 CSS files covering all components
- CSS custom properties (variables) for theming
- Mobile-first responsive breakpoints in most files
- `overflow-x: hidden` on body prevents horizontal scroll

---

## Print Support

### Print Stylesheet (`src/css/print.css`)
- Hides all non-document UI (toolbar, panels, navigation, tabs)
- Forces white background, black text
- Removes shadows and decorative elements
- `@page` rules for margins and sizing

### Print Manager (`src/js/modules/print-manager.js`)
- Page size configuration (A4, Letter, Legal, A5)
- Pre-print validation (missing info, empty sections, large images)
- Page count estimation
- Browser-specific print instructions (Chrome, Firefox, Safari)

---

## Known Accessibility Gaps

- No comprehensive WCAG 2.1 AA audit performed
- Some interactive elements below 44px minimum touch target on desktop
- Drag-and-drop operations have keyboard alternatives but may be difficult to discover
- Rich-text editing uses `document.execCommand()` which has limited screen reader support
- Color contrast of some decorative elements has not been formally verified
- PDF Studio search highlighting may not be announced to screen readers
- Some toast notifications may be dismissed before screen reader announces them
