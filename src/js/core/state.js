/**
 * Centralized State Management
 * Observable state store with undo/redo, snapshots, and change notifications
 */

import eventBus, { EVENTS } from './events.js';

export class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 100;
    this.snapshots = new Map();
    this.batchMode = false;
    this.pendingChanges = [];
  }

  /**
   * Gets the current state
   * @returns {Object} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Gets a value from state by path
   * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
   * @returns {*} Value at path
   */
  get(path) {
    if (!path) {
      return this.state;
    }

    const keys = path.split('.');
    let value = this.state;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Sets a value in state by path (immutable update)
   * @param {string} path - Dot-notation path
   * @param {*} value - New value
   * @param {boolean} addToHistory - Whether to add to undo history (default: true)
   */
  setState(path, value, addToHistory = true) {
    if (this.batchMode) {
      this.pendingChanges.push({ path, value, addToHistory });
      return;
    }

    const previousState = JSON.parse(JSON.stringify(this.state));
    const newState = this.setImmutable(this.state, path, value);

    if (newState === this.state) {
      return; // No change
    }

    this.state = newState;

    if (addToHistory) {
      this.addToHistory(previousState);
    }

    this.notify(path, value);
    eventBus.emit(EVENTS.STATE_CHANGE, { path, value, state: this.state });
  }

  /**
   * Sets multiple values at once
   * @param {Object} updates - Object with path-value pairs
   * @param {boolean} addToHistory - Whether to add to undo history
   */
  setMultiple(updates, addToHistory = true) {
    const previousState = JSON.parse(JSON.stringify(this.state));
    let newState = this.state;

    for (const [path, value] of Object.entries(updates)) {
      newState = this.setImmutable(newState, path, value);
    }

    if (newState === this.state) {
      return; // No change
    }

    this.state = newState;

    if (addToHistory) {
      this.addToHistory(previousState);
    }

    // Notify all paths
    for (const [path, value] of Object.entries(updates)) {
      this.notify(path, value);
    }

    eventBus.emit(EVENTS.STATE_CHANGE, { updates, state: this.state });
  }

  /**
   * Immutably sets a value at a path
   * @private
   */
  setImmutable(obj, path, value) {
    const keys = path.split('.');

    if (keys.length === 1) {
      if (obj[keys[0]] === value) {
        return obj; // No change
      }
      return { ...obj, [keys[0]]: value };
    }

    const [first, ...rest] = keys;
    const currentValue = obj[first];
    const newValue = this.setImmutable(
      currentValue || {},
      rest.join('.'),
      value
    );

    if (currentValue === newValue) {
      return obj; // No change
    }

    return { ...obj, [first]: newValue };
  }

  /**
   * Resets state to initial or provided state
   * @param {Object} initialState - Initial state (default: {})
   */
  reset(initialState = {}) {
    const previousState = this.state;
    this.state = initialState;
    this.history = [];
    this.historyIndex = -1;

    this.notifyAll();
    eventBus.emit(EVENTS.STATE_RESET, { previousState, state: this.state });
  }

  /**
   * Subscribes to state changes
   * @param {string|Function} pathOrCallback - Path to watch or callback for all changes
   * @param {Function} callback - Callback function (if path provided)
   * @returns {Function} Unsubscribe function
   */
  subscribe(pathOrCallback, callback = null) {
    let path = '*';
    let handler = pathOrCallback;

    if (typeof pathOrCallback === 'string') {
      path = pathOrCallback;
      handler = callback;
    }

    if (typeof handler !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    this.subscribers.get(path).add(handler);

    // Return unsubscribe function
    return () => this.unsubscribe(path, handler);
  }

  /**
   * Unsubscribes from state changes
   * @param {string} path - Path that was watched
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      return;
    }

    this.subscribers.get(path).delete(callback);

    if (this.subscribers.get(path).size === 0) {
      this.subscribers.delete(path);
    }
  }

  /**
   * Notifies subscribers of a change
   * @private
   */
  notify(path, value) {
    // Notify exact path subscribers
    if (this.subscribers.has(path)) {
      const callbacks = Array.from(this.subscribers.get(path));
      for (const callback of callbacks) {
        try {
          callback(value, path, this.state);
        } catch (error) {
          console.error(`Error in state subscriber for "${path}":`, error);
        }
      }
    }

    // Notify parent path subscribers
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.subscribers.has(parentPath)) {
        const callbacks = Array.from(this.subscribers.get(parentPath));
        const parentValue = this.get(parentPath);
        for (const callback of callbacks) {
          try {
            callback(parentValue, parentPath, this.state);
          } catch (error) {
            console.error(`Error in state subscriber for "${parentPath}":`, error);
          }
        }
      }
    }

    // Notify global subscribers
    if (this.subscribers.has('*')) {
      const callbacks = Array.from(this.subscribers.get('*'));
      for (const callback of callbacks) {
        try {
          callback(value, path, this.state);
        } catch (error) {
          console.error('Error in global state subscriber:', error);
        }
      }
    }
  }

  /**
   * Notifies all subscribers
   * @private
   */
  notifyAll() {
    for (const [path, callbacks] of this.subscribers.entries()) {
      const value = path === '*' ? this.state : this.get(path);
      for (const callback of callbacks) {
        try {
          callback(value, path, this.state);
        } catch (error) {
          console.error(`Error in state subscriber for "${path}":`, error);
        }
      }
    }
  }

  /**
   * Adds current state to history
   * @private
   */
  addToHistory(previousState) {
    // Remove any states after current index (if we've undone)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add to history
    this.history.push(previousState);

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * Undoes the last state change
   * @returns {boolean} True if undo was performed
   */
  undo() {
    if (!this.canUndo()) {
      return false;
    }

    // Save current state at the slot above for redo
    this.history[this.historyIndex + 1] = this.state;

    const previousState = this.history[this.historyIndex];
    this.state = previousState;
    this.historyIndex--;

    this.notifyAll();
    eventBus.emit(EVENTS.EDITOR_UNDO, { state: this.state });

    return true;
  }

  /**
   * Redoes the last undone state change
   * @returns {boolean} True if redo was performed
   */
  redo() {
    if (!this.canRedo()) {
      return false;
    }

    this.historyIndex++;
    this.state = this.history[this.historyIndex + 1];

    this.notifyAll();
    eventBus.emit(EVENTS.EDITOR_REDO, { state: this.state });

    return true;
  }

  /**
   * Checks if undo is available
   * @returns {boolean} True if can undo
   */
  canUndo() {
    return this.historyIndex >= 0;
  }

  /**
   * Checks if redo is available
   * @returns {boolean} True if can redo
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Clears undo/redo history
   */
  clearHistory() {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Creates a named snapshot of current state
   * @param {string} name - Snapshot name
   */
  createSnapshot(name) {
    if (!name) {
      throw new Error('Snapshot name is required');
    }

    this.snapshots.set(name, JSON.parse(JSON.stringify(this.state)));
    eventBus.emit(EVENTS.STATE_SNAPSHOT, { name, state: this.state });
  }

  /**
   * Restores state from a named snapshot
   * @param {string} name - Snapshot name
   * @returns {boolean} True if snapshot was restored
   */
  restoreSnapshot(name) {
    if (!this.snapshots.has(name)) {
      return false;
    }

    const previousState = this.state;
    this.state = JSON.parse(JSON.stringify(this.snapshots.get(name)));
    this.addToHistory(previousState);

    this.notifyAll();
    eventBus.emit(EVENTS.STATE_CHANGE, { snapshot: name, state: this.state });

    return true;
  }

  /**
   * Deletes a named snapshot
   * @param {string} name - Snapshot name
   * @returns {boolean} True if snapshot was deleted
   */
  deleteSnapshot(name) {
    return this.snapshots.delete(name);
  }

  /**
   * Gets all snapshot names
   * @returns {string[]} Array of snapshot names
   */
  getSnapshotNames() {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Begins a batch update (defers notifications)
   */
  beginBatch() {
    this.batchMode = true;
    this.pendingChanges = [];
  }

  /**
   * Commits batch update (applies all changes and notifies once)
   */
  commitBatch() {
    if (!this.batchMode) {
      return;
    }

    this.batchMode = false;

    if (this.pendingChanges.length === 0) {
      return;
    }

    const previousState = JSON.parse(JSON.stringify(this.state));
    let newState = this.state;

    // Apply all changes
    for (const { path, value } of this.pendingChanges) {
      newState = this.setImmutable(newState, path, value);
    }

    this.state = newState;

    // Add to history if any change requested it
    const shouldAddToHistory = this.pendingChanges.some(change => change.addToHistory);
    if (shouldAddToHistory) {
      this.addToHistory(previousState);
    }

    // Notify for all changed paths
    const changedPaths = new Set(this.pendingChanges.map(c => c.path));
    for (const path of changedPaths) {
      this.notify(path, this.get(path));
    }

    eventBus.emit(EVENTS.STATE_CHANGE, { batch: true, state: this.state });

    this.pendingChanges = [];
  }

  /**
   * Cancels batch update (discards pending changes)
   */
  cancelBatch() {
    this.batchMode = false;
    this.pendingChanges = [];
  }

  /**
   * Creates a selector function for derived state
   * @param {Function} selector - Selector function that receives state
   * @returns {Function} Function that returns selected value
   */
  createSelector(selector) {
    if (typeof selector !== 'function') {
      throw new Error('Selector must be a function');
    }

    return () => selector(this.state);
  }
}

// Create and export singleton instance
const stateManager = new StateManager();

export default stateManager;

// Export methods for convenience
export const {
  getState,
  get,
  setState,
  setMultiple,
  reset,
  subscribe,
  unsubscribe,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  getSnapshotNames,
  beginBatch,
  commitBatch,
  cancelBatch,
  createSelector
} = stateManager;
