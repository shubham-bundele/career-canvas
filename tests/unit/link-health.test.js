import { describe, it, expect } from 'vitest';
import { LinkQrStudio } from '../../src/js/modules/link-qr-studio.js';

const classify = (arg) => LinkQrStudio.classifyLinkResult(arg);

describe('classifyLinkResult', () => {
  it('marks 2xx as live', () => {
    expect(classify({ ok: true, status: 200, redirected: false }).state).toBe('live');
  });
  it('marks redirected 2xx as redirect', () => {
    const r = classify({ ok: true, status: 200, redirected: true });
    expect(r.state).toBe('redirect');
    expect(r.detail).toMatch(/final URL/);
  });
  it('marks 3xx as redirect', () => {
    expect(classify({ ok: false, status: 301, redirected: false }).state).toBe('redirect');
  });
  it('marks 4xx/5xx as dead', () => {
    expect(classify({ ok: false, status: 404 }).state).toBe('dead');
    expect(classify({ ok: false, status: 500 }).state).toBe('dead');
  });
  it('marks 429 as unknown (rate-limited)', () => {
    const r = classify({ ok: false, status: 429 });
    expect(r.state).toBe('unknown');
    expect(r.detail).toMatch(/Rate-limited/);
  });
  it('marks network errors as unknown (CORS-safe messaging)', () => {
    const r = classify({ error: true });
    expect(r.state).toBe('unknown');
    expect(r.detail).toMatch(/CORS/);
  });
  it('falls back to ok flag and empty input', () => {
    expect(classify({ ok: true }).state).toBe('live');
    expect(classify({}).state).toBe('unknown');
    expect(classify().state).toBe('unknown');
  });
});
