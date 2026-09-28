import { describe, it, expect } from 'vitest';
import { SmartFormatter } from '../../src/js/modules/smart-formatter.js';

describe('SmartFormatter', () => {
  it('analyzes empty doc gracefully', () => {
    const formatter = new SmartFormatter();
    const result = formatter.analyze(null);
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it('detects missing contact info and invalid email', () => {
    const formatter = new SmartFormatter();
    const doc = {
      personalInfo: { fullName: '', email: 'invalid-email', phone: '' },
      sections: [{ sectionType: 'experience', visible: true, items: [{ jobTitle: 'Engineer', company: 'Acme', achievements: [{ text: 'Built apps' }] }] }]
    };
    const result = formatter.analyze(doc);
    expect(result.issues.some(i => i.message.includes('Full name is missing'))).toBe(true);
    expect(result.issues.some(i => i.message.includes('Email format appears invalid'))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it('detects weak bullet starts and long bullets', () => {
    const formatter = new SmartFormatter();
    const doc = {
      personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
      sections: [{
        sectionType: 'experience',
        visible: true,
        items: [{
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
          achievements: [{ text: 'responsible for maintaining legacy servers' }]
        }]
      }]
    };
    const result = formatter.analyze(doc);
    expect(result.issues.some(i => i.category === 'bullets' && i.message.includes('Weak opening'))).toBe(true);
  });

  it('auto-fixes OCR artifacts, duplicate punctuation, typos, and bullet capitalization', () => {
    const formatter = new SmartFormatter();
    const doc = {
      personalInfo: {
        fullName: '  Jane Doe  ',
        email: 'jane@example.com',
        phone: '(2024)'
      },
      sections: [{
        sectionType: 'experience',
        visible: true,
        items: [{
          jobTitle: 'Senior Engineer',
          company: 'Acme Corp',
          achievements: [
            { text: '• worked on teh database managment system ..' },
            { text: 'implemented new caching  layer ,,' },
            { text: '' }
          ]
        }]
      }]
    };

    const fixedCount = formatter.applyAutoFixes(doc);
    expect(fixedCount).toBeGreaterThan(0);
    expect(doc.personalInfo.fullName).toBe('Jane Doe');
    expect(doc.personalInfo.phone).toBe('');
    expect(doc.sections[0].items[0].achievements.length).toBe(2);
    expect(doc.sections[0].items[0].achievements[0].text).toBe('Worked on the database management system.');
    expect(doc.sections[0].items[0].achievements[1].text).toBe('Implemented new caching layer,');
  });
});
