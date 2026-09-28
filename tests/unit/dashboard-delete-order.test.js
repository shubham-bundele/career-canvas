import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Regression test for the "undeletable document" bug: Dashboard.deleteDocument
// must AWAIT the cloud delete before reloading. loadDocuments() triggers
// syncWithCloud(), which re-inserts any still-present cloud row into IndexedDB —
// fire-and-forget resurrects the just-deleted document (zombie).
vi.mock('../../src/js/auth/cloud-store.js', () => ({
  fetchCloudDocuments: vi.fn(async () => ({ ok: false, skipped: true, documents: [] })),
  pushDocument: vi.fn(async () => ({ ok: false, skipped: true })),
  deleteCloudDocument: vi.fn(async () => ({ ok: true })),
  mergeDocuments: vi.fn((local) => ({ merged: [...(local || [])], cloudNewer: [], localOnly: [] }))
}));

import { Dashboard } from '../../src/js/modules/dashboard.js';
import { deleteCloudDocument } from '../../src/js/auth/cloud-store.js';

function fakeDb(seed = []) {
  const tables = { documents: [...seed], snapshots: [], skillsMatrices: [], matchAnalyses: [] };
  return {
    tables,
    async delete(store, id) {
      tables[store] = (tables[store] || []).filter((r) => r.id !== id);
    },
    async getByIndex(store, field, value) {
      return (tables[store] || []).filter((r) => r && r[field] === value);
    },
    async getAll(store) {
      return [...(tables[store] || [])];
    }
  };
}

describe('Dashboard.deleteDocument cloud ordering', () => {
  beforeEach(() => {
    globalThis.window = {
      CC: {
        modal: { confirm: async () => true },
        toast: { show: () => {} }
      }
    };
  });

  afterEach(() => {
    delete globalThis.window;
    vi.clearAllMocks();
  });

  it('resolves the cloud delete before reloading the list', async () => {
    const order = [];
    deleteCloudDocument.mockImplementation(
      () => new Promise((res) => setTimeout(() => { order.push('cloud-delete'); res({ ok: true }); }, 10))
    );
    const db = fakeDb([{ id: 'd1', name: 'My Resume' }]);
    const fakeThis = {
      documents: [{ id: 'd1', name: 'My Resume' }],
      db,
      loadDocuments: async () => { order.push('reload'); }
    };

    await Dashboard.prototype.deleteDocument.call(fakeThis, 'd1');

    expect(deleteCloudDocument).toHaveBeenCalledWith('d1');
    expect(order).toEqual(['cloud-delete', 'reload']);
    expect(db.tables.documents).toEqual([]);
  });

  it('does nothing when the confirm dialog is cancelled', async () => {
    globalThis.window.CC.modal.confirm = async () => false;
    const db = fakeDb([{ id: 'd1', name: 'My Resume' }]);
    let reloaded = false;
    const fakeThis = {
      documents: [{ id: 'd1', name: 'My Resume' }],
      db,
      loadDocuments: async () => { reloaded = true; }
    };

    await Dashboard.prototype.deleteDocument.call(fakeThis, 'd1');

    expect(deleteCloudDocument).not.toHaveBeenCalled();
    expect(reloaded).toBe(false);
    expect(db.tables.documents).toHaveLength(1);
  });
});
