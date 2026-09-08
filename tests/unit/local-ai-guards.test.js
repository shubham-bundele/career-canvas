import { describe, it, expect, beforeEach } from 'vitest';
import { AiFormatter } from '../../src/js/modules/ai-formatter.js';
import { LocalAI } from '../../src/js/modules/local-ai.js';

// Minimal localStorage stub for Node (browser provides the real one)
function stubStorage(values = {}) {
  const store = { ...values };
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  return store;
}

describe('AiFormatter.hasLocalOption', () => {
  it('false when nothing enabled', () => {
    stubStorage({});
    expect(AiFormatter.hasLocalOption()).toBe(false);
  });
  it('true when local AI enabled', () => {
    stubStorage({ cc_local_ai_enabled: 'true' });
    expect(AiFormatter.hasLocalOption()).toBe(true);
  });
  it('true when advanced AI enabled', () => {
    stubStorage({ cc_advanced_ai_enabled: 'true' });
    expect(AiFormatter.hasLocalOption()).toBe(true);
  });
});

describe('LocalAI guards (no model download)', () => {
  beforeEach(() => stubStorage({}));

  it('process throws when disabled', async () => {
    await expect(LocalAI.process('hello world this is long enough', 'summary')).rejects.toThrow(/not enabled/);
  });
  it('process throws for unsupported mode when enabled', async () => {
    stubStorage({ cc_local_ai_enabled: 'true' });
    await expect(LocalAI.process('some resume text here yes', 'cover-letter')).rejects.toThrow(/not supported/);
  });
  it('semantic-match requires a job description', async () => {
    stubStorage({ cc_local_ai_enabled: 'true' });
    await expect(LocalAI.process('resume text with enough length here', 'semantic-match', '')).rejects.toThrow(/job description/);
  });
  it('getEmbeddings returns null when disabled', async () => {
    await expect(LocalAI.getEmbeddings('hello')).resolves.toBe(null);
  });
});
