/**
 * Cover Letter Templates
 * Professional cover letter formats
 */

import { encodeHTML } from '../utils/sanitize.js';

const e = (text) => encodeHTML(text);

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
 * 1. Standard Cover Letter - Traditional business letter format
 */
const standardCoverLetter = {
  id: 'cover-letter-standard',
  name: 'Standard Cover Letter',
  description: 'Traditional business letter format with professional styling.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: [],
  colorPresets: [{ name: 'Default', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Times New Roman', fontFamily: 'Times New Roman, serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template standard" data-template="cover-letter-standard"${designVars(design)}>`;

    // Sender address
    html += `<div class="sender-address" style="margin-bottom: 24px;">`;
    if (personalInfo.fullName) html += `<div>${e(personalInfo.fullName)}</div>`;
    if (personalInfo.professionalTitle) html += `<div style="font-style: italic; color: #666;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.address) html += `<div>${e(personalInfo.address)}</div>`;
    if (personalInfo.city || personalInfo.state || personalInfo.zip) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.zip].filter(Boolean).join(', ');
      html += `<div>${e(location)}</div>`;
    }
    if (personalInfo.country) html += `<div>${e(personalInfo.country)}</div>`;
    if (personalInfo.phone) html += `<div>${e(personalInfo.phone)}</div>`;
    if (personalInfo.email) html += `<div>${e(personalInfo.email)}</div>`;
    if (personalInfo.githubUrl) html += `<div>${e(personalInfo.githubUrl)}</div>`;
    html += `</div>`;

    // Date
    if (coverLetter.date) {
      html += `<div class="letter-date" style="margin-bottom: 24px;">${e(coverLetter.date)}</div>`;
    }

    // Recipient address
    html += `<div class="recipient-address" style="margin-bottom: 24px;">`;
    if (coverLetter.recipientName) html += `<div>${e(coverLetter.recipientName)}</div>`;
    if (coverLetter.recipientTitle) html += `<div>${e(coverLetter.recipientTitle)}</div>`;
    if (coverLetter.company) html += `<div>${e(coverLetter.company)}</div>`;
    if (coverLetter.companyAddress) html += `<div>${e(coverLetter.companyAddress)}</div>`;
    html += `</div>`;

    // Salutation
    if (coverLetter.salutation) {
      html += `<div class="salutation" style="margin-bottom: 16px;">${e(coverLetter.salutation)},</div>`;
    } else {
      html += `<div class="salutation" style="margin-bottom: 16px;">Dear Hiring Manager,</div>`;
    }

    // Body
    if (coverLetter.body) {
      const paragraphs = coverLetter.body.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          html += `<p style="margin-bottom: 16px; line-height: 1.6;">${e(para.trim())}</p>`;
        }
      });
    }

    // Closing
    if (coverLetter.closing) {
      html += `<div class="closing" style="margin-top: 24px; margin-bottom: 60px;">${e(coverLetter.closing)},</div>`;
    } else {
      html += `<div class="closing" style="margin-top: 24px; margin-bottom: 60px;">Sincerely,</div>`;
    }

    // Signature
    if (personalInfo.fullName) {
      html += `<div class="signature">${e(personalInfo.fullName)}</div>`;
    }

    html += `</div>`;
    return html;
  }
};

/**
 * 2. Modern Cover Letter - Clean modern layout
 */
const modernCoverLetter = {
  id: 'cover-letter-modern',
  name: 'Modern Cover Letter',
  description: 'Clean modern layout with visual hierarchy.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: [],
  colorPresets: [{ name: 'Blue', accentColor: '#2563eb', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template modern" data-template="cover-letter-modern"${designVars(design)}>`;

    // Header
    html += `<div class="letter-header" style="border-bottom: 3px solid var(--accent-color, #2563eb); padding-bottom: 16px; margin-bottom: 24px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 28px; font-weight: 700; color: var(--accent-color, #2563eb); margin-bottom: 8px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; font-style: italic; color: #666; margin-bottom: 4px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    const contact = [];
    if (personalInfo.phone) contact.push(e(personalInfo.phone));
    if (personalInfo.email) contact.push(e(personalInfo.email));
    if (personalInfo.city || personalInfo.state || personalInfo.country) {
      const location = [personalInfo.city, personalInfo.state, personalInfo.country].filter(Boolean).join(', ');
      contact.push(e(location));
    }
    if (personalInfo.githubUrl) contact.push(e(personalInfo.githubUrl));
    if (contact.length > 0) {
      html += `<div style="font-size: 14px; color: #666;">${contact.join(' • ')}</div>`;
    }
    html += `</div>`;

    // Date
    if (coverLetter.date) {
      html += `<div style="margin-bottom: 20px; color: #666;">${e(coverLetter.date)}</div>`;
    }

    // Recipient
    if (coverLetter.recipientName || coverLetter.company) {
      html += `<div style="margin-bottom: 20px;">`;
      if (coverLetter.recipientName) html += `<div style="font-weight: 600;">${e(coverLetter.recipientName)}</div>`;
      if (coverLetter.recipientTitle) html += `<div>${e(coverLetter.recipientTitle)}</div>`;
      if (coverLetter.company) html += `<div>${e(coverLetter.company)}</div>`;
      html += `</div>`;
    }

    // Salutation
    if (coverLetter.salutation) {
      html += `<div style="margin-bottom: 20px; font-weight: 600;">${e(coverLetter.salutation)},</div>`;
    } else {
      html += `<div style="margin-bottom: 20px; font-weight: 600;">Dear Hiring Manager,</div>`;
    }

    // Body
    if (coverLetter.body) {
      const paragraphs = coverLetter.body.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          html += `<p style="margin-bottom: 18px; line-height: 1.7;">${e(para.trim())}</p>`;
        }
      });
    }

    // Closing
    html += `<div style="margin-top: 30px;">`;
    if (coverLetter.closing) {
      html += `<div style="margin-bottom: 60px;">${e(coverLetter.closing)},</div>`;
    } else {
      html += `<div style="margin-bottom: 60px;">Best regards,</div>`;
    }
    if (personalInfo.fullName) {
      html += `<div style="font-weight: 600;">${e(personalInfo.fullName)}</div>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }
};

/**
 * 3-5: Additional cover letter templates (abbreviated)
 */

const professionalCoverLetter = {
  id: 'cover-letter-professional',
  name: 'Professional Cover Letter',
  description: 'Corporate feel matching professional resume templates.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
  atsLevel: 'medium',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['corporate', 'finance', 'consulting'],
  recommendedLevels: [],
  colorPresets: [{ name: 'Navy', accentColor: '#1e3a8a', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template professional" data-template="cover-letter-professional"${designVars(design)}>`;

    html += `<div style="border-top: 4px solid var(--accent-color, #1e3a8a); padding-top: 20px; margin-bottom: 24px;">`;
    if (personalInfo.fullName) html += `<h1 style="font-size: 26px; color: var(--accent-color, #1e3a8a);">${e(personalInfo.fullName)}</h1>`;
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; font-style: italic; color: #666;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `</div>`;

    if (coverLetter.body) {
      coverLetter.body.split('\n\n').forEach(para => {
        if (para.trim()) html += `<p style="margin-bottom: 16px; line-height: 1.6;">${e(para.trim())}</p>`;
      });
    }

    html += `<div style="margin-top: 30px;">Sincerely,<br><br>${personalInfo.fullName ? e(personalInfo.fullName) : ''}</div>`;
    html += `</div>`;
    return html;
  }
};

const creativeCoverLetter = {
  id: 'cover-letter-creative',
  name: 'Creative Cover Letter',
  description: 'Slightly more design-forward for creative fields.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
  atsLevel: 'low',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: ['creative', 'design', 'marketing'],
  recommendedLevels: [],
  colorPresets: [{ name: 'Creative', accentColor: '#ec4899', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template creative" data-template="cover-letter-creative"${designVars(design)}>`;

    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 32px; font-weight: 700; color: var(--accent-color, #ec4899); margin-bottom: 20px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; font-style: italic; color: #666; margin-bottom: 12px;">${e(personalInfo.professionalTitle)}</div>`;
    }

    if (coverLetter.body) {
      coverLetter.body.split('\n\n').forEach(para => {
        if (para.trim()) html += `<p style="margin-bottom: 18px; line-height: 1.7;">${e(para.trim())}</p>`;
      });
    }

    html += `<div style="margin-top: 30px; color: var(--accent-color, #ec4899);">Best,<br><br>${personalInfo.fullName ? e(personalInfo.fullName) : ''}</div>`;
    html += `</div>`;
    return html;
  }
};

const atsCoverLetter = {
  id: 'cover-letter-ats',
  name: 'ATS Cover Letter',
  description: 'Plain, maximally parseable format for ATS systems.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: [],
  colorPresets: [{ name: 'Plain', accentColor: '#000000', textColor: '#000000' }],
  fontPresets: [{ name: 'Arial', fontFamily: 'Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template ats" data-template="cover-letter-ats"${designVars(design)}>`;

    if (personalInfo.fullName) html += `<div style="margin-bottom: 16px;"><strong>${e(personalInfo.fullName)}</strong></div>`;
    if (personalInfo.professionalTitle) html += `<div style="font-style: italic; color: #666; margin-bottom: 8px;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.email) html += `<div>${e(personalInfo.email)}</div>`;
    if (personalInfo.phone) html += `<div style="margin-bottom: 20px;">${e(personalInfo.phone)}</div>`;
    if (personalInfo.githubUrl) html += `<div style="margin-bottom: 20px;">${e(personalInfo.githubUrl)}</div>`;

    if (coverLetter.date) html += `<div style="margin-bottom: 16px;">${e(coverLetter.date)}</div>`;

    if (coverLetter.company) html += `<div style="margin-bottom: 16px;">${e(coverLetter.company)}</div>`;

    html += `<div style="margin-bottom: 16px;">Dear Hiring Manager,</div>`;

    if (coverLetter.body) {
      coverLetter.body.split('\n\n').forEach(para => {
        if (para.trim()) html += `<p style="margin-bottom: 16px; line-height: 1.5;">${e(para.trim())}</p>`;
      });
    }

    html += `<div style="margin-top: 20px;">Sincerely,</div>`;
    if (personalInfo.fullName) html += `<div style="margin-top: 40px;">${e(personalInfo.fullName)}</div>`;

    html += `</div>`;
    return html;
  }
};

/**
 * 6. Executive Cover Letter - Formal, authoritative tone for senior leadership
 */
const executiveCoverLetter = {
  id: 'cover-letter-executive',
  name: 'Executive Cover Letter',
  description: 'Formal, authoritative tone suited for senior leadership and C-suite roles.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
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
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template executive" data-template="cover-letter-executive"${designVars(design)}>`;

    // Elegant header with name and title
    html += `<div style="text-align: center; border-bottom: 2px solid var(--accent-color, #1c1917); padding-bottom: 20px; margin-bottom: 30px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 30px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent-color, #1c1917); margin-bottom: 8px;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 15px; font-style: italic; color: #555; margin-bottom: 10px;">${e(personalInfo.professionalTitle)}</div>`;
    }
    const contactParts = [];
    if (personalInfo.phone) contactParts.push(e(personalInfo.phone));
    if (personalInfo.email) contactParts.push(e(personalInfo.email));
    if (personalInfo.city || personalInfo.state) {
      const loc = [personalInfo.city, personalInfo.state].filter(Boolean).join(', ');
      contactParts.push(e(loc));
    }
    if (personalInfo.linkedinUrl) contactParts.push(e(personalInfo.linkedinUrl));
    if (contactParts.length > 0) {
      html += `<div style="font-size: 13px; color: #666;">${contactParts.join('  |  ')}</div>`;
    }
    html += `</div>`;

    // Date
    if (coverLetter.date) {
      html += `<div style="margin-bottom: 24px; font-size: 14px;">${e(coverLetter.date)}</div>`;
    }

    // Recipient block
    if (coverLetter.recipientName || coverLetter.company) {
      html += `<div style="margin-bottom: 24px;">`;
      if (coverLetter.recipientName) html += `<div style="font-weight: 600;">${e(coverLetter.recipientName)}</div>`;
      if (coverLetter.recipientTitle) html += `<div>${e(coverLetter.recipientTitle)}</div>`;
      if (coverLetter.company) html += `<div>${e(coverLetter.company)}</div>`;
      if (coverLetter.companyAddress) html += `<div>${e(coverLetter.companyAddress)}</div>`;
      html += `</div>`;
    }

    // Salutation
    if (coverLetter.salutation) {
      html += `<div style="margin-bottom: 20px; font-size: 15px;">${e(coverLetter.salutation)},</div>`;
    } else {
      html += `<div style="margin-bottom: 20px; font-size: 15px;">Dear Members of the Board,</div>`;
    }

    // Body
    if (coverLetter.body) {
      const paragraphs = coverLetter.body.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          html += `<p style="margin-bottom: 18px; line-height: 1.75; text-align: justify; font-size: 14px;">${e(para.trim())}</p>`;
        }
      });
    }

    // Closing
    html += `<div style="margin-top: 32px;">`;
    if (coverLetter.closing) {
      html += `<div style="margin-bottom: 60px; font-size: 15px;">${e(coverLetter.closing)},</div>`;
    } else {
      html += `<div style="margin-bottom: 60px; font-size: 15px;">Respectfully,</div>`;
    }
    if (personalInfo.fullName) {
      html += `<div style="font-weight: 700; font-size: 15px;">${e(personalInfo.fullName)}</div>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #555; font-style: italic;">${e(personalInfo.professionalTitle)}</div>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }
};

/**
 * 7. Academic Cover Letter - Research and teaching focus
 */
const academicCoverLetter = {
  id: 'cover-letter-academic',
  name: 'Academic Cover Letter',
  description: 'Research and teaching focused format for academic positions.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
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
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template academic" data-template="cover-letter-academic"${designVars(design)}>`;

    // Sender information block
    html += `<div style="margin-bottom: 24px; border-left: 3px solid var(--accent-color, #1e3a8a); padding-left: 16px;">`;
    if (personalInfo.fullName) html += `<div style="font-weight: 700; font-size: 18px; color: var(--accent-color, #1e3a8a);">${e(personalInfo.fullName)}</div>`;
    if (personalInfo.professionalTitle) html += `<div style="font-size: 14px; font-style: italic; color: #555;">${e(personalInfo.professionalTitle)}</div>`;
    if (personalInfo.department) html += `<div style="font-size: 14px; color: #555;">${e(personalInfo.department)}</div>`;
    if (personalInfo.institution) html += `<div style="font-size: 14px; color: #555;">${e(personalInfo.institution)}</div>`;
    const academicContact = [];
    if (personalInfo.email) academicContact.push(e(personalInfo.email));
    if (personalInfo.phone) academicContact.push(e(personalInfo.phone));
    if (academicContact.length > 0) {
      html += `<div style="font-size: 13px; color: #666; margin-top: 4px;">${academicContact.join(' | ')}</div>`;
    }
    if (personalInfo.githubUrl) html += `<div style="font-size: 13px; color: #666;">${e(personalInfo.githubUrl)}</div>`;
    html += `</div>`;

    // Date
    if (coverLetter.date) {
      html += `<div style="margin-bottom: 20px; font-size: 14px;">${e(coverLetter.date)}</div>`;
    }

    // Recipient / search committee
    if (coverLetter.recipientName || coverLetter.company) {
      html += `<div style="margin-bottom: 20px;">`;
      if (coverLetter.recipientName) html += `<div>${e(coverLetter.recipientName)}</div>`;
      if (coverLetter.recipientTitle) html += `<div>${e(coverLetter.recipientTitle)}</div>`;
      if (coverLetter.company) html += `<div>${e(coverLetter.company)}</div>`;
      if (coverLetter.companyAddress) html += `<div>${e(coverLetter.companyAddress)}</div>`;
      html += `</div>`;
    }

    // Salutation
    if (coverLetter.salutation) {
      html += `<div style="margin-bottom: 18px;">${e(coverLetter.salutation)},</div>`;
    } else {
      html += `<div style="margin-bottom: 18px;">Dear Members of the Search Committee,</div>`;
    }

    // Body paragraphs
    if (coverLetter.body) {
      const paragraphs = coverLetter.body.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          html += `<p style="margin-bottom: 16px; line-height: 1.7; text-indent: 2em; font-size: 14px;">${e(para.trim())}</p>`;
        }
      });
    }

    // Closing
    html += `<div style="margin-top: 28px;">`;
    if (coverLetter.closing) {
      html += `<div style="margin-bottom: 50px;">${e(coverLetter.closing)},</div>`;
    } else {
      html += `<div style="margin-bottom: 50px;">Sincerely,</div>`;
    }
    if (personalInfo.fullName) {
      html += `<div style="font-weight: 600;">${e(personalInfo.fullName)}</div>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 13px; color: #555;">${e(personalInfo.professionalTitle)}</div>`;
    }
    if (personalInfo.department || personalInfo.institution) {
      const affiliation = [personalInfo.department, personalInfo.institution].filter(Boolean).map(v => e(v)).join(', ');
      html += `<div style="font-size: 13px; color: #555;">${affiliation}</div>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }
};

/**
 * 8. Internship Cover Letter - Student-focused, concise
 */
const internshipCoverLetter = {
  id: 'cover-letter-internship',
  name: 'Internship Cover Letter',
  description: 'Student-focused, concise format ideal for internship and entry-level applications.',
  category: 'cover-letter',
  docTypes: ['cover-letter'],
  atsLevel: 'high',
  columnCount: 1,
  photoSupport: false,
  supportedPageSizes: ['letter', 'a4'],
  recommendedIndustries: [],
  recommendedLevels: ['entry'],
  colorPresets: [{ name: 'Fresh', accentColor: '#0d9488', textColor: '#1f2937' }],
  fontPresets: [{ name: 'Calibri', fontFamily: 'Calibri, Arial, sans-serif' }],
  spacingPresets: [],

  render: (data, design = {}) => {
    const { personalInfo = {}, coverLetter = {} } = data;
    let html = `<div class="cover-letter-template internship" data-template="cover-letter-internship"${designVars(design)}>`;

    // Compact header
    html += `<div style="background-color: var(--accent-color, #0d9488); color: #fff; padding: 20px 24px; margin: -20px -20px 24px -20px;">`;
    if (personalInfo.fullName) {
      html += `<h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px; color: #fff;">${e(personalInfo.fullName)}</h1>`;
    }
    if (personalInfo.professionalTitle) {
      html += `<div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px; color: #fff;">${e(personalInfo.professionalTitle)}</div>`;
    }
    const studentContact = [];
    if (personalInfo.email) studentContact.push(e(personalInfo.email));
    if (personalInfo.phone) studentContact.push(e(personalInfo.phone));
    if (personalInfo.city || personalInfo.state) {
      const loc = [personalInfo.city, personalInfo.state].filter(Boolean).join(', ');
      studentContact.push(e(loc));
    }
    if (personalInfo.githubUrl) studentContact.push(e(personalInfo.githubUrl));
    if (studentContact.length > 0) {
      html += `<div style="font-size: 13px; opacity: 0.85; color: #fff;">${studentContact.join(' | ')}</div>`;
    }
    html += `</div>`;

    // Date
    if (coverLetter.date) {
      html += `<div style="margin-bottom: 16px; font-size: 14px; color: #666;">${e(coverLetter.date)}</div>`;
    }

    // Recipient
    if (coverLetter.recipientName || coverLetter.company) {
      html += `<div style="margin-bottom: 16px;">`;
      if (coverLetter.recipientName) html += `<div style="font-weight: 600;">${e(coverLetter.recipientName)}</div>`;
      if (coverLetter.recipientTitle) html += `<div style="font-size: 14px;">${e(coverLetter.recipientTitle)}</div>`;
      if (coverLetter.company) html += `<div style="font-size: 14px;">${e(coverLetter.company)}</div>`;
      html += `</div>`;
    }

    // Salutation
    if (coverLetter.salutation) {
      html += `<div style="margin-bottom: 16px; font-weight: 600;">${e(coverLetter.salutation)},</div>`;
    } else {
      html += `<div style="margin-bottom: 16px; font-weight: 600;">Dear Hiring Manager,</div>`;
    }

    // Body
    if (coverLetter.body) {
      const paragraphs = coverLetter.body.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          html += `<p style="margin-bottom: 14px; line-height: 1.6; font-size: 14px;">${e(para.trim())}</p>`;
        }
      });
    }

    // Closing
    html += `<div style="margin-top: 24px;">`;
    if (coverLetter.closing) {
      html += `<div style="margin-bottom: 40px;">${e(coverLetter.closing)},</div>`;
    } else {
      html += `<div style="margin-bottom: 40px;">Thank you for your consideration,</div>`;
    }
    if (personalInfo.fullName) {
      html += `<div style="font-weight: 600; color: var(--accent-color, #0d9488);">${e(personalInfo.fullName)}</div>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }
};

export const coverLetterTemplates = [
  standardCoverLetter,
  modernCoverLetter,
  professionalCoverLetter,
  creativeCoverLetter,
  atsCoverLetter,
  executiveCoverLetter,
  academicCoverLetter,
  internshipCoverLetter
];
