/**
 * Rich Text Sanitizer
 * Restricts HTML to safe resume-compatible elements only.
 * Rejects scripts, styles, event handlers, and dangerous content.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li',
  'a', 'span'
]);

const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target', 'rel'],
  'span': [],
  '*': []
};

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

/**
 * Sanitizes HTML string, keeping only allowed tags and attributes.
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
export function sanitizeRichText(html) {
  if (!html || typeof html !== 'string') return '';

  // Create a temporary container to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Walk the DOM and remove disallowed elements/attributes
  sanitizeNode(temp);

  return temp.innerHTML;
}

/**
 * Recursively sanitizes a DOM node.
 */
function sanitizeNode(node) {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      // Text nodes are always safe
      continue;
    }

    if (child.nodeType === Node.COMMENT_NODE) {
      // Remove HTML comments
      node.removeChild(child);
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }

    const tagName = child.tagName.toLowerCase();

    // Remove disallowed tags entirely (including children for dangerous ones)
    if (!ALLOWED_TAGS.has(tagName)) {
      if (isDangerous(tagName)) {
        // script, style, iframe etc — remove completely with children
        node.removeChild(child);
      } else {
        // Unwrap: keep children but remove the tag
        while (child.firstChild) {
          node.insertBefore(child.firstChild, child);
        }
        node.removeChild(child);
      }
      continue;
    }

    // Remove disallowed attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || ALLOWED_ATTRIBUTES['*'] || [];
    const attrs = Array.from(child.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();

      // Remove event handlers
      if (name.startsWith('on')) {
        child.removeAttribute(attr.name);
        continue;
      }

      // Remove style attribute
      if (name === 'style') {
        child.removeAttribute(attr.name);
        continue;
      }

      // Check allowed list
      if (!allowedAttrs.includes(name)) {
        child.removeAttribute(attr.name);
        continue;
      }

      // Validate href for links
      if (name === 'href') {
        const href = attr.value.trim().toLowerCase();
        if (DANGEROUS_PROTOCOLS.some(p => href.startsWith(p))) {
          child.removeAttribute(attr.name);
        }
      }
    }

    // Force safe link attributes
    if (tagName === 'a') {
      child.setAttribute('rel', 'noopener noreferrer');
      child.setAttribute('target', '_blank');
    }

    // Recurse into children
    sanitizeNode(child);
  }
}

/**
 * Checks if a tag is dangerous and should be removed entirely.
 */
function isDangerous(tagName) {
  return ['script', 'style', 'iframe', 'object', 'embed', 'form',
          'input', 'textarea', 'select', 'button', 'link', 'meta',
          'base', 'applet', 'frame', 'frameset'].includes(tagName);
}

/**
 * Converts plain text to safe HTML (preserving line breaks).
 * @param {string} text - Plain text
 * @returns {string} HTML with <br> for newlines and escaped entities
 */
export function plainTextToHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

/**
 * Converts HTML to plain text (stripping all tags).
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function htmlToPlainText(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Checks if content appears to be HTML (has tags).
 * @param {string} content - Content to check
 * @returns {boolean}
 */
export function isHtmlContent(content) {
  if (!content) return false;
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Migrates existing plain text content to safe HTML format.
 * If content is already HTML, sanitizes it.
 * If content is plain text, converts to HTML preserving line breaks.
 * @param {string} content - Existing content
 * @returns {string} Safe HTML content
 */
export function migrateContent(content) {
  if (!content) return '';

  if (isHtmlContent(content)) {
    return sanitizeRichText(content);
  }

  return plainTextToHtml(content);
}
