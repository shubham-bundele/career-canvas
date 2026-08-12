/**
 * Academic Resume / CV Templates
 * Templates designed for academic, research, and scholarly positions
 */

import { encodeHTML } from '../utils/sanitize.js';
import { formatMonthYear } from '../utils/format.js';

const e = (text) => encodeHTML(text);

const shouldRender = (section) => {
  if (!section || section.visible === false) return false;
  if (section.content) return true;
  if (section.items && section.items.length > 0) return true;
  return false;
};

const SECTION_TYPE_MAP = {
  professionalSummary: 'summary', careerObjective: 'objective',
  professionalExperience: 'experience', otherExperience: 'experience',
  internships: 'experience', technicalSkills: 'skills',
  toolsAndTechnologies: 'skills', openSourceContributions: 'projects',
  volunteerExperience: 'volunteer', leadershipExperience: 'experience',
  keyQualifications: 'skills', coreCompetencies: 'skills',
  professionalMemberships: 'certifications',
  researchExperience: 'experience', teachingExperience: 'experience'
};
const getSectionType = (section) => {
  const raw = section.sectionType || section.type || '';
  return SECTION_TYPE_MAP[raw] || raw;
};

const shouldRenderItem = (item) => {
  return item && item.included !== false && item.hidden !== true;
};

const formatDateRange = (startMonth, startYear, endMonth, endYear, current) => {
  if (!startMonth || !startYear) return '';
  const start = formatMonthYear(startMonth, startYear, true);
  if (current) return `${start} - Present`;
  if (endMonth && endYear) {
    const end = formatMonthYear(endMonth, endYear, true);
    return `${start} - ${end}`;
  }
  return start;
};

const designVars = (design) => {
  if (!design) return '';
  const vars = [];
  if (design.fontFamily) vars.push(`--font-family: ${design.fontFamily}`);
  if (design.fontSize) vars.push(`--font-size: ${design.fontSize}px`);
  if (design.nameSize) vars.push(`--name-size: ${design.nameSize}px`);
  if (design.headingSize) vars.push(`--heading-size: ${design.headingSize}px`);
  if (design.lineHeight) vars.push(`--line-height: ${design.lineHeight}`);
  if (design.accentColor) vars.push(`--accent-color: ${design.accentColor}`);
  if (design.textColor) vars.push(`--text-color: ${design.textColor}`);
  if (design.secondaryColor) vars.push(`--secondary-color: ${design.secondaryColor}`);
  if (design.backgroundColor) vars.push(`--background-color: ${design.backgroundColor}`);
  if (design.sectionSpacing) vars.push(`--section-spacing: ${design.sectionSpacing}px`);
  if (design.paragraphSpacing) vars.push(`--paragraph-spacing: ${design.paragraphSpacing}px`);
  if (design.photoSize) vars.push(`--photo-size: ${design.photoSize}px`);
  if (design.sidebarWidth) vars.push(`--sidebar-width: ${design.sidebarWidth}%`);
  const base = 'font-family: var(--font-family, "Times New Roman", Georgia, serif); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.4); color: var(--text-color, #222)';
  const all = [vars.join('; '), base].filter(Boolean).join('; ');
  return all ? ` style="${all}"` : '';
};

const buildContactLine = (personalInfo) => {
  const parts = [];
  if (personalInfo.email) parts.push(e(personalInfo.email));
  if (personalInfo.phone) parts.push(e(personalInfo.phone));
  if (personalInfo.city || personalInfo.state || personalInfo.country) {
    const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
    parts.push(e(location));
  }
  if (personalInfo.linkedinUrl || personalInfo.linkedin) parts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
  if (personalInfo.githubUrl) parts.push(e(personalInfo.githubUrl));
  if (personalInfo.personalWebsite || personalInfo.website) parts.push(e(personalInfo.personalWebsite || personalInfo.website));
  if (personalInfo.orcid) parts.push(`ORCID: ${e(personalInfo.orcid)}`);
  return parts;
};

/**
 * Render all items for a section based on its normalized type.
 * Handles: summary, experience, education, skills, publications,
 * awards, projects, certifications, volunteer, languages, custom
 */
const renderSectionBody = (section) => {
  const items = (section.items || []).filter(shouldRenderItem);
  const sType = getSectionType(section);
  let html = '';

  // Text content at section level
  if (section.content) {
    html += `<div style="line-height: 1.6; margin-bottom: 8px;">${e(section.content)}</div>`;
  }

  if (sType === 'summary' || sType === 'objective') {
    items.forEach(item => {
      if (item.content) html += `<div style="line-height: 1.6; margin-bottom: 8px;">${e(item.content)}</div>`;
    });
  } else if (sType === 'experience') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 16px;">`;
      if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${e(item.jobTitle)}</div>`;
      if (item.company || item.institution) {
        html += `<div style="font-style: italic; color: #555; margin-bottom: 2px;">${e(item.company || item.institution)}`;
        if (item.location) html += `, ${e(item.location)}`;
        html += `</div>`;
      }
      const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
      if (dr) html += `<div style="font-size: 11px; color: #666; margin-bottom: 6px;">${dr}</div>`;
      if (item.description || item.roleSummary) html += `<div style="margin-bottom: 4px;">${e(item.description || item.roleSummary)}</div>`;
      const bullets = item.highlights || item.achievements || [];
      if (bullets.length > 0) {
        html += `<ul style="margin: 4px 0 0; padding-left: 18px;">`;
        bullets.forEach(b => {
          const t = typeof b === 'string' ? b : (b && b.text ? b.text : '');
          if (t) html += `<li style="margin-bottom: 3px; line-height: 1.5;">${e(t)}</li>`;
        });
        html += `</ul>`;
      }
      html += `</div>`;
    });
  } else if (sType === 'education') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 14px;">`;
      if (item.degree) {
        html += `<div style="font-weight: 700;">${e(item.degree)}`;
        if (item.field) html += ` in ${e(item.field)}`;
        html += `</div>`;
      }
      if (item.institution) {
        html += `<div style="font-style: italic; color: #555;">${e(item.institution)}`;
        if (item.graduationYear) html += `, ${e(item.graduationYear)}`;
        html += `</div>`;
      }
      if (item.gpa) html += `<div style="font-size: 11px;">GPA: ${e(item.gpa)}</div>`;
      if (item.honors) html += `<div style="font-size: 11px; font-style: italic;">${e(item.honors)}</div>`;
      if (item.dissertation || item.thesis) html += `<div style="font-size: 11px; margin-top: 2px;">Dissertation: <em>${e(item.dissertation || item.thesis)}</em></div>`;
      html += `</div>`;
    });
  } else if (sType === 'skills') {
    items.forEach(item => {
      html += `<div style="margin-bottom: 6px;">`;
      if (item.category) html += `<strong>${e(item.category)}:</strong> `;
      if (item.skills && Array.isArray(item.skills)) html += e(item.skills.join(', '));
      html += `</div>`;
    });
  } else if (sType === 'publications') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 10px; padding-left: 20px; text-indent: -20px;">`;
      if (item.citation) {
        html += `<div>${e(item.citation)}</div>`;
      } else {
        const parts = [];
        if (item.authors) parts.push(e(item.authors));
        if (item.year) parts.push(`(${e(item.year)})`);
        if (item.title) parts.push(`<em>${e(item.title)}</em>`);
        if (item.journal) parts.push(e(item.journal));
        if (item.volume) {
          let vol = e(item.volume);
          if (item.issue) vol += `(${e(item.issue)})`;
          if (item.pages) vol += `, ${e(item.pages)}`;
          parts.push(vol);
        }
        if (item.doi) parts.push(`doi: ${e(item.doi)}`);
        html += `<div>${parts.join('. ')}${parts.length ? '.' : ''}</div>`;
      }
      html += `</div>`;
    });
  } else if (sType === 'awards') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 8px;">`;
      if (item.name || item.title) {
        html += `<div><strong>${e(item.name || item.title)}</strong>`;
        if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
        if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
        html += `</div>`;
      }
      if (item.description) html += `<div style="font-size: 11px; margin-top: 2px;">${e(item.description)}</div>`;
      html += `</div>`;
    });
  } else if (sType === 'projects') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 12px;">`;
      if (item.title || item.name) html += `<div style="font-weight: 700;">${e(item.title || item.name)}</div>`;
      if (item.role) html += `<div style="font-style: italic; color: #555;">${e(item.role)}</div>`;
      if (item.organization || item.institution) html += `<div style="color: #555;">${e(item.organization || item.institution)}</div>`;
      const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
      if (dr) html += `<div style="font-size: 11px; color: #666;">${dr}</div>`;
      if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
      if (item.url) html += `<div style="font-size: 11px; color: #666;">${e(item.url)}</div>`;
      const bullets = item.highlights || [];
      if (bullets.length > 0) {
        html += `<ul style="margin: 4px 0 0; padding-left: 18px;">`;
        bullets.forEach(b => { if (b) html += `<li style="margin-bottom: 3px;">${e(b)}</li>`; });
        html += `</ul>`;
      }
      html += `</div>`;
    });
  } else if (sType === 'certifications') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 8px;">`;
      if (item.name || item.title) {
        html += `<div><strong>${e(item.name || item.title)}</strong>`;
        if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
        if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
        html += `</div>`;
      }
      if (item.description) html += `<div style="font-size: 11px;">${e(item.description)}</div>`;
      html += `</div>`;
    });
  } else if (sType === 'volunteer') {
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 12px;">`;
      if (item.role || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.role || item.title || item.name)}</div>`;
      if (item.organization) html += `<div style="font-style: italic; color: #555;">${e(item.organization)}</div>`;
      const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
      if (dr) html += `<div style="font-size: 11px; color: #666;">${dr}</div>`;
      if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
      html += `</div>`;
    });
  } else if (sType === 'languages') {
    items.forEach(item => {
      html += `<div style="margin-bottom: 4px;">`;
      if (item.language) {
        html += `<strong>${e(item.language)}</strong>`;
        if (item.proficiency) html += ` - ${e(item.proficiency)}`;
      }
      html += `</div>`;
    });
  } else {
    // custom / unknown
    items.forEach(item => {
      html += `<div class="resume-entry" style="margin-bottom: 8px;">`;
      if (item.title || item.name) {
        html += `<div><strong>${e(item.title || item.name)}</strong>`;
        if (item.organization) html += ` - ${e(item.organization)}`;
        if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
        html += `</div>`;
      }
      if (item.description || item.content) {
        html += `<div style="font-size: 11px; margin-top: 2px;">${e(item.description || item.content)}</div>`;
      }
      html += `</div>`;
    });
  }

  return html;
};


// ===========================================================================
// 1. Research CV - Publication and research-focused
// ===========================================================================
const academicResearch = {
  id: 'academic-research',
  name: 'Research CV',
  description: 'Publication and research-focused CV for academic researchers. Emphasizes scholarly output and research contributions.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research'],
  recommendedLevels: ['student', 'entry', 'mid', 'senior'],
  colorPresets: [
    { name: 'Classic', accentColor: '#1a1a1a', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Navy', accentColor: '#1e3a5f', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Oxford Blue', accentColor: '#002147', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' },
    { name: 'Garamond', fontFamily: 'Garamond, "Times New Roman", serif' },
    { name: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-research" data-template="academic-research"${designVars(design)}>
    <style>
      .academic-research { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-research .resume-name { font-size: var(--name-size, 24px); font-weight: 700; text-align: center; margin: 0 0 4px; color: var(--accent-color, #1a1a1a); }
      .academic-research .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 20px); padding-bottom: 12px; border-bottom: 2px solid var(--accent-color, #1a1a1a); }
      .academic-research .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-research .resume-section { margin-bottom: var(--section-spacing, 18px); }
      .academic-research .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; color: var(--accent-color, #1a1a1a); border-bottom: 1px solid var(--accent-color, #1a1a1a); padding-bottom: 3px; }
      .academic-research .resume-entry { page-break-inside: avoid; }
      .academic-research .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-research .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-research .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;

    // Department and institution line
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join(' | ')}</div>`;
    html += `</div>`;

    // Sections in document order
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 2. Professor - Faculty position CV
// ===========================================================================
const academicProfessor = {
  id: 'academic-professor',
  name: 'Professor',
  description: 'Faculty position CV with emphasis on teaching, publications, and committee service. Elegant double-rule header.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research', 'education'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Burgundy', accentColor: '#6b1d2a', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Dark Slate', accentColor: '#2f4858', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Harvard Crimson', accentColor: '#a51c30', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Garamond', fontFamily: 'Garamond, "Times New Roman", serif' },
    { name: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' },
    { name: 'Palatino', fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-professor" data-template="academic-professor"${designVars(design)}>
    <style>
      .academic-professor { padding: 36px 44px; max-width: 100%; box-sizing: border-box; }
      .academic-professor .resume-name { font-size: var(--name-size, 26px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #6b1d2a); text-align: center; font-variant: small-caps; letter-spacing: 0.04em; }
      .academic-professor .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 22px); padding-bottom: 14px; border-bottom: 3px double var(--accent-color, #6b1d2a); }
      .academic-professor .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-professor .resume-section { margin-bottom: var(--section-spacing, 18px); }
      .academic-professor .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; color: var(--accent-color, #6b1d2a); border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      .academic-professor .resume-entry { page-break-inside: avoid; }
      .academic-professor .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; margin-bottom: 2px; }
      .academic-professor .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-professor .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-professor .resume-summary { line-height: 1.7; margin-bottom: var(--paragraph-spacing, 10px); }
    </style>`;

    // Header with small-caps name and double rule
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 13px; color: #444; margin-bottom: 4px; font-style: italic;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px;">${e(personalInfo.resumeHeadline)}</div>`;

    // Department and institution line
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join('  &middot;  ')}</div>`;
    html += `</div>`;

    // Sections in document order
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 3. Postdoctoral - Post-PhD research positions
// ===========================================================================
const academicPostdoc = {
  id: 'academic-postdoc',
  name: 'Postdoctoral',
  description: 'Post-PhD research position CV highlighting research output, methodology expertise, and scholarly impact.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research', 'biotech'],
  recommendedLevels: ['entry', 'mid'],
  colorPresets: [
    { name: 'Teal', accentColor: '#0f6670', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Charcoal', accentColor: '#333333', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Steel Blue', accentColor: '#2c5f7c', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' },
    { name: 'Palatino', fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
    { name: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-postdoc" data-template="academic-postdoc"${designVars(design)}>
    <style>
      .academic-postdoc { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-postdoc .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #0f6670); }
      .academic-postdoc .resume-header { margin-bottom: var(--paragraph-spacing, 20px); padding-bottom: 14px; border-bottom: 2px solid var(--accent-color, #0f6670); }
      .academic-postdoc .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-postdoc .resume-section { margin-bottom: var(--section-spacing, 16px); }
      .academic-postdoc .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px; color: var(--accent-color, #0f6670); border-bottom: 1px solid var(--accent-color, #0f6670); padding-bottom: 3px; }
      .academic-postdoc .resume-entry { page-break-inside: avoid; }
      .academic-postdoc .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-postdoc .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-postdoc .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-postdoc .resume-summary { line-height: 1.6; margin-bottom: var(--paragraph-spacing, 8px); }
    </style>`;

    // Header - left aligned, research-oriented
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;

    // Institutional affiliation
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join(' | ')}</div>`;
    html += `</div>`;

    // Education first for postdocs
    const educationSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'education');
    educationSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Education').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Research experience
    const experienceSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'experience');
    experienceSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Experience').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Publications
    const pubSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'publications');
    pubSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Publications').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Remaining sections
    const handledTypes = ['education', 'experience', 'publications'];
    sections.filter(s => shouldRender(s) && !handledTypes.includes(getSectionType(s))).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 4. PhD Candidate - Doctoral student/candidate CV
// ===========================================================================
const academicPhd = {
  id: 'academic-phd',
  name: 'PhD Candidate',
  description: 'Doctoral student and candidate CV with research focus, coursework, and conference presentations.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research'],
  recommendedLevels: ['student', 'entry'],
  colorPresets: [
    { name: 'Indigo', accentColor: '#3730a3', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Classic', accentColor: '#1a1a1a', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Violet', accentColor: '#5b21b6', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' },
    { name: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' },
    { name: 'Garamond', fontFamily: 'Garamond, "Times New Roman", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-phd" data-template="academic-phd"${designVars(design)}>
    <style>
      .academic-phd { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-phd .resume-name { font-size: var(--name-size, 22px); font-weight: 700; text-align: center; margin: 0 0 4px; color: var(--accent-color, #3730a3); }
      .academic-phd .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 18px); padding-bottom: 10px; border-bottom: 1px solid var(--accent-color, #3730a3); }
      .academic-phd .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-phd .resume-section { margin-bottom: var(--section-spacing, 16px); }
      .academic-phd .resume-section-title { font-size: var(--heading-size, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px; color: var(--accent-color, #3730a3); padding-bottom: 3px; border-bottom: 1px solid #ddd; }
      .academic-phd .resume-entry { page-break-inside: avoid; }
      .academic-phd .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-phd .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-phd .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-phd .resume-summary { line-height: 1.6; margin-bottom: var(--paragraph-spacing, 8px); }
    </style>`;

    // Header - centered, compact
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;

    // Department and program
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join(' | ')}</div>`;
    html += `</div>`;

    // Education first for PhD candidates
    const educationSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'education');
    educationSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Education').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Summary / research interests
    const summarySections = sections.filter(s => shouldRender(s) && (getSectionType(s) === 'summary' || getSectionType(s) === 'objective'));
    summarySections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Interests').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Publications
    const pubSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'publications');
    pubSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Publications').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Experience
    const experienceSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'experience');
    experienceSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Experience').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Awards
    const awardsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'awards');
    awardsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Awards & Honors').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Skills
    const skillsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'skills');
    skillsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Technical Skills').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Remaining sections (projects, certifications, volunteer, languages, custom)
    const handledTypes = ['education', 'summary', 'objective', 'publications', 'experience', 'awards', 'skills'];
    sections.filter(s => shouldRender(s) && !handledTypes.includes(getSectionType(s))).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 5. Teaching Portfolio - Teaching-focused academic CV
// ===========================================================================
const academicTeaching = {
  id: 'academic-teaching',
  name: 'Teaching Portfolio',
  description: 'Teaching-focused academic CV emphasizing courses taught, pedagogical philosophy, and student outcomes.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'education'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [
    { name: 'Forest', accentColor: '#2d5a27', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Slate', accentColor: '#475569', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Evergreen', accentColor: '#1b4332', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' },
    { name: 'Cambria', fontFamily: 'Cambria, Georgia, serif' },
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-teaching" data-template="academic-teaching"${designVars(design)}>
    <style>
      .academic-teaching { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-teaching .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #2d5a27); text-align: center; }
      .academic-teaching .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 20px); padding-bottom: 14px; border-bottom: 2px solid var(--accent-color, #2d5a27); }
      .academic-teaching .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-teaching .resume-section { margin-bottom: var(--section-spacing, 18px); }
      .academic-teaching .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; color: var(--accent-color, #2d5a27); border-bottom: 2px solid var(--accent-color, #2d5a27); padding-bottom: 4px; }
      .academic-teaching .resume-entry { page-break-inside: avoid; }
      .academic-teaching .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-teaching .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-teaching .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-teaching .resume-summary { line-height: 1.7; margin-bottom: var(--paragraph-spacing, 10px); font-style: italic; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;

    // Department and institution
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join(' | ')}</div>`;
    html += `</div>`;

    // Teaching philosophy / summary first
    const summarySections = sections.filter(s => shouldRender(s) && (getSectionType(s) === 'summary' || getSectionType(s) === 'objective'));
    summarySections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Teaching Philosophy').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Education
    const educationSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'education');
    educationSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Education').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Experience (teaching positions)
    const experienceSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'experience');
    experienceSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Teaching Experience').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Publications
    const pubSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'publications');
    pubSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Publications').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Awards
    const awardsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'awards');
    awardsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Awards & Recognition').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Remaining
    const handledTypes = ['summary', 'objective', 'education', 'experience', 'publications', 'awards'];
    sections.filter(s => shouldRender(s) && !handledTypes.includes(getSectionType(s))).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 6. Grants & Funding - Emphasis on grants and funding history
// ===========================================================================
const academicGrants = {
  id: 'academic-grants',
  name: 'Grants & Funding',
  description: 'CV emphasizing grants, funding history, and sponsored research. Ideal for principal investigators.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research', 'nonprofit'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Gold', accentColor: '#92600a', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Navy', accentColor: '#1e3a5f', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Bronze', accentColor: '#7c5e10', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' },
    { name: 'Garamond', fontFamily: 'Garamond, "Times New Roman", serif' },
    { name: 'Palatino', fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-grants" data-template="academic-grants"${designVars(design)}>
    <style>
      .academic-grants { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-grants .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #92600a); text-align: center; }
      .academic-grants .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 20px); padding-bottom: 12px; border-bottom: 1px solid var(--accent-color, #92600a); }
      .academic-grants .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-grants .resume-section { margin-bottom: var(--section-spacing, 18px); }
      .academic-grants .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px; color: var(--accent-color, #92600a); border-bottom: 1px solid #ccc; padding-bottom: 3px; }
      .academic-grants .resume-entry { page-break-inside: avoid; }
      .academic-grants .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-grants .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-grants .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-grants .grant-amount { font-weight: 700; color: var(--accent-color, #92600a); }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;

    // Department and institution
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join(' | ')}</div>`;
    html += `</div>`;

    // Summary
    const summarySections = sections.filter(s => shouldRender(s) && (getSectionType(s) === 'summary' || getSectionType(s) === 'objective'));
    summarySections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Summary').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Education
    const educationSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'education');
    educationSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Education').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Experience
    const experienceSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'experience');
    experienceSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Academic Appointments').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Awards (grants often appear here)
    const awardsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'awards');
    awardsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Grants & Awards').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Projects (funded research projects)
    const projectsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'projects');
    projectsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Funded Research Projects').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Publications
    const pubSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'publications');
    pubSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Publications').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Remaining
    const handledTypes = ['summary', 'objective', 'education', 'experience', 'awards', 'projects', 'publications'];
    sections.filter(s => shouldRender(s) && !handledTypes.includes(getSectionType(s))).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 7. Clinical Academic - Medical/clinical academic CV
// ===========================================================================
const academicClinical = {
  id: 'academic-clinical',
  name: 'Clinical Academic',
  description: 'Medical and clinical academic CV for physician-scientists, clinical researchers, and medical faculty.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research', 'healthcare', 'medicine'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Medical Blue', accentColor: '#1a5276', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Clinical', accentColor: '#1a1a1a', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Teal', accentColor: '#115e59', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' },
    { name: 'Palatino', fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
    { name: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-clinical" data-template="academic-clinical"${designVars(design)}>
    <style>
      .academic-clinical { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-clinical .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 2px; color: var(--accent-color, #1a5276); }
      .academic-clinical .resume-header { margin-bottom: var(--paragraph-spacing, 20px); padding-bottom: 14px; border-bottom: 3px solid var(--accent-color, #1a5276); }
      .academic-clinical .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 6px; }
      .academic-clinical .resume-section { margin-bottom: var(--section-spacing, 16px); }
      .academic-clinical .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; color: var(--accent-color, #1a5276); border-bottom: 1px solid var(--accent-color, #1a5276); padding-bottom: 3px; }
      .academic-clinical .resume-entry { page-break-inside: avoid; }
      .academic-clinical .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-clinical .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-clinical .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-clinical .resume-credentials { font-style: italic; color: #555; font-size: calc(var(--font-size, 11px) + 1px); }
    </style>`;

    // Header - left-aligned, clinical professional style
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}`;
      if (personalInfo.credentials) html += `, ${e(personalInfo.credentials)}`;
      html += `</h1>`;
    }
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;

    // Department and hospital/institution affiliation
    if (personalInfo.department || personalInfo.institution) {
      html += `<div style="font-size: 11px; color: #444; margin-bottom: 4px;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.department && personalInfo.institution) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }

    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) html += `<div class="resume-contact">${contact.join(' | ')}</div>`;
    html += `</div>`;

    // Education and training first for clinical CVs
    const educationSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'education');
    educationSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Education & Training').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Certifications (board certifications, licenses)
    const certSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'certifications');
    certSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Licensure & Board Certification').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Experience (clinical and academic appointments)
    const experienceSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'experience');
    experienceSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Clinical & Academic Appointments').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Publications
    const pubSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'publications');
    pubSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Publications').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Awards
    const awardsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'awards');
    awardsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Awards & Honors').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Summary
    const summarySections = sections.filter(s => shouldRender(s) && (getSectionType(s) === 'summary' || getSectionType(s) === 'objective'));
    summarySections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Interests').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Remaining (skills, projects, volunteer, languages, custom)
    const handledTypes = ['education', 'certifications', 'experience', 'publications', 'awards', 'summary', 'objective'];
    sections.filter(s => shouldRender(s) && !handledTypes.includes(getSectionType(s))).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// 8. Lab Director - Laboratory and research group leader
// ===========================================================================
const academicLab = {
  id: 'academic-lab',
  name: 'Lab Director',
  description: 'Laboratory and research group leader CV highlighting team management, publications, and funded research.',
  category: 'academic',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['academia', 'research', 'biotech', 'pharmaceuticals'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Lab Blue', accentColor: '#1e40af', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Research Gray', accentColor: '#374151', textColor: '#222222', backgroundColor: '#ffffff' },
    { name: 'Deep Teal', accentColor: '#134e4a', textColor: '#222222', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: '"Times New Roman", Georgia, serif' },
    { name: 'Garamond', fontFamily: 'Garamond, "Times New Roman", serif' },
    { name: 'Palatino', fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template academic-lab" data-template="academic-lab"${designVars(design)}>
    <style>
      .academic-lab { padding: 32px 40px; max-width: 100%; box-sizing: border-box; }
      .academic-lab .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #1e40af); }
      .academic-lab .resume-header { margin-bottom: var(--paragraph-spacing, 20px); padding-bottom: 14px; border-bottom: 2px solid var(--accent-color, #1e40af); display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
      .academic-lab .resume-header-left { flex: 1; min-width: 200px; }
      .academic-lab .resume-header-right { text-align: right; font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); min-width: 180px; }
      .academic-lab .resume-section { margin-bottom: var(--section-spacing, 18px); }
      .academic-lab .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; color: var(--accent-color, #1e40af); border-bottom: 2px solid var(--accent-color, #1e40af); padding-bottom: 4px; }
      .academic-lab .resume-entry { page-break-inside: avoid; }
      .academic-lab .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
      .academic-lab .resume-bullets { padding-left: 18px; margin: 4px 0 0; }
      .academic-lab .resume-bullets li { margin-bottom: 3px; line-height: 1.5; }
      .academic-lab .resume-summary { line-height: 1.6; margin-bottom: var(--paragraph-spacing, 10px); }
    </style>`;

    // Header - split layout: name/title left, contact right
    html += `<div class="resume-header">`;
    html += `<div class="resume-header-left">`;
    if (personalInfo.fullName) html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.resumeHeadline) html += `<div style="font-size: 10.5px; color: #555; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    html += `</div>`;
    html += `<div class="resume-header-right">`;
    if (personalInfo.email) html += `<div>${e(personalInfo.email)}</div>`;
    if (personalInfo.phone) html += `<div>${e(personalInfo.phone)}</div>`;
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      html += `<div>${e(location)}</div>`;
    }
    if (personalInfo.personalWebsite || personalInfo.website) html += `<div>${e(personalInfo.personalWebsite || personalInfo.website)}</div>`;
    if (personalInfo.orcid) html += `<div>ORCID: ${e(personalInfo.orcid)}</div>`;
    html += `</div>`;
    html += `</div>`;

    // Summary first if present
    const summarySections = sections.filter(s => shouldRender(s) && (getSectionType(s) === 'summary' || getSectionType(s) === 'objective'));
    summarySections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Summary').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Education
    const educationSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'education');
    educationSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Education').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Experience sections
    const experienceSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'experience');
    experienceSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research & Leadership Experience').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Publications
    const pubSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'publications');
    pubSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Publications').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Awards
    const awardsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'awards');
    awardsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Grants & Awards').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Projects
    const projectsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'projects');
    projectsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Research Projects').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Skills
    const skillsSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'skills');
    skillsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Technical Expertise').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Volunteer / service
    const volunteerSections = sections.filter(s => shouldRender(s) && getSectionType(s) === 'volunteer');
    volunteerSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Academic Service').toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    // Remaining (certifications, languages, custom)
    const handledTypes = ['summary', 'objective', 'education', 'experience', 'publications', 'awards', 'projects', 'skills', 'volunteer'];
    sections.filter(s => shouldRender(s) && !handledTypes.includes(getSectionType(s))).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += renderSectionBody(section);
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


// ===========================================================================
// Export
// ===========================================================================
export const academicTemplates = [
  academicResearch,
  academicProfessor,
  academicPostdoc,
  academicPhd,
  academicTeaching,
  academicGrants,
  academicClinical,
  academicLab
];
