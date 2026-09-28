/**
 * Text-parse utilities for the local (offline) resume parser.
 * Pure functions only — no DOM, no storage — so they run in Node (tests)
 * and in the browser. Used by local-resume-parser.js as the fallback
 * when AI parsing is unavailable or fails.
 */

/**
 * Levenshtein edit distance with an early-exit cap.
 * @returns {number} distance, or cap+1 when it exceeds cap
 */
export function levenshtein(a, b, cap = 3) {
  a = String(a);
  b = String(b);
  if (a === b) return 0;
  let la = a.length;
  let lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  // ensure b is the shorter row
  if (la < lb) {
    [a, b] = [b, a];
    [la, lb] = [lb, la];
  }
  let prev = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    let cur = new Array(lb + 1);
    cur[0] = i;
    let rowMin = cur[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[lb];
}

/**
 * Canonical section headers: normalized key -> { type, label }.
 * Consolidates the header maps previously duplicated across import-manager.
 */
export const HEADER_CANONICAL = {
  'experience': { type: 'experience', label: 'Work Experience' },
  'work experience': { type: 'experience', label: 'Work Experience' },
  'professional experience': { type: 'experience', label: 'Professional Experience' },
  'employment': { type: 'experience', label: 'Employment' },
  'employment history': { type: 'experience', label: 'Employment History' },
  'work history': { type: 'experience', label: 'Work History' },
  'career history': { type: 'experience', label: 'Career History' },
  'relevant experience': { type: 'experience', label: 'Relevant Experience' },
  'internships': { type: 'experience', label: 'Internships' },
  'internship experience': { type: 'experience', label: 'Internship Experience' },
  'leadership experience': { type: 'experience', label: 'Leadership Experience' },
  'teaching experience': { type: 'experience', label: 'Teaching Experience' },
  'freelance experience': { type: 'experience', label: 'Freelance Experience' },
  'consulting experience': { type: 'experience', label: 'Consulting Experience' },
  'military experience': { type: 'experience', label: 'Military Experience' },
  'volunteer experience': { type: 'volunteer', label: 'Volunteer Experience' },
  'education': { type: 'education', label: 'Education' },
  'academic background': { type: 'education', label: 'Education' },
  'educational background': { type: 'education', label: 'Education' },
  'academic qualifications': { type: 'education', label: 'Education' },
  'qualifications': { type: 'education', label: 'Qualifications' },
  'qualification': { type: 'education', label: 'Qualifications' },
  'courses': { type: 'education', label: 'Courses' },
  'coursework': { type: 'education', label: 'Coursework' },
  'relevant coursework': { type: 'education', label: 'Relevant Coursework' },
  'skills': { type: 'skills', label: 'Skills' },
  'technical skills': { type: 'skills', label: 'Technical Skills' },
  'core competencies': { type: 'skills', label: 'Core Competencies' },
  'competencies': { type: 'skills', label: 'Competencies' },
  'key skills': { type: 'skills', label: 'Key Skills' },
  'key competencies': { type: 'skills', label: 'Key Competencies' },
  'tools and technologies': { type: 'skills', label: 'Tools & Technologies' },
  'tools & technologies': { type: 'skills', label: 'Tools & Technologies' },
  'technical proficiencies': { type: 'skills', label: 'Technical Skills' },
  'professional skills': { type: 'skills', label: 'Professional Skills' },
  'areas of expertise': { type: 'skills', label: 'Areas of Expertise' },
  'technology stack': { type: 'skills', label: 'Technology Stack' },
  'tech stack': { type: 'skills', label: 'Technology Stack' },
  'programming languages': { type: 'skills', label: 'Programming Languages' },
  'soft skills': { type: 'skills', label: 'Soft Skills' },
  'language skills': { type: 'languages', label: 'Languages' },
  'projects': { type: 'projects', label: 'Projects' },
  'selected projects': { type: 'projects', label: 'Selected Projects' },
  'key projects': { type: 'projects', label: 'Key Projects' },
  'personal projects': { type: 'projects', label: 'Personal Projects' },
  'portfolio': { type: 'projects', label: 'Portfolio' },
  'project portfolio': { type: 'projects', label: 'Project Portfolio' },
  'case studies': { type: 'projects', label: 'Case Studies' },
  'certifications': { type: 'certifications', label: 'Certifications' },
  'certificates': { type: 'certifications', label: 'Certifications' },
  'licenses': { type: 'certifications', label: 'Licenses' },
  'licenses & certifications': { type: 'certifications', label: 'Licenses & Certifications' },
  'professional certifications': { type: 'certifications', label: 'Professional Certifications' },
  'training & certifications': { type: 'certifications', label: 'Training & Certifications' },
  'training': { type: 'certifications', label: 'Training' },
  'professional development': { type: 'certifications', label: 'Professional Development' },
  'credentials': { type: 'certifications', label: 'Credentials' },
  'summary': { type: 'summary', label: 'Professional Summary' },
  'professional summary': { type: 'summary', label: 'Professional Summary' },
  'objective': { type: 'summary', label: 'Objective' },
  'career objective': { type: 'summary', label: 'Career Objective' },
  'career summary': { type: 'summary', label: 'Career Summary' },
  'profile': { type: 'summary', label: 'Profile' },
  'professional profile': { type: 'summary', label: 'Profile' },
  'profile summary': { type: 'summary', label: 'Profile Summary' },
  'about': { type: 'summary', label: 'About' },
  'about me': { type: 'summary', label: 'About Me' },
  'overview': { type: 'summary', label: 'Overview' },
  'personal statement': { type: 'summary', label: 'Personal Statement' },
  'awards': { type: 'awards', label: 'Awards' },
  'honors': { type: 'awards', label: 'Honors' },
  'honors & awards': { type: 'awards', label: 'Honors & Awards' },
  'achievements': { type: 'awards', label: 'Achievements' },
  'key achievements': { type: 'awards', label: 'Key Achievements' },
  'accomplishments': { type: 'awards', label: 'Accomplishments' },
  'grants': { type: 'awards', label: 'Grants' },
  'fellowships': { type: 'awards', label: 'Fellowships' },
  'publications': { type: 'publications', label: 'Publications' },
  'research': { type: 'publications', label: 'Research' },
  'papers': { type: 'publications', label: 'Publications' },
  'selected publications': { type: 'publications', label: 'Selected Publications' },
  'presentations': { type: 'publications', label: 'Presentations' },
  'conferences': { type: 'publications', label: 'Conferences' },
  'patents': { type: 'publications', label: 'Patents' },
  'volunteer': { type: 'volunteer', label: 'Volunteer' },
  'volunteering': { type: 'volunteer', label: 'Volunteer' },
  'community service': { type: 'volunteer', label: 'Community Service' },
  'languages': { type: 'languages', label: 'Languages' },
  'language proficiency': { type: 'languages', label: 'Languages' },
  'interests': { type: 'interests', label: 'Interests' },
  'hobbies': { type: 'interests', label: 'Interests' },
  'hobbies & interests': { type: 'interests', label: 'Interests' },
  'personal interests': { type: 'interests', label: 'Interests' },
  'activities': { type: 'interests', label: 'Activities' },
  'references': { type: 'references', label: 'References' },
  'professional references': { type: 'references', label: 'Professional References' },
  'memberships': { type: 'custom', label: 'Memberships' },
  'professional memberships': { type: 'custom', label: 'Memberships' },
  'affiliations': { type: 'custom', label: 'Affiliations' },
  'additional information': { type: 'custom', label: 'Additional Information' },
  'declaration': { type: 'custom', label: 'Declaration' },
  'contact information': { type: 'custom', label: 'Contact' },
};

const HEADER_KEYS = Object.keys(HEADER_CANONICAL);
const HEADER_KEYS_SORTED = [...HEADER_KEYS].sort((a, b) => b.length - a.length);

function normalizeHeaderLine(line) {
  return String(line).replace(/[:\-–—]+$/, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Match a line against known section headers.
 * Order: exact → starts-with (header + trailing content) → fuzzy (typo tolerant).
 * @returns {{key,type,label,rest}|null}
 */
export function matchHeaderFuzzy(line) {
  if (!line) return null;
  const cleaned = normalizeHeaderLine(line);
  if (!cleaned || cleaned.length > 60) return null;
  const alphaOnly = cleaned.replace(/[^a-z\s&]/g, '').replace(/\s+/g, ' ').trim();

  if (HEADER_CANONICAL[cleaned]) {
    const h = HEADER_CANONICAL[cleaned];
    return { key: cleaned, type: h.type, label: h.label, rest: '' };
  }
  if (alphaOnly && alphaOnly !== cleaned && HEADER_CANONICAL[alphaOnly]) {
    const h = HEADER_CANONICAL[alphaOnly];
    return { key: alphaOnly, type: h.type, label: h.label, rest: '' };
  }
  // starts-with: "Profile Summary Results-driven engineer..."
  for (const key of HEADER_KEYS_SORTED) {
    if (cleaned.startsWith(key + ' ') && cleaned.length > key.length + 3) {
      const h = HEADER_CANONICAL[key];
      return { key, type: h.type, label: h.label, rest: line.slice(line.toLowerCase().indexOf(key) + key.length).trim().replace(/^[:\-–—\s]+/, '') };
    }
  }
  // fuzzy: tolerate OCR/keyboard typos, e.g. "Experiance", "EDUCATOIN", "Skils"
  const target = alphaOnly || cleaned;
  if (target.length >= 4) {
    let best = null;
    let bestDist = Infinity;
    for (const key of HEADER_KEYS) {
      if (Math.abs(key.length - target.length) > 3) continue;
      const cap = Math.min(3, Math.max(1, Math.floor(key.length * 0.25)));
      const d = levenshtein(target, key, cap);
      if (d < bestDist) {
        bestDist = d;
        best = key;
        if (d === 0) break;
      }
    }
    if (best) {
      const cap = Math.min(3, Math.max(1, Math.floor(best.length * 0.25)));
      if (bestDist <= cap && bestDist > 0) {
        const h = HEADER_CANONICAL[best];
        return { key: best, type: h.type, label: h.label, rest: '', correctedFrom: line.trim() };
      }
    }
  }
  return null;
}

// ---------------- spell correction ----------------

// Frequent resume-vocabulary words + all header words. US spelling.
const SPELL_WORDS = [
  'experience', 'experiences', 'professional', 'summary', 'objective', 'career',
  'education', 'university', 'college', 'school', 'bachelor', 'master', 'degree',
  'skills', 'technical', 'technology', 'technologies', 'certifications', 'certificate',
  'certified', 'license', 'licenses', 'training', 'employment', 'employer',
  'company', 'companies', 'position', 'engineer', 'engineers', 'engineering', 'developer',
  'developers', 'development', 'manager', 'managers', 'management', 'assistant', 'associate', 'senior',
  'junior', 'lead', 'director', 'analyst', 'analysis', 'consultant', 'consulting',
  'project', 'projects', 'portfolio', 'research', 'publications', 'papers',
  'awards', 'honors', 'achievements', 'accomplishments', 'recognition',
  'volunteer', 'volunteering', 'community', 'languages', 'language', 'interests',
  'hobbies', 'activities', 'references', 'referrals', 'qualifications',
  'competencies', 'proficiencies', 'expertise', 'knowledge', 'relevant',
  'responsibilities', 'achieved', 'improved', 'increased', 'reduced', 'developed',
  'designed', 'implemented', 'managed', 'led', 'created', 'built', 'delivered',
  'collaborated', 'coordinated', 'supervised', 'mentored', 'trained',
  'communication', 'leadership', 'teamwork', 'problem', 'solving', 'detail',
  'organized', 'efficient', 'effective', 'successful', 'quality', 'assurance',
  'testing', 'automation', 'manual', 'performance', 'security', 'support',
  'customer', 'client', 'business', 'sales', 'marketing', 'finance', 'accounting',
  'operations', 'logistics', 'revenue', 'profit', 'growth', 'strategy',
  'planning', 'budget', 'schedule', 'deadline', 'present', 'january', 'february',
  'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
  'november', 'december', 'profile', 'overview', 'statement', 'personal',
  'additional', 'information', 'contact', 'address', 'phone', 'email',
  'linkedin', 'github', 'website', 'location', 'available', 'willing',
  'remote', 'hybrid', 'onsite', 'bachelor’s', 'master’s',
  'contrast', 'load', 'cloud', 'server', 'database', 'infrastructure', 'backend', 'frontend', 'fullstack',
  'accessibility', 'virtual', 'headless', 'configuration', 'configurations', 'framework', 'frameworks',
  'pipeline', 'pipelines', 'repository', 'architecture', 'microservices', 'kubernetes', 'docker', 'agile',
  'scrum', 'traceability', 'matrix', 'matrices', 'regression', 'integration', 'acceptance', 'playwright',
  'selenium', 'postman', 'grafana', 'jmeter', 'cypress', 'jenkins', 'typescript', 'javascript', 'python',
];

const SPELL_SET = new Set(SPELL_WORDS);

/**
 * Correct a single word when it is an obvious typo of a known word.
 * Conservative: keeps acronyms, short words, digits, mixed case, URLs.
 */
export function correctWord(word) {
  if (!word || word.length < 4) return { word, corrected: false };
  if (/\d/.test(word)) return { word, corrected: false };
  if (/[A-Z]{2,}/.test(word)) return { word, corrected: false }; // acronyms like QA, AWS
  if (/[^a-zA-Z'’-]/.test(word)) return { word, corrected: false };
  const lower = word.toLowerCase();
  if (SPELL_SET.has(lower)) return { word, corrected: false };
  const cap = lower.length >= 7 ? 2 : 1;
  let best = null;
  let bestDist = Infinity;
  for (const dict of SPELL_WORDS) {
    if (Math.abs(dict.length - lower.length) > cap) continue;
    if (dict[0] !== lower[0] && lower.length < 6) continue; // cheap prune, same first letter for short words
    const d = levenshtein(lower, dict, cap);
    if (d < bestDist || (d === bestDist && best !== null && dict.length === lower.length && best.length !== lower.length)) {
      bestDist = d;
      best = dict;
      if (d === 1 && lower.length < 7 && dict.length === lower.length) break;
    }
  }
  if (best && bestDist <= cap && bestDist > 0) {
    let fixed = best;
    if (word[0] === word[0].toUpperCase()) fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
    return { word: fixed, corrected: true };
  }
  return { word, corrected: false };
}

/**
 * Spell-correct a full line word by word; preserves emails, URLs, numbers.
 * @returns {{line, corrections}}
 */
export function correctLine(line) {
  let corrections = 0;
  const out = String(line).split(/(\s+)/).map((tok) => {
    if (!tok || /^\s+$/.test(tok)) return tok;
    if (tok.includes('@') || /https?:|www\.|\.com|\.io|\.dev|\.org|\.net/.test(tok)) return tok;
    // strip surrounding punctuation, correct the core, re-attach
    const m = tok.match(/^([^a-zA-Z'’\-]*)([a-zA-Z'’\-]+)([^a-zA-Z'’\-]*)$/);
    if (!m) return tok;
    const r = correctWord(m[2]);
    if (r.corrected) corrections++;
    return m[1] + r.word + m[3];
  }).join('');
  return { line: out, corrections };
}

// ---------------- contact extraction ----------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}(?:[\s.-]?\d{1,5})?/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|·,;]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|·,;]+/i;
const URL_RE = /https?:\/\/[^\s|·,;]+/i;
// "City, ST" / "City, State/Country" — anchored on comma + capitalised place
const LOCATION_RE = /\b([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,2})/;
// Words that mark the start of the next resume section — PDF text extraction
// often joins "Pune, India" + "PROFILE SUMMARY" onto one line, and the
// location tail would otherwise swallow the header ("Pune, India PROFILE SUMMARY").
const LOCATION_STOP_WORDS = new Set([
  'summary', 'profile', 'objective', 'experience', 'employment', 'education',
  'skills', 'skill', 'projects', 'project', 'contact', 'about', 'technical',
  'professional', 'certifications', 'certification', 'achievements', 'awards',
  'languages', 'interests', 'declaration', 'career', 'work',
]);

/**
 * Cut a location tail at the next-section header.
 * Keeps single Title-Case/UPPER region codes ("USA", "UK") but drops headers:
 * "India PROFILE SUMMARY" -> "India"; "Austin, USA" stays; "Paris, FRANCE" stays.
 */
export function trimLocationTail(tail) {
  const words = String(tail || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const isAllCaps = (w) => /^[A-Z][A-Z.'-]*$/.test(w.replace(/[^A-Za-z.'-]/g, ''));
  let cut = words.length;
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (LOCATION_STOP_WORDS.has(w.toLowerCase())) { cut = i; break; }
    if (isAllCaps(w) && i + 1 < words.length && isAllCaps(words[i + 1])) { cut = i; break; }
  }
  const kept = words.slice(0, cut);
  return kept.length > 0 ? kept.join(' ') : String(tail).trim();
}

/**
 * Extract contact fields from free text.
 * Phone requires ≥7 digits to avoid matching years / date ranges.
 */
export function extractContact(text) {
  const out = { email: '', phone: '', linkedin: '', github: '', website: '', location: '' };
  if (!text) return out;
  const email = text.match(EMAIL_RE);
  if (email) out.email = email[0];
  const phones = text.match(new RegExp(PHONE_RE.source, 'g')) || [];
  for (const p of phones) {
    if (p.replace(/\D/g, '').length >= 7) { out.phone = p.trim(); break; }
  }
  const li = text.match(LINKEDIN_RE);
  if (li) out.linkedin = li[0].replace(/[.,;]+$/, '');
  const gh = text.match(GITHUB_RE);
  if (gh) out.github = gh[0].replace(/[.,;]+$/, '');
  const urls = text.match(new RegExp(URL_RE.source, 'gi')) || [];
  for (const u of urls) {
    if (!/linkedin\.com|github\.com/i.test(u)) { out.website = u.replace(/[.,;]+$/, ''); break; }
  }
  const loc = text.match(LOCATION_RE);
  if (loc) {
    const tail = trimLocationTail(loc[2].split(/\s+/).slice(0, 3).join(' '));
    out.location = tail ? `${loc[1]}, ${tail}` : loc[1];
  }
  return out;
}

/** Split a skills block into individual skills; de-duplicates (case-insensitive). */
export function splitSkills(text) {
  if (!text) return [];
  const seen = new Set();
  const out = [];
  for (const part of String(text).split(/[\n•·▪◆●○■|;/]+/)) {
    for (const sub of part.split(/,(?![^(]*\))/)) {
      const s = sub.replace(/^[-–—*+\s]+/, '').trim();
      if (!s || s.length > 60) continue;
      const k = s.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(s); }
    }
  }
  return out;
}

/** True when a line looks like a job date range: "2019 - 2022", "Jan 2020 – Present", "(2018–Present)". */
export function looksLikeDateRange(line) {
  if (!line) return false;
  const t = String(line);
  return /(\b(19|20)\d{2}\b\s*[–—-]\s*(\b(19|20)\d{2}\b|present|current|now|till\s+date))|((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\s*[–—-])/i.test(t);
}

/** Strip HTML/style/script markup down to plain text lines. */
export function stripMarkup(text) {
  let s = String(text || '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<li[^>]*>/gi, '\n• ');
  s = s.replace(/<(br|p|div|h[1-6]|tr)[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  s = s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return s;
}
