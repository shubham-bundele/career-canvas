# Supabase Setup — MANUAL CONFIGURATION REQUIRED

## 1. Create Supabase Project
1. Go to https://supabase.com and create a free account
2. Create a new project
3. Note your **Project URL** (e.g., https://abc123.supabase.co)
4. Note your **anon/public key** (safe for browser)
5. Note your **service_role key** (NEVER put in browser code)

## 2. Configure Authentication
1. Go to Authentication → Providers
2. Ensure **Email** is enabled
3. Set "Confirm email" to ON (recommended) or OFF (for testing)
4. Optionally enable **Magic Link** (under Email provider)
5. Optionally enable **Google** (requires Google Cloud Console OAuth setup)

## 3. Configure Site URL
1. Go to Authentication → URL Configuration
2. Set **Site URL**: 
   - Local: `http://localhost:8080`
   - Production: `https://your-domain.vercel.app`
3. Add **Redirect URLs**:
   - `http://localhost:8080/#/auth/callback`
   - `http://localhost:8082/#/auth/callback`
   - `https://your-domain.vercel.app/#/auth/callback`
   - `https://*.vercel.app/#/auth/callback` (for preview deployments)

## 4. Configure Email Templates (Optional)
1. Go to Authentication → Email Templates
2. Customize Confirm signup, Magic Link, Reset password templates
3. Ensure redirect URLs use your site URL + `/#/auth/callback`

## 5. Vercel Environment Variables
Add to Vercel dashboard (Settings → Environment Variables):

**For all environments:**
- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon/public key
- `PUBLIC_SITE_URL` = your deployed site URL

**For Production only (server-side):**
- `SUPABASE_SERVICE_ROLE_KEY` = your service_role key

**Feature flags:**
- `AUTH_MAGIC_LINK_ENABLED` = `true` or `false`
- `AUTH_GOOGLE_ENABLED` = `true` or `false`

## 6. Google OAuth (Optional)
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase: Authentication → Providers → Google → paste credentials

## 7. Local Development
Create `.env.local` (gitignored) with your values:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
PUBLIC_SITE_URL=http://localhost:8080
AUTH_MAGIC_LINK_ENABLED=false
AUTH_GOOGLE_ENABLED=false
```

For local dev without Vercel CLI, set `window.__CC_AUTH_CONFIG__` in a `<script>` tag before app.js:
```html
<script>
  window.__CC_AUTH_CONFIG__ = {
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseAnonKey: 'eyJ...',
    siteUrl: 'http://localhost:8080'
  };
</script>
```
