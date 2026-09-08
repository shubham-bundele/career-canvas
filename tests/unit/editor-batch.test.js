import { describe, it, expect } from 'vitest';
import {
  replaceInString,
  countInString,
  findReplaceInDoc,
  countInDoc,
} from '../../src/js/utils/find-replace.js';
import { Database } from '../../src/js/core/db.js';
import { ImportManager } from '../../src/js/modules/import-manager.js';

describe('find-replace utils', () => {
  it('replaces case-insensitively by default', () => {
    const r = replaceInString('Led Led LED', 'led', 'Built');
    expect(r.text).toBe('Built Built Built');
    expect(r.count).toBe(3);
  });
  it('respects matchCase', () => {
    expect(replaceInString('Led led', 'Led', 'Built', true).count).toBe(1);
    expect(countInString('Led led', 'led', true)).toBe(1);
  });
  it('escapes regex characters in the needle', () => {
    expect(replaceInString('C++ and C++', 'C++', 'Rust').count).toBe(2);
  });
  it('walks the document model and reports counts', () => {
    const doc = {
      personalInfo: { fullName: 'Led Astray' },
      sections: [
        { title: 'Experience', type: 'text', content: 'Led a team' },
        {
          title: 'Work', type: 'list',
          items: [
            { jobTitle: 'Dev', achievements: ['Led migrations', { text: 'led reviews' }] },
          ],
        },
      ],
    };
    expect(countInDoc(doc, 'led')).toBe(4);
    const { count } = findReplaceInDoc(doc, 'led', 'Drove');
    expect(count).toBe(4);
    expect(doc.personalInfo.fullName).toBe('Drove Astray');
    expect(doc.sections[1].items[0].achievements[1].text).toBe('Drove reviews');
    expect(countInDoc(doc, 'led')).toBe(0);
  });
  it('returns zero for empty needles/docs', () => {
    expect(countInDoc(null, 'x')).toBe(0);
    expect(findReplaceInDoc({}, '', 'y').count).toBe(0);
  });
});

describe('Database.isQuotaError', () => {
  it('detects quota failures across browsers', () => {
    expect(Database.isQuotaError({ name: 'QuotaExceededError' })).toBe(true);
    expect(Database.isQuotaError(new Error('storage full, quota exceeded'))).toBe(true);
    expect(Database.isQuotaError(new Error('boom'))).toBe(false);
    expect(Database.isQuotaError(null)).toBe(false);
  });
});

describe('ImportManager.normalizeBackupData', () => {
  const mgr = new ImportManager({});
  it('accepts data-studio full backups', () => {
    const n = mgr.normalizeBackupData({ version: 1, stores: { documents: [{ id: 1 }] } });
    expect(n.documents).toHaveLength(1);
  });
  it('accepts category backups', () => {
    const n = mgr.normalizeBackupData({ storeName: 'documents', data: [{ id: 1 }] });
    expect(n.documents).toHaveLength(1);
  });
  it('accepts legacy documents files', () => {
    const n = mgr.normalizeBackupData({ version: 1, documents: [{ id: 1 }] });
    expect(n.documents).toHaveLength(1);
  });
  it('rejects unknown shapes', () => {
    expect(() => mgr.normalizeBackupData({ nope: true })).toThrow(/Invalid backup/);
    expect(() => mgr.normalizeBackupData(null)).toThrow(/Invalid backup/);
  });
});
