/**
 * Local-dev auth override (TEMPLATE — copy to `local-config.js`).
 *
 * `local-config.js` is gitignored and ONLY loaded on localhost, so real
 * keys here never reach the repo or production. It lets `npx http-server`
 * local dev sign in without Vercel env vars (`/api/public-config` does not
 * exist on a plain static server).
 *
 * Setup:
 *   1. Copy this file to `local-config.js` (same folder).
 *   2. Fill in your Supabase project's URL + publishable key
 *      (Supabase dashboard → Project Settings → API, or `.env.local`).
 *   3. Reload http://localhost:8080/#/login — sign-up/sign-in will work.
 *
 * Production (Vercel) ignores this file entirely and uses `/api/public-config`
 * backed by `SUPABASE_URL` / `SUPABASE_ANON_KEY` env vars.
 */
export default {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLISHABLE_OR_ANON_KEY',
  siteUrl: 'http://localhost:8080',
  magicLinkEnabled: false,
  googleEnabled: false
};
