import { describe, it, expect, beforeEach } from 'vitest';
import { ImportManager } from '../../src/js/modules/import-manager.js';

function stubStorage(values = {}) {
  const store = { ...values };
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  return store;
}

describe('import routing (batch)', () => {
  const mgr = new ImportManager({});
  it('maps extensions to format ids', () => {
    expect(mgr._formatIdFor('cv.docx')).toBe('docx');
    expect(mgr._formatIdFor('scan.PNG')).toBe('image');
    expect(mgr._formatIdFor('notes.md')).toBe('txt');
    expect(mgr._formatIdFor('x.pdf')).toBe('pdf');
  });
  it('validates image and md files', () => {
    const f = (name) => ({ name, size: 100 });
    expect(mgr.validateFile(f('a.png'), 'image').valid).toBe(true);
    expect(mgr.validateFile(f('a.txt'), 'image').valid).toBe(false);
    expect(mgr.validateFile(f('a.md'), 'txt').valid).toBe(true);
  });
  it('empty batch resolves without work', async () => {
    await expect(mgr.importFileBatch([])).resolves.toMatchObject({ imported: 0, total: 0 });
  });
});

describe('LinkedIn adapter', () => {
  const mgr = new ImportManager({});
  it('maps profile JSON to parsed sections', () => {
    const out = mgr.adaptLinkedInProfile({
      name: 'Jane Doe', title: 'QA Engineer', summary: 'Detail oriented.',
      experience: [{ jobTitle: 'QA Engineer', company: 'Acme', dates: '2021 - Present', bullets: ['Led testing'] }],
      education: [{ degree: 'B.S.', institution: 'MIT', dates: '2019' }],
      skills: ['Selenium', 'Cypress'], certifications: ['ISTQB'],
    });
    expect(out.name).toBe('Jane Doe');
    expect(out.title).toBe('QA Engineer');
    const types = out.sections.map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(['summary', 'experience', 'education', 'skills', 'certifications']));
    expect(out.sections.find((s) => s.type === 'experience').content.join(' ')).toContain('Acme');
  });
  it('tolerates empty profiles', () => {
    const out = mgr.adaptLinkedInProfile({});
    expect(out.sections).toEqual([]);
    expect(out._parser).toBe('ai-linkedin');
  });
});

describe('import history', () => {
  beforeEach(() => stubStorage({}));
  const mgr = new ImportManager({});
  it('logs and reads back entries, capped', () => {
    for (let i = 0; i < 35; i++) mgr._logImport({ fileName: `f${i}.pdf`, docId: `d${i}` });
    const h = mgr.getImportHistory();
    expect(h.length).toBeLessThanOrEqual(30);
    expect(h[0].fileName).toBe('f34.pdf');
  });
  it('returns [] when storage is broken', () => {
    globalThis.localStorage = { getItem: () => { throw new Error('x'); }, setItem: () => {}, removeItem: () => {} };
    expect(mgr.getImportHistory()).toEqual([]);
  });
});
