/**
 * ATS-Optimized Resume Templates
 * Templates designed for maximum compatibility with Applicant Tracking Systems
 */

import { encodeHTML } from '../utils/sanitize.js';
import { formatMonthYear } from '../utils/format.js';

// HTML escape helper
const e = (text) => encodeHTML(text);

// Helper to check if section should be rendered
const shouldRender = (section) => {
  if (!section || section.visible === false) return false;
  if (section.content) return true;
  if (section.items && section.items.length > 0) return true;
  return false;
};

// Helper to check if item should be rendered
const shouldRenderItem = (item) => {
  return item && item.included !== false && item.hidden !== true;
};

// Helper to get normalized section type (handles both editor and schema formats)
const SECTION_TYPE_MAP = {
  professionalSummary: 'summary', careerObjective: 'objective',
  professionalExperience: 'experience', otherExperience: 'experience',
  internships: 'experience', apprenticeships: 'experience',
  technicalSkills: 'skills', toolsAndTechnologies: 'skills',
  openSourceContributions: 'projects',
  researchExperience: 'experience', teachingExperience: 'experience',
  volunteerExperience: 'volunteer', leadershipExperience: 'experience',
  communityActivities: 'volunteer', militaryExperience: 'experience',
  professionalMemberships: 'certifications',
  keyQualifications: 'skills', coreCompetencies: 'skills'
};
const getSectionType = (section) => {
  const raw = section.sectionType || section.type || '';
  return SECTION_TYPE_MAP[raw] || raw;
};

// Helper to format date range
const formatDateRange = (startMonth, startYear, endMonth, endYear, current) => {
  if (!startMonth || !startYear) return '';

  const start = formatMonthYear(startMonth, startYear, true);
  if (current) {
    return `${start} - Present`;
  }
  if (endMonth && endYear) {
    const end = formatMonthYear(endMonth, endYear, true);
    return `${start} - ${end}`;
  }
  return start;
};

// Helper to get design CSS variables as a string (no style="" wrapper)
const getDesignCSSVars = (design) => {
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
  return vars.join('; ');
};

const renderPhoto = (personalInfo, design = {}) => {
  const src = personalInfo.photograph || personalInfo.photo;
  if (!src) return '';
  if (typeof src !== 'string' || (!src.startsWith('data:image/') && !src.startsWith('blob:'))) return '';
  const size = design.photoSize || 100;
  const shape = design.photoShape || 'circle';
  const radius = shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0';
  return `<div class="resume-photo" style="margin-bottom: 16px; text-align: center;">` +
    `<img src="${src}" alt="Profile photo" style="width:${size}px;height:${size}px;border-radius:${radius};object-fit:cover;display:inline-block;">` +
    `</div>`;
};

// Returns a complete style="" attribute with design vars + base font/color/spacing applied
const designVars = (design) => {
  const cssVars = getDesignCSSVars(design);
  const base = 'font-family: var(--font-family, Arial, sans-serif); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.4); color: var(--text-color, #222); padding: 32px 40px; max-width: 100%; box-sizing: border-box';
  const all = [cssVars, base].filter(Boolean).join('; ');
  return all ? ` style="${all}"` : '';
};

/**
 * 1. ATS Essential - Minimalist, maximum content density
 */
const atsEssential = {
  id: 'ats-essential',
  name: 'ATS Essential',
  description: 'Minimalist design with maximum content density. Clean and highly scannable.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry', 'mid', 'senior', 'executive'],
  colorPresets: [
    { name: 'Default', accentColor: '#000000', textColor: '#000000' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' },
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template ats-essential" data-template="ats-essential"${designVars(design)}>
    <style>
      .ats-essential .resume-name { font-size: var(--name-size, 22px); font-weight: 700; margin: 0 0 4px; color: var(--accent-color, #1a1a1a); }
      .ats-essential .resume-header { text-align: center; margin-bottom: var(--paragraph-spacing, 16px); padding-bottom: 12px; border-bottom: 2px solid var(--accent-color, #333); }
      .ats-essential .resume-contact { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #444); margin-top: 4px; }
      .ats-essential .resume-section { margin-bottom: var(--section-spacing, 12px); }
      .ats-essential .resume-section-title { font-size: var(--heading-size, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; color: var(--accent-color, #1a1a1a); }
      .ats-essential .resume-divider { border: none; border-top: 1px solid var(--accent-color, #333); margin: 2px 0 var(--paragraph-spacing, 8px); }
      .ats-essential .resume-summary { margin-bottom: var(--paragraph-spacing, 8px); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .ats-essential .resume-entry { margin-bottom: var(--paragraph-spacing, 10px); }
      .ats-essential .resume-entry-header { font-size: var(--font-size, 11px); margin-bottom: 2px; color: var(--text-color, #222); }
      .ats-essential .resume-entry-date { font-size: calc(var(--font-size, 11px) - 1px); color: var(--text-color, #555); margin-bottom: 4px; }
      .ats-essential .resume-bullets { padding-left: 16px; margin: 4px 0 0; }
      .ats-essential .resume-bullets li { font-size: var(--font-size, 11px); margin-bottom: 2px; line-height: var(--line-height, 1.4); color: var(--text-color, #222); }
      .ats-essential .resume-skills { font-size: var(--font-size, 11px); color: var(--text-color, #222); }
      .ats-essential .resume-skill-category { margin-bottom: 3px; }
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

    // Contact info
    const contactParts = [];
    if (personalInfo.email) contactParts.push(`<span>${e(personalInfo.email)}</span>`);
    if (personalInfo.phone) contactParts.push(`<span>${e(personalInfo.phone)}</span>`);
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(`<span>${e(location)}</span>`);
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(`<span>${e(personalInfo.linkedinUrl || personalInfo.linkedin)}</span>`);
    if (personalInfo.githubUrl) contactParts.push(`<span>${e(personalInfo.githubUrl)}</span>`);
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(`<span>${e(personalInfo.personalWebsite || personalInfo.website)}</span>`);

    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      const sType = section.sectionType || section.type || '';
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || sType)}</h2>`;
      html += `<hr class="resume-divider">`;

      // Handle text content sections (summary, objective)
      if (section.content) {
        html += `<div class="resume-summary">${e(section.content)}</div>`;
      }

      const items = (section.items || []).filter(shouldRenderItem);

      if (sType === 'summary' || sType === 'objective') {
        items.forEach(item => {
          if (item.content) {
            html += `<div class="resume-summary">${e(item.content)}</div>`;
          }
        });
      } else if (sType === 'experience' || sType === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.jobTitle || item.degree) {
            html += `<strong>${e(item.jobTitle || item.degree)}</strong>`;
          }
          if (item.company || item.institution) {
            html += ` | ${e(item.company || item.institution)}`;
          }
          if (item.location) {
            html += ` | ${e(item.location)}`;
          }
          html += `</div>`;

          const dateRange = formatDateRange(
            item.startMonth, item.startYear,
            item.endMonth, item.endYear,
            item.current || item.currentlyWorking
          );
          if (dateRange) {
            html += `<div class="resume-entry-date">${dateRange}</div>`;
          }

          if (item.description || item.roleSummary) {
            html += `<div class="resume-entry-description">${e(item.description || item.roleSummary)}</div>`;
          }

          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => {
              const text = typeof b === 'string' ? b : (b && b.text ? b.text : '');
              if (text) html += `<li>${e(text)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) {
              html += ` - ${e(item.issuer || item.organization)}`;
            }
            if (item.date || item.year) {
              html += ` (${e(item.date || item.year)})`;
            }
            html += `</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
          html += `</div>`;
        });
      } else {
        // Generic section rendering
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          const displayText = item.text || item.skills || item.title || item.name || item.description || item.content || '';
          if (displayText) {
            html += `<div>${e(String(displayText))}</div>`;
          }
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
 * 2. ATS Classic - Traditional resume look with Times New Roman
 */
const atsClassic = {
  id: 'ats-classic',
  name: 'ATS Classic',
  description: 'Traditional resume format with conservative styling. Professional and timeless.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['legal', 'finance', 'government', 'education'],
  recommendedLevels: ['mid', 'senior', 'executive'],
  colorPresets: [
    { name: 'Default', accentColor: '#000000', textColor: '#000000' }
  ],
  fontPresets: [
    { name: 'Times New Roman', fontFamily: 'Times New Roman, Georgia, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template ats-classic" data-template="ats-classic"${designVars(design)}>`;

    // Header - centered
    html += `<div class="resume-header" style="text-align: center;">`;
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

    // Contact info - centered
    const contactParts = [];
    if (personalInfo.address) contactParts.push(e(personalInfo.address));
    if (personalInfo.city || personalInfo.state || personalInfo.zip) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.zip].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.country) contactParts.push(e(personalInfo.country));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));

    if (contactParts.length > 0) {
      contactParts.forEach(part => {
        html += `<div class="resume-contact-line">${part}</div>`;
      });
    }
    html += `</div>`;

    // Horizontal rule
    html += `<hr class="resume-divider">`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title" style="text-align: center; text-transform: uppercase;">${e(section.title || section.type)}</h2>`;
      html += `<hr class="resume-divider">`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) {
            html += `<div class="resume-summary">${e(item.content)}</div>`;
          }
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-row">`;
          if (item.jobTitle) {
            html += `<strong>${e(item.jobTitle)}</strong>`;
          }
          html += `</div>`;

          html += `<div class="resume-entry-row">`;
          if (item.company) {
            html += `<em>${e(item.company)}</em>`;
          }
          if (item.location) {
            html += ` - ${e(item.location)}`;
          }
          html += `</div>`;

          const dateRange = formatDateRange(
            item.startMonth, item.startYear,
            item.endMonth, item.endYear,
            item.current || item.currentlyWorking
          );
          if (dateRange) {
            html += `<div class="resume-entry-date">${dateRange}</div>`;
          }

          if (item.description || item.roleSummary) {
            html += `<div class="resume-entry-description">${e(item.description || item.roleSummary)}</div>`;
          }

          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => {
              const text = typeof b === 'string' ? b : (b && b.text ? b.text : '');
              if (text) html += `<li>${e(text)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div><strong>${e(item.degree)}</strong>`;
            if (item.field) {
              html += ` in ${e(item.field)}`;
            }
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div><em>${e(item.institution)}</em>`;
            if (item.location) {
              html += ` - ${e(item.location)}`;
            }
            html += `</div>`;
          }
          if (item.graduationYear || item.endYear) {
            html += `<div>Graduated: ${e(item.graduationYear || item.endYear)}</div>`;
          }
          if (item.gpa) {
            html += `<div>GPA: ${e(item.gpa)}</div>`;
          }
          if (item.honors) {
            html += `<div>${e(item.honors)}</div>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) {
              html += ` - ${e(item.organization || item.issuer)}`;
            }
            if (item.date || item.year) {
              html += ` (${e(item.date || item.year)})`;
            }
            html += `</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
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
 * 3. ATS Modern - Clean sans-serif with subtle blue accent
 */
const atsModern = {
  id: 'ats-modern',
  name: 'ATS Modern',
  description: 'Modern clean layout with subtle color accent. Professional yet contemporary.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'business', 'healthcare', 'consulting'],
  recommendedLevels: ['entry', 'mid', 'senior'],
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

    let html = `<div class="resume-template ats-modern" data-template="ats-modern"${designVars(design)}>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="color: var(--accent-color, #2563eb);">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    // Contact info
    const contactParts = [];
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(e(personalInfo.personalWebsite || personalInfo.website));

    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' • ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title" style="color: var(--accent-color, #2563eb); border-bottom: 2px solid var(--accent-color, #2563eb); padding-bottom: 4px;">${e(section.title || section.type)}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) {
            html += `<div class="resume-summary">${e(item.content)}</div>`;
          }
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          html += `<div>`;
          if (item.jobTitle) {
            html += `<strong>${e(item.jobTitle)}</strong>`;
          }
          if (item.company) {
            html += ` at ${e(item.company)}`;
          }
          html += `</div>`;

          const dateRange = formatDateRange(
            item.startMonth, item.startYear,
            item.endMonth, item.endYear,
            item.current
          );
          if (dateRange || item.location) {
            html += `<div class="resume-entry-meta">`;
            if (item.location) html += `${e(item.location)}`;
            if (dateRange && item.location) html += ` | `;
            if (dateRange) html += dateRange;
            html += `</div>`;
          }
          html += `</div>`;

          if (item.description) {
            html += `<div class="resume-entry-description">${e(item.description)}</div>`;
          }

          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          html += `<div>`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          if (item.institution) {
            html += ` - ${e(item.institution)}`;
          }
          html += `</div>`;

          const dateRange = formatDateRange(
            item.startMonth, item.startYear,
            item.endMonth, item.endYear,
            item.current
          );
          if (dateRange || item.location) {
            html += `<div class="resume-entry-meta">`;
            if (item.location) html += `${e(item.location)}`;
            if (dateRange && item.location) html += ` | `;
            if (dateRange) html += dateRange;
            html += `</div>`;
          }
          html += `</div>`;

          if (item.gpa) {
            html += `<div>GPA: ${e(item.gpa)}</div>`;
          }
          if (item.honors) {
            html += `<div>${e(item.honors)}</div>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) {
              html += ` - ${e(item.organization || item.issuer)}`;
            }
            if (item.date || item.year) {
              html += ` (${e(item.date || item.year)})`;
            }
            html += `</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
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
 * 4. ATS Compact - Optimized for one page
 */
const atsCompact = {
  id: 'ats-compact',
  name: 'ATS Compact',
  description: 'Space-efficient design optimized for fitting maximum content on one page.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry', 'mid'],
  colorPresets: [
    { name: 'Default', accentColor: '#000000', textColor: '#000000' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10 }
  ],
  spacingPresets: [
    { name: 'Compact', sectionSpacing: 12, paragraphSpacing: 4 }
  ],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template ats-compact" data-template="ats-compact"${designVars(design)}>`;

    // Header - compact
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

    // Contact info - single line
    const contactParts = [];
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(e(personalInfo.personalWebsite || personalInfo.website));

    if (contactParts.length > 0) {
      html += `<div class="resume-contact" style="font-size: 10px;">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 12px;">`;
      html += `<h2 class="resume-section-title" style="font-size: 12px; margin-bottom: 4px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) {
            html += `<div class="resume-summary" style="font-size: 10px;">${e(item.content)}</div>`;
          }
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 8px;">`;

          // Compact header - job title and company on same line
          if (item.jobTitle || item.company) {
            html += `<div style="font-size: 10px;">`;
            if (item.jobTitle) html += `<strong>${e(item.jobTitle)}</strong>`;
            if (item.company) html += ` - ${e(item.company)}`;

            const dateRange = formatDateRange(
              item.startMonth, item.startYear,
              item.endMonth, item.endYear,
              item.current
            );
            if (dateRange) {
              html += ` (${dateRange})`;
            }
            html += `</div>`;
          }

          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets" style="font-size: 10px; margin: 2px 0;">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 6px; font-size: 10px;">`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          if (item.institution) {
            html += ` - ${e(item.institution)}`;
          }
          if (item.graduationYear || item.endYear) {
            html += ` (${e(item.graduationYear || item.endYear)})`;
          }
          if (item.gpa) {
            html += ` | GPA: ${e(item.gpa)}`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item" style="font-size: 10px; margin-bottom: 4px;">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="font-size: 10px; margin-bottom: 4px;">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) {
              html += ` - ${e(item.organization || item.issuer)}`;
            }
            if (item.date || item.year) {
              html += ` (${e(item.date || item.year)})`;
            }
          }
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
 * 5. ATS Executive - Generous spacing for senior roles
 */
const atsExecutive = {
  id: 'ats-executive',
  name: 'ATS Executive',
  description: 'Professional format with generous spacing for executive and senior leadership roles.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['senior', 'executive'],
  colorPresets: [
    { name: 'Default', accentColor: '#1f2937', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' },
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' }
  ],
  spacingPresets: [
    { name: 'Executive', sectionSpacing: 24, paragraphSpacing: 12 }
  ],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;

    let html = `<div class="resume-template ats-executive" data-template="ats-executive"${designVars(design)}>`;

    // Header - prominent name
    html += `<div class="resume-header" style="text-align: center; margin-bottom: 20px;">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="font-size: 24px; margin-bottom: 8px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    // Contact info
    const contactParts = [];
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(e(personalInfo.personalWebsite || personalInfo.website));

    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' • ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 class="resume-section-title" style="font-size: 16px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 12px;">${e(section.title || section.type)}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) {
            html += `<div class="resume-summary" style="line-height: 1.6;">${e(item.content)}</div>`;
          }
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 16px;">`;

          if (item.jobTitle) {
            html += `<div style="font-weight: 700; font-size: 14px;">${e(item.jobTitle)}</div>`;
          }

          if (item.company) {
            html += `<div style="font-style: italic; margin-bottom: 4px;">`;
            html += e(item.company);
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }

          const dateRange = formatDateRange(
            item.startMonth, item.startYear,
            item.endMonth, item.endYear,
            item.current
          );
          if (dateRange) {
            html += `<div style="font-size: 12px; color: #666; margin-bottom: 8px;">${dateRange}</div>`;
          }

          if (item.description) {
            html += `<div style="margin-bottom: 8px;">${e(item.description)}</div>`;
          }

          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 12px;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="font-style: italic;">${e(item.institution)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.graduationYear || item.endYear) {
            html += `<div style="font-size: 12px;">${e(item.graduationYear || item.endYear)}</div>`;
          }
          if (item.honors) {
            html += `<div style="margin-top: 4px;">${e(item.honors)}</div>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item" style="margin-bottom: 8px;">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 10px;">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) {
              html += ` - ${e(item.organization || item.issuer)}`;
            }
            if (item.date || item.year) {
              html += ` (${e(item.date || item.year)})`;
            }
            html += `</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
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
 * 6-10: Additional ATS Templates (abbreviated for space)
 */

const atsTechnical = {
  id: 'ats-technical',
  name: 'ATS Technical',
  description: 'Technical skills prominently placed. Clean layout for tech professionals.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'engineering', 'data-science'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template ats-technical" data-template="ats-technical"${designVars(design)}>`;

    // Header
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = [];
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
    if (personalInfo.githubUrl || personalInfo.github) contactParts.push(e(personalInfo.githubUrl || personalInfo.github));
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(e(personalInfo.personalWebsite || personalInfo.website));
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Prioritize technical skills section
    const skillsSection = sections.find(s => s.type === 'skills' && shouldRender(s));
    if (skillsSection) {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">TECHNICAL SKILLS</h2>`;
      html += `<hr class="resume-divider">`;
      skillsSection.items.filter(shouldRenderItem).forEach(item => {
        html += `<div class="resume-skills-item">`;
        if (item.category) {
          html += `<strong>${e(item.category)}:</strong> `;
        }
        if (item.skills && Array.isArray(item.skills)) {
          html += `<span style="font-family: 'Courier New', monospace;">${e(item.skills.join(', '))}</span>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Other sections
    sections.filter(s => shouldRender(s) && s.type !== 'skills').forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += `<hr class="resume-divider">`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.jobTitle) {
            html += `<strong>${e(item.jobTitle)}</strong>`;
          }
          if (item.company) {
            html += ` | ${e(item.company)}`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dateRange) {
            html += ` | ${dateRange}`;
          }
          html += `<div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div></div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
          }
          if (item.institution) {
            html += ` | ${e(item.institution)}`;
          }
          if (item.graduationYear) {
            html += ` | ${e(item.graduationYear)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
          }
          if (item.description) {
            html += ` - ${e(item.description)}`;
          }
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

const atsGraduate = {
  id: 'ats-graduate',
  name: 'ATS Graduate',
  description: 'Education-first layout for new graduates and recent students.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry'],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template ats-graduate" data-template="ats-graduate"${designVars(design)}>`;

    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = [];
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(e(personalInfo.personalWebsite || personalInfo.website));
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Education first
    const educationSection = sections.find(s => s.type === 'education' && shouldRender(s));
    if (educationSection) {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">EDUCATION</h2>`;
      html += `<hr class="resume-divider">`;
      educationSection.items.filter(shouldRenderItem).forEach(item => {
        html += `<div class="resume-entry">`;
        if (item.degree) {
          html += `<div><strong>${e(item.degree)}</strong>`;
          if (item.field) html += ` in ${e(item.field)}`;
          html += `</div>`;
        }
        if (item.institution) {
          html += `<div>${e(item.institution)}`;
          if (item.location) html += `, ${e(item.location)}`;
          html += `</div>`;
        }
        if (item.graduationYear || item.endYear) {
          html += `<div>Expected Graduation: ${e(item.graduationYear || item.endYear)}</div>`;
        }
        if (item.gpa) {
          html += `<div>GPA: ${e(item.gpa)}</div>`;
        }
        if (item.honors) {
          html += `<div>${e(item.honors)}</div>`;
        }
        if (item.relevantCoursework) {
          html += `<div><strong>Relevant Coursework:</strong> ${e(item.relevantCoursework)}</div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Other sections
    sections.filter(s => shouldRender(s) && s.type !== 'education').forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += `<hr class="resume-divider">`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.jobTitle) {
            html += `<div><strong>${e(item.jobTitle)}</strong></div>`;
          }
          if (item.company) {
            html += `<div>${e(item.company)}`;
            if (item.location) html += `, ${e(item.location)}`;
            html += `</div>`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dateRange) {
            html += `<div>${dateRange}</div>`;
          }
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

const atsFederal = {
  id: 'ats-federal',
  name: 'ATS Federal',
  description: 'Detailed format for federal government positions with extended information fields.',
  category: 'ats',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter'],
  recommendedIndustries: ['government'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Times New Roman', fontFamily: 'Times New Roman, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template ats-federal" data-template="ats-federal"${designVars(design)}>`;

    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    // Extended contact information
    if (personalInfo.address) html += `<div>${e(personalInfo.address)}</div>`;
    if (personalInfo.city || personalInfo.state || personalInfo.zip) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.zip].filter(Boolean).join(', ');
      html += `<div>${e(location)}</div>`;
    }
    if (personalInfo.country) html += `<div>${e(personalInfo.country)}</div>`;
    if (personalInfo.email) html += `<div>Email: ${e(personalInfo.email)}</div>`;
    if (personalInfo.phone) html += `<div>Phone: ${e(personalInfo.phone)}</div>`;
    if (personalInfo.githubUrl) html += `<div>GitHub: ${e(personalInfo.githubUrl)}</div>`;
    if (personalInfo.citizenship) html += `<div>Citizenship: ${e(personalInfo.citizenship)}</div>`;

    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += `<hr class="resume-divider">`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.jobTitle) {
            html += `<div><strong>Job Title:</strong> ${e(item.jobTitle)}</div>`;
          }
          if (item.series) {
            html += `<div><strong>Series:</strong> ${e(item.series)}</div>`;
          }
          if (item.company) {
            html += `<div><strong>Employer:</strong> ${e(item.company)}</div>`;
          }
          if (item.supervisorName) {
            html += `<div><strong>Supervisor:</strong> ${e(item.supervisorName)}`;
            if (item.supervisorPhone) html += ` (${e(item.supervisorPhone)})`;
            html += `</div>`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dateRange) {
            html += `<div><strong>Dates Employed:</strong> ${dateRange}</div>`;
          }
          if (item.hoursPerWeek) {
            html += `<div><strong>Hours per Week:</strong> ${e(item.hoursPerWeek)}</div>`;
          }
          if (item.salary) {
            html += `<div><strong>Salary:</strong> ${e(item.salary)}</div>`;
          }
          if (item.duties || item.description) {
            html += `<div><strong>Duties:</strong></div>`;
            html += `<div>${e(item.duties || item.description)}</div>`;
          }
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree || item.title || item.name) {
            html += `<div><strong>${e(item.degree || item.title || item.name)}</strong></div>`;
          }
          if (item.institution || item.organization) {
            html += `<div>${e(item.institution || item.organization)}</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

const atsAcademic = {
  id: 'ats-academic',
  name: 'ATS Academic',
  description: 'Academic CV format with publications, research, and teaching experience.',
  category: 'ats',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['education', 'research'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Times New Roman', fontFamily: 'Times New Roman, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template ats-academic" data-template="ats-academic"${designVars(design)}>`;

    html += `<div class="resume-header" style="text-align: center;">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    const contactParts = [];
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));
    if (personalInfo.orcid) contactParts.push(`ORCID: ${e(personalInfo.orcid)}`);
    if (contactParts.length > 0) {
      html += `<div class="resume-contact">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += `<hr class="resume-divider">`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.citation) {
            html += `<div>${e(item.citation)}</div>`;
          } else {
            if (item.authors) html += `<div>${e(item.authors)}</div>`;
            if (item.title) html += `<div><em>${e(item.title)}</em></div>`;
            if (item.journal) html += `<div>${e(item.journal)}`;
            if (item.year) html += `, ${e(item.year)}`;
            html += `</div>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'research') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.title) html += `<div><strong>${e(item.title)}</strong></div>`;
          if (item.role) html += `<div>${e(item.role)}</div>`;
          if (item.institution) html += `<div>${e(item.institution)}</div>`;
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dateRange) html += `<div>${dateRange}</div>`;
          if (item.description) html += `<div>${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'teaching') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.course) html += `<div><strong>${e(item.course)}</strong></div>`;
          if (item.institution) html += `<div>${e(item.institution)}</div>`;
          if (item.term) html += `<div>${e(item.term)}</div>`;
          if (item.description) html += `<div>${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree || item.title || item.name) {
            html += `<div><strong>${e(item.degree || item.title || item.name)}</strong></div>`;
          }
          if (item.institution || item.organization) {
            html += `<div>${e(item.institution || item.organization)}</div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

const atsInternational = {
  id: 'ats-international',
  name: 'ATS International',
  description: 'International format with personal details, languages, and optional photo.',
  category: 'ats',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['a4', 'letter'],
  recommendedIndustries: [],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template ats-international" data-template="ats-international"${designVars(design)}>`;

    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    // Personal details section
    html += `<div class="resume-personal-details">`;
    if (personalInfo.dateOfBirth) html += `<div>Date of Birth: ${e(personalInfo.dateOfBirth)}</div>`;
    if (personalInfo.nationality) html += `<div>Nationality: ${e(personalInfo.nationality)}</div>`;
    if (personalInfo.address) html += `<div>Address: ${e(personalInfo.address)}</div>`;
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      html += `<div>Location: ${e(location)}</div>`;
    }
    if (personalInfo.phone) html += `<div>Phone: ${e(personalInfo.phone)}</div>`;
    if (personalInfo.email) html += `<div>Email: ${e(personalInfo.email)}</div>`;
    if (personalInfo.githubUrl) html += `<div>GitHub: ${e(personalInfo.githubUrl)}</div>`;
    html += `</div>`;
    html += `</div>`;

    // Languages section if present
    const languagesSection = sections.find(s => s.type === 'languages' && shouldRender(s));
    if (languagesSection) {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">LANGUAGES</h2>`;
      html += `<hr class="resume-divider">`;
      languagesSection.items.filter(shouldRenderItem).forEach(item => {
        html += `<div class="resume-entry">`;
        if (item.language) {
          html += `<strong>${e(item.language)}</strong>`;
          if (item.proficiency) html += ` - ${e(item.proficiency)}`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Other sections
    sections.filter(s => shouldRender(s) && s.type !== 'languages').forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type).toUpperCase()}</h2>`;
      html += `<hr class="resume-divider">`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.jobTitle) html += `<div><strong>${e(item.jobTitle)}</strong></div>`;
          if (item.company) {
            html += `<div>${e(item.company)}`;
            if (item.location) html += `, ${e(item.location)}`;
            html += `</div>`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current);
          if (dateRange) html += `<div>${dateRange}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li>${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div><strong>${e(item.degree)}</strong>`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) html += `<div>${e(item.institution)}</div>`;
          if (item.graduationYear) html += `<div>${e(item.graduationYear)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div class="resume-skills-item">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          } else if (item.name) {
            html += e(item.name);
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          }
          if (item.description) {
            html += `<div>${e(item.description)}</div>`;
          }
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

export const atsTemplates = [
  atsEssential,
  atsClassic,
  atsModern,
  atsCompact,
  atsExecutive,
  atsTechnical,
  atsGraduate,
  atsFederal,
  atsAcademic,
  atsInternational
];
