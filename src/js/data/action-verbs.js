/**
 * Shared action-verb vocabulary (single source of truth).
 * Previously duplicated across ats-checker, smart-formatter and job-matcher
 * with disagreeing lists — import from here instead.
 */

/** Past-tense action verbs suitable for starting resume bullets. */
export const ACTION_VERBS = [
  'accelerated', 'achieved', 'administered', 'analyzed', 'architected', 'authored',
  'automated', 'built', 'centralized', 'championed', 'collaborated', 'completed',
  'conducted', 'consolidated', 'constructed', 'converted', 'created', 'curated',
  'customized', 'debugged', 'decreased', 'delivered', 'demonstrated', 'designed',
  'developed', 'devised', 'diagnosed', 'directed', 'drafted', 'drove',
  'eliminated', 'empowered', 'engineered', 'enhanced', 'established', 'executed',
  'expanded', 'expedited', 'formulated', 'fostered', 'generated', 'grew',
  'guided', 'identified', 'illustrated', 'implemented', 'improved', 'increased',
  'initiated', 'innovated', 'inspected', 'instituted', 'instructed', 'launched',
  'led', 'managed', 'mentored', 'migrated', 'modernized', 'negotiated',
  'optimized', 'orchestrated', 'organized', 'oversaw', 'performed', 'pioneered',
  'planned', 'produced', 'reduced', 'refactored', 'resolved', 'restructured',
  'scaled', 'spearheaded', 'standardized', 'streamlined', 'strengthened',
  'structured', 'supervised', 'surpassed', 'synthesized', 'trained',
  'transformed', 'validated',
];

const ACTION_VERB_SET = new Set(ACTION_VERBS);

/** Weak bullet openings to flag. */
export const WEAK_STARTS = [
  'responsible for', 'helped with', 'assisted in', 'worked on', 'was involved',
  'participated in', 'duties included', 'tasked with', 'in charge of', 'handled',
];

/** Base-form verbs for matching job-description vocabulary (job-matcher categories). */
export const MATCH_VERBS = [
  'accelerate', 'achieve', 'administer', 'analyze', 'architect', 'automate',
  'build', 'centralize', 'champion', 'collaborate', 'complete', 'conduct',
  'consolidate', 'construct', 'convert', 'coordinate', 'create', 'curate',
  'customize', 'debug', 'decrease', 'deliver', 'demonstrate', 'deploy',
  'design', 'develop', 'devise', 'diagnose', 'direct', 'draft', 'drive',
  'eliminate', 'empower', 'engineer', 'enhance', 'establish', 'evaluate',
  'execute', 'expand', 'expedite', 'facilitate', 'formulate', 'foster',
  'generate', 'grow', 'guide', 'identify', 'illustrate', 'implement',
  'improve', 'increase', 'initiate', 'innovate', 'inspect', 'institute',
  'instruct', 'integrate', 'launch', 'lead', 'maintain', 'manage', 'mentor',
  'migrate', 'modernize', 'negotiate', 'optimize', 'orchestrate', 'organize',
  'oversee', 'perform', 'pioneer', 'plan', 'produce', 'reduce', 'refactor',
  'resolve', 'restructure', 'scale', 'spearhead', 'standardize', 'streamline',
  'strengthen', 'structure', 'supervise', 'surpass', 'synthesize', 'train',
  'transform', 'validate',
];

const MATCH_VERB_SET = new Set(MATCH_VERBS);

/** First word of a bullet (lowercased, punctuation stripped). */
export function firstWord(text) {
  const m = String(text || '').trim().match(/^[\s"'“‘(•·\-*]*([A-Za-z'-]+)/);
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
