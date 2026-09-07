import { describe, it, expect } from 'vitest';
import { LocalAI } from '../../src/js/modules/local-ai.js';
import { AdvancedLocalAI } from '../../src/js/modules/advanced-local-ai.js';

describe('LocalAI.chunkText', () => {
  it('passes short text through as one chunk', () => {
    expect(LocalAI.chunkText('hello world')).toEqual(['hello world']);
    expect(LocalAI.chunkText('')).toEqual([]);
  });
  it('splits long text on word boundaries', () => {
    const text = Array(500).fill('word').join(' ');
    const chunks = LocalAI.chunkText(text, 500);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ')).toBe(text);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(600);
  });
});

describe('AdvancedLocalAI.collectStream', () => {
  async function* fakeStream() {
    yield { choices: [{ delta: { content: 'Hello' } }] };
    yield { choices: [{ delta: { content: ' world' } }] };
    yield { choices: [{ delta: {} }] };
  }
  it('accumulates deltas and calls onToken', async () => {
    const seen = [];
    const full = await AdvancedLocalAI.collectStream(fakeStream(), (d, f) => seen.push([d, f]));
    expect(full).toBe('Hello world');
    expect(seen).toEqual([['Hello', 'Hello'], [' world', 'Hello world']]);
  });
  it('works without a callback', async () => {
    await expect(AdvancedLocalAI.collectStream(fakeStream())).resolves.toBe('Hello world');
  });
});
