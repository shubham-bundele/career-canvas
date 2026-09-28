import { describe, it, expect } from 'vitest';
import { AiFormatter } from '../../src/js/modules/ai-formatter.js';

// Every mode the server proxy supports (api/ai-analyze.js) must have a
// dedicated direct-key prompt — otherwise bring-your-own-key users get a
// generic JSON-array answer for text modes (translate/cover-letter/tone…).
const SERVER_MODES = [
  'summary', 'improve', 'generate-bullets', 'extract-skills', 'cover-letter',
  'grammar', 'jd-enhance', 'tone', 'interview-prep', 'parse-linkedin',
  'resume-from-jd', 'condense', 'skill-evidence', 'bulk-improve',
  'follow-up-email', 'translate', 'analyze', 'resume-score',
  'keyword-optimization', 'ats-fix', 'parse'
];

describe('AiFormatter.getSystemPrompts full mode coverage', () => {
  it('covers every server mode with a {{text}} wrapper', () => {
    for (const m of SERVER_MODES) {
      const p = AiFormatter.getSystemPrompts(m, 'Deutsch');
      expect(p.system.length, m).toBeGreaterThan(10);
      expect(p.userWrapper, m).toContain('{{text}}');
    }
  });

  it('text modes do not demand JSON arrays', () => {
    for (const m of ['summary', 'improve', 'cover-letter', 'tone', 'interview-prep', 'follow-up-email', 'translate']) {
      const p = AiFormatter.getSystemPrompts(m, 'Deutsch');
      expect(p.system, m).not.toMatch(/JSON array/i);
    }
  });

  it('translate honors the target language context', () => {
    expect(AiFormatter.getSystemPrompts('translate', 'Deutsch').system).toContain('Deutsch');
    expect(AiFormatter.getSystemPrompts('translate', '').system).toContain('Spanish');
  });

  it('resume-score expects a score object, ats-fix mirrors keyword-optimization', () => {
    expect(AiFormatter.getSystemPrompts('resume-score').system).toContain('score');
    expect(AiFormatter.getSystemPrompts('ats-fix').system).toBe(
      AiFormatter.getSystemPrompts('keyword-optimization').system
    );
  });

  it('resume-from-jd expects a skeleton object (not an array)', () => {
    const p = AiFormatter.getSystemPrompts('resume-from-jd');
    expect(p.system).toContain('"title"');
    expect(p.system).not.toMatch(/JSON array/i);
  });
});

describe('AiFormatter._callDirectWithMode routing', () => {
  it('sends mode-specific prompts instead of the generic array prompt', async () => {
    const f = new AiFormatter('gsk_testkey');
    const calls = [];
    f._callDirect = async (system, user) => { calls.push({ system, user }); return 'ok'; };
    await f._callDirectWithMode(' Skills: JS ', 'translate', 'Deutsch');
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toContain('Deutsch');
    expect(calls[0].system).not.toMatch(/JSON array/i);
    expect(calls[0].user).toContain('Skills: JS');
  });

  it('keeps JSON contracts for parse and resume-score', async () => {
    const f = new AiFormatter('gsk_testkey');
    const calls = [];
    f._callDirect = async (system, user) => { calls.push({ system, user }); return '{}'; };
    await f._callDirectWithMode('John Doe', 'parse');
    await f._callDirectWithMode('John Doe', 'resume-score');
    expect(calls[0].system).toMatch(/JSON/i);
    expect(calls[1].system).toContain('score');
  });
});
