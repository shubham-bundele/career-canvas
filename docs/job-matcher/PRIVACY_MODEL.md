# Job Description Matcher — Privacy Model

## Data Residency
- ALL data stays in the browser
- IndexedDB storage only
- No server-side processing
- No remote API calls for analysis
- No telemetry or analytics

## Data Handling
- Resume content read from local IndexedDB, never transmitted
- Job description text stored locally only
- Analysis results stored locally only
- Exported files downloaded directly to user's device
- No clipboard access beyond standard paste events
- No camera, microphone, or location access

## Data Minimization
- Analysis stores evidence excerpts (max 200 chars), not full document copies
- Fingerprints are one-way hashes, not reversible to content
- Snapshot metadata (name, timestamp) stored, not full document copies

## Data Lifecycle
- User controls all creation, modification, and deletion
- Delete operations are immediate and permanent
- No "soft delete" retention period
- Export files contain only what user chooses to export
- Browser storage policies apply (user can clear at any time)

## URL Handling
- Source URL field is optional
- URLs are validated but never fetched
- No link preview or metadata retrieval
- Protocol whitelist: http, https only (via sanitizeURL)

## Print/Export
- Generated locally in the browser
- Downloaded directly to user's device
- No cloud storage integration
- No sharing features that transmit data
