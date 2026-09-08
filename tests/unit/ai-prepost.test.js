import { describe, it, expect } from 'vitest';
import { AiFormatter } from '../../src/js/modules/ai-formatter.js';

describe('AiFormatter._parseJSON preprocessing', () => {
  const f = new AiFormatter('test');
  it('parses clean JSON array', () => {
    expect(f._parseJSON('["a","b"]')).toEqual(['a', 'b']);
  });
  it('strips markdown fences', () => {
    expect(f._parseJSON('```json\n["x"]\n```')).toEqual(['x']);
  });
  it('recovers JSON with leading prose', () => {
    expect(f._parseJSON('Here you go: ["a"]')).toEqual(['a']);
  });
  it('throws on garbage', () => {
    expect(() => f._parseJSON('not json at all {{{')).toThrow();
  });
});

describe('AiFormatter.getSystemPrompts postprocessing contract', () => {
  it('covers core modes with {{text}} wrapper', () => {
    for (const m of ['summary', 'improve', 'cover-letter', 'grammar', 'condense', 'parse']) {
      const p = AiFormatter.getSystemPrompts(m, 'ctx');
      expect(p.system.length).toBeGreaterThan(5);
      expect(p.userWrapper).toContain('{{text}}');
    }
  });
  it('falls back for unknown mode', () => {
    const p = AiFormatter.getSystemPrompts('nope');
    expect(p.userWrapper).toContain('{{text}}');
  });
});

describe('AiFormatter output sanity (hallucination/toxicity guard)', () => {
  it('flags toxic content', () => {
    expect(AiFormatter.containsToxicity('you should kill yourself')).toBe(true);
    expect(AiFormatter.containsToxicity('Led team of 5 engineers')).toBe(false);
  });
  it('sanitizeOutput truncates and blocks', () => {
    expect(AiFormatter.sanitizeOutput('ok')).toBe('ok');
    expect(AiFormatter.sanitizeOutput('x'.repeat(9000), 100).length).toBe(100);
    expect(AiFormatter.sanitizeOutput('kill yourself now')).toContain('[blocked');
  });
  it('improveText rejects short input without network', async () => {
    const f2 = new AiFormatter('');
    // short-circuit: empty key + server unreachable still returns input for <5 chars
    await expect(f2.improveText('hi')).resolves.toBe('hi');
  });
});
