import { loadAuthConfig, isAuthConfigured, getAuthConfig } from './auth-config.js';
import authState, { AUTH_STATUS } from './auth-state.js';

let supabaseClient = null;
let authListener = null;

async function getSupabase() {
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
  if (!sb) return { error: { message: 'Authentication not configured' } };

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

  const needsVerification = data.user && !data.session;
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
  if (!sb) return { error: 'Auth not configured' };

  const hash = window.location.hash;
  const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
  const type = params.get('type');

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
