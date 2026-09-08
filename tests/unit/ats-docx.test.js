import { describe, it, expect } from 'vitest';
import { auditForExport, verifyDocxContent } from '../../src/js/utils/ats-audit.js';
import { buildDocx, buildDocumentXml } from '../../src/js/utils/docx-export.js';

const doc = {
  personalInfo: { fullName: 'Jane Doe', email: 'j@x.com', phone: '1', city: 'Pune' },
  sections: [
    { sectionType: 'experience', title: 'Experience', items: [{ jobTitle: 'Dev', achievements: ['Did x'] }] },
    { sectionType: 'skills', title: 'Skills', items: [{ name: 'React' }] },
  ],
};

describe('auditForExport', () => {
  it('passes a clean single-column doc', () => {
    expect(auditForExport(doc, { columnCount: 1 }).filter((i) => i.level === 'error')).toEqual([]);
  });
  it('flags missing name/contact/content', () => {
    const r = auditForExport({ personalInfo: {}, sections: [] });
    expect(r.filter((i) => i.level === 'error').length).toBeGreaterThanOrEqual(2);
  });
  it('warns on multi-column without ATS mode + long docs', () => {
    const r = auditForExport(doc, { columnCount: 2, atsMode: false });
    expect(r.some((i) => i.code === 'multi-column')).toBe(true);
    expect(auditForExport(doc, { columnCount: 2, atsMode: true }).some((i) => i.code === 'multi-column')).toBe(false);
  });
});

describe('docx export', () => {
  it('produces a PK-zipped package with document.xml', () => {
    const bytes = buildDocx(doc);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const xml = buildDocumentXml(doc);
    expect(xml).toContain('Jane Doe');
    expect(xml).toContain('j@x.com');
    expect(xml).toContain('Experience');
  });
  it('local + central headers agree (parseable chain)', () => {
    const bytes = buildDocx(doc);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    // walk local headers to central directory
    let p = 0;
    const names = [];
    for (let i = 0; i < 3; i++) {
      expect(dv.getUint32(p, true)).toBe(0x04034b50);
      const compSize = dv.getUint32(p + 18, true);
      const nameLen = dv.getUint16(p + 26, true);
      const extraLen = dv.getUint16(p + 28, true);
      const nameBytes = bytes.slice(p + 30, p + 30 + nameLen);
      names.push(new TextDecoder().decode(nameBytes));
      p += 30 + nameLen + extraLen + compSize;
    }
    expect(names).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
    expect(dv.getUint32(p, true)).toBe(0x02014b50); // central dir follows
  });
  it('verifyDocxContent finds all key text', () => {
    const v = verifyDocxContent(doc, buildDocumentXml(doc));
    expect(v).toEqual({ ok: true, missing: [] });
    expect(verifyDocxContent(doc, '<xml></xml>').ok).toBe(false);
  });
});
