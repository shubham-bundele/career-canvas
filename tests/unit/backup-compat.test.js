import { describe, it, expect } from 'vitest';
import { normalizeBackupData } from '../../src/js/modules/settings.js';
import { DataStudio } from '../../src/js/modules/data-studio.js';

const settingsBackup = () => ({
  type: 'careercanvas-full-backup',
  version: '1.0.0',
  exportDate: '2026-09-28T00:00:00.000Z',
  documents: [{ id: 'd1', name: 'My Resume' }],
  masterProfile: [],
  preferences: { cc_app_theme: 'dark' }
});

const studioBackup = () => ({
  version: 1,
  exportedAt: '2026-09-28T00:00:00.000Z',
  application: 'CareerCanvas',
  stores: {
    documents: [{ id: 'd2', name: 'Studio Resume' }],
    applications: []
  }
});

const categoryBackup = () => ({
  version: 1,
  exportedAt: '2026-09-28T00:00:00.000Z',
  application: 'CareerCanvas',
  storeName: 'documents',
  data: [{ id: 'd3', name: 'Category Resume' }]
});

describe('normalizeBackupData (settings importer)', () => {
  it('passes the settings dialect through', () => {
    const out = normalizeBackupData(settingsBackup());
    expect(out.documents).toHaveLength(1);
    expect(out.preferences.cc_app_theme).toBe('dark');
  });

  it('flattens the data-studio full-backup dialect', () => {
    const out = normalizeBackupData(studioBackup());
    expect(out).not.toBeNull();
    expect(out.documents).toHaveLength(1);
    expect(out.documents[0].id).toBe('d2');
    expect(out.applications).toEqual([]);
  });

  it('flattens single-category exports', () => {
    const out = normalizeBackupData(categoryBackup());
    expect(out).not.toBeNull();
    expect(out.documents).toHaveLength(1);
    expect(out.documents[0].id).toBe('d3');
  });

  it('rejects garbage', () => {
    expect(normalizeBackupData(null)).toBeNull();
    expect(normalizeBackupData('nope')).toBeNull();
    expect(normalizeBackupData({ foo: 1 })).toBeNull();
    expect(normalizeBackupData({ version: 1 })).toBeNull();
  });
});

describe('DataStudio.validateImportData cross-dialect', () => {
  // validateImportData is pure (no this-use) — call it unbound.
  const ds = Object.create(DataStudio.prototype);

  it('accepts the settings-dialect backup', () => {
    const res = ds.validateImportData(settingsBackup());
    expect(res.valid).toBe(true);
  });

  it('still accepts its own full and category backups', () => {
    expect(ds.validateImportData(studioBackup()).valid).toBe(true);
    expect(ds.validateImportData(categoryBackup()).valid).toBe(true);
  });

  it('still rejects non-backups', () => {
    expect(ds.validateImportData(null).valid).toBe(false);
    expect(ds.validateImportData({ version: 0, stores: {} }).valid).toBe(false);
    expect(ds.validateImportData({ version: 1 }).valid).toBe(false);
  });
});
