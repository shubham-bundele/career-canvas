/**
 * Deterministic import normalization + rewrite pipeline (pure, Node-safe).
 * Turns messy extracted text / rough parses into clean, editor-ready
 * structured content — fully on-device, cloud AI is enhancement only.
 *
 * Stages: cleanup → section canonicalization → entry splitting →
 * skills grouping → bounded correction → report.
 */
import { matchHeaderFuzzy, correctLine } from './text-parse.js';

// ---- Stage 1: text cleanup -----------------------------------------------

/** Lines that are page artifacts, not content. */
export function isPageArtifact(line) {
  const t = String(line || '').trim();
  if (!t) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(t)) return true;
  if (/^(confidential|draft|continued?\.?|more\.{0,3})$/i.test(t)) return true;
  return false;
}

/**
 * Clean raw extracted text: drop artifacts, repair hyphenated breaks,
 * rejoin wrapped lines, standardize bullets, collapse whitespace.
 * Returns { text, lines, stats }.
 */
export function cleanExtractedText(rawText) {
  const stats = { artifactsDropped: 0, hyphensRepaired: 0, linesJoined: 0 };
  let text = String(rawText || '').replace(/\r\n?/g, '\n');
  // Repair hyphenated line breaks: "experi-\nence" -> "experience"
  text = text.replace(/([A-Za-z])-\n([A-Za-z])/g, (_, a, b) => {
    stats.hyphensRepaired++;
    return a + b;
  });
  const rawLines = text.split('\n');
  const lines = [];
  for (let raw of rawLines) {
    let line = raw.replace(/[ \t]+/g, ' ').trim();
    if (!line) continue;
    if (isPageArtifact(line)) { stats.artifactsDropped++; continue; }
    // Standardize bullet glyphs
    const bulleted = line.match(/^([\-*▪▸►⦁◦‣·o>]+)\s+(.*)$/);
    if (bulleted) line = `• ${bulleted[2].trim()}`;
    // Rejoin wrapped continuation lines (lowercase start, prev line not terminal)
    const prev = lines[lines.length - 1];
    if (prev && !/^[•\d]/.test(prev) && !/[.:;!?]$/.test(prev)
      && /^[a-z]/.test(line) && line.length < 80 && prev.length < 100
      && !matchHeaderFuzzy(line) && !matchHeaderFuzzy(prev)) {
      lines[lines.length - 1] = `${prev} ${line}`;
      stats.linesJoined++;
      continue;
    }
    lines.push(line);
  }
  return { text: lines.join('\n'), lines, stats };
}

// ---- Stage 2: section canonicalization ------------------------------------

/** Variant titles → canonical { title, type }. */
const SECTION_SYNONYMS = [
  { re: /work history|employment history|career history|relevant experience/i, title: 'Professional Experience', type: 'experience' },
  { re: /career summary|executive summary|career profile|about me/i, title: 'Professional Summary', type: 'summary' },
  { re: /tech(nical)? (skills|stack|expertise)|core competencies|key skills|competencies/i, title: 'Technical Skills', type: 'skills' },
  { re: /academic background|qualifications/i, title: 'Education', type: 'education' },
  { re: /selected projects|personal projects|key projects/i, title: 'Projects', type: 'projects' },
  { re: /licenses? & certifications?|licenses? and certifications?/i, title: 'Certifications', type: 'certifications' },
];

export function canonicalizeSection(title, type) {
  for (const s of SECTION_SYNONYMS) {
    if (s.re.test(String(title || ''))) return { title: s.title, type: s.type };
  }
  // Canonical title casing for known types
  const pretty = {
    experience: 'Professional Experience', summary: 'Professional Summary',
    skills: 'Skills', education: 'Education', projects: 'Projects',
    certifications: 'Certifications', languages: 'Languages', awards: 'Awards',
  };
  if (type && pretty[type]) return { title: pretty[type], type };
  return { title: title || 'General', type: type || 'custom' };
}

// ---- Stage 3: experience entry splitting ----------------------------------

const DATE_FRAG = /(\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\bpresent\b|\bcurrent\b)/i;

/**
 * Split flat experience content lines into entries { header, dates, bullets }.
 * A new entry starts at a non-bullet line carrying a date fragment, or at a
 * "Title @ Company" / "Title, Company" style line following bullets.
 */
export function splitExperienceEntries(contentLines) {
  const entries = [];
  let current = null;
  const start = (header, dates) => {
    current = { header, dates, bullets: [] };
    entries.push(current);
  };
  for (const raw of contentLines || []) {
    const line = String(raw || '').trim();
    if (!line) continue;
    const isBullet = /^[•\-*]/.test(line) || /^\d+[.)]\s/.test(line);
    const text = line.replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (!isBullet && DATE_FRAG.test(line) && (line.length < 90 || /[|,—–-]/.test(line))) {
      const parts = line.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
      const datePart = parts.find((p) => DATE_FRAG.test(p) && /\b(?:19|20)\d{2}\b/i.test(p)) || '';
      // Keep company text that shares the segment with the dates:
      // "Acme (2020 - 2022)" -> header keeps "Acme", dates keep "2020 - 2022".
      const dateOnly = (datePart.match(/((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}\s*[–—-]\s*(?:present|current|now|till date|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}))/i) || [])[1] || '';
      const dateRest = dateOnly ? datePart.replace(dateOnly, '').replace(/^[(\s]+|[)\s,;]+$/g, '').trim() : '';
      const header = ([...parts.filter((p) => p !== datePart), ...(dateRest ? [dateRest] : [])].join(' · ') || line).slice(0, 120);
      start(header, dateOnly || datePart);
      continue;
    }
    if (!isBullet && current && current.bullets.length > 0 && /[@|]|,\s*[A-Z]/.test(line) && line.length < 90) {
      start(line.slice(0, 120), '');
      continue;
    }
    if (!current) start('', '');
    if (!current.header && !isBullet && text.length < 90) {
      current.header = text;
      continue;
    }
    current.bullets.push(text);
  }
  return entries.filter((e) => e.header || e.bullets.length > 0);
}

// ---- Stage 4: skills grouping ----------------------------------------------

const SKILL_GROUPS = [
  { name: 'Technical', re: /^(javascript|typescript|python|java\b|c#|c\+\+|go\b|rust|ruby|php|swift|kotlin|sql|html|css|react|angular|vue|node|django|flask|spring|aws|azure|gcp|docker|kubernetes|terraform|linux|machine learning|data|nlp|graphql|redis|mongo|postgres|mysql|rest|selenium|playwright|cypress|jest|pytest)\b/i },
  { name: 'Tools', re: /(jira|confluence|figma|photoshop|tableau|power bi|excel|salesforce|hubspot|sap|oracle|quickbooks|autocad|jenkins|git\b|vscode|postman|slack|notion|trello|asana)/i },
  { name: 'Languages', re: /^(english|hindi|spanish|french|german|portuguese|arabic|chinese|japanese|korean|italian|dutch|marathi|tamil|telugu|bengali|punjabi|urdu)\b/i },
];

/** Group skill tokens; returns [{ name, skills[] }] with Soft Skills last. */
export function groupSkills(skills) {
  const groups = new Map([['Technical', []], ['Tools', []], ['Languages', []], ['Soft Skills', []]]);
  const seen = new Set();
  for (const raw of skills || []) {
    const s = String(raw || '').trim();
    if (!s || s.length > 60) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    const g = SKILL_GROUPS.find((g) => g.re.test(s));
    groups.get(g ? g.name : 'Soft Skills').push(s);
  }
  return [...groups.entries()]
    .filter(([, v]) => v.length > 0)
    .map(([name, skills]) => ({ name, skills }));
}

// ---- Stage 5: bounded correction -------------------------------------------

const PROTECTED_LINE = /@|https?:|www\.|linkedin|github|\b\d{3,}[\d\s().+-]*\d{3,}|^\s*[A-Z0-9][A-Z0-9\s.'&-]*$/;

/**
 * Correct prose lines only. Skips emails, URLs, phone/date lines and
 * ALL-CAPS lines (names, acronyms, headers). Returns { lines, fixed }.
 */
export function correctProse(lines) {
  let fixed = 0;
  const out = (lines || []).map((line) => {
    const t = String(line ?? '');
    if (!t.trim() || PROTECTED_LINE.test(t)) return t;
    const r = correctLine(t);
    fixed += r.corrections;
    return r.line;
  });
  return { lines: out, fixed };
}

// ---- Orchestrator -----------------------------------------------------------

/**
 * Run the full pipeline over a parseResumeLocal-shaped object.
 * Returns { parsed, report } — parsed keeps its shape (safe for review UI).
 */
export function normalizePipeline(parsed, opts = {}) {
  const report = { linesCleaned: 0, typosFixed: 0, sectionsMapped: 0, skillsGrouped: 0, entriesSplit: 0 };
  if (!parsed || typeof parsed !== 'object') return { parsed, report };

  const out = { ...parsed, sections: [] };
  for (const sec of parsed.sections || []) {
    if (!sec || typeof sec !== 'object') continue;
    const canon = canonicalizeSection(sec.title, sec.type);
    if (canon.title !== sec.title || canon.type !== sec.type) report.sectionsMapped++;
    let content = Array.isArray(sec.content) ? [...sec.content] : [];
    if (opts.correct !== false) {
      const r = correctProse(content);
      content = r.lines;
      report.typosFixed += r.fixed;
    }
    if (canon.type === 'skills') {
      const flat = [];
      for (const line of content) {
        flat.push(...String(line).split(/[,•|/;]+/).map((s) => s.replace(/^[-–—*+\s]+/, '').trim()).filter(Boolean));
      }
      const grouped = groupSkills(flat);
      if (grouped.length > 0) {
        report.skillsGrouped += grouped.reduce((n, g) => n + g.skills.length, 0);
        content = grouped.flatMap((g) => [`${g.name}:`, ...g.skills.map((s) => `• ${s}`)]);
      }
    }
    let entries = null;
    if (canon.type === 'experience') {
      entries = splitExperienceEntries(content);
      report.entriesSplit += entries.length;
    }
    out.sections.push({ ...sec, title: canon.title, type: canon.type, content, ...(entries ? { _entries: entries } : {}) });
  }
  report.linesCleaned = report.typosFixed; // typos fixed across cleaned lines
  return { parsed: out, report };
}

export default { cleanExtractedText, canonicalizeSection, splitExperienceEntries, groupSkills, correctProse, normalizePipeline, isPageArtifact };
