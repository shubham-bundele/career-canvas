/**
 * Deterministic import normalization + rewrite pipeline (pure, Node-safe).
 * Turns messy extracted text / rough parses into clean, editor-ready
 * structured content — fully on-device, cloud AI is enhancement only.
 *
 * Stages: cleanup → section canonicalization → entry splitting →
 * skills grouping → bounded correction → bullet tidy → dedup → report.
 */
import { matchHeaderFuzzy, correctLine, looksLikeDateRange } from './text-parse.js';

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
    // Rejoin wrapped continuation lines.
    // Never treat a contact line (email/url) as a continuation, and never
    // glue anything onto the first line (the name candidate): both destroy
    // the name/contact structure the parser reads next.
    const isContactLike = (s) => s.includes('@') || /https?:|www\./i.test(s);
    const prev = lines[lines.length - 1];
    const isWrappedLower = prev && !/^[•\d]/.test(prev) && !/[.:;!?]$/.test(prev)
      && /^[a-z]/.test(line) && line.length < 80 && prev.length < 100
      && !isContactLike(line) && !matchHeaderFuzzy(line) && !matchHeaderFuzzy(prev);
    // Also rejoin single-word fragments like "User" + "Acceptance Testing (UAT)"
    // that were split by PDF column width — short prev, capitalized continuation.
    const isFragmented = prev && lines.length > 1 && !/^[•\d]/.test(prev) && !/[.:;!?]$/.test(prev)
      && prev.split(/\s+/).length <= 2 && prev.length <= 12 && prev.length > 1
      && /^[A-Z]/.test(line) && line.length < 80 && line.split(/\s+/).length >= 2
      && !isContactLike(line) && !isContactLike(prev)
      && !matchHeaderFuzzy(line) && !matchHeaderFuzzy(prev)
      && !line.includes(':') && !prev.includes(':');
    if (isWrappedLower || isFragmented) {
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
    volunteer: 'Volunteer Experience', publications: 'Publications & Research',
    interests: 'Interests & Activities', references: 'References'
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

// ---- Stage 3b: education entry splitting ----------------------------------

const DEGREE_RE = /\b(b\.?\s?tech|m\.?\s?tech|bachelor|master'?s?|mba|ph\.?\s?d|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|m\.?\s?com|b\.?\s?a\b|m\.?\s?a\b|diploma|degree|associate|engg?\.?)\b/i;
const YEAR_FRAG = /\b((?:19|20)\d{2})\b/;

/**
 * Split flat education content into entries { degree, institution, year, extras[] }.
 * "B.Tech, MIT, 2019" -> degree "B.Tech", institution "MIT", year "2019".
 * Plain lines attach as extras of the current entry.
 */
export function splitEducationEntries(contentLines) {
  const entries = [];
  let current = null;
  const start = () => {
    current = { degree: '', institution: '', year: '', extras: [] };
    entries.push(current);
  };
  const isBullet = (line) => /^[•\-*]\s/.test(line) || /^\d+[.)]\s/.test(line);
  for (const raw of contentLines || []) {
    const line = String(raw || '').trim();
    if (!line) continue;
    const text = line.replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    const year = (text.match(YEAR_FRAG) || [])[1] || '';
    const hasDegree = DEGREE_RE.test(text);
    if (!isBullet(line) && (hasDegree || (year && text.length < 90))) {
      if (current && (current.degree || current.institution) && (hasDegree || (year && year !== current.year))) start();
      if (!current) start();
      for (const p of text.split(/[,|;—–-]/).map((s) => s.trim()).filter(Boolean)) {
        const y = (p.match(YEAR_FRAG) || [])[1] || '';
        if (y && !current.year) { current.year = y; continue; }
        if (DEGREE_RE.test(p) && !current.degree) { current.degree = p; continue; }
        if (!current.institution && p !== y) { current.institution = p; continue; }
        if (p && p !== current.degree && p !== current.institution && p !== current.year) current.extras.push(p);
      }
      continue;
    }
    if (!current) start();
    current.extras.push(text);
  }
  return entries.filter((e) => e.degree || e.institution || e.extras.length > 0);
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

// ---- Stage 6: bullet tidy (conservative, meaning-preserving) ----------------

/**
 * Strip bullet prefixes, capitalise the first letter, ensure terminal
 * punctuation is a single period when the line otherwise lacks one, and
 * collapse duplicate whitespace. Never rewrites tense or meaning.
 * Returns { lines, tidied } — tidied counts lines whose text changed.
 */
export function tidyBullets(lines) {
  let tidied = 0;
  const out = (lines || []).map((raw) => {
    const line = String(raw ?? '');
    if (!line.trim()) return line;
    // Protected lines pass through untouched.
    if (/@|https?:|www\.|linkedin|github/.test(line)) return line;
    let text = line.replace(/^\s*[•\-*▪▸►⦁◦‣·]\s*/, '').trim();
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) return line;
    // Capitalise first character when it is a lowercase letter.
    if (/^[a-z]/.test(text)) text = text.charAt(0).toUpperCase() + text.slice(1);
    // Normalise trailing punctuation: keep !/?, add . when none, drop duplicate ..
    text = text.replace(/\s*[;,.]+\s*$/, '');
    if (!/[.!?]$/.test(text)) text += '.';
    const rebuilt = `• ${text}`;
    if (rebuilt !== line) tidied++;
    return rebuilt;
  });
  return { lines: out, tidied };
}

// ---- Helpers: dedup + empty prune -----------------------------------------

/**
 * Merge duplicate sections (same canonical type+title) by concatenating content
 * and _entries/_eduEntries. Drops only truly empty sections (no content, no
 * entries, no eduEntries, no _hasDates). Never merges two non-empty sections
 * that carry different substantive content — only collapses exact empties or
 * exact title duplicates where one side is empty. Returns { sections, merged }.
 */
export function mergeDuplicateSections(sections) {
  const kept = [];
  let merged = 0;
  for (const sec of sections || []) {
    if (!sec || typeof sec !== 'object') { merged++; continue; }
    const hasContent = (Array.isArray(sec.content) ? sec.content.length > 0 : false)
      || (Array.isArray(sec._entries) && sec._entries.length > 0)
      || (Array.isArray(sec._eduEntries) && sec._eduEntries.length > 0)
      || !!sec._hasDates;
    if (!hasContent) { merged++; continue; }
    kept.push(sec);
  }
  // Only collapse exact key collisions where one section is a subset of the other.
  // If two sections share the same key but have disjoint non-empty content,
  // keep both (e.g. two distinct "Professional Experience" blocks from different
  // pages) — merging them would silently drop a section from the count.
  const byKey = new Map();
  const out = [];
  for (const sec of kept) {
    const key = `${sec.type || 'custom'}::${(sec.title || '').toLowerCase()}`;
    if (!byKey.has(key)) { byKey.set(key, sec); out.push(sec); continue; }
    const prev = byKey.get(key);
    const prevSet = new Set((prev.content || []).map((l) => String(l).toLowerCase()));
    const secSet = new Set((sec.content || []).map((l) => String(l).toLowerCase()));
    const overlap = [...secSet].filter((l) => prevSet.has(l)).length;
    const subset = overlap === secSet.size || overlap === prevSet.size;
    if (subset) {
      // Merge — one is a subset of the other, safe to collapse.
      for (const line of sec.content || []) {
        if (!prevSet.has(String(line).toLowerCase())) { prev.content.push(line); prevSet.add(String(line).toLowerCase()); }
      }
      if (Array.isArray(sec._entries) && sec._entries.length > 0) prev._entries = [...(prev._entries || []), ...sec._entries];
      if (Array.isArray(sec._eduEntries) && sec._eduEntries.length > 0) prev._eduEntries = [...(prev._eduEntries || []), ...sec._eduEntries];
      merged++;
    } else {
      // Distinct content under the same heading — keep both, disambiguate titles.
      let suffix = 2;
      let newTitle = `${sec.title} (${suffix})`;
      let newKey = `${sec.type}::${newTitle.toLowerCase()}`;
      while (byKey.has(newKey)) { suffix++; newTitle = `${sec.title} (${suffix})`; newKey = `${sec.type}::${newTitle.toLowerCase()}`; }
      const copy = { ...sec, title: newTitle };
      byKey.set(newKey, copy);
      out.push(copy);
    }
  }
  return { sections: out, merged };
}

// ---- Orchestrator -----------------------------------------------------------

/**
 * Run the full pipeline over a parseResumeLocal-shaped object.
 * Returns { parsed, report } — parsed keeps its shape (safe for review UI).
 */
export function normalizePipeline(parsed, opts = {}) {
  const report = { linesCleaned: 0, typosFixed: 0, sectionsMapped: 0, skillsGrouped: 0, entriesSplit: 0, bulletsTidied: 0, sectionsMerged: 0 };
  if (!parsed || typeof parsed !== 'object') return { parsed, report };

  const staged = [];
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
      // Preserve original subcategories ("API Testing & Reporting: Postman") while
      // grouping only the bare skills that have no category. This keeps the
      // resume's own headers (Technical, Tools, Soft Skills, etc.) intact
      // instead of collapsing them into 4 generic buckets.
      const groups = new Map(); // category -> skills[]
      let currentCategory = null;
      const bare = [];
      const cleanSkill = (s) => s.replace(/^[-–—*+\s]+/, '').replace(/\s+/g, ' ').trim().replace(/[.]+$/, '').trim();
      for (const raw of content) {
        const line = String(raw || '').trim();
        if (!line) continue;
        const stripped = line.replace(/^[•\-*▪▸►⦁◦‣·]\s*/, '').trim();
        const colonIdx = stripped.indexOf(':');
        // Category header: "Technical:" (alone) or "API Testing: Postman, Jira"
        // Allow up to 60 chars for long QA headers like "Accessibility Testing (Automated & Manual)".
        if (colonIdx > 0 && colonIdx < 60 && !/https?:|www\./i.test(stripped)) {
          const category = stripped.slice(0, colonIdx).trim();
          const after = stripped.slice(colonIdx + 1).trim();
          if (!category) continue;
          if (!groups.has(category)) groups.set(category, []);
          if (after) {
            const skills = after.split(/[,;|•]+/).map(cleanSkill).filter(Boolean);
            groups.get(category).push(...skills);
          }
          // Subsequent bare lines belong to this header until the next header.
          currentCategory = category;
          continue;
        }
        // Bare skill(s) — may be comma-separated on one line
        const parts = stripped.split(/[,;|•]+/).map(cleanSkill).filter(Boolean);
        for (const p of parts) {
          if (currentCategory) {
            if (!groups.has(currentCategory)) groups.set(currentCategory, []);
            groups.get(currentCategory).push(p);
          } else {
            bare.push(p);
          }
        }
      }
      // Group bare skills that had no explicit category into buckets
      if (bare.length > 0) {
        const grouped = groupSkills(bare);
        for (const g of grouped) {
          if (!groups.has(g.name)) groups.set(g.name, []);
          groups.get(g.name).push(...g.skills);
        }
      }
      if (groups.size > 0) {
        const totalSkills = [...groups.values()].reduce((n, arr) => n + arr.length, 0);
        report.skillsGrouped += totalSkills;
        // One line per category: "Category: skill1, skill2, ..." — this is exactly
        // what the import manager's skills branch expects (category before colon,
        // comma-separated skills after) and what the technical template renders as
        // "Category: a | b | c" on one row. Deduplicate case-insensitively per category.
        content = [];
        for (const [category, skills] of groups.entries()) {
          const seen = new Set();
          const deduped = [];
          for (const s of skills) {
            const k = s.toLowerCase();
            if (!seen.has(k)) { seen.add(k); deduped.push(s); }
          }
          // Merge fragmented lines like "User" + "Acceptance Testing (UAT)"
          // that were split by PDF column width. Single short word followed by
          // a longer capitalized phrase is likely a broken line.
          const merged = [];
          for (let i = 0; i < deduped.length; i++) {
            const cur = deduped[i];
            const next = deduped[i + 1];
            if (cur && next && cur.split(/\s+/).length === 1 && cur.length <= 6 && cur.length >= 2
              && next.length > 6 && /^[A-Z]/.test(next) && !next.includes(':') && !cur.includes(':')
              && !/^(Git|Jira|Java|SQL|HTML|CSS|AWS|GitHub|Linux|Docker|React|Node|Python)$/i.test(cur)) {
              merged.push(`${cur} ${next}`);
              i++;
            } else {
              merged.push(cur);
            }
          }
          // Drop empty categories (e.g. "Soft Skills:" with no following skills)
          // — they appear as stray headers in the preview.
          if (merged.length > 0) content.push(`${category}: ${merged.join(', ')}`);
        }
      }
    }
    let entries = null;
    let eduEntries = null;
    let tidied = 0;
    if (canon.type === 'experience') {
      entries = splitExperienceEntries(content);
      report.entriesSplit += entries.length;
      // Tidy only bullets, keep header/dates as-is; rewrite content as tidy bullets for the editor.
      const bulletLines = entries.flatMap((e) => e.bullets);
      if (bulletLines.length > 0) {
        const t = tidyBullets(bulletLines);
        tidied = t.tidied;
        // Map tidied bullets back into entries, then rebuild content as header + tidied bullets.
        let idx = 0;
        for (const e of entries) {
          for (let i = 0; i < e.bullets.length; i++) e.bullets[i] = t.lines[idx++];
        }
        content = entries.flatMap((e) => [e.header, ...e.bullets].filter(Boolean));
      }
    } else if (canon.type === 'education') {
      eduEntries = splitEducationEntries(content);
      report.entriesSplit += eduEntries.length;
    } else if (Array.isArray(content) && content.some((l) => /^[•\-*]/.test(String(l).trim()) || /^\d+[.)]\s/.test(String(l).trim()))) {
      // Other list-like sections (projects etc.): tidy any bullet lines.
      const t = tidyBullets(content);
      if (t.tidied > 0) { content = t.lines; tidied = t.tidied; }
    }
    if (tidied > 0) report.bulletsTidied += tidied;
    const hasDates = content.some((l) => looksLikeDateRange(String(l)));
    staged.push({ ...sec, title: canon.title, type: canon.type, content, ...(entries ? { _entries: entries } : {}), ...(eduEntries ? { _eduEntries: eduEntries } : {}), ...(hasDates ? { _hasDates: true } : {}) });
  }
  const merged = mergeDuplicateSections(staged);
  report.sectionsMerged = merged.merged;
  report.linesCleaned = report.typosFixed;
  return { parsed: { ...parsed, sections: merged.sections }, report };
}

export default { cleanExtractedText, canonicalizeSection, splitExperienceEntries, splitEducationEntries, groupSkills, correctProse, tidyBullets, mergeDuplicateSections, normalizePipeline, isPageArtifact };
