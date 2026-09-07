import { describe, it, expect } from 'vitest';
import {
  levenshtein,
  matchHeaderFuzzy,
  correctWord,
  correctLine,
  extractContact,
  splitSkills,
  looksLikeDateRange,
} from '../../src/js/utils/text-parse.js';
import { parseResumeLocal } from '../../src/js/modules/local-resume-parser.js';

describe('levenshtein', () => {
  it('exact = 0, one edit = 1', () => {
    expect(levenshtein('skills', 'skills')).toBe(0);
    expect(levenshtein('skils', 'skills')).toBe(1);
    expect(levenshtein('experiance', 'experience')).toBe(1);
  });
  it('caps runaway distance', () => {
    expect(levenshtein('abc', 'xyz-different', 2)).toBeGreaterThan(2);
  });
});

describe('matchHeaderFuzzy', () => {
  it('matches exact headers', () => {
    expect(matchHeaderFuzzy('Work Experience')?.type).toBe('experience');
    expect(matchHeaderFuzzy('EDUCATION')?.type).toBe('education');
  });
  it('tolerates typos and OCR errors', () => {
    expect(matchHeaderFuzzy('Work Experiance')?.type).toBe('experience');
    expect(matchHeaderFuzzy('EDUCATOIN')?.type).toBe('education');
    expect(matchHeaderFuzzy('Technikal Skills')?.type).toBe('skills');
    expect(matchHeaderFuzzy('PROFFESSIONAL SUMMARY')?.type).toBe('summary');
  });
  it('splits header + trailing content', () => {
    const m = matchHeaderFuzzy('Profile Summary Results-driven QA engineer');
    expect(m?.type).toBe('summary');
    expect(m?.rest.length).toBeGreaterThan(5);
  });
  it('rejects ordinary content lines', () => {
    expect(matchHeaderFuzzy('Led migration of 40 services to AWS')).toBe(null);
    expect(matchHeaderFuzzy('Senior QA Engineer, Acme Corp')).toBe(null);
  });
});

describe('spell correction', () => {
  it('fixes common resume typos', () => {
    expect(correctWord('experiance').word).toBe('experience');
    expect(correctWord('skils').word).toBe('skills');
    expect(correctWord('enginners').word).toBe('engineers');
  });
  it('leaves good words, acronyms and short words alone', () => {
    expect(correctWord('experience').corrected).toBe(false);
    expect(correctWord('QA').corrected).toBe(false);
    expect(correctWord('AWS').corrected).toBe(false);
    expect(correctWord('API').corrected).toBe(false);
  });
  it('corrects lines but preserves emails and urls', () => {
    const r = correctLine('Led testeing efforts at pranjali@example.com, see https://github.com/me');
    expect(r.line).toContain('testing');
    expect(r.line).toContain('pranjali@example.com');
    expect(r.line).toContain('https://github.com/me');
    expect(r.corrections).toBeGreaterThan(0);
  });
});

describe('extractContact', () => {
  it('finds email, phone, linkedin, location', () => {
    const c = extractContact('Jane Doe\nQA Engineer\njane@x.com\n+1 (555) 123-4567\nAustin, Texas\nhttps://linkedin.com/in/janedoe');
    expect(c.email).toBe('jane@x.com');
    expect(c.phone.replace(/\D/g, '').length).toBeGreaterThanOrEqual(10);
    expect(c.linkedin).toMatch(/linkedin\.com/);
    expect(c.location).toMatch(/Austin/);
  });
  it('ignores years as phones', () => {
    const c = extractContact('B.S. 2019');
    expect(c.phone).toBe('');
  });
});

describe('splitSkills', () => {
  it('splits on commas, bullets, pipes, slashes', () => {
    expect(splitSkills('JavaScript, Python • React / Node.js')).toEqual(['JavaScript', 'Python', 'React', 'Node.js']);
  });
});

describe('looksLikeDateRange', () => {
  it('detects ranges, rejects plain text', () => {
    expect(looksLikeDateRange('Jan 2020 – Present')).toBe(true);
    expect(looksLikeDateRange('2019 - 2022')).toBe(true);
    expect(looksLikeDateRange('Led a team of five')).toBe(false);
  });
});

describe('parseResumeLocal end-to-end', () => {
  const typoResume = [
    'Pranjali Bundele',
    'QA Automation Enginner',
    'pranjali@example.com',
    '(555) 123-4567',
    'Pune, India',
    '',
    'Proffessional Summary',
    'Detail-oriented enginner with 5 years of experiance in testeing.',
    '',
    'Work Experiance',
    'QA Engineer, Acme Corp',
    'Jan 2021 - Present',
    '- Led testeing efforts across 3 teams',
    '',
    'EDUCATOIN',
    'B.S. Computer Science, MIT, 2019',
    '',
    'Technikal Skills',
    'JavaScript, Python, Selenium • Cypress',
  ].join('\n');

  it('maps typo headers to the right sections', () => {
    const out = parseResumeLocal(typoResume);
    const types = out.sections.map((s) => s.type);
    expect(types).toContain('experience');
    expect(types).toContain('education');
    expect(types).toContain('skills');
    expect(types).toContain('summary');
  });
  it('extracts name, title, contacts', () => {
    const out = parseResumeLocal(typoResume);
    expect(out.name).toBe('Pranjali Bundele');
    expect(out.title).toMatch(/QA/i);
    expect(out.email).toBe('pranjali@example.com');
    expect(out.location).toMatch(/Pune/);
  });
  it('writes corrected spelling into section content', () => {
    const out = parseResumeLocal(typoResume);
    const all = out.sections.map((s) => s.content.join(' ')).join(' ');
    expect(all).toContain('experience');
    expect(all).not.toMatch(/experiance/);
    expect(out._corrections).toBeGreaterThan(0);
  });
  it('splits skills into items', () => {
    const out = parseResumeLocal(typoResume);
    const skills = out.sections.find((s) => s.type === 'skills');
    expect(skills.content).toContain('Selenium');
    expect(skills.content).toContain('Cypress');
  });
  it('tags itself and handles empty input', () => {
    expect(parseResumeLocal(typoResume)._parser).toBe('local-smart-v1');
    expect(parseResumeLocal('').sections).toEqual([]);
  });
});
