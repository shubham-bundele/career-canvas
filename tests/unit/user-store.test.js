import { describe, it, expect, beforeEach } from 'vitest';
import authState, { AUTH_STATUS } from '../../src/js/auth/auth-state.js';
import {
  GUEST_OWNER_ID,
  getCurrentOwnerId,
  isAuthenticatedSession,
  withOwner,
  isVisibleToOwner,
  filterDocumentsByOwner,
  adoptLegacyDocuments,
  clearGuestData,
  countGuestDocuments,
  loadOwnerDocuments
} from '../../src/js/auth/user-store.js';
import {
  mapDocumentToRow,
  mapRowToDocument,
  mergeDocuments,
  fetchCloudDocuments,
  pushDocument,
  deleteCloudDocument
} from '../../src/js/auth/cloud-store.js';

function asGuest() {
  authState.update({ status: AUTH_STATUS.GUEST, user: null, session: null, isGuest: true, initialized: true });
}

function asUser(id = 'user-123') {
  authState.update({
    status: AUTH_STATUS.AUTHENTICATED,
    user: { id, email: 'test@example.com' },
    session: { access_token: 'x' },
    isGuest: false,
    initialized: true
  });
}

function fakeDb(docs) {
  const store = new Map(docs.map((d) => [d.id, { ...d }]));
  return {
    async getAll() { return [...store.values()]; },
    async put(_store, doc) { store.set(doc.id, { ...doc }); },
    async delete(_store, id) { store.delete(id); },
    _store: store
  };
}

describe('user-store ownership', () => {
  beforeEach(() => { asGuest(); });

  it('guest session resolves to the guest owner id', () => {
    expect(getCurrentOwnerId()).toBe(GUEST_OWNER_ID);
    expect(isAuthenticatedSession()).toBe(false);
  });

  it('authenticated session resolves to the user id', () => {
    asUser('u-1');
    expect(getCurrentOwnerId()).toBe('u-1');
    expect(isAuthenticatedSession()).toBe(true);
  });

  it('withOwner tags a copy without mutating the input', () => {
    const doc = { id: 'a', name: 'R' };
    const tagged = withOwner(doc, 'u-9');
    expect(tagged.ownerId).toBe('u-9');
    expect(doc.ownerId).toBeUndefined();
    expect(withOwner(doc).ownerId).toBe(GUEST_OWNER_ID);
  });

  it('isVisibleToOwner keeps legacy docs visible, isolates owners', () => {
    expect(isVisibleToOwner(null, 'u-1')).toBe(false);
    expect(isVisibleToOwner({ id: 'a' }, 'u-1')).toBe(true); // legacy
    expect(isVisibleToOwner({ id: 'a', ownerId: 'u-1' }, 'u-1')).toBe(true);
    expect(isVisibleToOwner({ id: 'a', ownerId: 'u-2' }, 'u-1')).toBe(false);
    expect(isVisibleToOwner({ id: 'a', ownerId: 'guest' }, 'guest')).toBe(true);
  });

  it('filterDocumentsByOwner partitions login vs guest views', () => {
    const docs = [
      { id: '1', ownerId: 'u-1' },
      { id: '2', ownerId: 'guest' },
      { id: '3' }, // legacy
      { id: '4', ownerId: 'u-2' }
    ];
    expect(filterDocumentsByOwner(docs, 'u-1').map((d) => d.id).sort()).toEqual(['1', '3']);
    expect(filterDocumentsByOwner(docs, 'guest').map((d) => d.id).sort()).toEqual(['2', '3']);
    expect(filterDocumentsByOwner(docs, 'u-2').map((d) => d.id).sort()).toEqual(['3', '4']);
  });

  it('adoptLegacyDocuments tags untagged docs, skips guests', async () => {
    const db = fakeDb([{ id: '1' }, { id: '2', ownerId: 'guest' }]);
    const n = await adoptLegacyDocuments(db, await db.getAll(), 'u-1');
    expect(n).toBe(1);
    expect(db._store.get('1').ownerId).toBe('u-1');
    expect(db._store.get('2').ownerId).toBe('guest');
    expect(await adoptLegacyDocuments(db, await db.getAll(), 'guest')).toBe(0);
  });

  it('clearGuestData removes only guest-tagged docs', async () => {
    const db = fakeDb([
      { id: '1', ownerId: 'guest' },
      { id: '2', ownerId: 'u-1' },
      { id: '3' } // legacy stays (adopted on login, never deleted here)
    ]);
    expect(await clearGuestData(db)).toBe(1);
    expect([...db._store.keys()].sort()).toEqual(['2', '3']);
  });

  it('countGuestDocuments counts only guest-tagged docs', async () => {
    const db = fakeDb([
      { id: '1', ownerId: 'guest' },
      { id: '2', ownerId: 'guest' },
      { id: '3', ownerId: 'u-1' },
      { id: '4' }
    ]);
    expect(await countGuestDocuments(db)).toBe(2);
    expect(await countGuestDocuments(null)).toBe(0);
  });

  it('count/clearGuestData prefer the ownerId index when available', async () => {
    const db = fakeDb([
      { id: '1', ownerId: 'guest' },
      { id: '2', ownerId: 'u-1' },
      { id: '3' }
    ]);
    let indexCalls = 0;
    db.getDocumentsByOwner = async (ownerId) => {
      indexCalls += 1;
      return [...db._store.values()].filter((d) => d.ownerId === ownerId || !d.ownerId);
    };
    expect(await countGuestDocuments(db)).toBe(1);
    expect(indexCalls).toBeGreaterThan(0);
    expect(await clearGuestData(db)).toBe(1);
    expect([...db._store.keys()].sort()).toEqual(['2', '3']);
  });
});

describe('loadOwnerDocuments', () => {
  it('prefers getDocumentsByOwner and falls back to getAll', async () => {
    const indexed = fakeDb([{ id: '1', ownerId: 'u-1' }]);
    indexed.getDocumentsByOwner = async (ownerId) => [{ id: '1', ownerId }];
    expect(await loadOwnerDocuments(indexed, 'u-1')).toEqual([{ id: '1', ownerId: 'u-1' }]);

    const throwing = fakeDb([{ id: '2', ownerId: 'u-1' }]);
    throwing.getDocumentsByOwner = async () => { throw new Error('no such index'); };
    expect(await loadOwnerDocuments(throwing, 'u-1')).toEqual([{ id: '2', ownerId: 'u-1' }]);

    expect(await loadOwnerDocuments(null, 'u-1')).toEqual([]);
  });
});

describe('cloud-store mappers', () => {
  it('mapDocumentToRow carries the full doc for restore', () => {
    const doc = { id: 'd1', name: 'My Resume', type: 'resume', templateId: 't', lastModified: '2026-01-01T00:00:00.000Z' };
    const row = mapDocumentToRow(doc, 'u-1');
    expect(row).toMatchObject({ owner_id: 'u-1', doc_id: 'd1', name: 'My Resume', type: 'resume', template_id: 't' });
    expect(row.doc_data).toEqual(doc);
  });

  it('mapRowToDocument restores local shape with owner', () => {
    const row = {
      owner_id: 'u-1', doc_id: 'd1', name: 'My Resume', type: 'cv',
      template_id: 't2', last_modified: '2026-02-01T00:00:00.000Z',
      doc_data: { id: 'd1', name: 'Old', custom: 1 }
    };
    const doc = mapRowToDocument(row);
    expect(doc).toMatchObject({ id: 'd1', name: 'My Resume', type: 'cv', templateId: 't2', ownerId: 'u-1', custom: 1 });
  });

  it('mergeDocuments unions by id, newer lastModified wins', () => {
    const local = [
      { id: 'a', lastModified: '2026-01-01T00:00:00.000Z', v: 'local-old' },
      { id: 'b', lastModified: '2026-03-01T00:00:00.000Z', v: 'local-new' }
    ];
    const cloud = [
      { id: 'a', lastModified: '2026-02-01T00:00:00.000Z', v: 'cloud-new' },
      { id: 'c', lastModified: '2026-01-01T00:00:00.000Z', v: 'cloud-only' }
    ];
    const { merged, cloudNewer, localOnly } = mergeDocuments(local, cloud);
    expect(merged.find((d) => d.id === 'a').v).toBe('cloud-new');
    expect(merged.find((d) => d.id === 'b').v).toBe('local-new');
    expect(merged.find((d) => d.id === 'c').v).toBe('cloud-only');
    expect(cloudNewer.map((d) => d.id).sort()).toEqual(['a', 'c']);
    expect(localOnly.map((d) => d.id)).toEqual(['b']);
  });

  it('cloud ops no-op (never throw) when logged out / unconfigured', async () => {
    asGuest();
    await expect(fetchCloudDocuments()).resolves.toMatchObject({ ok: false });
    await expect(pushDocument({ id: 'x' })).resolves.toMatchObject({ ok: false });
    await expect(deleteCloudDocument('x')).resolves.toMatchObject({ ok: false });
  });
});
