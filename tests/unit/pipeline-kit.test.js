import { describe, it, expect } from 'vitest';
import { buildInterviewPack } from '../../src/js/utils/interview-pack.js';
import { learnUrl } from '../../src/js/utils/skill-links.js';
import { draftCoverLetter } from '../../src/js/utils/cover-draft.js';
import { scoreLinkedIn } from '../../src/js/utils/linkedin-score.js';

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
