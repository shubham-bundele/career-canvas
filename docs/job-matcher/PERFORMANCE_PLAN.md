# Job Description Matcher — Performance Plan

## Analysis Performance
- Full analysis should complete in <500ms for typical JD (500-2000 words)
- No analysis on keystroke — only on explicit user action
- Progress feedback via stage indicators (not fake percentages)
- Cancellation support via operation ID tracking

## UI Responsiveness
- Typing in JD editor: no analysis triggers
- Filter/search results: debounced (150ms)
- Sort changes: immediate (in-memory)
- Pagination for large saved lists (>50 items)

## Memory Management
- Analysis results held in memory during active session
- Saved analyses loaded on demand, not all at once
- Large term lists rendered with DOM recycling where needed
- Evidence excerpts limited to 200 chars (not full documents)

## Database Performance
- Use indexes for common queries (resumeId, jobDescriptionId, createdAt)
- Batch reads where possible
- No full-table scans for normal operations

## Web Worker Strategy
- v1: No Web Worker (analysis is fast enough for typical data)
- Monitor: If analysis of very long CVs (>10,000 words) causes >100ms blocking, add Worker
- Worker would handle normalization and matching stages

## Large Data Targets
- 100 saved job descriptions: list loads in <200ms
- 100 saved analyses: list loads in <200ms
- Very long JD (5000+ words): analysis completes in <2000ms
- Long CV (3+ pages): comparison completes in <1000ms
