import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResumeEditor } from '../../src/js/modules/editor.js';
import authState, { AUTH_STATUS } from '../../src/js/auth/auth-state.js';

function asGuest() {
  authState.update({ status: AUTH_STATUS.GUEST, user: null, session: null, isGuest: true, initialized: true });
}

function asUser(id = 'u-1') {
  authState.update({
    status: AUTH_STATUS.AUTHENTICATED,
    user: { id, email: 'test@example.com' },
    session: { access_token: 'x' },
    isGuest: false,
    initialized: true
  });
}

function makeEditor(doc, putImpl) {
  const ed = new ResumeEditor('d1', { put: putImpl || vi.fn(async () => 'd1') }, null, { emit: vi.fn() }, null, null);
  ed.document = doc;
  // Detached-DOM stubs (no querySelector matches, no parent).
  ed.container = { querySelector: () => null, parentNode: null };
  ed.toolbarEl = null;
  return ed;
}

describe('editor save guard', () => {
  beforeEach(() => {
    asGuest();
    globalThis.document = { addEventListener: () => {}, removeEventListener: () => {} };
    delete globalThis.window;
  });

  afterEach(() => {
    delete globalThis.document;
    delete globalThis.window;
  });

  it('hasUnsavedChanges reflects pending or in-flight saves', () => {
    const ed = makeEditor(null);
    ed.saveStatus = 'saved';
    expect(ed.hasUnsavedChanges()).toBe(false);
    ed.saveStatus = 'unsaved';
    expect(ed.hasUnsavedChanges()).toBe(true);
    ed.saveStatus = 'saving';
    expect(ed.hasUnsavedChanges()).toBe(true);
  });

  it('saves documents the current owner may see', async () => {
    const put = vi.fn(async () => 'd1');
    const ed = makeEditor({ id: 'd1', ownerId: 'guest' }, put);
    await ed.saveDocument();
    expect(put).toHaveBeenCalledTimes(1);
    expect(ed.saveStatus).toBe('saved');
  });

  it('blocks saving another account’s document and redirects', async () => {
    asUser('u-1');
    const toastShow = vi.fn();
    const navigate = vi.fn();
    globalThis.window = { CC: { toast: { show: toastShow }, router: { navigate } } };
    const put = vi.fn(async () => 'd1');
    const ed = makeEditor({ id: 'd1', ownerId: 'u-2' }, put);
    await ed.saveDocument();
    expect(put).not.toHaveBeenCalled();
    expect(ed.saveStatus).toBe('unsaved');
    expect(toastShow).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('ignores stray timer saves after destroy', async () => {
    const put = vi.fn(async () => 'd1');
    const ed = makeEditor({ id: 'd1', ownerId: 'guest' }, put);
    ed.container = null; // as destroy() leaves it
    await ed.saveDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('destroy flushes pending edits before teardown', async () => {
    const put = vi.fn(async () => 'd1');
    const ed = makeEditor({ id: 'd1', ownerId: 'guest' }, put);
    ed.saveStatus = 'unsaved';
    ed.destroy();
    await new Promise((r) => setTimeout(r, 0));
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('flushes pending saves when the tab is hidden or closed', async () => {
    const added = {};
    const removed = [];
    globalThis.document = {
      addEventListener: (e, h) => { added[e] = h; },
      removeEventListener: (e) => { removed.push(e); },
      visibilityState: 'visible'
    };
    globalThis.window = {
      addEventListener: (e, h) => { added[e] = h; },
      removeEventListener: (e) => { removed.push(e); }
    };
    const put = vi.fn(async () => 'd1');
    const ed = makeEditor({ id: 'd1', ownerId: 'guest' }, put);
    ed.attachEventListeners();
    ed.saveStatus = 'unsaved';
    added.visibilitychange();
    expect(put).not.toHaveBeenCalled();
    globalThis.document.visibilityState = 'hidden';
    added.visibilitychange();
    await new Promise((r) => setTimeout(r, 0));
    expect(put).toHaveBeenCalledTimes(1);
    ed.saveStatus = 'unsaved';
    added.pagehide();
    await new Promise((r) => setTimeout(r, 0));
    expect(put).toHaveBeenCalledTimes(2);
    ed.destroy();
    expect(removed).toContain('visibilitychange');
    expect(removed).toContain('pagehide');
  });
});
