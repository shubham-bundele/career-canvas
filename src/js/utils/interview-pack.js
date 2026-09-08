/**
 * Offline interview-prep + follow-up kit (pure, Node-safe).
 * Used as the guaranteed fallback when cloud AI is unavailable.
 */
import { extractSkillsWanted } from './jd-parse.js';

const GENERAL_QUESTIONS = [
  'Tell me about yourself — walk me through your background in 2 minutes.',
  'Why are you interested in this role and our company specifically?',
  'What is the achievement you are most proud of, and how did you measure it?',
  'Describe a difficult problem you solved. What was your approach?',
  'Tell me about a time you disagreed with a teammate or manager.',
  'How do you prioritize when everything is urgent?',
  'What are you doing to grow your skills right now?',
];

const QUESTIONS_TO_ASK = [
  'What does success look like in the first 90 days?',
  'What is the biggest challenge the team is facing right now?',
  'How is performance measured for this role?',
  'Can you describe the team structure and who I would work with daily?',
  'What opportunities are there for learning and growth?',
];

export function questionsForSkills(skills) {
  return (skills || []).slice(0, 6).map(
    (s) => `Tell me about your hands-on experience with ${s} — what did you build or improve with it?`
  );
}

export function questionsForJd(jdText) {
  const skills = extractSkillsWanted(jdText);
  const out = [...questionsForSkills(skills)];
  if (/leader|manage|mentor|team/i.test(jdText || '')) {
    out.push('Describe your leadership style when guiding a team through a tough deadline.');
  }
  if (/remote|distributed|async/i.test(jdText || '')) {
    out.push('How do you stay effective and visible while working remotely?');
  }
  return out;
}

/**
 * Build an offline interview pack from resume + optional JD.
 * Returns { questions[], questionsToAsk[], pitch, followUpEmail }.
 */
export function buildInterviewPack(doc, { position = '', company = '', jdText = '' } = {}) {
  const pi = doc?.personalInfo || {};
  const name = pi.fullName || 'there';
  const title = pi.professionalTitle || pi.resumeHeadline || 'professional';
  const questions = [
    ...GENERAL_QUESTIONS,
    ...questionsForJd(jdText),
  ].slice(0, 12);
  const pitch = `Hi, I'm ${name}, a ${title}${position ? ` applying for the ${position} role` : ''}${company ? ` at ${company}` : ''}. ` +
    `In my recent work I've focused on delivering measurable results, and I'd love to bring that impact to your team.`;
  const followUpEmail =
    `Subject: Thank you — ${position || 'the role'}${company ? ` at ${company}` : ''}\n\n` +
    `Hi${company ? ` ${company} team` : ' there'},\n\n` +
    `Thank you for taking the time to speak with me${position ? ` about the ${position} role` : ''}. ` +
    `I enjoyed learning more about the team and I'm excited about the opportunity.\n\n` +
    `Please let me know if you need anything else from my side.\n\nBest regards,\n${name}`;
  return { questions, questionsToAsk: QUESTIONS_TO_ASK, pitch, followUpEmail };
}

export default { buildInterviewPack, questionsForJd, questionsForSkills };
