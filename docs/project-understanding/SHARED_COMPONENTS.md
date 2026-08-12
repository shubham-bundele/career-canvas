# CareerCanvas Shared Components

## Modal System (src/js/modules/modal.js)
- Singleton accessible via `window.CC.modal`
- Methods: `show(options)`, `confirm(message)`, `alert(message)`, `prompt(message, default)`
- Features: focus trap, escape close, backdrop click (optional), animation
- Sizes: small, medium, large, full
- Button types: primary, secondary, danger, success
- Actions return Promise

## Toast System (src/js/modules/toast.js)
- Singleton accessible via `window.CC.toast`
- Methods: `show(message, type, duration)`, `success()`, `error()`, `warning()`, `info()`
- Auto-dismiss with progress bar
- Max 5 visible, queues excess
- Swipe-to-dismiss on mobile
- Returns toast ID for manual dismiss

## EventBus (src/js/core/events.js)
- Singleton exported as default
- Methods: `on(event, handler)`, `off()`, `once()`, `emit(event, data)`, `clear()`
- Supports namespaced events with wildcards ('document:*')
- Returns unsubscribe function from `on()`

## Router (src/js/core/router.js)
- Hash-based, singleton
- Methods: `register(path, handler)`, `navigate(path)`, `back()`, `forward()`
- Supports route params (`:id`)
- Route guards (async)
- Default route: `#/dashboard`

## StateManager (src/js/core/state.js)
- Singleton with undo/redo, snapshots, batch updates
- Dot-notation path access: `state.get('user.profile.name')`
- Subscribe to path changes

## Database (src/js/core/db.js)
- Promise-based IndexedDB wrapper
- CRUD: create, read, update, delete, getAll, getByIndex, query, count

## Sanitization (src/js/utils/sanitize.js)
- `createElement(tag, text, attrs)` — Safe DOM element creation
- `encodeHTML(text)` — XSS prevention
- `sanitizeURL(url)` — Protocol whitelist validation
- `sanitizeFilename(name)` — Safe filename generation
- `sanitizeInput(input, maxLength)` — Input length limiting
- `sanitizeObject(obj)` — Recursive object sanitization
- `stripHTML(html)` — Remove HTML tags

## Formatting (src/js/utils/format.js)
- `formatTimeAgo(date)`, `formatDate(date, format)`
- `countWords(text)`, `countCharacters(text)`
- `truncate(text, maxLength)`, `capitalize(text)`, `toTitleCase(text)`
- `pluralize(count, singular, plural)`
- `sanitizeFilename(name)` — From sanitize.js

## ID Generation (src/js/utils/id.js)
- `generateUUID()` — UUID v4 via crypto.randomUUID()
- `generateShortId()` — 8-character random ID
- `generateSortableId()` — Timestamp-based sortable ID
- `generateId` — Alias for generateUUID

## CSS Design System (src/css/variables.css)
- Color tokens: primary (blue), secondary (indigo), accent (purple)
- Semantic colors: success (green), warning (amber), error (red), info (cyan)
- Category colors: resume (blue), cv (purple), cover-letter (pink), etc.
- Neutral gray palette: 50-900
- Spacing scale: 4px base
- Typography: system font stack
- Shadows: sm, md, lg, xl
- Border radius: sm (4px), md (8px), lg (12px), xl (16px)
- Breakpoints: 480px, 768px, 1024px, 1280px
- Dark theme via `[data-theme="dark"]` overrides
