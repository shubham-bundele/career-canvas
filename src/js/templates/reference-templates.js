/**
 * Reference Sheet Templates
 * Professional reference list formats
 */

import { encodeHTML } from '../utils/sanitize.js';

const e = (text) => encodeHTML(text);

const shouldRender = (section) => {
  return section && section.visible !== false && section.items && section.items.length > 0;
};

const shouldRenderItem = (item) => {
  return item && item.included !== false && item.hidden !== true;
};

const designVars = (design) => {
  if (!design) return '';
  const vars = [];
  if (design.fontFamily) vars.push(`--font-family: ${design.fontFamily}`);
  if (design.fontSize) vars.push(`--font-size: ${design.fontSize}px`);
  if (design.lineHeight) vars.push(`--line-height: ${design.lineHeight}`);
  if (design.accentColor) vars.push(`--accent-color: ${design.accentColor}`);
  if (design.textColor) vars.push(`--text-color: ${design.textColor}`);
  if (design.backgroundColor) vars.push(`--background-color: ${design.backgroundColor}`);
  return vars.length > 0 ? ` style="${vars.join('; ')};"` : '';
};

/**
 * 1. Standard References - Clean list of references
 */
const standardReferences = {
  id: 'references-standard',
  name: 'Standard References',
  description: 'Clean professional reference list with essential contact information.',
  category: 'references',
  docTypes: ['references'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: [],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="references-template standard" data-template="references-standard"${designVars(design)}>`;

    // Header with candidate name
    html += `<div class="references-header" style="text-align: center; margin-bottom: 30px;">`;
    html += `<h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Professional References</h1>`;
    if (personalInfo.fullName) {
      html += `<div style="font-size: 16px; color: #666;">for ${e(personalInfo.fullName)}</div>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; color: #888; font-style: italic;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `</div>`;

    // References section
    const referencesSection = sections.find(s => s.type === 'references' && shouldRender(s));
    if (referencesSection) {
      const items = (referencesSection.items || []).filter(shouldRenderItem);

      items.forEach((item, index) => {
        html += `<div class="reference-entry" style="margin-bottom: 24px; padding-bottom: 20px; ${index < items.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">`;

        if (item.name) {
          html += `<div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${e(item.name)}</div>`;
        }

        if (item.title || item.company) {
          html += `<div style="font-size: 14px; color: #555; margin-bottom: 4px;">`;
          if (item.title) html += e(item.title);
          if (item.title && item.company) html += ' at ';
          if (item.company) html += e(item.company);
          html += `</div>`;
        }

        if (item.relationship) {
          html += `<div style="font-size: 14px; font-style: italic; color: #666; margin-bottom: 8px;">${e(item.relationship)}</div>`;
        }

        // Contact information
        html += `<div style="margin-top: 8px;">`;
        if (item.email) {
          html += `<div style="font-size: 14px; margin-bottom: 2px;">Email: ${e(item.email)}</div>`;
        }
        if (item.phone) {
          html += `<div style="font-size: 14px; margin-bottom: 2px;">Phone: ${e(item.phone)}</div>`;
        }
        if (item.address) {
          html += `<div style="font-size: 14px; margin-bottom: 2px;">Address: ${e(item.address)}</div>`;
        }
        html += `</div>`;

        html += `</div>`;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 40px;">No references available</div>`;
    }

    html += `</div>`;
    return html;
  }
};

/**
 * 2. Professional References - More detailed with relationship context
 */
const professionalReferences = {
  id: 'references-professional',
  name: 'Professional References',
  description: 'Detailed reference sheet with relationship context and notes.',
  category: 'references',
  docTypes: ['references'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['mid', 'senior', 'executive'],
  colorPresets: [{ name: 'Professional', accentColor: '#2563eb', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="references-template professional" data-template="references-professional"${designVars(design)}>`;

    // Header
    html += `<div class="references-header" style="border-bottom: 3px solid var(--accent-color, #2563eb); padding-bottom: 16px; margin-bottom: 30px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 26px; font-weight: 700; color: var(--accent-color, #2563eb); margin-bottom: 6px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; color: #666; font-style: italic; margin-bottom: 6px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `<h2 style="font-size: 18px; font-weight: 600; color: #555;">Professional References</h2>`;

    // Candidate contact info
    const contact = [];
    if (personalInfo.email) contact.push(e(personalInfo.email));
    if (personalInfo.phone) contact.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contact.push(e(location));
    }
    if (personalInfo.githubUrl) contact.push(e(personalInfo.githubUrl));
    if (contact.length > 0) {
      html += `<div style="font-size: 14px; color: #666; margin-top: 8px;">${contact.join(' • ')}</div>`;
    }
    html += `</div>`;

    // References
    const referencesSection = sections.find(s => s.type === 'references' && shouldRender(s));
    if (referencesSection) {
      const items = (referencesSection.items || []).filter(shouldRenderItem);

      items.forEach((item, index) => {
        html += `<div class="reference-entry" style="margin-bottom: 28px;">`;

        html += `<div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid var(--accent-color, #2563eb);">`;

        if (item.name) {
          html += `<div style="font-weight: 700; font-size: 17px; color: var(--accent-color, #2563eb); margin-bottom: 6px;">${e(item.name)}</div>`;
        }

        if (item.title || item.company) {
          html += `<div style="font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 4px;">`;
          if (item.title) html += e(item.title);
          if (item.title && item.company) html += ' | ';
          if (item.company) html += e(item.company);
          html += `</div>`;
        }

        if (item.relationship) {
          html += `<div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;"><strong>Relationship:</strong> ${e(item.relationship)}</div>`;
        }

        if (item.yearsKnown) {
          html += `<div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;"><strong>Years Known:</strong> ${e(item.yearsKnown)}</div>`;
        }

        // Contact section
        html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">`;
        if (item.email) {
          html += `<div style="font-size: 14px; margin-bottom: 3px;"><strong>Email:</strong> ${e(item.email)}</div>`;
        }
        if (item.phone) {
          html += `<div style="font-size: 14px; margin-bottom: 3px;"><strong>Phone:</strong> ${e(item.phone)}</div>`;
        }
        if (item.linkedIn) {
          html += `<div style="font-size: 14px; margin-bottom: 3px;"><strong>LinkedIn:</strong> ${e(item.linkedIn)}</div>`;
        }
        html += `</div>`;

        if (item.notes) {
          html += `<div style="margin-top: 10px; font-size: 13px; color: #6b7280; font-style: italic;">${e(item.notes)}</div>`;
        }

        html += `</div>`;
        html += `</div>`;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 40px;">References available upon request</div>`;
    }

    html += `</div>`;
    return html;
  }
};

/**
 * 3. Academic References - Academic-focused with publication collaboration notes
 */
const academicReferences = {
  id: 'references-academic',
  name: 'Academic References',
  description: 'Academic reference format with research collaboration and publication details.',
  category: 'references',
  docTypes: ['references'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['education', 'research', 'academic'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [{ name: 'Academic', accentColor: '#1e3a8a', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Times New Roman', fontFamily: 'Times New Roman, Georgia, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="references-template academic" data-template="references-academic"${designVars(design)}>`;

    // Header
    html += `<div class="references-header" style="text-align: center; margin-bottom: 30px;">`;
    html += `<h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Academic References</h1>`;
    if (personalInfo.fullName) {
      html += `<div style="font-size: 16px; margin-bottom: 6px;">${e(personalInfo.fullName)}</div>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; color: #666; font-style: italic; margin-bottom: 6px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.institution || personalInfo.department) {
      html += `<div style="font-size: 14px; color: #666;">`;
      if (personalInfo.department) html += e(personalInfo.department);
      if (personalInfo.institution && personalInfo.department) html += ', ';
      if (personalInfo.institution) html += e(personalInfo.institution);
      html += `</div>`;
    }
    html += `</div>`;

    // References
    const referencesSection = sections.find(s => s.type === 'references' && shouldRender(s));
    if (referencesSection) {
      const items = (referencesSection.items || []).filter(shouldRenderItem);

      items.forEach((item, index) => {
        html += `<div class="reference-entry" style="margin-bottom: 26px;">`;

        if (item.name) {
          html += `<div style="font-weight: 700; font-size: 16px; margin-bottom: 3px;">${e(item.name)}`;
          if (item.credentials) html += `, ${e(item.credentials)}`;
          html += `</div>`;
        }

        if (item.title) {
          html += `<div style="font-size: 14px; font-style: italic; margin-bottom: 2px;">${e(item.title)}</div>`;
        }

        if (item.department || item.institution) {
          html += `<div style="font-size: 14px; margin-bottom: 8px;">`;
          if (item.department) html += e(item.department);
          if (item.department && item.institution) html += ', ';
          if (item.institution) html += e(item.institution);
          html += `</div>`;
        }

        if (item.relationship) {
          html += `<div style="font-size: 14px; margin-bottom: 6px;"><strong>Relationship:</strong> ${e(item.relationship)}</div>`;
        }

        if (item.researchArea) {
          html += `<div style="font-size: 14px; margin-bottom: 6px;"><strong>Research Area:</strong> ${e(item.researchArea)}</div>`;
        }

        if (item.collaborations) {
          html += `<div style="font-size: 14px; margin-bottom: 6px;"><strong>Collaborations:</strong> ${e(item.collaborations)}</div>`;
        }

        // Contact
        html += `<div style="margin-top: 8px; font-size: 14px;">`;
        if (item.email) {
          html += `<div>Email: ${e(item.email)}</div>`;
        }
        if (item.phone) {
          html += `<div>Phone: ${e(item.phone)}</div>`;
        }
        if (item.officeAddress) {
          html += `<div>Office: ${e(item.officeAddress)}</div>`;
        }
        html += `</div>`;

        if (index < items.length - 1) {
          html += `<hr style="margin-top: 16px; border: none; border-top: 1px solid #d1d5db;">`;
        }

        html += `</div>`;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 40px;">References available upon request</div>`;
    }

    html += `</div>`;
    return html;
  }
};

/**
 * 4. Modern References - Clean contemporary style
 */
const modernReferences = {
  id: 'references-modern',
  name: 'Modern References',
  description: 'Clean contemporary design with card-style layout and subtle accents.',
  category: 'references',
  docTypes: ['references'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['tech', 'startup', 'creative', 'marketing'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [{ name: 'Modern Blue', accentColor: '#3b82f6', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="references-template modern" data-template="references-modern"${designVars(design)}>`;

    // Header
    html += `<div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--accent-color, #3b82f6); padding-bottom: 16px; margin-bottom: 30px;">`;
    html += `<div>`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 26px; font-weight: 700; color: var(--accent-color, #3b82f6); margin-bottom: 4px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; color: #666;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `</div>`;
    html += `<div style="text-align: right;">`;
    html += `<div style="font-size: 16px; font-weight: 600; color: #374151;">References</div>`;
    const contactInfo = [];
    if (personalInfo.email) contactInfo.push(e(personalInfo.email));
    if (personalInfo.phone) contactInfo.push(e(personalInfo.phone));
    if (contactInfo.length > 0) {
      html += `<div style="font-size: 13px; color: #666; margin-top: 4px;">${contactInfo.join(' | ')}</div>`;
    }
    html += `</div>`;
    html += `</div>`;

    // References as cards
    const referencesSection = sections.find(s => s.type === 'references' && shouldRender(s));
    if (referencesSection) {
      const items = (referencesSection.items || []).filter(shouldRenderItem);

      items.forEach((item) => {
        html += `<div class="reference-entry" style="margin-bottom: 20px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #fafafa;">`;

        html += `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">`;
        html += `<div>`;
        if (item.name) {
          html += `<div style="font-weight: 700; font-size: 16px; color: var(--accent-color, #3b82f6);">${e(item.name)}</div>`;
        }
        if (item.title || item.company) {
          html += `<div style="font-size: 14px; color: #555;">`;
          if (item.title) html += e(item.title);
          if (item.title && item.company) html += ' at ';
          if (item.company) html += `<strong>${e(item.company)}</strong>`;
          html += `</div>`;
        }
        html += `</div>`;
        if (item.relationship) {
          html += `<div style="font-size: 12px; color: #fff; background-color: var(--accent-color, #3b82f6); padding: 3px 10px; border-radius: 12px;">${e(item.relationship)}</div>`;
        }
        html += `</div>`;

        // Contact row
        const refContact = [];
        if (item.email) refContact.push(`<span>Email: ${e(item.email)}</span>`);
        if (item.phone) refContact.push(`<span>Phone: ${e(item.phone)}</span>`);
        if (item.linkedIn) refContact.push(`<span>LinkedIn: ${e(item.linkedIn)}</span>`);
        if (refContact.length > 0) {
          html += `<div style="font-size: 13px; color: #666; display: flex; gap: 16px; flex-wrap: wrap;">${refContact.join('')}</div>`;
        }

        if (item.notes) {
          html += `<div style="margin-top: 10px; font-size: 13px; color: #6b7280; font-style: italic; border-top: 1px solid #e5e7eb; padding-top: 8px;">${e(item.notes)}</div>`;
        }

        html += `</div>`;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 40px;">No references available</div>`;
    }

    html += `</div>`;
    return html;
  }
};

/**
 * 5. Executive References - Formal with relationship context
 */
const executiveReferences = {
  id: 'references-executive',
  name: 'Executive References',
  description: 'Formal reference sheet with detailed relationship context for senior-level positions.',
  category: 'references',
  docTypes: ['references'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['corporate', 'finance', 'consulting', 'executive'],
  recommendedLevels: ['senior', 'executive'],
  colorPresets: [{ name: 'Executive', accentColor: '#1c1917', textColor: '#1c1917' }],
  fontPresets: [{ name: 'Georgia', fontFamily: 'Georgia, Times New Roman, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="references-template executive" data-template="references-executive"${designVars(design)}>`;

    // Formal header
    html += `<div style="text-align: center; border-bottom: 2px solid var(--accent-color, #1c1917); padding-bottom: 20px; margin-bottom: 32px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent-color, #1c1917); margin-bottom: 6px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 15px; font-style: italic; color: #555; margin-bottom: 8px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `<div style="font-size: 14px; font-weight: 600; color: #374151; letter-spacing: 1px;">PROFESSIONAL REFERENCES</div>`;
    const execContact = [];
    if (personalInfo.email) execContact.push(e(personalInfo.email));
    if (personalInfo.phone) execContact.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state) {
      const loc = [personalInfo.city, personalInfo.state].filter(Boolean).join(', ');
      execContact.push(e(loc));
    }
    if (execContact.length > 0) {
      html += `<div style="font-size: 13px; color: #666; margin-top: 8px;">${execContact.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // References
    const referencesSection = sections.find(s => s.type === 'references' && shouldRender(s));
    if (referencesSection) {
      const items = (referencesSection.items || []).filter(shouldRenderItem);

      items.forEach((item, index) => {
        html += `<div class="reference-entry" style="margin-bottom: 28px; padding-bottom: 24px; ${index < items.length - 1 ? 'border-bottom: 1px solid #d1d5db;' : ''}">`;

        // Name and title row
        if (item.name) {
          html += `<div style="font-weight: 700; font-size: 17px; color: var(--accent-color, #1c1917); margin-bottom: 4px;">${e(item.name)}</div>`;
        }

        if (item.title || item.company) {
          html += `<div style="font-size: 15px; color: #374151; margin-bottom: 6px;">`;
          if (item.title) html += e(item.title);
          if (item.title && item.company) html += ', ';
          if (item.company) html += e(item.company);
          html += `</div>`;
        }

        // Relationship context block
        if (item.relationship || item.yearsKnown) {
          html += `<div style="margin: 10px 0; padding: 10px 14px; background-color: #f9fafb; border-left: 3px solid var(--accent-color, #1c1917);">`;
          if (item.relationship) {
            html += `<div style="font-size: 14px; margin-bottom: 4px;"><strong>Professional Relationship:</strong> ${e(item.relationship)}</div>`;
          }
          if (item.yearsKnown) {
            html += `<div style="font-size: 14px;"><strong>Duration:</strong> ${e(item.yearsKnown)}</div>`;
          }
          html += `</div>`;
        }

        // Contact details
        html += `<div style="margin-top: 12px; font-size: 14px;">`;
        if (item.email) {
          html += `<div style="margin-bottom: 3px;"><strong>Email:</strong> ${e(item.email)}</div>`;
        }
        if (item.phone) {
          html += `<div style="margin-bottom: 3px;"><strong>Phone:</strong> ${e(item.phone)}</div>`;
        }
        if (item.address) {
          html += `<div style="margin-bottom: 3px;"><strong>Address:</strong> ${e(item.address)}</div>`;
        }
        if (item.linkedIn) {
          html += `<div style="margin-bottom: 3px;"><strong>LinkedIn:</strong> ${e(item.linkedIn)}</div>`;
        }
        html += `</div>`;

        if (item.notes) {
          html += `<div style="margin-top: 10px; font-size: 13px; color: #6b7280; font-style: italic;">${e(item.notes)}</div>`;
        }

        html += `</div>`;
      });
    } else {
      html += `<div style="text-align: center; color: #999; padding: 40px;">References available upon request</div>`;
    }

    html += `</div>`;
    return html;
  }
};

/**
 * 6. Minimal References - Ultra-clean single column
 */
const minimalReferences = {
  id: 'references-minimal',
  name: 'Minimal References',
  description: 'Ultra-clean single column layout with maximum whitespace and simplicity.',
  category: 'references',
  docTypes: ['references'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['tech', 'design', 'startup'],
  recommendedLevels: ['entry', 'mid', 'senior'],
  colorPresets: [{ name: 'Minimal', accentColor: '#374151', textColor: '#374151' }],
  fontPresets: [{ name: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, sections = [] } = data;
    let html = `<div class="references-template minimal" data-template="references-minimal"${designVars(design)}>`;

    // Minimal header
    html += `<div style="margin-bottom: 36px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 22px; font-weight: 600; color: var(--accent-color, #374151); margin-bottom: 4px;">${e(personalInfo.fullName)}</h1>`;
    }
    html += `<div style="font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px;">References</div>`;
    html += `</div>`;

    // References - ultra clean
    const referencesSection = sections.find(s => s.type === 'references' && shouldRender(s));
    if (referencesSection) {
      const items = (referencesSection.items || []).filter(shouldRenderItem);

      items.forEach((item, index) => {
        html += `<div class="reference-entry" style="margin-bottom: 28px; padding-left: 16px; border-left: 2px solid ${index === 0 ? 'var(--accent-color, #374151)' : '#e5e7eb'};">`;

        if (item.name) {
          html += `<div style="font-weight: 600; font-size: 15px; color: var(--accent-color, #374151); margin-bottom: 3px;">${e(item.name)}</div>`;
        }

        if (item.title || item.company) {
          html += `<div style="font-size: 14px; color: #6b7280; margin-bottom: 2px;">`;
          if (item.title) html += e(item.title);
          if (item.title && item.company) html += ' / ';
          if (item.company) html += e(item.company);
          html += `</div>`;
        }

        if (item.relationship) {
          html += `<div style="font-size: 13px; color: #9ca3af; margin-bottom: 8px;">${e(item.relationship)}</div>`;
        }

        // Compact contact
        const minContact = [];
        if (item.email) minContact.push(e(item.email));
        if (item.phone) minContact.push(e(item.phone));
        if (minContact.length > 0) {
          html += `<div style="font-size: 13px; color: #6b7280;">${minContact.join(' &middot; ')}</div>`;
        }

        html += `</div>`;
      });
    } else {
      html += `<div style="color: #9ca3af; padding: 30px 0; font-size: 14px;">References available upon request</div>`;
    }

    html += `</div>`;
    return html;
  }
};

export const referenceTemplates = [
  standardReferences,
  professionalReferences,
  academicReferences,
  modernReferences,
  executiveReferences,
  minimalReferences
];
