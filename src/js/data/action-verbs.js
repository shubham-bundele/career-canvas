/**
 * Shared action-verb vocabulary (single source of truth).
 * Previously duplicated across ats-checker, smart-formatter and job-matcher
 * with disagreeing lists — import from here instead.
 */

/** Past-tense action verbs suitable for starting resume bullets. */
export const ACTION_VERBS = [
  'accelerated', 'achieved', 'administered', 'analyzed', 'architected', 'authored',
  'automated', 'built', 'championed', 'completed', 'conducted', 'created',
  'decreased', 'delivered', 'demonstrated', 'designed', 'developed', 'directed',
  'drove', 'engineered', 'enhanced', 'established', 'executed', 'expanded',
  'generated', 'grew', 'implemented', 'improved', 'increased', 'initiated',
  'launched', 'led', 'managed', 'mentored', 'migrated', 'optimized', 'orchestrated',
  'organized', 'oversaw', 'performed', 'pioneered', 'planned', 'produced',
  'reduced', 'resolved', 'scaled', 'spearheaded', 'streamlined', 'strengthened',
  'structured', 'supervised', 'transformed',
];

const ACTION_VERB_SET = new Set(ACTION_VERBS);

/** Weak bullet openings to flag. */
export const WEAK_STARTS = [
  'responsible for', 'helped with', 'assisted in', 'worked on', 'was involved',
  'participated in', 'duties included', 'tasked with', 'in charge of', 'handled',
];

/** Base-form verbs for matching job-description vocabulary (job-matcher categories). */
export const MATCH_VERBS = [
  'manage', 'develop', 'implement', 'design', 'lead', 'analyze', 'build', 'create',
  'optimize', 'maintain', 'architect', 'deploy', 'integrate', 'automate', 'deliver',
  'coordinate', 'establish', 'evaluate', 'facilitate', 'mentor', 'oversee',
  'spearhead', 'streamline', 'transform',
];

const MATCH_VERB_SET = new Set(MATCH_VERBS);

/** First word of a bullet (lowercased, punctuation stripped). */
export function firstWord(text) {
  const m = String(text || '').trim().match(/^["'“‘(]*([A-Za-z'-]+)/);
  return m ? m[1].toLowerCase() : '';
}

/** True when a bullet starts with a strong action verb. */
export function startsWithActionVerb(text) {
  return ACTION_VERB_SET.has(firstWord(text));
}

/** True when a bullet starts with a known weak opening. */
export function startsWeak(text) {
  const lower = String(text || '').trim().toLowerCase();
  return WEAK_STARTS.some((w) => lower.startsWith(w));
}

/** True when a word is a base-form responsibility verb (JD vocabulary). */
export function isMatchVerb(word) {
  return MATCH_VERB_SET.has(String(word || '').toLowerCase());
}
