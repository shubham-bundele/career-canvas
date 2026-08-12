# Feature Inventory

> CareerCanvas Application Guide | Generated: 2026-08-12

---

## Table of Contents

1. [Core Platform Features](#1-core-platform-features)
2. [Document Types](#2-document-types)
3. [Document Operations](#3-document-operations)
4. [Import Formats](#4-import-formats)
5. [Export Formats](#5-export-formats)
6. [Career Tools](#6-career-tools)
7. [Studios](#7-studios)
8. [Templates](#8-templates)
9. [Editor Features](#9-editor-features)
10. [Design Panel](#10-design-panel)
11. [App Themes and Typography](#11-app-themes-and-typography)
12. [Authentication](#12-authentication)
13. [Storage Architecture](#13-storage-architecture)
14. [Summary Counts](#14-summary-counts)

---

## 1. Core Platform Features

CareerCanvas provides six core platform features, each accessible via its own route.

### 1.1 Dashboard

| Property        | Detail                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Route**       | `/dashboard`                                                                                    |
| **Status**      | WORKING WITH LIMITATIONS (runtime verification pending)                                         |
| **Description** | Central hub for document management and quick access to all application features.               |

**Capabilities:**

| Capability       | Detail                                                        |
|------------------|---------------------------------------------------------------|
| Document List    | Displays all user documents with metadata                     |
| Quick Actions    | New Resume, New CV, New Cover Letter, Import, Export All       |
| Sort Modes       | 5 sort modes available                                        |
| Filter Types     | 6 filter types available                                      |
| Search           | Text-based document search                                    |
| Pin              | Pin documents for quick access                                |
| Grid View        | Toggle grid view for document display                         |
| Storage Info     | Displays current storage usage information                    |

---

### 1.2 Resume/CV Editor

| Property        | Detail                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Route**       | `/editor/:id`                                                                                   |
| **Status**      | WORKING WITH LIMITATIONS                                                                        |
| **Description** | Full-featured document editor with three-panel layout for building resumes and CVs.             |

**Capabilities:**

| Capability          | Detail                                                    |
|---------------------|-----------------------------------------------------------|
| Layout              | 3-panel layout (sidebar, editor, preview)                 |
| Section Management  | Add, remove, reorder sections                             |
| Entry CRUD          | Create, read, update, delete entries within sections      |
| Undo                | Up to 50 history states maximum                           |
| Redo                | Full redo support                                         |
| Autosave            | Automatic save with 1-second delay                        |
| Preview             | Live preview with 300ms update delay                      |
| Rich Text Popup     | Inline rich text formatting popup                         |
| Floating Toolbar    | Context-sensitive floating toolbar                        |

**Keyboard Shortcuts:**

| Shortcut         | Action                  |
|------------------|-------------------------|
| `Ctrl+S`         | Save                    |
| `Ctrl+Z`         | Undo                    |
| `Ctrl+Y`         | Redo                    |
| `Ctrl+P`         | Print                   |
| `Ctrl+Shift+A`   | Select All              |

---

### 1.3 Template Gallery

| Property        | Detail                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Route**       | `/templates`                                                                                    |
| **Status**      | WORKING WITH LIMITATIONS                                                                        |
| **Description** | Browse and apply from 68 templates across 9 categories.                                         |

**Capabilities:**

| Capability          | Detail                                                    |
|---------------------|-----------------------------------------------------------|
| Template Count      | 68 templates                                              |
| Categories          | 9 categories                                              |
| Search              | Text-based template search                                |
| Filter Sidebar      | Filter templates by category                              |
| Preview Modal       | Full preview of any template in a modal                   |
| Comparison           | Compare up to 2 templates side by side                    |
| Favorites           | Mark templates as favorites                               |
| Apply               | Apply a template to the current document                  |

---

### 1.4 Master Profile

| Property        | Detail                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Route**       | `/master-profile`                                                                               |
| **Status**      | WORKING WITH LIMITATIONS                                                                        |
| **Description** | Unified professional profile that serves as a central data source for all documents.            |

---

### 1.5 Application Tracker

| Property        | Detail                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Route**       | `/applications`                                                                                 |
| **Status**      | WORKING WITH LIMITATIONS                                                                        |
| **Description** | Track job applications through an 8-status pipeline.                                            |

**Capabilities:**

| Capability              | Detail                                                |
|-------------------------|-------------------------------------------------------|
| CRUD                    | Full create, read, update, delete for applications    |
| Status Pipeline         | 8 application statuses                                |
| Search                  | Text-based application search                         |
| Filter                  | Filter by status and other criteria                   |
| Job Description Mgmt    | Store and manage job descriptions                     |

---

### 1.6 Settings

| Property        | Detail                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Route**       | `/settings`                                                                                     |
| **Status**      | WORKING WITH LIMITATIONS                                                                        |
| **Description** | Application-wide configuration and preferences.                                                 |

**Settings Groups:**

| Group           | Options                                                                   |
|-----------------|---------------------------------------------------------------------------|
| Appearance      | Theme, page size, zoom                                                    |
| Editor          | Autosave, character counts, tips, spellcheck                             |
| Data            | Export/import backup, clear archived, clear all                           |
| Privacy         | Privacy information display                                               |
| Accessibility   | Reduce motion, high contrast, font size                                   |
| Keyboard        | Keyboard shortcuts reference                                              |

---

### Core Platform Summary

| #  | Feature             | Route              | Status                    |
|----|---------------------|--------------------:|---------------------------|
| 1  | Dashboard           | `/dashboard`       | WORKING WITH LIMITATIONS  |
| 2  | Resume/CV Editor    | `/editor/:id`      | WORKING WITH LIMITATIONS  |
| 3  | Template Gallery    | `/templates`       | WORKING WITH LIMITATIONS  |
| 4  | Master Profile      | `/master-profile`  | WORKING WITH LIMITATIONS  |
| 5  | Application Tracker | `/applications`    | WORKING WITH LIMITATIONS  |
| 6  | Settings            | `/settings`        | WORKING WITH LIMITATIONS  |

---

## 2. Document Types

CareerCanvas supports six document types.

| #  | Document Type    | Description                                          |
|----|------------------|------------------------------------------------------|
| 1  | Resume           | Standard resume document                             |
| 2  | CV               | Curriculum vitae document                            |
| 3  | Cover Letter     | Cover letter for job applications                    |
| 4  | Reference Sheet  | Professional references document                     |
| 5  | LinkedIn Draft   | Draft content for LinkedIn profiles                  |
| 6  | Academic CV      | Academic-focused curriculum vitae                    |

**Total: 6 document types**

---

## 3. Document Operations

Ten operations are available for managing documents.

| #  | Operation        | Description                                          |
|----|------------------|------------------------------------------------------|
| 1  | Create           | Create a new document of any supported type          |
| 2  | Open             | Open an existing document in the editor              |
| 3  | Rename           | Change the title of an existing document             |
| 4  | Duplicate        | Create a copy of an existing document                |
| 5  | Archive          | Move a document to the archived state                |
| 6  | Unarchive        | Restore an archived document to active state         |
| 7  | Delete           | Permanently remove a document                        |
| 8  | Export           | Export a document in a supported format               |
| 9  | Print            | Send a document to the print dialog                  |
| 10 | Backup/Restore   | Full backup and restore of all application data      |

**Total: 10 document operations**

---

## 4. Import Formats

Five import formats are supported for bringing external content into CareerCanvas.

| #  | Format       | Implementation Details                                          | Status    |
|----|--------------|----------------------------------------------------------------|-----------|
| 1  | JSON         | Native CareerCanvas format                                      | Supported |
| 2  | DOCX         | Parsed via Mammoth.js CDN                                       | Supported |
| 3  | PDF          | Parsed via PDF.js CDN with optional Tesseract OCR               | Supported |
| 4  | Plain Text   | Raw text import with basic structure detection                  | Supported |
| 5  | Full Backup  | Complete application data restore from backup file              | Supported |

**Total: 5 import formats**

**External Dependencies for Import:**

| Dependency     | Usage           | Delivery   |
|----------------|-----------------|------------|
| Mammoth.js     | DOCX parsing    | CDN        |
| PDF.js         | PDF parsing     | CDN        |
| Tesseract OCR  | PDF OCR         | Optional   |

---

## 5. Export Formats

Seven export formats are supported. Note: DOCX export is **not** available.

| #  | Format           | Implementation Details                                      | Status    |
|----|------------------|-------------------------------------------------------------|-----------|
| 1  | JSON             | Native CareerCanvas format                                   | Supported |
| 2  | Plain Text       | Stripped text output                                         | Supported |
| 3  | Markdown         | Markdown-formatted output                                    | Supported |
| 4  | HTML             | Full HTML document output                                    | Supported |
| 5  | PDF              | Generated via browser print dialog                           | Supported |
| 6  | Full Backup      | Complete application data backup                             | Supported |
| 7  | Selective Backup | Partial application data backup with user selection          | Supported |

**Total: 7 export formats**

> **Important:** There is NO DOCX export capability. PDF export is achieved through the
> browser's native print dialog, not through a direct PDF generation library.

---

## 6. Career Tools

Five career-focused tools provide analysis, scoring, and tracking capabilities.

### 6.1 Job Matcher

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/job-matcher`                                            |
| **Lines of Code**  | 1496                                                      |
| **Storage**        | IndexedDB: `matchAnalyses`, `jobDescriptions`             |
| **External Deps**  | None                                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Matches resume content against job descriptions.          |

---

### 6.2 Skills Matrix

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/skills-matrix`                                          |
| **Files**          | 3 files                                                   |
| **Lines of Code**  | 2197                                                      |
| **Storage**        | IndexedDB: `skillsMatrices`                               |
| **External Deps**  | None                                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Visual skills matrix for tracking and displaying skills.  |

---

### 6.3 ATS Checker

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | None (inline in editor)                                   |
| **Lines of Code**  | 881                                                       |
| **Storage**        | Stateless                                                 |
| **External Deps**  | None                                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Checks resume ATS compatibility inline within the editor. |

---

### 6.4 Experience Calculator

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | None (modal overlay)                                      |
| **Lines of Code**  | 563                                                       |
| **Storage**        | In-memory only                                            |
| **External Deps**  | None                                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Calculates total experience from employment history.      |

---

### 6.5 Application Tracker

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/applications`                                           |
| **Lines of Code**  | 472                                                       |
| **Storage**        | IndexedDB: `applications`, `jobDescriptions`              |
| **External Deps**  | None                                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Tracks job applications through an 8-status pipeline.     |

---

### Career Tools Summary

| #  | Tool                  | Route            | Lines | Storage          | Status   |
|----|-----------------------|------------------|------:|------------------|----------|
| 1  | Job Matcher           | `/job-matcher`   | 1496  | IDB              | COMPLETE |
| 2  | Skills Matrix         | `/skills-matrix` | 2197  | IDB              | COMPLETE |
| 3  | ATS Checker           | Inline (editor)  |  881  | Stateless        | COMPLETE |
| 4  | Experience Calculator | Modal overlay    |  563  | In-memory        | COMPLETE |
| 5  | Application Tracker   | `/applications`  |  472  | IDB              | COMPLETE |

**Total: 5 career tools | All COMPLETE**

---

## 7. Studios

Sixteen studio modules provide specialized functionality for document management,
analysis, and enhancement.

### 7.1 PDF Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/pdf-studio`                                             |
| **Lines of Code**  | 477                                                       |
| **External Deps**  | PDF.js CDN                                                |
| **Status**         | COMPLETE (Stage 1: viewing only)                          |
| **Description**    | PDF viewing capability.                                   |

---

### 7.2 Section Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/section-studio`                                         |
| **Lines of Code**  | 484                                                       |
| **Storage**        | IndexedDB: `customSections`                               |
| **Status**         | COMPLETE                                                  |
| **Description**    | Create and manage custom resume sections.                 |

---

### 7.3 Theme Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/theme-studio`                                           |
| **Lines of Code**  | 527                                                       |
| **Storage**        | ThemeEngine localStorage                                  |
| **Status**         | COMPLETE                                                  |
| **Description**    | Create and customize application themes.                  |

---

### 7.4 Data Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/data-backup`                                            |
| **Lines of Code**  | 1015                                                      |
| **Storage**        | All IndexedDB stores                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Comprehensive data management and backup interface.       |

---

### 7.5 Consistency Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/consistency`                                            |
| **Lines of Code**  | 1472                                                      |
| **Storage**        | IndexedDB: `documents`                                    |
| **Status**         | COMPLETE                                                  |
| **Description**    | Checks document consistency across formatting and style.  |

---

### 7.6 Timeline Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/timeline`                                               |
| **Lines of Code**  | 1643                                                      |
| **Storage**        | localStorage: `cc_timeline_events`                        |
| **Status**         | COMPLETE                                                  |
| **Description**    | Visual timeline of career events and milestones.          |

---

### 7.7 Privacy Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/privacy-check`                                          |
| **Lines of Code**  | 850                                                       |
| **Storage**        | IndexedDB: `documents`                                    |
| **Status**         | COMPLETE                                                  |
| **Description**    | Scans documents for privacy-sensitive information.        |

---

### 7.8 Version Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/versions`                                               |
| **Lines of Code**  | 1109                                                      |
| **Storage**        | IndexedDB: `snapshots`                                    |
| **Status**         | COMPLETE                                                  |
| **Description**    | Document version history and snapshot management.         |

---

### 7.9 Package Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/packages`                                               |
| **Lines of Code**  | 1224                                                      |
| **Storage**        | localStorage: `cc_packages`                               |
| **Status**         | COMPLETE                                                  |
| **Description**    | Bundle multiple documents into application packages.      |

---

### 7.10 Portfolio Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/portfolio`                                              |
| **Lines of Code**  | 681                                                       |
| **Storage**        | localStorage: `cc_portfolio_config`                       |
| **Status**         | COMPLETE                                                  |
| **Description**    | Portfolio configuration and management.                   |

---

### 7.11 Link/QR Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/links-qr`                                               |
| **Lines of Code**  | 631                                                       |
| **Storage**        | localStorage: `cc_links`                                  |
| **Status**         | PARTIALLY COMPLETE                                        |
| **Description**    | Link management and QR code generation.                   |

> **Limitation:** QR code generation is a placeholder and does not produce scannable
> QR codes.

---

### 7.12 Localization Studio

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/localization`                                           |
| **Lines of Code**  | 199                                                       |
| **Storage**        | localStorage: `cc_localization`                           |
| **Status**         | PARTIALLY IMPLEMENTED                                     |
| **Description**    | Localization and internationalization support.             |

> **Limitation:** Minimal UI with limited functionality.

---

### 7.13 Space Optimizer

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/optimizer`                                              |
| **Lines of Code**  | 840                                                       |
| **Storage**        | IndexedDB: `documents`                                    |
| **Status**         | COMPLETE                                                  |
| **Description**    | Optimizes document layout for space efficiency.           |

---

### 7.14 Stress Lab

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/stress-lab`                                             |
| **Lines of Code**  | 752                                                       |
| **Storage**        | None                                                      |
| **Status**         | COMPLETE                                                  |
| **Description**    | Development tool for stress testing the application.      |

> **Note:** This is a dev tool on a hidden route. Not intended for end users.

---

### 7.15 A11y Inspector

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | `/a11y-inspector`                                         |
| **Lines of Code**  | 1205                                                      |
| **Storage**        | IndexedDB: `documents`                                    |
| **Status**         | COMPLETE                                                  |
| **Description**    | Accessibility audit and inspection tool for documents.    |

---

### 7.16 AI Formatter

| Property           | Detail                                                    |
|--------------------|-----------------------------------------------------------|
| **Route**          | None (service)                                            |
| **Lines of Code**  | 268                                                       |
| **Storage**        | localStorage: `cc_ai_api_key`                             |
| **External Deps**  | Groq API                                                  |
| **Status**         | REQUIRES EXTERNAL CONFIGURATION                           |
| **Description**    | AI-powered document formatting via Groq API.              |

> **Requirement:** Requires a Groq API key configured in localStorage.

---

### Studios Summary

| #   | Studio              | Route             | Lines  | Storage                     | Status                           |
|-----|---------------------|--------------------|-------:|-----------------------------|----------------------------------|
| 1   | PDF Studio          | `/pdf-studio`      |    477 | --                          | COMPLETE (Stage 1: viewing only) |
| 2   | Section Studio      | `/section-studio`  |    484 | IDB: customSections         | COMPLETE                         |
| 3   | Theme Studio        | `/theme-studio`    |    527 | LS: ThemeEngine             | COMPLETE                         |
| 4   | Data Studio         | `/data-backup`     |  1,015 | All IDB stores              | COMPLETE                         |
| 5   | Consistency Studio  | `/consistency`     |  1,472 | IDB: documents              | COMPLETE                         |
| 6   | Timeline Studio     | `/timeline`        |  1,643 | LS: cc_timeline_events      | COMPLETE                         |
| 7   | Privacy Studio      | `/privacy-check`   |    850 | IDB: documents              | COMPLETE                         |
| 8   | Version Studio      | `/versions`        |  1,109 | IDB: snapshots              | COMPLETE                         |
| 9   | Package Studio      | `/packages`        |  1,224 | LS: cc_packages             | COMPLETE                         |
| 10  | Portfolio Studio    | `/portfolio`       |    681 | LS: cc_portfolio_config     | COMPLETE                         |
| 11  | Link/QR Studio     | `/links-qr`        |    631 | LS: cc_links                | PARTIALLY COMPLETE               |
| 12  | Localization Studio | `/localization`    |    199 | LS: cc_localization         | PARTIALLY IMPLEMENTED            |
| 13  | Space Optimizer     | `/optimizer`       |    840 | IDB: documents              | COMPLETE                         |
| 14  | Stress Lab          | `/stress-lab`      |    752 | None                        | COMPLETE                         |
| 15  | A11y Inspector      | `/a11y-inspector`  |  1,205 | IDB: documents              | COMPLETE                         |
| 16  | AI Formatter        | None (service)     |    268 | LS: cc_ai_api_key           | REQUIRES EXTERNAL CONFIGURATION  |

**Total: 16 studios | 12 COMPLETE | 1 COMPLETE (Stage 1) | 1 PARTIALLY COMPLETE |
1 PARTIALLY IMPLEMENTED | 1 REQUIRES EXTERNAL CONFIGURATION**

**Total Studio Lines of Code: 13,377**

---

## 8. Templates

### 8.1 Template Categories

CareerCanvas ships with 68 templates organized across 9 categories.

| #  | Category       | Template Count |
|----|----------------|---------------:|
| 1  | ATS            |             10 |
| 2  | Professional   |             10 |
| 3  | Technical      |              5 |
| 4  | Creative       |              5 |
| 5  | Executive      |              8 |
| 6  | Academic       |              8 |
| 7  | Student        |              8 |
| 8  | Cover Letter   |              8 |
| 9  | References     |              6 |
|    | **Total**      |         **68** |

### 8.2 Template Distribution

```
ATS            |||||||||| 10
Professional   |||||||||| 10
Technical      |||||       5
Creative       |||||       5
Executive      ||||||||    8
Academic       ||||||||    8
Student        ||||||||    8
Cover Letter   ||||||||    8
References     ||||||      6
```

---

## 9. Editor Features

### 9.1 Undo/Redo System

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Max History       | 50 states                                                 |
| Debounce          | 500ms                                                     |
| Undo Shortcut     | `Ctrl+Z`                                                  |
| Redo Shortcut     | `Ctrl+Y`                                                  |

### 9.2 Autosave

| Parameter             | Value                                                 |
|-----------------------|-------------------------------------------------------|
| Delay                 | 1000ms (1 second)                                     |
| Retry Count           | 3 retries                                             |
| Retry Strategy        | Exponential backoff                                   |

### 9.3 Preview

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Update Delay      | 300ms                                                     |

### 9.4 Photo Support

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Accepted Formats  | JPEG, PNG, WebP                                           |
| Max File Size     | 2MB                                                       |
| Shape Options     | Circle, Rounded, Square                                   |
| Size Range        | 50px - 180px                                              |

### 9.5 Page Sizes

| #  | Page Size |
|----|-----------|
| 1  | A4        |
| 2  | Letter    |
| 3  | Legal     |
| 4  | A5        |

### 9.6 Section Types

The editor supports 11 section types for building document content.

| #   | Section Type    |
|-----|-----------------|
| 1   | Summary         |
| 2   | Objective       |
| 3   | Experience      |
| 4   | Education       |
| 5   | Projects        |
| 6   | Skills          |
| 7   | Certifications  |
| 8   | Languages       |
| 9   | Publications    |
| 10  | Awards          |
| 11  | Volunteer       |

### 9.7 Smart Formatter

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Scoring           | 100-point scoring system                                  |
| Auto-Fix          | Automatic fix capability                                  |

---

## 10. Design Panel

The Design Panel provides 8 control groups for document styling within the editor.

| #  | Control Group  | Purpose                                              |
|----|----------------|------------------------------------------------------|
| 1  | Page Setup     | Page size, margins, orientation                      |
| 2  | Typography     | Font family, size, line height                       |
| 3  | Colors         | Color scheme and accent colors                       |
| 4  | Section Style  | Section heading and divider styles                   |
| 5  | Layout         | Column layout and arrangement                        |
| 6  | Photo          | Photo shape, size, position                          |
| 7  | Spacing        | Margins, padding, gaps                               |
| 8  | Advanced       | Advanced formatting options                          |

### 10.1 Font Manager

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Total Fonts       | 37                                                        |
| Categories        | 3                                                         |

---

## 11. App Themes and Typography

### 11.1 Application Themes

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Built-in Themes   | 11                                                        |
| System Theme      | 1 (follows OS preference)                                 |
| **Total Themes**  | **12**                                                    |

### 11.2 Typography Presets

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Total Presets     | 7                                                         |

---

## 12. Authentication

Authentication is optional and requires external Supabase configuration.

### 12.1 Auth Provider

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Provider          | Supabase                                                  |
| Status            | REQUIRES EXTERNAL CONFIGURATION                           |

### 12.2 Auth Methods

| #  | Method          | Description                                          |
|----|-----------------|------------------------------------------------------|
| 1  | Email/Password  | Traditional email and password authentication        |
| 2  | Magic Link      | Passwordless authentication via email link           |
| 3  | Google OAuth    | Sign in with Google account                          |

### 12.3 Auth States

The authentication system manages 8 distinct states.

| #  | State            | Description                                         |
|----|------------------|-----------------------------------------------------|
| 1  | INITIALIZING     | Auth system is starting up                          |
| 2  | AUTHENTICATED    | User is signed in                                   |
| 3  | UNAUTHENTICATED  | User is not signed in                               |
| 4  | GUEST            | User is operating in guest mode                     |
| 5  | EXPIRED          | User session has expired                            |
| 6  | CONFIG_ERROR     | Supabase configuration error                        |
| 7  | PROVIDER_ERROR   | Authentication provider error                       |
| 8  | OFFLINE          | No network connectivity                             |

---

## 13. Storage Architecture

### 13.1 IndexedDB

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Database Name     | `careercanvas-db`                                         |
| Version           | 4                                                         |
| Object Stores     | 11                                                        |

### 13.2 localStorage

| Parameter         | Value                                                     |
|-------------------|-----------------------------------------------------------|
| Approximate Keys  | ~30                                                       |

---

## 14. Summary Counts

### 14.1 Feature Category Totals

| Category             | Count  | Status Summary                                         |
|----------------------|-------:|--------------------------------------------------------|
| Core Platform        |      6 | All WORKING WITH LIMITATIONS                           |
| Document Types       |      6 | All supported                                          |
| Document Operations  |     10 | All available                                          |
| Import Formats       |      5 | All supported                                          |
| Export Formats       |      7 | All supported (no DOCX export)                         |
| Career Tools         |      5 | All COMPLETE                                           |
| Studios              |     16 | 12 COMPLETE, 1 Stage 1, 1 Partial, 1 Minimal, 1 Ext.  |
| Templates            |     68 | Across 9 categories                                    |
| App Themes           |     12 | 11 built-in + 1 System                                 |
| Typography Presets   |      7 | All available                                          |
| Section Types        |     11 | All available in editor                                |
| Design Panel Groups  |      8 | All available in editor                                |
| Fonts                |     37 | Across 3 categories                                    |
| Page Sizes           |      4 | A4, Letter, Legal, A5                                  |
| Auth Methods         |      3 | Requires external configuration                        |
| Auth States          |      8 | All handled                                            |
| IDB Object Stores   |     11 | In careercanvas-db v4                                  |
| localStorage Keys   |    ~30 | Approximate                                            |

### 14.2 Overall Status Distribution

| Status                            | Feature Count |
|-----------------------------------|:-------------:|
| COMPLETE                          |     17        |
| COMPLETE (Stage 1)                |      1        |
| WORKING WITH LIMITATIONS          |      6        |
| PARTIALLY COMPLETE                |      1        |
| PARTIALLY IMPLEMENTED             |      1        |
| REQUIRES EXTERNAL CONFIGURATION   |      2        |
| **Total Tracked Features**        |   **28**      |

### 14.3 Codebase Metrics (Studios + Career Tools Only)

| Metric                       | Value          |
|------------------------------|---------------:|
| Studio Lines of Code         |        13,377  |
| Career Tool Lines of Code    |         5,609  |
| **Combined Lines of Code**   |    **18,986**  |

### 14.4 Route Count

| Route Type        | Count  |
|-------------------|-------:|
| Core Platform     |      6 |
| Career Tools      |      3 |
| Studios           |     15 |
| No Route (Inline) |      3 |
| **Total Routes**  | **24** |

---

> **Document generated from verified feature data only.**
> No inferred or speculative features have been included.
>
> CareerCanvas Application Guide | 02-FEATURE-INVENTORY.md
