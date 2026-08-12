/**
 * Professional Resume Templates
 * Modern professional templates with visual design elements
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
  // Add base styles so var() references work
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
 * 11. Professional Slate - Slate gray sidebar
 */
const professionalSlate = {
  id: 'professional-slate',
  name: 'Professional Slate',
  description: 'Slate gray sidebar with contact info. Clean modern two-column layout.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 2,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['business', 'consulting', 'finance'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Slate', accentColor: '#64748b', secondaryColor: '#f1f5f9', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template professional-slate two-column" data-template="professional-slate"${designVars(design)}>`;

    html += `<div class="resume-sidebar" style="background-color: var(--secondary-color, #f1f5f9); padding: 30px 20px;">`;

    // Photo if available
    html += renderPhoto(personalInfo, design);

    // Contact info in sidebar
    html += `<div class="resume-sidebar-section">`;
    html += `<h3 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--accent-color, #64748b);">CONTACT</h3>`;
    if (personalInfo.phone) html += `<div style="margin-bottom: 8px; font-size: 12px;">${e(personalInfo.phone)}</div>`;
    if (personalInfo.email) html += `<div style="margin-bottom: 8px; font-size: 12px; word-break: break-word;">${e(personalInfo.email)}</div>`;
    if (personalInfo.city && personalInfo.state) {
      html += `<div style="margin-bottom: 8px; font-size: 12px;">${e(personalInfo.city)}, ${e(personalInfo.state)}</div>`;
    }
    if (personalInfo.linkedin) html += `<div style="margin-bottom: 8px; font-size: 12px; word-break: break-word;">${e(personalInfo.linkedin)}</div>`;
    html += `</div>`;

    // Skills in sidebar
    const skillsSection = sections.find(s => s.type === 'skills' && shouldRender(s));
    if (skillsSection) {
      html += `<div class="resume-sidebar-section" style="margin-top: 24px;">`;
      html += `<h3 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--accent-color, #64748b);">SKILLS</h3>`;
      skillsSection.items.filter(shouldRenderItem).forEach(item => {
        if (item.category) {
          html += `<div style="margin-bottom: 12px;">`;
          html += `<div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">${e(item.category)}</div>`;
          if (item.skills && Array.isArray(item.skills)) {
            html += `<div style="font-size: 11px;">${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`;
          }
          html += `</div>`;
        }
      });
      html += `</div>`;
    }

    html += `</div>`; // End sidebar

    // Main content area
    html += `<div class="resume-main" style="padding: 30px;">`;

    // Header with name
    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="font-size: 32px; font-weight: 700; margin-bottom: 8px; color: var(--accent-color, #64748b);">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;

    // Main sections
    sections.filter(s => shouldRender(s) && s.type !== 'skills').forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 class="resume-section-title" style="font-size: 18px; font-weight: 700; color: var(--accent-color, #64748b); border-bottom: 2px solid var(--accent-color, #64748b); padding-bottom: 6px; margin-bottom: 16px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.6; margin-bottom: 12px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 20px;">`;
          if (item.jobTitle) {
            html += `<div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${e(item.jobTitle)}</div>`;
          }
          if (item.company) {
            html += `<div style="font-weight: 600; color: #666; margin-bottom: 2px;">${e(item.company)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dateRange) {
            html += `<div style="font-size: 13px; color: #888; margin-bottom: 8px;">${dateRange}</div>`;
          }
          if ((item.highlights || item.achievements) && (item.highlights || item.achievements).length > 0) {
            html += `<ul style="margin: 8px 0; padding-left: 20px;">`;
            (item.highlights || item.achievements || []).forEach(highlight => {
              { const ht = typeof highlight === 'string' ? highlight : (highlight?.text || ''); if (ht) html += `<li style="margin-bottom: 6px; line-height: 1.5;">${e(ht)}</li>`; }
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 16px;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="font-weight: 600; color: #666;">${e(item.institution)}</div>`;
          }
          if (item.graduationYear) {
            html += `<div style="font-size: 13px; color: #888;">${e(item.graduationYear)}</div>`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 12px;">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            html += `</div>`;
          }
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`; // End main
    html += `</div>`; // End template
    return html;
  }
};

/**
 * 12. Corporate Blue - Navy blue header band
 */
const corporateBlue = {
  id: 'corporate-blue',
  name: 'Corporate Blue',
  description: 'Navy blue header band with white body. Professional corporate aesthetic.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['finance', 'corporate', 'consulting', 'legal'],
  recommendedLevels: ['mid', 'senior', 'executive'],
  colorPresets: [
    { name: 'Navy', accentColor: '#1e3a8a', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template corporate-blue" data-template="corporate-blue"${designVars(design)}>`;

    // Header band
    html += `<div class="resume-header" style="background-color: var(--accent-color, #1e3a8a); color: white; padding: 40px 30px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="font-size: 36px; font-weight: 700; margin-bottom: 8px; color: white;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: rgba(255,255,255,0.85); margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    // Contact in header
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
      html += `<div style="font-size: 14px; color: rgba(255,255,255,0.85);">${contactParts.join(' • ')}</div>`;
    }
    html += `</div>`;

    // Body
    html += `<div style="padding: 30px;">`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 28px;">`;
      html += `<h2 class="resume-section-title" style="font-size: 20px; font-weight: 700; color: var(--accent-color, #1e3a8a); margin-bottom: 16px; text-transform: uppercase;">${e(section.title || section.type)}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 12px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 24px;">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">`;
          if (item.jobTitle) {
            html += `<div style="font-weight: 700; font-size: 16px;">${e(item.jobTitle)}</div>`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dateRange) {
            html += `<div style="font-size: 14px; color: #666;">${dateRange}</div>`;
          }
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600; color: #555; margin-bottom: 8px;">${e(item.company)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if ((item.highlights || item.achievements) && (item.highlights || item.achievements).length > 0) {
            html += `<ul style="margin: 0; padding-left: 20px;">`;
            (item.highlights || item.achievements || []).forEach(highlight => {
              { const ht = typeof highlight === 'string' ? highlight : (highlight?.text || ''); if (ht) html += `<li style="margin-bottom: 6px; line-height: 1.6;">${e(ht)}</li>`; }
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 16px;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700; font-size: 15px;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="font-weight: 600; color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) {
            html += `<div style="margin-top: 4px; font-style: italic;">${e(item.honors)}</div>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 10px;">`;
          if (item.category) {
            html += `<strong>${e(item.category)}:</strong> `;
          }
          if (item.skills && Array.isArray(item.skills)) {
            html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills));
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 12px;">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
          }
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
 * 13. Modern Navy - Left navy sidebar, two-column
 */
const modernNavy = {
  id: 'modern-navy',
  name: 'Modern Navy',
  description: 'Left navy sidebar with two-column layout. Modern and clean design.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 2,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'business', 'healthcare'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [
    { name: 'Navy', accentColor: '#1e40af', secondaryColor: '#1e40af', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template modern-navy two-column" data-template="modern-navy"${designVars(design)}>`;

    // Navy sidebar
    html += `<div class="resume-sidebar" style="background-color: var(--accent-color, #1e40af); color: white; padding: 30px 20px;">`;

    html += renderPhoto(personalInfo, design);

    html += `<div class="resume-sidebar-section">`;
    html += `<h3 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: white; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 6px;">CONTACT</h3>`;
    if (personalInfo.phone) html += `<div style="margin-bottom: 10px; font-size: 12px;">${e(personalInfo.phone)}</div>`;
    if (personalInfo.email) html += `<div style="margin-bottom: 10px; font-size: 12px; word-break: break-word;">${e(personalInfo.email)}</div>`;
    if (personalInfo.city && personalInfo.state) {
      html += `<div style="margin-bottom: 10px; font-size: 12px;">${e(personalInfo.city)}, ${e(personalInfo.state)}</div>`;
    }
    if (personalInfo.linkedin) html += `<div style="margin-bottom: 10px; font-size: 12px; word-break: break-word;">${e(personalInfo.linkedin)}</div>`;
    html += `</div>`;

    const skillsSection = sections.find(s => s.type === 'skills' && shouldRender(s));
    if (skillsSection) {
      html += `<div class="resume-sidebar-section" style="margin-top: 24px;">`;
      html += `<h3 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: white; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 6px;">SKILLS</h3>`;
      skillsSection.items.filter(shouldRenderItem).forEach(item => {
        if (item.category) {
          html += `<div style="margin-bottom: 14px;">`;
          html += `<div style="font-weight: 600; font-size: 12px; margin-bottom: 6px;">${e(item.category)}</div>`;
          if (item.skills && Array.isArray(item.skills)) {
            item.skills.forEach(skill => {
              html += `<div style="font-size: 11px; margin-bottom: 3px; padding-left: 8px;">• ${e(skill)}</div>`;
            });
          }
          html += `</div>`;
        }
      });
      html += `</div>`;
    }

    html += `</div>`;

    html += `<div class="resume-main" style="padding: 30px;">`;

    html += `<div class="resume-header">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="font-size: 34px; font-weight: 700; margin-bottom: 8px; color: var(--accent-color, #1e40af);">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;

    sections.filter(s => shouldRender(s) && s.type !== 'skills').forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 class="resume-section-title" style="font-size: 18px; font-weight: 700; color: var(--accent-color, #1e40af); margin-bottom: 14px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.6;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 20px;">`;
          if (item.jobTitle) {
            html += `<div style="font-weight: 700; font-size: 15px;">${e(item.jobTitle)}</div>`;
          }
          if (item.company) {
            html += `<div style="font-weight: 600; color: #555;">${e(item.company)}`;
            const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            if (dateRange) html += ` | ${dateRange}`;
            html += `</div>`;
          }
          if ((item.highlights || item.achievements) && (item.highlights || item.achievements).length > 0) {
            html += `<ul style="margin: 8px 0; padding-left: 20px;">`;
            (item.highlights || item.achievements || []).forEach(highlight => {
              { const ht = typeof highlight === 'string' ? highlight : (highlight?.text || ''); if (ht) html += `<li style="margin-bottom: 4px; line-height: 1.5;">${e(ht)}</li>`; }
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 14px;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 10px;">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
          }
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
 * 14-20: Additional Professional Templates (abbreviated versions)
 */

const elegantSerif = {
  id: 'elegant-serif',
  name: 'Elegant Serif',
  description: 'Serif font with elegant dividers. Refined and traditional.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['publishing', 'education', 'legal', 'arts'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Classic', accentColor: '#2c2c2c', textColor: '#1a1a1a' }],
  fontPresets: [{ name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template elegant-serif" data-template="elegant-serif"${designVars(design)}>`;

    html += `<div class="resume-header" style="text-align: center; border-bottom: 3px double #2c2c2c; padding-bottom: 20px; margin-bottom: 30px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 36px; font-weight: 400; letter-spacing: 2px; margin-bottom: 10px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contactParts = [];
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(e(location));
    }
    if (personalInfo.githubUrl) contactParts.push(e(personalInfo.githubUrl));
    if (contactParts.length > 0) {
      html += `<div style="font-size: 14px; color: #666;">${contactParts.join(' • ')}</div>`;
    }
    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 28px;">`;
      html += `<h2 style="font-size: 20px; font-weight: 600; border-bottom: 1px solid #2c2c2c; padding-bottom: 6px; margin-bottom: 16px;">${e(section.title || section.type)}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 20px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 16px; font-style: italic;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600;">${e(item.company)}`;
            const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            if (dateRange) html += ` | ${dateRange}`;
            html += `</div>`;
          }
          if ((item.highlights || item.achievements) && (item.highlights || item.achievements).length > 0) {
            html += `<ul style="margin-top: 8px;">`;
            (item.highlights || item.achievements).forEach(h => {
              const t = typeof h === 'string' ? h : (h && h.text ? h.text : '');
              if (t) html += `<li style="margin-bottom: 6px; line-height: 1.6;">${e(t)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 14px;">`;
          if (item.degree) html += `<div style="font-weight: 700; font-style: italic;">${e(item.degree)}</div>`;
          if (item.institution) html += `<div>${e(item.institution)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          if (item.category && item.skills) {
            html += `<div style="margin-bottom: 10px;"><strong>${e(item.category)}:</strong> ${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`;
          }
        });
      } else {
        items.forEach(item => {
          if (item.text || item.skills || item.title || item.name) {
            html += `<div style="margin-bottom: 8px;"><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          }
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

const cleanEmerald = {
  id: 'clean-emerald',
  name: 'Clean Emerald',
  description: 'Emerald green accents with clean sans-serif. Fresh and professional.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['healthcare', 'environmental', 'education', 'nonprofit'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [{ name: 'Emerald', accentColor: '#059669', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template clean-emerald" data-template="clean-emerald"${designVars(design)}>`;

    html += `<div class="resume-header" style="margin-bottom: 30px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 32px; font-weight: 700; color: var(--accent-color, #059669); margin-bottom: 8px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = [];
    if (personalInfo.email) contact.push(e(personalInfo.email));
    if (personalInfo.phone) contact.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contact.push(e(location));
    }
    if (personalInfo.githubUrl) contact.push(e(personalInfo.githubUrl));
    if (contact.length > 0) {
      html += `<div style="font-size: 14px; color: #666;">${contact.join(' | ')}</div>`;
    }
    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-bottom: 24px;">`;
      html += `<h2 style="font-size: 18px; font-weight: 700; color: var(--accent-color, #059669); border-left: 4px solid var(--accent-color, #059669); padding-left: 12px; margin-bottom: 14px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 18px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            html += `<div style="color: #555;">${e(item.company)}`;
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            if (dr) html += ` | ${dr}`;
            html += `</div>`;
          }
          if ((item.highlights || item.achievements) && (item.highlights || item.achievements).length > 0) {
            html += `<ul>`;
            (item.highlights || item.achievements).forEach(h => { const t = typeof h === 'string' ? h : (h && h.text ? h.text : ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          if (item.category && item.skills) {
            html += `<div style="margin-bottom: 8px;"><strong>${e(item.category)}:</strong> ${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`;
          }
        });
      } else {
        items.forEach(item => {
          if (item.degree || item.title || item.name) {
            html += `<div style="margin-bottom: 10px;"><strong>${e(item.degree || item.title || item.name)}</strong></div>`;
          }
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

const executiveCharcoal = {
  id: 'executive-charcoal',
  name: 'Executive Charcoal',
  description: 'Charcoal and gold accents with generous spacing. Executive gravitas.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'low',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['executive', 'finance', 'consulting'],
  recommendedLevels: ['senior', 'executive'],
  colorPresets: [{ name: 'Charcoal', accentColor: '#374151', secondaryColor: '#d97706' }],
  fontPresets: [{ name: 'Georgia', fontFamily: 'Georgia, serif' }],
  spacingPresets: [{ name: 'Executive', sectionSpacing: 32, paragraphSpacing: 14 }],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-charcoal" data-template="executive-charcoal"${designVars(design)}>`;

    html += `<div style="text-align: center; margin-bottom: 40px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 38px; font-weight: 700; color: var(--accent-color, #374151); margin-bottom: 6px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = [];
    if (personalInfo.email) contact.push(e(personalInfo.email));
    if (personalInfo.phone) contact.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contact.push(e(location));
    }
    if (personalInfo.githubUrl) contact.push(e(personalInfo.githubUrl));
    if (contact.length > 0) {
      html += `<div style="font-size: 14px; color: #666;">${contact.join(' • ')}</div>`;
    }
    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-bottom: 32px;">`;
      html += `<h2 style="font-size: 20px; font-weight: 700; color: var(--accent-color, #374151); border-bottom: 2px solid var(--secondary-color, #d97706); padding-bottom: 8px; margin-bottom: 20px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 24px;">`;
          if (item.jobTitle) html += `<div style="font-size: 17px; font-weight: 700;">${e(item.jobTitle)}</div>`;
          if (item.company) html += `<div style="font-style: italic; color: #555; margin-bottom: 8px;">${e(item.company)}</div>`;
          if ((item.highlights || item.achievements) && (item.highlights || item.achievements).length > 0) {
            html += `<ul>`;
            (item.highlights || item.achievements).forEach(h => { const t = typeof h === 'string' ? h : (h && h.text ? h.text : ''); if (t) html += `<li style="line-height: 1.7; margin-bottom: 8px;">${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div style="margin-bottom: 12px;">`;
          if (item.degree || item.title) html += `<strong>${e(item.degree || item.title)}</strong>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// Remaining templates (minimal versions for space)
const minimalSand = {
  id: 'minimal-sand',
  name: 'Minimal Sand',
  description: 'Warm sand/beige tones with minimal decoration and lots of whitespace.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Sand', accentColor: '#92400e', textColor: '#1c1917' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, sans-serif' }],
  spacingPresets: [],
  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template minimal-sand" data-template="minimal-sand"${designVars(design)}>`;
    html += `<div style="margin-bottom: 30px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 30px; color: var(--accent-color, #92400e);">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    html += `</div>`;
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-bottom: 24px;"><h2 style="font-size: 16px; color: var(--accent-color, #92400e);">${e(section.title || section.type)}</h2>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 12px;">`;
        if (item.jobTitle || item.degree) html += `<strong>${e(item.jobTitle || item.degree)}</strong>`;
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

const precisionGray = {
  id: 'precision-gray',
  name: 'Precision Gray',
  description: 'Cool grays with precise alignment. Grid-based, no decoration.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'engineering', 'architecture'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Gray', accentColor: '#4b5563', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, sans-serif' }],
  spacingPresets: [],
  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template precision-gray" data-template="precision-gray"${designVars(design)}>`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 28px; color: var(--accent-color, #4b5563);">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-top: 20px;"><h2 style="font-size: 16px; color: var(--accent-color, #4b5563); border-bottom: 1px solid #d1d5db;">${e(section.title || section.type)}</h2>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin: 10px 0;">`;
        if (item.jobTitle || item.degree) html += `<strong>${e(item.jobTitle || item.degree)}</strong>`;
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

const leadershipBurgundy = {
  id: 'leadership-burgundy',
  name: 'Leadership Burgundy',
  description: 'Burgundy accents with leadership/executive feel. Summary prominent.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['executive', 'nonprofit', 'education'],
  recommendedLevels: ['senior', 'executive'],
  colorPresets: [{ name: 'Burgundy', accentColor: '#991b1b', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Georgia', fontFamily: 'Georgia, serif' }],
  spacingPresets: [],
  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template leadership-burgundy" data-template="leadership-burgundy"${designVars(design)}>`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 32px; color: var(--accent-color, #991b1b);">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-top: 24px;"><h2 style="font-size: 18px; color: var(--accent-color, #991b1b); border-bottom: 2px solid var(--accent-color, #991b1b); padding-bottom: 4px; margin-bottom: 12px;">${e(section.title || section.type)}</h2>`;
      const st = getSectionType(section);
      if (section.content) html += `<p style="margin-bottom: 12px; color: #333;">${e(section.content)}</p>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 14px;">`;
        if (st === 'experience') {
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px; color: #1f2937;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.currentlyWorking || item.current);
            html += `<div style="font-size: 11px; color: #666; margin-bottom: 4px;">${e(item.company)}${dr ? ` | ${dr}` : ''}</div>`;
          }
          if (item.responsibilities) html += `<p style="font-size: 11px; color: #444; margin: 4px 0;">${e(item.responsibilities)}</p>`;
          if (item.achievements && item.achievements.length > 0) {
            html += `<ul style="margin: 4px 0; padding-left: 16px;">`;
            item.achievements.forEach(a => { const t = typeof a === 'string' ? a : (a && a.text ? a.text : ''); if (t) html += `<li style="font-size: 11px; color: #333; margin-bottom: 3px;">${e(t)}</li>`; });
            html += `</ul>`;
          }
        } else if (st === 'education') {
          if (item.degree) html += `<div style="font-weight: 700; font-size: 13px; color: #1f2937;">${e(item.degree)}</div>`;
          if (item.institution) html += `<div style="font-size: 11px; color: #666;">${e(item.institution)}</div>`;
          if (item.description) html += `<p style="font-size: 11px; color: #444; margin: 4px 0;">${e(item.description)}</p>`;
        } else if (st === 'skills') {
          if (item.category) html += `<strong style="color: var(--accent-color, #991b1b);">${e(item.category)}:</strong> `;
          if (item.name) html += `<span style="font-size: 11px; color: #333;">${e(item.name)}</span>`;
        } else if (st === 'certifications') {
          if (item.name) html += `<div style="font-size: 12px; color: #333;">${e(item.name)}${item.issuingOrganization ? ` — ${e(item.issuingOrganization)}` : ''}</div>`;
        } else {
          if (item.name || item.text) html += `<div style="font-size: 12px; color: #333;">${e(item.name || item.text || '')}</div>`;
          if (item.description) html += `<p style="font-size: 11px; color: #444; margin: 2px 0;">${e(item.description)}</p>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

const consultantClassic = {
  id: 'consultant-classic',
  name: 'Consultant Classic',
  description: 'Clean and versatile. Adaptable to any industry. Professional neutral.',
  category: 'professional',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [{ name: 'Neutral', accentColor: '#374151', textColor: '#111827' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, sans-serif' }],
  spacingPresets: [],
  render: (data, design = {}) => {
    const { personalInfo, sections = [] } = data;
    let html = `<div class="resume-template consultant-classic" data-template="consultant-classic"${designVars(design)}>`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) html += `<h1 style="font-size: 30px; color: var(--accent-color, #374151);">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-top: 22px;"><h2 style="font-size: 17px; color: var(--accent-color, #374151); border-bottom: 2px solid var(--accent-color, #374151); padding-bottom: 4px; margin-bottom: 12px;">${e(section.title || section.type)}</h2>`;
      const st = getSectionType(section);
      if (section.content) html += `<p style="margin-bottom: 12px; color: #333;">${e(section.content)}</p>`;
      section.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 14px;">`;
        if (st === 'experience') {
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px; color: #111827;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.currentlyWorking || item.current);
            html += `<div style="font-size: 11px; color: #666; margin-bottom: 4px;">${e(item.company)}${dr ? ` | ${dr}` : ''}</div>`;
          }
          if (item.responsibilities) html += `<p style="font-size: 11px; color: #444; margin: 4px 0;">${e(item.responsibilities)}</p>`;
          if (item.achievements && item.achievements.length > 0) {
            html += `<ul style="margin: 4px 0; padding-left: 16px;">`;
            item.achievements.forEach(a => { const t = typeof a === 'string' ? a : (a && a.text ? a.text : ''); if (t) html += `<li style="font-size: 11px; color: #333; margin-bottom: 3px;">${e(t)}</li>`; });
            html += `</ul>`;
          }
        } else if (st === 'education') {
          if (item.degree) html += `<div style="font-weight: 700; font-size: 13px; color: #111827;">${e(item.degree)}</div>`;
          if (item.institution) html += `<div style="font-size: 11px; color: #666;">${e(item.institution)}</div>`;
          if (item.description) html += `<p style="font-size: 11px; color: #444; margin: 4px 0;">${e(item.description)}</p>`;
        } else if (st === 'skills') {
          if (item.category) html += `<strong style="color: var(--accent-color, #374151);">${e(item.category)}:</strong> `;
          if (item.name) html += `<span style="font-size: 11px; color: #333;">${e(item.name)}</span>`;
        } else if (st === 'certifications') {
          if (item.name) html += `<div style="font-size: 12px; color: #333;">${e(item.name)}${item.issuingOrganization ? ` — ${e(item.issuingOrganization)}` : ''}</div>`;
        } else {
          if (item.name || item.text) html += `<div style="font-size: 12px; color: #333;">${e(item.name || item.text || '')}</div>`;
          if (item.description) html += `<p style="font-size: 11px; color: #444; margin: 2px 0;">${e(item.description)}</p>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }
};

export const professionalTemplates = [
  professionalSlate,
  corporateBlue,
  modernNavy,
  elegantSerif,
  cleanEmerald,
  executiveCharcoal,
  minimalSand,
  precisionGray,
  leadershipBurgundy,
  consultantClassic
];
