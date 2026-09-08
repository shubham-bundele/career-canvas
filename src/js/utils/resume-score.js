/**
 * Real-time resume scoring (pure, Node-safe). ~20 checks across contact,
 * summary, experience, impact, language, skills, education.
 * Returns { score (0-100), grade, issues[{severity:'error'|'warning'|'tip', category, message}] }.
 */
import { detectBuzzwords, resumeToPlainText, detectSeniority } from './jd-parse.js';

const ACTION_VERBS = new Set(
  'achieved accelerated acquired adapted administered adopted advised advocated analyzed approved arranged assessed assigned assisted audited authored automated boosted built calculated championed closed coached collaborated completed conceived conducted consolidated constructed consulted contributed created cut decreased delivered designed developed devised directed doubled drove earned edited eliminated enabled engineered established evaluated exceeded executed expanded expedited facilitated finalized forecasted founded generated grew guided headed hired identified implemented improved increased initiated introduced launched led leveraged maintained managed marketed mentored merged migrated modernized negotiated optimized orchestrated organized overhauled owned partnered pioneered pitched planned prevented prioritized processed produced programmed promoted proposed published raised rebuilt reduced refined reformed renegotiated reorganized researched resolved restructured revamped saved scaled secured shipped simplified sold solved spearheaded streamlined strengthened supervised surpassed tested trained transformed tripled upgraded validated won wrote'.split(' ')
);

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function monthNum(v) {
  if (v === undefined || v === null) return 1;
  const s = String(v).trim().toLowerCase();
  if (/^(0?[1-9]|1[0-2])$/.test(s)) return parseInt(s, 10);
  return MONTHS[s] || 1;
}

function yearNum(v) {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) && n > 1900 && n < 2100 ? n : null;
}

/** Total experience months from experience-family sections (overlap-aware). */
export function totalMonthsFromDoc(doc) {
  const expTypes = new Set(['experience', 'professionalExperience', 'otherExperience', 'internships', 'apprenticeships', 'workExperience']);
  const ranges = [];
  const now = new Date();
  for (const sec of doc?.sections || []) {
    if (!sec || !expTypes.has(sec.sectionType || sec.type)) continue;
    for (const item of sec.items || []) {
      if (!item || typeof item !== 'object') continue;
      const sy = yearNum(item.startYear);
      if (sy === null) continue;
      const sm = monthNum(item.startMonth);
      let ey, em;
      if (item.currentlyWorking) { ey = now.getFullYear(); em = now.getMonth() + 1; }
      else {
        ey = yearNum(item.endYear);
        if (ey === null) continue;
        em = monthNum(item.endMonth);
      }
      const start = sy * 12 + sm;
      const end = ey * 12 + em;
      if (end >= start) ranges.push({ start, end });
    }
  }
  if (!ranges.length) return 0;
  ranges.sort((a, b) => a.start - b.start);
  const merged = [{ ...ranges[0] }];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) last.end = Math.max(last.end, ranges[i].end);
    else merged.push({ ...ranges[i] });
  }
  return merged.reduce((n, r) => n + (r.end - r.start), 0);
}

function bulletsOf(doc) {
  const out = [];
  for (const sec of doc?.sections || []) {
    for (const item of sec?.items || []) {
      for (const a of item?.achievements || []) {
        const t = typeof a === 'string' ? a : a?.text || '';
        if (t.trim()) out.push(t.trim());
      }
    }
  }
  return out;
}

function skillsOf(doc) {
  const out = [];
  for (const sec of doc?.sections || []) {
    const t = sec?.sectionType || sec?.type || '';
    if (!/skill/i.test(t)) continue;
    if (typeof sec.content === 'string') out.push(...sec.content.split(/[\n,•|/;]+/));
    for (const item of sec.items || []) {
      if (typeof item?.name === 'string') out.push(item.name);
      for (const k of ['skills', 'technologies']) {
        if (Array.isArray(item?.[k])) out.push(...item[k].filter((s) => typeof s === 'string'));
      }
    }
  }
  return [...new Set(out.map((s) => s.trim()).filter((s) => s && s.length <= 60))];
}

const HAS_NUMBER = /(\d+%|\d+\s?(x|\+)|[$€₹£]\s?[\d,]+|\b\d[\d,]*\b)/;

export function scoreResume(doc) {
  const issues = [];
  const err = (category, message) => issues.push({ severity: 'error', category, message });
  const warn = (category, message) => issues.push({ severity: 'warning', category, message });
  const tip = (category, message) => issues.push({ severity: 'tip', category, message });
  let score = 100;

  const pi = doc?.personalInfo || {};
  if (!pi.fullName?.trim()) { err('Contact', 'Missing full name'); score -= 12; }
  if (!pi.email?.trim() && !pi.phone?.trim()) { err('Contact', 'No email or phone — recruiters cannot reach you'); score -= 10; }
  else if (!pi.email?.trim() || !pi.phone?.trim()) { warn('Contact', 'Add both email and phone'); score -= 4; }
  if (!pi.professionalTitle?.trim() && !pi.resumeHeadline?.trim()) { warn('Contact', 'Missing professional title/headline'); score -= 4; }
  if (!pi.city?.trim() && !pi.location?.trim()) { tip('Contact', 'Add a location (city, country)'); score -= 2; }

  const sections = (doc?.sections || []).filter((s) => s && s.visible !== false);
  const byType = (re) => sections.filter((s) => re.test(s.sectionType || s.type || ''));
  const summary = byType(/summary|objective/i)[0];
  const summaryText = typeof summary?.content === 'string' ? summary.content.trim() : '';
  if (!summaryText) { warn('Summary', 'No professional summary'); score -= 6; }
  else {
    const words = summaryText.split(/\s+/).length;
    if (words < 20) { warn('Summary', 'Summary is very short — aim for 40-60 words'); score -= 3; }
    if (words > 120) { warn('Summary', 'Summary is long — trim past 120 words'); score -= 2; }
  }

  const expSecs = byType(/experience/i);
  const expItems = expSecs.flatMap((s) => s.items || []);
  if (!expItems.length) { err('Experience', 'No work experience entries'); score -= 12; }
  else {
    if (expItems.length === 1) { tip('Experience', 'Only one role listed — add internships or projects'); score -= 2; }
    const noDates = expItems.filter((it) => !yearNum(it.startYear));
    if (noDates.length) { warn('Experience', `${noDates.length} role${noDates.length > 1 ? 's' : ''} missing dates`); score -= 3; }
  }

  const bullets = bulletsOf(doc);
  if (expItems.length > 0 && bullets.length < expItems.length * 2) {
    warn('Impact', `Only ${bullets.length} bullets for ${expItems.length} roles — aim for 3+ per role`);
    score -= 5;
  }
  if (bullets.length > 0) {
    const quantified = bullets.filter((b) => HAS_NUMBER.test(b)).length;
    const pct = quantified / bullets.length;
    if (pct < 0.5) { warn('Impact', `${Math.round(pct * 100)}% of bullets have metrics — quantify results with numbers`); score -= 6; }
    const weakStarts = bullets.filter((b) => /^(responsible for|worked on|helped|assisted|tasked with|duties included)\b/i.test(b)).length;
    if (weakStarts > 0) { warn('Language', `${weakStarts} bullet${weakStarts > 1 ? 's' : ''} start weakly ("Responsible for…") — lead with an action verb`); score -= 4; }
    const noVerb = bullets.filter((b) => {
      const first = (b.match(/^[A-Za-z']+/) || [''])[0].toLowerCase();
      return first && !ACTION_VERBS.has(first);
    }).length;
    if (noVerb > bullets.length / 2) { tip('Language', 'Many bullets do not start with a strong action verb'); score -= 2; }
    const long = bullets.filter((b) => b.split(/\s+/).length > 35).length;
    if (long > 0) { tip('Language', `${long} bullet${long > 1 ? 's are' : ' is'} over 35 words — tighten`); score -= 2; }
  }

  const buzz = detectBuzzwords(resumeToPlainText(doc));
  if (buzz.length) { warn('Language', `Clichés found: ${buzz.slice(0, 4).join(', ')}${buzz.length > 4 ? ` (+${buzz.length - 4} more)` : ''}`); score -= 3; }

  const skills = skillsOf(doc);
  if (!skills.length) { warn('Skills', 'No skills listed'); score -= 6; }
  else if (skills.length < 6) { tip('Skills', 'Fewer than 6 skills — most roles expect 8-15'); score -= 2; }

  if (!byType(/education/i).length) { warn('Education', 'No education section'); score -= 4; }

  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Weak';
  return { score: Math.max(0, Math.min(100, score)), grade, issues };
}

/** Seniority coherence: title ladder vs total experience. Returns issue|null. */
export function seniorityCheck(title, totalMonths) {
  const { level, index } = detectSeniority(title);
  if (index < 0) return null;
  const years = totalMonths / 12;
  if ((level === 'Senior' || index >= 3) && years < 3) {
    return { severity: 'warning', category: 'Seniority', message: `Title says "${level}" but dated experience totals ~${years.toFixed(1)}y — expect questions` };
  }
  if ((level === 'Junior' || level === 'Intern') && years >= 6) {
    return { severity: 'tip', category: 'Seniority', message: `~${Math.round(years)}y of experience with a "${level}" title — consider Mid/Senior framing` };
  }
  return null;
}

export default { scoreResume, totalMonthsFromDoc, seniorityCheck };
