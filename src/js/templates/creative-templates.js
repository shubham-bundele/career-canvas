/**
 * Creative Resume Templates
 * Visually distinctive templates for creative professionals
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

const renderPhoto = (personalInfo, design = {}) => {
  const src = personalInfo.photograph || personalInfo.photo;
  if (!src) return '';
  if (typeof src !== 'string' || (!src.startsWith('data:image/') && !src.startsWith('blob:'))) return '';
  const size = design.photoSize || 120;
  const shape = design.photoShape || 'circle';
  const radius = shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0';
  return `<div class="resume-photo" style="margin-bottom: 16px; text-align: center;">` +
    `<img src="${src}" alt="Profile photo" style="width:${size}px;height:${size}px;border-radius:${radius};object-fit:cover;display:inline-block;">` +
    `</div>`;
};

/**
 * 26. Creative Portfolio - Large header with photo, portfolio section
 */
const creativePortfolio = {
  id: 'creative-portfolio',
  name: 'Creative Portfolio',
  description: 'Large header with photo option and portfolio section. Visual hierarchy.',
  category: 'creative',
  docTypes: ['resume'],
  atsLevel: 'low',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['design', 'creative', 'marketing', 'media'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [
    { name: 'Creative', accentColor: '#ec4899', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template creative-portfolio" data-template="creative-portfolio"${designVars(design)}>`;

    html += `<div class="resume-header" style="background: linear-gradient(135deg, var(--accent-color, #ec4899) 0%, var(--secondary-color, #a855f7) 100%); color: white; padding: 40px 30px; margin-bottom: 30px;">`;

    html += renderPhoto(personalInfo, design);

    html += `<div style="text-align: center;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 40px; font-weight: 700; margin-bottom: 10px; color: white;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: rgba(255,255,255,0.85); margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    const contact = [];
    if (personalInfo.email) contact.push(e(personalInfo.email));
    if (personalInfo.phone) contact.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contact.push(e(location));
    }
    if (personalInfo.personalWebsite || personalInfo.website) contact.push(e(personalInfo.personalWebsite || personalInfo.website));
    if (personalInfo.githubUrl) contact.push(e(personalInfo.githubUrl));
    if (contact.length > 0) {
      html += `<div style="font-size: 15px; color: rgba(255,255,255,0.9);">${contact.join(' • ')}</div>`;
    }
    html += `</div>`;
    html += `</div>`;

    html += `<div style="padding: 0 30px;">`;
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-bottom: 28px;">`;
      html += `<h2 style="font-size: 24px; font-weight: 700; color: var(--accent-color, #ec4899); margin-bottom: 16px;">${e(section.title || section.type)}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 20px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 17px;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            html += `<div style="color: #666;">${e(item.company)}${dr ? ` | ${dr}` : ''}</div>`;
          }
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul>`;
            item.highlights.forEach(h => { if (h) html += `<li style="line-height: 1.6;">${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          if (item.category && item.skills) {
            html += `<div style="margin-bottom: 12px;"><strong style="color: var(--accent-color, #ec4899);">${e(item.category)}:</strong> ${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`;
          }
        });
      } else {
        items.forEach(item => {
          html += `<div style="margin-bottom: 12px;">`;
          if (item.degree || item.title || item.name) html += `<strong>${e(item.degree || item.title || item.name)}</strong>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });
    html += `</div>`;

    html += `</div>`;
    return html;
  }
};

/**
 * 27. Designer Grid - Grid-based asymmetric layout
 */
const designerGrid = {
  id: 'designer-grid',
  name: 'Designer Grid',
  description: 'Grid-based asymmetric layout with visual design principles.',
  category: 'creative',
  docTypes: ['resume'],
  atsLevel: 'low',
  columnCount: 2,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['design', 'creative', 'ux-ui'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Designer', accentColor: '#f59e0b', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template designer-grid two-column" data-template="designer-grid"${designVars(design)}>`;

    html += `<div class="resume-sidebar" style="background-color: #fef3c7; padding: 30px 20px;">`;
    html += renderPhoto(personalInfo, design);

    html += `<h3 style="font-size: 14px; font-weight: 700; color: var(--accent-color, #f59e0b); margin-bottom: 10px;">CONTACT</h3>`;
    if (personalInfo.email) html += `<div style="font-size: 12px; margin-bottom: 6px;">${e(personalInfo.email)}</div>`;
    if (personalInfo.phone) html += `<div style="font-size: 12px; margin-bottom: 6px;">${e(personalInfo.phone)}</div>`;

    const skillsSection = sections.find(s => s.type === 'skills' && shouldRender(s));
    if (skillsSection) {
      html += `<h3 style="font-size: 14px; font-weight: 700; color: var(--accent-color, #f59e0b); margin-top: 20px; margin-bottom: 10px;">SKILLS</h3>`;
      skillsSection.items.filter(shouldRenderItem).forEach(item => {
        if (item.skills) {
          item.skills.forEach(skill => {
            html += `<div style="font-size: 12px; margin-bottom: 4px;">• ${e(skill)}</div>`;
          });
        }
      });
    }

    html += `</div>`;

    html += `<div class="resume-main" style="padding: 30px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 36px; font-weight: 700; color: var(--accent-color, #f59e0b); margin-bottom: 20px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    sections.filter(s => shouldRender(s) && s.type !== 'skills').forEach(section => {
      html += `<div style="margin-bottom: 24px;">`;
      html += `<h2 style="font-size: 20px; font-weight: 700; color: var(--accent-color, #f59e0b); margin-bottom: 12px;">${e(section.title || section.type)}</h2>`;

      section.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 14px;">`;
        if (item.jobTitle || item.degree) html += `<div style="font-weight: 700;">${e(item.jobTitle || item.degree)}</div>`;
        if (item.company || item.institution) html += `<div style="color: #666;">${e(item.company || item.institution)}</div>`;
        html += `</div>`;
      });

      html += `</div>`;
    });
    html += `</div>`;

    html += `</div>`;
    return html;
  }
};

/**
 * 28-30: Additional creative templates (minimal versions)
 */

const editorialModern = {
  id: 'editorial-modern',
  name: 'Editorial Modern',
  description: 'Magazine-inspired with editorial typography and pull quotes.',
  category: 'creative',
  docTypes: ['resume'],
  atsLevel: 'low',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['media', 'journalism', 'publishing'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Editorial', accentColor: '#0891b2', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Georgia', fontFamily: 'Georgia, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template editorial-modern" data-template="editorial-modern"${designVars(design)}>`;
    html += `<div class="resume-header" style="margin-bottom: 24px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 42px; font-weight: 300; color: var(--accent-color, #0891b2);">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-top: 24px;"><h2 style="font-size: 22px; font-weight: 600; color: var(--accent-color, #0891b2);">${e(section.title || section.type)}</h2>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        if (item.jobTitle || item.degree) html += `<div style="margin: 12px 0; font-size: 16px;"><strong>${e(item.jobTitle || item.degree)}</strong></div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

const boldContemporary = {
  id: 'bold-contemporary',
  name: 'Bold Contemporary',
  description: 'Bold typography with large section headings. Contemporary design.',
  category: 'creative',
  docTypes: ['resume'],
  atsLevel: 'low',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['advertising', 'marketing', 'creative'],
  recommendedLevels: ['entry', 'mid'],
  colorPresets: [{ name: 'Bold', accentColor: '#dc2626', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template bold-contemporary" data-template="bold-contemporary"${designVars(design)}>`;
    html += `<div class="resume-header" style="margin-bottom: 24px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 48px; font-weight: 900; color: var(--accent-color, #dc2626); line-height: 1;">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-top: 28px;"><h2 style="font-size: 28px; font-weight: 900; color: var(--accent-color, #dc2626);">${e(section.title || section.type).toUpperCase()}</h2>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        if (item.jobTitle || item.degree) html += `<div style="margin: 10px 0; font-weight: 700;">${e(item.jobTitle || item.degree)}</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

const studioMinimal = {
  id: 'studio-minimal',
  name: 'Studio Minimal',
  description: 'Ultra-minimal with lots of whitespace. Refined typography and artistic restraint.',
  category: 'creative',
  docTypes: ['resume'],
  atsLevel: 'low',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['design', 'architecture', 'photography'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Minimal', accentColor: '#000000', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif' }],
  spacingPresets: [{ name: 'Spacious', sectionSpacing: 40, paragraphSpacing: 16 }],

  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template studio-minimal" data-template="studio-minimal"${designVars(design)}>`;
    html += `<div class="resume-header" style="margin-bottom: 60px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 36px; font-weight: 300; letter-spacing: 3px; color: var(--accent-color, #000);">${e(personalInfo.fullName).toUpperCase()}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-bottom: 40px;"><h2 style="font-size: 14px; font-weight: 600; letter-spacing: 2px; margin-bottom: 20px; color: var(--accent-color, #000);">${e(section.title || section.type).toUpperCase()}</h2>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 16px; font-size: 14px;">`;
        if (item.jobTitle || item.degree) html += `${e(item.jobTitle || item.degree)}`;
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

export const creativeTemplates = [
  creativePortfolio,
  designerGrid,
  editorialModern,
  boldContemporary,
  studioMinimal
];
