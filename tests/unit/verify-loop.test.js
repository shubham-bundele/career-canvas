import { describe, it, expect, vi, afterEach } from 'vitest';
import { AiFormatter } from '../../src/js/modules/ai-formatter.js';
import { PrivacyStudio } from '../../src/js/modules/privacy-studio.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AiFormatter.validateKey', () => {
  it('accepts a key the provider honors', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200 }));
    const r = await AiFormatter.validateKey('AIza-test-key');
    expect(r).toMatchObject({ ok: true, provider: 'gemini' });
  });
  it('rejects bad keys without storing anything', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 401 }));
    const r = await AiFormatter.validateKey('gsk_bad');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/reject/i);
  });
  it('reports offline instead of failing hard', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('network down'); });
    const r = await AiFormatter.validateKey('AIza-test-key');
    expect(r).toMatchObject({ ok: false, offline: true });
  });
  it('rejects empty keys', async () => {
    await expect(AiFormatter.validateKey('  ')).resolves.toMatchObject({ ok: false });
  });
});

describe('redaction verify loop', () => {
  it('re-scan finds leftovers after partial redaction', () => {
    const ps = new PrivacyStudio(null, null);
    const doc = {
      personalInfo: { fullName: 'Jane', email: 'jane@x.com', phone: '(555) 123-4567' },
      sections: [],
    };
    // redact only the email
    const redacted = JSON.parse(JSON.stringify(doc));
    redacted.personalInfo.email = '[EMAIL]';
    const remaining = ps.performScan(redacted);
    expect(remaining.some((f) => f.matchedText.includes('555'))).toBe(true);
    expect(remaining.some((f) => f.matchedText.includes('jane@x.com'))).toBe(false);
  });
  it('fully redacted copy scans clean', () => {
    const ps = new PrivacyStudio(null, null);
    const redacted = {
      personalInfo: { fullName: 'Jane', email: '[EMAIL]', phone: '[PHONE]' },
      sections: [],
    };
    expect(ps.performScan(redacted)).toEqual([]);
  });
  it('detects secret tokens and API keys in document text', () => {
    const ps = new PrivacyStudio(null, null);
    const doc = {
      personalInfo: { fullName: 'Jane Developer' },
      sections: [{
        sectionType: 'experience',
        items: [{
          company: 'Acme',
          achievements: [{ text: 'Used token ghp_123456789012345678901234567890123456 for automation' }]
        }]
      }]
    };
    const findings = ps.performScan(doc);
    expect(findings.some((f) => f.type === 'apiKey' && f.matchedText.includes('ghp_'))).toBe(true);
  });
});
