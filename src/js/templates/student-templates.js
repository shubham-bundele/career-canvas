/**
 * Student Resume Templates
 * Templates optimized for students, recent graduates, and career changers
 * Emphasize education, skills, projects, and activities over limited work experience
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
  communityActivities: 'volunteer', researchExperience: 'experience',
  teachingExperience: 'experience', apprenticeships: 'experience',
  keyQualifications: 'skills', coreCompetencies: 'skills',
  professionalMemberships: 'certifications'
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
  const base = 'font-family: var(--font-family, Arial, sans-serif); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.4); color: var(--text-color, #222)';
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
  return parts;
};

/** Shared helper: render bullet points from highlights/achievements array */
const renderBullets = (item) => {
  const bullets = item.highlights || item.achievements || [];
  if (bullets.length === 0) return '';
  let html = `<ul class="resume-bullets">`;
  bullets.forEach(b => {
    const text = typeof b === 'string' ? b : (b && b.text ? b.text : '');
    if (text) html += `<li>${e(text)}</li>`;
  });
  html += `</ul>`;
  return html;
};

const renderPhoto = (personalInfo, design = {}) => {
  const src = personalInfo.photograph || personalInfo.photo;
  if (!src) return '';
  if (typeof src !== 'string' || (!src.startsWith('data:image/') && !src.startsWith('blob:'))) return '';
  const size = design.photoSize || 100;
  const shape = design.photoShape || 'circle';
  const radius = shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0';
  return '<div class="resume-photo" style="margin-bottom: 16px; text-align: center;">' +
    '<img src="' + src + '" alt="Profile photo" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + radius + ';object-fit:cover;display:inline-block;">' +
    '</div>';
};


/**
 * 1. Student Classic - Clean, education-first layout
 */
const studentClassic = {
  id: 'student-classic',
  name: 'Student Classic',
  description: 'Clean education-first layout. Traditional structure ideal for college students.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Default', accentColor: '#1a1a1a', textColor: '#222222' },
    { name: 'Navy', accentColor: '#1e3a5f', textColor: '#222222' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' },
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-classic" data-template="student-classic"${designVars(design)}>
    <style>
      .student-classic .resume-name { font-size: var(--name-size, 22px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #1a1a1a); }
      .student-classic .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 16px); padding-bottom: 10px; border-bottom: 2px solid var(--accent-color, #1a1a1a); }
      .student-classic .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 4px; }
      .student-classic .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-classic .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; color: var(--accent-color, #1a1a1a); border-bottom: 1px solid var(--accent-color, #1a1a1a); padding-bottom: 2px; }
      .student-classic .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-classic .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; }
      .student-classic .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); }
      .student-classic .resume-bullets { padding-left: 16px; margin: 3px 0 0; }
      .student-classic .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .student-classic .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .student-classic .resume-skill-category { margin-bottom: 3px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
    </style>`;

    // Header - centered
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          if (item.institution) html += ` - ${e(item.institution)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` | ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` | ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 2. Student Modern - Contemporary with subtle color accent
 */
const studentModern = {
  id: 'student-modern',
  name: 'Student Modern',
  description: 'Contemporary design with subtle color accents. Clean and professional.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'business', 'marketing'],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Blue', accentColor: '#2563eb', textColor: '#1f2937' },
    { name: 'Teal', accentColor: '#0891b2', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' },
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-modern" data-template="student-modern"${designVars(design)}>
    <style>
      .student-modern .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #2563eb); }
      .student-modern .resume-header { margin-bottom: var(--paragraph-spacing, 16px); padding-bottom: 12px; border-bottom: 3px solid var(--accent-color, #2563eb); }
      .student-modern .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); margin-top: 6px; }
      .student-modern .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-modern .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; color: var(--accent-color, #2563eb); border-bottom: 2px solid var(--accent-color, #2563eb); padding-bottom: 3px; }
      .student-modern .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-modern .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .student-modern .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #666); }
      .student-modern .resume-bullets { padding-left: 16px; margin: 3px 0 0; }
      .student-modern .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .student-modern .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #333); }
      .student-modern .resume-skill-category { margin-bottom: 4px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' &bull; ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-weight: 600; color: #555; font-size: var(--font-size, 11px);">${e(item.institution)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` at ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` | ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 3. Student Minimal - Ultra-clean, one column
 */
const studentMinimal = {
  id: 'student-minimal',
  name: 'Student Minimal',
  description: 'Ultra-clean one-column layout. Maximum readability with zero distractions.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Minimal', accentColor: '#333333', textColor: '#333333' },
    { name: 'Charcoal', accentColor: '#444444', textColor: '#333333' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' },
    { name: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-minimal" data-template="student-minimal"${designVars(design)}>
    <style>
      .student-minimal .resume-name { font-size: var(--name-size, 20px); font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 6px; color: var(--accent-color, #333); }
      .student-minimal .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 18px); }
      .student-minimal .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #666); margin-top: 6px; letter-spacing: 0.02em; }
      .student-minimal .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-minimal .resume-section-title { font-size: var(--heading-size, 11px); font-weight: 400; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px; color: var(--accent-color, #333); border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      .student-minimal .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-minimal .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1px; }
      .student-minimal .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #888); }
      .student-minimal .resume-bullets { padding-left: 14px; margin: 3px 0 0; }
      .student-minimal .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.5); color: var(--text-color, #444); }
      .student-minimal .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #444); }
      .student-minimal .resume-skill-category { margin-bottom: 3px; font-size: var(--font-size, 11px); color: var(--text-color, #444); }
    </style>`;

    // Header - minimal centered
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 11px; color: #666; margin-bottom: 4px; letter-spacing: 0.05em;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10px; color: #888; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' &middot; ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong style="font-weight: 600;">${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-size: var(--font-size, 11px); color: #666;">${e(item.institution)}`;
            if (item.location) html += `, ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px); color: #666;">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); color: #666;">${e(item.honors)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong style="font-weight: 600;">${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` - ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #888;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px; color: #444;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong style="font-weight: 600;">${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong style="font-weight: 600;">${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px; color: #444;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong style="font-weight: 600;">${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); color: #666;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong style="font-weight: 600;">${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` - ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); color: #444;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong style="font-weight: 600;">${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong style="font-weight: 600;">${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px); color: #444;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 4. Student Academic - For academic applications
 */
const studentAcademic = {
  id: 'student-academic',
  name: 'Student Academic',
  description: 'Academic-focused layout with emphasis on research, coursework, and publications.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['education', 'research', 'academia'],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Academic', accentColor: '#1e3a5f', textColor: '#1f2937' },
    { name: 'Maroon', accentColor: '#7c2d12', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: 'Times New Roman, Georgia, serif' },
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-academic" data-template="student-academic"${designVars(design)}>
    <style>
      .student-academic .resume-name { font-size: var(--name-size, 22px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #1e3a5f); text-align: center; }
      .student-academic .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 16px); padding-bottom: 10px; border-bottom: 2px solid var(--accent-color, #1e3a5f); }
      .student-academic .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); margin-top: 4px; }
      .student-academic .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-academic .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; margin: 0 0 4px; color: var(--accent-color, #1e3a5f); border-bottom: 1px solid var(--accent-color, #1e3a5f); padding-bottom: 2px; }
      .student-academic .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-academic .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .student-academic .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); font-style: italic; }
      .student-academic .resume-bullets { padding-left: 16px; margin: 3px 0 0; }
      .student-academic .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.5); color: var(--text-color, #222); }
      .student-academic .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #333); }
      .student-academic .resume-skill-category { margin-bottom: 3px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
    </style>`;

    // Header - centered academic style
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-size: var(--font-size, 11px); color: #555;">${e(item.institution)}`;
            if (item.location) html += `, ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += `, ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += `, ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 5. Internship Ready - Optimized for internship applications
 */
const studentInternship = {
  id: 'student-internship',
  name: 'Internship Ready',
  description: 'Optimized for internship applications. Highlights coursework, projects, and skills.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'engineering', 'business', 'finance'],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Professional', accentColor: '#0f766e', textColor: '#1f2937' },
    { name: 'Blue', accentColor: '#1d4ed8', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' },
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-internship" data-template="student-internship"${designVars(design)}>
    <style>
      .student-internship .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 2px; color: var(--accent-color, #0f766e); }
      .student-internship .resume-header { margin-bottom: var(--paragraph-spacing, 14px); padding-bottom: 10px; border-bottom: 3px solid var(--accent-color, #0f766e); }
      .student-internship .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); margin-top: 4px; }
      .student-internship .resume-section { margin-bottom: var(--section-spacing, 12px); }
      .student-internship .resume-section-title { font-size: var(--heading-size, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 5px; color: var(--accent-color, #0f766e); padding-bottom: 3px; border-bottom: 1.5px solid var(--accent-color, #0f766e); }
      .student-internship .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-internship .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .student-internship .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #666); }
      .student-internship .resume-bullets { padding-left: 16px; margin: 3px 0 0; }
      .student-internship .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .student-internship .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #333); }
      .student-internship .resume-skill-category { margin-bottom: 4px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 3px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 5px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">Expected ${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-weight: 600; color: #555; font-size: var(--font-size, 11px);">${e(item.institution)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` | ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.url || item.link) {
            html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: var(--accent-color, #0f766e);">${e(item.url || item.link)}</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` | ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 6. First Job - Designed for no/minimal experience
 */
const studentFirstJob = {
  id: 'student-first-job',
  name: 'First Job',
  description: 'Designed for applicants with no or minimal work experience. Emphasizes skills and education.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['retail', 'hospitality', 'food-service', 'customer-service'],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Warm', accentColor: '#b45309', textColor: '#1f2937' },
    { name: 'Blue', accentColor: '#2563eb', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' },
    { name: 'Verdana', fontFamily: 'Verdana, Geneva, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-first-job" data-template="student-first-job"${designVars(design)}>
    <style>
      .student-first-job .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #b45309); }
      .student-first-job .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 16px); padding: 16px 20px; background-color: var(--secondary-color, #fffbeb); }
      .student-first-job .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); margin-top: 6px; }
      .student-first-job .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-first-job .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; color: var(--accent-color, #b45309); border-bottom: 2px solid var(--accent-color, #b45309); padding-bottom: 3px; }
      .student-first-job .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-first-job .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .student-first-job .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #666); }
      .student-first-job .resume-bullets { padding-left: 16px; margin: 3px 0 0; }
      .student-first-job .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .student-first-job .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #333); }
      .student-first-job .resume-skill-category { margin-bottom: 4px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
    </style>`;

    // Header with warm background
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' &bull; ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-size: var(--font-size, 11px); color: #555;">${e(item.institution)}`;
            if (item.location) html += `, ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` | ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` | ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 7. Career Changer - Skills-first layout
 */
const studentCareerChange = {
  id: 'student-career-change',
  name: 'Career Changer',
  description: 'Skills-first layout for career changers. Highlights transferable skills and new qualifications.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Purple', accentColor: '#7c3aed', textColor: '#1f2937' },
    { name: 'Slate', accentColor: '#475569', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' },
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-career-change" data-template="student-career-change"${designVars(design)}>
    <style>
      .student-career-change .resume-name { font-size: var(--name-size, 24px); font-weight: 700; margin: 0 0 2px; color: var(--accent-color, #7c3aed); }
      .student-career-change .resume-header { margin-bottom: var(--paragraph-spacing, 14px); padding-bottom: 12px; border-bottom: 3px solid var(--accent-color, #7c3aed); }
      .student-career-change .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); margin-top: 4px; }
      .student-career-change .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-career-change .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; color: var(--accent-color, #7c3aed); border-left: 4px solid var(--accent-color, #7c3aed); padding-left: 10px; }
      .student-career-change .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .student-career-change .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .student-career-change .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #666); }
      .student-career-change .resume-bullets { padding-left: 16px; margin: 3px 0 0; }
      .student-career-change .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .student-career-change .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #333); }
      .student-career-change .resume-skill-category { margin-bottom: 5px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
      .student-career-change .resume-skills-box { background-color: var(--secondary-color, #f5f3ff); padding: 10px 14px; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = buildContactLine(personalInfo);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections - skills rendered in a highlighted box
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'skills') {
        // Enhanced skills display in a box for career changers
        html += `<div class="resume-skills-box">`;
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
        html += `</div>`;
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-size: var(--font-size, 11px); color: #555;">${e(item.institution)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` | ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` | ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


/**
 * 8. Graduate - Post-graduation professional entry
 */
const studentGraduate = {
  id: 'student-graduate',
  name: 'Graduate',
  description: 'Post-graduation professional entry template. Bridges academic and professional worlds.',
  category: 'student',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['business', 'technology', 'healthcare', 'engineering'],
  recommendedLevels: ['entry', 'student'],
  colorPresets: [
    { name: 'Dark Blue', accentColor: '#1e40af', textColor: '#1f2937' },
    { name: 'Forest', accentColor: '#166534', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' },
    { name: 'Garamond', fontFamily: 'Garamond, Georgia, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template student-graduate" data-template="student-graduate"${designVars(design)}>
    <style>
      .student-graduate .resume-name { font-size: var(--name-size, 26px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #1e40af); }
      .student-graduate .resume-header { margin-bottom: var(--paragraph-spacing, 16px); padding-bottom: 14px; border-bottom: 1px solid #ddd; }
      .student-graduate .resume-title-bar { display: flex; justify-content: space-between; align-items: flex-start; }
      .student-graduate .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); text-align: right; }
      .student-graduate .resume-section { margin-bottom: var(--section-spacing, 14px); }
      .student-graduate .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px; color: var(--accent-color, #1e40af); border-bottom: 2px solid var(--accent-color, #1e40af); padding-bottom: 3px; }
      .student-graduate .resume-entry { margin-bottom: var(--paragraph-spacing, 12px); }
      .student-graduate .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .student-graduate .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #666); }
      .student-graduate .resume-bullets { padding-left: 16px; margin: 4px 0 0; }
      .student-graduate .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 3px; line-height: var(--line-height, 1.5); color: var(--text-color, #222); }
      .student-graduate .resume-summary { margin-bottom: var(--paragraph-spacing, 10px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #333); }
      .student-graduate .resume-skill-category { margin-bottom: 4px; font-size: var(--font-size, 11px); color: var(--text-color, #222); }
    </style>`;

    // Header - professional layout with name left, contact right
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    html += `<div class="resume-title-bar">`;
    html += `<div>`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #444; margin-bottom: 2px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;

    // Contact info on right side
    html += `<div class="resume-contact">`;
    if (personalInfo.email) html += `<div>${e(personalInfo.email)}</div>`;
    if (personalInfo.phone) html += `<div>${e(personalInfo.phone)}</div>`;
    if (personalInfo.city || personalInfo.state) {
      const location = [personalInfo.city, personalInfo.state].filter(Boolean).join(', ');
      html += `<div>${e(location)}</div>`;
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) html += `<div>${e(personalInfo.linkedinUrl || personalInfo.linkedin)}</div>`;
    if (personalInfo.githubUrl) html += `<div>${e(personalInfo.githubUrl)}</div>`;
    if (personalInfo.personalWebsite || personalInfo.website) html += `<div>${e(personalInfo.personalWebsite || personalInfo.website)}</div>`;
    html += `</div>`;

    html += `</div>`; // end title-bar
    html += `</div>`; // end header

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = getSectionType(section);
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }
      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div class="resume-summary">${e(item.content)}</div>`;
        });
      } else if (sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) { html += `<div class="resume-entry-date">${dr}</div>`; }
          else if (item.graduationYear) { html += `<div class="resume-entry-date">${e(item.graduationYear)}</div>`; }
          html += `</div>`;
          if (item.institution) {
            html += `<div style="font-weight: 600; color: #555; font-size: var(--font-size, 11px);">${e(item.institution)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.gpa) html += `<div style="font-size: var(--font-size, 11px);">GPA: ${e(item.gpa)}</div>`;
          if (item.honors) html += `<div style="font-size: var(--font-size, 11px); font-style: italic;">${e(item.honors)}</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
          if (item.company) html += ` | ${e(item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.location) html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: #666;">${e(item.location)}</div>`;
          if (item.description || item.roleSummary) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description || item.roleSummary)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skill-category">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (sType === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.url || item.link) {
            html += `<div style="font-size: calc(var(--font-size, 11px) - 1px); color: var(--accent-color, #1e40af);">${e(item.url || item.link)}</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'certifications' || sType === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (sType === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header"><div>`;
          if (item.role || item.jobTitle || item.title) html += `<strong>${e(item.role || item.jobTitle || item.title)}</strong>`;
          if (item.organization || item.company) html += ` | ${e(item.organization || item.company)}`;
          html += `</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dr) html += `<div class="resume-entry-date">${dr}</div>`;
          html += `</div>`;
          if (item.description) html += `<div style="font-size: var(--font-size, 11px); margin-top: 2px;">${e(item.description)}</div>`;
          html += renderBullets(item);
          html += `</div>`;
        });
      } else if (sType === 'languages') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.language) {
            html += `<strong>${e(item.language)}</strong>`;
            if (item.proficiency) html += ` - ${e(item.proficiency)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="font-size: var(--font-size, 11px);">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};


export const studentTemplates = [
  studentClassic,
  studentModern,
  studentMinimal,
  studentAcademic,
  studentInternship,
  studentFirstJob,
  studentCareerChange,
  studentGraduate
];
