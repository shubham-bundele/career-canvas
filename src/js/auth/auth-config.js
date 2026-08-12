const DEFAULT_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  siteUrl: window.location.origin,
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
      cachedConfig = {
        supabaseUrl: data.supabaseUrl || '',
        supabaseAnonKey: data.supabaseAnonKey || '',
        siteUrl: data.siteUrl || window.location.origin,
        magicLinkEnabled: data.magicLinkEnabled === true,
        googleEnabled: data.googleEnabled === true,
        configured: !!(data.supabaseUrl && data.supabaseAnonKey)
      };
      return cachedConfig;
    }
  } catch (e) {
    // API not available (local dev without Vercel, or offline)
  }

  // Fallback: try window.__CC_AUTH_CONFIG__ (set by a static config script)
  if (window.__CC_AUTH_CONFIG__) {
    const c = window.__CC_AUTH_CONFIG__;
    cachedConfig = {
      supabaseUrl: c.supabaseUrl || '',
      supabaseAnonKey: c.supabaseAnonKey || '',
      siteUrl: c.siteUrl || window.location.origin,
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
