# CareerCanvas — Deployment & Sharing Guide

Static vanilla JS app — no build step needed. Deploy anywhere that serves static files.

> **Running locally first?** See [SETUP.md](SETUP.md) for local development instructions.

---

## What Works at Each Level

| Configuration | What You Get |
|--------------|-------------|
| **No env vars** | Everything except AI and auth. Full resume builder: 68+ templates, WYSIWYG editor, PDF/JSON/Markdown/HTML export, job matcher, skills matrix, experience calculator, application tracker, dark mode, offline support. 100% functional. |
| **GROQ_API_KEY only** | All of the above **plus** 18 AI features: AI Analyze, AI Summary, AI Section Writer, AI Bullet Improver, ATS AI Fix, AI Cover Letter, AI Keyword Extractor, Smart Format, and more. No auth needed. Free via Gemini. |
| **GROQ_API_KEY + Supabase** | All of the above **plus** user accounts, sign-in (email/password, magic link, Google OAuth), account deletion, and cloud-sync readiness (future). |

### API Routes (Vercel Serverless Functions)

The app includes 3 serverless functions in `/api/`:

| Route | Purpose | Requires |
|-------|---------|----------|
| `api/ai-analyze.js` | AI proxy — sends resume content to Gemini LLM, returns suggestions | `GROQ_API_KEY` |
| `api/public-config.js` | Returns auth configuration (Supabase URL, enabled providers) to the browser | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `api/delete-account.js` | Server-side account deletion (uses privileged key) | `SUPABASE_SERVICE_ROLE_KEY` |

These only run on Vercel (or compatible platforms with serverless function support). On GitHub Pages or static hosts, the app works without them — AI and auth features simply won't be available.

### All Environment Variables

| Variable | Required? | Purpose | Where to get it |
|----------|-----------|---------|----------------|
| `GROQ_API_KEY` | For AI features | Authenticates with Gemini LLM API | Free at [console.gemini.com](https://console.gemini.com) |
| `SUPABASE_URL` | For auth only | Supabase project URL | Supabase dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | For auth only | Public browser key for Supabase | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | For account deletion only | Privileged server-side key (**never expose in browser**) | Supabase dashboard → Settings → API |
| `PUBLIC_SITE_URL` | For auth redirects | Your deployed app URL | Your Vercel URL |
| `AUTH_MAGIC_LINK_ENABLED` | Optional toggle | Enable passwordless magic link login | Set to `true` or `false` |
| `AUTH_GOOGLE_ENABLED` | Optional toggle | Enable Google OAuth login | Set to `true` or `false` |

---

## Pre-Deploy Checklist

Before deploying, verify everything works:

```bash
# 1. Start locally and test
npm start

# 2. Check these pages work:
#    http://localhost:8080/#/dashboard
#    http://localhost:8080/#/templates
#    http://localhost:8080/#/job-matcher
#    http://localhost:8080/#/settings

# 3. Create a test resume, edit it, export to PDF

# 4. Verify no console errors (F12 → Console)
```

---

## Option 1: Deploy on Vercel (Recommended, Free)

### Prerequisites
- A GitHub account (https://github.com)
- A Vercel account (https://vercel.com — sign up with GitHub)

### Steps

**1. Push code to GitHub first** (see "Push to GitHub" section below)

**2. Go to Vercel Dashboard**
- Visit https://vercel.com/dashboard
- Click **"Add New..." > "Project"**

**3. Import your GitHub repo**
- Select your `career-canvas` repository
- Click **"Import"**

**4. Configure the project**
- **Framework Preset:** Select `Other`
- **Root Directory:** Leave as `.` (root)
- **Build Command:** Leave empty (no build needed)
- **Output Directory:** Leave as `.` (root)
- Click **"Deploy"**

**5. Done!** Vercel gives you a URL like `https://career-canvas-xyz.vercel.app`

**Auto-Deploy:** Every push to `main` on GitHub auto-deploys on Vercel.

**Custom Domain (Optional):** Vercel project > Settings > Domains > Add your domain.

### Step 6: Enable AI Features (Free — Gemini)

> **This is the only env var most users need.** It unlocks 18 AI-powered features across the app: AI Analyze, AI Summary, AI Section Writer, AI Bullet Improver, ATS AI Fix, AI Cover Letter, AI Keyword Extractor, Smart Format, and more. All free via Gemini's generous free tier.

AI features require a Gemini API key set as a Vercel environment variable. Users never need to enter any key — it's all server-side.

**6a. Get a free Gemini API key:**
1. Go to https://console.gemini.com (sign up free with Google or GitHub)
2. Click **"API Keys"** in the left sidebar
3. Click **"Create API Key"**
4. Give it a name (e.g., "CareerCanvas")
5. Copy the key (starts with `gsk_...`)

**6b. Add the key to Vercel:**
1. Go to your Vercel project dashboard
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. Add a new variable:
   - **Key:** `GROQ_API_KEY`
   - **Value:** paste your `gsk_...` key
   - **Environments:** check all (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** tab and click **"Redeploy"** on the latest deployment (select "Redeploy with existing Build Cache")

**That's it!** AI features now work for all users automatically — no signup, no keys, no configuration on their end.

**Cost:** Gemini free tier = 30 requests/minute, ~14,400/day. No credit card needed. More than enough for personal/portfolio use.

**How it works:**
```
User clicks AI Analyze → Browser calls /api/ai-analyze on your Vercel
→ Vercel function reads GROQ_API_KEY from env (hidden from users)
→ Calls Gemini API with Llama 3.3 model → Returns suggestions
→ Browser shows results with Apply/Apply All buttons
```

**Without the key:** The app works perfectly — all features except AI-powered ones function normally. The app is a fully functional resume builder without any env vars. AI buttons will show an "AI not configured" message.

**Local development:** When running locally (`npx http-server`), the server proxy won't work (no Vercel). Users can paste their own Gemini key in Smart Format panel for local AI testing.

---

## Option 2: Deploy on GitHub Pages (Free)

> **Note:** GitHub Pages serves static files only — no serverless functions. AI features and authentication will not be available. Use Vercel if you want AI or auth.

### Step 1: Enable GitHub Pages

1. Go to your repo: `https://github.com/YOUR_USERNAME/career-canvas`
2. Click **Settings** tab
3. In left sidebar, click **Pages**
4. Under **Source**, select:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes

### Step 2: Access Your Site

```
https://YOUR_USERNAME.github.io/career-canvas/
```

---

## Push to GitHub (Required for Both Options)

### First Time Setup

Open a terminal/command prompt in the project folder:

```bash
# Navigate to project
cd "c:\resume builder"

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "CareerCanvas - Free Resume Builder"

# Add your GitHub repo as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/career-canvas.git

# Push
git branch -M main
git push -u origin main
```

### Create the GitHub Repo First

1. Go to https://github.com/new
2. **Repository name:** `career-canvas`
3. **Description:** Free, privacy-first resume builder. No sign-up, no server, no paywall.
4. **Visibility:** Public
5. **Do NOT** check "Add a README" (you already have files)
6. Click **"Create repository"**
7. Then run the git commands above

### Pushing Updates

```bash
git add .
git commit -m "Description of changes"
git push
```

Both Vercel and GitHub Pages auto-redeploy within 1-2 minutes.

---

## Option 3: Deploy on Netlify (Free, No GitHub Needed)

### Drag-and-Drop Deploy (Fastest)
1. Go to https://app.netlify.com/drop
2. Drag your project folder onto the page
3. Done — instant URL in seconds

### From GitHub
1. Sign up at https://netlify.com with GitHub
2. Click **"Add new site"** → **"Import an existing project"**
3. Select your GitHub repo
4. **Build command:** leave empty
5. **Publish directory:** `.`
6. Click **"Deploy site"**

---

## Option 4: Share as ZIP (Offline Use)

1. Zip the entire project folder (exclude `node_modules/` and `.local-backup/` if present)
2. Share the ZIP file
3. Recipient extracts and runs:
   ```bash
   cd career-canvas
   npm start
   ```
   Or without npm:
   ```bash
   npx http-server . -p 8080 --cors -c-1 -o
   ```
4. Opens `http://localhost:8080`
5. Full instructions for the recipient: [SETUP.md](SETUP.md)

---

## Add to LinkedIn Profile

### A. Add as a Project

1. Go to your LinkedIn profile
2. Click **"Add profile section"** > **"Recommended"** > **"Add projects"**
3. Fill in:

| Field | Value |
|-------|-------|
| **Project name** | CareerCanvas — Free Resume Builder |
| **Project URL** | Your deployed URL |
| **Start date** | When you started building |
| **Associated with** | Your current position or education |

**Description** (copy-paste):
```
Built a full-featured, privacy-first resume builder that runs entirely in the browser.
No server, no sign-up, no data uploads — everything stays on the user's device.

Key Features:
- 68+ professionally designed templates (ATS-optimized, creative, academic)
- Live WYSIWYG editor with drag-and-drop sections and undo/redo
- 18 AI-powered features: AI Analyze, AI Summary, AI Section Writer, ATS AI Fix, and more (via Gemini LLM)
- Job Description Matcher with keyword analysis
- Multi-format export (PDF, JSON, Markdown, HTML, Plain Text)
- Application tracker, skills matrix, experience calculator
- Career timeline visualization
- Privacy scanner and consistency checker
- Dark mode, responsive design, fully offline-capable

Technical Highlights:
- Vanilla JavaScript — zero frameworks, zero dependencies
- ES Modules architecture with IndexedDB storage
- Serverless AI proxy via Vercel edge functions (Gemini/Llama 3.3)
- CSS Custom Properties design system with dark mode
- 38+ template render functions with CSS-variable theming
- ~15,000+ lines of hand-written code
```

4. Click **Save**

### B. Add as Featured Link

1. On your profile, click **"Add profile section"** > **"Recommended"** > **"Add featured"**
2. Click **"Add a link"**
3. Paste your deployed URL
4. **Title:** CareerCanvas — Free Resume Builder
5. **Description:** Privacy-first resume builder with 68+ templates and AI-powered analysis. No sign-up required. Runs 100% in your browser.
6. Click **Save**

### C. Share as a Post

```
I built a free resume builder that runs 100% in your browser.

No sign-up. No data uploads. No paywall. No watermarks.

CareerCanvas features:
  68+ ATS-optimized and creative templates
  Live preview editor with drag-and-drop
  18 AI features — AI Analyze, AI Summary, ATS Fix, and more (powered by Gemini)
  Job Description Matcher for keyword analysis
  Export to PDF, JSON, Markdown, HTML
  Application tracker and career timeline
  Privacy scanner and consistency checker
  Dark mode and fully responsive

Everything runs locally. Your career data never leaves your device.
AI features run through a secure server proxy — no API keys needed by users.

Try it free: [YOUR_URL]
Source code: [YOUR_GITHUB_URL]

Built with vanilla JavaScript. Zero frameworks. Zero dependencies.

#ResumeBuilder #OpenSource #WebDevelopment #JavaScript #CareerTools #Privacy #AI
```

---

## Authentication Setup (Optional)

CareerCanvas works fully without accounts. All features run locally. Adding authentication is optional and gives users account profiles, password management, and future cloud-sync readiness.

### Provider: Supabase Auth (Free Tier)

| Feature | Limit |
|---------|-------|
| Monthly Active Users | 50,000 |
| Auth requests | Unlimited |
| Email verification | Built-in |
| Password reset | Built-in |
| Magic Link | Built-in |
| Google OAuth | Supported |
| Account deletion | Via server function |

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**
3. Name it `careercanvas` (or anything)
4. Choose a region close to your users
5. Set a database password (save it, you won't need it in the app)
6. Wait for project to initialize (~2 minutes)

### Step 2: Get Your Keys

1. Go to **Settings → API** in your Supabase dashboard
2. Copy these values:
   - **Project URL** — e.g. `https://abc123.supabase.co`
   - **anon/public key** — starts with `eyJ...` (this is safe for the browser)
   - **service_role key** — starts with `eyJ...` (**NEVER put this in browser code**)

### Step 3: Configure Supabase Auth

1. Go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. Set **Confirm email** to ON (recommended)
4. Go to **Authentication → URL Configuration**
5. Set **Site URL**:
   - For local dev: `http://localhost:8080`
   - For production: `https://your-app.vercel.app`
6. Add **Redirect URLs**:
   ```
   http://localhost:8080/#/auth/callback
   http://localhost:8082/#/auth/callback
   https://your-app.vercel.app/#/auth/callback
   ```

### Step 3b: Harden Password Auth (Recommended)

1. Go to **Authentication → Policies** (Password protection) in your Supabase dashboard
2. Turn ON **Leaked password protection** (rejects passwords found in HaveIBeenPwned breaches)
3. Set a strong minimum password length (8+ characters)

Without this, the project security advisor reports `auth_leaked_password_protection` as WARN.
This is a dashboard-only setting — it cannot be configured via SQL or env vars.

### Step 4: Add Environment Variables to Vercel
Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Value | Environments |
|----------|-------|-------------|
| `SUPABASE_URL` | `https://abc123.supabase.co` | All |
| `SUPABASE_ANON_KEY` | `eyJ...your-anon-key` | All |
| `PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Production |
| `PUBLIC_SITE_URL` | `http://localhost:8080` | Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...your-service-key` | Production only |
| `AUTH_MAGIC_LINK_ENABLED` | `false` | All |
| `AUTH_GOOGLE_ENABLED` | `false` | All |

**Important:** After adding variables, click **Redeploy** for changes to take effect.

### Step 5: Local Development with Auth

For local development without Vercel CLI, add this script tag to `index.html` **before** the app.js script:

```html
<script>
  window.__CC_AUTH_CONFIG__ = {
    supabaseUrl: 'https://abc123.supabase.co',
    supabaseAnonKey: 'eyJ...your-anon-key',
    siteUrl: 'http://localhost:8080',
    magicLinkEnabled: false,
    googleEnabled: false
  };
</script>
```

**Do NOT commit this with real keys.** Use `.env.local` or keep it gitignored.

### Step 6: Enable Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Credentials**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URI: `https://abc123.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client Secret**
6. In Supabase: **Authentication → Providers → Google** → paste credentials
7. Set `AUTH_GOOGLE_ENABLED=true` in Vercel environment variables
8. Redeploy

### Step 7: Enable Magic Link (Optional)

1. In Supabase: **Authentication → Providers → Email** → enable Magic Link
2. Set `AUTH_MAGIC_LINK_ENABLED=true` in Vercel environment variables
3. Redeploy

### Auth Architecture Summary

```
Vercel (Free Hobby Plan)
├── Static CareerCanvas frontend
├── /api/ai-analyze     → AI proxy (requires GROQ_API_KEY)
├── /api/public-config  → returns public Supabase URL + anon key
└── /api/delete-account → secure account deletion (service-role key)

Supabase (Free Tier)
├── Email/password authentication
├── Email verification
├── Password reset
├── Magic Link (optional)
├── Google OAuth (optional)
└── JWT session management

Browser (unchanged)
├── IndexedDB documents (local only)
├── Resume creation, editing, saving
├── Templates, themes, exports, printing
├── Job matching, skills analysis
├── Experience Calculator
└── All existing features
```

### What Auth Does NOT Do

- Does NOT upload your documents to the cloud
- Does NOT sync data between devices
- Does NOT require an account to use the app
- Does NOT store resumes on any server
- Guest mode gives full access to all local features

### Security Notes

- The `anon/public` key is safe for browser use (it's designed for that)
- The `service_role` key is ONLY used server-side in `/api/delete-account`
- Passwords are handled by Supabase — never stored in CareerCanvas
- Sessions use JWT with automatic refresh
- All auth pages use the app's theme system

---

## Other Free Hosting Options

| Platform | URL | Setup |
|----------|-----|-------|
| **Vercel** | vercel.com | Import from GitHub, deploy |
| **GitHub Pages** | pages.github.com | Enable in repo Settings > Pages |
| **Netlify** | netlify.com | Drag-drop folder or connect GitHub |
| **Cloudflare Pages** | pages.cloudflare.com | Connect GitHub, deploy |
| **Render** | render.com | Connect GitHub as Static Site |

All free. All auto-deploy on push. All work identically for this app.

**Netlify quick deploy (no GitHub needed):**
1. Go to https://app.netlify.com/drop
2. Drag your project folder onto the page
3. Done — instant URL

---

## Privacy Checklist (Safe to Share Publicly)

- [x] No personal information in source code
- [x] No API keys or secrets hardcoded (uses environment variables)
- [x] No database credentials in client code
- [x] No tracking or analytics code
- [x] No cookies (only localStorage for preferences + auth tokens)
- [x] All sample data uses fictional names
- [x] All user documents stay in browser (IndexedDB + localStorage)
- [x] No external API calls for core features
- [x] Resume/CV content is never sent to any server
- [x] Auth is optional — app works fully as guest
- [x] Service-role key only used server-side (api/delete-account.js)
- [x] Supabase anon key is designed for public/browser use

---

## Troubleshooting

**Blank page after deploy?**
- Make sure `index.html` is in the repo root (not inside a subfolder)
- Check browser console (F12) for 404 errors on JS/CSS files

**GitHub Pages shows 404?**
- Wait 2-3 minutes after enabling Pages
- Verify branch is `main` and folder is `/ (root)`
- Repo must be Public for free GitHub Pages

**Vercel build fails?**
- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: `.`

**App stuck on loading?**
- Open DevTools (F12) > Console
- Check for JavaScript errors
- Hard refresh: Ctrl+Shift+R
