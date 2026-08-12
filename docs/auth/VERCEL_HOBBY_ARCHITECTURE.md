# Vercel Hobby Architecture

## Static-First Design
CareerCanvas deploys as a static site on Vercel Hobby. No build step required.

## Vercel Functions (2 only)

### 1. /api/public-config
- **Purpose**: Serve public auth configuration (Supabase URL, anon key, feature flags)
- **Trigger**: App startup (once, cached 5 minutes)
- **Auth Required**: No
- **Secrets Used**: Reads SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_SITE_URL (all public values)
- **Rate Limit**: Cache-Control: 5 min
- **Failure Behavior**: App falls back to guest mode, all local features work
- **Estimated Invocations**: ~1 per user session (cached)

### 2. /api/delete-account
- **Purpose**: Securely delete user account using service-role key
- **Trigger**: User explicit action only
- **Auth Required**: Yes (Bearer token validated against Supabase)
- **Secrets Used**: SUPABASE_SERVICE_ROLE_KEY (never sent to browser)
- **Rate Limit**: Requires authentication + typed confirmation
- **Failure Behavior**: Shows error, account preserved, user can retry
- **Estimated Invocations**: Very rare (~0-1 per month)
- **Browser Alternative Considered**: Cannot use service-role key in browser — security requirement

## What Stays in the Browser
- All document operations (create, edit, save, duplicate, delete)
- All template rendering
- All theme application
- Job description matching
- Skills evidence analysis
- PDF viewing
- Export generation
- Printing
- Experience Calculator
- Autosave (IndexedDB)
- Search, filters, sorting
- Auth state management (Supabase JS client handles tokens)

## Hobby Plan Compatibility
- 2 serverless functions (well within limits)
- Minimal invocation count
- No long-running functions
- No scheduled functions
- No database (Supabase handles that)
- No build-time processing
