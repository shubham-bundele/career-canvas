# CareerCanvas — Local Setup Guide

Run CareerCanvas on any computer in under 2 minutes. No frameworks, no build tools, no accounts needed.

---

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| **Node.js** | 16 or later | `node --version` |
| **npm** | Comes with Node.js | `npm --version` |
| **Git** | Any recent version | `git --version` |
| **Browser** | Chrome, Edge, Firefox, or Safari | — |

### Install Node.js (if not installed)

- **Windows:** Download from https://nodejs.org (LTS version) and run the installer
- **Mac:** `brew install node` or download from https://nodejs.org
- **Linux:** `sudo apt install nodejs npm` (Ubuntu/Debian) or `sudo dnf install nodejs npm` (Fedora)

---

## Quick Start

### Step 1: Get the Code

**Option A — Clone from GitHub:**
```bash
git clone https://github.com/YOUR_USERNAME/career-canvas.git
cd career-canvas
```

**Option B — From a ZIP file:**
```
1. Extract the ZIP to any folder
2. Open a terminal/command prompt in that folder
```

### Step 2: Start the Server

```bash
npm start
```

This runs `npx http-server . -p 8080 --cors -c-1 -o` which:
- Starts a local HTTP server on port 8080
- Disables caching (`-c-1`) so changes appear immediately
- Opens your default browser automatically (`-o`)

### Step 3: Open the App

If the browser didn't open automatically:
```
http://localhost:8080
```

That's it. The app is running.

---

## Alternative Start Commands

| Command | Port | Auto-open | Use Case |
|---------|------|-----------|----------|
| `npm start` | 8080 | Yes | Default development |
| `npm run serve` | 8080 | No | Headless / CI |
| `npx http-server . -p 8082 --cors -c-1` | 8082 | No | Custom port |
| `npx http-server . -p 3000 --cors -c-1 -o` | 3000 | Yes | Custom port + auto-open |
| `python -m http.server 8080` | 8080 | No | If you have Python, no Node needed |

---

## Project Structure

```
career-canvas/
├── index.html              ← App entry point
├── package.json            ← npm scripts (start, serve)
├── sw.js                   ← Service Worker for offline support
├── 404.html                ← Fallback page
├── DEPLOY.md               ← Deployment & hosting guide
├── SETUP.md                ← This file
├── src/
│   ├── css/                ← 20+ stylesheet files
│   │   ├── variables.css   ← Design tokens (colors, spacing, fonts)
│   │   ├── reset.css       ← CSS reset
│   │   ├── base.css        ← Base element styles
│   │   ├── layout.css      ← App shell, nav, header
│   │   ├── components.css  ← Button system, forms, modals
│   │   ├── dashboard.css   ← Dashboard page
│   │   ├── editor.css      ← Resume editor (3-panel)
│   │   ├── templates.css   ← Template Studio gallery
│   │   ├── onboarding.css  ← Welcome wizard
│   │   ├── print.css       ← Print/PDF styles
│   │   └── ...             ← Tool-specific styles
│   └── js/
│       ├── app.js          ← App initialization + routing
│       ├── core/           ← Framework layer
│       │   ├── db.js       ← IndexedDB wrapper
│       │   ├── router.js   ← Hash-based SPA router
│       │   ├── events.js   ← Event bus (pub/sub)
│       │   ├── schema.js   ← Document schema + migrations
│       │   ├── state.js    ← State manager
│       │   └── template-engine.js ← Template registry
│       ├── modules/        ← Feature modules
│       │   ├── editor.js   ← Resume editor (main module, ~3700 lines)
│       │   ├── dashboard.js
│       │   ├── template-gallery.js ← Template Studio
│       │   ├── onboarding.js
│       │   ├── job-matcher.js
│       │   ├── skills-matrix.js
│       │   ├── experience-calculator.js
│       │   ├── import-manager.js
│       │   ├── export-manager.js
│       │   └── ...         ← 20+ modules
│       ├── templates/      ← 68 resume/CV/cover letter templates
│       │   ├── index.js
│       │   ├── ats-templates.js
│       │   ├── professional-templates.js
│       │   ├── technical-templates.js
│       │   ├── creative-templates.js
│       │   ├── cover-letter-templates.js
│       │   └── reference-templates.js
│       ├── data/           ← Static data (autocomplete, presets)
│       └── utils/          ← Utilities (sanitize, format, id)
├── tests/                  ← Browser-based test files
└── docs/                   ← Development documentation
```

---

## How It Works

- **No build step** — ES modules load directly in the browser
- **No framework** — vanilla JavaScript, no React/Vue/Angular
- **No backend** — everything runs in the browser
- **IndexedDB** — documents stored locally in the browser database
- **localStorage** — preferences and settings
- **Service Worker** — offline support and caching

---

## Common Tasks

### Clear the Service Worker Cache

If you see stale files after making changes:

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. Click **Unregister** next to `sw.js`
5. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)

Or in the browser console:
```js
navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister()));
```

### Access Your Data

All data is in the browser. To back it up:

1. Open the app
2. Dashboard → **Export All** (top-right card)
3. Saves a JSON file with all your documents

To restore on another computer:
1. Dashboard → **Import**
2. Select the backup JSON file

### Run Tests

Open any test file directly in the browser:
```
http://localhost:8080/tests/template-studio.test.html
```

### Change the Port

Edit `package.json`:
```json
"start": "npx http-server . -p YOUR_PORT --cors -c-1 -o"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm start` fails | Run `npm install` first, or try `npx http-server . -p 8080 --cors -c-1` directly |
| Port already in use | Change to another port: `npx http-server . -p 3000 --cors -c-1` |
| Blank page | Open DevTools (F12) → Console, check for errors. Try hard refresh (Ctrl+Shift+R) |
| Old files showing | Clear Service Worker (see above) and hard refresh |
| `npx` not found | Update Node.js to version 16+ |
| CORS errors | Make sure you're using `http-server` with `--cors` flag, not opening index.html directly |
| Files won't load via `file://` | You must use a local HTTP server — browsers block ES module imports from `file://` |

---

## Next Steps

- **Deploy to the web:** See [DEPLOY.md](DEPLOY.md) for Vercel, GitHub Pages, Netlify, etc.
- **Share as ZIP:** Zip the folder and share — recipient follows this guide
- **Add to LinkedIn:** See DEPLOY.md for LinkedIn project/portfolio instructions
