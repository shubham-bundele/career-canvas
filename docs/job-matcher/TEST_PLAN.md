# Job Description Matcher — Test Plan

## Test Framework
Browser-based tests following existing pattern (tests/featureN-*.test.html)
New file: `tests/job-matcher.test.html`

## Test Groups

### Navigation (5 tests)
1. Dashboard entry renders and is clickable
2. Route #/job-matcher opens matcher view
3. Browser back returns to previous page
4. Browser forward navigates correctly
5. Page refresh preserves route

### Resume Selection (7 tests)
1. Resume list loads from documents store
2. Search filters by name
3. Type filter works
4. Sort by last modified works
5. Select resume updates UI state
6. Empty state shows when no resumes exist
7. Archived resumes hidden by default

### Job Description CRUD (10 tests)
1. Create new job description
2. Save job description persists to IndexedDB
3. Reopen saved description shows correct content
4. Rename updates title
5. Duplicate creates independent copy with new ID
6. Delete with cancel preserves record
7. Delete with confirm removes record
8. URL validation accepts valid, rejects invalid
9. Character/word counts display correctly
10. Paste text works safely

### Analysis Engine (12 tests)
1. Normalization preserves C++, C#, .NET, Node.js, CI/CD
2. Stop words removed correctly
3. Phrase extraction finds multi-word terms
4. Required classification from "must have" / "required"
5. Preferred classification from "preferred" / "nice to have"
6. Exact match detection
7. Phrase match detection
8. Abbreviation match (JS -> JavaScript)
9. Related term suggestion
10. Missing term detection
11. Resume-only term detection
12. Evidence excerpt with correct positions

### Results Interface (8 tests)
1. Overall estimate displays with disclaimer
2. Category breakdowns render
3. Search filters results
4. Filter by match type works
5. Filter by category works
6. Combined filters work correctly
7. Clear filters resets all
8. Dismiss/restore suggestions work

### Saved Analysis (6 tests)
1. Save analysis persists to IndexedDB
2. Reopen loads correct data
3. Duplicate creates independent copy
4. Delete removes record
5. Staleness detected when resume modified
6. Re-run produces fresh results

### Export (4 tests)
1. JSON export creates valid file
2. JSON content includes all required fields
3. Text export creates readable report
4. Print mode hides navigation and buttons

### Tailored Copy (5 tests)
1. Creates new document with unique ID
2. Original resume unchanged after copy
3. Copy preserves content and template
4. Copy appears on dashboard
5. Repeated click prevented (no duplicates)

### Security (5 tests)
1. Script tags in JD text rendered as text
2. Event handler attributes not executed
3. Long input truncated correctly
4. Prototype pollution properties ignored
5. Invalid JSON import rejected

### Regression (3 tests)
1. Dashboard loads and functions
2. Resume editor opens and saves
3. Experience Calculator opens
