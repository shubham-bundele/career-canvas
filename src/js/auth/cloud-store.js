/**
 * CloudStore — optional Supabase persistence for authenticated users' documents.
 *
 * Design (offline-first, non-blocking):
 * - IndexedDB stays the source of truth. Every write path already persists
 *   locally; this module mirrors documents to the `user_documents` table when
 *   (and only when) a configured Supabase backend + signed-in session exist.
 * - Every function is best-effort: on any failure (offline, unconfigured,
 *   RLS/policy error) it returns `{ ok: false, ... }` and NEVER throws, so
 *   callers can fire-and-forget without breaking local flows.
 * - Guests never touch the cloud: all entry points no-op unless
 *   `authState.isAuthenticated()` is true.
 *
 * Row shape (`public.user_documents`):
 *   { owner_id uuid, doc_id text, name, type, template_id, doc_data jsonb,
 *     created_at, updated_at, last_modified }
 */

import { getAuthConfig } from './auth-config.js';
import authState from './auth-state.js';
import { getSupabaseClient } from './auth-service.js';

/**
 * Maps a local document to a Supabase row. Pure (unit-tested).
 * @param {Object} doc - Local document (must have `id`)
 * @param {string} ownerId - Authenticated user's id
 * @returns {Object} Row for `user_documents`
 */
export function mapDocumentToRow(doc, ownerId) {
  const d = doc || {};
  return {
    owner_id: ownerId,
    doc_id: String(d.id || ''),
    name: d.name || 'Untitled',
    type: d.type || 'resume',
    template_id: d.templateId || (d.design && d.design.template) || null,
    doc_data: d,
    last_modified: d.lastModified || new Date().toISOString()
  };
}

/**
 * Maps a Supabase row back to a local document. Pure (unit-tested).
 * @param {Object} row
 * @returns {Object} Local-shaped document with `ownerId` set
 */
export function mapRowToDocument(row) {
  const data = (row && row.doc_data) || {};
  return {
    ...data,
    id: (row && row.doc_id) || data.id,
    name: (row && row.name) || data.name || 'Untitled',
    type: (row && row.type) || data.type || 'resume',
    templateId: (row && row.template_id) || data.templateId,
    lastModified: (row && row.last_modified) || data.lastModified,
    ownerId: row && row.owner_id
  };
}

/**
 * Merges local + cloud document lists by id; newer `lastModified` wins.
 * Pure (unit-tested).
 * @param {Array} localDocs
 * @param {Array} cloudDocs
 * @returns {{ merged: Array, cloudNewer: Array, localOnly: Array }}
 */
export function mergeDocuments(localDocs, cloudDocs) {
  const byId = new Map();
  for (const d of localDocs || []) {
    if (d && d.id) byId.set(String(d.id), d);
  }
  const cloudIds = new Set();
  const cloudNewer = [];
  for (const c of cloudDocs || []) {
    if (!c || !c.id) continue;
    const key = String(c.id);
    cloudIds.add(key);
    const local = byId.get(key);
    if (!local) {
      byId.set(key, c);
      cloudNewer.push(c);
    } else {
      const lt = new Date(local.lastModified || 0).getTime();
      const ct = new Date(c.lastModified || 0).getTime();
      if (ct > lt) {
        byId.set(key, c);
        cloudNewer.push(c);
      }
    }
  }
  const merged = [...byId.values()];
  const localOnly = merged.filter((d) => d && !cloudIds.has(String(d.id)));
  return { merged, cloudNewer, localOnly };
}

/**
 * True when a cloud round-trip is worth attempting. Never throws.
 * @returns {Promise<boolean>}
 */
export async function isCloudSyncAvailable() {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    const config = getAuthConfig();
    if (!config || !config.configured) return false;
    if (!authState.isAuthenticated()) return false;
    const sb = await getSupabaseClient();
    return !!sb;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches the signed-in user's documents from the cloud.
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string, documents: Array }>}
 */
export async function fetchCloudDocuments() {
  try {
    if (!authState.isAuthenticated()) return { ok: false, skipped: true, documents: [] };
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, skipped: true, documents: [] };
    const { data, error } = await sb
      .from('user_documents')
      .select('*')
      .order('last_modified', { ascending: false });
    if (error) return { ok: false, error: error.message, documents: [] };
    return { ok: true, documents: (data || []).map(mapRowToDocument) };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Cloud fetch failed', documents: [] };
  }
}

/**
 * Upserts one document to the cloud (insert or update by owner+doc id).
 * @param {Object} doc - Local document
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function pushDocument(doc) {
  try {
    const user = authState.getUser();
    const ownerId = user && user.id;
    if (!ownerId) return { ok: false, skipped: true };
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, skipped: true };
    if (!doc || !doc.id) return { ok: false, error: 'Missing document id' };
    const row = mapDocumentToRow({ ...doc, ownerId }, ownerId);
    const { error } = await sb
      .from('user_documents')
      .upsert(row, { onConflict: 'owner_id,doc_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Cloud push failed' };
  }
}

/**
 * Deletes one document from the cloud by local doc id.
 * @param {string} docId
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function deleteCloudDocument(docId) {
  try {
    const user = authState.getUser();
    const ownerId = user && user.id;
    if (!ownerId) return { ok: false, skipped: true };
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, skipped: true };
    const { error } = await sb
      .from('user_documents')
      .delete()
      .eq('owner_id', ownerId)
      .eq('doc_id', String(docId));
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Cloud delete failed' };
  }
}
