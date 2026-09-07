import { describe, it, expect } from 'vitest';
import { ImportManager } from '../../src/js/modules/import-manager.js';

// Ported from the broken root test.js (invalid backslash-continuation string)
// into a runnable regression test for plain-text resume parsing.
describe('ImportManager.parsePlainText', () => {
  const mgr = new ImportManager({});
  const text = [
    'Pranjali Bundele',
    'QA Automation Engineer',
    'pranjali@example.com',
    '(555) 123-4567',
    '',
    'WORK EXPERIENCE',
    'Software Engineer',
    'Google',
    '- Did things',
    '- Did more things',
    '',
    'EDUCATION',
    'B.S. Computer Science',
    'MIT',
    '',
  ].join('\n');

  it('extracts contact fields', () => {
    const out = mgr.parsePlainText(text);
    expect(out.name).toContain('Pranjali');
    expect(out.email).toContain('pranjali@example.com');
  });

  it('detects experience and education sections', () => {
    const out = mgr.parsePlainText(text);
    const types = out.sections.map((s) => s.type);
    expect(types).toContain('experience');
    expect(types).toContain('education');
  });

  it('returns empty-ish result for blank input without throwing', () => {
    expect(() => mgr.parsePlainText('')).not.toThrow();
  });
});

describe('ImportManager._parseDateRange', () => {
  const mgr = new ImportManager({});
  it('parses month ranges', () => {
    const r = mgr._parseDateRange('Jan 2020 - Dec 2022');
    expect(r).toMatchObject({ startMonth: '01', startYear: '2020', endMonth: '12', endYear: '2022' });
  });
  it('detects present/current', () => {
    const r = mgr._parseDateRange('March 2021 – Present');
    expect(r).toMatchObject({ startMonth: '03', startYear: '2021', current: true });
  });
  it('parses year-only ranges', () => {
    const r = mgr._parseDateRange('2019 - 2022');
    expect(r).toMatchObject({ startYear: '2019', endYear: '2022' });
  });
  it('handles single year and empty input', () => {
    expect(mgr._parseDateRange('MIT, 2019').startYear).toBe('2019');
    expect(mgr._parseDateRange('')).toMatchObject({ startYear: '', current: false });
  });
});
