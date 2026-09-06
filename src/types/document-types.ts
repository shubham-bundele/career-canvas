// Type definitions for CareerCanvas document schema

/**
 * Document Types
 */
export enum DOCUMENT_TYPES {
  RESUME = 'resume',
  CV = 'cv',
  COVER_LETTER = 'coverLetter',
  REFERENCE_SHEET = 'referenceSheet',
  PORTFOLIO = 'portfolio',
  ONE_PAGER = 'onePager'
}

/**
 * Section Types
 */
export enum SECTION_TYPES {
  PERSONAL_INFO = 'personalInfo',
  PROFESSIONAL_SUMMARY = 'professionalSummary',
  CAREER_OBJECTIVE = 'careerObjective',
  KEY_QUALIFICATIONS = 'keyQualifications',
  CORE_COMPETENCIES = 'coreCompetencies',
  PROFESSIONAL_EXPERIENCE = 'professionalExperience',
  OTHER_EXPERIENCE = 'otherExperience',
  INTERNSHIPS = 'internships',
  APPRENTICESHIPS = 'apprenticeships',
  EDUCATION = 'education',
  SKILLS = 'skills',
  TECHNICAL_SKILLS = 'technicalSkills',
  TOOLS_AND_TECHNOLOGIES = 'toolsAndTechnologies',
  PROJECTS = 'projects',
  OPEN_SOURCE_CONTRIBUTIONS = 'openSourceContributions',
  CERTIFICATIONS = 'certifications',
  LICENSES = 'licenses',
  COURSES = 'courses',
  TRAINING = 'training',
  ACHIEVEMENTS = 'achievements',
  AWARDS = 'awards',
  PUBLICATIONS = 'publications',
  RESEARCH_EXPERIENCE = 'researchExperience',
  PATENTS = 'patents',
  PRESENTATIONS = 'presentations',
  CONFERENCES = 'conferences',
  TEACHING_EXPERIENCE = 'teachingExperience',
  VOLUNTEER_EXPERIENCE = 'volunteerExperience',
  LEADERSHIP_EXPERIENCE = 'leadershipExperience',
  PROFESSIONAL_MEMBERSHIPS = 'professionalMemberships',
  LANGUAGES = 'languages',
  INTERESTS = 'interests',
  COMMUNITY_ACTIVITIES = 'communityActivities',
  MILITARY_EXPERIENCE = 'militaryExperience',
  REFERENCES = 'references',
  DECLARATION = 'declaration',
  CUSTOM = 'custom'
}

/**
 * Personal Info Structure
 */
export interface PersonalInfo {
  fullName: string
  preferredName?: string
  professionalTitle?: string
  resumeHeadline?: string
  pronunciation?: string
  email: string
  secondaryEmail?: string
  phone: string
  secondaryPhone?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  fullAddress?: string
  personalWebsite?: string
  portfolioUrl?: string
  linkedinUrl?: string
  githubUrl?: string
  gitlabUrl?: string
  stackOverflowUrl?: string
  orcid?: string
  googleScholar?: string
  behance?: string
  dribbble?: string
  otherProfiles?: string[]
  workAuthorization?: string
  willingToRelocate?: boolean
  remotePreference?: string
  photograph?: any
  signature?: any
}

/**
 * Work Experience Item
 */
export interface WorkExperienceItem {
  id: string
  jobTitle: string
  company: string
  companyDescription?: string
  employmentType?: string
  department?: string
  location?: string
  remoteType?: string
  startMonth?: number
  startYear?: number
  endMonth?: number
  endYear?: number
  currentlyWorking?: boolean
  roleSummary?: string
  responsibilities?: string
  achievements: AchievementItem[]
  technologies: string[]
  methods?: string[]
  teamSize?: number
  reportingScope?: string
  companyUrl?: string
  industryTags?: string[]
  skillTags?: string[]
  relevanceTags?: string[]
  included?: boolean
  hidden?: boolean
  order?: number
}

/**
 * Achievement Item
 */
export interface AchievementItem {
  id: string
  text: string
  actionVerb?: string
  skillTags?: string[]
  metricTags?: string[]
  relevance?: number
  alternateVersions?: any[]
  charCount?: number
  wordCount?: number
  included?: boolean
  order?: number
}

/**
 * Education Item
 */
export interface EducationItem {
  id: string
  degree: string
  qualification?: string
  specialization?: string
  institution: string
  department?: string
  location?: string
  startDate?: string
  endDate?: string
  currentlyStudying?: boolean
  grade?: string
  gpa?: string
  percentage?: string
  honors?: string
  relevantCoursework?: string[]
  thesis?: string
  dissertation?: string
  academicProjects?: string[]
  activities?: string[]
  societies?: string[]
  description?: string
  institutionUrl?: string
  hideGrade?: boolean
  included?: boolean
  hidden?: boolean
  order?: number
}

/**
 * Project Item
 */
export interface ProjectItem {
  id: string
  projectName: string
  projectType?: string
  role?: string
  teamSize?: number
  startDate?: string
  endDate?: string
  currentProject?: boolean
  summary?: string
  problem?: string
  solution?: string
  personalContribution?: string
  technologies: string[]
  methods?: string[]
  results?: string
  achievements: AchievementItem[]
  demoUrl?: string
  repositoryUrl?: string
  documentationUrl?: string
  publicationUrl?: string
  mediaThumbnail?: any
  skillTags?: string[]
  jobRelevanceTags?: string[]
  included?: boolean
  hidden?: boolean
  order?: number
}

/**
 * Certification Item
 */
export interface CertificationItem {
  id: string
  name: string
  issuingOrganization: string
  issueDate?: string
  expirationDate?: string
  credentialId?: string
  credentialUrl?: string
  description?: string
  skillTags?: string[]
  included?: boolean
  hidden?: boolean
  order?: number
}

/**
 * Skill Item
 */
export interface SkillItem {
  id: string
  name: string
  category?: string
  proficiencyLevel?: string
  yearsOfExperience?: number
  lastUsed?: string
  endorsements?: number
  relatedSkills?: string[]
  included?: boolean
  order?: number
}

/**
 * Language Item
 */
export interface LanguageItem {
  id: string
  language: string
  proficiency?: string
  reading?: string
  writing?: string
  speaking?: string
  certifications?: string[]
  included?: boolean
  order?: number
}

/**
 * Reference Item
 */
export interface ReferenceItem {
  id: string
  name: string
  title?: string
  company?: string
  relationship?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  notes?: string
  included?: boolean
  order?: number
}

/**
 * Section Definition
 */
export interface Section {
  id: string
  type: SECTION_TYPES
  title: string
  items: any[]
  visible: boolean
  order?: number
}

/**
 * Empty Document Factory
 */
export function createEmptyDocument(type: DOCUMENT_TYPES, name?: string): any { return {} as any }

/**
 * Schema Version
 */
export const SCHEMA_VERSION = 1

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Document Validation
 */
export function validateDocument(doc: any): ValidationResult { return { valid: true, errors: [] } }

/**
 * Clone Document
 */
export function cloneDocument(doc: any, newName?: string): any { return doc }