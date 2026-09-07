import { describe, it, expect } from 'vitest';
import {
  ConsistencyStudio,
  firstVerbWord,
  isPastVerb,
  presentBaseOf,
  pastFormOf,
  reformatDateString,
} from '../../src/js/modules/consistency-studio.js';
import { extractKeywords, suggestSkillsOffline } from '../../src/js/utils/keywords.js';

describe('tense helpers', () => {
  it('reads first verbs', () => {
    expect(firstVerbWord('"Led" the team')).toBe('led');
    expect(firstVerbWord('• Managed budgets')).toBe('managed');
  });
  it('detects past tense, spares lookalikes', () => {
    expect(isPastVerb('managed')).toBe(true);
    expect(isPastVerb('redesigned')).toBe(true);
    expect(isPastVerb('need')).toBe(false);
    expect(isPastVerb('manage')).toBe(false);
  });
  it('resolves present forms to base verbs', () => {
    expect(presentBaseOf('manage')).toBe('manage');
    expect(presentBaseOf('manages')).toBe('manage');
    expect(presentBaseOf('establishes')).toBe('establish');
    expect(presentBaseOf('banana')).toBe(null);
  });
  it('maps base verbs to safe past forms only', () => {
    expect(pastFormOf('manage')).toBe('managed');
    expect(pastFormOf('lead')).toBe('led');
    expect(pastFormOf('banana')).toBe(null);
  });
});

describe('reformatDateString', () => {
  it('converts between formats', () => {
    expect(reformatDateString('January 2020', 'MM_SLASH_YYYY')).toBe('01/2020');
    expect(reformatDateString('01/2020', 'MONTH_YEAR_LONG')).toBe('January 2020');
    expect(reformatDateString('2020-03', 'MONTH_YEAR_SHORT')).toBe('Mar 2020');
  });
  it('returns null when nothing to do or unparseable', () => {
    expect(reformatDateString('01/2020', 'MM_SLASH_YYYY')).toBe(null);
    expect(reformatDateString('sometime', 'MM_SLASH_YYYY')).toBe(null);
  });
});

function pastRoleDoc(bullets, extra = {}) {
  return {
    personalInfo: { fullName: 'Test' },
    sections: [{
      id: 'sec1', title: 'Work Experience', sectionType: 'experience', visible: true,
      items: [{ id: 'i1', jobTitle: 'QA Engineer', company: 'Acme', achievements: bullets, ...extra }],
    }],
  };
}

describe('checkTenseConsistency', () => {
  it('flags present verbs in past roles with a fix', () => {
    const cs = new ConsistencyStudio(null, null);
    cs.checkTenseConsistency(pastRoleDoc(['Manage a team of five', 'Led migration to AWS']));
    const tense = cs.findings.filter((f) => f.category === 'verb-tense');
    expect(tense.length).toBe(1);
    expect(tense[0].fixable).toBe(true);
    expect(tense[0].fixAction.pastVerb).toBe('managed');
  });
  it('leaves current roles alone', () => {
    const cs = new ConsistencyStudio(null, null);
    cs.checkTenseConsistency(pastRoleDoc(['Manage a team'], { currentlyWorking: true }));
    expect(cs.findings.filter((f) => f.category === 'verb-tense')).toEqual([]);
  });
  it('applyVerbTenseFix rewrites the first word', () => {
    const cs = new ConsistencyStudio(null, null);
    const doc = pastRoleDoc(['Manage a team of five']);
    const ok = cs.applyVerbTenseFix(doc, {
      sectionId: 'sec1', itemIndex: 0, lineIndex: 0, field: 'achievements', pastVerb: 'managed',
    });
    expect(ok).toBe(true);
    expect(doc.sections[0].items[0].achievements[0]).toBe('Managed a team of five');
  });
  it('applyReformatDate rewrites string date fields', () => {
    const cs = new ConsistencyStudio(null, null);
    const doc = pastRoleDoc([], {});
    doc.sections[0].items[0].startDate = 'January 2020';
    const ok = cs.applyReformatDate(doc, {
      sectionId: 'sec1', itemIndex: 0, field: 'startDate', newValue: '01/2020',
    });
    expect(ok).toBe(true);
    expect(doc.sections[0].items[0].startDate).toBe('01/2020');
  });
});

describe('keywords', () => {
  it('ranks frequent meaningful terms first', () => {
    const top = extractKeywords('JavaScript JavaScript Python testing testing testing', 3);
    expect(top[0].term.toLowerCase()).toBe('testing');
    expect(top.map((k) => k.term.toLowerCase())).toContain('javascript');
  });
  it('keeps tech tokens, drops stopwords', () => {
    const terms = extractKeywords('Experienced in C++ and R and the team', 10).map((k) => k.term);
    expect(terms.join(' ')).toMatch(/C\+\+|R/);
    expect(terms.map((t) => t.toLowerCase())).not.toContain('the');
  });
  it('suggestSkillsOffline returns strings', () => {
    const s = suggestSkillsOffline('QA Engineer Selenium Cypress JavaScript Agile testing', 5);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => typeof x === 'string')).toBe(true);
  });
});
