import { describe, it, expect } from 'vitest';
import { ImportManager } from '../../src/js/modules/import-manager.js';

describe('computeFileFingerprint', () => {
  const mgr = new ImportManager({});
  it('is deterministic and content-sensitive', () => {
    const a = mgr.computeFileFingerprint('hello world');
    expect(mgr.computeFileFingerprint('hello world')).toBe(a);
    expect(mgr.computeFileFingerprint('hello worle')).not.toBe(a);
  });
  it('detects changes past the old 5000-char window', () => {
    const base = 'x'.repeat(6000);
    expect(mgr.computeFileFingerprint(base)).not.toBe(mgr.computeFileFingerprint(base + 'y'));
  });
  it('hashes binary buffers', () => {
    const a = mgr.computeFileFingerprint(new Uint8Array([1, 2, 3]));
    const b = mgr.computeFileFingerprint(new Uint8Array([1, 2, 4]));
    expect(a).not.toBe(b);
    expect(typeof a).toBe('string');
  });
});

describe('_duplicateGate', () => {
  it('skips the dialog in batch mode', async () => {
    const mgr = new ImportManager({});
    mgr._batchMode = true;
    await expect(mgr._duplicateGate('fp', 'a.pdf')).resolves.toEqual({ proceed: true });
    mgr._batchMode = false;
  });
});

describe('importFromURL validation', () => {
  const mgr = new ImportManager({});
  it('rejects garbage and non-http links without network', async () => {
    await expect(mgr.importFromURL('not a url')).rejects.toThrow(/valid link/);
    await expect(mgr.importFromURL('ftp://x.com/a.pdf')).rejects.toThrow(/http/);
  });
});
