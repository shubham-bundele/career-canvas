import { loadAuthConfig, isAuthConfigured, getAuthConfig } from './auth-config.js';
import authState, { AUTH_STATUS } from './auth-state.js';

let supabaseClient = null;
let authListener = null;

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const config = getAuthConfig();
  if (!config.configured) return null;

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    });
    return supabaseClient;
  } catch (e) {
    console.error('Failed to load Supabase client:', e);
    authState.update({ status: AUTH_STATUS.PROVIDER_ERROR, error: 'Failed to load authentication provider', initialized: true });
    return null;
  }
}

/**
 * Shared accessor for the lazily-created Supabase client (used by
 * cloud-store.js for document sync). Returns null when auth is unconfigured
 * or the CDN client cannot load — never throws.
 * @returns {Promise<Object|null>}
 */
export async function getSupabaseClient() {
  return getSupabase();
}

/**
 * Fire-and-forget removal of temporary guest documents after an auth
 * transition. Guests never have saved data: once a user signs in/out, any
 * `ownerId === 'guest'` documents are wiped from the local store.
 */
function clearGuestDocsSoon() {
  try {
    import('./user-store.js').then(({ clearGuestData }) => {
      const db = window.CC && window.CC.db ? window.CC.db : null;
      if (db) clearGuestData(db).catch(() => {});
    }).catch(() => {});
  } catch (e) { /* ignore */ }
}

export async function initializeAuth() {
  authState.update({ status: AUTH_STATUS.INITIALIZING });

  await loadAuthConfig();

  if (!isAuthConfigured()) {
    authState.update({
      status: AUTH_STATUS.GUEST,
      initialized: true,
      isGuest: true,
      providerConfigured: false
    });
    return;
  }

  authState.update({ providerConfigured: true });

  const sb = await getSupabase();
  if (!sb) return;

  try {
    const { data: { session }, error } = await sb.auth.getSession();

    if (error) {
      console.warn('Session restore error:', error.message);
      authState.update({ status: AUTH_STATUS.GUEST, initialized: true, isGuest: true, error: null });
    } else if (session) {
      authState.update({
        status: AUTH_STATUS.AUTHENTICATED,
        session,
        user: session.user,
        initialized: true,
        isGuest: false,
        error: null
      });
    } else {
      const wasGuest = localStorage.getItem('cc_auth_guest') === 'true';
      authState.update({
        status: wasGuest ? AUTH_STATUS.GUEST : AUTH_STATUS.UNAUTHENTICATED,
        initialized: true,
        isGuest: wasGuest,
        error: null
      });
    }

    authListener = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.removeItem('cc_auth_guest');
        authState.update({
          status: AUTH_STATUS.AUTHENTICATED,
          session,
          user: session.user,
          isGuest: false,
          error: null
        });
        // Guest work is temporary — wipe it so the account starts clean
        // and only the user's own saved resumes remain.
        clearGuestDocsSoon();
      } else if (event === 'SIGNED_OUT') {
        authState.update({
          status: AUTH_STATUS.GUEST,
          session: null,
          user: null,
          profile: null,
          isGuest: true,
          error: null
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        authState.update({ session, user: session.user });
      } else if (event === 'USER_UPDATED' && session) {
        authState.update({ user: session.user });
      }
    });
  } catch (e) {
    console.error('Auth initialization failed:', e);
    authState.update({ status: AUTH_STATUS.GUEST, initialized: true, isGuest: true, error: e.message });
  }
}

export async function signUp({ email, password, displayName }) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured. Click "Continue as Guest" to use the app without an account.' } };

  const config = getAuthConfig();
  const { data, error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { display_name: displayName?.trim() || '' },
      emailRedirectTo: `${config.siteUrl}/#/auth/callback`
    }
  });

  if (error) return { error: { message: error.message } };

  const user = data && data.user;
  // Repeated signup with an existing address: GoTrue answers 200 with an
  // obfuscated user (empty `identities`) and sends NO email
  // (anti-enumeration). Flag it so the UI can say "already exists — sign
  // in" instead of parking the user on verify-email waiting for a message
  // that will never arrive.
  if (user && Array.isArray(user.identities) && user.identities.length === 0 && !data.session) {
    return { data, alreadyRegistered: true };
  }

  const needsVerification = user && !data.session;
  return { data, needsVerification };
}

export async function signInWithPassword({ email, password }) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error) {
    if (error.message?.includes('Email not confirmed')) {
      return { error: { message: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' } };
    }
    return { error: { message: 'Invalid email or password.' } };
  }

  return { data };
}

export async function signInWithMagicLink({ email }) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const config = getAuthConfig();
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${config.siteUrl}/#/auth/callback` }
  });

  if (error) return { error: { message: error.message } };
  return { success: true };
}

export async function signInWithOAuth(provider) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const config = getAuthConfig();
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${config.siteUrl}/#/auth/callback` }
  });

  if (error) return { error: { message: error.message } };
  return { success: true };
}

export async function signOut() {
  const sb = await getSupabase();
  if (sb) {
    await sb.auth.signOut();
  }
  authState.update({
    status: AUTH_STATUS.GUEST,
    session: null,
    user: null,
    profile: null,
    isGuest: true,
    error: null
  });
  localStorage.setItem('cc_auth_guest', 'true');
  // Leaving the account: discard any temporary guest work created earlier.
  clearGuestDocsSoon();
}

export async function requestPasswordReset({ email }) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const config = getAuthConfig();
  await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${config.siteUrl}/#/reset-password`
  });
  return { success: true };
}

export async function updatePassword(newPassword) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { error: { message: error.message } };
  return { success: true };
}

export async function updateProfile({ displayName }) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const { error } = await sb.auth.updateUser({
    data: { display_name: displayName?.trim() || '' }
  });
  if (error) return { error: { message: error.message } };
  authState.update({ user: { ...authState.getUser(), user_metadata: { ...authState.getUser()?.user_metadata, display_name: displayName?.trim() } } });
  return { success: true };
}

export async function resendVerification({ email }) {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const config = getAuthConfig();
  const { error } = await sb.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${config.siteUrl}/#/auth/callback` }
  });
  if (error) return { error: { message: error.message } };
  return { success: true };
}

export async function requestAccountDeletion() {
  const sb = await getSupabase();
  if (!sb) return { error: { message: 'Authentication not configured' } };

  const session = authState.getSession();
  if (!session?.access_token) return { error: { message: 'Not authenticated' } };

  try {
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    const result = await res.json();
    if (!res.ok) return { error: { message: result.error || 'Deletion failed' } };
    await signOut();
    return { success: true };
  } catch (e) {
    return { error: { message: 'Account deletion service unavailable' } };
  }
}

export async function handleAuthCallback() {
  const sb = await getSupabase();
  if (!sb) {
    return { error: getAuthConfig().configured
      ? 'Authentication service unavailable. Check your connection and retry'
      : 'Auth not configured' };
  }

  // Supabase delivers the PKCE `code` either in the query string
  // (?code=...) or, with hash routing, inside the hash fragment.
  // The client runs with detectSessionInUrl:false, so the code must be
  // exchanged explicitly — otherwise verification links land on a dead page.
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?') ? hash.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams(window.location.search || '');
  const hashParams = new URLSearchParams(hashQuery);
  const code = params.get('code') || hashParams.get('code');
  const type = params.get('type') || hashParams.get('type');

  if (code) {
    try {
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) return { error: error.message };
      if (data && data.session) {
        // Scrub the one-time code from the address bar.
        try {
          window.history.replaceState({}, '', `${window.location.pathname}#/auth/callback`);
        } catch (e) { /* ignore */ }
        return { type: type || 'signup', session: data.session };
      }
    } catch (e) {
      return { error: (e && e.message) || 'Verification failed' };
    }
    // A code was present but produced no session (expired, already used,
    // or malformed). Don't fall through silently — the caller shows this.
    return { error: 'This verification link is invalid or has expired' };
  }

  if (type === 'recovery') {
    return { type: 'recovery' };
  }

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      return { type: type || 'signin', session };
    }
  } catch (e) {
    // Ignore
  }
  return { type: type || 'unknown' };
}

export function continueAsGuest() {
  localStorage.setItem('cc_auth_guest', 'true');
  authState.update({
    status: AUTH_STATUS.GUEST,
    initialized: true,
    isGuest: true,
    error: null
  });
}

export function destroyAuth() {
  if (authListener?.subscription) {
    authListener.subscription.unsubscribe();
    authListener = null;
  }
  authState.destroy();
  supabaseClient = null;
}
