/**
 * Modal Dialog System
 * Provides modal dialogs for user interactions
 */

import { createElement } from '../utils/sanitize.js';
import eventBus, { EVENTS } from '../core/events.js';

/**
 * Modal sizes
 */
export const MODAL_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  FULL: 'full'
};

/**
 * Button types
 */
export const BUTTON_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  SUCCESS: 'success'
};

/**
 * Modal class
 */
export class Modal {
  constructor() {
    this.overlay = null;
    this.modalElement = null;
    this.isOpen = false;
    this.options = {};
    this.listeners = [];
    this.focusableElements = [];
    this.previousFocus = null;
  }

  /**
   * Shows a modal dialog
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {string|HTMLElement} options.body - Modal body content
   * @param {Array} options.actions - Action buttons
   * @param {boolean} options.closable - Whether modal can be closed (default: true)
   * @param {string} options.size - Modal size (default: medium)
   * @param {Function} options.onClose - Callback when modal closes
   * @returns {Promise} Promise that resolves when modal is closed
   */
  show(options = {}) {
    return new Promise((resolve, reject) => {
      // Close existing modal if open
      if (this.isOpen) {
        this.close();
      }

      // Store options
      this.options = {
        title: options.title || '',
        body: options.body || '',
        actions: options.actions || [],
        closable: options.closable !== false,
        size: options.size || MODAL_SIZES.MEDIUM,
        onClose: options.onClose
      };

      // Store previous focus
      this.previousFocus = document.activeElement;

      // Create overlay
      this.overlay = createElement('div', '', { class: 'modal-overlay' });

      // Create modal
      this.modalElement = this.createModal();

      // Add to overlay
      this.overlay.appendChild(this.modalElement);

      // Add to body
      document.body.appendChild(this.overlay);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Set flag
      this.isOpen = true;

      // Emit event
      eventBus.emit(EVENTS.UI_MODAL_OPEN, { options: this.options });

      // Animate in
      requestAnimationFrame(() => {
        this.overlay.classList.add('modal-show');
      });

      // Setup focus trap
      this.setupFocusTrap();

      // Focus first focusable element
      this.focusFirstElement();

      // Backdrop click — only close if explicitly allowed (not for forms)
      if (this.options.closeOnBackdrop === true) {
        const backdropHandler = (e) => {
          if (e.target === this.overlay) {
            this.close();
            resolve(null);
          }
        };
        this.overlay.addEventListener('click', backdropHandler);
        this.listeners.push({ element: this.overlay, event: 'click', handler: backdropHandler });
      }

      // Handle escape key — only for simple alerts, not forms
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.options.closable) {
          this.close();
          resolve(null);
        }
      };
      document.addEventListener('keydown', escapeHandler);
      this.listeners.push({ element: document, event: 'keydown', handler: escapeHandler });

      // Store resolve/reject for later use
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  /**
   * Creates the modal element
   * @returns {HTMLElement} Modal element
   */
  createModal() {
    const modal = createElement('div', '', {
      class: `modal modal-${this.options.size}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title'
    });

    // Header
    if (this.options.title || this.options.closable) {
      const header = createElement('div', '', { class: 'modal-header' });

      if (this.options.title) {
        const title = createElement('h2', this.options.title, {
          class: 'modal-title',
          id: 'modal-title'
        });
        header.appendChild(title);
      }

      if (this.options.closable) {
        const closeBtn = createElement('button', '×', {
          class: 'modal-close',
          'aria-label': 'Close dialog'
        });
        const closeHandler = () => {
          const resolve = this.resolvePromise;
          this.close();
          if (resolve) {
            resolve(null);
          }
        };
        closeBtn.addEventListener('click', closeHandler);
        this.listeners.push({ element: closeBtn, event: 'click', handler: closeHandler });
        header.appendChild(closeBtn);
      }

      modal.appendChild(header);
    }

    // Body
    const body = createElement('div', '', { class: 'modal-body' });

    if (typeof this.options.body === 'string') {
      body.textContent = this.options.body;
    } else if (this.options.body instanceof HTMLElement) {
      body.appendChild(this.options.body);
    }

    modal.appendChild(body);

    // Footer (if actions provided)
    if (this.options.actions && this.options.actions.length > 0) {
      const footer = createElement('div', '', { class: 'modal-footer' });

      this.options.actions.forEach(action => {
        const button = this.createActionButton(action);
        footer.appendChild(button);
      });

      modal.appendChild(footer);
    }

    return modal;
  }

  /**
   * Creates an action button
   * @param {Object} action - Action configuration
   * @returns {HTMLElement} Button element
   */
  createActionButton(action) {
    const buttonClass = `modal-btn modal-btn-${action.type || BUTTON_TYPES.SECONDARY}`;
    const button = createElement('button', action.label || 'OK', { class: buttonClass });

    if (action.disabled) {
      button.disabled = true;
    }

    const clickHandler = async () => {
      if (action.handler) {
        try {
          const result = await action.handler();
          if (result !== false) {
            // Capture before close(): close() releases promise refs.
            const resolve = this.resolvePromise;
            const reject = this.rejectPromise;
            this.close();
            if (resolve) {
              resolve(result);
            }
          }
        } catch (error) {
          console.error('Modal action handler error:', error);
          const reject = this.rejectPromise;
          this.close();
          if (reject) {
            reject(error);
          }
        }
      } else {
        const resolve = this.resolvePromise;
        this.close();
        if (resolve) {
          resolve(action.label);
        }
      }
    };

    button.addEventListener('click', clickHandler);
    this.listeners.push({ element: button, event: 'click', handler: clickHandler });

    return button;
  }

  /**
   * Shows a confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when confirmed
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} Promise that resolves to true if confirmed
   */
  confirm(message, onConfirm = null, options = {}) {
    return this.show({
      title: options.title || 'Confirm',
      body: message,
      size: options.size || MODAL_SIZES.SMALL,
      actions: [
        {
          label: options.cancelLabel || 'Cancel',
          type: BUTTON_TYPES.SECONDARY,
          // Cancel must dismiss AND settle the promise (returning false alone
          // means "keep open" per createActionButton validation semantics).
          handler: () => {
            const resolve = this.resolvePromise;
            this.close();
            if (resolve) {
              resolve(false);
            }
            return false; // already handled — skip the default close/resolve
          }
        },
        {
          label: options.confirmLabel || 'Confirm',
          type: options.danger ? BUTTON_TYPES.DANGER : BUTTON_TYPES.PRIMARY,
          handler: async () => {
            if (onConfirm) {
              await onConfirm();
            }
            return true;
          }
        }
      ],
      closable: options.closable !== false
    });
  }

  /**
   * Shows an alert dialog
   * @param {string} message - Alert message
   * @param {Object} options - Additional options
   * @returns {Promise} Promise that resolves when dismissed
   */
  alert(message, options = {}) {
    return this.show({
      title: options.title || 'Alert',
      body: message,
      size: options.size || MODAL_SIZES.SMALL,
      actions: [
        {
          label: options.okLabel || 'OK',
          type: BUTTON_TYPES.PRIMARY,
          handler: () => true
        }
      ],
      closable: options.closable !== false
    });
  }

  /**
   * Shows a prompt dialog
   * @param {string} message - Prompt message
   * @param {string} defaultValue - Default input value
   * @param {Object} options - Additional options
   * @returns {Promise<string|null>} Promise that resolves to input value or null
   */
  prompt(message, defaultValue = '', options = {}) {
    const input = createElement('input', '', {
      class: 'modal-input',
      type: options.inputType || 'text',
      placeholder: options.placeholder || ''
    });
    input.value = defaultValue;

    const container = createElement('div', '', { class: 'modal-prompt-container' });
    const messageEl = createElement('p', message, { class: 'modal-prompt-message' });
    container.appendChild(messageEl);
    container.appendChild(input);

    return this.show({
      title: options.title || 'Input',
      body: container,
      size: options.size || MODAL_SIZES.SMALL,
      actions: [
        {
          label: options.cancelLabel || 'Cancel',
          type: BUTTON_TYPES.SECONDARY,
          handler: () => null
        },
        {
          label: options.okLabel || 'OK',
          type: BUTTON_TYPES.PRIMARY,
          handler: () => input.value
        }
      ],
      closable: options.closable !== false
    }).then(result => {
      // Focus was on input, return the value
      return result;
    });
  }

  /**
   * Closes the modal.
   *
   * State (isOpen/overlay/listeners) is released synchronously so a new
   * modal can be opened immediately afterwards (e.g. confirm → prompt
   * sequences); only the DOM fade-out/removal stays on a timer. Snapshot
   * the outgoing overlay/listeners first — show() may already have
   * reassigned them when close() runs as part of a transition.
   */
  close() {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;

    const overlay = this.overlay;
    const listeners = this.listeners;
    const options = this.options;
    this.listeners = [];
    this.overlay = null;
    this.modalElement = null;
    this.focusableElements = [];
    this.resolvePromise = null;
    this.rejectPromise = null;

    if (!overlay) return;

    // Animate out
    overlay.classList.remove('modal-show');
    overlay.classList.add('modal-hide');

    // Remove after animation
    setTimeout(() => {
      // Clean up listeners
      listeners.forEach(({ element, event, handler }) => {
        try { element.removeEventListener(event, handler); } catch { /* ignore */ }
      });

      // Remove from DOM
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      // Restore body scroll
      document.body.style.overflow = '';

      // Restore focus
      if (this.previousFocus) {
        try { this.previousFocus.focus(); } catch { /* ignore */ }
        this.previousFocus = null;
      }

      // Emit event
      eventBus.emit(EVENTS.UI_MODAL_CLOSE);

      // Call onClose callback
      if (options.onClose) {
        try { options.onClose(); } catch (e) { console.error('Modal onClose error:', e); }
      }
    }, 300);
  }

  /**
   * Sets up focus trap within modal
   */
  setupFocusTrap() {
    if (!this.modalElement) {
      return;
    }

    // Find all focusable elements
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(this.modalElement.querySelectorAll(focusableSelector));

    if (this.focusableElements.length === 0) {
      return;
    }

    const firstFocusable = this.focusableElements[0];
    const lastFocusable = this.focusableElements[this.focusableElements.length - 1];

    // Handle tab key
    const tabHandler = (e) => {
      if (e.key !== 'Tab') {
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    this.modalElement.addEventListener('keydown', tabHandler);
    this.listeners.push({ element: this.modalElement, event: 'keydown', handler: tabHandler });
  }

  /**
   * Focuses the first focusable element in modal
   */
  focusFirstElement() {
    if (this.focusableElements.length > 0) {
      setTimeout(() => {
        this.focusableElements[0].focus();
      }, 100);
    }
  }

  /**
   * Checks if modal is currently open
   * @returns {boolean} True if modal is open
   */
  isModalOpen() {
    return this.isOpen;
  }
}

// Create and export singleton instance
const modal = new Modal();

export default modal;

// Export convenience methods
export const { show, confirm, alert, prompt, close, isModalOpen } = modal;
