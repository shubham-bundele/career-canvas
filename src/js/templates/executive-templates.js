/**
 * Executive Resume Templates
 * Premium templates designed for senior executives, directors, VPs, and C-suite professionals
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
  const base = 'font-family: var(--font-family, Georgia, serif); font-size: var(--font-size, 11px); line-height: var(--line-height, 1.5); color: var(--text-color, #222)';
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
  return `<div class="resume-photo" style="margin-bottom: 16px;">` +
    `<img src="${src}" alt="Profile photo" style="width:${size}px;height:${size}px;border-radius:${radius};object-fit:cover;">` +
    `</div>`;
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
  if (personalInfo.personalWebsite || personalInfo.website) parts.push(e(personalInfo.personalWebsite || personalInfo.website));
  return parts;
};

// ---------------------------------------------------------------------------
// 1. Executive Prestige - Premium serif layout with subtle gold accents
// ---------------------------------------------------------------------------
const executivePrestige = {
  id: 'executive-prestige',
  name: 'Executive Prestige',
  description: 'Premium serif layout with subtle gold accents. Refined elegance for top-tier leaders.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['finance', 'consulting', 'corporate', 'legal'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Gold', accentColor: '#8B7355', secondaryColor: '#F5F0EB', backgroundColor: '#ffffff' },
    { name: 'Platinum', accentColor: '#5C6370', secondaryColor: '#F0F2F5', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' },
    { name: 'Garamond', fontFamily: 'Garamond, Georgia, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-prestige" data-template="executive-prestige"${designVars(design)}>
    <style>
      .executive-prestige { padding: 40px 44px; }
      .executive-prestige .resume-header { text-align: center; padding-bottom: 20px; margin-bottom: var(--section-spacing, 28px); border-bottom: 2px solid var(--accent-color, #8B7355); }
      .executive-prestige .resume-name { font-size: var(--name-size, 30px); font-weight: 400; letter-spacing: 3px; text-transform: uppercase; color: var(--accent-color, #8B7355); margin-bottom: 8px; }
      .executive-prestige .resume-contact { font-size: 10px; color: #666; letter-spacing: 1px; margin-top: 10px; }
      .executive-prestige .resume-section { margin-bottom: var(--section-spacing, 26px); }
      .executive-prestige .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 400; text-transform: uppercase; letter-spacing: 2px; color: var(--accent-color, #8B7355); border-bottom: 1px solid var(--accent-color, #8B7355); padding-bottom: 6px; margin-bottom: 16px; }
      .executive-prestige .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-prestige .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
      .executive-prestige .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-prestige .resume-bullets li { margin-bottom: 4px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #555; margin-bottom: 4px; letter-spacing: 1px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #666; font-style: italic; margin-bottom: 6px;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px;">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #777;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-style: italic; color: #555; margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += ` | ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 6px;">`;
          if (item.category) html += `<strong style="color: var(--accent-color, #8B7355);">${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          }
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// ---------------------------------------------------------------------------
// 2. Boardroom - Commanding presence with strategic emphasis
// ---------------------------------------------------------------------------
const executiveBoardroom = {
  id: 'executive-boardroom',
  name: 'Boardroom',
  description: 'Commanding presence with deep navy header and strategic emphasis. Built for impact.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['corporate', 'finance', 'consulting', 'manufacturing'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Navy', accentColor: '#1B2A4A', secondaryColor: '#E8ECF1', backgroundColor: '#ffffff' },
    { name: 'Charcoal', accentColor: '#2D3436', secondaryColor: '#EAECEE', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' },
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-boardroom" data-template="executive-boardroom"${designVars(design)}>
    <style>
      .executive-boardroom { padding: 0; }
      .executive-boardroom .resume-header { background-color: var(--accent-color, #1B2A4A); color: #fff; padding: 36px 44px 28px; }
      .executive-boardroom .resume-name { font-size: var(--name-size, 32px); font-weight: 700; color: #fff; margin-bottom: 6px; letter-spacing: 1px; }
      .executive-boardroom .resume-body { padding: 32px 44px 40px; }
      .executive-boardroom .resume-section { margin-bottom: var(--section-spacing, 26px); }
      .executive-boardroom .resume-section-title { font-size: var(--heading-size, 14px); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent-color, #1B2A4A); padding-bottom: 6px; margin-bottom: 14px; border-bottom: 3px solid var(--accent-color, #1B2A4A); }
      .executive-boardroom .resume-entry { margin-bottom: var(--paragraph-spacing, 20px); }
      .executive-boardroom .resume-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
      .executive-boardroom .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-boardroom .resume-bullets li { margin-bottom: 5px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; color: rgba(255,255,255,0.85); margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: rgba(255,255,255,0.7); font-style: italic; margin-bottom: 8px;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div style="font-size: 10px; color: rgba(255,255,255,0.75); letter-spacing: 0.5px;">${contact.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // Body
    html += `<div class="resume-body">`;

    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 10px; font-size: 12px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div class="resume-entry-header">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 14px; color: var(--accent-color, #1B2A4A);">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #777;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600; color: #555; margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += `  |  ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px; font-style: italic; color: #555;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 6px;">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
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

// ---------------------------------------------------------------------------
// 3. C-Suite - Top-level executive with board/advisory focus
// ---------------------------------------------------------------------------
const executiveCSuite = {
  id: 'executive-c-suite',
  name: 'C-Suite',
  description: 'Top-level executive format with board and advisory section emphasis. Understated authority.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['corporate', 'finance', 'healthcare', 'technology'],
  recommendedLevels: ['executive', 'director'],
  colorPresets: [
    { name: 'Slate', accentColor: '#334155', secondaryColor: '#F1F5F9', backgroundColor: '#ffffff' },
    { name: 'Onyx', accentColor: '#1C1C1C', secondaryColor: '#F5F5F5', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' },
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-c-suite" data-template="executive-c-suite"${designVars(design)}>
    <style>
      .executive-c-suite { padding: 44px 48px; }
      .executive-c-suite .resume-header { margin-bottom: var(--section-spacing, 30px); }
      .executive-c-suite .resume-name { font-size: var(--name-size, 34px); font-weight: 400; color: var(--accent-color, #334155); margin-bottom: 4px; }
      .executive-c-suite .resume-title-line { font-size: 15px; font-weight: 600; color: var(--accent-color, #334155); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
      .executive-c-suite .resume-contact { font-size: 10px; color: #777; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 8px 0; margin-top: 12px; text-align: center; letter-spacing: 0.5px; }
      .executive-c-suite .resume-section { margin-bottom: var(--section-spacing, 26px); }
      .executive-c-suite .resume-section-title { font-size: var(--heading-size, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: var(--accent-color, #334155); margin-bottom: 12px; }
      .executive-c-suite .resume-section-title::after { content: ''; display: block; width: 40px; height: 2px; background: var(--accent-color, #334155); margin-top: 6px; }
      .executive-c-suite .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-c-suite .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-c-suite .resume-bullets li { margin-bottom: 4px; line-height: 1.55; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div class="resume-title-line">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #666; font-style: italic; line-height: 1.6; max-width: 600px;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.join('   |   ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.75; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px;">${e(item.jobTitle)}</div>`;
          if (item.company) {
            html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
            html += `<span style="font-weight: 600; color: #555;">${e(item.company)}`;
            if (item.location) html += `, ${e(item.location)}`;
            html += `</span>`;
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            if (dr) html += `<span style="font-size: 11px; color: #777;">${dr}</span>`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin: 6px 0; font-style: italic; color: #555; font-size: 11px;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += `, ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 6px;">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// ---------------------------------------------------------------------------
// 4. Director - Senior management with team leadership focus
// ---------------------------------------------------------------------------
const executiveDirector = {
  id: 'executive-director',
  name: 'Director',
  description: 'Senior management layout emphasizing team leadership, cross-functional impact, and operational scope.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['corporate', 'healthcare', 'technology', 'manufacturing', 'retail'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Burgundy', accentColor: '#6B2737', secondaryColor: '#F9F2F4', backgroundColor: '#ffffff' },
    { name: 'Forest', accentColor: '#2D5016', secondaryColor: '#F0F5ED', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' },
    { name: 'Cambria', fontFamily: 'Cambria, Georgia, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-director" data-template="executive-director"${designVars(design)}>
    <style>
      .executive-director { padding: 40px 44px; }
      .executive-director .resume-header { padding-bottom: 18px; margin-bottom: var(--section-spacing, 28px); border-bottom: 3px double var(--accent-color, #6B2737); }
      .executive-director .resume-name { font-size: var(--name-size, 28px); font-weight: 700; color: var(--accent-color, #6B2737); margin-bottom: 4px; }
      .executive-director .resume-contact { font-size: 10px; color: #666; margin-top: 10px; }
      .executive-director .resume-section { margin-bottom: var(--section-spacing, 24px); }
      .executive-director .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent-color, #6B2737); margin-bottom: 10px; padding-left: 12px; border-left: 4px solid var(--accent-color, #6B2737); }
      .executive-director .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-director .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-director .resume-bullets li { margin-bottom: 4px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #666; font-style: italic; margin-bottom: 6px;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px;">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #777;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="color: var(--accent-color, #6B2737); font-weight: 600; margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += `  |  ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px; font-size: 11px; color: #555;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">`;
        items.forEach(item => {
          html += `<div style="padding: 8px 10px; background: var(--secondary-color, #F9F2F4); border-radius: 3px;">`;
          if (item.category) html += `<div style="font-weight: 700; font-size: 11px; color: var(--accent-color, #6B2737); margin-bottom: 3px;">${e(item.category)}</div>`;
          if (item.skills) { html += `<div style="font-size: 11px;">${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`; } else if (item.name) { html += `<div style="font-size: 11px;">${e(item.name)}</div>`; }
          html += `</div>`;
        });
        html += `</div>`;
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        html += `<div style="display: flex; flex-wrap: wrap; gap: 12px;">`;
        items.forEach(item => {
          if (item.language || item.name) {
            html += `<div style="padding: 4px 12px; background: var(--secondary-color, #F9F2F4); border-radius: 3px; font-size: 11px;">`;
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
            html += `</div>`;
          }
        });
        html += `</div>`;
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// ---------------------------------------------------------------------------
// 5. VP Modern - Vice President level, achievement-driven
// ---------------------------------------------------------------------------
const executiveVP = {
  id: 'executive-vp',
  name: 'VP Modern',
  description: 'Achievement-driven layout for Vice Presidents. Clean modern aesthetic with quantifiable impact.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'finance', 'marketing', 'operations', 'sales'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Steel', accentColor: '#37474F', secondaryColor: '#ECEFF1', backgroundColor: '#ffffff' },
    { name: 'Cobalt', accentColor: '#1A237E', secondaryColor: '#E8EAF6', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' },
    { name: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-vp" data-template="executive-vp"${designVars(design)}>
    <style>
      .executive-vp { padding: 38px 44px; }
      .executive-vp .resume-header { margin-bottom: var(--section-spacing, 26px); }
      .executive-vp .resume-name { font-size: var(--name-size, 32px); font-weight: 300; color: var(--accent-color, #37474F); margin-bottom: 2px; }
      .executive-vp .resume-header-line { height: 4px; background: linear-gradient(to right, var(--accent-color, #37474F), transparent); margin: 14px 0; }
      .executive-vp .resume-contact { font-size: 10px; color: #666; display: flex; flex-wrap: wrap; gap: 8px; }
      .executive-vp .resume-contact span { padding: 2px 0; }
      .executive-vp .resume-section { margin-bottom: var(--section-spacing, 24px); }
      .executive-vp .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent-color, #37474F); margin-bottom: 12px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
      .executive-vp .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-vp .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-vp .resume-bullets li { margin-bottom: 4px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; font-weight: 600; color: var(--accent-color, #37474F); letter-spacing: 1px; margin-bottom: 2px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `<div class="resume-header-line"></div>`;
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #555; font-style: italic; margin-bottom: 8px; line-height: 1.5;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.map(c => `<span>${c}</span>`).join('<span style="color: #ccc;">|</span>')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px; color: var(--accent-color, #37474F);">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #888;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600; color: #555; margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += `  |  ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px; font-size: 11px; color: #555;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.graduationYear) html += `<div style="font-size: 11px; color: #888;">${e(item.graduationYear)}</div>`;
          html += `</div>`;
          if (item.institution) html += `<div style="color: #555;">${e(item.institution)}</div>`;
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 6px;">`;
          if (item.category) html += `<strong style="color: var(--accent-color, #37474F);">${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join('  |  ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// ---------------------------------------------------------------------------
// 6. CTO Technical - Technical executive bridging tech and leadership
// ---------------------------------------------------------------------------
const executiveCTO = {
  id: 'executive-cto',
  name: 'CTO Technical',
  description: 'Technical executive layout bridging technology vision and leadership. Skills-forward with strategic depth.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['technology', 'software-development', 'engineering', 'saas', 'fintech'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Tech Blue', accentColor: '#0D47A1', secondaryColor: '#E3F2FD', backgroundColor: '#ffffff' },
    { name: 'Carbon', accentColor: '#263238', secondaryColor: '#ECEFF1', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Segoe UI', fontFamily: 'Segoe UI, Arial, sans-serif' },
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-cto" data-template="executive-cto"${designVars(design)}>
    <style>
      .executive-cto { padding: 36px 40px; }
      .executive-cto .resume-header { margin-bottom: var(--section-spacing, 24px); border-bottom: 3px solid var(--accent-color, #0D47A1); padding-bottom: 16px; }
      .executive-cto .resume-name { font-size: var(--name-size, 30px); font-weight: 700; color: var(--accent-color, #0D47A1); margin-bottom: 2px; }
      .executive-cto .resume-contact { font-size: 10px; color: #666; margin-top: 10px; }
      .executive-cto .resume-section { margin-bottom: var(--section-spacing, 24px); }
      .executive-cto .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #fff; background-color: var(--accent-color, #0D47A1); padding: 5px 12px; margin-bottom: 14px; }
      .executive-cto .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-cto .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-cto .resume-bullets li { margin-bottom: 4px; line-height: 1.5; }
      .executive-cto .tech-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
      .executive-cto .tech-card { padding: 10px; background: var(--secondary-color, #E3F2FD); border-left: 3px solid var(--accent-color, #0D47A1); }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; color: #444; font-weight: 600; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #666; font-style: italic; margin-bottom: 6px;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (personalInfo.githubUrl || personalInfo.github) {
      const gh = personalInfo.githubUrl || personalInfo.github;
      if (!contact.includes(e(gh))) contact.push(e(gh));
    }
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // Skills section rendered first for CTO
    const skillsSections = sections.filter(s => getSectionType(s) === 'skills' && shouldRender(s));
    skillsSections.forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || 'Technical Expertise')}</h2>`;
      html += `<div class="tech-grid">`;
      (section.items || []).filter(shouldRenderItem).forEach(item => {
        html += `<div class="tech-card">`;
        if (item.category) html += `<div style="font-weight: 700; font-size: 11px; color: var(--accent-color, #0D47A1); margin-bottom: 4px;">${e(item.category)}</div>`;
        if (item.skills) { html += `<div style="font-size: 11px;">${e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills))}</div>`; } else if (item.name) { html += `<div style="font-size: 11px;">${e(item.name)}</div>`; }
        html += `</div>`;
      });
      html += `</div>`;
      html += `</div>`;
    });

    // Remaining sections
    sections.filter(s => shouldRender(s) && getSectionType(s) !== 'skills').forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 14px; color: var(--accent-color, #0D47A1);">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #888;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600; color: #555; margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += `  |  ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px; font-size: 11px; color: #555;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700; color: var(--accent-color, #0D47A1);">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.technologies) html += `<div style="font-size: 10px; color: #777; margin-bottom: 4px;">${e(typeof item.technologies === 'string' ? item.technologies : item.technologies.join(', '))}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// ---------------------------------------------------------------------------
// 7. CFO Financial - Financial executive with metrics focus
// ---------------------------------------------------------------------------
const executiveCFO = {
  id: 'executive-cfo',
  name: 'CFO Financial',
  description: 'Financial executive layout with metrics emphasis. Clean, data-oriented, and authoritative.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['finance', 'banking', 'insurance', 'corporate', 'accounting'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Finance', accentColor: '#1B5E20', secondaryColor: '#E8F5E9', backgroundColor: '#ffffff' },
    { name: 'Corporate', accentColor: '#004D40', secondaryColor: '#E0F2F1', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Cambria', fontFamily: 'Cambria, Georgia, serif' },
    { name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-cfo" data-template="executive-cfo"${designVars(design)}>
    <style>
      .executive-cfo { padding: 40px 44px; }
      .executive-cfo .resume-header { text-align: center; padding-bottom: 18px; margin-bottom: var(--section-spacing, 26px); }
      .executive-cfo .resume-name { font-size: var(--name-size, 28px); font-weight: 700; color: var(--accent-color, #1B5E20); margin-bottom: 4px; letter-spacing: 1px; }
      .executive-cfo .resume-header-rule { border: none; border-top: 2px solid var(--accent-color, #1B5E20); margin: 12px auto; width: 60%; }
      .executive-cfo .resume-contact { font-size: 10px; color: #666; letter-spacing: 0.5px; }
      .executive-cfo .resume-section { margin-bottom: var(--section-spacing, 24px); }
      .executive-cfo .resume-section-title { font-size: var(--heading-size, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--accent-color, #1B5E20); margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid var(--accent-color, #1B5E20); }
      .executive-cfo .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-cfo .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-cfo .resume-bullets li { margin-bottom: 4px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #444; font-weight: 600; margin-bottom: 4px; letter-spacing: 1px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `<hr class="resume-header-rule">`;
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #555; font-style: italic; margin-bottom: 8px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.5;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.7; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px;">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #888;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600; color: var(--accent-color, #1B5E20); margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += `  |  ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px; font-size: 11px; color: #555; font-style: italic;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 6px;">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) html += `<div style="color: #555;">${e(item.organization)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

// ---------------------------------------------------------------------------
// 8. Nonprofit Leader - Mission-driven executive leadership
// ---------------------------------------------------------------------------
const executiveNonprofit = {
  id: 'executive-nonprofit',
  name: 'Nonprofit Leader',
  description: 'Mission-driven executive layout for nonprofit and social impact leaders. Warm, purposeful design.',
  category: 'executive',
  docTypes: ['resume', 'cv'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: true,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['nonprofit', 'education', 'government', 'social-impact', 'healthcare'],
  recommendedLevels: ['senior', 'executive', 'director'],
  colorPresets: [
    { name: 'Mission', accentColor: '#5D4037', secondaryColor: '#EFEBE9', backgroundColor: '#ffffff' },
    { name: 'Impact', accentColor: '#2E7D32', secondaryColor: '#E8F5E9', backgroundColor: '#ffffff' }
  ],
  fontPresets: [
    { name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' },
    { name: 'Palatino', fontFamily: 'Palatino Linotype, Palatino, Georgia, serif' }
  ],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="resume-template executive-nonprofit" data-template="executive-nonprofit"${designVars(design)}>
    <style>
      .executive-nonprofit { padding: 40px 44px; }
      .executive-nonprofit .resume-header { display: flex; align-items: flex-start; gap: 24px; padding-bottom: 20px; margin-bottom: var(--section-spacing, 28px); border-bottom: 2px solid var(--accent-color, #5D4037); }
      .executive-nonprofit .resume-header-text { flex: 1; }
      .executive-nonprofit .resume-name { font-size: var(--name-size, 28px); font-weight: 700; color: var(--accent-color, #5D4037); margin-bottom: 4px; }
      .executive-nonprofit .resume-contact { font-size: 10px; color: #666; margin-top: 10px; }
      .executive-nonprofit .resume-section { margin-bottom: var(--section-spacing, 26px); }
      .executive-nonprofit .resume-section-title { font-size: var(--heading-size, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent-color, #5D4037); margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
      .executive-nonprofit .resume-entry { margin-bottom: var(--paragraph-spacing, 18px); }
      .executive-nonprofit .resume-bullets { padding-left: 18px; margin: 6px 0 0; }
      .executive-nonprofit .resume-bullets li { margin-bottom: 4px; line-height: 1.5; }
    </style>`;

    // Header
    html += `<div class="resume-header">`;
    html += renderPhoto(personalInfo, design);
    html += `<div class="resume-header-text">`;
    if (personalInfo.fullName) {
      html += `<h1 class="resume-name">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #444; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.resumeHeadline) {
      html += `<div style="font-size: 11px; color: #666; font-style: italic; margin-bottom: 6px; line-height: 1.5;">${e(personalInfo.resumeHeadline)}</div>`;
    }
    const contact = buildContactLine(personalInfo);
    if (contact.length > 0) {
      html += `<div class="resume-contact">${contact.join('  |  ')}</div>`;
    }
    html += `</div>`;
    html += `</div>`;

    // Sections
    sections.filter(shouldRender).forEach(section => {
      html += `<div class="resume-section">`;
      html += `<h2 class="resume-section-title">${e(section.title || section.type)}</h2>`;

      const items = (section.items || []).filter(shouldRenderItem);

      if (getSectionType(section) === 'summary' || getSectionType(section) === 'objective') {
        items.forEach(item => {
          if (item.content) html += `<div style="line-height: 1.75; margin-bottom: 10px;">${e(item.content)}</div>`;
        });
      } else if (getSectionType(section) === 'experience') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          html += `<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">`;
          if (item.jobTitle) html += `<div style="font-weight: 700; font-size: 13px;">${e(item.jobTitle)}</div>`;
          const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
          if (dr) html += `<div style="font-size: 11px; color: #888;">${dr}</div>`;
          html += `</div>`;
          if (item.company) {
            html += `<div style="font-weight: 600; color: var(--accent-color, #5D4037); margin-bottom: 6px;">${e(item.company)}`;
            if (item.location) html += `  |  ${e(item.location)}`;
            html += `</div>`;
          }
          if (item.description || item.roleSummary) {
            html += `<div style="margin-bottom: 6px; font-size: 11px; color: #555;">${e(item.description || item.roleSummary)}</div>`;
          }
          const bullets = item.highlights || item.achievements || [];
          if (bullets.length > 0) {
            html += `<ul class="resume-bullets">`;
            bullets.forEach(b => { const t = typeof b === 'string' ? b : (b?.text || ''); if (t) html += `<li>${e(t)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'education') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.degree) {
            html += `<div style="font-weight: 700;">${e(item.degree)}`;
            if (item.field) html += ` in ${e(item.field)}`;
            html += `</div>`;
          }
          if (item.institution) {
            html += `<div style="color: #555;">${e(item.institution)}`;
            if (item.graduationYear) html += ` | ${e(item.graduationYear)}`;
            html += `</div>`;
          }
          if (item.honors) html += `<div style="font-style: italic; margin-top: 2px;">${e(item.honors)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'skills') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 6px;">`;
          if (item.category) html += `<strong>${e(item.category)}:</strong> `;
          if (item.skills) { html += e(Array.isArray(item.skills) ? item.skills.join(', ') : String(item.skills)); } else if (item.name) { html += e(item.name); }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'projects') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div style="font-weight: 700;">${e(item.text || item.skills || item.title || item.name)}</div>`;
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'certifications' || getSectionType(section) === 'awards') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.name || item.title) {
            html += `<div><strong>${e(item.name || item.title)}</strong>`;
            if (item.issuer || item.organization) html += ` - ${e(item.issuer || item.organization)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'publications') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong></div>`;
          if (item.publisher || item.journal) html += `<div style="font-style: italic; color: #555;">${e(item.publisher || item.journal)}</div>`;
          if (item.date || item.year) html += `<div style="font-size: 10px; color: #777;">${e(item.date || item.year)}</div>`;
          if (item.description) html += `<div style="margin-top: 2px;">${e(item.description)}</div>`;
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'volunteer') {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.role || item.title) html += `<div style="font-weight: 700;">${e(item.role || item.title)}</div>`;
          if (item.organization) {
            html += `<div style="color: var(--accent-color, #5D4037); font-weight: 600;">${e(item.organization)}`;
            const dr = formatDateRange(item.startMonth, item.startYear, item.endMonth, item.endYear, item.current || item.currentlyWorking);
            if (dr) html += ` | ${dr}`;
            html += `</div>`;
          }
          if (item.description) html += `<div style="margin-top: 4px;">${e(item.description)}</div>`;
          if (item.highlights && item.highlights.length > 0) {
            html += `<ul class="resume-bullets">`;
            item.highlights.forEach(h => { if (h) html += `<li>${e(h)}</li>`; });
            html += `</ul>`;
          }
          html += `</div>`;
        });
      } else if (getSectionType(section) === 'languages') {
        items.forEach(item => {
          html += `<div style="margin-bottom: 4px;">`;
          if (item.language || item.name) {
            html += `<strong>${e(item.language || item.name)}</strong>`;
            if (item.proficiency || item.level) html += ` - ${e(item.proficiency || item.level)}`;
          }
          html += `</div>`;
        });
      } else {
        items.forEach(item => {
          html += `<div class="resume-entry">`;
          if (item.text || item.skills || item.title || item.name) {
            html += `<div><strong>${e(item.text || item.skills || item.title || item.name)}</strong>`;
            if (item.organization || item.issuer) html += ` - ${e(item.organization || item.issuer)}`;
            if (item.date || item.year) html += ` (${e(item.date || item.year)})`;
            html += `</div>`;
          }
          if (item.description || item.content) html += `<div style="margin-top: 2px;">${e(item.description || item.content)}</div>`;
          html += `</div>`;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
};

export const executiveTemplates = [
  executivePrestige,
  executiveBoardroom,
  executiveCSuite,
  executiveDirector,
  executiveVP,
  executiveCTO,
  executiveCFO,
  executiveNonprofit
];
