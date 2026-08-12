/**
 * Global Event Bus
 * Provides publish-subscribe pattern for application-wide events
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.onceListeners = new WeakMap();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports namespacing with ':')
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event).add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  off(event, handler) {
    if (!this.events.has(event)) {
      return;
    }

    const handlers = this.events.get(event);
    handlers.delete(handler);

    if (handlers.size === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    const wrappedHandler = (...args) => {
      this.off(event, wrappedHandler);
      handler(...args);
    };

    // Store reference to original handler for potential early cleanup
    if (!this.onceListeners.has(handler)) {
      this.onceListeners.set(handler, new Map());
    }
    this.onceListeners.get(handler).set(event, wrappedHandler);

    return this.on(event, wrappedHandler);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    // Call handlers for exact event match
    if (this.events.has(event)) {
      const handlers = Array.from(this.events.get(event));
      for (const handler of handlers) {
        try {
          handler(data, event);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      }
    }

    // Call handlers for wildcard events (e.g., 'document:*')
    const eventParts = event.split(':');
    if (eventParts.length > 1) {
      const wildcardEvent = `${eventParts[0]}:*`;
      if (this.events.has(wildcardEvent)) {
        const handlers = Array.from(this.events.get(wildcardEvent));
        for (const handler of handlers) {
          try {
            handler(data, event);
          } catch (error) {
            console.error(`Error in wildcard event handler for "${wildcardEvent}":`, error);
          }
        }
      }
    }

    // Call global wildcard handlers
    if (this.events.has('*')) {
      const handlers = Array.from(this.events.get('*'));
      for (const handler of handlers) {
        try {
          handler(data, event);
        } catch (error) {
          console.error(`Error in global wildcard handler:`, error);
        }
      }
    }
  }

  /**
   * Remove all event listeners for a specific event or all events
   * @param {string} event - Event name (optional, removes all if not specified)
   */
  clear(event = null) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    if (!this.events.has(event)) {
      return 0;
    }
    return this.events.get(event).size;
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get all listeners for an event
   * @param {string} event - Event name
   * @returns {Function[]} Array of handler functions
   */
  listeners(event) {
    if (!this.events.has(event)) {
      return [];
    }
    return Array.from(this.events.get(event));
  }
}

// Create and export singleton instance
const eventBus = new EventBus();

export default eventBus;

// Export named methods for convenience
export const { on, off, once, emit, clear, listenerCount, eventNames, listeners } = eventBus;

/**
 * Common event names used throughout the application
 */
export const EVENTS = {
  // Document events
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_OPEN: 'document:open',
  DOCUMENT_SAVE: 'document:save',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_DUPLICATE: 'document:duplicate',
  DOCUMENT_RENAME: 'document:rename',
  DOCUMENT_EXPORT: 'document:export',

  // Editor events
  EDITOR_CHANGE: 'editor:change',
  EDITOR_FOCUS: 'editor:focus',
  EDITOR_BLUR: 'editor:blur',
  EDITOR_UNDO: 'editor:undo',
  EDITOR_REDO: 'editor:redo',

  // State events
  STATE_CHANGE: 'state:change',
  STATE_RESET: 'state:reset',
  STATE_SNAPSHOT: 'state:snapshot',

  // Router events
  ROUTE_CHANGE: 'route:change',
  ROUTE_BEFORE_CHANGE: 'route:beforeChange',

  // UI events
  UI_MODAL_OPEN: 'ui:modalOpen',
  UI_MODAL_CLOSE: 'ui:modalClose',
  UI_NOTIFICATION: 'ui:notification',
  UI_LOADING: 'ui:loading',

  // Database events
  DB_READY: 'db:ready',
  DB_ERROR: 'db:error',
  DB_STORAGE_WARNING: 'db:storageWarning',

  // Template events
  TEMPLATE_APPLY: 'template:apply',
  TEMPLATE_CHANGE: 'template:change',

  // Export events
  EXPORT_START: 'export:start',
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error',

  // Application events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  APP_OFFLINE: 'app:offline',
  APP_ONLINE: 'app:online'
};
