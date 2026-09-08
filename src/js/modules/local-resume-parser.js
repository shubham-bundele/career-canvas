/**
 * Local smart resume parser (fully offline).
 * Used as the fallback when AI parsing is unavailable or fails:
 *   AI (on-device or cloud) → parseResumeLocal() → legacy parsePlainText()
 *
 * Improvements over the legacy rule-based parser:
 * - fuzzy section-header matching (tolerates typos/OCR errors: "Experiance")
 * - word-level spell correction with a resume vocabulary
 * - richer contact extraction: title, LinkedIn, GitHub, website, location
 * - skills sections split into individual skills
 * - corrected spelling is written into the section content that the
 *   field-mapping UI shows, so fixes land in the right sections
 *
 * Pure logic, no DOM — runnable in Node for unit tests.
 */
import {
  matchHeaderFuzzy,
  correctLine,
  extractContact,
  splitSkills,
  looksLikeDateRange,
  stripMarkup,
} from '../utils/text-parse.js';

const CONTACT_LINE_RE = /@|https?:|linkedin|github|www\.|\d{3,}/i;

function isContactLine(line) {
  return CONTACT_LINE_RE.test(line) || line.includes('|') || line.includes('·');
}

/** Heuristic: line under the name that reads like a professional title. */
function looksLikeTitle(line) {
  if (!line || line.length > 80 || line.length < 2) return false;
  if (/@|https?:|www\.|linkedin|github/.test(line)) return false;
  if (/\d{4}/.test(line)) return false; // dates belong to entries
  if (/^[•·▪\-*]/.test(line.trim())) return false;
  return /engineer|developer|designer|manager|analyst|consultant|accountant|nurse|teacher|writer|marketer|scientist|architect|administrator|specialist|executive|assistant|associate|director|lead|intern|student|professional|expert|freelancer|tester|sdet|qa\b|quality|automation|playwright|selenium|cypress|devops|developer|frontend|front-end|backend|back-end|fullstack|full-stack|data|cloud|mobile|ios|android|recruiter|banker|lawyer|doctor|pharmacist|chef|editor|producer|photographer|driver|officer|clerk/i.test(line);
}

/**
 * Guess the professional title from an uploaded filename:
 * "Shubham Bundele - Playwright Automation Engineer & SDET Resume.pdf"
 * -> "Playwright Automation Engineer & SDET". Pure.
 */
export function titleFromFilename(filename) {
  if (!filename) return '';
  const base = String(filename).split(/[\\/]/).pop().replace(/\.[a-z0-9]{1,5}$/i, '');
  const parts = base.split(/\s+[-–—|]\s+/).map((s) => s.trim()).filter(Boolean);
  const filler = /^(resume|cv|profile|updated|final|latest|new|\d{4})$/i;
  for (let i = parts.length - 1; i >= 0; i--) {
    let cand = parts[i].replace(/\b(resume|cv|profile|updated|final|latest|new|draft)\b/gi, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!cand || filler.test(cand)) continue;
    // The first segment is usually the person's name — only take it if it
    // actually reads like a title ("John Doe - Resume.pdf" must not -> "John Doe").
    if (i === 0 && !looksLikeTitle(cand)) continue;
    if (looksLikeTitle(cand) || (i > 0 && /[a-zA-Z]{3,}/.test(cand))) return cand;
  }
  return '';
}

/**
 * Parse resume text into the app's parsed shape:
 * { name, title, email, phone, location, linkedin, github, website,
 *   sections: [{ title, type, content[] }], _parser, _corrections }
 */
export function parseResumeLocal(text, opts = {}) {
  const cleaned = stripMarkup(text);
  const rawLines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

  const parsed = {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
    sections: [],
    _parser: 'local-smart-v1',
    _corrections: 0,
  };
  if (rawLines.length === 0) return parsed;

  // Spell-correct every line first so headers + content are fixed together.
  const lines = rawLines.map((l) => {
    const r = correctLine(l);
    parsed._corrections += r.corrections;
    return r.line;
  });

  // Name: first line (same convention as legacy parser).
  const firstLine = lines[0];
  if (firstLine.length < 60 && !firstLine.includes('@') && !firstLine.includes('http')) {
    parsed.name = firstLine;
  }

  // Title: first title-like line right under the name (before any section).
  // Skip contact lines so a pipe-joined header ("phone | email | city")
  // can't shadow the real title sitting a few lines down.
  for (let i = 1; i < Math.min(lines.length, 12); i++) {
    if (isContactLine(lines[i]) && !looksLikeTitle(lines[i])) continue;
    if (looksLikeTitle(lines[i])) { parsed.title = lines[i]; break; }
    if (matchHeaderFuzzy(lines[i])) break;
  }
  // Fallback: many uploads are named "Name - Job Title Resume.pdf".
  if (!parsed.title && opts.filename) {
    parsed.title = titleFromFilename(opts.filename);
  }

  // Contact: whole text (emails/phones/urls can sit anywhere in the header block).
  const contact = extractContact(lines.slice(0, 12).join('\n') + '\n' + cleaned);
  parsed.email = contact.email;
  parsed.phone = contact.phone;
  parsed.location = contact.location;
  parsed.linkedin = contact.linkedin;
  parsed.github = contact.github;
  parsed.website = contact.website;

  let currentSection = null;
  const pushSection = (title, type, extra = {}) => {
    currentSection = { title, type, content: [], ...extra };
    parsed.sections.push(currentSection);
  };

  lines.forEach((line, idx) => {
    if (idx === 0 && line === parsed.name) return;
    if (parsed.title && idx > 0 && line === parsed.title && idx < 6 && !currentSection) return;

    // Skip header-block contact lines before the first section.
    if (!currentSection && idx < 10 && isContactLine(line)) return;

    const match = line.length <= 60 ? matchHeaderFuzzy(line) : matchHeaderFuzzy(line.split(/[:]/)[0]);
    if (match && (line.length <= 60 || match.rest)) {
      pushSection(match.label, match.type, {
        _matchSource: 'fuzzy',
        ...(match.correctedFrom ? { _correctedFrom: match.correctedFrom } : {}),
      });
      if (match.rest) currentSection.content.push(match.rest);
      return;
    }

    if (currentSection) {
      currentSection.content.push(line);
    } else {
      pushSection('General', 'custom', { _matchSource: 'fallback' });
      currentSection.content.push(line);
    }
  });

  // Post-process sections: split skills, keep date ranges inline, drop empties.
  for (const sec of parsed.sections) {
    if (sec.type === 'skills') {
      const split = [];
      for (const line of sec.content) {
        const parts = splitSkills(line);
        if (parts.length > 1 || (parts.length === 1 && parts[0] !== line)) split.push(...parts);
        else split.push(line);
      }
      sec.content = split;
    }
    // flag sections that contain dated entries (editor can group them later)
    if (sec.content.some((l) => looksLikeDateRange(l))) sec._hasDates = true;
  }
  parsed.sections = parsed.sections.filter((s) => s.content.length > 0 || s.type === 'summary');

  return parsed;
}

export default { parseResumeLocal, titleFromFilename };
