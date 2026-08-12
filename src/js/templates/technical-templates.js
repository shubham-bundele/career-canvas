/**
 * Technical Resume Templates
 * Templates optimized for technical professionals, developers, and engineers
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
  const size = design.photoSize || 100;
  const shape = design.photoShape || 'circle';
  const radius = shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0';
  return '<div class="resume-photo" style="margin-bottom: 16px; text-align: center;">' +
    '<img src="' + src + '" alt="Profile photo" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + radius + ';object-fit:cover;display:inline-block;">' +
    '</div>';
};

/**
 * 21. Developer Mono - Code-inspired with monospace elements
 */
const developerMono = {
  id: 'developer-mono',
  name: 'Developer Mono',
  description: 'Code-inspired design with monospace name and technical skills matrix.',
  category: 'technical',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'software-development', 'engineering'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [
    { name: 'Terminal', accentColor: '#10b981', textColor: '#1f2937', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Mono Mix', fontFamily: 'Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template developer-mono" data-template="developer-mono"${designVars(design)}>`;

    // Header with monospace name
    html += `<div class="resume-header" style="margin-bottom: 24px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: var(--accent-color, #10b981); margin-bottom: 8px;">$ ${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 12px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 10.5px; color: #555; margin-bottom: 6px; font-style: italic;">${e(personalInfo.resumeHeadline)}</div>`;
    }

    // Contact info with code-style separators
    const contactParts = [];
    if (personalInfo.email) contactParts.push(`email: "${e(personalInfo.email)}"`);
    if (personalInfo.phone) contactParts.push(`phone: "${e(personalInfo.phone)}"`);
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contactParts.push(`location: "${e(location)}"`);
    }
    if (personalInfo.githubUrl || personalInfo.github) contactParts.push(`github: "${e(personalInfo.githubUrl || personalInfo.github)}"`);
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(`linkedin: "${e(personalInfo.linkedinUrl || personalInfo.linkedin)}"`);
    if (personalInfo.personalWebsite || personalInfo.website) contactParts.push(`website: "${e(personalInfo.personalWebsite || personalInfo.website)}"`);

    if (contactParts.length > 0) {
      html += `<div class="resume-contact" style="font-family: 'Courier New', monospace; font-size: 12px; color: #666;">`;
      html += `{ ${contactParts.join(', ')} }`;
      html += `</div>`;
    }
    html += `</div>`;

    // Technical skills section first
    const skillsSection = sections.find(s => s.type === 'skills' && shouldRender(s));
    if (skillsSection) {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 class="resume-section-title" style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: var(--accent-color, #10b981); margin-bottom: 12px;">> TECHNICAL_SKILLS</h2>`;

      html += `<div style="border: 1px solid #e5e7eb; padding: 12px; background-color: #f9fafb;">`;
      skillsSection.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 8px;">`;
        if (item.category) {
          html += `<span style="font-family: 'Courier New', monospace; font-weight: 700; color: var(--accent-color, #10b981);">${e(item.category)}:</span> `;
        }
        if (item.skills && Array.isArray(item.skills)) {
          html += `<span style="font-family: 'Courier New', monospace; font-size: 13px;">${e(item.skills.join(' | '))}</span>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
      html += `</div>`;
    }

    // Other sections
    sections.filter(s => shouldRender(s) && s.type !== 'skills').forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 class="resume-section-title" style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: var(--accent-color, #10b981); margin-bottom: 12px;">> ${e(section.title || section.type).toUpperCase().replace(/ /g, '_')}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary') {
        items.forEach(item => {
          if (item.content) {
            html += `<div style="line-height: 1.6; margin-bottom: 12px;">${e(item.content)}</div>`;
          }
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 20px;">`;
          html += `<div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">`;
          if (item.jobTitle) {
            html += `<span style="color: var(--accent-color, #10b981);">function</span> ${e(item.jobTitle)}()`;
          }
          html += `</div>`;

          if (item.company || item.location) {
            html += `<div style="font-size: 14px; color: #666; margin-bottom: 2px;">`;
            if (item.company) html += `<span style="font-family: 'Courier New', monospace;">${e(item.company)}</span>`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }

          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dateRange) {
            html += `<div style="font-size: 13px; color: #888; margin-bottom: 8px;">${dateRange}</div>`;
          }

          if (item.highlights && item.highlights.length > 0) {
            html += `<ul style="margin: 0; padding-left: 20px;">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li style="margin-bottom: 4px; line-height: 1.5;">${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 14px;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700; font-size: 14px;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.gpa) {
            html += `<div style="font-size: 13px;">GPA: ${e(item.gpa)}</div>`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 10px;">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization) html += ` - ${e(item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) {
            html += `<div style="font-size: 13px; margin-top: 4px;">${e(item.description)}</div>`;
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
 * 22. Engineering Blueprint - Blueprint-inspired with grid feel
 */
const engineeringBlueprint = {
  id: 'engineering-blueprint',
  name: 'Engineering Blueprint',
  description: 'Blueprint-inspired design with subtle grid. Technical and precise.',
  category: 'technical',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['engineering', 'architecture', 'manufacturing'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Blueprint', accentColor: '#1e40af', textColor: '#1f2937', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template engineering-blueprint" data-template="engineering-blueprint"${designVars(design)}>`;

    // Header
    html += `<div class="resume-header" style="border: 2px solid var(--accent-color, #1e40af); padding: 20px; margin-bottom: 24px; background-color: #f8fafc;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name" style="font-size: 30px; font-weight: 700; color: var(--accent-color, #1e40af); margin-bottom: 8px; letter-spacing: 1px;">${e(personalInfo.fullName)}</h1>`;
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
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contactParts.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));

    if (contactParts.length > 0) {
      html += `<div style="font-size: 13px; color: #64748b;">${contactParts.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 class="resume-section-title" style="font-size: 16px; font-weight: 700; color: var(--accent-color, #1e40af); text-transform: uppercase; border-bottom: 2px solid var(--accent-color, #1e40af); padding-bottom: 4px; margin-bottom: 14px; letter-spacing: 1px;">${e(section.title || section.type)}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'summary') {
        items.forEach(item => {
          if (item.content) {
            html += `<div style="line-height: 1.6; padding: 12px; border-left: 3px solid var(--accent-color, #1e40af); background-color: #f8fafc;">${e(item.content)}</div>`;
          }
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 20px; padding-left: 12px; border-left: 2px solid #cbd5e1;">`;

          html += `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">`;
          if (item.jobTitle) {
            html += `<div style="font-weight: 700; font-size: 15px; color: var(--accent-color, #1e40af);">${e(item.jobTitle)}</div>`;
          }
          const dateRange = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dateRange) {
            html += `<div style="font-size: 13px; color: #64748b; font-family: 'Courier New', monospace;">${dateRange}</div>`;
          }
          html += `</div>`;

          if (item.company) {
            html += `<div style="font-weight: 600; color: #475569; margin-bottom: 8px;">${e(item.company)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }

          if (item.highlights && item.highlights.length > 0) {
            html += `<ul style="margin: 0; padding-left: 20px;">`;
            item.highlights.forEach(highlight => {
              if (highlight) html += `<li style="margin-bottom: 5px; line-height: 1.5;">${e(highlight)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 14px; padding-left: 12px;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700; color: var(--accent-color, #1e40af);">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="font-weight: 600; color: #475569;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">`;
        items.forEach(item => {
          if (item.category) {
            html += `<div style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc;">`;
            html += `<div style="font-weight: 700; font-size: 13px; color: var(--accent-color, #1e40af); margin-bottom: 4px;">${e(item.category)}</div>`;
            if (item.skills && Array.isArray(item.skills)) {
              html += `<div style="font-size: 12px;">${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`;
            }
            html += `</div>`;
          }
        });
        html += `</div>`;
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry" style="margin-bottom: 10px;">`;
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

    html += `</div>`;
    return html;
  }
};

/**
 * 23. Data Professional - Skills and metrics focused
 */
const dataProfessional = {
  id: 'data-professional',
  name: 'Data Professional',
  description: 'Data-focused layout with skills and metrics prominent. Clean modern design.',
  category: 'technical',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['data-science', 'analytics', 'business-intelligence'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [
    { name: 'Data Blue', accentColor: '#0891b2', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template data-professional" data-template="data-professional"${designVars(design)}>`;

    html += `<div class="resume-header" style="margin-bottom: 24px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 32px; font-weight: 700; color: var(--accent-color, #0891b2); margin-bottom: 6px;">${e(personalInfo.fullName)}</h1>`;
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
    if (personalInfo.linkedinUrl || personalInfo.linkedin) contact.push(e(personalInfo.linkedinUrl || personalInfo.linkedin));
    if (personalInfo.githubUrl) contact.push(e(personalInfo.githubUrl));
    if (contact.length > 0) {
      html += `<div style="font-size: 14px; color: #64748b;">${contact.join(' • ')}</div>`;
    }
    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section" style="margin-bottom: 24px;">`;
      html += `<h2 style="font-size: 18px; font-weight: 700; color: var(--accent-color, #0891b2); border-bottom: 3px solid var(--accent-color, #0891b2); padding-bottom: 6px; margin-bottom: 14px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 20px;">`;
          if (item.jobTitle) {
            html += `<div style="font-weight: 700; font-size: 16px;">${e(item.jobTitle)}</div>`;
          }
          if (item.company) {
            html += `<div style="font-weight: 600; color: #555;">${e(item.company)}`;
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            if (dr) html += ` | ${dr}`;
            html += `</div>`;
          }
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul>`;
            item.highlights.forEach(h => {
              if (h) html += `<li style="line-height: 1.5; margin-bottom: 4px;">${e(h)}</li>`;
            });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          if (item.category && item.skills) {
            html += `<div style="margin-bottom: 12px;">`;
            html += `<div style="font-weight: 700; color: var(--accent-color, #0891b2); margin-bottom: 4px;">${e(item.category)}</div>`;
            html += `<div style="padding-left: 12px;">${e(item.skills.join(' • '))}</div>`;
            html += `</div>`;
          }
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 12px;">`;
          if (item.degree) html += `<div style="font-weight: 700;">${e(item.degree)}</div>`;
          if (item.institution) html += `<div style="color: #555;">${e(item.institution)}</div>`;
          html += `</div>`;
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

/**
 * 24. Product Builder - Product management focused
 */
const productBuilder = {
  id: 'product-builder',
  name: 'Product Builder',
  description: 'Product management focused with impact metrics prominent. Clean modern design.',
  category: 'technical',
  docTypes: ['resume'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'product-management'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Product', accentColor: '#7c3aed', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template product-builder" data-template="product-builder"${designVars(design)}>`;

    html += `<div style="margin-bottom: 24px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 32px; font-weight: 700; color: var(--accent-color, #7c3aed);">${e(personalInfo.fullName)}</h1>`;
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
      html += `<div style="font-size: 14px;">${contact.join(' | ')}</div>`;
    }
    html += `</div>`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div style="margin-bottom: 24px;">`;
      html += `<h2 style="font-size: 18px; font-weight: 700; color: var(--accent-color, #7c3aed); margin-bottom: 12px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 18px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 15px;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            html += `<div style="color: #555;">${e(item.company)}${dr ? ` | ${dr}` : ''}</div>`;
          }
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul>`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
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

/**
 * 25. Cybersecurity Clean - Security-focused with certifications prominent
 */
const cybersecurityClean = {
  id: 'cybersecurity-clean',
  name: 'Cybersecurity Clean',
  description: 'No-nonsense security-focused layout with certifications and skills prominent.',
  category: 'technical',
  docTypes: ['resume'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['cybersecurity', 'information-security'],
  recommendedLevels: ['mid', 'senior'],
  colorPresets: [
    { name: 'Security', accentColor: '#dc2626', textColor: '#1f2937' }
  ],
  fontPresets: [
    { name: 'Arial', fontFamily: 'Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template cybersecurity-clean" data-template="cybersecurity-clean"${designVars(design)}>`;

    html += `<div style="margin-bottom: 24px;">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 30px; font-weight: 700; color: var(--accent-color, #dc2626);">${e(personalInfo.fullName)}</h1>`;
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

    // Certifications first if present
    const certSection = sections.find(s => s.type === 'certifications' && shouldRender(s));
    if (certSection) {
      html += `<div style="margin-bottom: 24px;">`;
      html += `<h2 style="font-size: 16px; font-weight: 700; color: var(--accent-color, #dc2626); border-bottom: 2px solid var(--accent-color, #dc2626); padding-bottom: 4px; margin-bottom: 12px;">CERTIFICATIONS</h2>`;
      certSection.items.filter(shouldRenderItem).forEach(item => {
        html += `<div style="margin-bottom: 8px;">`;
        if (item.name) html += `<strong>${e(item.name)}</strong>`;
        if (item.issuer) html += ` - ${e(item.issuer)}`;
        if (item.date) html += ` (${e(item.date)})`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    sections.filter(s => shouldRender(s) && s.type !== 'certifications').forEach(section => {
      html += `<div style="margin-bottom: 24px;">`;
      html += `<h2 style="font-size: 16px; font-weight: 700; color: var(--accent-color, #dc2626); border-bottom: 2px solid var(--accent-color, #dc2626); padding-bottom: 4px; margin-bottom: 12px;">${e(section.title || section.type).toUpperCase()}</h2>`;

      const items = section.items.filter(shouldRenderItem);

      if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 18px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            html += `<div style="color: #555;">${e(item.company)}${dr ? ` | ${dr}` : ''}</div>`;
          }
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul>`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
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
          if (item.degree || item.title || item.name) {
            html += `<div style="margin-bottom: 8px;"><strong>${e(item.degree || item.title || item.name)}</strong></div>`;
          }
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

export const technicalTemplates = [
  developerMono,
  engineeringBlueprint,
  dataProfessional,
  productBuilder,
  cybersecurityClean
];
