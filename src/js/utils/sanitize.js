/**
 * Security and Sanitization Utilities
 * Provides XSS prevention, input validation, and safe HTML handling
 */

/**
 * Maximum lengths for various input types
 */
export const MAX_LENGTHS = {
  SHORT_TEXT: 100,
  MEDIUM_TEXT: 500,
  LONG_TEXT: 5000,
  VERY_LONG_TEXT: 50000,
  FILENAME: 255,
  URL: 2048,
  EMAIL: 254
};

/**
 * HTML entity map for encoding
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * Encodes HTML entities in text to prevent XSS
 * @param {string} text - Text to encode
 * @returns {string} Encoded text
 */
export function encodeHTML(text) {
  if (!text) {
    return '';
  }

  return String(text).replace(/[&<>"'/]/g, char => HTML_ENTITIES[char]);
}

/**
 * Decodes HTML entities
 * @param {string} text - Text to decode
 * @returns {string} Decoded text
 */
export function decodeHTML(text) {
  if (!text) {
    return '';
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Validates and sanitizes a URL
 * @param {string} url - URL to validate
 * @param {string[]} allowedProtocols - Allowed protocols (default: http, https, mailto, tel)
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeURL(url, allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  // Check length
  if (trimmed.length > MAX_LENGTHS.URL) {
    return null;
  }

  // Try to parse as URL
  let parsed;
  try {
    // Add protocol if missing for parsing
    const urlToParse = /^[a-z]+:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(urlToParse);
  } catch (e) {
    return null;
  }

  // Validate protocol
  if (!allowedProtocols.includes(parsed.protocol)) {
    return null;
  }

  // Block javascript: and data: protocols explicitly
  if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
    return null;
  }

  return parsed.href;
}

/**
 * Validates an email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  if (email.length > MAX_LENGTHS.EMAIL) {
    return false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Sanitizes a filename by removing invalid characters and path traversal
 * @param {string} filename - Filename to sanitize
 * @param {string} replacement - Replacement character for invalid chars (default: '_')
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename, replacement = '_') {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }

  let sanitized = filename.trim();

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove or replace invalid filename characters
  // Invalid: < > : " / \ | ? * and control characters (0-31)
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, replacement);

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length
  if (sanitized.length > MAX_LENGTHS.FILENAME) {
    const ext = sanitized.lastIndexOf('.');
    if (ext > 0) {
      const name = sanitized.substring(0, ext);
      const extension = sanitized.substring(ext);
      sanitized = name.substring(0, MAX_LENGTHS.FILENAME - extension.length) + extension;
    } else {
      sanitized = sanitized.substring(0, MAX_LENGTHS.FILENAME);
    }
  }

  // Ensure we have a valid filename
  if (!sanitized || sanitized === '') {
    return 'untitled';
  }

  return sanitized;
}

/**
 * Validates and limits text length
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum length
 * @param {boolean} truncate - Whether to truncate if too long (default: true)
 * @returns {string|null} Validated text or null if invalid
 */
export function validateTextLength(text, maxLength, truncate = true) {
  if (text === null || text === undefined) {
    return null;
  }

  const str = String(text);

  if (str.length > maxLength) {
    return truncate ? str.substring(0, maxLength) : null;
  }

  return str;
}

/**
 * Strips HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function stripHTML(html) {
  if (!html) {
    return '';
  }

  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Safely sets text content on an element (prevents XSS)
 * @param {HTMLElement} element - Element to set text on
 * @param {string} text - Text to set
 */
export function safeSetText(element, text) {
  if (!element) {
    return;
  }

  element.textContent = text || '';
}

/**
 * Safely creates HTML from template with text substitution
 * @param {string} template - HTML template string
 * @param {Object} data - Data object with text values
 * @returns {DocumentFragment} Document fragment with safe HTML
 */
export function safeHTML(template, data = {}) {
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');

  // Replace placeholders with encoded text
  let html = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(placeholder, encodeHTML(value));
  }

  temp.innerHTML = html;

  while (temp.firstChild) {
    fragment.appendChild(temp.firstChild);
  }

  return fragment;
}

/**
 * Creates a safe DOM element with text content
 * @param {string} tagName - Element tag name
 * @param {string} text - Text content
 * @param {Object} attributes - Element attributes
 * @returns {HTMLElement} Created element
 */
export function createElement(tagName, text = '', attributes = {}) {
  const element = document.createElement(tagName);

  if (text) {
    element.textContent = text;
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else if (key === 'href' || key === 'src') {
      const sanitized = sanitizeURL(value);
      if (sanitized) {
        element.setAttribute(key, sanitized);
      }
    } else {
      element.setAttribute(key, value);
    }
  }

  return element;
}

/**
 * Sanitizes user input for storage
 * @param {string} input - User input
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, maxLength = MAX_LENGTHS.LONG_TEXT) {
  if (!input) {
    return '';
  }

  // Convert to string and trim
  let sanitized = String(input).trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates a phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid format
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Allow digits, spaces, dashes, dots, parentheses, plus; require 7-15 digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  const phonePattern = /^[+]?[\d\s().\-]+$/;
  return phonePattern.test(phone.trim());
}

/**
 * Sanitizes an object recursively
 * @param {Object} obj - Object to sanitize
 * @param {number} maxDepth - Maximum recursion depth
 * @param {number} currentDepth - Current depth (internal)
 * @returns {Object} Sanitized object
 */
export function sanitizeObject(obj, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeInput(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
  }

  return sanitized;
}

export const escapeHtml = encodeHTML;
