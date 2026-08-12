# Job Description Matcher — Security Model

## Input Sanitization
- All user input sanitized via existing `sanitize.js` utilities
- `createElement(tag, text, attrs)` for safe DOM construction
- `textContent` for all text rendering (never innerHTML with user data)
- `sanitizeURL(url)` for URL validation (http/https only)
- `sanitizeFilename(name)` for export filenames
- `sanitizeInput(input, maxLength)` for length limiting
- `encodeHTML(text)` where HTML encoding is needed

## XSS Prevention
- No `innerHTML` with untrusted content
- No `eval()` or `Function()` constructor
- No `document.write()`
- No event handler attributes in HTML strings
- No `javascript:` URLs
- Template literals use textContent assignment

## Prototype Pollution Defense
- JSON.parse() for imported data (no Object.assign from untrusted sources)
- Validate expected fields before using imported analysis data
- No `__proto__`, `constructor`, or `prototype` property access from user data

## Input Size Limits
- Job description text: 50,000 characters (MAX_LENGTHS.VERY_LONG_TEXT)
- Title/company/role: 100 characters (MAX_LENGTHS.SHORT_TEXT)
- URL: 2,048 characters (MAX_LENGTHS.URL)
- Tags: 50 characters each, max 20 tags
- Analysis name: 100 characters

## Storage Security
- IndexedDB same-origin policy applies
- No cross-origin data access
- localStorage for preferences only (no sensitive data)

## Export Security
- JSON exports contain only analysis data, not credentials
- Filenames sanitized to prevent path traversal
- Blob URLs revoked after download
