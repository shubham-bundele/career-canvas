/**
 * Offline grammar proofer — deterministic, resume-domain rules.
 * No downloads, no network, runs instantly. Pure functions (Node-safe).
 *
 * Returns issues shaped like the cloud grammar contract:
 * [{ original, suggestion, message }]
 */
import { correctLine } from './text-parse.js';

const CONFUSIONS = [
  { re: /\bcould of\b/gi, fix: 'could have', msg: '"could of" should be "could have"' },
  { re: /\bwould of\b/gi, fix: 'would have', msg: '"would of" should be "would have"' },
  { re: /\bshould of\b/gi, fix: 'should have', msg: '"should of" should be "should have"' },
  { re: /\bmust of\b/gi, fix: 'must have', msg: '"must of" should be "must have"' },
  { re: /\balot\b/gi, fix: 'a lot', msg: '"alot" should be two words' },
  { re: /\brecieve\b/gi, fix: 'receive', msg: 'Spelling: "receive" (i before e)' },
  { re: /\bseperate\b/gi, fix: 'separate', msg: 'Spelling: "separate"' },
  { re: /\boccured\b/gi, fix: 'occurred', msg: 'Spelling: "occurred" (double r)' },
  { re: /\bmanagment\b/gi, fix: 'management', msg: 'Spelling: "management"' },
  { re: /\bexperiance\b/gi, fix: 'experience', msg: 'Spelling: "experience"' },
  { re: /\bmaintainance\b/gi, fix: 'maintenance', msg: 'Spelling: "maintenance"' },
  { re: /\bneccessary\b/gi, fix: 'necessary', msg: 'Spelling: "necessary"' },
  { re: /\baccomodate\b/gi, fix: 'accommodate', msg: 'Spelling: "accommodate"' },
  { re: /\byour welcome\b/gi, fix: "you're welcome", msg: '"your welcome" should be "you\'re welcome"' },
  { re: /\byour (is|are|was|were|going to|doing)\b/gi, fix: "you're $1", msg: 'Possibly "you\'re" (you are), not "your"' },
  { re: /\b(better|rather|more|less|greater|higher|lower|faster|stronger) then\b/gi, fix: '$1 than', msg: 'Comparison uses "than", not "then"' },
  { re: /\bits (a|an|been|very|so|quite|always|never|not)\b/gi, fix: "it's $1", msg: 'Contraction "it\'s" (it is), not possessive "its"' },
];

function preserveCase(original, replacement) {
  if (!original) return replacement;
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Proofread text with deterministic rules + vocabulary typo pass.
 * @param {string} text
 * @param {number} maxIssues
 * @returns {Array<{original,suggestion,message}>}
 */
export function proofread(text, maxIssues = 15) {
  const issues = [];
  if (!text || typeof text !== 'string') return issues;
  const push = (original, suggestion, message) => {
    if (issues.length >= maxIssues) return;
    if (!original || original === suggestion) return;
    if (issues.some((i) => i.original === original)) return; // dedupe
    issues.push({ original: original.slice(0, 120), suggestion: suggestion.slice(0, 160), message });
  };

  // 1) word confusions + classic misspellings
  for (const { re, fix, msg } of CONFUSIONS) {
    const single = new RegExp(re.source, 'i'); // non-global: build one fix per match
    for (const m of String(text).matchAll(re)) {
      if (issues.length >= maxIssues) break;
      const fixed = m[0].replace(single, (...args) => {
        // rebuild replacement honoring $1 groups and case of first char
        let out = fix;
        for (let i = 1; i < args.length - 2; i++) out = out.replace('$' + i, args[i] || '');
        return preserveCase(m[0], out);
      });
      push(m[0], fixed, msg);
    }
  }

  // 2) repeated words: "the the", "and and"
  {
    const re = /\b([a-zA-Z']+)\s+\1\b/g;
    let m;
    while ((m = re.exec(text)) && issues.length < maxIssues) {
      push(m[0], m[1], 'Repeated word — remove one');
    }
  }

  // 3) space before punctuation + double spaces
  {
    const re = /\s+([,.!?;:])/g;
    let m;
    while ((m = re.exec(text)) && issues.length < maxIssues) {
      push(m[0], m[1], 'No space before punctuation');
    }
    const dbl = text.match(/[^ ]  +[^ ]/);
    if (dbl) push(dbl[0].trim().slice(0, 40), dbl[0].replace(/\s{2,}/g, ' ').trim().slice(0, 40), 'Multiple spaces — use one');
  }

  // 4) sentence capitalization after ". "
  {
    const re = /(^|[.!?]\s+)([a-z])/g;
    let m;
    let n = 0;
    while ((m = re.exec(text)) && issues.length < maxIssues && n < 5) {
      n++;
      // skip the very first char (resume fragments often start lowercase legitimately)
      if (m.index === 0) continue;
      push((m[1] + m[2]).slice(-12), (m[1] + m[2].toUpperCase()).slice(-12), 'Capitalize the start of a sentence');
    }
  }

  // 5) vocabulary typo pass (imports resume dictionary, skips names/URLs/acronyms)
  if (issues.length < maxIssues) {
    for (const line of String(text).split('\n')) {
      const r = correctLine(line);
      if (r.corrections > 0) {
        push(line.trim().slice(0, 120), r.line.trim().slice(0, 160), 'Spelling corrected');
        if (issues.length >= maxIssues) break;
      }
    }
  }

  return issues;
}

export default { proofread };
