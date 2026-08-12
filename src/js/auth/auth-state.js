export const AUTH_STATUS = {
  INITIALIZING: 'initializing',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  GUEST: 'guest',
  EXPIRED: 'expired',
  CONFIG_ERROR: 'configError',
  PROVIDER_ERROR: 'providerError',
  OFFLINE: 'offline'
};

class AuthState {
  constructor() {
    this._state = {
      status: AUTH_STATUS.INITIALIZING,
      session: null,
      user: null,
      profile: null,
      error: null,
      initialized: false,
      isGuest: true,
      intendedRoute: null,
      providerConfigured: false
    };
    this._listeners = new Set();
  }

  get() { return { ...this._state }; }
  getStatus() { return this._state.status; }
  getUser() { return this._state.user; }
  getSession() { return this._state.session; }
  getProfile() { return this._state.profile; }
  isAuthenticated() { return this._state.status === AUTH_STATUS.AUTHENTICATED; }
  isGuest() { return this._state.isGuest; }
  isInitialized() { return this._state.initialized; }
  getIntendedRoute() { return this._state.intendedRoute; }

  update(partial) {
    this._state = { ...this._state, ...partial };
    this._notify();
  }

  setIntendedRoute(route) {
    if (!route || typeof route !== 'string') return;
    if (!route.startsWith('/')) return;
    const blocked = ['/login', '/signup', '/welcome', '/verify-email', '/forgot-password', '/reset-password', '/auth/callback'];
    if (blocked.includes(route)) return;
    if (route.includes('javascript:') || route.includes('://')) return;
    this._state.intendedRoute = route;
    this._state._intendedRouteTime = Date.now();
  }

  clearIntendedRoute() {
    const route = this._state.intendedRoute;
    const age = Date.now() - (this._state._intendedRouteTime || 0);
    this._state.intendedRoute = null;
    this._state._intendedRouteTime = null;
    if (route && age > 600000) return null; // Expire after 10 minutes
    return route;
  }

  getValidIntendedRoute() {
    const route = this._state.intendedRoute;
    if (!route) return null;
    const age = Date.now() - (this._state._intendedRouteTime || 0);
    if (age > 600000) { this._state.intendedRoute = null; return null; }
    return route;
  }

  waitForInit() {
    if (this._state.initialized) return Promise.resolve(this.get());
    return new Promise(resolve => {
      const unsub = this.subscribe((state) => {
        if (state.initialized) { unsub(); resolve(state); }
      });
    });
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    const state = this.get();
    for (const fn of this._listeners) {
      try { fn(state); } catch (e) { console.error('Auth state listener error:', e); }
    }
  }

  destroy() {
    this._listeners.clear();
  }
}

const authState = new AuthState();
export default authState;
