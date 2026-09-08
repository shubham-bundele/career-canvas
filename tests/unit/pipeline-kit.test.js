import { describe, it, expect } from 'vitest';
import { cleanExtractedText, canonicalizeSection, splitExperienceEntries, groupSkills, correctProse, normalizePipeline } from '../../src/js/utils/import-pipeline.js';
import { buildInterviewPack } from '../../src/js/utils/interview-pack.js';
import { learnUrl } from '../../src/js/utils/skill-links.js';
import { draftCoverLetter } from '../../src/js/utils/cover-draft.js';
import { scoreLinkedIn } from '../../src/js/utils/linkedin-score.js';

describe('cleanExtractedText', () => {
  it('drops artifacts, repairs hyphens, standardizes bullets', () => {
    const r = cleanExtractedText('Jane Doe\nPage 1 of 2\nExperi-\nence\n- Led team\nConfidential');
    expect(r.text).not.toMatch(/Page 1|Confidential/);
    expect(r.text).toContain('Experience');
    expect(r.text).toContain('• Led team');
    expect(r.stats.artifactsDropped).toBeGreaterThanOrEqual(2);
    expect(r.stats.hyphensRepaired).toBe(1);
  });
});

describe('canonicalizeSection', () => {
  it('maps variants to canonical titles', () => {
    expect(canonicalizeSection('Work History', 'custom')).toEqual({ title: 'Professional Experience', type: 'experience' });
    expect(canonicalizeSection('Tech Stack', 'custom').type).toBe('skills');
    expect(canonicalizeSection('Hobbies', 'custom').title).toBe('Hobbies');
  });
});

describe('splitExperienceEntries', () => {
  it('splits dated headers from bullets', () => {
    const entries = splitExperienceEntries([
      'Senior Engineer, Acme (2020 - 2022)',
      '• Led migration',
      '• Cut costs 40%',
      'Engineer, Beta (2018 - 2020)',
      '• Built dashboards',
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0].bullets).toHaveLength(2);
    expect(entries[0].header).toMatch(/Acme/);
  });
});

describe('groupSkills', () => {
  it('buckets + dedupes', () => {
    const g = groupSkills(['React', 'react', 'Jira', 'Hindi', 'Teamwork']);
    const tech = g.find((x) => x.name === 'Technical');
    expect(tech.skills).toEqual(['React']);
    expect(g.find((x) => x.name === 'Tools').skills).toEqual(['Jira']);
    expect(g.find((x) => x.name === 'Languages').skills).toEqual(['Hindi']);
    expect(g.find((x) => x.name === 'Soft Skills').skills).toEqual(['Teamwork']);
  });
});

describe('correctProse', () => {
  it('fixes prose but protects emails/phones/caps', () => {
    const r = correctProse(['Led testeing efforts', 'a@b.com', '+91-9999999999', 'QA ENGINEER']);
    expect(r.lines[0]).toContain('testing');
    expect(r.lines[1]).toBe('a@b.com');
    expect(r.lines[2]).toBe('+91-9999999999');
    expect(r.lines[3]).toBe('QA ENGINEER');
  });
});

describe('normalizePipeline', () => {
  it('orchestrates with a report', () => {
    const { parsed, report } = normalizePipeline({
      name: 'Jane', sections: [
        { title: 'Work History', type: 'custom', content: ['Dev, Acme 2020 - 2022', '• Did testeing'] },
        { title: 'Tech Stack', type: 'custom', content: ['React, Jira'] },
      ],
    });
    expect(parsed.sections[0].title).toBe('Professional Experience');
    expect(parsed.sections[1].type).toBe('skills');
    expect(report.sectionsMapped).toBe(2);
    expect(report.typosFixed).toBeGreaterThan(0);
    expect(report.skillsGrouped).toBe(2);
  });
});

describe('interview-pack', () => {
  it('builds offline pack with JD-derived questions', () => {
    const p = buildInterviewPack(
      { personalInfo: { fullName: 'Jane', professionalTitle: 'QA Engineer' } },
      { position: 'SDET', company: 'Acme', jdText: 'Must know Playwright and mentoring.' }
    );
    expect(p.questions.some((q) => /playwright/i.test(q))).toBe(true);
    expect(p.questionsToAsk.length).toBeGreaterThan(3);
    expect(p.followUpEmail).toMatch(/Acme/);
    expect(p.pitch).toMatch(/Jane/);
  });
});

describe('skill-links', () => {
  it('returns curated links + search fallback', () => {
    expect(learnUrl('Playwright').url).toMatch(/playwright\.dev/);
    expect(learnUrl('Playwright').curated).toBe(true);
    expect(learnUrl('ObscureSkillXYZ').curated).toBe(false);
  });
});

describe('cover-draft', () => {
  it('assembles a letter from doc + application', () => {
    const d = draftCoverLetter(
      { personalInfo: { fullName: 'Jane', professionalTitle: 'QA Engineer' }, sections: [] },
      { company: 'Acme', position: 'SDET' }
    );
    expect(d.body).toMatch(/Acme/);
    expect(d.body).toMatch(/SDET/);
    expect(d.closing).toMatch(/Jane/);
  });
});

describe('linkedin-score', () => {
  it('scores checklists', () => {
    const s = scoreLinkedIn({ hasUrl: true, headline: 'QA Engineer | Playwright', summary: 'x'.repeat(120), experienceCount: 3, skillsCount: 10, hasPhoto: true, recommendations: 2 });
    expect(s.score).toBe(100);
    const weak = scoreLinkedIn({});
    expect(weak.score).toBe(0);
    expect(weak.checks).toHaveLength(7);
  });
});
