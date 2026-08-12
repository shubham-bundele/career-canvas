# CareerCanvas Feature Inventory

## Dashboard (#/dashboard)
- **Entry**: Top nav "Dashboard" link, app logo, default route
- **Purpose**: Document list with CRUD actions
- **Workflow**: View documents -> search/filter/sort -> open/create/duplicate/rename/export/archive/delete
- **Storage**: `documents` store
- **Shared Components**: EventBus, Modal, Toast, Database, sanitize utils
- **Status**: Working
- **Matcher Relevance**: HIGH — Matcher entry point will be added here or in nav
- **Regression Required**: Yes

## Resume/CV/Cover Letter Editor (#/editor/:id)
- **Entry**: Click document card, create new document
- **Purpose**: Full document editor with live preview
- **Workflow**: Load document -> edit fields -> auto-save -> preview -> design -> print/export
- **Storage**: `documents` store
- **Features**: Undo/redo, autosave, drag-and-drop sections, entry reorder, column movement, rich text, floating toolbar, design studio, font manager, ATS mode, print, responsive
- **Status**: Working (25 sequential features built)
- **Matcher Relevance**: HIGH — tailored copy opens in this editor
- **Regression Required**: Yes

## Template Gallery (#/templates)
- **Entry**: Top nav "Templates" link
- **Purpose**: Browse, preview, and apply templates
- **Storage**: In-memory template registry (TemplateEngine)
- **Status**: Working
- **Matcher Relevance**: LOW
- **Regression Required**: No

## Master Profile (#/master-profile)
- **Entry**: Top nav "Profile" link
- **Purpose**: Central career profile with all experience data
- **Storage**: `masterProfile` store
- **Status**: Working
- **Matcher Relevance**: LOW
- **Regression Required**: No

## Application Tracker (#/applications)
- **Entry**: Top nav "Applications" link
- **Purpose**: Track job applications (company, role, status, dates)
- **Storage**: `applications` store
- **Status**: Working
- **Matcher Relevance**: MEDIUM — could link analyses to applications in future
- **Regression Required**: No

## Settings (#/settings)
- **Entry**: Top nav "Settings" link
- **Purpose**: App preferences, theme, data management
- **Storage**: localStorage
- **Status**: Working
- **Matcher Relevance**: LOW
- **Regression Required**: No

## Import (#/import)
- **Entry**: Dashboard "Import" button, event-driven
- **Purpose**: Import JSON documents
- **Storage**: `documents` store
- **Status**: Working
- **Matcher Relevance**: LOW
- **Regression Required**: No

## Export All
- **Entry**: Dashboard "Export All" button
- **Purpose**: Full database backup as JSON
- **Storage**: Reads all stores
- **Status**: Working
- **Matcher Relevance**: MEDIUM — backup should include matcher data
- **Regression Required**: Yes (must include new stores)

## Experience Calculator
- **Entry**: Header "Exp Calculator" button (overlay)
- **Purpose**: Calculate total professional experience
- **Storage**: None (ephemeral)
- **Status**: Working — DO NOT MODIFY
- **Matcher Relevance**: NONE
- **Regression Required**: Yes (must not break)

## Onboarding Wizard
- **Entry**: First visit (no `onboardingComplete` in localStorage)
- **Purpose**: Guided first document creation
- **Status**: Working
- **Matcher Relevance**: NONE
- **Regression Required**: No

## New Document Dialog
- **Entry**: Header "+ New" button
- **Purpose**: Create document with name and type selection
- **Document Types**: Resume, CV, Academic CV, Cover Letter, Reference Sheet, LinkedIn Draft
- **Status**: Working
- **Matcher Relevance**: LOW
- **Regression Required**: No
