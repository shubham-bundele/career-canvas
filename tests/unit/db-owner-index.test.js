import { describe, it, expect } from 'vitest';
import { Database, STORES } from '../../src/js/core/db.js';

function fakeFreshDb() {
  const created = [];
  const stores = {};
  return {
    created,
    objectStoreNames: { contains: (name) => !!stores[name] },
    createObjectStore: (name) => {
      const store = {
        indexes: [],
        createIndex: (indexName) => { store.indexes.push(indexName); }
      };
      stores[name] = store;
      created.push(name);
      return store;
    },
    getStore: (name) => stores[name]
  };
}

describe('documents ownerId index (DB v5)', () => {
  it('creates an ownerId index on fresh databases', () => {
    const db = new Database();
    const fake = fakeFreshDb();
    db.createStores(fake, 0, 5);
    expect(fake.getStore(STORES.DOCUMENTS).indexes).toContain('ownerId');
  });

  it('getDocumentsByOwner returns owned + legacy untagged docs via the index', async () => {
    const db = new Database();
    db.ensureReady = async () => {};
    const owned = [{ id: 'a', ownerId: 'u-1' }];
    const all = [...owned, { id: 'b', ownerId: 'u-2' }, { id: 'c' }];
    db.getByIndex = async (store, index, value) => {
      expect(store).toBe(STORES.DOCUMENTS);
      expect(index).toBe('ownerId');
      return owned.filter((d) => d.ownerId === value);
    };
    db.getAll = async () => all;
    const result = await db.getDocumentsByOwner('u-1');
    expect(result.map((d) => d.id).sort()).toEqual(['a', 'c']);
  });

  it('getDocumentsByOwner falls back to filtering when the index is missing', async () => {
    const db = new Database();
    db.ensureReady = async () => {};
    db.getByIndex = async () => { throw new Error('no such index'); };
    db.getAll = async () => [
      { id: 'a', ownerId: 'u-1' },
      { id: 'b', ownerId: 'u-2' },
      { id: 'c' }
    ];
    const result = await db.getDocumentsByOwner('u-1');
    expect(result.map((d) => d.id).sort()).toEqual(['a', 'c']);
  });
});
