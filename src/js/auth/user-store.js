/**
 * UserStore — per-user document ownership helpers.
 *
 * Contract:
 * - Authenticated users own their documents (`ownerId === user.id`). They see
 *   only their own saved resumes on the dashboard; saves persist locally
 *   (IndexedDB) and, when cloud sync is available, to Supabase.
 * - Guests (`ownerId === 'guest'`) can build/edit during the session, but
 *   guest documents are temporary: they are never synced and are cleared on
 *   auth transitions (sign-in / sign-up / sign-out). See `clearGuestData()`.
 * - Documents written before ownership existed have no `ownerId` (legacy).
 *   They stay visible to everyone until an authenticated user adopts them
 *   (see `adoptLegacyDocuments()`), so nobody loses work on upgrade.
 *
 * This module is DOM-free and Node-safe (unit-tested via vitest).
 */

import authState, { AUTH_STATUS } from './auth-state.js';

export const GUEST_OWNER_ID = 'guest';

/**
 * Returns the owner id for the current session: the authenticated user's id,
 * or `'guest'` when signed out / in guest mode.
 * @returns {string}
 */
export function getCurrentOwnerId() {
  const state = authState.get();
  if (state.status === AUTH_STATUS.AUTHENTICATED && state.user && state.user.id) {
    return state.user.id;
  }
  return GUEST_OWNER_ID;
}

/**
 * True when the current session belongs to a signed-in user.
 * @returns {boolean}
 */
export function isAuthenticatedSession() {
  return getCurrentOwnerId() !== GUEST_OWNER_ID;
}

/**
 * Returns a copy of `doc` tagged with `ownerId` (defaults to current owner).
 * Never mutates the input.
 * @param {Object} doc
 * @param {string} [ownerId]
 * @returns {Object}
 */
export function withOwner(doc, ownerId) {
  const owner = ownerId || getCurrentOwnerId();
  return { ...(doc || {}), ownerId: owner };
}

/**
 * Visibility rule for a single document.
 * Legacy documents without `ownerId` are visible to everyone (adopted later).
 * @param {Object} doc
 * @param {string} ownerId
 * @returns {boolean}
 */
export function isVisibleToOwner(doc, ownerId) {
  if (!doc) return false;
  if (!doc.ownerId) return true;
  return doc.ownerId === ownerId;
}

/**
 * Filters a document list down to what `ownerId` may see.
 * Pure — does not mutate the input array.
 * @param {Array} docs
 * @param {string} ownerId
 * @returns {Array}
 */
export function filterDocumentsByOwner(docs, ownerId) {
  return (docs || []).filter((d) => isVisibleToOwner(d, ownerId));
}

/**
 * Loads the documents `ownerId` may see, preferring the IndexedDB `ownerId`
 * index (`db.getDocumentsByOwner`, DB v5+) and falling back to a full scan
 * on older databases or index-less db doubles (tests, mocks).
 * @param {Object} db - Database wrapper with getAll (+ optional getDocumentsByOwner)
 * @param {string} ownerId
 * @returns {Promise<Array>}
 */
export async function loadOwnerDocuments(db, ownerId) {
  if (db && typeof db.getDocumentsByOwner === 'function') {
    try {
      const docs = await db.getDocumentsByOwner(ownerId);
      if (Array.isArray(docs)) return docs;
    } catch (e) { /* fall through to full scan */ }
  }
  try {
    return (await db.getAll('documents')) || [];
  } catch (e) {
    return [];
  }
}
/**
 * Tags legacy (untagged) documents with `ownerId` and persists them.
 * Called once per authenticated dashboard load so pre-existing local work
 * becomes part of the signed-in user's saved resumes.
 * @param {Object} db - Database wrapper with get/put
 * @param {Array} docs - Documents loaded from the local store
 * @param {string} ownerId
 * @returns {Promise<number>} Number of adopted documents
 */
export async function adoptLegacyDocuments(db, docs, ownerId) {
  if (!db || !ownerId || ownerId === GUEST_OWNER_ID) return 0;
  const legacy = (docs || []).filter((d) => d && !d.ownerId);
  let adopted = 0;
  for (const doc of legacy) {
    try {
      await db.put('documents', { ...doc, ownerId });
      adopted += 1;
    } catch (e) { /* keep going — adoption is best-effort */ }
  }
  return adopted;
}

/**
 * Counts temporary guest documents in the local store. Used to warn guests
 * before a sign-in transition wipes their unsaved work.
 * @param {Object} db - Database wrapper with getAll
 * @returns {Promise<number>}
 */
export async function countGuestDocuments(db) {
  if (!db) return 0;
  const docs = await loadOwnerDocuments(db, GUEST_OWNER_ID);
  return docs.filter((d) => d && d.ownerId === GUEST_OWNER_ID).length;
}

/**
 * Deletes guest-tagged documents from the local store. Called on auth
 * transitions (sign-in / sign-up session / sign-out) so guest work is never
 * kept as saved data. Legacy untagged documents are NOT deleted here — they
 * are adopted by `adoptLegacyDocuments()` instead.
 * @param {Object} db - Database wrapper with getAll/delete
 * @returns {Promise<number>} Number of removed documents
 */
export async function clearGuestData(db) {
  if (!db) return 0;
  let removed = 0;
  const docs = await loadOwnerDocuments(db, GUEST_OWNER_ID);
  for (const doc of docs || []) {
    if (doc && doc.ownerId === GUEST_OWNER_ID) {
      try {
        await db.delete('documents', doc.id);
        removed += 1;
      } catch (e) { /* keep going */ }
    }
  }
  return removed;
}
