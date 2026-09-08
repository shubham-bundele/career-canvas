import { describe, it, expect } from 'vitest';
import { scoreBullet, scoreBullets } from '../../src/js/utils/bullet-score.js';
import { firstWord, startsWithActionVerb, startsWeak, isMatchVerb, ACTION_VERBS } from '../../src/js/data/action-verbs.js';

describe('action-verbs vocabulary', () => {
  it('has a consolidated unique list', () => {
    expect(ACTION_VERBS.length).toBeGreaterThan(30);
    expect(new Set(ACTION_VERBS).size).toBe(ACTION_VERBS.length);
    for (const v of ['led', 'built', 'spearheaded', 'orchestrated', 'mentored']) {
      expect(ACTION_VERBS).toContain(v);
    }
  });
  it('firstWord strips quotes and punctuation', () => {
    expect(firstWord('"Led" team')).toBe('led');
    expect(firstWord('  Built: system')).toBe('built');
  });
  it('detects strong vs weak starts', () => {
    expect(startsWithActionVerb('Led a team of five')).toBe(true);
    expect(startsWithActionVerb('Responsible for testing')).toBe(false);
    expect(startsWeak('Responsible for testing')).toBe(true);
    expect(startsWeak('Led a team')).toBe(false);
  });
  it('matches JD base verbs', () => {
    expect(isMatchVerb('Streamline')).toBe(true);
    expect(isMatchVerb('banana')).toBe(false);
  });
});

describe('scoreBullet', () => {
  it('rewards verb + metric, penalizes weak and short', () => {
    const good = scoreBullet('Led migration of 40 services to AWS, cutting costs 30%');
    expect(good.score).toBeGreaterThanOrEqual(80);
    expect(good.hasVerb).toBe(true);
    const weak = scoreBullet('Responsible for stuff');
    expect(weak.score).toBeLessThan(60);
    expect(weak.tips.length).toBeGreaterThan(0);
  });
  it('flags buzzwords and long bullets', () => {
    const b = scoreBullet('Synergy ninja guru who did things and stuff for a very long time across many teams and projects in the company');
    expect(b.score).toBeLessThan(70);
    expect(b.tips.join(' ').toLowerCase()).toContain('buzzword');
  });
  it('handles empty input', () => {
    expect(scoreBullet('').score).toBe(0);
  });
  it('scoreBullets filters blanks', () => {
    expect(scoreBullets(['Led x', '', null, '  ']).length).toBe(1);
  });
});
