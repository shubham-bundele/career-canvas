import { describe, it, expect } from 'vitest';
import { ATSChecker } from '../../src/js/modules/ats-checker.js';
import { PrintManager } from '../../src/js/modules/print-manager.js';
import { createEmptyDocument } from '../../src/js/core/schema.js';

describe('ATS 2026 guidance', () => {
  it('accepts Garamond as ATS-safe font', () => {
    const checker = new ATSChecker();
    const res = checker.checkFonts({ fontFamily: 'Garamond, serif' });
    expect(res.status).toBe('pass');
  });

  it('rejects decorative font', () => {
    const checker = new ATSChecker();
    const res = checker.checkFonts({ fontFamily: 'Comic Sans MS' });
    expect(res.status).toBe('warning');
    expect(res.suggestion).toMatch(/Garamond/);
  });
});

describe('PrintManager sections shape', () => {
  it('handles object-form sections (schema shape)', () => {
    const pm = new PrintManager();
    const doc = createEmptyDocument('resume');
    // createEmptyDocument uses object sections in current schema
    const issues = pm.validateBeforePrint(null, doc);
    const emptyErr = issues.find(i => i.message.includes('nearly empty'));
    expect(emptyErr).toBeUndefined();
  });

  it('flags truly empty document', () => {
    const pm = new PrintManager();
    const issues = pm.validateBeforePrint(null, {
      personalInfo: {},
      sections: {},
    });
    expect(issues.some(i => i.type === 'error')).toBe(true);
  });
});

describe('ImportManager lifecycle', () => {
  it('exposes destroy() that clears draft timer', async () => {
    const { ImportManager } = await import('../../src/js/modules/import-manager.js');
    const im = new ImportManager(null);
    im._draftTimer = setInterval(() => {}, 1000);
    im.destroy();
    expect(im._draftTimer).toBeNull();
  });
});
