import { describe, it, expect } from 'vitest';
import {
  isPageArtifact,
  cleanExtractedText,
  canonicalizeSection,
  splitExperienceEntries,
  splitEducationEntries,
  groupSkills,
  correctProse,
  tidyBullets,
  mergeDuplicateSections,
  normalizePipeline,
} from '../../src/js/utils/import-pipeline.js';

describe('isPageArtifact + cleanExtractedText', () => {
  it('drops page markers and repairs hyphenated breaks', () => {
    const { text, stats } = cleanExtractedText('Jane Doe\nPage 1 of 2\nExperi-\nence\n- Led team\nConfidential\n2 / 3');
    expect(text).not.toMatch(/Page 1|Confidential|\/ 3/);
    expect(text).toContain('Experience');
    expect(stats.artifactsDropped).toBeGreaterThanOrEqual(3);
    expect(stats.hyphensRepaired).toBe(1);
  });
  it('standardizes bullet glyphs and rejoins wrapped lines', () => {
    const { text } = cleanExtractedText('- Led team\nwith great results.');
    expect(text).toContain('• Led team');
  });
  it('leaves headers intact for fuzzy matching', () => {
    expect(isPageArtifact('Page 2')).toBe(true);
    expect(isPageArtifact('Work Experience')).toBe(false);
  });
});

describe('canonicalizeSection', () => {
  it('maps variants to canonical titles', () => {
    expect(canonicalizeSection('Work History', 'custom')).toEqual({ title: 'Professional Experience', type: 'experience' });
    expect(canonicalizeSection('Tech Stack', 'custom').type).toBe('skills');
    expect(canonicalizeSection('Career Summary', 'custom').type).toBe('summary');
  });
  it('leaves unknown titles alone and pretty-cases known types', () => {
    expect(canonicalizeSection('Hobbies', 'custom').title).toBe('Hobbies');
    expect(canonicalizeSection('ignored', 'education').title).toBe('Education');
  });
});

describe('splitExperienceEntries', () => {
  it('splits dated headers from bullets and keeps company/dates apart', () => {
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
    expect(entries[0].dates).toMatch(/2020/);
  });
});

describe('splitEducationEntries', () => {
  it('splits degree/institution/year', () => {
    const entries = splitEducationEntries(['B.Tech, MIT, 2019', 'MBA, IIM Ahmedabad, 2021']);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ degree: expect.stringMatching(/B\.Tech/i), institution: 'MIT', year: '2019' });
    expect(entries[1].year).toBe('2021');
  });
  it('attaches free-form extras to the current entry', () => {
    const entries = splitEducationEntries(['B.Sc, Delhi University, 2018', 'CGPA 8.2', 'Dean list']);
    expect(entries[0].extras).toEqual(expect.arrayContaining(['CGPA 8.2']));
  });
});

describe('groupSkills', () => {
  it('buckets + dedupes case-insensitively', () => {
    const g = groupSkills(['React', 'react', 'Jira', 'Hindi', 'Teamwork']);
    expect(g.find((x) => x.name === 'Technical').skills).toEqual(['React']);
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

describe('tidyBullets', () => {
  it('strips prefixes, capitalises and normalises punctuation', () => {
    const r = tidyBullets(['- led migration', '•cut costs 40% ', 'built dashboards.']);
    expect(r.lines).toEqual(['• Led migration.', '• Cut costs 40%.', '• Built dashboards.']);
    expect(r.tidied).toBe(3);
  });
  it('leaves links/protected lines untouched', () => {
    const r = tidyBullets(['See https://example.com for details']);
    expect(r.lines[0]).toBe('See https://example.com for details');
    expect(r.tidied).toBe(0);
  });
});

describe('mergeDuplicateSections', () => {
  it('merges same-type sections and drops empty ones', () => {
    const { sections, merged } = mergeDuplicateSections([
      { title: 'Skills', type: 'skills', content: ['React'] },
      { title: 'SKILLS', type: 'skills', content: ['Node'] },
      { title: 'Empty', type: 'custom', content: [] },
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].content).toEqual(expect.arrayContaining(['React', 'Node']));
    expect(merged).toBe(2); // one merged + one dropped
  });
});

describe('normalizePipeline end-to-end', () => {
  it('orchestrates with a report covering all flags', () => {
    const { parsed, report } = normalizePipeline({
      name: 'Jane',
      sections: [
        { title: 'Work History', type: 'custom', content: ['Senior Engineer, Acme (2020 - 2022)', '• did testeing'] },
        { title: 'Tech Stack', type: 'custom', content: ['React, Jira'] },
        { title: 'Education', type: 'education', content: ['B.Tech, MIT, 2019'] },
      ],
    });
    expect(parsed.sections.find((s) => s.title === 'Professional Experience')).toBeTruthy();
    expect(parsed.sections.find((s) => s.type === 'skills')).toBeTruthy();
    expect(parsed.sections.find((s) => s.type === 'education')._eduEntries).toBeTruthy();
    expect(report.sectionsMapped).toBeGreaterThanOrEqual(2);
    expect(report.typosFixed).toBeGreaterThan(0);
    expect(report.skillsGrouped).toBe(2);
    expect(report.entriesSplit).toBeGreaterThan(0);
    expect(report.bulletsTidied).toBeGreaterThan(0);
  });
  it('handles empty/unknown parsed shapes', () => {
    expect(normalizePipeline(null).parsed).toBe(null);
    expect(normalizePipeline({ sections: [] }).parsed.sections).toEqual([]);
  });
});
