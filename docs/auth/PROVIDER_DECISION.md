# Authentication Provider Decision

## Selected: Supabase Auth

## Evaluation

| Criteria | Supabase | Firebase | Clerk | Auth.js |
|---|---|---|---|---|
| Vanilla JS support | Yes (JS client) | Yes | No (React-focused) | No (framework-required) |
| Static SPA compatible | Yes | Yes | No | No |
| Hash-router compatible | Yes (custom redirect) | Yes | N/A | N/A |
| Vercel Hobby compatible | Yes | Yes | Paid above free tier | N/A |
| Email/password | Yes | Yes | Yes | Depends |
| Email verification | Yes | Yes | Yes | Depends |
| Password reset | Yes | Yes | Yes | Depends |
| Magic link | Yes | No (email-link only) | Yes | Depends |
| Google OAuth | Yes | Yes | Yes | Yes |
| Session restore | Yes (auto-refresh) | Yes | Yes | N/A |
| Free-plan limits | 50K MAU | 10K/month verify | 10K MAU | N/A |
| Bundle size | ~35KB | ~100KB+ | N/A | N/A |
| Account deletion API | Yes (admin API) | Yes | Yes | N/A |
| Future RLS/DB | Native Postgres RLS | Firestore rules | N/A | N/A |
| Vendor lock-in | Medium (Postgres) | High (GCP) | High | Low |

## Why Supabase
1. Native vanilla JS client (`@supabase/supabase-js`)
2. Works with static SPAs and hash routing
3. Generous free tier (50K MAU, unlimited auth requests)
4. Built-in email verification, password reset, magic links, OAuth
5. Future-ready: Postgres database with Row Level Security for cloud sync
6. Account deletion via admin/service-role API (server-side only)
7. Small bundle size (~35KB)
8. No framework dependency

## Methods Enabled (Initial)
- Email/password sign up and sign in
- Email verification
- Password reset
- Session restoration (auto-refresh tokens)

## Methods Deferred
- Magic Link (after core flow passes)
- Google OAuth (after core + callback handling passes)

## Provider Limitations
- Email rate limits (~4/hour for verification/recovery per email)
- Project may pause after inactivity on free tier
- No custom SMTP on free tier (uses Supabase's email service)
- Service-role key required for account deletion (must stay server-side)

## Free-Plan Assumptions
- Personal/educational use
- <50K monthly active users
- Supabase project remains active
- Terms may change

## Upgrade Triggers
- Commercial use, paid features, high traffic, SLA requirements
