# Test Coverage

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Test Framework

CareerCanvas uses a custom minimal HTML-based test framework. Each test file is a self-contained HTML page that imports application modules and runs assertions using inline JavaScript. No external test framework (Jest, Mocha, Playwright, etc.) is used.

### Test Execution
- Open test HTML files directly in the browser via `http://localhost:8080/tests/<filename>`
- Results displayed in `<pre id="log">` element and browser console
- Pass/fail counts tracked with simple `assert(name, condition)` function

---

## Test File Inventory (28 files)

### Editor Feature Tests (23)

| File | Feature | Area |
|------|---------|------|
| `feature1-state.test.html` | Centralized editor state | State management |
| `feature2-undo-redo.test.html` | Undo and redo | History |
| `feature3-autosave.test.html` | Autosave | Persistence |
| `feature4-section-navigator.test.html` | Section navigator | Navigation |
| `feature5-section-drag.test.html` | Section drag and drop | Reorder |
| `feature6-keyboard-reorder.test.html` | Keyboard reorder | Accessibility |
| `feature7-entry-reorder.test.html` | Entry reorder | Reorder |
| `feature8-column-movement.test.html` | Column movement | Layout |
| `feature9-column-resize.test.html` | Column resize | Layout |
| `feature10-photo-resize.test.html` | Photo resize | Media |
| `feature11-rich-text-model.test.html` | Rich text model | Editing |
| `feature12-popup-editor.test.html` | Popup editor | Editing |
| `feature13-formatting.test.html` | Formatting | Editing |
| `feature14-floating-toolbar.test.html` | Floating toolbar | UI |
| `feature15-design-studio.test.html` | Design Studio | Design |
| `feature16-presets.test.html` | Design presets | Design |
| `feature17-font-roles.test.html` | Font roles | Typography |
| `feature18-type-scale.test.html` | Type scale | Typography |
| `feature19-21-spacing-colors-advanced.test.html` | Spacing, colors, advanced | Design |
| `feature22-section-settings.test.html` | Section settings | Sections |
| `feature23-ats-restrictions.test.html` | ATS restrictions | ATS |

### Career Tool Tests (5)

| File | Feature | Area |
|------|---------|------|
| `job-matcher-step1.test.html` | Job Matcher step 1 | Career Tools |
| `job-matcher.test.html` | Job Matcher full | Career Tools |
| `skills-matrix-step1.test.html` | Skills Matrix step 1 | Career Tools |
| `skills-matrix-analyzer.test.html` | Skills Matrix analyzer | Career Tools |
| `skills-matrix-full.test.html` | Skills Matrix full | Career Tools |

### Studio Tests (2)

| File | Feature | Area |
|------|---------|------|
| `template-studio.test.html` | Template Studio | Templates |
| `theme-studio.test.html` | Theme Studio | Themes |

---

## Coverage Gaps

### Areas Without Tests

| Area | Gap |
|------|-----|
| **Dashboard** | No tests for document CRUD, filtering, sorting |
| **Import** | No tests for DOCX, PDF, or OCR import |
| **Export** | No tests for any export format |
| **Authentication** | No tests for sign-up, sign-in, sign-out flows |
| **Router** | No tests for navigation, guards, params |
| **IndexedDB** | No isolated tests for database operations |
| **Print** | No tests for print preparation or page sizing |
| **Settings** | No tests for preference persistence |
| **Application Tracker** | No tests for CRUD or status pipeline |
| **Experience Calculator** | No tests for date calculations |
| **PDF Studio** | No tests for viewer functionality |
| **Studios** | No tests for any studio except Template/Theme |
| **Mobile** | No tests for responsive behavior |
| **Accessibility** | No tests for keyboard navigation or ARIA |
| **Security** | No tests for sanitization or input validation |

### Test Execution Status

Tests were not executed during this audit as they require a browser context with DOM access and may modify IndexedDB state. Their execution status is: **MANUAL VERIFICATION REQUIRED**.

---

## Recommendations

1. Adopt a headless browser test runner (Playwright or Puppeteer) for automated execution
2. Add import/export round-trip tests
3. Add authentication flow tests (mocked Supabase)
4. Add responsive layout tests at key breakpoints
5. Add accessibility tests (axe-core integration)
6. Add IndexedDB CRUD tests with isolated contexts
