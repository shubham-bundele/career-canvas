# Template and Theme System

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Three Separate Concepts

CareerCanvas distinguishes three separate design systems:

| System | Scope | Persistence | Example |
|--------|-------|-------------|---------|
| **Application Theme** | App UI chrome (backgrounds, text, borders) | localStorage `cc_app_theme` | Midnight Professional (dark navy) |
| **Document Template** | Resume/CV content layout and rendering | Document `templateId` in IndexedDB | ATS Essential (single-column) |
| **Document Design** | Typography, colors, spacing within a template | Document `design` object in IndexedDB | Arial 11pt, blue accent, A4 |

---

## Application Themes

### Built-in Themes (12)

| ID | Name | Mode | Category |
|----|------|------|----------|
| `careercanvas-light` | CareerCanvas Light | light | Light |
| `midnight-professional` | Midnight Professional | dark | Dark |
| `ocean-breeze` | Ocean Breeze | light | Colorful |
| `emerald-focus` | Emerald Focus | light | Professional |
| `royal-purple` | Royal Purple | dark | Colorful |
| `sunset-coral` | Sunset Coral | light | Colorful |
| `rose-quartz` | Rose Quartz | light | Calm |
| `golden-sand` | Golden Sand | light | Calm |
| `slate-minimal` | Slate Minimal | light | Professional |
| `high-contrast-light` | High Contrast Light | light | High Contrast |
| `high-contrast-dark` | High Contrast Dark | dark | High Contrast |
| `system` | Follow System | system | System |

### Theme Engine (`src/js/core/theme-engine.js`)

- Applies 27+ CSS custom property tokens to `document.documentElement`
- Supports custom theme CRUD, export/import as JSON
- Live preview without persisting
- System theme detection via `prefers-color-scheme`
- XSS sanitization blocks `url()`, `expression()`, `javascript:` in token values

### Theme Studio (`/theme-studio`)

- Gallery view with search and filtering (7 categories)
- Apply, Preview (with confirm/cancel), Duplicate, Export, Delete (custom only)
- Full editor with color pickers for Brand, Backgrounds, Text, Borders, Semantic colors
- Live preview mock-up

---

## Document Templates

### Template Count: 68

| Category | Count | Doc Types |
|----------|-------|-----------|
| ATS | 10 | resume (8), resume+cv (2) |
| Professional | 10 | resume |
| Technical | 5 | resume |
| Creative | 5 | resume |
| Executive | 8 | resume+cv |
| Academic | 8 | resume+cv |
| Student | 8 | resume |
| Cover Letter | 8 | cover-letter |
| References | 6 | references |

### Template Interface

Each template provides:

```javascript
{
  id: 'ats-essential',
  name: 'ATS Essential',
  description: '...',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [...],
  recommendedLevels: [...],
  colorPresets: [...],
  fontPresets: [...],
  render: (documentData, designSettings) => htmlString
}
```

### Template Gallery (`/templates`)

- Browse all templates with live rendered previews
- 4 document type tabs (Resumes, Cover Letters, References, All)
- 5 filter groups (Style, Level, Layout, Photo, Typography)
- Full-text search
- Preview modal with page-size toggle (A4/Letter)
- Compare up to 2 templates side-by-side
- Favorites (persisted in localStorage)
- "Use Template" creates new document and opens editor

---

## Document Design

### Design Studio (drawer in editor)

8 collapsible control groups:

| Group | Controls |
|-------|----------|
| Page Setup | Page size (A4/Letter/Legal/A5), orientation, margins (0-50mm) |
| Typography | Font family (37 fonts), base size (8-16pt), name size (16-40pt), heading size (10-24pt), line height (1.0-2.0) |
| Colors | Accent, text, secondary, background — with contrast ratio warnings |
| Section Style | Heading style, divider style, bullet style |
| Layout | Header alignment, contact layout, date alignment, sidebar position/width |
| Photo | Shape, size (50-200px), border |
| Spacing | Section (8-32px), paragraph (4-20px), bullet (2-12px) |
| Advanced | Icons, link style, page numbers, header/footer |

### Typography Presets (7)

| Preset | Font | Use Case |
|--------|------|----------|
| ATS Clean | Arial | Maximum ATS compatibility |
| Modern Professional | Calibri | Clean modern look |
| Executive Serif | Georgia | Senior/executive roles |
| Technical Compact | Verdana | Dense technical content |
| Elegant Minimal | Helvetica | Minimalist design |
| Graduate Friendly | Trebuchet MS | Students/new graduates |
| Academic Formal | Times New Roman | Academic CVs |

### Font Manager (37 fonts)

| Category | Fonts |
|----------|-------|
| Sans-Serif (14) | Arial, Helvetica, Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, Nunito, Source Sans Pro, Raleway, Work Sans, DM Sans, Plus Jakarta Sans |
| Serif (9) | Georgia, Times New Roman, Merriweather, Playfair Display, Lora, Libre Baskerville, EB Garamond, Crimson Text, PT Serif |
| Monospace (5) | Courier New, Fira Code, JetBrains Mono, Source Code Pro, IBM Plex Mono |

---

## Print Isolation

Document templates always render with white background and black text, regardless of the application theme. The preview panel overrides all theme CSS variables with document-specific values to ensure WYSIWYG print fidelity.
