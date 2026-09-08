/**
 * Rule-based cover-letter drafting (pure, Node-safe).
 * Offline fallback / starting draft when cloud AI is unavailable.
 * Returns { salutation, body, closing }.
 */
import { totalMonthsFromDoc } from './resume-score.js';

function topSkills(doc, n = 3) {
  const found = [];
  for (const sec of doc?.sections || []) {
    const t = sec?.sectionType || sec?.type || '';
    if (!/skill/i.test(t)) continue;
    const push = (s) => {
      const v = String(s || '').trim();
      if (v && v.length <= 40 && !found.some((x) => x.toLowerCase() === v.toLowerCase())) found.push(v);
    };
    if (typeof sec.content === 'string') sec.content.split(/[\n,•|/;]+/).forEach(push);
    for (const item of sec.items || []) {
      if (typeof item?.name === 'string') push(item.name);
      for (const k of ['skills', 'technologies']) {
        if (Array.isArray(item?.[k])) item[k].forEach(push);
      }
    }
    if (found.length >= n) break;
  }
  return found.slice(0, n);
}

function firstRole(doc) {
  for (const sec of doc?.sections || []) {
    if (!/experience/i.test(sec?.sectionType || sec?.type || '')) continue;
    const item = (sec.items || [])[0];
    if (item) return { jobTitle: item.jobTitle || '', company: item.company || '' };
  }
  return { jobTitle: '', company: '' };
}

export function draftCoverLetter(doc, { company = '', position = '', hiringManager = '' } = {}) {
  const pi = doc?.personalInfo || {};
  const name = pi.fullName || 'Applicant';
  const title = pi.professionalTitle || pi.resumeHeadline || firstRole(doc).jobTitle || 'professional';
  const months = totalMonthsFromDoc(doc);
  const years = Math.floor(months / 12);
  const expPhrase = years >= 1 ? `with ${years}+ years of experience` : 'with hands-on experience';
  const skills = topSkills(doc);
  const skillPhrase = skills.length ? `, including ${skills.join(', ')}` : '';
  const role = position || title;
  const co = company || 'your company';

  const salutation = hiringManager ? `Dear ${hiringManager},` : 'Dear Hiring Manager,';
  const body = [
    `I am excited to apply for the ${role} position at ${co}. As a ${title} ${expPhrase}${skillPhrase}, I am confident I can contribute meaningfully to your team.`,
    `In my recent work, I have focused on delivering measurable results and collaborating effectively across teams. My resume details specific achievements that align with what you are looking for.`,
    `I would welcome the opportunity to discuss how my background fits your needs. Thank you for your time and consideration.`,
  ].join('\n\n');
  const closing = `Sincerely,\n${name}`;
  return { salutation, body, closing };
}

export default { draftCoverLetter };
