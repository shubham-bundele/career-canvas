/**
 * ATS Checker Module
 * Local rule-based ATS compatibility analysis
 */

import { createElement } from '../utils/sanitize.js';
import { SECTION_TYPES } from '../core/schema.js';

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
 * Common action verbs for resume bullets
 */
const ACTION_VERBS = [
  'achieved', 'administered', 'analyzed', 'authored', 'built', 'completed', 'conducted',
  'created', 'delivered', 'demonstrated', 'designed', 'developed', 'directed', 'drove',
  'enhanced', 'established', 'executed', 'expanded', 'generated', 'grew', 'implemented',
  'improved', 'increased', 'initiated', 'launched', 'led', 'managed', 'optimized',
  'organized', 'oversaw', 'performed', 'planned', 'produced', 'reduced', 'resolved',
  'spearheaded', 'streamlined', 'strengthened', 'structured', 'supervised', 'transformed'
];

/**
 * Standard section headings recognized by ATS
 */
const STANDARD_HEADINGS = [
  'summary', 'professional summary', 'profile', 'objective',
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
      suggestion: hasName ? null : 'Add your full name to the personal information section'
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

    if (!hasEmail && !hasPhone) {
      status = CHECK_STATUS.FAIL;
      message = 'No contact information provided';
      suggestion = 'Add at least an email address or phone number';
    } else if (!hasEmail) {
      status = CHECK_STATUS.WARNING;
      message = 'Email address is missing';
      suggestion = 'Consider adding an email address';
    } else if (!hasPhone) {
      status = CHECK_STATUS.WARNING;
      message = 'Phone number is missing';
      suggestion = 'Consider adding a phone number';
    }

    return {
      id: 'contact',
      name: 'Contact Information',
      status,
      message,
      suggestion
    };
  }

  /**
   * Checks for professional summary
   */
  checkProfessionalSummary(document) {
    const hasSummary = document.sections && Object.values(document.sections).some(section =>
      section.type === SECTION_TYPES.PROFESSIONAL_SUMMARY ||
      section.type === SECTION_TYPES.CAREER_OBJECTIVE
    );

    return {
      id: 'summary',
      name: 'Professional Summary',
      status: hasSummary ? CHECK_STATUS.PASS : CHECK_STATUS.WARNING,
      message: hasSummary ? 'Professional summary present' : 'No professional summary found',
      suggestion: hasSummary ? null : 'Add a professional summary to highlight your key qualifications'
    };
  }

  /**
   * Checks section headings
   */
  checkSectionHeadings(document) {
    if (!document.sections) {
      return {
        id: 'headings',
        name: 'Section Headings',
        status: CHECK_STATUS.INFO,
        message: 'No sections found',
        suggestion: null
      };
    }

    const nonStandardHeadings = [];

    Object.values(document.sections).forEach(section => {
      if (!section.visible) return;

      const titleLower = section.title.toLowerCase().trim();
      const isStandard = STANDARD_HEADINGS.some(heading => heading === titleLower);

      if (!isStandard && section.type === 'custom') {
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
      suggestion: `Consider using standard headings. Non-standard: ${nonStandardHeadings.join(', ')}`
    };
  }

  /**
   * Checks date format consistency
   */
  checkDateFormat(document) {
    const sections = document.sections || [];
    const formats = new Map();

    sections.forEach(section => {
      if (!section.visible || !section.items) return;
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

    const dominant = [...formats.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const inconsistent = [...formats.keys()].filter(k => k !== dominant);
    return {
      id: 'dates', name: 'Date Format', status: CHECK_STATUS.WARNING,
      message: `Mixed date formats detected (${[...formats.keys()].join(', ')})`,
      suggestion: 'Use a consistent date format throughout your resume'
    };
  }

  /**
   * Checks for content sections
   */
  checkContentSections(document) {
    if (!document.sections) {
      return {
        id: 'content',
        name: 'Content Sections',
        status: CHECK_STATUS.FAIL,
        message: 'No content sections found',
        suggestion: 'Add sections like Experience, Education, and Skills'
      };
    }

    const sectionsWithContent = Object.values(document.sections).filter(section =>
      section.visible && section.items && section.items.length > 0
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
        suggestion: 'Consider adding more sections to provide a complete picture'
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
    const hasPhoto = document.personalInfo && document.personalInfo.photograph;
    const photoInHeader = designSettings.showPhoto !== false;

    if (hasPhoto && photoInHeader) {
      return {
        id: 'images',
        name: 'Images in Content',
        status: CHECK_STATUS.WARNING,
        message: 'Profile photo is included',
        suggestion: 'Some ATS systems may have difficulty with images. Consider removing for maximum compatibility.'
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
    const columns = designSettings.columnCount || 1;

    if (columns > 1) {
      return {
        id: 'layout',
        name: 'Layout Structure',
        status: CHECK_STATUS.WARNING,
        message: 'Multi-column layout detected',
        suggestion: 'Single-column layouts are more ATS-friendly. Enable ATS mode for best compatibility.'
      };
    }

    return {
      id: 'layout',
      name: 'Layout Structure',
      status: CHECK_STATUS.PASS,
      message: 'Single-column layout is ATS-friendly',
      suggestion: null
    };
  }

  /**
   * Checks font usage
   */
  checkFonts(designSettings) {
    const standardFonts = [
      'arial', 'helvetica', 'times new roman', 'times', 'courier', 'courier new',
      'georgia', 'verdana', 'calibri', 'cambria'
    ];

    const fontFamily = (designSettings.fontFamily || 'arial').toLowerCase();
    const isStandard = standardFonts.some(font => fontFamily.includes(font));

    if (!isStandard) {
      return {
        id: 'fonts',
        name: 'Font Selection',
        status: CHECK_STATUS.WARNING,
        message: 'Non-standard font detected',
        suggestion: 'Use standard fonts like Arial, Calibri, or Times New Roman for better ATS compatibility'
      };
    }

    return {
      id: 'fonts',
      name: 'Font Selection',
      status: CHECK_STATUS.PASS,
      message: 'Standard font is used',
      suggestion: null
    };
  }

  /**
   * Checks for tables in content
   */
  checkTables(document, designSettings) {
    const columnCount = designSettings?.columnCount || 1;
    if (columnCount > 1) {
      return {
        id: 'tables', name: 'Layout Structure', status: CHECK_STATUS.WARNING,
        message: `Multi-column layout detected (${columnCount} columns). Some ATS systems cannot parse multi-column layouts.`,
        suggestion: 'Switch to a single-column template or enable ATS Mode for maximum compatibility'
      };
    }
    return { id: 'tables', name: 'Layout Structure', status: CHECK_STATUS.PASS, message: 'Single-column layout — ATS-friendly', suggestion: null };
  }

  /**
   * Checks document length
   */
  checkLength(document) {
    // Estimate page count based on sections and content
    let estimatedPages = 1;

    if (document.sections) {
      const totalItems = Object.values(document.sections).reduce((sum, section) => {
        return sum + (section.items ? section.items.length : 0);
      }, 0);

      if (totalItems > 15) estimatedPages = 2;
      if (totalItems > 30) estimatedPages = 3;
    }

    if (estimatedPages > 2) {
      return {
        id: 'length',
        name: 'Document Length',
        status: CHECK_STATUS.WARNING,
        message: `Document may exceed 2 pages (estimated ${estimatedPages} pages)`,
        suggestion: 'Consider condensing content. Most resumes should be 1-2 pages.'
      };
    }

    return {
      id: 'length',
      name: 'Document Length',
      status: CHECK_STATUS.PASS,
      message: `Appropriate length (estimated ${estimatedPages} page(s))`,
      suggestion: null
    };
  }

  /**
   * Checks for measurable achievements
   */
  checkAchievements(document) {
    let totalBullets = 0;
    let bulletsWithNumbers = 0;

    if (document.sections) {
      Object.values(document.sections).forEach(section => {
        if (!section.items) return;

        section.items.forEach(item => {
          if (item.achievements) {
            item.achievements.forEach(achievement => {
              if (achievement.text) {
                totalBullets++;
                // Check for numbers or percentages
                if (/\d+/.test(achievement.text)) {
                  bulletsWithNumbers++;
                }
              }
            });
          }
        });
      });
    }

    if (totalBullets === 0) {
      return {
        id: 'achievements',
        name: 'Measurable Achievements',
        status: CHECK_STATUS.INFO,
        message: 'No achievement bullets found',
        suggestion: null
      };
    }

    const percentage = (bulletsWithNumbers / totalBullets) * 100;

    if (percentage < 30) {
      return {
        id: 'achievements',
        name: 'Measurable Achievements',
        status: CHECK_STATUS.WARNING,
        message: `Only ${percentage.toFixed(0)}% of bullets include metrics`,
        suggestion: 'Add numbers, percentages, or other metrics to quantify your achievements'
      };
    }

    return {
      id: 'achievements',
      name: 'Measurable Achievements',
      status: CHECK_STATUS.PASS,
      message: `${percentage.toFixed(0)}% of bullets include metrics`,
      suggestion: null
    };
  }

  /**
   * Checks for action verbs
   */
  checkActionVerbs(document) {
    let totalBullets = 0;
    let bulletsWithActionVerbs = 0;

    if (document.sections) {
      Object.values(document.sections).forEach(section => {
        if (!section.items) return;

        section.items.forEach(item => {
          if (item.achievements) {
            item.achievements.forEach(achievement => {
              if (achievement.text) {
                totalBullets++;
                const firstWord = achievement.text.trim().split(/\s+/)[0].toLowerCase();
                if (ACTION_VERBS.includes(firstWord)) {
                  bulletsWithActionVerbs++;
                }
              }
            });
          }
        });
      });
    }

    if (totalBullets === 0) {
      return {
        id: 'actionVerbs',
        name: 'Action Verbs',
        status: CHECK_STATUS.INFO,
        message: 'No bullets to analyze',
        suggestion: null
      };
    }

    const percentage = (bulletsWithActionVerbs / totalBullets) * 100;

    if (percentage < 50) {
      return {
        id: 'actionVerbs',
        name: 'Action Verbs',
        status: CHECK_STATUS.WARNING,
        message: `Only ${percentage.toFixed(0)}% of bullets start with action verbs`,
        suggestion: 'Start bullet points with strong action verbs like "developed", "managed", "led"'
      };
    }

    return {
      id: 'actionVerbs',
      name: 'Action Verbs',
      status: CHECK_STATUS.PASS,
      message: `${percentage.toFixed(0)}% of bullets start with action verbs`,
      suggestion: null
    };
  }

  /**
   * Checks for measurable results
   */
  checkMeasurableResults(document) {
    const sections = document.sections || [];
    let totalBullets = 0;
    let bulletsWithMetrics = 0;
    const metricPattern = /\d+[\s]*[%$+]|\$[\d,]+|[\d,]+\s*(users|clients|customers|people|employees|engineers|team|projects|percent|times|years|months|hours|pages|million|billion|k\b)/i;

    sections.forEach(section => {
      if (!section.visible || !section.items) return;
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
    if (pct >= 60) {
      return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.PASS, message: `${pct}% of bullets include metrics (${bulletsWithMetrics}/${totalBullets})`, suggestion: null };
    } else if (pct >= 30) {
      return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.WARNING, message: `Only ${pct}% of bullets include metrics (${bulletsWithMetrics}/${totalBullets})`, suggestion: 'Aim for 60%+ of bullets to include specific numbers, percentages, or dollar amounts' };
    }
    return { id: 'results', name: 'Measurable Results', status: CHECK_STATUS.FAIL, message: `Only ${pct}% of bullets include metrics (${bulletsWithMetrics}/${totalBullets})`, suggestion: 'Add quantifiable achievements: "increased revenue by 25%", "managed team of 8"' };
  }

  /**
   * Checks skills section
   */
  checkSkills(document) {
    const hasSkillsSection = document.sections && Object.values(document.sections).some(section =>
      section.type === SECTION_TYPES.SKILLS ||
      section.type === SECTION_TYPES.TECHNICAL_SKILLS ||
      section.type === SECTION_TYPES.CORE_COMPETENCIES
    );

    if (!hasSkillsSection) {
      return {
        id: 'skills',
        name: 'Skills Section',
        status: CHECK_STATUS.WARNING,
        message: 'No skills section found',
        suggestion: 'Add a skills section with relevant keywords for your target role'
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
    // Check for common formatting issues
    let hasAllCaps = false;

    if (document.personalInfo && document.personalInfo.fullName) {
      const name = document.personalInfo.fullName;
      if (name === name.toUpperCase() && name.length > 3) {
        hasAllCaps = true;
      }
    }

    if (hasAllCaps) {
      return {
        id: 'formatting',
        name: 'Text Formatting',
        status: CHECK_STATUS.WARNING,
        message: 'Excessive use of ALL CAPS detected',
        suggestion: 'Avoid using all capitals for entire words or sections'
      };
    }

    return {
      id: 'formatting',
      name: 'Text Formatting',
      status: CHECK_STATUS.PASS,
      message: 'Text formatting appears clean',
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
        message: 'Profile photo detected. ATS systems cannot read images — ensure all key information is in text fields, not embedded in images.',
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

    // Extract keywords from job description (simple word frequency)
    const jdWords = this.extractKeywords(jobDescription);
    const resumeText = this.extractResumeText(document);
    const resumeWords = this.extractKeywords(resumeText);

    // Find missing keywords
    const missingKeywords = jdWords.filter(word => !resumeWords.includes(word)).slice(0, 10);

    if (missingKeywords.length > 0) {
      return {
        id: 'keywords',
        name: 'Keyword Matching',
        status: CHECK_STATUS.WARNING,
        message: `${missingKeywords.length} important keywords from job description are missing`,
        suggestion: `Consider adding: ${missingKeywords.slice(0, 5).join(', ')}`
      };
    }

    return {
      id: 'keywords',
      name: 'Keyword Matching',
      status: CHECK_STATUS.PASS,
      message: 'Good keyword alignment with job description',
      suggestion: null
    };
  }

  /**
   * Extracts keywords from text
   */
  extractKeywords(text) {
    const commonWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'];
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const filtered = words.filter(word => !commonWords.includes(word));

    // Count frequency
    const frequency = {};
    filtered.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return top keywords
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

    if (document.sections) {
      Object.values(document.sections).forEach(section => {
        parts.push(section.title);

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
    }

    return parts.join(' ');
  }

  /**
   * Calculates overall score
   */
  calculateScore(checks) {
    const totalChecks = checks.length;
    const passedChecks = checks.filter(check => check.status === CHECK_STATUS.PASS).length;

    return Math.round((passedChecks / totalChecks) * 100);
  }

  /**
   * Renders analysis results
   * @param {Object} results - Analysis results (optional, uses this.results if not provided)
   * @returns {HTMLElement} Results element
   */
  render(results = null) {
    const analysisResults = results || this.results;

    if (!analysisResults) {
      return createElement('div', 'No analysis results available', { class: 'ats-checker-empty' });
    }

    const container = createElement('div', '', { class: 'ats-checker-container' });

    // Disclaimer
    const disclaimer = createElement('div', '', { class: 'ats-checker-disclaimer' });
    const disclaimerText = createElement('p', 'This checker evaluates formatting practices. No tool can guarantee ATS compatibility.', {
      class: 'ats-checker-disclaimer-text'
    });
    disclaimer.appendChild(disclaimerText);
    container.appendChild(disclaimer);

    // Score
    const scoreContainer = createElement('div', '', { class: 'ats-checker-score' });
    const scoreLabel = createElement('div', 'Format Score', { class: 'ats-checker-score-label' });
    scoreContainer.appendChild(scoreLabel);

    const scoreValue = createElement('div', `${analysisResults.score}%`, {
      class: `ats-checker-score-value ${this.getScoreClass(analysisResults.score)}`
    });
    scoreContainer.appendChild(scoreValue);

    container.appendChild(scoreContainer);

    // Checks list
    const checksList = createElement('div', '', { class: 'ats-checker-checks' });

    analysisResults.checks.forEach(check => {
      const checkItem = this.renderCheck(check);
      checksList.appendChild(checkItem);
    });

    container.appendChild(checksList);

    return container;
  }

  /**
   * Renders a single check item
   */
  renderCheck(check) {
    const item = createElement('div', '', {
      class: `ats-check-item ats-check-${check.status}`
    });

    const indicator = createElement('div', this.getStatusIcon(check.status), {
      class: 'ats-check-indicator'
    });
    item.appendChild(indicator);

    const content = createElement('div', '', { class: 'ats-check-content' });

    const name = createElement('div', check.name, { class: 'ats-check-name' });
    content.appendChild(name);

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
