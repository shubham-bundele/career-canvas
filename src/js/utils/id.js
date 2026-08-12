/**
 * ID Generation Utilities
 * Provides UUID v4, short IDs, and timestamp-based sortable IDs
 */

/**
 * Generates a UUID v4 using crypto.getRandomValues
 * @returns {string} UUID v4 string
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation using crypto.getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convert to hex string with dashes
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generates a short ID for display purposes (8 characters)
 * @returns {string} Short ID string
 */
export function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, byte => chars[byte % chars.length]).join('');
}

/**
 * Generates a timestamp-based sortable ID
 * Format: timestamp-random (e.g., 1691234567890-AbC123)
 * @returns {string} Sortable ID string
 */
export function generateSortableId() {
  const timestamp = Date.now();
  const randomPart = generateShortId().slice(0, 6);
  return `${timestamp}-${randomPart}`;
}

/**
 * Extracts timestamp from a sortable ID
 * @param {string} sortableId - The sortable ID
 * @returns {number|null} Timestamp in milliseconds, or null if invalid
 */
export function getTimestampFromSortableId(sortableId) {
  if (!sortableId || typeof sortableId !== 'string') {
    return null;
  }

  const parts = sortableId.split('-');
  if (parts.length < 2) {
    return null;
  }

  const timestamp = parseInt(parts[0], 10);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Validates if a string is a valid UUID v4
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid UUID v4
 */
export function isValidUUID(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Validates if a string is a valid sortable ID
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid sortable ID
 */
export function isValidSortableId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const parts = id.split('-');
  if (parts.length < 2) {
    return false;
  }

  const timestamp = parseInt(parts[0], 10);
  return !isNaN(timestamp) && timestamp > 0;
}

export const generateId = generateUUID;
