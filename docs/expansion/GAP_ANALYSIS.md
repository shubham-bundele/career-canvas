# CareerCanvas Gap Analysis

## Module 1: Theme Studio
**Current State**: ThemeEngine backend is COMPLETE (11 built-in themes, custom CRUD, import/export, preview/cancel, flash prevention, contrast validation). Settings panel has basic light/dark toggle.
**Gap**: No dedicated Theme Studio UI page where users can browse the full gallery, preview, compare, create custom themes, import/export.
**Action**: Build Theme Studio route (#/theme-studio) as a UI over the existing ThemeEngine. Do NOT rebuild the engine.

## Module 2: Template Studio
**Current State**: Template Gallery exists for browsing/applying 37 templates. Templates are code-defined with render functions.
**Gap**: No Template Studio for visual template creation/editing. Template expansion needed (target: 80+ templates). No student, executive, academic, federal, international categories.
**Action**: Expand template catalog first (new template files), then build Template Studio as a visual customization layer.

## Module 3: Section Studio
**Current State**: 35 section types hardcoded in schema.js. Editor supports adding from fixed list.
**Gap**: No dynamic section type creation by users. No field builder.
**Action**: Build Section Studio from scratch.

## Module 4: PDF Studio
**Current State**: Browser print-to-PDF only. No PDF viewing, manipulation, merge, split, annotate.
**Gap**: Complete module missing.
**Action**: Build from scratch using pdf-lib and PDF.js (after license review).

## Modules 5-16
**Current State**: None of these exist.
**Action**: Build each in priority order after Modules 1-4.

## Key Dependencies
- Theme Studio UI depends on existing ThemeEngine (ready)
- Template expansion depends on existing TemplateEngine and render pattern (ready)
- Section Studio depends on schema.js section system and editor rendering (ready)
- PDF Studio depends on external libraries (need license review)
- All modules depend on existing DB, router, modal, toast infrastructure (ready)

## Database Impact
- Section Studio: needs new store for custom section definitions
- PDF Studio: may need store for PDF sessions
- Version Studio: needs snapshots store expansion
- All others: likely use existing stores or new dedicated stores
- DB version bump from 3 to 4+ will be needed
