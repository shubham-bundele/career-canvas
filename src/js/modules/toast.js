/**
 * Toast Notification System
 * Displays temporary notification messages
 */

import { createElement, encodeHTML } from '../utils/sanitize.js';

/**
 * Toast types
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Default durations (milliseconds)
 */
const DEFAULT_DURATIONS = {
  [TOAST_TYPES.SUCCESS]: 4000,
  [TOAST_TYPES.ERROR]: 6000,
  [TOAST_TYPES.WARNING]: 5000,
  [TOAST_TYPES.INFO]: 4000
};

/**
 * Toast icons
 */
const TOAST_ICONS = {
  [TOAST_TYPES.SUCCESS]: '✓',
  [TOAST_TYPES.ERROR]: '✕',
  [TOAST_TYPES.WARNING]: '⚠',
  [TOAST_TYPES.INFO]: 'ℹ'
};

/**
 * Maximum visible toasts
 */
const MAX_VISIBLE_TOASTS = 5;
/* Small screens show fewer stacked toasts so content stays usable */
const MAX_VISIBLE_TOASTS_MOBILE = 2;

/**
 * Toast notification class (Singleton)
 */
export class Toast {
  constructor() {
    if (Toast.instance) {
      return Toast.instance;
    }

    this.container = null;
    this.toasts = [];
    this.queue = [];
    this.toastCounter = 0;

    Toast.instance = this;
  }

  /**
   * Shows a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds (optional)
   * @returns {number} Toast ID
   */
  show(message, type = TOAST_TYPES.INFO, duration = null) {
    if (!message) {
      return -1;
    }

    // Determine duration
    const toastDuration = duration !== null ? duration : (DEFAULT_DURATIONS[type] || DEFAULT_DURATIONS[TOAST_TYPES.INFO]);

    // Create toast data
    const toastId = ++this.toastCounter;
    const toastData = {
      id: toastId,
      message,
      type,
      duration: toastDuration,
      timestamp: Date.now()
    };

    // Add to queue if too many visible toasts
    if (this.toasts.length >= this.maxVisible()) {
      this.queue.push(toastData);
      return toastId;
    }

    // Show toast immediately
    this.displayToast(toastData);

    return toastId;
  }

  /**
   * Shows a success toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (optional)
   * @returns {number} Toast ID
   */
  success(message, duration = null) {
    return this.show(message, TOAST_TYPES.SUCCESS, duration);
  }

  /**
   * Shows an error toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (optional)
   * @returns {number} Toast ID
   */
  error(message, duration = null) {
    return this.show(message, TOAST_TYPES.ERROR, duration);
  }

  /**
   * Shows a warning toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (optional)
   * @returns {number} Toast ID
   */
  warning(message, duration = null) {
    return this.show(message, TOAST_TYPES.WARNING, duration);
  }

  /**
   * Shows an info toast
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (optional)
   * @returns {number} Toast ID
   */
  info(message, duration = null) {
    return this.show(message, TOAST_TYPES.INFO, duration);
  }

  /**
   * Displays a toast element
   * @param {Object} toastData - Toast data
   */
  displayToast(toastData) {
    // Ensure container exists
    if (!this.container) {
      this.createContainer();
    }

    // Create toast element
    const toastElement = this.createToastElement(toastData);

    // Add to container
    this.container.appendChild(toastElement);

    // Add to active toasts list
    this.toasts.push({
      id: toastData.id,
      element: toastElement,
      data: toastData,
      timeout: null
    });

    // Animate in
    requestAnimationFrame(() => {
      toastElement.classList.add('toast-show');
    });

    // Auto-dismiss after duration
    if (toastData.duration > 0) {
      const toast = this.toasts.find(t => t.id === toastData.id);
      if (toast) {
        toast.timeout = setTimeout(() => {
          this.dismiss(toastData.id);
        }, toastData.duration);
      }
    }
  }

  /**
   * Creates the toast container if it doesn't exist
   */
  createContainer() {
    // Reuse the shell's container when present (app.js renderShell creates
    // #toast-container) so toasts share one fixed-position stack.
    const existing = document.getElementById('toast-container');
    if (existing) {
      this.container = existing;
      return;
    }
    this.container = createElement('div', '', {
      class: 'toast-container',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    });

    document.body.appendChild(this.container);
  }

  /**
   * Creates a toast element
   * @param {Object} toastData - Toast data
   * @returns {HTMLElement} Toast element
   */
  createToastElement(toastData) {
    const { id, message, type, duration } = toastData;

    const toast = createElement('div', '', {
      class: `toast toast-${type}`,
      role: type === TOAST_TYPES.ERROR ? 'alert' : 'status',
      'aria-live': type === TOAST_TYPES.ERROR ? 'assertive' : 'polite',
      'data-toast-id': id.toString()
    });

    // Icon
    const icon = createElement('div', TOAST_ICONS[type] || 'ℹ', {
      class: 'toast-icon'
    });
    toast.appendChild(icon);

    // Content
    const content = createElement('div', '', { class: 'toast-content' });
    const messageEl = createElement('div', '', { class: 'toast-message' });
    messageEl.textContent = message;
    content.appendChild(messageEl);

    // Progress bar (if duration is set)
    if (duration > 0) {
      const progressBar = createElement('div', '', { class: 'toast-progress-bar' });
      const progressFill = createElement('div', '', { class: 'toast-progress-fill' });
      progressBar.appendChild(progressFill);
      content.appendChild(progressBar);

      // Animate progress bar
      requestAnimationFrame(() => {
        progressFill.style.transition = `width ${duration}ms linear`;
        progressFill.style.width = '0%';
      });
    }

    toast.appendChild(content);

    // Close button
    const closeBtn = createElement('button', '×', {
      class: 'toast-close',
      'aria-label': 'Close notification'
    });
    closeBtn.addEventListener('click', () => this.dismiss(id));
    toast.appendChild(closeBtn);

    // Click to dismiss
    toast.addEventListener('click', (e) => {
      if (e.target !== closeBtn) {
        this.dismiss(id);
      }
    });

    // Swipe to dismiss
    let startX = 0;
    let currentX = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
    };

    const handleTouchMove = (e) => {
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      if (Math.abs(diff) > 10) {
        toast.style.transform = `translateX(${diff}px)`;
        toast.style.opacity = 1 - Math.abs(diff) / 200;
      }
    };

    const handleTouchEnd = () => {
      const diff = currentX - startX;
      if (Math.abs(diff) > 100) {
        this.dismiss(id);
      } else {
        toast.style.transform = '';
        toast.style.opacity = '';
      }
    };

    toast.addEventListener('touchstart', handleTouchStart, { passive: true });
    toast.addEventListener('touchmove', handleTouchMove, { passive: true });
    toast.addEventListener('touchend', handleTouchEnd);

    return toast;
  }

  /**
   * Dismisses a toast
   * @param {number} toastId - Toast ID
   */
  dismiss(toastId) {
    const toastIndex = this.toasts.findIndex(t => t.id === toastId);
    if (toastIndex === -1) {
      return;
    }

    const toast = this.toasts[toastIndex];

    // Clear timeout
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }

    // Animate out
    toast.element.classList.remove('toast-show');
    toast.element.classList.add('toast-hide');

    // Remove after animation
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }

      // Remove from active toasts
      this.toasts.splice(toastIndex, 1);

      // Show next queued toast
      this.showNextQueued();
    }, 300);
  }

  /**
   * Max simultaneously visible toasts — fewer on small screens.
   * Queued toasts are never lost; they show as others dismiss.
   */
  maxVisible() {
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 767) return MAX_VISIBLE_TOASTS_MOBILE;
    } catch { /* ignore */ }
    return MAX_VISIBLE_TOASTS;
  }

  /**
   * Shows next queued toast if available
   */
  showNextQueued() {
    if (this.queue.length > 0 && this.toasts.length < this.maxVisible()) {
      const nextToast = this.queue.shift();
      this.displayToast(nextToast);
    }
  }

  /**
   * Dismisses all toasts
   */
  dismissAll() {
    const toastIds = this.toasts.map(t => t.id);
    toastIds.forEach(id => this.dismiss(id));
    this.queue = [];
  }

  /**
   * Clears the container (cleanup)
   */
  destroy() {
    this.dismissAll();

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.toasts = [];
    this.queue = [];
  }
}

// Create and export singleton instance
const toast = new Toast();

export default toast;

// Export convenience methods
export const { show, success, error, warning, info, dismiss, dismissAll } = toast;
