import { describe, it, expect } from 'vitest';
import {
  ExperienceCalculator,
  extractExperienceEntries,
  normalizeMonth,
  normalizeYear,
} from '../../src/js/modules/experience-calculator.js';

describe('normalizeMonth', () => {
  it('converts full and abbreviated names', () => {
    expect(normalizeMonth('March')).toBe('3');
    expect(normalizeMonth('Mar')).toBe('3');
    expect(normalizeMonth('  SEPTEMBER ')).toBe('9');
    expect(normalizeMonth('Sept.')).toBe('9');
  });
  it('passes through numeric months', () => {
    expect(normalizeMonth('3')).toBe('3');
    expect(normalizeMonth('03')).toBe('3');
    expect(normalizeMonth(12)).toBe('12');
  });
  it('rejects blanks and garbage', () => {
    expect(normalizeMonth('')).toBe('');
    expect(normalizeMonth(null)).toBe('');
    expect(normalizeMonth(undefined)).toBe('');
    expect(normalizeMonth('Foo')).toBe('');
    expect(normalizeMonth('13')).toBe('');
  });
});

describe('normalizeYear', () => {
  it('keeps 4-digit years only', () => {
    expect(normalizeYear('2021')).toBe('2021');
    expect(normalizeYear('21')).toBe('');
    expect(normalizeYear('')).toBe('');
    expect(normalizeYear(' 2020 ')).toBe('2020');
  });
});

const doc = {
  sections: [
    {
      sectionType: 'professionalExperience',
      items: [
        {
          jobTitle: 'Senior Engineer', company: 'Acme',
          startMonth: 'March', startYear: '2021',
          endMonth: 'February', endYear: '2022', currentlyWorking: false,
        },
        {
          jobTitle: 'Lead', company: 'Beta',
          startMonth: 'June', startYear: '2022',
          endMonth: '', endYear: '', currentlyWorking: true,
        },
        { jobTitle: 'Undated', company: 'X', startYear: '', endYear: '' },
      ],
    },
    { sectionType: 'skills', items: [{ name: 'JS', startYear: '2020', endYear: '2021' }] },
  ],
};

describe('extractExperienceEntries', () => {
  it('extracts dated rows with numeric months and combined titles', () => {
    const rows = extractExperienceEntries(doc);
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('Senior Engineer — Acme');
    expect(rows[0].startMonth).toBe('3');
    expect(rows[0].endMonth).toBe('2');
    expect(rows[1].currentlyWorking).toBe(true);
    expect(rows[1].endYear).toBe('');
  });
  it('skips undated items and non-experience sections', () => {
    const rows = extractExperienceEntries(doc);
    expect(rows.some((r) => r.title.includes('Undated'))).toBe(false);
    expect(rows.some((r) => r.title.includes('JS'))).toBe(false);
  });
  it('handles empty/missing docs', () => {
    expect(extractExperienceEntries(null)).toEqual([]);
    expect(extractExperienceEntries({})).toEqual([]);
  });
  it('extracted rows feed duration math (Mar 2021–Feb 2022 = 11 months)', () => {
    const calc = new ExperienceCalculator();
    const rows = extractExperienceEntries(doc);
    expect(calc.calculateEntryDuration(rows[0])).toBe(11);
  });
});
