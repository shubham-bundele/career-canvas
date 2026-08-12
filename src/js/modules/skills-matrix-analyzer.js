import { generateUUID } from '../utils/id.js';
import { stripHTML } from '../utils/sanitize.js';
import {
  SKILL_ALIASES, SKILL_CATEGORIES, EVIDENCE_TYPES,
  MATCH_TYPES, STRENGTH_LEVELS, SKILL_STATUSES
} from './skills-matrix-data.js';

export class SkillsMatrixAnalyzer {
  constructor() {
    this.normalizedAliasMap = this.buildAliasMap();
    this.categoryMap = this.buildCategoryMap();
  }

  buildAliasMap() {
    const map = new Map();
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      const norm = this.normalizeText(canonical);
      map.set(norm, canonical);
      for (const alias of aliases) {
        map.set(this.normalizeText(alias), canonical);
      }
    }
    return map;
  }

  buildCategoryMap() {
    const map = new Map();
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      for (const skill of skills) {
        map.set(this.normalizeText(skill), category);
      }
    }
    return map;
  }

  normalizeText(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  preserveSkillSymbols(text) {
    return text;
  }

  getCanonicalName(skillText) {
    const norm = this.normalizeText(skillText);
    return this.normalizedAliasMap.get(norm) || skillText.trim();
  }

  getMatchType(inputText, canonicalName) {
    const normInput = this.normalizeText(inputText);
    const normCanonical = this.normalizeText(canonicalName);
    if (normInput === normCanonical) return MATCH_TYPES.EXACT;
    if (this.normalizedAliasMap.has(normInput)) {
      const resolved = this.normalizedAliasMap.get(normInput);
      if (this.normalizeText(resolved) === normCanonical) return MATCH_TYPES.ALIAS;
    }
    return MATCH_TYPES.PHRASE;
  }

  categorizeSkill(canonicalName) {
    const norm = this.normalizeText(canonicalName);
    if (this.categoryMap.has(norm)) return this.categoryMap.get(norm);
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      for (const skill of skills) {
        if (norm.includes(this.normalizeText(skill)) || this.normalizeText(skill).includes(norm)) {
          return category;
        }
      }
    }
    return 'Uncategorized';
  }

  extractContentFromDocument(doc) {
    const sections = [];
    if (!doc) return sections;

    if (doc.personalInfo) {
      const pi = doc.personalInfo;
      const summaryFields = [pi.resumeHeadline, pi.professionalTitle].filter(Boolean);
      if (summaryFields.length) {
        sections.push({
          sectionType: 'personalInfo',
          sectionId: 'personalInfo',
          title: 'Personal Info',
          entries: [{
            entryId: 'personalInfo',
            fields: { headline: summaryFields.join(' ') },
            text: summaryFields.join(' '),
            dateRange: null,
            hidden: false
          }]
        });
      }
    }

    if (!doc.sections || !Array.isArray(doc.sections)) return sections;

    for (const section of doc.sections) {
      const extracted = this.extractSection(section);
      if (extracted) sections.push(extracted);
    }
    return sections;
  }

  extractSection(section) {
    if (!section) return null;
    const sectionType = section.sectionType || section.type || 'custom';
    const sectionId = section.id;
    const title = section.title || '';
    const visible = section.visible !== false;
    const entries = [];

    if (section.content) {
      const text = stripHTML(section.content);
      if (text.trim()) {
        entries.push({
          entryId: sectionId + '-content',
          fields: { content: text },
          text,
          dateRange: null,
          hidden: !visible
        });
      }
    }

    if (section.items && Array.isArray(section.items)) {
      for (const item of section.items) {
        const entry = this.extractItem(item, sectionType);
        if (entry) {
          entry.hidden = !visible || item.hidden === true || item.included === false;
          entries.push(entry);
        }
      }
    }

    if (entries.length === 0) return null;
    return { sectionType, sectionId, title, entries, visible };
  }

  extractItem(item, sectionType) {
    if (!item) return null;
    const fields = {};
    const textParts = [];
    const dateRange = this.extractDateRange(item);

    const textFields = [
      'jobTitle', 'company', 'companyDescription', 'roleSummary', 'responsibilities',
      'projectName', 'summary', 'problem', 'solution', 'personalContribution', 'results',
      'degree', 'qualification', 'specialization', 'institution', 'description',
      'relevantCoursework', 'thesis', 'dissertation',
      'name', 'issuingOrganization', 'issuer',
      'role', 'organization', 'language', 'proficiency',
      'category', 'skills', 'text'
    ];

    for (const field of textFields) {
      if (item[field]) {
        const val = typeof item[field] === 'string' ? stripHTML(item[field]) : String(item[field]);
        if (val.trim()) {
          fields[field] = val;
          textParts.push(val);
        }
      }
    }

    const arrayFields = ['technologies', 'methods', 'skillTags', 'relatedSkills',
      'relevantCoursework', 'activities', 'societies', 'certifications'];
    for (const field of arrayFields) {
      if (Array.isArray(item[field]) && item[field].length > 0) {
        const vals = item[field].map(v => typeof v === 'string' ? stripHTML(v) : '').filter(Boolean);
        if (vals.length) {
          fields[field] = vals;
          textParts.push(vals.join(', '));
        }
      }
    }

    if (item.achievements && Array.isArray(item.achievements)) {
      const achTexts = [];
      for (const ach of item.achievements) {
        if (ach && ach.text) {
          achTexts.push(stripHTML(ach.text));
        }
        if (ach && ach.skillTags && Array.isArray(ach.skillTags)) {
          achTexts.push(ach.skillTags.join(', '));
        }
      }
      if (achTexts.length) {
        fields.achievements = achTexts;
        textParts.push(achTexts.join(' '));
      }
    }

    if (textParts.length === 0) return null;
    return {
      entryId: item.id || generateUUID(),
      fields,
      text: textParts.join(' '),
      dateRange,
      hidden: false
    };
  }

  extractDateRange(item) {
    let start = null, end = null;
    if (item.startYear) {
      const m = item.startMonth ? this.monthToNumber(item.startMonth) : 1;
      start = { year: parseInt(item.startYear), month: m };
    } else if (item.startDate) {
      const parsed = this.parseDate(item.startDate);
      if (parsed) start = parsed;
    } else if (item.date) {
      const parsed = this.parseDate(item.date);
      if (parsed) start = parsed;
    }

    if (item.currentlyWorking || item.currentProject || item.current || item.currentlyStudying) {
      end = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, current: true };
    } else if (item.endYear) {
      const m = item.endMonth ? this.monthToNumber(item.endMonth) : 12;
      end = { year: parseInt(item.endYear), month: m };
    } else if (item.endDate) {
      const parsed = this.parseDate(item.endDate);
      if (parsed) end = parsed;
    } else if (item.expirationDate || item.expiryDate) {
      const parsed = this.parseDate(item.expirationDate || item.expiryDate);
      if (parsed) end = parsed;
    }

    if (!start && !end) return null;
    return { start, end };
  }

  monthToNumber(month) {
    if (!month) return 1;
    if (typeof month === 'number') return month;
    const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const key = String(month).toLowerCase().slice(0, 3);
    return months[key] || 1;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    const yearOnly = s.match(/^(\d{4})$/);
    if (yearOnly) return { year: parseInt(yearOnly[1]), month: 1 };
    const d = new Date(s);
    if (!isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() + 1 };
    return null;
  }

  extractSkillsFromDocument(doc, extractedSections) {
    const skillMap = new Map();

    for (const section of extractedSections) {
      if (['skills', 'technicalSkills', 'toolsAndTechnologies', 'coreCompetencies'].includes(section.sectionType)) {
        for (const entry of section.entries) {
          const skillTexts = this.extractSkillNames(entry);
          for (const raw of skillTexts) {
            const canonical = this.getCanonicalName(raw);
            const norm = this.normalizeText(canonical);
            if (!skillMap.has(norm)) {
              skillMap.set(norm, {
                id: generateUUID(),
                displayName: canonical,
                normalizedName: norm,
                category: this.categorizeSkill(canonical),
                source: 'skills_section',
                listedInSkills: true,
                evidenceLocations: [],
                userConfirmed: false,
                userRejected: false
              });
            } else {
              skillMap.get(norm).listedInSkills = true;
            }
          }
        }
      }
    }

    for (const section of extractedSections) {
      if (['skills', 'technicalSkills', 'toolsAndTechnologies', 'coreCompetencies'].includes(section.sectionType)) continue;
      for (const entry of section.entries) {
        const foundSkills = this.findSkillsInText(entry.text);
        for (const found of foundSkills) {
          const norm = this.normalizeText(found.canonical);
          if (!skillMap.has(norm)) {
            skillMap.set(norm, {
              id: generateUUID(),
              displayName: found.canonical,
              normalizedName: norm,
              category: this.categorizeSkill(found.canonical),
              source: 'content',
              listedInSkills: false,
              evidenceLocations: [],
              userConfirmed: false,
              userRejected: false
            });
          }
        }
      }
    }

    return skillMap;
  }

  extractSkillNames(entry) {
    const skills = [];
    if (entry.fields.skills) {
      const parts = String(entry.fields.skills).split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      skills.push(...parts);
    }
    if (entry.fields.category && entry.fields.skills) {
      // Already handled above
    }
    if (entry.fields.name && !entry.fields.skills) {
      skills.push(entry.fields.name);
    }
    const arrayFields = ['technologies', 'methods', 'skillTags', 'relatedSkills'];
    for (const field of arrayFields) {
      if (Array.isArray(entry.fields[field])) {
        skills.push(...entry.fields[field]);
      }
    }
    return skills.filter(s => s && s.trim().length > 0);
  }

  findSkillsInText(text) {
    if (!text) return [];
    const normText = this.normalizeText(text);
    const found = [];
    const seen = new Set();

    const allSkillNames = [];
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      allSkillNames.push({ canonical, names: [canonical, ...aliases] });
    }
    allSkillNames.sort((a, b) => {
      const maxA = Math.max(...a.names.map(n => n.length));
      const maxB = Math.max(...b.names.map(n => n.length));
      return maxB - maxA;
    });

    for (const { canonical, names } of allSkillNames) {
      const normCanonical = this.normalizeText(canonical);
      if (seen.has(normCanonical)) continue;

      for (const name of names) {
        const normName = this.normalizeText(name);
        if (normName.length < 2) continue;

        const escapedName = normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[\\s,;|/()\\[\\]{}])${escapedName}(?:$|[\\s,;|/()\\[\\]{}.:!?])`, 'i');

        if (regex.test(' ' + normText + ' ')) {
          found.push({ canonical, matchedTerm: name, matchType: this.getMatchType(name, canonical) });
          seen.add(normCanonical);
          break;
        }
      }
    }

    return found;
  }

  findEvidenceForSkills(skillMap, extractedSections) {
    const evidenceRecords = [];

    for (const [normName, skill] of skillMap) {
      for (const section of extractedSections) {
        if (['skills', 'technicalSkills', 'toolsAndTechnologies', 'coreCompetencies'].includes(section.sectionType)) {
          for (const entry of section.entries) {
            if (this.textContainsSkill(entry.text, skill.displayName)) {
              evidenceRecords.push(this.createEvidenceRecord(
                skill, section, entry, EVIDENCE_TYPES.SKILL_LISTING, MATCH_TYPES.EXACT
              ));
            }
          }
          continue;
        }

        for (const entry of section.entries) {
          if (!this.textContainsSkill(entry.text, skill.displayName)) continue;

          const evidenceType = this.getEvidenceType(section.sectionType);
          const excerpt = this.extractExcerpt(entry.text, skill.displayName);
          const hasMetric = this.hasMetricIndicator(entry.text);
          const hasResult = this.hasResultIndicator(entry.text);

          evidenceRecords.push({
            id: generateUUID(),
            skillId: skill.id,
            skillName: skill.displayName,
            sectionType: section.sectionType,
            sectionId: section.sectionId,
            sectionTitle: section.title,
            entryId: entry.entryId,
            evidenceType,
            excerpt,
            matchType: this.getMatchType(skill.displayName, skill.displayName),
            dateRange: entry.dateRange,
            hidden: entry.hidden,
            hasMetric,
            hasResult,
            userConfirmed: false,
            userRejected: false
          });
        }
      }
    }

    return evidenceRecords;
  }

  textContainsSkill(text, skillName) {
    if (!text || !skillName) return false;
    const normText = this.normalizeText(text);
    const canonical = this.getCanonicalName(skillName);
    const namesToCheck = [canonical];

    const normCanonical = this.normalizeText(canonical);
    if (SKILL_ALIASES[normCanonical]) {
      namesToCheck.push(...SKILL_ALIASES[normCanonical]);
    }
    for (const [key, aliases] of Object.entries(SKILL_ALIASES)) {
      if (this.normalizeText(key) === normCanonical) {
        namesToCheck.push(key, ...aliases);
        break;
      }
    }

    for (const name of namesToCheck) {
      const normName = this.normalizeText(name);
      if (normName.length < 1) continue;
      const escaped = normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;|/()\\[\\]{}])${escaped}(?:$|[\\s,;|/()\\[\\]{}.:!?])`, 'i');
      if (regex.test(' ' + normText + ' ')) return true;
    }
    return false;
  }

  createEvidenceRecord(skill, section, entry, evidenceType, matchType) {
    return {
      id: generateUUID(),
      skillId: skill.id,
      skillName: skill.displayName,
      sectionType: section.sectionType,
      sectionId: section.sectionId,
      sectionTitle: section.title,
      entryId: entry.entryId,
      evidenceType,
      excerpt: this.extractExcerpt(entry.text, skill.displayName),
      matchType,
      dateRange: entry.dateRange,
      hidden: entry.hidden,
      hasMetric: false,
      hasResult: false,
      userConfirmed: false,
      userRejected: false
    };
  }

  getEvidenceType(sectionType) {
    const map = {
      'summary': EVIDENCE_TYPES.SUMMARY_MENTION,
      'professionalSummary': EVIDENCE_TYPES.SUMMARY_MENTION,
      'careerObjective': EVIDENCE_TYPES.SUMMARY_MENTION,
      'professionalExperience': EVIDENCE_TYPES.EXPERIENCE_USAGE,
      'otherExperience': EVIDENCE_TYPES.EXPERIENCE_USAGE,
      'internships': EVIDENCE_TYPES.EXPERIENCE_USAGE,
      'apprenticeships': EVIDENCE_TYPES.EXPERIENCE_USAGE,
      'experience': EVIDENCE_TYPES.EXPERIENCE_USAGE,
      'education': EVIDENCE_TYPES.EDUCATION_EVIDENCE,
      'projects': EVIDENCE_TYPES.PROJECT_EVIDENCE,
      'openSourceContributions': EVIDENCE_TYPES.PROJECT_EVIDENCE,
      'certifications': EVIDENCE_TYPES.CERTIFICATION_EVIDENCE,
      'licenses': EVIDENCE_TYPES.CERTIFICATION_EVIDENCE,
      'courses': EVIDENCE_TYPES.TRAINING_EVIDENCE,
      'training': EVIDENCE_TYPES.TRAINING_EVIDENCE,
      'publications': EVIDENCE_TYPES.PUBLICATION_EVIDENCE,
      'researchExperience': EVIDENCE_TYPES.PUBLICATION_EVIDENCE,
      'patents': EVIDENCE_TYPES.PUBLICATION_EVIDENCE,
      'volunteerExperience': EVIDENCE_TYPES.VOLUNTEER_EVIDENCE,
      'communityActivities': EVIDENCE_TYPES.VOLUNTEER_EVIDENCE,
      'leadershipExperience': EVIDENCE_TYPES.LEADERSHIP_EVIDENCE,
      'personalInfo': EVIDENCE_TYPES.SUMMARY_MENTION,
      'awards': EVIDENCE_TYPES.ACHIEVEMENT_EVIDENCE,
      'achievements': EVIDENCE_TYPES.ACHIEVEMENT_EVIDENCE,
      'presentations': EVIDENCE_TYPES.PUBLICATION_EVIDENCE,
      'conferences': EVIDENCE_TYPES.TRAINING_EVIDENCE,
      'teachingExperience': EVIDENCE_TYPES.EXPERIENCE_USAGE,
      'militaryExperience': EVIDENCE_TYPES.EXPERIENCE_USAGE
    };
    return map[sectionType] || EVIDENCE_TYPES.CUSTOM_EVIDENCE;
  }

  extractExcerpt(text, skillName, maxLength = 200) {
    if (!text) return '';
    const normText = this.normalizeText(text);
    const normSkill = this.normalizeText(skillName);
    const idx = normText.indexOf(normSkill);
    if (idx === -1) return text.slice(0, maxLength);

    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + normSkill.length + 100);
    let excerpt = text.slice(start, end).trim();
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    return excerpt;
  }

  hasMetricIndicator(text) {
    if (!text) return false;
    return /\d+[%$xX×]|\$\d|percent|million|billion|thousand|\d+\+|\d+k\b/i.test(text);
  }

  hasResultIndicator(text) {
    if (!text) return false;
    return /\b(increased|decreased|reduced|improved|grew|achieved|delivered|saved|generated|launched|built|created|developed|optimized|streamlined|automated|migrated|implemented)\b/i.test(text);
  }

  assessStrength(skill, evidenceRecords) {
    const skillEvidence = evidenceRecords.filter(e => e.skillId === skill.id && !e.userRejected);
    const nonListingEvidence = skillEvidence.filter(e => e.evidenceType !== EVIDENCE_TYPES.SKILL_LISTING);

    if (nonListingEvidence.length === 0) {
      if (skill.listedInSkills) {
        return {
          level: STRENGTH_LEVELS.LISTED_ONLY,
          status: SKILL_STATUSES.LISTED_WITHOUT_EVIDENCE,
          reasons: ['Skill appears in Skills section but no supporting evidence found in other sections'],
          evidenceCount: skillEvidence.length,
          nonListingCount: 0
        };
      }
      return {
        level: STRENGTH_LEVELS.NO_EVIDENCE,
        status: SKILL_STATUSES.SUGGESTED_UNVERIFIED,
        reasons: ['No evidence found'],
        evidenceCount: 0,
        nonListingCount: 0
      };
    }

    const reasons = [];
    let score = 0;

    score += Math.min(nonListingEvidence.length, 4);
    if (nonListingEvidence.length >= 3) reasons.push(`Found in ${nonListingEvidence.length} sections`);
    else if (nonListingEvidence.length === 2) reasons.push('Found in 2 sections');
    else reasons.push('Found in 1 section');

    const hasAchievement = nonListingEvidence.some(e => e.hasResult || e.hasMetric);
    if (hasAchievement) {
      score += 2;
      reasons.push('Supported by measurable results');
    }

    const hasExperience = nonListingEvidence.some(e =>
      e.evidenceType === EVIDENCE_TYPES.EXPERIENCE_USAGE || e.evidenceType === EVIDENCE_TYPES.ACHIEVEMENT_EVIDENCE
    );
    if (hasExperience) {
      score += 1;
      reasons.push('Used in professional experience');
    }

    const hasProject = nonListingEvidence.some(e => e.evidenceType === EVIDENCE_TYPES.PROJECT_EVIDENCE);
    if (hasProject) {
      score += 1;
      reasons.push('Applied in projects');
    }

    const hasCert = nonListingEvidence.some(e => e.evidenceType === EVIDENCE_TYPES.CERTIFICATION_EVIDENCE);
    if (hasCert) {
      score += 2;
      reasons.push('Backed by certification');
    }

    const hasRecentEvidence = nonListingEvidence.some(e => {
      if (!e.dateRange) return false;
      const end = e.dateRange.end || e.dateRange.start;
      if (!end) return false;
      return (new Date().getFullYear() - end.year) <= 2;
    });
    if (hasRecentEvidence) {
      score += 1;
      reasons.push('Recent evidence');
    }

    const hasHiddenOnly = nonListingEvidence.every(e => e.hidden);
    if (hasHiddenOnly) {
      score = Math.max(1, score - 2);
      reasons.push('Evidence only in hidden sections');
    }

    let level, status;
    if (score >= 6) {
      level = STRENGTH_LEVELS.STRONG;
      status = SKILL_STATUSES.STRONGLY_EVIDENCED;
    } else if (score >= 3) {
      level = STRENGTH_LEVELS.MODERATE;
      status = SKILL_STATUSES.EVIDENCED;
    } else {
      level = STRENGTH_LEVELS.LIMITED;
      status = SKILL_STATUSES.WEAKLY_EVIDENCED;
    }

    if (!skill.listedInSkills) {
      status = SKILL_STATUSES.EVIDENCE_WITHOUT_LISTING;
      reasons.unshift('Skill found in resume but missing from Skills section');
    }

    const mostRecent = this.getMostRecentDate(nonListingEvidence);
    const sectionTypes = [...new Set(nonListingEvidence.map(e => e.sectionTitle))];

    return {
      level,
      status,
      reasons,
      evidenceCount: skillEvidence.length,
      nonListingCount: nonListingEvidence.length,
      mostRecentDate: mostRecent,
      evidenceSections: sectionTypes
    };
  }

  getMostRecentDate(evidenceRecords) {
    let latest = null;
    for (const e of evidenceRecords) {
      if (!e.dateRange) continue;
      const end = e.dateRange.end || e.dateRange.start;
      if (!end) continue;
      if (!latest || end.year > latest.year || (end.year === latest.year && (end.month || 0) > (latest.month || 0))) {
        latest = end;
      }
    }
    return latest;
  }

  analyze(doc) {
    const extractedSections = this.extractContentFromDocument(doc);
    const skillMap = this.extractSkillsFromDocument(doc, extractedSections);
    const evidenceRecords = this.findEvidenceForSkills(skillMap, extractedSections);

    const results = [];
    for (const [norm, skill] of skillMap) {
      const strength = this.assessStrength(skill, evidenceRecords);
      const skillEvidence = evidenceRecords.filter(e => e.skillId === skill.id);

      results.push({
        ...skill,
        strength: strength.level,
        status: strength.status,
        statusReasons: strength.reasons,
        evidenceCount: strength.evidenceCount,
        nonListingEvidenceCount: strength.nonListingCount,
        mostRecentDate: strength.mostRecentDate,
        evidenceSections: strength.evidenceSections || [],
        evidence: skillEvidence
      });
    }

    results.sort((a, b) => {
      const strengthOrder = { strong: 0, moderate: 1, limited: 2, listed_only: 3, suggested: 4, no_evidence: 5 };
      const diff = (strengthOrder[a.strength] || 5) - (strengthOrder[b.strength] || 5);
      if (diff !== 0) return diff;
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      documentId: doc.id,
      documentName: doc.name,
      analyzedAt: new Date().toISOString(),
      resumeFingerprint: this.computeFingerprint(doc),
      skills: results,
      evidence: evidenceRecords,
      summary: this.computeSummary(results)
    };
  }

  computeFingerprint(doc) {
    const key = `${doc.id}|${doc.lastModified}|${(doc.sections || []).length}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return String(Math.abs(hash));
  }

  computeSummary(skills) {
    const total = skills.length;
    const strong = skills.filter(s => s.strength === STRENGTH_LEVELS.STRONG).length;
    const moderate = skills.filter(s => s.strength === STRENGTH_LEVELS.MODERATE).length;
    const limited = skills.filter(s => s.strength === STRENGTH_LEVELS.LIMITED).length;
    const listedOnly = skills.filter(s => s.strength === STRENGTH_LEVELS.LISTED_ONLY).length;
    const missingFromSkills = skills.filter(s => s.status === SKILL_STATUSES.EVIDENCE_WITHOUT_LISTING).length;
    const categories = [...new Set(skills.map(s => s.category))];

    return { total, strong, moderate, limited, listedOnly, missingFromSkills, categories };
  }
}
