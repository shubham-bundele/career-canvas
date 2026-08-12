# Authentication Architecture

## Design Principles
1. Static-first: No build system required for auth
2. Browser-first: All document operations remain local
3. Auth is identity only: No cloud document sync
4. Guest-first: Full app works without an account
5. Progressive: Auth enhances, never gates local features

## File Structure
```
src/js/auth/
  auth-config.js        — Public config loader (Supabase URL + anon key)
  auth-service.js       — Central auth service (wraps Supabase client)
  auth-state.js         — Observable auth state
  auth-guard.js         — Route protection logic
  auth-ui.js            — Auth page renderer (landing, login, signup, etc.)
  auth-callback.js      — Callback handler for verification/reset/OAuth
  auth-account.js       — Account menu, profile, security pages

src/css/auth.css        — All auth-related styles

api/
  delete-account.js     — Vercel serverless function (account deletion)
  public-config.js      — Optional: serves public config at runtime
```

## Integration Points
- app.js: Auth init in startup sequence, route registration, header menu
- router.js: New auth routes, guard middleware
- Header: Account menu (guest/logged-in states)
- Settings: Link to account settings
- Service Worker: Exclude auth callback URLs from cache

## Data Flow
1. App loads → auth-config loads public config
2. Supabase client initialized with publishable key
3. Auth state checks for existing session
4. If session valid → Authenticated state, show app
5. If no session → Guest state, show app (full local access)
6. Auth pages available at #/welcome, #/login, #/signup, etc.
7. Account-only routes (#/account/*) redirect to login if unauthenticated

## Session Model
- Supabase handles JWT tokens (access + refresh)
- Tokens stored in localStorage by Supabase client
- Auto-refresh on expiry
- onAuthStateChange listener updates app state
- Sign out clears auth tokens, preserves local documents

## Guest Model
- Default state when no auth configured or user chooses "Continue as Guest"
- Full access to all local features
- No account-only routes (profile, security)
- Can upgrade to account at any time
- Local documents unaffected by auth state changes

## Configuration Model (Option B: /api/public-config)
- Vercel serverless function serves public config
- Returns: Supabase URL, publishable key, site URL, enabled methods
- Falls back to hardcoded defaults if function unavailable
- Service-role key NEVER in response
- Guest mode works even if config endpoint fails
