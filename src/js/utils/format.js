/**
 * Formatting Utilities
 * Provides text, date, and file formatting functions
 */

/**
 * Month names for date formatting
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a date as "Month Year" (e.g., "January 2024")
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2024)
 * @param {boolean} short - Use short month name
 * @returns {string} Formatted date string
 */
export function formatMonthYear(month, year, short = false) {
  if (!month || !year) {
    return '';
  }

  let monthIndex;
  if (typeof month === 'string' && isNaN(parseInt(month, 10))) {
    monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(month.toLowerCase().slice(0, 3)));
  } else {
    monthIndex = parseInt(month, 10) - 1;
  }

  if (monthIndex < 0 || monthIndex > 11) {
    return String(year);
  }

  const monthNames = short ? MONTH_NAMES_SHORT : MONTH_NAMES;
  return `${monthNames[monthIndex]} ${year}`;
}

/**
 * Formats a date as "MM/YYYY"
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2024)
 * @returns {string} Formatted date string
 */
export function formatMMYYYY(month, year) {
  if (!month || !year) {
    return '';
  }

  const mm = String(month).padStart(2, '0');
  return `${mm}/${year}`;
}

/**
 * Formats a full date object
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string ('long', 'short', 'iso')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'long') {
  if (!date) {
    return '';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  switch (format) {
    case 'iso':
      return d.toISOString().split('T')[0];
    case 'short':
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'long':
    default:
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

/**
 * Formats file size in bytes to human-readable string
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats timestamp to "time ago" string (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Time ago string
 */
export function formatTimeAgo(date) {
  if (!date) {
    return '';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const seconds = Math.floor((new Date() - d) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }

  return 'just now';
}

/**
 * Counts characters in a string
 * @param {string} text - Text to count
 * @returns {number} Character count
 */
export function countCharacters(text) {
  return text ? text.length : 0;
}

/**
 * Counts words in a string
 * @param {string} text - Text to count
 * @returns {number} Word count
 */
export function countWords(text) {
  if (!text) {
    return 0;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

/**
 * Estimates reading time in minutes
 * @param {string} text - Text to analyze
 * @param {number} wordsPerMinute - Average reading speed (default: 200)
 * @returns {number} Estimated reading time in minutes
 */
export function estimateReadingTime(text, wordsPerMinute = 200) {
  const words = countWords(text);
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Truncates text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} ellipsis - Ellipsis string (default: '...')
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength, ellipsis = '...') {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Capitalizes first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export function capitalize(text) {
  if (!text) {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Converts text to title case
 * @param {string} text - Text to convert
 * @returns {string} Title case text
 */
export function toTitleCase(text) {
  if (!text) {
    return '';
  }

  const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'via'];

  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !smallWords.includes(word)) {
        return capitalize(word);
      }
      return word;
    })
    .join(' ');
}

/**
 * Generates a URL-friendly slug from text
 * @param {string} text - Text to convert
 * @returns {string} Slug
 */
export function generateSlug(text) {
  if (!text) {
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formats a number with thousand separators
 * @param {number} num - Number to format
 * @param {string} separator - Separator character (default: ',')
 * @returns {string} Formatted number
 */
export function formatNumber(num, separator = ',') {
  if (num === null || num === undefined) {
    return '';
  }

  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats a percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, decimals = 0) {
  if (value === null || value === undefined) {
    return '';
  }

  return value.toFixed(decimals) + '%';
}

/**
 * Pluralizes a word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} Pluralized word
 */
export function pluralize(count, singular, plural = null) {
  if (count === 1) {
    return singular;
  }

  return plural || (singular + 's');
}

export const timeAgo = formatTimeAgo;
export const charCount = countCharacters;
export const wordCount = countWords;
