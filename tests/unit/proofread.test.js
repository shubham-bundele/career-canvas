import { describe, it, expect } from 'vitest';
import { proofread } from '../../src/js/utils/proofread.js';

describe('proofread confusions', () => {
  it('fixes could/would/should of', () => {
    const out = proofread('I could of led more');
    expect(out.some((i) => i.suggestion.includes('could have'))).toBe(true);
  });
  it('fixes alot, than/then, its/it\'s', () => {
    const out = proofread('Alot better then before, its a win');
    const sug = out.map((i) => i.suggestion).join(' ').toLowerCase();
    expect(sug).toContain('a lot');
    expect(sug).toContain('than');
    expect(sug).toContain("it's");
  });
  it('flags repeated words', () => {
    expect(proofread('the the team')[0].suggestion).toBe('the');
  });
  it('flags space before punctuation', () => {
    const out = proofread('great team , really');
    expect(out.some((i) => i.message.includes('punctuation'))).toBe(true);
  });
});

describe('proofread shape and limits', () => {
  it('returns [] for empty input and caps issues', () => {
    expect(proofread('')).toEqual([]);
    const long = Array(40).fill('alot').join(' ');
    expect(proofread(long).length).toBeLessThanOrEqual(15);
  });
  it('dedupes identical originals and keeps contract shape', () => {
    const out = proofread('alot alot');
    const keys = out.map((i) => i.original);
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of out) {
      expect(i).toHaveProperty('original');
      expect(i).toHaveProperty('suggestion');
      expect(i).toHaveProperty('message');
    }
  });
});
