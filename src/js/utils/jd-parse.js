/**
 * Job-description parsing + lightweight resume-vs-JD scoring (pure, Node-safe).
 * Used by the editor JD modal, job-matcher extensions, and seniority checks.
 * No DOM, no network.
 */

const REQUIRE_CUES = [
  'must have', 'must-have', 'required', 'requirement', 'requirements',
  'essential', 'mandatory', 'minimum', 'at least', 'non-negotiable', 'need to have',
];
const PREFER_CUES = [
  'preferred', 'nice to have', 'nice-to-have', 'bonus', 'plus', 'desired',
  'advantage', 'ideal candidate', 'would be great', 'beneficial',
];

// Compact skill vocabulary for JD skill spotting (checked as whole tokens).
const SKILL_VOCAB = [
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'react', 'angular', 'vue', 'node.js', 'node', 'express', 'django',
  'flask', 'spring', 'laravel', '.net', 'sql', 'postgresql', 'mysql', 'mongodb',
  'redis', 'elasticsearch', 'graphql', 'rest', 'aws', 'azure', 'gcp', 'docker',
  'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'git', 'linux', 'figma', 'photoshop',
  'selenium', 'playwright', 'cypress', 'jest', 'pytest', 'jira', 'confluence',
  'tableau', 'power bi', 'excel', 'salesforce', 'hubspot', 'sap', 'oracle',
  'machine learning', 'deep learning', 'data analysis', 'data science', 'nlp',
  'project management', 'agile', 'scrum', 'kanban', 'pmp', ' six sigma',
  'digital marketing', 'seo', 'sem', 'content marketing', 'email marketing',
  'quickbooks', 'financial modeling', 'autocad', 'solidworks', 'matlab',
];

const SENIORITY_LADDER = [
  { level: 'Intern', re: /\bintern(ship)?\b/i },
  { level: 'Junior', re: /\bjunior\b|\bjr\.?\b|\bassociate\b|\bentry[\s-]?level\b|\bgraduate\b/i },
  { level: 'Mid', re: /\bmid[\s-]?level\b/i },
  { level: 'Senior', re: /\bsenior\b|\bsr\.?\b/i },
  { level: 'Staff', re: /\bstaff\b/i },
  { level: 'Lead', re: /\blead\b(?!.*manager)/i },
  { level: 'Manager', re: /\bmanager\b/i },
  { level: 'Principal', re: /\bprincipal\b/i },
  { level: 'Director', re: /\bdirector\b/i },
  { level: 'VP', re: /\bvp\b|\bvice president\b/i },
  { level: 'Executive', re: /\bcto\b|\bceo\b|\bcfo\b|\bcio\b|\bchief\b|\bexecutive\b|\bpresident\b|\bfounder\b/i },
];

const BUZZWORDS = [
  'synergy', 'synergize', 'ninja', 'rockstar', 'rock star', 'guru', 'hard worker',
  'team player', 'detail-oriented', 'detail oriented', 'results-driven', 'results driven',
  'self-starter', 'self starter', 'go-getter', 'go getter', 'think outside the box',
  'best of breed', 'best-of-breed', 'leverage', 'leveraging', 'utilize', 'utilise',
  'dynamic', 'proactive', 'motivated', 'passionate', 'seasoned', 'track record',
  'proven track record', 'multitasker', 'people person', 'hard-working',
];

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?•\n])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function cueClass(sentence) {
  const s = sentence.toLowerCase();
  if (REQUIRE_CUES.some((c) => s.includes(c))) return 'required';
  if (PREFER_CUES.some((c) => s.includes(c))) return 'preferred';
  return 'mentioned';
}

/** Years-of-experience requirement: "5+ years", "3-5 years experience". */
export function extractYearsRequired(jdText) {
  const t = String(jdText || '');
  const m = t.match(/(\d{1,2})\s*(?:\+|or more)?\s*(?:-|to)?\s*(?:\d{1,2}\s*)?(?:\+?\s*)?years?(?:\s+of)?\s+(?:.*?)?(?:experience|exp\b)/i)
    || t.match(/(?:experience|exp\b)[^.]{0,40}?(\d{1,2})\s*\+?\s*years?/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n <= 40 ? n : null;
}

/** Spot known skills in free text (whole-token, case-insensitive). */
export function extractSkillsWanted(text) {
  let pool = ` ${String(text || '').toLowerCase()} `;
  const found = [];
  // Longest first + consume matches so "node" never fires inside "node.js".
  const vocab = [...new Set(SKILL_VOCAB.map((s) => s.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const skill of vocab) {
    const esc = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9+#])${esc}(?![a-z0-9+#])`, 'g');
    if (re.test(pool)) {
      found.push(skill);
      pool = pool.replace(re, ' ');
    }
  }
  return found;
}

/**
 * Split a JD into required / preferred / mentioned bullets + skills + years.
 * Pure.
 */
export function parseJobDescription(jdText) {
  const sentences = splitSentences(jdText);
  const required = [];
  const preferred = [];
  const mentioned = [];
  for (const s of sentences) {
    if (s.length > 220) continue; // prose, not a requirement line
    const c = cueClass(s);
    if (c === 'required') required.push(s);
    else if (c === 'preferred') preferred.push(s);
    else mentioned.push(s);
  }
  return {
    required,
    preferred,
    mentioned,
    skills: extractSkillsWanted(jdText),
    yearsRequired: extractYearsRequired(jdText),
    seniority: detectSeniority(jdText),
  };
}

/** Seniority ladder position: { level, index } (-1 when unknown). */
export function detectSeniority(text) {
  const t = String(text || '');
  let best = { level: 'Unknown', index: -1 };
  SENIORITY_LADDER.forEach((s, i) => {
    if (s.re.test(t) && i > best.index) best = { level: s.level, index: i };
  });
  return best;
}

/** Buzzword/cliché hits in resume prose. Returns matched phrases. */
export function detectBuzzwords(text) {
  const lower = String(text || '').toLowerCase();
  return [...new Set(BUZZWORDS.filter((b) => lower.includes(b)))];
}

/** Flatten a resume document to searchable plain text. */
export function resumeToPlainText(doc) {
  const parts = [];
  const pi = doc?.personalInfo || {};
  for (const v of Object.values(pi)) {
    if (typeof v === 'string' && v.trim()) parts.push(v);
    else if (Array.isArray(v)) parts.push(v.filter((x) => typeof x === 'string').join(' '));
  }
  for (const sec of doc?.sections || []) {
    if (!sec || typeof sec !== 'object') continue;
    if (typeof sec.content === 'string' && sec.content.trim()) parts.push(sec.content);
    for (const item of sec.items || []) {
      if (!item || typeof item !== 'object') continue;
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === 'string' && v.trim()) parts.push(v);
        else if (Array.isArray(v)) {
          parts.push(v.map((a) => (typeof a === 'string' ? a : a?.text || '')).filter(Boolean).join(' '));
        }
        void k;
      }
    }
  }
  return parts.join('\n');
}

/**
 * Lightweight resume-vs-JD score (no DB): keyword coverage over JD skills +
 * requirement sentences. Returns { score, matched[], missing[], coverage }.
 */
export function scoreResumeVsJd(doc, jdText) {
  const jd = parseJobDescription(jdText);
  const resumeText = resumeToPlainText(doc).toLowerCase();
  const targets = [...new Set([...jd.skills, ...jd.required.flatMap((s) => extractSkillsWanted(s))])];
  const matched = targets.filter((t) => resumeText.includes(t.toLowerCase()));
  const missing = targets.filter((t) => !resumeText.includes(t.toLowerCase()));
  const coverage = targets.length ? matched.length / targets.length : 1;
  // Blend: 70% skill coverage + 30% requirement-sentence keyword hit rate
  const reqHits = jd.required.filter((s) => {
    const words = s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 3);
    if (!words.length) return false;
    const hits = words.filter((w) => resumeText.includes(w)).length;
    return hits / words.length >= 0.4;
  }).length;
  const reqRate = jd.required.length ? reqHits / jd.required.length : 1;
  const score = Math.round(coverage * 70 + reqRate * 30);
  return { score, matched, missing, coverage: Math.round(coverage * 100), jd };
}

/**
 * Inject missing JD terms into a resume copy's skills section as
 * clearly-marked suggestions (included:false, _suggested:true) — the user
 * reviews and enables only what truthfully applies. Pure; mutates doc.
 * Returns { added }.
 */
export function injectMissingSkills(doc, terms, makeId) {
  const names = (terms || [])
    .map((t) => (typeof t === 'string' ? t : t?.displayTerm || t?.normalizedTerm || ''))
    .map((s) => String(s).trim())
    .filter((s) => s && s.length <= 60);
  if (!names.length) return { added: 0 };
  const have = new Set(resumeToPlainText(doc).toLowerCase().split(/[\n,;|/•]+/).map((s) => s.trim()));
  const fresh = names.filter((n) => !have.has(n.toLowerCase()));
  if (!fresh.length) return { added: 0 };
  let skillsSec = (doc.sections || []).find((s) => /skill/i.test(s?.sectionType || s?.type || ''));
  if (!skillsSec) {
    skillsSec = { id: makeId ? makeId() : `sec-${Date.now()}`, sectionType: 'skills', type: 'list', title: 'Skills', visible: true, items: [], order: (doc.sections || []).length };
    doc.sections = [...(doc.sections || []), skillsSec];
  }
  if (!Array.isArray(skillsSec.items)) skillsSec.items = [];
  const baseOrder = skillsSec.items.length;
  fresh.forEach((n, i) => {
    skillsSec.items.push({
      id: makeId ? makeId() : `skill-${Date.now()}-${i}`,
      name: n, category: 'From job description', proficiencyLevel: '',
      yearsOfExperience: null, lastUsed: null, endorsements: 0,
      relatedSkills: [], included: false, _suggested: true, order: baseOrder + i,
    });
  });
  return { added: fresh.length };
}

export default { parseJobDescription, extractYearsRequired, extractSkillsWanted, detectSeniority, detectBuzzwords, resumeToPlainText, scoreResumeVsJd, injectMissingSkills };
