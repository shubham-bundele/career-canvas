# Import/Export — Current Session State

## Current Stage: 2-4 (Implementing via parallel agents)
## Status: Two agents working on export-manager.js and import-manager.js

## Agent 1: Export Manager Fixes
- Fix exportAllData to include all 11 stores
- Add JSON export envelope
- Fix HTML XSS in title
- Add export operation ID
- Improve text/markdown for all doc types
- Add selective export method

## Agent 2: Import Manager Fixes
- Add unified finalizeImportedDocument with read-back
- Update importPlainText/DOCX/PDF to use it
- Update draft recovery to use it
- Add cover letter detection
- Add reference sheet detection

## Files Being Modified
- src/js/modules/export-manager.js
- src/js/modules/import-manager.js

## Backups Created
- .local-backup/pre-ie-audit-import-manager.js
- .local-backup/pre-ie-audit-export-manager.js

## Next Actions After Agents Complete
1. Verify both files with node --check
2. Verify all imports serve (200)
3. Create automated tests
4. Update ledger
