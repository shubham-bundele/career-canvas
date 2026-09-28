/**
 * ATS Checker Module
 * Local rule-based ATS compatibility analysis & Automated Quick Fixes
 */

import { createElement } from '../utils/sanitize.js';
import { SECTION_TYPES } from '../core/schema.js';
import { ACTION_VERBS } from '../data/action-verbs.js';
import { generateUUID } from '../utils/id.js';

/**
 * Check status types
 */
const CHECK_STATUS = {
  PASS: 'pass',
  WARNING: 'warning',
  FAIL: 'fail',
  INFO: 'info'
};

/**
 * Standard section headings recognized by ATS
 */
const STANDARD_HEADINGS = [
  'summary', 'professional summary', 'profile', 'objective', 'career objective',
  'experience', 'work experience', 'professional experience', 'employment history',
  'education', 'academic background', 'qualifications',
  'skills', 'technical skills', 'core competencies',
  'certifications', 'certificates', 'licenses',
  'projects', 'portfolio',
  'achievements', 'awards', 'accomplishments',
  'publications', 'research',
  'volunteer', 'volunteer experience',
  'languages'
];

/**
 * ATSChecker class
 */
export class ATSChecker {
  constructor() {
    this.results = null;
  }

  /**
   * Analyzes document for ATS compatibility
   * @param {Object} document - Document data
   * @param {Object} designSettings - Design settings
   * @param {string} jobDescription - Optional job description for keyword matching
   * @returns {Object} Analysis results
   */
  analyze(document, designSettings = {}, jobDescription = '') {
    const checks = [];

    // Personal info checks
    checks.push(this.checkName(document));
    checks.push(this.checkContactInfo(document));

    // Section checks
    checks.push(this.checkProfessionalSummary(document));
    checks.push(this.checkSectionHeadings(document));
    checks.push(this.checkDateFormat(document));
    checks.push(this.checkContentSections(document));

    // Design checks
    checks.push(this.checkImages(document, designSettings));
    checks.push(this.checkLayout(designSettings));
    checks.push(this.checkFonts(designSettings));
    checks.push(this.checkTables(document, designSettings));

    // Content checks
    checks.push(this.checkLength(document));
    checks.push(this.checkAchievements(document));
    checks.push(this.checkActionVerbs(document));
    checks.push(this.checkMeasurableResults(document));
    checks.push(this.checkSkills(document));

    // Text formatting checks
    checks.push(this.checkTextFormatting(document));
    checks.push(this.checkTextSelectability(document));

    // Job description matching
    if (jobDescription) {
      checks.push(this.checkKeywordMatch(document, jobDescription));
    }

    // Calculate score
    const score = this.calculateScore(checks);

    this.results = {
      score,
      checks,
      timestamp: new Date().toISOString()
    };

    return this.results;
  }

  /**
   * Checks if name is present
   */
  checkName(document) {
    const hasName = document.personalInfo && document.personalInfo.fullName && document.personalInfo.fullName.trim().length > 0;

    return {
      id: 'name',
      name: 'Full Name Present',
      status: hasName ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL,
      message: hasName ? 'Name is present' : 'Name is missing',
      suggestion: hasName ? null : 'Add your full name to the personal information section',
      quickFix: hasName ? null : {
        label: 'Focus Name Field',
        action: 'focus-name'
      }
    };
  }

  /**
   * Checks contact information
   */
  checkContactInfo(document) {
    const pi = document.personalInfo || {};
    const hasEmail = pi.email && pi.email.trim().length > 0;
    const hasPhone = pi.phone && pi.phone.trim().length > 0;

    let status = CHECK_STATUS.PASS;
    let message = 'Contact information is complete';
    let suggestion = null;
    let quickFix = null;

    if (!hasEmail && !hasPhone) {
      status = CHECK_STATUS.FAIL;
      message = 'No contact information provided';
      suggestion = 'Add at least an email address or phone number';
      quickFix = { label: 'Focus Contact Info', action: 'focus-contact' };
    } else if (!hasEmail) {
      status = CHECK_STATUS.WARNING;
      message = 'Email address is missing';
      suggestion = 'Consider adding an email address';
      quickFix = { label: 'Focus Email', action: 'focus-email' };
    } else if (!hasPhone) {
      status = CHECK_STATUS.WARNING;
      message = 'Phone number is missing';
      suggestion = 'Consider adding a phone number';
      quickFix = { label: 'Focus Phone', action: 'focus-phone' };
    }

    return {
      id: 'contact',
      name: 'Contact Information',
      status,
      message,
      suggestion,
      quickFix
    };
  }

  /**
   * Checks for professional summary
   */
  checkProfessionalSummary(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    const hasSummary = (document.personalInfo?.summary && document.personalInfo.summary.trim().length > 20) ||
      sections.some(section =>
        section.type === SECTION_TYPES.PROFESSIONAL_SUMMARY ||
        section.type === SECTION_TYPES.CAREER_OBJECTIVE ||
        section.sectionType === 'summary' ||
        (section.title && /summary|profile|objective/i.test(section.title) && (section.content?.trim() || section.items?.length))
      );

    return {
      id: 'summary',
      name: 'Professional Summary',
      status: hasSummary ? CHECK_STATUS.PASS : CHECK_STATUS.WARNING,
      message: hasSummary ? 'Professional summary present' : 'No professional summary found',
      suggestion: hasSummary ? null : 'Add a professional summary to highlight your key qualifications',
      quickFix: hasSummary ? null : {
        label: '⚡ Add Professional Summary',
        action: 'add-summary'
      }
    };
  }

  /**
   * Checks section headings
   */
  checkSectionHeadings(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    if (!sections || sections.length === 0) {
      return {
        id: 'headings',
        name: 'Section Headings',
        status: CHECK_STATUS.INFO,
        message: 'No sections found',
        suggestion: null
      };
    }

    const nonStandardHeadings = [];

    sections.forEach(section => {
      if (section.visible === false) return;

      const titleLower = (section.title || '').toLowerCase().trim();
      const isStandard = STANDARD_HEADINGS.some(heading => heading === titleLower);

      if (!isStandard && (section.type === 'custom' || section.sectionType === 'custom' || !section.type)) {
        nonStandardHeadings.push(section.title);
      }
    });

    if (nonStandardHeadings.length === 0) {
      return {
        id: 'headings',
        name: 'Section Headings',
        status: CHECK_STATUS.PASS,
        message: 'All section headings are ATS-friendly',
        suggestion: null
      };
    }

    return {
      id: 'headings',
      name: 'Section Headings',
      status: CHECK_STATUS.WARNING,
      message: `${nonStandardHeadings.length} non-standard heading(s) found`,
      suggestion: `Consider using standard headings: ${nonStandardHeadings.join(', ')}`,
      quickFix: {
        label: '⚡ Standardize Headings',
        action: 'standardize-headings',
        details: nonStandardHeadings
      }
    };
  }

  /**
   * Checks date format consistency
   */
  checkDateFormat(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    const formats = new Map();

    sections.forEach(section => {
      if (section.visible === false || !section.items) return;
      section.items.forEach(item => {
        ['startMonth', 'endMonth'].forEach(field => {
          const val = item[field];
          if (!val) return;
          const isNumeric = /^\d+$/.test(val);
          const isShort = /^[A-Z][a-z]{2}$/.test(val);
          const isLong = /^[A-Z][a-z]{3,}$/.test(val);
          const fmt = isNumeric ? 'numeric' : isShort ? 'short' : isLong ? 'long' : 'other';
          formats.set(fmt, (formats.get(fmt) || 0) + 1);
        });
      });
    });

    if (formats.size <= 1) {
      return { id: 'dates', name: 'Date Format', status: CHECK_STATUS.PASS, message: 'Date formats are consistent', suggestion: null };
    }

    return {
      id: 'dates',
      name: 'Date Format',
      status: CHECK_STATUS.WARNING,
      message: `Mixed date formats detected (${[...formats.keys()].join(', ')})`,
      suggestion: 'Use standard 3-letter month abbreviations (e.g. Jan, Feb) across all dates',
      quickFix: {
        label: '⚡ Standardize Dates (MMM YYYY)',
        action: 'standardize-dates'
      }
    };
  }

  /**
   * Checks for content sections
   */
  checkContentSections(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    if (!sections || sections.length === 0) {
      return {
        id: 'content',
        name: 'Content Sections',
        status: CHECK_STATUS.FAIL,
        message: 'No content sections found',
        suggestion: 'Add sections like Experience, Education, and Skills'
      };
    }

    const sectionsWithContent = sections.filter(section =>
      section.visible !== false && ((section.items && section.items.length > 0) || (section.content && section.content.trim().length > 0))
    ).length;

    if (sectionsWithContent === 0) {
      return {
        id: 'content',
        name: 'Content Sections',
        status: CHECK_STATUS.FAIL,
        message: 'No sections have content',
        suggestion: 'Add content to your resume sections'
      };
    }

    if (sectionsWithContent < 3) {
      return {
        id: 'content',
        name: 'Content Sections',
        status: CHECK_STATUS.WARNING,
        message: `Only ${sectionsWithContent} section(s) with content`,
        suggestion: 'Consider adding more core sections (Experience, Education, Skills)'
      };
    }

    return {
      id: 'content',
      name: 'Content Sections',
      status: CHECK_STATUS.PASS,
      message: `${sectionsWithContent} sections with content`,
      suggestion: null
    };
  }

  /**
   * Checks for images in critical areas
   */
  checkImages(document, designSettings) {
    const hasPhoto = document.personalInfo && (document.personalInfo.photograph || document.personalInfo.photo);
    const photoInHeader = designSettings.showPhoto !== false;

    if (hasPhoto && photoInHeader) {
      return {
        id: 'images',
        name: 'Images in Content',
        status: CHECK_STATUS.WARNING,
        message: 'Profile photo is included',
        suggestion: 'Some ATS systems struggle with image headers. Remove photo for pure ATS submissions.'
      };
    }

    return {
      id: 'images',
      name: 'Images in Content',
      status: CHECK_STATUS.PASS,
      message: 'No problematic images detected',
      suggestion: null
    };
  }

  /**
   * Checks layout complexity
   */
  checkLayout(designSettings) {
    const columns = designSettings?.columnCount || 1;
    const isAtsMode = designSettings?.atsMode === true;

    if (columns > 1 && !isAtsMode) {
      return {
        id: 'layout',
        name: 'Layout Structure',
        status: CHECK_STATUS.WARNING,
        message: 'Multi-column layout detected without ATS-safe mode',
        suggestion: 'Single-column linear layouts parse with highest accuracy across all ATS systems.',
        quickFix: {
          label: '⚡ Enable ATS-Safe Mode',
          action: 'enable-ats-mode'
        }
      };
    }

    return {
      id: 'layout',
      name: 'Layout Structure',
      status: CHECK_STATUS.PASS,
      message: 'Single-column or ATS-safe layout configured',
      suggestion: null
    };
  }

  /**
   * Checks font usage
   */
  checkFonts(designSettings) {
    const standardFonts = [
      'arial', 'helvetica', 'times new roman', 'times', 'courier', 'courier new',
      'georgia', 'garamond', 'verdana', 'calibri', 'cambria', 'inter', 'roboto', 'open sans', 'lato'
    ];

    const fontFamily = (designSettings?.fontFamily || 'inter').toLowerCase();
    const isStandard = standardFonts.some(font => fontFamily.includes(font));

    if (!isStandard) {
      return {
        id: 'fonts',
        name: 'Font Selection',
        status: CHECK_STATUS.WARNING,
        message: 'Non-standard decorative font detected',
        suggestion: 'Use an ATS-safe font: Arial, Calibri, Helvetica, Georgia, Garamond, or Inter',
        quickFix: {
          label: '⚡ Switch to Arial (ATS-Safe)',
          action: 'set-font-arial'
        }
      };
    }

    return {
      id: 'fonts',
      name: 'Font Selection',
      status: CHECK_STATUS.PASS,
      message: 'Standard ATS-friendly font is selected',
      suggestion: null
    };
  }

  /**
   * Checks for tables in content
   */
  checkTables(document, designSettings) {
    const columnCount = designSettings?.columnCount || 1;
    if (columnCount > 1 && !designSettings?.atsMode) {
      return {
        id: 'tables',
        name: 'Layout Structure',
        status: CHECK_STATUS.WARNING,
        message: `Multi-column layout detected (${columnCount} columns).`,
        suggestion: 'Switch to a single-column layout or enable ATS Mode for maximum compatibility',
        quickFix: {
          label: '⚡ Enable ATS-Safe Mode',
          action: 'enable-ats-mode'
        }
      };
    }
    return { id: 'tables', name: 'Layout Structure', status: CHECK_STATUS.PASS, message: 'Clean single-column structure — ATS-friendly', suggestion: null };
  }

  /**
   * Checks document length
   */
  checkLength(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    let totalItems = 0;
    let totalBullets = 0;

    sections.forEach(section => {
      if (section.items) {
        totalItems += section.items.length;
        section.items.forEach(item => {
          if (item.achievements) totalBullets += item.achievements.length;
        });
      }
    });

    let estimatedPages = 1;
    if (totalItems > 12 || totalBullets > 18) estimatedPages = 2;
    if (totalItems > 25 || totalBullets > 35) estimatedPages = 3;

    if (estimatedPages > 2) {
      return {
        id: 'length',
        name: 'Document Length',
        status: CHECK_STATUS.WARNING,
        message: `Document may exceed 2 pages (~${estimatedPages} pages)`,
        suggestion: 'Condense content to 1-2 pages for standard industry ATS screening'
      };
    }

    return {
      id: 'length',
      name: 'Document Length',
      status: CHECK_STATUS.PASS,
      message: `Appropriate length (~${estimatedPages} page(s))`,
      suggestion: null
    };
  }

  /**
   * Checks for measurable achievements
   */
  checkAchievements(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    let totalBullets = 0;
    let bulletsWithNumbers = 0;

    sections.forEach(section => {
      if (!section.items) return;
      section.items.forEach(item => {
        if (item.achievements) {
          item.achievements.forEach(achievement => {
            const text = typeof achievement === 'string' ? achievement : (achievement?.text || '');
            if (text.trim().length > 5) {
              totalBullets++;
              if (/\d+/.test(text)) {
                bulletsWithNumbers++;
              }
            }
          });
        }
      });
    });

    if (totalBullets === 0) {
      return {
        id: 'achievements',
        name: 'Measurable Achievements',
        status: CHECK_STATUS.INFO,
        message: 'No achievement bullets found',
        suggestion: 'Add quantifiable accomplishments with %, $, or numbers'
      };
    }

    const percentage = Math.round((bulletsWithNumbers / totalBullets) * 100);

    if (percentage < 35) {
      return {
        id: 'achievements',
        name: 'Measurable Achievements',
        status: CHECK_STATUS.WARNING,
        message: `Only ${percentage}% of bullets include quantifiable metrics (${bulletsWithNumbers}/${totalBullets})`,
        suggestion: 'Add numbers, percentages, or dollar amounts to quantify your achievements (e.g., "Increased sales by 32%")'
      };
    }

    return {
      id: 'achievements',
      name: 'Measurable Achievements',
      status: CHECK_STATUS.PASS,
      message: `${percentage}% of bullets include metrics (${bulletsWithNumbers}/${totalBullets})`,
      suggestion: null
    };
  }

  /**
   * Checks for action verbs
   */
  checkActionVerbs(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    let totalBullets = 0;
    let bulletsWithActionVerbs = 0;

    const actionVerbSet = new Set(ACTION_VERBS.map(v => v.toLowerCase()));

    sections.forEach(section => {
      if (!section.items) return;
      section.items.forEach(item => {
        if (item.achievements) {
          item.achievements.forEach(achievement => {
            const text = typeof achievement === 'string' ? achievement : (achievement?.text || '');
            if (text.trim().length > 5) {
              totalBullets++;
              const firstWord = text.trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, '').toLowerCase();
              if (actionVerbSet.has(firstWord)) {
                bulletsWithActionVerbs++;
              }
            }
          });
        }
      });
    });

    if (totalBullets === 0) {
      return {
        id: 'actionVerbs',
        name: 'Action Verbs',
        status: CHECK_STATUS.INFO,
        message: 'No bullets to analyze',
        suggestion: null
      };
    }

    const percentage = Math.round((bulletsWithActionVerbs / totalBullets) * 100);

    if (percentage < 50) {
      return {
        id: 'actionVerbs',
        name: 'Action Verbs',
        status: CHECK_STATUS.WARNING,
        message: `Only ${percentage}% of bullets start with strong action verbs (${bulletsWithActionVerbs}/${totalBullets})`,
        suggestion: 'Begin bullet points with dynamic verbs: "Architected", "Engineered", "Spearheaded", "Delivered"'
      };
    }

    return {
      id: 'actionVerbs',
      name: 'Action Verbs',
      status: CHECK_STATUS.PASS,
      message: `${percentage}% of bullets start with action verbs (${bulletsWithActionVerbs}/${totalBullets})`,
      suggestion: null
    };
  }

  /**
   * Checks for measurable results
   */
  checkMeasurableResults(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    let totalBullets = 0;
    let bulletsWithMetrics = 0;
    const metricPattern = /\d+[\s]*[%$+]|\$[\d,]+|[\d,]+\s*(users|clients|customers|people|employees|engineers|team|projects|percent|times|years|months|hours|pages|million|billion|k\b)/i;

    sections.forEach(section => {
      if (section.visible === false || !section.items) return;
      section.items.forEach(item => {
        const bullets = item.achievements || item.highlights || [];
        bullets.forEach(b => {
          const text = typeof b === 'string' ? b : (b && b.text ? b.text : '');
          if (text.trim().length < 5) return;
          totalBullets++;
          if (metricPattern.test(text) || /\d/.test(text)) bulletsWithMetrics++;
        });
      });
    });

    if (totalBullets === 0) {
      return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.INFO, message: 'No bullet points found to evaluate', suggestion: 'Add achievement bullets with specific numbers and percentages' };
    }

    const pct = Math.round((bulletsWithMetrics / totalBullets) * 100);
    if (pct >= 55) {
      return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.PASS, message: `${pct}% of bullets include metrics (${bulletsWithMetrics}/${totalBullets})`, suggestion: null };
    } else if (pct >= 30) {
      return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.WARNING, message: `Only ${pct}% of bullets include metrics (${bulletsWithMetrics}/${totalBullets})`, suggestion: 'Aim for 55%+ of bullets to include specific numbers, percentages, or dollar amounts' };
    }
    return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.FAIL, message: `Only ${pct}% of bullets include metrics (${bulletsWithMetrics}/${totalBullets})`, suggestion: 'Add quantifiable achievements: "increased revenue by 25%", "managed team of 8"' };
  }

  /**
   * Checks skills section
   */
  checkSkills(document) {
    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    const hasSkillsSection = sections.some(section =>
      section.type === SECTION_TYPES.SKILLS ||
      section.type === SECTION_TYPES.TECHNICAL_SKILLS ||
      section.type === SECTION_TYPES.CORE_COMPETENCIES ||
      section.sectionType === 'skills' ||
      /skills|technologies|competencies/i.test(section.title || '')
    );

    if (!hasSkillsSection) {
      return {
        id: 'skills',
        name: 'Skills Section',
        status: CHECK_STATUS.WARNING,
        message: 'No skills section found',
        suggestion: 'Add a skills section with relevant keywords for your target role',
        quickFix: {
          label: '⚡ Add Skills Section',
          action: 'add-skills'
        }
      };
    }

    return {
      id: 'skills',
      name: 'Skills Section',
      status: CHECK_STATUS.PASS,
      message: 'Skills section present',
      suggestion: null
    };
  }

  /**
   * Checks text formatting issues
   */
  checkTextFormatting(document) {
    let hasAllCaps = false;

    if (document.personalInfo && document.personalInfo.fullName) {
      const name = document.personalInfo.fullName.trim();
      if (name === name.toUpperCase() && name.length > 3 && /[A-Z]/.test(name)) {
        hasAllCaps = true;
      }
    }

    if (hasAllCaps) {
      return {
        id: 'formatting',
        name: 'Text Formatting',
        status: CHECK_STATUS.WARNING,
        message: 'ALL-CAPS formatting detected in name or headings',
        suggestion: 'Avoid all-capitalized names or phrases for optimal ATS character recognition',
        quickFix: {
          label: '⚡ Fix Capitalization',
          action: 'fix-capitalization'
        }
      };
    }

    return {
      id: 'formatting',
      name: 'Text Formatting',
      status: CHECK_STATUS.PASS,
      message: 'Text formatting appears clean and readable',
      suggestion: null
    };
  }

  /**
   * Checks text selectability
   */
  checkTextSelectability(document) {
    const pi = document.personalInfo || {};
    const hasPhoto = !!(pi.photograph || pi.photo);
    if (hasPhoto) {
      return {
        id: 'selectability', name: 'Text vs Images', status: CHECK_STATUS.INFO,
        message: 'Profile photo detected. ATS systems cannot read images — ensure all key information is in text fields.',
        suggestion: 'Remove the photo for ATS submissions, or keep it only for direct applications'
      };
    }
    return { id: 'selectability', name: 'Text vs Images', status: CHECK_STATUS.PASS, message: 'All content is text-based — ATS-friendly', suggestion: null };
  }

  /**
   * Checks keyword match with job description
   */
  checkKeywordMatch(document, jobDescription) {
    if (!jobDescription || jobDescription.trim().length === 0) {
      return {
        id: 'keywords',
        name: 'Keyword Matching',
        status: CHECK_STATUS.INFO,
        message: 'No job description provided for comparison',
        suggestion: 'Paste a job description to check keyword alignment'
      };
    }

    const jdWords = this.extractKeywords(jobDescription);
    const resumeText = this.extractResumeText(document);
    const resumeWords = this.extractKeywords(resumeText);

    const missingKeywords = jdWords.filter(word => !resumeWords.includes(word)).slice(0, 10);

    if (missingKeywords.length > 0) {
      return {
        id: 'keywords',
        name: 'Keyword Matching',
        status: CHECK_STATUS.WARNING,
        message: `${missingKeywords.length} key terms from job description are missing`,
        suggestion: `Consider incorporating: ${missingKeywords.slice(0, 5).join(', ')}`
      };
    }

    return {
      id: 'keywords',
      name: 'Keyword Matching',
      status: CHECK_STATUS.PASS,
      message: 'Strong keyword alignment with job description',
      suggestion: null
    };
  }

  /**
   * Executes a direct automated Quick-Fix on the document data
   * @param {string} action - Quick fix action name
   * @param {Object} document - Document data
   * @returns {boolean} True if document was modified
   */
  applyQuickFix(action, document) {
    if (!document) return false;
    let modified = false;

    if (action === 'add-summary') {
      const sections = Array.isArray(document.sections) ? document.sections : [];
      let sumSec = sections.find(s => s.type === SECTION_TYPES.PROFESSIONAL_SUMMARY || (s.title && /summary|profile/i.test(s.title)));
      if (!sumSec) {
        if (!document.sections) document.sections = [];
        const summaryText = document.personalInfo?.summary?.trim() ||
          'Results-driven professional with proven expertise in delivering impactful solutions, optimizing workflows, and collaborating across cross-functional teams to drive organizational growth.';
        
        if (!document.personalInfo) document.personalInfo = {};
        document.personalInfo.summary = summaryText;

        document.sections.unshift({
          id: generateUUID(),
          sectionType: 'custom',
          type: 'custom',
          title: 'Professional Summary',
          content: summaryText,
          visible: true,
          column: 'main',
          order: 0
        });
        modified = true;
      }
    } else if (action === 'standardize-headings') {
      const headingMap = {
        'work history': 'Professional Experience',
        'employment history': 'Professional Experience',
        'career history': 'Professional Experience',
        'my experience': 'Professional Experience',
        'jobs': 'Professional Experience',
        'studies': 'Education',
        'academic history': 'Education',
        'qualifications': 'Education',
        'abilities': 'Skills',
        'technologies': 'Skills',
        'tech stack': 'Skills',
        'certificates': 'Certifications',
        'my projects': 'Projects'
      };
      const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
      sections.forEach(s => {
        const lower = (s.title || '').trim().toLowerCase();
        if (headingMap[lower]) {
          s.title = headingMap[lower];
          modified = true;
        }
      });
    } else if (action === 'add-skills') {
      const sections = Array.isArray(document.sections) ? document.sections : [];
      let skillSec = sections.find(s => s.sectionType === 'skills' || s.type === 'skills' || /skills/i.test(s.title || ''));
      if (!skillSec) {
        if (!document.sections) document.sections = [];
        document.sections.push({
          id: generateUUID(),
          sectionType: 'skills',
          type: 'skills',
          title: 'Skills',
          items: [
            { id: generateUUID(), name: 'Project Management', category: 'General', order: 0 },
            { id: generateUUID(), name: 'Problem Solving', category: 'General', order: 1 },
            { id: generateUUID(), name: 'Cross-Functional Collaboration', category: 'General', order: 2 }
          ],
          visible: true,
          column: 'main',
          order: document.sections.length
        });
        modified = true;
      }
    } else if (action === 'enable-ats-mode') {
      if (!document.settings) document.settings = {};
      document.settings.atsMode = true;
      modified = true;
    } else if (action === 'set-font-arial') {
      if (!document.design) document.design = {};
      document.design.fontFamily = 'Arial';
      modified = true;
    } else if (action === 'fix-capitalization') {
      if (document.personalInfo?.fullName && document.personalInfo.fullName === document.personalInfo.fullName.toUpperCase()) {
        document.personalInfo.fullName = document.personalInfo.fullName
          .toLowerCase()
          .replace(/\b\w/g, c => c.toUpperCase());
        modified = true;
      }
      if (document.personalInfo?.professionalTitle && document.personalInfo.professionalTitle === document.personalInfo.professionalTitle.toUpperCase()) {
        document.personalInfo.professionalTitle = document.personalInfo.professionalTitle
          .toLowerCase()
          .replace(/\b\w/g, c => c.toUpperCase());
        modified = true;
      }
    } else if (action === 'standardize-dates') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
      sections.forEach(s => {
        if (s.items && Array.isArray(s.items)) {
          s.items.forEach(item => {
            ['startMonth', 'endMonth'].forEach(field => {
              const val = item[field];
              if (val && /^\d+$/.test(val)) {
                const num = parseInt(val, 10);
                if (num >= 1 && num <= 12) {
                  item[field] = monthNames[num - 1];
                  modified = true;
                }
              }
            });
          });
        }
      });
    }

    return modified;
  }

  /**
   * Extracts keywords from text
   */
  extractKeywords(text) {
    const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what']);
    const words = (text || '').toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const filtered = words.filter(word => !commonWords.has(word));

    const frequency = {};
    filtered.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
  }

  /**
   * Extracts all text from resume
   */
  extractResumeText(document) {
    const parts = [];

    if (document.personalInfo) {
      Object.values(document.personalInfo).forEach(value => {
        if (typeof value === 'string') {
          parts.push(value);
        }
      });
    }

    const sections = Array.isArray(document.sections) ? document.sections : Object.values(document.sections || {});
    sections.forEach(section => {
      if (section.title) parts.push(section.title);
      if (section.content) parts.push(section.content);

      if (section.items) {
        section.items.forEach(item => {
          Object.values(item).forEach(value => {
            if (typeof value === 'string') {
              parts.push(value);
            } else if (Array.isArray(value)) {
              value.forEach(subItem => {
                if (typeof subItem === 'string') {
                  parts.push(subItem);
                } else if (subItem && subItem.text) {
                  parts.push(subItem.text);
                }
              });
            }
          });
        });
      }
    });

    return parts.join(' ');
  }

  /**
   * Calculates overall score
   */
  calculateScore(checks) {
    const totalChecks = checks.length;
    if (totalChecks === 0) return 100;
    const passedChecks = checks.filter(check => check.status === CHECK_STATUS.PASS).length;
    const warningChecks = checks.filter(check => check.status === CHECK_STATUS.WARNING).length;

    return Math.min(100, Math.round(((passedChecks + (warningChecks * 0.5)) / totalChecks) * 100));
  }

  /**
   * Renders analysis results
   * @param {Object} results - Analysis results
   * @param {Function} onQuickFix - Callback when quick fix button is clicked
   * @returns {HTMLElement} Results element
   */
  render(results = null, onQuickFix = null) {
    const analysisResults = results || this.results;

    if (!analysisResults) {
      return createElement('div', 'No analysis results available', { class: 'ats-checker-empty' });
    }

    const container = createElement('div', '', { class: 'ats-checker-container' });

    // Disclaimer
    const disclaimer = createElement('div', '', { class: 'ats-checker-disclaimer' });
    const disclaimerText = createElement('p', 'This checker evaluates ATS compatibility against modern recruiting algorithms.', {
      class: 'ats-checker-disclaimer-text'
    });
    disclaimer.appendChild(disclaimerText);
    container.appendChild(disclaimer);

    // Score
    const scoreContainer = createElement('div', '', { class: 'ats-checker-score' });
    const scoreLabel = createElement('div', 'ATS Compatibility Score', { class: 'ats-checker-score-label' });
    scoreContainer.appendChild(scoreLabel);

    const scoreValue = createElement('div', `${analysisResults.score}%`, {
      class: `ats-checker-score-value ${this.getScoreClass(analysisResults.score)}`
    });
    scoreContainer.appendChild(scoreValue);

    container.appendChild(scoreContainer);

    // Checks list
    const checksList = createElement('div', '', { class: 'ats-checker-checks' });

    analysisResults.checks.forEach(check => {
      const checkItem = this.renderCheck(check, onQuickFix);
      checksList.appendChild(checkItem);
    });

    container.appendChild(checksList);

    return container;
  }

  /**
   * Renders a single check item with optional Quick-Fix action button
   */
  renderCheck(check, onQuickFix = null) {
    const item = createElement('div', '', {
      class: `ats-check-item ats-check-${check.status}`
    });

    const indicator = createElement('div', this.getStatusIcon(check.status), {
      class: 'ats-check-indicator'
    });
    item.appendChild(indicator);

    const content = createElement('div', '', { class: 'ats-check-content' });

    const headerRow = createElement('div', '', { class: 'ats-check-header-row', style: 'display:flex; justify-content:space-between; align-items:center;' });
    const name = createElement('div', check.name, { class: 'ats-check-name' });
    headerRow.appendChild(name);

    if (check.quickFix && check.status !== CHECK_STATUS.PASS) {
      const fixBtn = createElement('button', check.quickFix.label, {
        class: 'btn-ats-quickfix',
        style: 'background: var(--color-primary, #6366f1); color: #fff; border: none; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-weight: 600; margin-left: 8px;'
      });
      fixBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onQuickFix === 'function') {
          onQuickFix(check.quickFix.action, check);
        }
      });
      headerRow.appendChild(fixBtn);
    }

    content.appendChild(headerRow);

    const message = createElement('div', check.message, { class: 'ats-check-message' });
    content.appendChild(message);

    if (check.suggestion) {
      const suggestion = createElement('div', check.suggestion, { class: 'ats-check-suggestion' });
      content.appendChild(suggestion);
    }

    item.appendChild(content);

    return item;
  }

  /**
   * Gets status icon
   */
  getStatusIcon(status) {
    const icons = {
      [CHECK_STATUS.PASS]: '✓',
      [CHECK_STATUS.WARNING]: '⚠',
      [CHECK_STATUS.FAIL]: '✕',
      [CHECK_STATUS.INFO]: 'ℹ'
    };
    return icons[status] || '•';
  }

  /**
   * Gets score color class
   */
  getScoreClass(score) {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  }
}

export default ATSChecker;
