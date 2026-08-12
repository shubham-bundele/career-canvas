# CareerCanvas Document Schemas

## Schema Version: 1

## Document Types
- `resume` — Standard resume
- `cv` — Curriculum Vitae
- `coverLetter` — Cover letter
- `referenceSheet` — Reference sheet
- `portfolio` — Portfolio
- `onePager` — One-page document

## Document Structure
```js
{
  id: UUID,
  schemaVersion: 1,
  name: string,
  type: DocumentType,
  format: 'a4',
  templateId: string,
  pageSize: 'A4',
  createdAt: ISO datetime,
  lastModified: ISO datetime,
  targetRole: string,
  targetCompany: string,
  tags: string[],
  pinned: boolean,
  archived: boolean,
  atsMode: boolean,
  designPreset: string,
  sectionOrder: string[],
  personalInfo: PersonalInfo,
  sections: Section[],
  coverLetter?: CoverLetterContent
}
```

## PersonalInfo (~30 fields)
```js
{
  fullName, preferredName, professionalTitle, resumeHeadline,
  pronunciation, email, secondaryEmail, phone, secondaryPhone,
  city, state, country, postalCode, fullAddress,
  personalWebsite, portfolioUrl, linkedinUrl, githubUrl, gitlabUrl,
  stackOverflowUrl, orcid, googleScholar, behance, dribbble,
  otherProfiles: [], workAuthorization, willingToRelocate,
  remotePreference, photograph, signature
}
```

## Section Structure
```js
{
  id: UUID,
  sectionType: string,   // 'summary', 'experience', 'education', 'skills', etc.
  title: string,
  type: 'text' | 'list',
  visible: boolean,
  content: string,        // For text sections
  items: ItemObject[]     // For list sections
}
```

## Section Types (35 defined)
professionalSummary, careerObjective, keyQualifications, coreCompetencies,
professionalExperience, otherExperience, internships, apprenticeships,
education, skills, technicalSkills, toolsAndTechnologies, projects,
openSourceContributions, certifications, licenses, courses, training,
achievements, awards, publications, researchExperience, patents,
presentations, conferences, teachingExperience, volunteerExperience,
leadershipExperience, professionalMemberships, languages, interests,
communityActivities, militaryExperience, references, declaration, custom

## Item Types (by section)
- **Work Experience**: jobTitle, company, employmentType, department, location, startMonth/Year, endMonth/Year, currentlyWorking, responsibilities, achievements[], technologies[], skillTags[]
- **Education**: degree, qualification, institution, startDate, endDate, gpa, honors, relevantCoursework[], thesis, description
- **Project**: projectName, role, technologies[], summary, results, demoUrl, repositoryUrl
- **Certification**: name, issuingOrganization, issueDate, expirationDate, credentialId, credentialUrl
- **Skill**: name, category, proficiencyLevel, yearsOfExperience
- **Language**: language, proficiency, reading, writing, speaking
- **Reference**: name, title, company, relationship, email, phone

## Cover Letter Content
```js
{
  date, recipientName, recipientTitle, company,
  companyAddress, salutation, body, closing
}
```

## Utility Functions
- `createEmptyDocument(type, name)` — Creates blank document with defaults
- `validateDocument(doc)` — Validates required fields
- `migrateDocument(doc)` — Migrates to current schema version
- `cloneDocument(doc, newName)` — Deep copy with new UUID
- `createItem.workExperience()`, `.education()`, `.skill()`, etc.
