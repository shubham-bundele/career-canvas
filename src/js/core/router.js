/**
 * Hash-based Router
 * Simple client-side routing with route params and guards
 */

import eventBus, { EVENTS } from './events.js';

export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.currentParams = {};
    this.history = [];
    this.guards = [];
    this.notFoundHandler = null;
    this.defaultRoute = '#/dashboard';
    this.initialized = false;
  }

  /**
   * Initializes the router
   */
  init() {
    if (this.initialized) {
      return;
    }

    window.addEventListener('hashchange', () => this.handleHashChange());

    this.initialized = true;

    // Handle initial route immediately — don't wait for load event
    // (module scripts run after DOM is ready, load may have already fired)
    this.handleHashChange();
  }

  /**
   * Registers a route
   * @param {string} path - Route path (e.g., '/dashboard', '/editor/:id')
   * @param {Function} handler - Route handler function
   * @param {Object} options - Route options
   */
  register(path, handler, options = {}) {
    if (!path || typeof path !== 'string') {
      throw new Error('Route path must be a non-empty string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Route handler must be a function');
    }

    // Normalize path (remove leading # if present)
    const normalizedPath = path.startsWith('#') ? path.slice(1) : path;

    // Parse path to create matcher
    const matcher = this.createMatcher(normalizedPath);

    this.routes.set(normalizedPath, {
      path: normalizedPath,
      handler,
      matcher,
      options
    });
  }

  /**
   * Creates a route matcher from path
   * @private
   */
  createMatcher(path) {
    // Convert path to regex pattern
    // /editor/:id -> /^\/editor\/([^\/]+)$/
    const paramNames = [];
    const pattern = path.replace(/:(\w+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${pattern}$`);

    return { regex, paramNames };
  }

  /**
   * Matches a path against registered routes
   * @private
   */
  matchRoute(path) {
    for (const [routePath, route] of this.routes) {
      const match = path.match(route.matcher.regex);

      if (match) {
        const params = {};

        // Extract params
        route.matcher.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return { route, params };
      }
    }

    return null;
  }

  /**
   * Handles hash change
   * @private
   */
  async handleHashChange() {
    const hash = window.location.hash;
    let path = hash.slice(1);
    if (!path) {
      path = this.defaultRoute.startsWith('#') ? this.defaultRoute.slice(1) : this.defaultRoute;
    }
    if (!path.startsWith('/')) path = '/' + path;

    // Check guards
    const canNavigate = await this.runGuards(path);
    if (!canNavigate) {
      // Restore previous hash
      if (this.currentRoute) {
        window.location.hash = '#' + this.currentRoute;
      }
      return;
    }

    // Emit before change event
    eventBus.emit(EVENTS.ROUTE_BEFORE_CHANGE, {
      from: this.currentRoute,
      to: path
    });

    // Match route
    const match = this.matchRoute(path);

    if (match) {
      const { route, params } = match;

      // Update current route
      const previousRoute = this.currentRoute;
      this.currentRoute = path;
      this.currentParams = params;

      // Add to history
      this.history.push({
        path,
        params,
        timestamp: Date.now()
      });

      // Call handler
      try {
        await route.handler(params, { from: previousRoute });
      } catch (error) {
        console.error(`Error in route handler for "${path}":`, error);
        eventBus.emit(EVENTS.APP_ERROR, { error, context: 'router' });
      }

      // Emit change event
      eventBus.emit(EVENTS.ROUTE_CHANGE, {
        path,
        params,
        from: previousRoute
      });
    } else {
      // No route matched - call 404 handler
      this.handle404(path);
    }
  }

  /**
   * Runs route guards
   * @private
   */
  async runGuards(path) {
    for (const guard of this.guards) {
      try {
        const result = await guard(path, this.currentRoute);
        if (result === false) {
          return false;
        }
      } catch (error) {
        console.error('Error in route guard:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Handles 404 not found
   * @private
   */
  handle404(path) {
    if (this.notFoundHandler) {
      try {
        this.notFoundHandler(path);
      } catch (error) {
        console.error('Error in 404 handler:', error);
      }
    } else {
      console.warn(`No route found for: ${path}`);
      // Navigate to default route
      this.navigate(this.defaultRoute);
    }
  }

  /**
   * Navigates to a path
   * @param {string} path - Path to navigate to
   * @param {boolean} replace - Replace current history entry
   */
  navigate(path, replace = false) {
    const normalizedPath = path.startsWith('#') ? path : '#' + path;

    if (replace) {
      window.location.replace(normalizedPath);
    } else {
      window.location.hash = normalizedPath;
    }
  }

  /**
   * Goes back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Goes forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Registers a route guard
   * @param {Function} guard - Guard function (toPath, fromPath) => boolean|Promise<boolean>
   */
  addGuard(guard) {
    if (typeof guard !== 'function') {
      throw new Error('Guard must be a function');
    }

    this.guards.push(guard);

    // Return function to remove guard
    return () => {
      const index = this.guards.indexOf(guard);
      if (index > -1) {
        this.guards.splice(index, 1);
      }
    };
  }

  /**
   * Sets the 404 handler
   * @param {Function} handler - Handler function
   */
  setNotFoundHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    this.notFoundHandler = handler;
  }

  /**
   * Sets the default route
   * @param {string} path - Default route path
   */
  setDefaultRoute(path) {
    this.defaultRoute = path.startsWith('#') ? path : '#' + path;
  }

  /**
   * Gets the current route
   * @returns {Object} Current route info
   */
  getCurrentRoute() {
    return {
      path: this.currentRoute,
      params: this.currentParams
    };
  }

  /**
   * Gets the current params
   * @returns {Object} Current route params
   */
  getParams() {
    return { ...this.currentParams };
  }

  /**
   * Gets a specific param
   * @param {string} name - Param name
   * @returns {string|undefined} Param value
   */
  getParam(name) {
    return this.currentParams[name];
  }

  /**
   * Gets navigation history
   * @param {number} limit - Maximum number of history entries (default: 50)
   * @returns {Array} History entries
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  /**
   * Clears navigation history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Checks if a path matches the current route
   * @param {string} path - Path to check
   * @returns {boolean} True if path matches
   */
  isActive(path) {
    const normalizedPath = path.startsWith('#') ? path.slice(1) : path;
    return this.currentRoute === normalizedPath;
  }

  /**
   * Generates a URL with params
   * @param {string} path - Route path template (e.g., '/editor/:id')
   * @param {Object} params - Param values
   * @returns {string} Generated URL
   */
  generateUrl(path, params = {}) {
    let url = path;

    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    }

    return url.startsWith('#') ? url : '#' + url;
  }

  on(path, handler, options) {
    return this.register(path, handler, options);
  }

  start() {
    return this.init();
  }

  setDefault(path) {
    return this.setDefaultRoute(path);
  }

  setGuard(guardFn) {
    return this.addGuard(guardFn);
  }
}

// Create and export singleton instance
const router = new Router();

export default router;

// Export convenience methods
export const {
  init,
  register,
  navigate,
  back,
  forward,
  addGuard,
  setNotFoundHandler,
  setDefaultRoute,
  getCurrentRoute,
  getParams,
  getParam,
  getHistory,
  clearHistory,
  isActive,
  generateUrl
} = router;

/**
 * Common route guard: confirm before leaving if there are unsaved changes
 */
export function createUnsavedChangesGuard(hasUnsavedChangesFn) {
  return async (toPath, fromPath) => {
    if (!fromPath) {
      return true;
    }

    const hasChanges = typeof hasUnsavedChangesFn === 'function'
      ? hasUnsavedChangesFn()
      : false;

    if (!hasChanges) {
      return true;
    }

    return confirm('You have unsaved changes. Are you sure you want to leave?');
  };
}
