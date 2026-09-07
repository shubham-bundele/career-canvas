import { describe, it, expect } from 'vitest';
import { LocalAI } from '../../src/js/modules/local-ai.js';

describe('LocalAI.cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = new Float32Array([1, 0, 0]);
    expect(LocalAI.cosineSimilarity(a, a)).toBeCloseTo(1);
  });
  it('returns 0 for orthogonal vectors', () => {
    expect(LocalAI.cosineSimilarity(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0);
  });
  it('returns 0 for zero vectors (no NaN)', () => {
    expect(LocalAI.cosineSimilarity(new Float32Array([0, 0]), new Float32Array([1, 1]))).toBe(0);
  });
});

describe('LocalAI preprocess/postprocess (deterministic)', () => {
  it('collapses whitespace and truncates', () => {
    expect(LocalAI.preprocess('a   b\nc', 3)).toBe('a b');
    expect(LocalAI.preprocess('')).toBe('');
  });
  it('postprocess trims and caps length', () => {
    expect(LocalAI.postprocess('  hello   world  ')).toBe('hello world');
    expect(LocalAI.postprocess('x'.repeat(5000), 100).length).toBe(100);
  });
  it('supported modes include semantic-match', () => {
    expect(LocalAI.isSupportedMode('summary')).toBe(true);
    expect(LocalAI.isSupportedMode('nope')).toBe(false);
  });
});
