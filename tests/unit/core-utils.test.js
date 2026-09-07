import { describe, it, expect } from 'vitest';
import { encodeHTML, isValidEmail, sanitizeFilename, validateTextLength, sanitizeInput, isValidPhone } from '../../src/js/utils/sanitize.js';
import { validateDocument, createEmptyDocument, migrateDocument } from '../../src/js/core/schema.js';
import { Toast } from '../../src/js/modules/toast.js';

describe('sanitize utils', () => {
  it('encodeHTML escapes XSS', () => {
    expect(encodeHTML('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });
  it('validates email', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
  });
  it('sanitizes filenames (traversal blocked)', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFilename('')).toBe('untitled');
  });
  it('validateTextLength truncates', () => {
    expect(validateTextLength('abcdef', 3)).toBe('abc');
    expect(validateTextLength('abcdef', 3, false)).toBe(null);
  });
  it('sanitizeInput caps length', () => {
    expect(sanitizeInput('  hi  ')).toBe('hi');
    expect(sanitizeInput('x'.repeat(100), 10).length).toBe(10);
  });
  it('validates phone loosely', () => {
    expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
    expect(isValidPhone('abc')).toBe(false);
  });
});

describe('document schema', () => {
  it('creates empty resume with sections', () => {
    const d = createEmptyDocument('resume');
    expect(d.id).toBeTruthy();
    expect(d.sections.length).toBeGreaterThan(3);
    expect(validateDocument(d).valid).toBe(true);
  });
  it('rejects invalid doc', () => {
    expect(validateDocument(null).valid).toBe(false);
    expect(validateDocument({}).valid).toBe(false);
  });
  it('migrateDocument stamps version', () => {
    const m = migrateDocument({ id: 'x', schemaVersion: 0 });
    expect(m.schemaVersion).toBe(1);
  });
});

describe('Toast.maxVisible tiers', () => {
  it('caps stacked toasts on small screens, 5 on desktop', () => {
    const t = new Toast();
    globalThis.window = { innerWidth: 390 };
    expect(t.maxVisible()).toBe(2);
    globalThis.window = { innerWidth: 1280 };
    expect(t.maxVisible()).toBe(5);
    delete globalThis.window;
    expect(t.maxVisible()).toBe(5);
  });
});
