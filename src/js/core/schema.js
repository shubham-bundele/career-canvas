/**
 * Document Schema Definitions
 * Defines the structure for resume documents and related data
 */

import { generateUUID } from '../utils/id.js';

/**
 * Current schema version
 */
export const SCHEMA_VERSION = 1;

/**
 * Document types
 */
export const DOCUMENT_TYPES = {
  RESUME: 'resume',
  CV: 'cv',
  COVER_LETTER: 'coverLetter',
  REFERENCE_SHEET: 'referenceSheet',
  PORTFOLIO: 'portfolio',
  ONE_PAGER: 'onePager'
};

/**
 * Section types
 */
export const SECTION_TYPES = {
  PERSONAL_INFO: 'personalInfo',
  PROFESSIONAL_SUMMARY: 'professionalSummary',
  CAREER_OBJECTIVE: 'careerObjective',
  KEY_QUALIFICATIONS: 'keyQualifications',
  CORE_COMPETENCIES: 'coreCompetencies',
  PROFESSIONAL_EXPERIENCE: 'professionalExperience',
  OTHER_EXPERIENCE: 'otherExperience',
  INTERNSHIPS: 'internships',
  APPRENTICESHIPS: 'apprenticeships',
  EDUCATION: 'education',
  SKILLS: 'skills',
  TECHNICAL_SKILLS: 'technicalSkills',
  TOOLS_AND_TECHNOLOGIES: 'toolsAndTechnologies',
  PROJECTS: 'projects',
  OPEN_SOURCE_CONTRIBUTIONS: 'openSourceContributions',
  CERTIFICATIONS: 'certifications',
  LICENSES: 'licenses',
  COURSES: 'courses',
  TRAINING: 'training',
  ACHIEVEMENTS: 'achievements',
  AWARDS: 'awards',
  PUBLICATIONS: 'publications',
  RESEARCH_EXPERIENCE: 'researchExperience',
  PATENTS: 'patents',
  PRESENTATIONS: 'presentations',
  CONFERENCES: 'conferences',
  TEACHING_EXPERIENCE: 'teachingExperience',
  VOLUNTEER_EXPERIENCE: 'volunteerExperience',
  LEADERSHIP_EXPERIENCE: 'leadershipExperience',
  PROFESSIONAL_MEMBERSHIPS: 'professionalMemberships',
  LANGUAGES: 'languages',
  INTERESTS: 'interests',
  COMMUNITY_ACTIVITIES: 'communityActivities',
  MILITARY_EXPERIENCE: 'militaryExperience',
  REFERENCES: 'references',
  DECLARATION: 'declaration',
  CUSTOM: 'custom'
};

/**
 * Creates default personal info object
 */
function createPersonalInfo() {
  return {
    fullName: '',
    preferredName: '',
    professionalTitle: '',
    resumeHeadline: '',
    pronunciation: '',
    email: '',
    secondaryEmail: '',
    phone: '',
    secondaryPhone: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    fullAddress: '',
    personalWebsite: '',
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    gitlabUrl: '',
    stackOverflowUrl: '',
    orcid: '',
    googleScholar: '',
    behance: '',
    dribbble: '',
    otherProfiles: [],
    workAuthorization: '',
    willingToRelocate: false,
    remotePreference: '',
    photograph: null,
    signature: null
  };
}

/**
 * Creates default work experience item
 */
function createWorkExperienceItem() {
  return {
    id: generateUUID(),
    jobTitle: '',
    company: '',
    companyDescription: '',
    employmentType: '',
    department: '',
    location: '',
    remoteType: '',
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
    currentlyWorking: false,
    roleSummary: '',
    responsibilities: '',
    achievements: [],
    technologies: [],
    methods: [],
    teamSize: null,
    reportingScope: '',
    companyUrl: '',
    industryTags: [],
    skillTags: [],
    relevanceTags: [],
    included: true,
    hidden: false,
    order: 0
  };
}

/**
 * Creates default achievement item for work experience
 */
function createAchievementItem() {
  return {
    id: generateUUID(),
    text: '',
    actionVerb: '',
    skillTags: [],
    metricTags: [],
    relevance: 0,
    alternateVersions: [],
    charCount: 0,
    wordCount: 0,
    included: true,
    order: 0
  };
}

/**
 * Creates default education item
 */
function createEducationItem() {
  return {
    id: generateUUID(),
    degree: '',
    qualification: '',
    specialization: '',
    institution: '',
    department: '',
    location: '',
    startDate: null,
    endDate: null,
    currentlyStudying: false,
    grade: '',
    gpa: '',
    percentage: '',
    honors: '',
    relevantCoursework: [],
    thesis: '',
    dissertation: '',
    academicProjects: [],
    activities: [],
    societies: [],
    description: '',
    institutionUrl: '',
    hideGrade: false,
    included: true,
    hidden: false,
    order: 0
  };
}

/**
 * Creates default project item
 */
function createProjectItem() {
  return {
    id: generateUUID(),
    projectName: '',
    projectType: '',
    role: '',
    teamSize: null,
    startDate: null,
    endDate: null,
    currentProject: false,
    summary: '',
    problem: '',
    solution: '',
    personalContribution: '',
    technologies: [],
    methods: [],
    results: '',
    achievements: [],
    demoUrl: '',
    repositoryUrl: '',
    documentationUrl: '',
    publicationUrl: '',
    mediaThumbnail: null,
    skillTags: [],
    jobRelevanceTags: [],
    included: true,
    hidden: false,
    order: 0
  };
}

/**
 * Creates default certification item
 */
function createCertificationItem() {
  return {
    id: generateUUID(),
    name: '',
    issuingOrganization: '',
    issueDate: null,
    expirationDate: null,
    credentialId: '',
    credentialUrl: '',
    description: '',
    skillTags: [],
    included: true,
    hidden: false,
    order: 0
  };
}

/**
 * Creates default skill item
 */
function createSkillItem() {
  return {
    id: generateUUID(),
    name: '',
    category: '',
    proficiencyLevel: '',
    yearsOfExperience: null,
    lastUsed: null,
    endorsements: 0,
    relatedSkills: [],
    included: true,
    order: 0
  };
}

/**
 * Creates default language item
 */
function createLanguageItem() {
  return {
    id: generateUUID(),
    language: '',
    proficiency: '',
    reading: '',
    writing: '',
    speaking: '',
    certifications: [],
    included: true,
    order: 0
  };
}

/**
 * Creates default reference item
 */
function createReferenceItem() {
  return {
    id: generateUUID(),
    name: '',
    title: '',
    company: '',
    relationship: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    notes: '',
    included: true,
    order: 0
  };
}

/**
 * Creates default section
 */
function createSection(type, title) {
  return {
    id: generateUUID(),
    type,
    title,
    items: [],
    visible: true,
    order: 0
  };
}

/**
 * Default section titles
 */
export const DEFAULT_SECTION_TITLES = {
  [SECTION_TYPES.PROFESSIONAL_SUMMARY]: 'Professional Summary',
  [SECTION_TYPES.CAREER_OBJECTIVE]: 'Career Objective',
  [SECTION_TYPES.KEY_QUALIFICATIONS]: 'Key Qualifications',
  [SECTION_TYPES.CORE_COMPETENCIES]: 'Core Competencies',
  [SECTION_TYPES.PROFESSIONAL_EXPERIENCE]: 'Professional Experience',
  [SECTION_TYPES.OTHER_EXPERIENCE]: 'Other Experience',
  [SECTION_TYPES.INTERNSHIPS]: 'Internships',
  [SECTION_TYPES.APPRENTICESHIPS]: 'Apprenticeships',
  [SECTION_TYPES.EDUCATION]: 'Education',
  [SECTION_TYPES.SKILLS]: 'Skills',
  [SECTION_TYPES.TECHNICAL_SKILLS]: 'Technical Skills',
  [SECTION_TYPES.TOOLS_AND_TECHNOLOGIES]: 'Tools & Technologies',
  [SECTION_TYPES.PROJECTS]: 'Projects',
  [SECTION_TYPES.OPEN_SOURCE_CONTRIBUTIONS]: 'Open Source Contributions',
  [SECTION_TYPES.CERTIFICATIONS]: 'Certifications',
  [SECTION_TYPES.LICENSES]: 'Licenses',
  [SECTION_TYPES.COURSES]: 'Courses',
  [SECTION_TYPES.TRAINING]: 'Training',
  [SECTION_TYPES.ACHIEVEMENTS]: 'Achievements',
  [SECTION_TYPES.AWARDS]: 'Awards',
  [SECTION_TYPES.PUBLICATIONS]: 'Publications',
  [SECTION_TYPES.RESEARCH_EXPERIENCE]: 'Research Experience',
  [SECTION_TYPES.PATENTS]: 'Patents',
  [SECTION_TYPES.PRESENTATIONS]: 'Presentations',
  [SECTION_TYPES.CONFERENCES]: 'Conferences',
  [SECTION_TYPES.TEACHING_EXPERIENCE]: 'Teaching Experience',
  [SECTION_TYPES.VOLUNTEER_EXPERIENCE]: 'Volunteer Experience',
  [SECTION_TYPES.LEADERSHIP_EXPERIENCE]: 'Leadership Experience',
  [SECTION_TYPES.PROFESSIONAL_MEMBERSHIPS]: 'Professional Memberships',
  [SECTION_TYPES.LANGUAGES]: 'Languages',
  [SECTION_TYPES.INTERESTS]: 'Interests',
  [SECTION_TYPES.COMMUNITY_ACTIVITIES]: 'Community Activities',
  [SECTION_TYPES.MILITARY_EXPERIENCE]: 'Military Experience',
  [SECTION_TYPES.REFERENCES]: 'References',
  [SECTION_TYPES.DECLARATION]: 'Declaration',
  [SECTION_TYPES.CUSTOM]: 'Custom Section'
};

/**
 * Creates a new empty document
 */
export function createEmptyDocument(type = DOCUMENT_TYPES.RESUME, name) {
  const now = new Date().toISOString();

  const typeDefaults = getDocumentTypeDefaults(type);

  return {
    id: generateUUID(),
    schemaVersion: SCHEMA_VERSION,
    name: name || typeDefaults.name,
    type,
    format: 'a4',
    templateId: typeDefaults.templateId,
    pageSize: 'A4',
    createdAt: now,
    lastModified: now,
    targetRole: '',
    targetCompany: '',
    tags: [],
    pinned: false,
    archived: false,
    atsMode: typeDefaults.atsMode || false,
    designPreset: 'professional',
    sectionOrder: [],
    personalInfo: createPersonalInfo(),
    sections: typeDefaults.sections,
    coverLetter: type === DOCUMENT_TYPES.COVER_LETTER ? createCoverLetterContent() : undefined
  };
}

function createCoverLetterContent() {
  return {
    date: '',
    recipientName: '',
    recipientTitle: '',
    company: '',
    companyAddress: '',
    salutation: 'Dear Hiring Manager',
    body: '',
    closing: 'Sincerely'
  };
}

function getDocumentTypeDefaults(type) {
  switch (type) {
    case DOCUMENT_TYPES.RESUME:
      return {
        name: 'My Resume',
        templateId: 'ats-essential',
        atsMode: false,
        sections: [
          { id: generateUUID(), sectionType: 'summary', title: 'Professional Summary', type: 'text', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'experience', title: 'Work Experience', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'education', title: 'Education', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'skills', title: 'Skills', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'projects', title: 'Projects', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'certifications', title: 'Certifications', type: 'list', visible: true, content: '', items: [] },
        ]
      };

    case DOCUMENT_TYPES.CV:
      return {
        name: 'My CV',
        templateId: 'ats-academic',
        atsMode: false,
        sections: [
          { id: generateUUID(), sectionType: 'summary', title: 'Professional Summary', type: 'text', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'experience', title: 'Professional Experience', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'education', title: 'Education', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'skills', title: 'Technical Skills', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'publications', title: 'Publications', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'certifications', title: 'Certifications & Licenses', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'awards', title: 'Awards & Honors', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'languages', title: 'Languages', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'volunteer', title: 'Volunteer Experience', type: 'list', visible: true, content: '', items: [] },
          { id: generateUUID(), sectionType: 'projects', title: 'Research & Projects', type: 'list', visible: true, content: '', items: [] },
        ]
      };

    case DOCUMENT_TYPES.COVER_LETTER:
      return {
        name: 'My Cover Letter',
        templateId: 'cover-letter-standard',
        atsMode: false,
        sections: []
      };

    case DOCUMENT_TYPES.REFERENCE_SHEET:
      return {
        name: 'My References',
        templateId: 'references-standard',
        atsMode: false,
        sections: [
          { id: generateUUID(), sectionType: 'references', title: 'Professional References', type: 'list', visible: true, content: '', items: [] },
        ]
      };

    default:
      return {
        name: 'My Document',
        templateId: 'ats-essential',
        atsMode: false,
        sections: [
          { id: generateUUID(), sectionType: 'summary', title: 'Summary', type: 'text', visible: true, content: '', items: [] },
        ]
      };
  }
}

/**
 * Validates document structure
 */
export function validateDocument(doc) {
  const errors = [];

  if (!doc) {
    errors.push('Document is null or undefined');
    return { valid: false, errors };
  }

  if (!doc.id) {
    errors.push('Document must have an id');
  }

  if (!doc.schemaVersion) {
    errors.push('Document must have a schemaVersion');
  }

  if (!doc.type || !Object.values(DOCUMENT_TYPES).includes(doc.type)) {
    errors.push('Document must have a valid type');
  }

  if (!doc.personalInfo) {
    errors.push('Document must have personalInfo');
  }

  if (!doc.sections || typeof doc.sections !== 'object') {
    errors.push('Document must have sections object');
  }

  if (!doc.createdAt) {
    errors.push('Document must have createdAt timestamp');
  }

  if (!doc.lastModified) {
    errors.push('Document must have lastModified timestamp');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Migrates document from older schema version
 */
export function migrateDocument(doc) {
  if (!doc) {
    return null;
  }

  const currentVersion = doc.schemaVersion || 0;

  if (currentVersion === SCHEMA_VERSION) {
    return doc;
  }

  const migrated = {
    ...doc,
    schemaVersion: SCHEMA_VERSION,
    lastModified: new Date().toISOString(),
    pinned: false,
    archived: false
  };

  // Future migrations will go here
  // if (currentVersion < 2) {
  //   migrated = migrateV1ToV2(migrated);
  // }

  return migrated;
}

/**
 * Creates a deep copy of a document
 */
export function cloneDocument(doc, newName = null) {
  if (!doc) {
    return null;
  }

  const cloned = JSON.parse(JSON.stringify(doc));
  cloned.id = generateUUID();
  cloned.createdAt = new Date().toISOString();
  cloned.lastModified = cloned.createdAt;

  if (newName) {
    cloned.name = newName;
  } else {
    cloned.name = `${doc.name} (Copy)`;
  }

  // Reset metadata
  cloned.pinned = false;
  cloned.archived = false;

  return cloned;
}

/**
 * Factory functions for creating items
 */
export const createItem = {
  workExperience: createWorkExperienceItem,
  achievement: createAchievementItem,
  education: createEducationItem,
  project: createProjectItem,
  certification: createCertificationItem,
  skill: createSkillItem,
  language: createLanguageItem,
  reference: createReferenceItem,
  section: createSection
};

/**
 * Export all item creators
 */
export {
  createPersonalInfo,
  createWorkExperienceItem,
  createAchievementItem,
  createEducationItem,
  createProjectItem,
  createCertificationItem,
  createSkillItem,
  createLanguageItem,
  createReferenceItem,
  createSection
};
