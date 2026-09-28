import { describe, it, expect } from 'vitest';
import { deleteDocumentAndRelated } from '../../src/js/modules/dashboard.js';

// Minimal in-memory db double with the Database wrapper's surface:
// delete(store, id), getByIndex(store, index, value), getAll(store).
function fakeDb(seed = {}, { noIndex = false } = {}) {
  const tables = {
    documents: [...(seed.documents || [])],
    snapshots: [...(seed.snapshots || [])],
    skillsMatrices: [...(seed.skillsMatrices || [])],
    matchAnalyses: [...(seed.matchAnalyses || [])]
  };
  const calls = { delete: [], getByIndex: [], getAll: [] };
  const byField = { snapshots: 'documentId', skillsMatrices: 'documentId', matchAnalyses: 'resumeId' };
  return {
    calls,
    tables,
    async delete(store, id) {
      calls.delete.push([store, id]);
      tables[store] = (tables[store] || []).filter(r => r.id !== id);
    },
    async getByIndex(store, index, value) {
      calls.getByIndex.push([store, index, value]);
      if (noIndex) throw new Error('no such index');
      const field = byField[store];
      return (tables[store] || []).filter(r => r[field] === value);
    },
    async getAll(store) {
      calls.getAll.push([store]);
      if (!(store in tables)) throw new Error('no such store');
      return [...tables[store]];
    }
  };
}

const seed = () => ({
  documents: [{ id: 'd1', name: 'Resume' }, { id: 'd2', name: 'Keep me' }],
  snapshots: [
    { id: 's1', documentId: 'd1' },
    { id: 's2', documentId: 'd1' },
    { id: 's3', documentId: 'd2' }
  ],
  skillsMatrices: [{ id: 'm1', documentId: 'd1' }],
  matchAnalyses: [{ id: 'a1', resumeId: 'd1' }, { id: 'a2', resumeId: 'd2' }]
});

describe('deleteDocumentAndRelated', () => {
  it('deletes the document plus its snapshots, matrices and analyses only', async () => {
    const db = fakeDb(seed());
    const stats = await deleteDocumentAndRelated(db, 'd1');
    expect(stats).toEqual({ document: true, snapshots: 2, matrices: 1, analyses: 1 });
    expect(db.tables.documents.map(d => d.id)).toEqual(['d2']);
    expect(db.tables.snapshots.map(s => s.id)).toEqual(['s3']);
    expect(db.tables.skillsMatrices).toEqual([]);
    expect(db.tables.matchAnalyses.map(a => a.id)).toEqual(['a2']);
  });

  it('falls back to a full scan when an index is missing (older DBs)', async () => {
    const db = fakeDb(seed(), { noIndex: true });
    const stats = await deleteDocumentAndRelated(db, 'd1');
    expect(stats).toEqual({ document: true, snapshots: 2, matrices: 1, analyses: 1 });
    expect(db.tables.snapshots.map(s => s.id)).toEqual(['s3']);
  });

  it('never throws on missing db, id, or stores', async () => {
    await expect(deleteDocumentAndRelated(null, 'd1')).resolves.toEqual(
      { document: false, snapshots: 0, matrices: 0, analyses: 0 }
    );
    await expect(deleteDocumentAndRelated(fakeDb(), null)).resolves.toEqual(
      { document: false, snapshots: 0, matrices: 0, analyses: 0 }
    );
    const empty = fakeDb();
    delete empty.tables.snapshots;
    const stats = await deleteDocumentAndRelated(empty, 'd1');
    expect(stats.document).toBe(true);
    expect(stats.snapshots).toBe(0);
  });
});
