/**
 * Offline bullet-strength scorer — deterministic resume-domain heuristics.
 * Pure functions (Node-safe). Used to supplement AI analysis instantly
 * and offline; shares vocabulary with ../data/action-verbs.js.
 */
import { startsWithActionVerb, startsWeak, firstWord } from '../data/action-verbs.js';

const BUZZWORDS = [
  'synergy', 'synergize', 'synergized', 'guru', 'ninja', 'rockstar',
  'hard worker', 'team player', 'go-getter', 'self-starter', 'detail oriented',
];

const METRIC_RE = /(%|\$|€|£|₹|\bmillion\b|\bbillion\b|\bthousand\b|\bk\b|\bx\b)/i;
const DIGIT_RE = /\d/;

/**
 * Score a single bullet (0-100) with actionable tips.
 */
export function scoreBullet(text) {
  const t = String(text || '').trim();
  const tips = [];
  if (!t) return { score: 0, tips: ['Empty bullet — write an achievement or remove it'], hasVerb: false };

  let score = 100;
  const hasVerb = startsWithActionVerb(t);
  if (!hasVerb) {
    score -= 35;
    tips.push(`Start with a strong action verb (e.g. "Led", "Built", "Improved") — currently starts with "${firstWord(t) || '…'}"`);
  }
  if (startsWeak(t)) {
    score -= 15;
    tips.push('Avoid weak openings like "responsible for" — lead with the achievement');
  }
  const hasMetric = METRIC_RE.test(t) || DIGIT_RE.test(t);
  if (!hasMetric) {
    score -= 20;
    tips.push('Add a metric (%, $, time saved, team size) to prove impact');
  }
  if (t.length > 200) {
    score -= 10;
    tips.push('Over 200 characters — split into two bullets or condense');
  } else if (t.length < 30) {
    score -= 15;
    tips.push('Very short — add context, scope, or result');
  }
  const lower = t.toLowerCase();
  const found = BUZZWORDS.filter((b) => lower.includes(b));
  if (found.length > 0) {
    score -= Math.min(20, 10 * found.length);
    tips.push(`Replace buzzword${found.length > 1 ? 's' : ''} (${found.join(', ')}) with concrete achievements`);
  }

  return { score: Math.max(0, score), tips, hasVerb, hasMetric };
}

/** Score many bullets; returns [{ text, score, tips }]. */
export function scoreBullets(lines) {
  return (lines || [])
    .map((l) => (typeof l === 'string' ? l : l?.text || ''))
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => ({ text, ...scoreBullet(text) }));
}

export default { scoreBullet, scoreBullets };
