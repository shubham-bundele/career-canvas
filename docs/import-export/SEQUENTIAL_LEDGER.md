# Import/Export Sequential Ledger

## Program Start: 2026-08-11

---

## STAGE 1: Capability Audit
**STATUS**: COMPLETED
**FILES INSPECTED**: import-manager.js (1766 lines), export-manager.js (563 lines), print-manager.js (225 lines), schema.js, db.js
**FINDINGS**: 9 key gaps identified — see CAPABILITY_MATRIX.md

---

## STAGE 2-4: Unified Import + Export Improvements
**STATUS**: IMPLEMENTING (parallel agents)
**CHANGES**:
- Export: Fix exportAllData to include all 11 stores, add JSON envelope, fix HTML XSS, add operation ID, improve text/markdown for all doc types, add selective export
- Import: Add unified finalizeImportedDocument with read-back verification, update all import paths to use it, add cover letter and reference sheet detection

---

## STAGE 5-10: Format-Specific Imports
**STATUS**: NOT STARTED

## STAGE 11-13: Field Mapping, Duplicates, Editor Redirect
**STATUS**: NOT STARTED

## STAGE 14-18: Export Improvements
**STATUS**: IN PROGRESS (via Stage 2-4 agent)

## STAGE 19: DOCX Export
**STATUS**: UNSUPPORTED BY DESIGN (no reliable client-side DOCX generation library evaluated yet)

## STAGE 20: Backup Improvements
**STATUS**: IN PROGRESS (exportAllData fix in Stage 2-4)

## STAGE 21-24: Round-Trip, Failure Recovery, Tests
**STATUS**: NOT STARTED
