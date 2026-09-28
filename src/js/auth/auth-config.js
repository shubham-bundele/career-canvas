function getOrigin() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
}

function isLocalDevHost() {
  if (typeof window === 'undefined' || !window.location) return false;
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname || '');
}

const DEFAULT_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  siteUrl: getOrigin(),
  magicLinkEnabled: false,
  googleEnabled: false,
  configured: false
};

let cachedConfig = null;

export async function loadAuthConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('/api/public-config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        cachedConfig = {
          supabaseUrl: data.supabaseUrl || '',
          supabaseAnonKey: data.supabaseAnonKey || '',
          siteUrl: data.siteUrl || getOrigin(),
          magicLinkEnabled: data.magicLinkEnabled === true,
          googleEnabled: data.googleEnabled === true,
          configured: true
        };
        return cachedConfig;
      }
      // A 200 with empty keys means auth is not configured server-side —
      // fall through to the local-dev override below instead of caching it.
    }
  } catch (e) {
    // API not available (local dev without Vercel, or offline)
  }

  // Fallback: dev-only override module (gitignored, localhost only, never
  // committed). Lets `npx http-server` local dev sign in without env vars.
  // See src/js/auth/local-config.example.js.
  if (!cachedConfig && isLocalDevHost()) {
    try {
      const mod = await import('./local-config.js');
      const c = (mod && (mod.default || mod.AUTH_LOCAL_CONFIG)) || {};
      if (c.supabaseUrl && c.supabaseAnonKey) {
        cachedConfig = {
          supabaseUrl: c.supabaseUrl,
          supabaseAnonKey: c.supabaseAnonKey,
          siteUrl: c.siteUrl || getOrigin(),
          magicLinkEnabled: c.magicLinkEnabled === true,
          googleEnabled: c.googleEnabled === true,
          configured: true
        };
        return cachedConfig;
      }
    } catch (e) {
      // No local override present — expected on machines without one.
    }
  }

  if (cachedConfig) return cachedConfig;

  // Fallback: try window.__CC_AUTH_CONFIG__ (set by a static config script)
  if (typeof window !== 'undefined' && window.__CC_AUTH_CONFIG__) {
    const c = window.__CC_AUTH_CONFIG__;
    cachedConfig = {
      supabaseUrl: c.supabaseUrl || '',
      supabaseAnonKey: c.supabaseAnonKey || '',
      siteUrl: c.siteUrl || getOrigin(),
      magicLinkEnabled: c.magicLinkEnabled === true,
      googleEnabled: c.googleEnabled === true,
      configured: !!(c.supabaseUrl && c.supabaseAnonKey)
    };
    return cachedConfig;
  }

  cachedConfig = { ...DEFAULT_CONFIG };
  return cachedConfig;
}

export function getAuthConfig() {
  return cachedConfig || { ...DEFAULT_CONFIG };
}

export function isAuthConfigured() {
  return cachedConfig?.configured === true;
}
