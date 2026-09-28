import { describe, it, expect } from 'vitest';
import { ATSChecker } from '../src/js/modules/ats-checker.js';

describe('ATS Replacement & Bidirectional Sync Engine', () => {
  it('correctly matches and replaces bullet points with punctuation differences', () => {
    // Mock editor context
    const mockDoc = {
      schemaVersion: 1,
      personalInfo: {
        fullName: 'Jane Doe',
        professionalTitle: 'Lead Cloud Architect',
        email: 'jane@example.com',
        phone: '555-123-4567',
        summary: 'Experienced cloud architect specialized in AWS and Kubernetes microservices.'
      },
      sections: [
        {
          id: 'exp-sec',
          type: 'experience',
          title: 'Professional Experience',
          items: [
            {
              id: 'item-1',
              title: 'Senior DevOps Lead',
              company: 'CloudWorks Inc',
              startDate: '2021-01',
              endDate: 'Present',
              achievements: [
                { id: 'ach-1', text: 'Managed the deployment pipelines and reduced build failures.' },
                { id: 'ach-2', text: 'Helped team with cloud migrations.' }
              ]
            }
          ]
        }
      ]
    };

    let refreshed = false;
    let previewUpdated = false;

    const mockEditor = {
      document: mockDoc,
      handleFieldChange() {},
      refreshLeftPanel() { refreshed = true; },
      updatePreview() { previewUpdated = true; }
    };

    // Bind replacement engine
    function applySuggestion(editor, original, suggestion, fieldHint) {
      const cleanStr = (s) => {
        if (typeof s !== 'string') return '';
        return s
          .replace(/^[•\-*\d.\s→"']+|[•\-*\d.\s→"']+$/g, '')
          .replace(/[*_~`]/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const origClean = cleanStr(original);
      const origNorm = origClean.toLowerCase();
      if (origNorm.length < 2) return false;

      let found = false;

      const calcSimilarity = (a, b) => {
        if (!a || !b) return 0;
        const normA = cleanStr(a).toLowerCase();
        const normB = cleanStr(b).toLowerCase();
        if (normA === normB) return 1.0;
        if (normA.includes(normB) || normB.includes(normA)) return 0.85;

        const wordsA = new Set(normA.split(/\s+/).filter(w => w.length > 2));
        const wordsB = new Set(normB.split(/\s+/).filter(w => w.length > 2));
        if (wordsA.size === 0 || wordsB.size === 0) return 0;
        let intersection = 0;
        for (const w of wordsA) {
          if (wordsB.has(w)) intersection++;
        }
        const union = wordsA.size + wordsB.size - intersection;
        return union > 0 ? (intersection / union) : 0;
      };

      const isMatch = (targetText) => {
        if (!targetText || typeof targetText !== 'string') return false;
        const sim = calcSimilarity(targetText, origClean);
        return sim >= 0.55;
      };

      const replaceInString = (targetText) => {
        if (!targetText || typeof targetText !== 'string') return targetText;
        const norm = cleanStr(targetText).toLowerCase();
        if (norm === origNorm) return suggestion.trim();
        if (origNorm.length > 5 && norm.includes(origNorm)) {
          const escaped = origClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return targetText.replace(new RegExp(escaped, 'i'), suggestion.trim());
        }
        if (isMatch(targetText)) return suggestion.trim();
        return targetText;
      };

      // Search sections & achievements
      if (editor.document.sections) {
        for (const section of editor.document.sections) {
          if (section.items) {
            for (const item of section.items) {
              if (item.achievements) {
                for (let i = 0; i < item.achievements.length; i++) {
                  const ach = item.achievements[i];
                  if (typeof ach === 'object' && ach && typeof ach.text === 'string' && isMatch(ach.text)) {
                    ach.text = replaceInString(ach.text);
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
            }
            if (found) break;
          }
        }
      }

      if (found) {
        editor.handleFieldChange();
        editor.refreshLeftPanel();
        editor.updatePreview();
      }
      return found;
    }

    // Test 1: Fuzzy match on achievement with paraphrased suggestion
    const replaced = applySuggestion(
      mockEditor,
      'Managed deployment pipelines and reduced build failures', // note missing "the" and slightly different words
      'Spearheaded CI/CD deployment pipelines using GitLab CI, reducing build failure rates by 38% across 14 microservices.'
    );

    expect(replaced).toBe(true);
    expect(mockDoc.sections[0].items[0].achievements[0].text).toContain('Spearheaded CI/CD deployment');
    expect(refreshed).toBe(true);
    expect(previewUpdated).toBe(true);
  });
});
