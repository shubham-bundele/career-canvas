# CareerCanvas — Project Audit for Authentication Module

## Architecture
- Pure static vanilla JS application, ES modules
- No build system, no bundler, no framework
- Hash-based SPA router (src/js/core/router.js)
- Served via http-server on port 8080/8082

## Entry Points
- index.html → src/js/app.js (single entry)
- 404.html (static fallback)

## Routes (24 registered)
/dashboard, /editor/:id, /templates, /master-profile, /applications, /settings,
/job-matcher, /skills-matrix, /theme-studio, /section-studio, /pdf-studio,
/packages, /timeline, /consistency, /privacy-check, /localization, /portfolio,
/links-qr, /optimizer, /a11y-inspector, /versions, /data-backup, /stress-lab, /import

Default: /dashboard

## Database
- IndexedDB: careercanvas-db, version 4
- 11 object stores: documents, masterProfile, jobDescriptions, applications, contentLibrary, snapshots, images, designPresets, matchAnalyses, skillsMatrices, customSections

## localStorage Keys
- cc_app_theme, cc_custom_themes (ThemeEngine)
- onboardingComplete, cc_continueOnSelection
- cc_default_pagesize, cc_default_zoom, cc_autosave, cc_charcounts, cc_tips, cc_spellcheck
- cc_reduce_motion, cc_high_contrast, cc_ui_fontsize
- cc_packages, cc_portfolio_config
- userSettings

## Theme System
- ThemeEngine (src/js/core/theme-engine.js)
- 11 built-in themes + custom theme support
- Flash-prevention IIFE at module load
- Default: midnight-professional (dark)

## Service Worker
- sw.js, CACHE_NAME: careercanvas-v6
- Caches static assets (HTML, CSS, core JS)
- index.html currently unregisters SWs on load (cleanup mode)

## Dependencies
- playwright, playwright-core (in node_modules)
- No runtime dependencies (pure vanilla JS)

## Deployment
- No vercel.json
- No .env files
- No api/ directory
- No build step
- Currently served as pure static files

## Existing Auth/Account
- None. No user accounts, no auth system, no cloud services.
- Profile page exists (master-profile) but is local-only career data.

## Tests
- 27 test HTML files in tests/
- Browser-based tests loaded via http-server
- Playwright available for automation
