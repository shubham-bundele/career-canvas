import { describe, it, expect } from 'vitest';
import { parseJobDescription, extractYearsRequired, extractSkillsWanted, detectSeniority, detectBuzzwords, scoreResumeVsJd, injectMissingSkills } from '../../src/js/utils/jd-parse.js';
import { scoreResume, totalMonthsFromDoc, seniorityCheck } from '../../src/js/utils/resume-score.js';

describe('parseJobDescription', () => {
  const jd = 'We need a Senior Frontend Engineer. Must have 5+ years of experience with React and TypeScript. Required: Node.js. Nice to have: GraphQL experience. Bonus: AWS knowledge.';
  it('splits required/preferred', () => {
    const p = parseJobDescription(jd);
    expect(p.required.length).toBeGreaterThanOrEqual(2);
    expect(p.preferred.length).toBeGreaterThanOrEqual(1);
  });
  it('extracts years + skills + seniority', () => {
    expect(extractYearsRequired(jd)).toBe(5);
    expect(extractSkillsWanted(jd)).toEqual(expect.arrayContaining(['react', 'typescript']));
    expect(detectSeniority(jd).level).toBe('Senior');
  });
  it('handles ranges and empty input', () => {
    expect(extractYearsRequired('3-5 years experience required')).toBe(3);
    expect(extractYearsRequired('no numbers here')).toBe(null);
    expect(parseJobDescription('').skills).toEqual([]);
  });
});

describe('detectBuzzwords', () => {
  it('flags cliches only', () => {
    expect(detectBuzzwords('Self-starter ninja with synergy')).toEqual(
      expect.arrayContaining(['ninja', 'synergy', 'self-starter']));
    expect(detectBuzzwords('Built a pipeline serving 2M events')).toEqual([]);
  });
});

const doc = {
  personalInfo: { fullName: 'Jane Doe', email: 'j@x.com', phone: '123', professionalTitle: 'Senior Engineer', city: 'Pune' },
  sections: [
    { sectionType: 'summary', type: 'text', title: 'Summary', content: 'Senior engineer with many years of experience building things and leading teams to deliver value and quality software products.' },
    {
      sectionType: 'experience', type: 'list', title: 'Experience',
      items: [{
        jobTitle: 'Senior Engineer', company: 'Acme', startYear: '2019', endYear: '', currentlyWorking: true,
        achievements: ['Led migration cutting costs by 40%', 'Built pipeline serving 2M events daily', 'Mentored 5 engineers across 2 teams'],
      }],
    },
    { sectionType: 'skills', type: 'list', title: 'Skills', items: [{ name: 'React' }, { name: 'Node' }, { name: 'AWS' }, { name: 'SQL' }, { name: 'Docker' }, { name: 'Leadership' }] },
    { sectionType: 'education', type: 'list', title: 'Education', items: [{ degree: 'B.Tech', institution: 'Uni' }] },
  ],
};

describe('scoreResume', () => {
  it('scores a strong resume high with few issues', () => {
    const r = scoreResume(doc);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
  it('penalizes empty docs', () => {
    const r = scoreResume({ personalInfo: {}, sections: [] });
    expect(r.score).toBeLessThan(50);
    expect(r.issues.some((i) => i.category === 'Contact')).toBe(true);
  });
  it('flags unquantified bullets and cliches', () => {
    const weak = JSON.parse(JSON.stringify(doc));
    weak.sections[1].items[0].achievements = ['Responsible for stuff', 'Helped with things as a team player'];
    const r = scoreResume(weak);
    expect(r.issues.some((i) => i.category === 'Impact')).toBe(true);
    expect(r.issues.some((i) => i.category === 'Language')).toBe(true);
  });
});

describe('totalMonthsFromDoc + seniorityCheck', () => {
  it('merges overlaps', () => {
    const d = { sections: [{ sectionType: 'experience', items: [
      { startYear: '2020', startMonth: '1', endYear: '2021', endMonth: '12' },
      { startYear: '2021', startMonth: '6', endYear: '2022', endMonth: '6' },
    ] }] };
    expect(totalMonthsFromDoc(d)).toBe(29); // Jan20-Jun22
  });
  it('flags senior title on thin experience', () => {
    expect(seniorityCheck('Senior Engineer', 12)?.severity).toBe('warning');
    expect(seniorityCheck('Engineer', 60)).toBe(null);
  });
});

describe('scoreResumeVsJd', () => {
  it('matches skills and reports missing', () => {
    const r = scoreResumeVsJd(doc, 'Must have React and Kubernetes. Required: AWS.');
    expect(r.matched).toContain('react');
    expect(r.missing).toContain('kubernetes');
    expect(r.score).toBeGreaterThan(0);
  });
});

describe('injectMissingSkills', () => {
  it('adds missing terms as disabled suggestions', () => {
    const copy = JSON.parse(JSON.stringify(doc));
    const { added } = injectMissingSkills(copy, [{ displayTerm: 'Kubernetes' }, { displayTerm: 'React' }], (() => { let n = 0; return () => `id-${n++}`; })());
    expect(added).toBe(1);
    const skills = copy.sections.find((s) => /skill/i.test(s.sectionType));
    const k8s = skills.items.find((i) => i.name === 'Kubernetes');
    expect(k8s.included).toBe(false);
    expect(k8s._suggested).toBe(true);
  });
  it('creates a skills section when none exists', () => {
    const bare = { personalInfo: {}, sections: [] };
    const { added } = injectMissingSkills(bare, ['Go'], () => 'x');
    expect(added).toBe(1);
    expect(bare.sections).toHaveLength(1);
    expect(bare.sections[0].sectionType).toBe('skills');
  });
  it('adds nothing when everything is present', () => {
    const copy = JSON.parse(JSON.stringify(doc));
    expect(injectMissingSkills(copy, [{ displayTerm: 'React' }], () => 'x').added).toBe(0);
  });
});
