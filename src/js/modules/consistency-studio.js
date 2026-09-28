/**
 * Consistency Studio Module
 * Analyzes resume documents for formatting inconsistencies and provides auto-fix capabilities.
 * Checks: date formats, capitalization, bullet endings, duplicate skills, empty sections, missing contact info.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { ACTION_VERBS, MATCH_VERBS } from '../data/action-verbs.js';

/**
 * Finding categories
 */
const CATEGORIES = {
  DATE_FORMAT: 'date-format',
  CAPITALIZATION: 'capitalization',
  BULLET_ENDINGS: 'bullet-endings',
  DUPLICATE_SKILLS: 'duplicate-skills',
  EMPTY_SECTIONS: 'empty-sections',
  MISSING_CONTACT: 'missing-contact',
  VERB_TENSE: 'verb-tense'
};

/**
 * Category display labels
 */
const CATEGORY_LABELS = {
  [CATEGORIES.DATE_FORMAT]: 'Date Format',
  [CATEGORIES.CAPITALIZATION]: 'Capitalization',
  [CATEGORIES.BULLET_ENDINGS]: 'Bullet Endings',
  [CATEGORIES.DUPLICATE_SKILLS]: 'Duplicate Skills',
  [CATEGORIES.EMPTY_SECTIONS]: 'Empty Sections',
  [CATEGORIES.MISSING_CONTACT]: 'Missing Contact Info',
  [CATEGORIES.VERB_TENSE]: 'Verb Tense'
};

/**
 * Severity levels
 */
const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Severity display labels
 */
const SEVERITY_LABELS = {
  [SEVERITY.ERROR]: 'Error',
  [SEVERITY.WARNING]: 'Warning',
  [SEVERITY.INFO]: 'Info'
};

/**
 * Present-tense-looking words that actually end in "ed" (never treat as past).
 */
const PRESENT_ED_EXCEPTIONS = new Set([
  'need', 'needs', 'seed', 'feed', 'speed', 'exceed', 'exceeds',
  'proceed', 'proceeds', 'succeed', 'succeeds', 'breed', 'bleed',
]);

/** Irregular base -> past mappings for one-click tense fixes. */
const IRREGULAR_PAST = {
  lead: 'led', build: 'built', oversee: 'oversaw', understand: 'understood',
  write: 'wrote', speak: 'spoke', drive: 'drove', grow: 'grew',
  run: 'ran', teach: 'taught', bring: 'brought', make: 'made',
  take: 'took', do: 'did', set: 'set', meet: 'met', win: 'won',
  send: 'sent', choose: 'chose', find: 'found', spend: 'spent',
  hold: 'held', keep: 'kept', give: 'gave', begin: 'began'
};

function firstVerbWord(text) {
  const m = String(text || '').trim().match(/^[\s"'“‘(•·\-*]*([A-Za-z'-]+)/);
  return m ? m[1].toLowerCase() : '';
}

function isPastVerb(word) {
  if (!word) return false;
  if (new Set(ACTION_VERBS).has(word)) return true;
  return word.length >= 5 && word.endsWith('ed') && !PRESENT_ED_EXCEPTIONS.has(word);
}

/** Resolve a present-tense first word to its base verb (or null). */
function presentBaseOf(word) {
  if (!word) return null;
  const bases = new Set(MATCH_VERBS);
  if (bases.has(word)) return word;
  if (word.endsWith('s') && word.length > 3) {
    const s1 = word.slice(0, -1);
    if (bases.has(s1)) return s1;
    if (word.endsWith('es')) {
      const s2 = word.slice(0, -2);
      if (bases.has(s2)) return s2;
    }
    if (word.endsWith('ies')) {
      const s3 = word.slice(0, -3) + 'y';
      if (bases.has(s3)) return s3;
    }
  }
  return null;
}

/** Past form of a base verb, or null when unknown/unsafe. */
function pastFormOf(base) {
  if (!base) return null;
  if (IRREGULAR_PAST[base]) {
    const p = IRREGULAR_PAST[base];
    return new Set(ACTION_VERBS).has(p) ? p : null;
  }
  let past;
  if (base.endsWith('e')) past = base + 'd';
  else if (base.endsWith('y') && base.length > 2 && !/[aeiou]y$/.test(base)) past = base.slice(0, -1) + 'ied';
  else past = base + 'ed';
  return new Set(ACTION_VERBS).has(past) ? past : null;
}

/**
 * Parse a month + year out of a free-text date string.
 * @returns {{month:number,year:number}|null}
 */
function parseMonthYear(value) {
  const t = String(value || '').trim();
  const MONTHS_LONG = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
  let m = t.match(new RegExp(`\\b(${MONTHS_LONG.join('|')})\\b[^\\d]*(\\d{4})`, 'i'));
  if (m) return { month: MONTHS_LONG.indexOf(m[1].toLowerCase()) + 1, year: parseInt(m[2], 10) };
  m = t.match(new RegExp(`\\b(${MONTHS_SHORT.join('|')})\\b[.,]?[^\\d]*(\\d{4})`, 'i'));
  if (m) {
    const key = m[1].toLowerCase().slice(0, 3);
    const idx = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(key);
    if (idx >= 0) return { month: idx + 1, year: parseInt(m[2], 10) };
  }
  m = t.match(/\b(\d{1,2})[/\-](\d{4})\b/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return { month: +m[1], year: parseInt(m[2], 10) };
  m = t.match(/\b(\d{4})-(\d{2})\b/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return { month: +m[2], year: parseInt(m[1], 10) };
  return null;
}

const MONTH_NAMES_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT2 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Render month/year in one of the DATE_FORMATS keys; null when unknown. */
function renderInFormat(month, year, format) {
  const mm = String(month).padStart(2, '0');
  switch (format) {
    case 'MONTH_YEAR_LONG': return `${MONTH_NAMES_LONG[month - 1]} ${year}`;
    case 'MONTH_YEAR_SHORT': return `${MONTH_NAMES_SHORT2[month - 1]} ${year}`;
    case 'MM_SLASH_YYYY': return `${mm}/${year}`;
    case 'MM_DASH_YYYY': return `${mm}-${year}`;
    case 'YYYY_MM': return `${year}-${mm}`;
    case 'M_SLASH_YYYY': return `${month}/${year}`;
    default: return null;
  }
}

/** Reformat a date string into the target format; null when not convertible. */
function reformatDateString(value, targetFormat) {
  const parsed = parseMonthYear(value);
  if (!parsed) return null;
  const out = renderInFormat(parsed.month, parsed.year, targetFormat);
  return out && out !== String(value).trim() ? out : null;
}

/**
 * Regex patterns for detecting date formats
 */
const DATE_PATTERNS = {
  MONTH_YEAR_LONG: /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i,
  MONTH_YEAR_SHORT: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i,
  MM_SLASH_YYYY: /^\d{2}\/\d{4}$/,
  MM_DASH_YYYY: /^\d{2}-\d{4}$/,
  YYYY_MM: /^\d{4}-\d{2}$/,
  YYYY_ONLY: /^\d{4}$/,
  M_SLASH_YYYY: /^\d{1}\/\d{4}$/,
  PRESENT: /^(present|current|now|ongoing)$/i
};

/**
 * Date format labels for display
 */
const DATE_FORMAT_LABELS = {
  MONTH_YEAR_LONG: 'Month YYYY (e.g., January 2024)',
  MONTH_YEAR_SHORT: 'Mon YYYY (e.g., Jan 2024)',
  MM_SLASH_YYYY: 'MM/YYYY (e.g., 01/2024)',
  MM_DASH_YYYY: 'MM-YYYY (e.g., 01-2024)',
  YYYY_MM: 'YYYY-MM (e.g., 2024-01)',
  YYYY_ONLY: 'YYYY (e.g., 2024)',
  M_SLASH_YYYY: 'M/YYYY (e.g., 1/2024)',
  PRESENT: 'Present/Current'
};

/**
 * Section types that contain date fields
 */
const DATE_SECTION_TYPES = [
  'professionalExperience', 'experience', 'otherExperience',
  'internships', 'apprenticeships', 'education',
  'certifications', 'projects', 'volunteer',
  'volunteerExperience', 'researchExperience',
  'teachingExperience', 'militaryExperience'
];

/**
 * Section types that contain skills
 */
const SKILL_SECTION_TYPES = [
  'skills', 'technicalSkills', 'toolsAndTechnologies',
  'coreCompetencies', 'keyQualifications'
];

/**
 * Section types that typically have bullet-style descriptions
 */
const BULLET_SECTION_TYPES = [
  'professionalExperience', 'experience', 'otherExperience',
  'internships', 'projects', 'volunteerExperience',
  'researchExperience', 'teachingExperience'
];

/**
 * ConsistencyStudio class
 */
export class ConsistencyStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];

    this.documents = [];
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.findings = [];
    this.ignoredFindingIds = new Set();
    this.showIgnored = false;
  }

  /**
   * Registers an event listener for cleanup on destroy
   */
  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  /**
   * Removes all event listeners and clears the container
   */
  destroy() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.findings = [];
    this.ignoredFindingIds.clear();
  }

  /**
   * Renders the Consistency Studio view
   * @returns {HTMLElement}
   */
  async render() {
    this.container = createElement('div', '', { class: 'consistency-studio-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Consistency Studio');

    const header = this.renderHeader();
    this.container.appendChild(header);

    const content = createElement('div', '', { class: 'cs-content', id: 'cs-content' });
    this.container.appendChild(content);

    await this.showDocumentSelection();

    return this.container;
  }

  // ==================== HEADER ====================

  renderHeader() {
    const header = createElement('div', '', { class: 'cs-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'cs-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });

    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcHomeLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcHomeLink.setAttribute('href', '#/dashboard');
    this.addListener(bcHomeLink, 'click', (e) => {
      e.preventDefault();
      if (window.CC && window.CC.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    bcHome.appendChild(bcHomeLink);
    bcList.appendChild(bcHome);

    const bcSep = createElement('li', '', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcSep.textContent = '/';
    bcList.appendChild(bcSep);

    const bcCurrent = createElement('li', '', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcCurrent.textContent = 'Consistency Check';
    bcList.appendChild(bcCurrent);

    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const titleRow = createElement('div', '', { class: 'cs-title-row' });

    const titleGroup = createElement('div', '', { class: 'cs-title-group' });
    const title = createElement('h1', 'Consistency Studio', { class: 'cs-title' });
    titleGroup.appendChild(title);
    const subtitle = createElement('p', 'Analyze your documents for formatting inconsistencies, missing information, and style issues. Get actionable suggestions and auto-fix common problems.', { class: 'cs-subtitle' });
    titleGroup.appendChild(subtitle);
    titleRow.appendChild(titleGroup);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline cs-back-btn' });
    backBtn.innerHTML = '&#8592; Dashboard';
    backBtn.setAttribute('aria-label', 'Back to Dashboard');
    this.addListener(backBtn, 'click', () => {
      if (window.CC && window.CC.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    titleRow.appendChild(backBtn);

    header.appendChild(titleRow);
    return header;
  }

  // ==================== DOCUMENT SELECTION ====================

  async showDocumentSelection() {
    const content = this.container.querySelector('#cs-content');
    if (!content) return;
    content.innerHTML = '';

    try {
      this.documents = await this.db.getAll('documents');
    } catch (e) {
      content.appendChild(this.renderError('Failed to load documents. Please try again.'));
      return;
    }

    const wrapper = createElement('div', '', { class: 'cs-doc-selection' });

    const sectionTitle = createElement('h2', 'Select a Document to Check', { class: 'cs-section-title' });
    wrapper.appendChild(sectionTitle);

    const listContainer = createElement('div', '', { class: 'cs-doc-list', id: 'cs-doc-list' });
    wrapper.appendChild(listContainer);

    content.appendChild(wrapper);
    this.renderDocumentList();
  }

  renderDocumentList() {
    const listContainer = this.container.querySelector('#cs-doc-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const docs = this.documents.filter(d => !d.archived);
    docs.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    if (docs.length === 0) {
      const empty = createElement('div', '', { class: 'cs-empty-state' });
      const emptyMsg = createElement('p', 'No documents found. Create a resume first to run consistency checks.');
      empty.appendChild(emptyMsg);
      const createBtn = createElement('button', '+ Create Resume', { class: 'btn btn-primary btn-sm' });
      this.addListener(createBtn, 'click', () => {
        // Open the creation wizard via the global document:create flow
        // (bare '#/editor' matches no route and would 404 to the dashboard).
        if (window.CC && window.CC.events) window.CC.events.emit('document:create', { type: 'resume' });
        else if (window.CC && window.CC.router) window.CC.router.navigate('/dashboard');
        else window.location.hash = '#/dashboard';
      });
      empty.appendChild(createBtn);
      listContainer.appendChild(empty);
      return;
    }

    docs.forEach(doc => {
      const card = this.renderDocumentCard(doc);
      listContainer.appendChild(card);
    });
  }

  renderDocumentCard(doc) {
    const card = createElement('div', '', { class: 'cs-doc-card' });
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Select document: ' + (doc.name || 'Untitled'));

    const info = createElement('div', '', { class: 'cs-doc-card-info' });

    const name = createElement('h3', doc.name || 'Untitled', { class: 'cs-doc-card-name' });
    info.appendChild(name);

    const meta = createElement('div', '', { class: 'cs-doc-card-meta' });
    const typeBadge = createElement('span', doc.type || 'resume', { class: 'cs-doc-type-badge' });
    meta.appendChild(typeBadge);

    if (doc.lastModified) {
      const dateStr = this.formatRelativeDate(doc.lastModified);
      const modified = createElement('span', 'Modified ' + dateStr, { class: 'cs-doc-card-date' });
      meta.appendChild(modified);
    }

    const sectionCount = Array.isArray(doc.sections) ? doc.sections.length : 0;
    const sectionInfo = createElement('span', sectionCount + ' section' + (sectionCount !== 1 ? 's' : ''), { class: 'cs-doc-card-sections' });
    meta.appendChild(sectionInfo);

    info.appendChild(meta);
    card.appendChild(info);

    const arrow = createElement('span', '→', { class: 'cs-doc-card-arrow', 'aria-hidden': 'true' });
    card.appendChild(arrow);

    this.addListener(card, 'click', () => this.selectDocument(doc.id));
    this.addListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectDocument(doc.id);
      }
    });

    return card;
  }

  formatRelativeDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return diffMins + ' min ago';
      if (diffHours < 24) return diffHours + 'h ago';
      if (diffDays < 7) return diffDays + 'd ago';
      if (diffDays < 30) return Math.floor(diffDays / 7) + 'w ago';
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  }

  // ==================== DOCUMENT SELECTION HANDLER ====================

  async selectDocument(docId) {
    try {
      this.selectedDocId = docId;
      this.selectedDoc = await this.db.read('documents', docId);
      if (!this.selectedDoc) {
        this.selectedDoc = this.documents.find(d => d.id === docId) || null;
      }
      if (!this.selectedDoc) {
        if (window.CC && window.CC.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }
    } catch (e) {
      if (window.CC && window.CC.toast) window.CC.toast.show('Failed to load document', 'error');
      return;
    }

    this.findings = [];
    this.ignoredFindingIds.clear();
    this.showIgnored = false;

    this.runChecks();
    this.renderResults();
  }

  // ==================== CONSISTENCY CHECKS ====================

  runChecks() {
    this.findings = [];
    const doc = this.selectedDoc;
    if (!doc) return;

    this.checkMissingContactInfo(doc);
    this.checkMixedDateFormats(doc);
    this.checkInconsistentCapitalization(doc);
    this.checkInconsistentBulletEndings(doc);
    this.checkTenseConsistency(doc);
    this.checkDuplicateSkills(doc);
    this.checkEmptyVisibleSections(doc);
  }

  // --- Check: Missing Contact Info ---

  checkMissingContactInfo(doc) {
    const pi = doc.personalInfo || {};

    if (!pi.fullName || !pi.fullName.trim()) {
      this.findings.push({
        id: generateUUID(),
        category: CATEGORIES.MISSING_CONTACT,
        severity: SEVERITY.ERROR,
        location: 'Personal Information',
        description: 'Full name is missing. Most employers and ATS systems require a name.',
        fixable: false,
        fixAction: null
      });
    }

    if (!pi.email || !pi.email.trim()) {
      this.findings.push({
        id: generateUUID(),
        category: CATEGORIES.MISSING_CONTACT,
        severity: SEVERITY.ERROR,
        location: 'Personal Information',
        description: 'Email address is missing. Employers need a way to contact you.',
        fixable: false,
        fixAction: null
      });
    }

    if (!pi.phone || !pi.phone.trim()) {
      this.findings.push({
        id: generateUUID(),
        category: CATEGORIES.MISSING_CONTACT,
        severity: SEVERITY.WARNING,
        location: 'Personal Information',
        description: 'Phone number is missing. Most job applications expect a phone number.',
        fixable: false,
        fixAction: null
      });
    }
  }

  // --- Check: Mixed Date Formats ---

  checkMixedDateFormats(doc) {
    const sections = doc.sections || [];
    const dateEntries = [];

    sections.forEach(section => {
      if (!section.visible) return;
      const items = section.items || [];

      items.forEach((item, itemIndex) => {
        const dateFields = ['startDate', 'endDate', 'issueDate', 'expirationDate'];
        dateFields.forEach(field => {
          const val = item[field];
          if (!val || typeof val !== 'string') return;
          const trimmed = val.trim();
          if (!trimmed) return;

          // Skip "Present" / "Current" values
          if (DATE_PATTERNS.PRESENT.test(trimmed)) return;

          const format = this.detectDateFormat(trimmed);
          if (format) {
            dateEntries.push({
              value: trimmed,
              format: format,
              section: section.title || section.type || 'Unknown Section',
              sectionIndex: sections.indexOf(section),
              itemIndex: itemIndex,
              field: field,
              itemLabel: item.jobTitle || item.company || item.degree || item.institution || item.projectName || item.name || ('Item ' + (itemIndex + 1))
            });
          }
        });

        // Also check month/year numeric fields that get rendered as formatted dates
        if (item.startMonth && item.startYear) {
          const rendered = this.renderMonthYear(item.startMonth, item.startYear);
          if (rendered) {
            const format = this.detectDateFormat(rendered);
            if (format) {
              dateEntries.push({
                value: rendered,
                format: format,
                section: section.title || section.type || 'Unknown Section',
                sectionIndex: sections.indexOf(section),
                itemIndex: itemIndex,
                field: 'startMonth/startYear',
                itemLabel: item.jobTitle || item.company || item.degree || item.institution || ('Item ' + (itemIndex + 1))
              });
            }
          }
        }
        if (item.endMonth && item.endYear) {
          const rendered = this.renderMonthYear(item.endMonth, item.endYear);
          if (rendered) {
            const format = this.detectDateFormat(rendered);
            if (format) {
              dateEntries.push({
                value: rendered,
                format: format,
                section: section.title || section.type || 'Unknown Section',
                sectionIndex: sections.indexOf(section),
                itemIndex: itemIndex,
                field: 'endMonth/endYear',
                itemLabel: item.jobTitle || item.company || item.degree || item.institution || ('Item ' + (itemIndex + 1))
              });
            }
          }
        }
      });
    });

    if (dateEntries.length < 2) return;

    // Count formats (excluding PRESENT and YYYY_ONLY which are often intentional)
    const formatCounts = {};
    dateEntries.forEach(entry => {
      if (entry.format === 'YYYY_ONLY') return;
      formatCounts[entry.format] = (formatCounts[entry.format] || 0) + 1;
    });

    const uniqueFormats = Object.keys(formatCounts);
    if (uniqueFormats.length <= 1) return;

    // Find the most common format
    const dominantFormat = uniqueFormats.reduce((a, b) => formatCounts[a] >= formatCounts[b] ? a : b);

    const STRING_DATE_FIELDS = new Set(['startDate', 'endDate', 'issueDate', 'expirationDate']);

    dateEntries.forEach(entry => {
      if (entry.format === 'YYYY_ONLY') return;
      if (entry.format === dominantFormat) return;

      let fixable = false;
      let fixAction = null;
      if (STRING_DATE_FIELDS.has(entry.field)) {
        const newValue = reformatDateString(entry.value, dominantFormat);
        if (newValue) {
          fixable = true;
          fixAction = {
            type: 'reformat-date',
            sectionId: (sections[entry.sectionIndex] || {}).id,
            itemIndex: entry.itemIndex,
            field: entry.field,
            newValue,
          };
        }
      }

      this.findings.push({
        id: generateUUID(),
        category: CATEGORIES.DATE_FORMAT,
        severity: SEVERITY.WARNING,
        location: 'Section: ' + entry.section + ' > ' + entry.itemLabel + ' > ' + entry.field,
        description: 'Date "' + entry.value + '" uses ' + (DATE_FORMAT_LABELS[entry.format] || entry.format) + ' format, but most dates use ' + (DATE_FORMAT_LABELS[dominantFormat] || dominantFormat) + '.' + (fixable ? ' One-click fix available.' : ''),
        fixable,
        fixAction
      });
    });
  }

  detectDateFormat(dateStr) {
    if (DATE_PATTERNS.PRESENT.test(dateStr)) return 'PRESENT';
    if (DATE_PATTERNS.MONTH_YEAR_LONG.test(dateStr)) return 'MONTH_YEAR_LONG';
    if (DATE_PATTERNS.MONTH_YEAR_SHORT.test(dateStr)) return 'MONTH_YEAR_SHORT';
    if (DATE_PATTERNS.MM_SLASH_YYYY.test(dateStr)) return 'MM_SLASH_YYYY';
    if (DATE_PATTERNS.MM_DASH_YYYY.test(dateStr)) return 'MM_DASH_YYYY';
    if (DATE_PATTERNS.YYYY_MM.test(dateStr)) return 'YYYY_MM';
    if (DATE_PATTERNS.M_SLASH_YYYY.test(dateStr)) return 'M_SLASH_YYYY';
    if (DATE_PATTERNS.YYYY_ONLY.test(dateStr)) return 'YYYY_ONLY';
    return null;
  }

  renderMonthYear(month, year) {
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) return null;
    return MONTH_NAMES_SHORT[monthNum - 1] + ' ' + yearNum;
  }

  // --- Check: Inconsistent Capitalization ---

  checkInconsistentCapitalization(doc) {
    const sections = doc.sections || [];
    const sectionTitles = [];
    const jobTitles = [];

    sections.forEach(section => {
      if (!section.visible) return;

      if (section.title && section.title.trim()) {
        sectionTitles.push({
          value: section.title.trim(),
          section: section.title || section.type,
          sectionIndex: sections.indexOf(section)
        });
      }

      const items = section.items || [];
      items.forEach((item, itemIndex) => {
        const titleField = item.jobTitle || item.title || item.projectName || item.degree;
        if (titleField && titleField.trim()) {
          jobTitles.push({
            value: titleField.trim(),
            section: section.title || section.type || 'Unknown',
            itemIndex: itemIndex,
            itemLabel: item.company || item.institution || ('Item ' + (itemIndex + 1)),
            field: item.jobTitle ? 'jobTitle' : item.title ? 'title' : item.projectName ? 'projectName' : 'degree'
          });
        }
      });
    });

    // Check section title casing consistency
    if (sectionTitles.length >= 2) {
      const casingStyles = sectionTitles.map(t => ({
        ...t,
        style: this.detectCasingStyle(t.value)
      }));

      const styleCounts = {};
      casingStyles.forEach(c => {
        if (c.style) {
          styleCounts[c.style] = (styleCounts[c.style] || 0) + 1;
        }
      });

      const uniqueStyles = Object.keys(styleCounts);
      if (uniqueStyles.length > 1) {
        const dominantStyle = uniqueStyles.reduce((a, b) => styleCounts[a] >= styleCounts[b] ? a : b);

        casingStyles.forEach(c => {
          if (c.style && c.style !== dominantStyle) {
            this.findings.push({
              id: generateUUID(),
              category: CATEGORIES.CAPITALIZATION,
              severity: SEVERITY.INFO,
              location: 'Section title: "' + c.value + '"',
              description: 'Section title "' + c.value + '" appears to be ' + c.style + ', while most section titles use ' + dominantStyle + '.',
              fixable: false,
              fixAction: null
            });
          }
        });
      }
    }

    // Check job/item title casing consistency
    if (jobTitles.length >= 2) {
      const casingStyles = jobTitles.map(t => ({
        ...t,
        style: this.detectCasingStyle(t.value)
      }));

      const styleCounts = {};
      casingStyles.forEach(c => {
        if (c.style) {
          styleCounts[c.style] = (styleCounts[c.style] || 0) + 1;
        }
      });

      const uniqueStyles = Object.keys(styleCounts);
      if (uniqueStyles.length > 1) {
        const dominantStyle = uniqueStyles.reduce((a, b) => styleCounts[a] >= styleCounts[b] ? a : b);

        casingStyles.forEach(c => {
          if (c.style && c.style !== dominantStyle) {
            this.findings.push({
              id: generateUUID(),
              category: CATEGORIES.CAPITALIZATION,
              severity: SEVERITY.INFO,
              location: 'Section: ' + c.section + ' > ' + c.itemLabel + ' > ' + c.field,
              description: 'Title "' + c.value + '" appears to be ' + c.style + ', while most titles use ' + dominantStyle + '.',
              fixable: false,
              fixAction: null
            });
          }
        });
      }
    }
  }

  detectCasingStyle(text) {
    if (!text || text.length < 2) return null;

    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return null;

    // Common short words that are lowercase in Title Case
    const smallWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'in', 'of', 'with', 'as']);

    const isAllUpper = words.every(w => w === w.toUpperCase() && /[A-Z]/.test(w));
    if (isAllUpper) return 'UPPER CASE';

    const isAllLower = words.every(w => w === w.toLowerCase());
    if (isAllLower) return 'lower case';

    // Check Title Case: first word capitalized + subsequent significant words capitalized
    const isTitleCase = words.every((w, i) => {
      if (i === 0) return w[0] === w[0].toUpperCase();
      if (smallWords.has(w.toLowerCase()) && w === w.toLowerCase()) return true;
      if (w[0] === w[0].toUpperCase()) return true;
      return false;
    });
    if (isTitleCase) return 'Title Case';

    // Sentence case: first word capitalized, rest lowercase (with exceptions for proper nouns)
    if (words[0][0] === words[0][0].toUpperCase()) {
      const restLower = words.slice(1).filter(w => !smallWords.has(w.toLowerCase())).every(w => w === w.toLowerCase() || /^[A-Z]{2,}$/.test(w));
      if (restLower) return 'Sentence case';
    }

    return 'Mixed case';
  }

  // --- Check: Inconsistent Bullet Endings ---

  checkInconsistentBulletEndings(doc) {
    const sections = doc.sections || [];
    const bullets = [];

    sections.forEach(section => {
      if (!section.visible) return;

      const items = section.items || [];
      items.forEach((item, itemIndex) => {
        // Check description field for bullets (often multi-line)
        const desc = item.description || item.responsibilities || item.roleSummary || '';
        if (desc.trim()) {
          const lines = desc.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
          lines.forEach((line, lineIndex) => {
            // Skip very short lines that might be headers
            if (line.length < 5) return;
            bullets.push({
              text: line,
              endsWithPeriod: line.endsWith('.'),
              section: section.title || section.type || 'Unknown',
              sectionId: section.id,
              itemIndex: itemIndex,
              lineIndex: lineIndex,
              itemLabel: item.jobTitle || item.company || item.title || item.projectName || ('Item ' + (itemIndex + 1)),
              field: item.description ? 'description' : item.responsibilities ? 'responsibilities' : 'roleSummary'
            });
          });
        }

        // Check achievements array
        const achievements = item.achievements || [];
        achievements.forEach((ach, achIndex) => {
          const text = typeof ach === 'string' ? ach : (ach.text || '');
          if (text.trim() && text.trim().length >= 5) {
            bullets.push({
              text: text.trim(),
              endsWithPeriod: text.trim().endsWith('.'),
              section: section.title || section.type || 'Unknown',
              sectionId: section.id,
              itemIndex: itemIndex,
              lineIndex: achIndex,
              itemLabel: item.jobTitle || item.company || item.title || ('Item ' + (itemIndex + 1)),
              field: 'achievements'
            });
          }
        });
      });
    });

    if (bullets.length < 2) return;

    const withPeriod = bullets.filter(b => b.endsWithPeriod).length;
    const withoutPeriod = bullets.length - withPeriod;

    // Only flag if there is a mix
    if (withPeriod === 0 || withoutPeriod === 0) return;

    const dominantEnding = withPeriod >= withoutPeriod ? true : false;
    const dominantLabel = dominantEnding ? 'end with a period' : 'do not end with a period';

    // Create one finding per non-conforming bullet
    bullets.forEach(bullet => {
      if (bullet.endsWithPeriod === dominantEnding) return;

      const actionLabel = dominantEnding
        ? 'This bullet point does not end with a period, but most others do.'
        : 'This bullet point ends with a period, but most others do not.';

      this.findings.push({
        id: generateUUID(),
        category: CATEGORIES.BULLET_ENDINGS,
        severity: SEVERITY.INFO,
        location: 'Section: ' + bullet.section + ' > ' + bullet.itemLabel,
        description: actionLabel + ' ("' + (bullet.text.length > 60 ? bullet.text.substring(0, 57) + '...' : bullet.text) + '")',
        fixable: true,
        fixAction: {
          type: 'standardize-bullet-ending',
          sectionId: bullet.sectionId,
          itemIndex: bullet.itemIndex,
          lineIndex: bullet.lineIndex,
          field: bullet.field,
          addPeriod: dominantEnding
        }
      });
    });
  }

  // --- Check: Verb Tense Consistency ---

  checkTenseConsistency(doc) {
    const sections = doc.sections || [];

    const pushBullet = (bucket, section, item, itemIndex, text, lineIndex, field) => {
      const t = String(text || '').trim();
      if (t.length < 5) return;
      bucket.push({
        text: t,
        section: section.title || section.type || 'Unknown',
        sectionId: section.id,
        itemIndex,
        lineIndex,
        field,
        itemLabel: item.jobTitle || item.company || item.title || item.projectName || ('Item ' + (itemIndex + 1)),
        isCurrent: !!(item.currentlyWorking || item.current || item.currentProject),
      });
    };

    sections.forEach((section) => {
      if (!section.visible) return;
      const sType = String(section.sectionType || section.type || '').toLowerCase();
      // Tense matters in dated, narrative sections — not in skills/languages lists.
      if (/(skill|language|interest|reference)/.test(sType)) return;
      const bullets = [];
      (section.items || []).forEach((item, itemIndex) => {
        if (!item || typeof item !== 'object') return;
        const desc = item.description || item.responsibilities || item.roleSummary || '';
        if (typeof desc === 'string' && desc.trim()) {
          desc.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0)
            .forEach((line, lineIndex) => pushBullet(bullets, section, item, itemIndex, line, lineIndex,
              item.description ? 'description' : item.responsibilities ? 'responsibilities' : 'roleSummary'));
        }
        (item.achievements || []).forEach((ach, achIndex) => {
          const t = typeof ach === 'string' ? ach : ach?.text || '';
          pushBullet(bullets, section, item, itemIndex, t, achIndex, 'achievements');
        });
      });

      bullets.forEach((b) => {
        if (b.isCurrent) return; // present tense expected; past achievements are normal
        const first = firstVerbWord(b.text);
        if (!first || isPastVerb(first)) return;
        const base = presentBaseOf(first);
        if (!base) return; // not a recognizable verb — stay quiet, not noisy
        const past = pastFormOf(base);
        const fixable = !!past;
        this.findings.push({
          id: generateUUID(),
          category: CATEGORIES.VERB_TENSE,
          severity: SEVERITY.WARNING,
          location: 'Section: ' + b.section + ' > ' + b.itemLabel,
          description: 'Past role uses present-tense verb "' + b.text.split(/\s+/)[0] + '" — past roles should use past tense ("' + (past || 'e.g. Led') + '"). "' + (b.text.length > 60 ? b.text.substring(0, 57) + '...' : b.text) + '"',
          fixable,
          fixAction: fixable ? {
            type: 'fix-verb-tense',
            sectionId: b.sectionId,
            itemIndex: b.itemIndex,
            lineIndex: b.lineIndex,
            field: b.field,
            pastVerb: past,
          } : null,
        });
      });
    });
  }

  // --- Check: Duplicate Skills ---

  checkDuplicateSkills(doc) {
    const sections = doc.sections || [];

    sections.forEach(section => {
      if (!section.visible) return;

      const sType = (section.sectionType || section.type || '').toLowerCase();
      const isSkillSection = SKILL_SECTION_TYPES.some(t => sType.includes(t.toLowerCase())) || sType.includes('skill');
      if (!isSkillSection) return;

      const items = section.items || [];
      const seenSkills = new Map(); // lowercase -> first occurrence index

      items.forEach((item, index) => {
        // Skills can be stored as item.name, or the items can be strings directly
        const skillName = typeof item === 'string' ? item : (item.name || item.text || '');
        if (!skillName.trim()) return;

        const normalized = skillName.trim().toLowerCase();
        if (seenSkills.has(normalized)) {
          this.findings.push({
            id: generateUUID(),
            category: CATEGORIES.DUPLICATE_SKILLS,
            severity: SEVERITY.WARNING,
            location: 'Section: ' + (section.title || section.type) + ' > Item ' + (index + 1),
            description: 'Skill "' + skillName.trim() + '" appears to be a duplicate (first seen at position ' + (seenSkills.get(normalized) + 1) + ').',
            fixable: true,
            fixAction: {
              type: 'remove-duplicate-skill',
              sectionId: section.id,
              itemIndex: index,
              skillName: skillName.trim()
            }
          });
        } else {
          seenSkills.set(normalized, index);
        }
      });

      // Also check skills within item.items arrays (some schemas nest skills as arrays)
      items.forEach((item, itemIndex) => {
        if (!item.items || !Array.isArray(item.items)) return;
        const subSeenSkills = new Map();

        item.items.forEach((subSkill, subIndex) => {
          const name = typeof subSkill === 'string' ? subSkill : (subSkill.name || '');
          if (!name.trim()) return;

          const normalized = name.trim().toLowerCase();
          if (subSeenSkills.has(normalized)) {
            this.findings.push({
              id: generateUUID(),
              category: CATEGORIES.DUPLICATE_SKILLS,
              severity: SEVERITY.WARNING,
              location: 'Section: ' + (section.title || section.type) + ' > ' + (item.category || item.name || 'Group ' + (itemIndex + 1)) + ' > Item ' + (subIndex + 1),
              description: 'Skill "' + name.trim() + '" is duplicated within this group.',
              fixable: true,
              fixAction: {
                type: 'remove-duplicate-sub-skill',
                sectionId: section.id,
                itemIndex: itemIndex,
                subItemIndex: subIndex,
                skillName: name.trim()
              }
            });
          } else {
            subSeenSkills.set(normalized, subIndex);
          }
        });
      });
    });
  }

  // --- Check: Empty Visible Sections ---

  checkEmptyVisibleSections(doc) {
    const sections = doc.sections || [];

    sections.forEach(section => {
      if (!section.visible) return;

      const sType = (section.sectionType || section.type || '').toLowerCase();
      // Skip text-only sections like summary/objective
      if (sType === 'summary' || sType === 'professionalSummary' || sType === 'careerObjective' || sType === 'text') {
        // For text sections, check content instead of items
        if (!section.content || !section.content.trim()) {
          const hasItems = (section.items || []).some(item => {
            const text = typeof item === 'string' ? item : (item.text || item.description || item.name || '');
            return text.trim().length > 0;
          });
          if (!hasItems) {
            this.findings.push({
              id: generateUUID(),
              category: CATEGORIES.EMPTY_SECTIONS,
              severity: SEVERITY.WARNING,
              location: 'Section: ' + (section.title || section.type || 'Unknown'),
              description: 'This section is visible but has no content. Consider adding content or hiding the section.',
              fixable: false,
              fixAction: null
            });
          }
        }
        return;
      }

      const items = section.items || [];

      if (items.length === 0) {
        this.findings.push({
          id: generateUUID(),
          category: CATEGORIES.EMPTY_SECTIONS,
          severity: SEVERITY.WARNING,
          location: 'Section: ' + (section.title || section.type || 'Unknown'),
          description: 'This section is visible but contains no items. Consider adding items or hiding the section.',
          fixable: false,
          fixAction: null
        });
        return;
      }

      // Check if all items are empty
      const allEmpty = items.every(item => {
        if (typeof item === 'string') return !item.trim();
        const fields = [item.name, item.title, item.jobTitle, item.company, item.institution, item.degree, item.text, item.description, item.projectName];
        return fields.every(f => !f || !(typeof f === 'string' && f.trim()));
      });

      if (allEmpty) {
        this.findings.push({
          id: generateUUID(),
          category: CATEGORIES.EMPTY_SECTIONS,
          severity: SEVERITY.WARNING,
          location: 'Section: ' + (section.title || section.type || 'Unknown'),
          description: 'This section is visible but all its items appear to be empty.',
          fixable: false,
          fixAction: null
        });
      }
    });
  }

  // ==================== RESULTS RENDERING ====================

  renderResults() {
    const content = this.container.querySelector('#cs-content');
    if (!content) return;
    content.innerHTML = '';

    const wrapper = createElement('div', '', { class: 'cs-results-wrapper' });

    // Document info bar
    const docBar = this.renderDocumentBar();
    wrapper.appendChild(docBar);

    // Summary bar
    const summary = this.renderSummaryBar();
    wrapper.appendChild(summary);

    // Active findings
    const activeFindings = this.findings.filter(f => !this.ignoredFindingIds.has(f.id));
    const ignoredFindings = this.findings.filter(f => this.ignoredFindingIds.has(f.id));

    if (activeFindings.length === 0 && ignoredFindings.length === 0) {
      const success = createElement('div', '', { class: 'cs-success-state' });
      const successIcon = createElement('div', '✓', { class: 'cs-success-icon' });
      success.appendChild(successIcon);
      const successTitle = createElement('h3', 'No Issues Found', { class: 'cs-success-title' });
      success.appendChild(successTitle);
      const successMsg = createElement('p', 'Your document looks consistent. Great job!', { class: 'cs-success-msg' });
      success.appendChild(successMsg);
      wrapper.appendChild(success);
    } else {
      // Fix all button (for fixable findings)
      const fixableActive = activeFindings.filter(f => f.fixable);
      if (fixableActive.length > 0) {
        const bulkActions = createElement('div', '', { class: 'cs-bulk-actions' });
        const fixAllBtn = createElement('button', 'Fix All (' + fixableActive.length + ' fixable)', { class: 'btn btn-primary btn-sm cs-fix-all-btn' });
        fixAllBtn.setAttribute('aria-label', 'Fix all ' + fixableActive.length + ' fixable issues');
        this.addListener(fixAllBtn, 'click', () => this.fixAll());
        bulkActions.appendChild(fixAllBtn);
        wrapper.appendChild(bulkActions);
      }

      // Findings list
      const findingsSection = createElement('div', '', { class: 'cs-findings-section' });
      const findingsTitle = createElement('h3', 'Findings (' + activeFindings.length + ')', { class: 'cs-findings-title' });
      findingsSection.appendChild(findingsTitle);

      const findingsList = createElement('div', '', { class: 'cs-findings-list', id: 'cs-findings-list' });

      // Sort findings: errors first, then warnings, then info
      const severityOrder = { error: 0, warning: 1, info: 2 };
      activeFindings.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));

      activeFindings.forEach(finding => {
        const card = this.renderFindingCard(finding, false);
        findingsList.appendChild(card);
      });

      findingsSection.appendChild(findingsList);
      wrapper.appendChild(findingsSection);

      // Ignored findings section
      if (ignoredFindings.length > 0) {
        const ignoredSection = this.renderIgnoredSection(ignoredFindings);
        wrapper.appendChild(ignoredSection);
      }
    }

    content.appendChild(wrapper);
  }

  renderDocumentBar() {
    const bar = createElement('div', '', { class: 'cs-doc-bar' });

    const docInfo = createElement('div', '', { class: 'cs-doc-bar-info' });
    const docName = createElement('span', 'Checking: ' + (this.selectedDoc.name || 'Untitled'), { class: 'cs-doc-bar-name' });
    docInfo.appendChild(docName);
    bar.appendChild(docInfo);

    const actions = createElement('div', '', { class: 'cs-doc-bar-actions' });

    const changeBtn = createElement('button', 'Change Document', { class: 'btn btn-sm btn-outline' });
    this.addListener(changeBtn, 'click', () => {
      this.selectedDocId = null;
      this.selectedDoc = null;
      this.findings = [];
      this.ignoredFindingIds.clear();
      this.showDocumentSelection();
    });
    actions.appendChild(changeBtn);

    const rerunBtn = createElement('button', 'Re-run Check', { class: 'btn btn-sm btn-outline' });
    rerunBtn.setAttribute('aria-label', 'Re-run consistency check');
    this.addListener(rerunBtn, 'click', async () => {
      try {
        this.selectedDoc = await this.db.read('documents', this.selectedDocId);
        if (!this.selectedDoc) {
          this.selectedDoc = this.documents.find(d => d.id === this.selectedDocId) || null;
        }
      } catch (e) {
        // Keep the existing document
      }
      this.findings = [];
      this.runChecks();
      this.renderResults();
      if (window.CC && window.CC.toast) window.CC.toast.show('Check refreshed', 'info');
    });
    actions.appendChild(rerunBtn);

    const goToEditorBtn = createElement('button', 'Open in Editor', { class: 'btn btn-sm btn-primary' });
    goToEditorBtn.setAttribute('aria-label', 'Open document in editor');
    this.addListener(goToEditorBtn, 'click', () => {
      if (window.CC && window.CC.router) {
        window.CC.router.navigate('/editor/' + this.selectedDocId);
      } else {
        window.location.hash = '#/editor/' + this.selectedDocId;
      }
    });
    actions.appendChild(goToEditorBtn);

    bar.appendChild(actions);
    return bar;
  }

  renderSummaryBar() {
    const bar = createElement('div', '', { class: 'cs-summary-bar' });

    const activeFindings = this.findings.filter(f => !this.ignoredFindingIds.has(f.id));
    const errorCount = activeFindings.filter(f => f.severity === SEVERITY.ERROR).length;
    const warningCount = activeFindings.filter(f => f.severity === SEVERITY.WARNING).length;
    const infoCount = activeFindings.filter(f => f.severity === SEVERITY.INFO).length;
    const fixableCount = activeFindings.filter(f => f.fixable).length;
    const totalCount = activeFindings.length;
    const ignoredCount = this.ignoredFindingIds.size;

    const totalItem = createElement('div', '', { class: 'cs-summary-item cs-summary-total' });
    totalItem.appendChild(createElement('span', String(totalCount), { class: 'cs-summary-count' }));
    totalItem.appendChild(createElement('span', 'Total', { class: 'cs-summary-label' }));
    bar.appendChild(totalItem);

    if (errorCount > 0) {
      const errorItem = createElement('div', '', { class: 'cs-summary-item cs-summary-error' });
      errorItem.appendChild(createElement('span', String(errorCount), { class: 'cs-summary-count' }));
      errorItem.appendChild(createElement('span', 'Error' + (errorCount !== 1 ? 's' : ''), { class: 'cs-summary-label' }));
      bar.appendChild(errorItem);
    }

    if (warningCount > 0) {
      const warningItem = createElement('div', '', { class: 'cs-summary-item cs-summary-warning' });
      warningItem.appendChild(createElement('span', String(warningCount), { class: 'cs-summary-count' }));
      warningItem.appendChild(createElement('span', 'Warning' + (warningCount !== 1 ? 's' : ''), { class: 'cs-summary-label' }));
      bar.appendChild(warningItem);
    }

    if (infoCount > 0) {
      const infoItem = createElement('div', '', { class: 'cs-summary-item cs-summary-info' });
      infoItem.appendChild(createElement('span', String(infoCount), { class: 'cs-summary-count' }));
      infoItem.appendChild(createElement('span', 'Info', { class: 'cs-summary-label' }));
      bar.appendChild(infoItem);
    }

    if (fixableCount > 0) {
      const fixableItem = createElement('div', '', { class: 'cs-summary-item cs-summary-fixable' });
      fixableItem.appendChild(createElement('span', String(fixableCount), { class: 'cs-summary-count' }));
      fixableItem.appendChild(createElement('span', 'Fixable', { class: 'cs-summary-label' }));
      bar.appendChild(fixableItem);
    }

    if (ignoredCount > 0) {
      const ignoredItem = createElement('div', '', { class: 'cs-summary-item cs-summary-ignored' });
      ignoredItem.appendChild(createElement('span', String(ignoredCount), { class: 'cs-summary-count' }));
      ignoredItem.appendChild(createElement('span', 'Ignored', { class: 'cs-summary-label' }));
      bar.appendChild(ignoredItem);
    }

    return bar;
  }

  renderFindingCard(finding, isIgnored) {
    const card = createElement('div', '', { class: 'cs-finding-card cs-finding-' + finding.severity + (isIgnored ? ' cs-finding-ignored' : '') });
    card.setAttribute('data-finding-id', finding.id);
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', finding.severity + ' finding: ' + finding.description);

    // Top row: severity badge + category
    const topRow = createElement('div', '', { class: 'cs-finding-top' });

    const severityBadge = createElement('span', SEVERITY_LABELS[finding.severity] || finding.severity, {
      class: 'cs-severity-badge cs-severity-' + finding.severity
    });
    topRow.appendChild(severityBadge);

    const categoryBadge = createElement('span', CATEGORY_LABELS[finding.category] || finding.category, {
      class: 'cs-category-badge'
    });
    topRow.appendChild(categoryBadge);

    card.appendChild(topRow);

    // Location
    const location = createElement('div', finding.location, { class: 'cs-finding-location' });
    card.appendChild(location);

    // Description
    const description = createElement('p', finding.description, { class: 'cs-finding-description' });
    card.appendChild(description);

    // Actions row
    const actions = createElement('div', '', { class: 'cs-finding-actions' });

    if (!isIgnored) {
      if (finding.fixable) {
        const fixBtn = createElement('button', 'Fix', { class: 'btn btn-xs btn-primary cs-fix-btn' });
        fixBtn.setAttribute('aria-label', 'Fix this issue');
        this.addListener(fixBtn, 'click', (e) => {
          e.stopPropagation();
          this.fixFinding(finding);
        });
        actions.appendChild(fixBtn);
      }

      const ignoreBtn = createElement('button', 'Ignore', { class: 'btn btn-xs btn-outline cs-ignore-btn' });
      ignoreBtn.setAttribute('aria-label', 'Ignore this finding');
      this.addListener(ignoreBtn, 'click', (e) => {
        e.stopPropagation();
        this.ignoreFinding(finding.id);
      });
      actions.appendChild(ignoreBtn);
    } else {
      const restoreBtn = createElement('button', 'Restore', { class: 'btn btn-xs btn-outline cs-restore-btn' });
      restoreBtn.setAttribute('aria-label', 'Restore this finding');
      this.addListener(restoreBtn, 'click', (e) => {
        e.stopPropagation();
        this.restoreFinding(finding.id);
      });
      actions.appendChild(restoreBtn);
    }

    const goToBtn = createElement('button', 'Go to Field', { class: 'btn btn-xs btn-outline cs-goto-btn' });
    goToBtn.setAttribute('aria-label', 'Navigate to this field in the editor');
    this.addListener(goToBtn, 'click', (e) => {
      e.stopPropagation();
      this.goToField();
    });
    actions.appendChild(goToBtn);

    card.appendChild(actions);

    return card;
  }

  renderIgnoredSection(ignoredFindings) {
    const section = createElement('div', '', { class: 'cs-ignored-section' });

    const toggleRow = createElement('div', '', { class: 'cs-ignored-toggle-row' });

    const toggleBtn = createElement('button', '', { class: 'btn btn-sm btn-outline cs-ignored-toggle-btn' });
    toggleBtn.setAttribute('aria-expanded', String(this.showIgnored));
    toggleBtn.setAttribute('aria-controls', 'cs-ignored-list');

    const toggleText = (this.showIgnored ? 'Hide' : 'Show') + ' Ignored Findings (' + ignoredFindings.length + ')';
    toggleBtn.textContent = toggleText;

    this.addListener(toggleBtn, 'click', () => {
      this.showIgnored = !this.showIgnored;
      toggleBtn.setAttribute('aria-expanded', String(this.showIgnored));
      toggleBtn.textContent = (this.showIgnored ? 'Hide' : 'Show') + ' Ignored Findings (' + ignoredFindings.length + ')';
      const list = section.querySelector('#cs-ignored-list');
      if (list) {
        list.style.display = this.showIgnored ? '' : 'none';
      }
    });

    toggleRow.appendChild(toggleBtn);

    if (ignoredFindings.length > 0) {
      const restoreAllBtn = createElement('button', 'Restore All', { class: 'btn btn-xs btn-outline' });
      restoreAllBtn.setAttribute('aria-label', 'Restore all ignored findings');
      this.addListener(restoreAllBtn, 'click', () => this.restoreAllFindings());
      toggleRow.appendChild(restoreAllBtn);
    }

    section.appendChild(toggleRow);

    const list = createElement('div', '', { class: 'cs-ignored-list', id: 'cs-ignored-list' });
    list.style.display = this.showIgnored ? '' : 'none';

    ignoredFindings.forEach(finding => {
      const card = this.renderFindingCard(finding, true);
      list.appendChild(card);
    });

    section.appendChild(list);
    return section;
  }

  renderError(message) {
    const errorDiv = createElement('div', '', { class: 'cs-error-state' });
    const errorMsg = createElement('p', message, { class: 'cs-error-msg' });
    errorDiv.appendChild(errorMsg);
    const retryBtn = createElement('button', 'Try Again', { class: 'btn btn-primary btn-sm' });
    this.addListener(retryBtn, 'click', () => this.showDocumentSelection());
    errorDiv.appendChild(retryBtn);
    return errorDiv;
  }

  // ==================== ACTIONS ====================

  ignoreFinding(findingId) {
    this.ignoredFindingIds.add(findingId);
    this.renderResults();
  }

  restoreFinding(findingId) {
    this.ignoredFindingIds.delete(findingId);
    this.renderResults();
  }

  restoreAllFindings() {
    this.ignoredFindingIds.clear();
    this.showIgnored = false;
    this.renderResults();
  }

  goToField() {
    if (this.selectedDocId) {
      if (window.CC && window.CC.router) {
        window.CC.router.navigate('/editor/' + this.selectedDocId);
      } else {
        window.location.hash = '#/editor/' + this.selectedDocId;
      }
    }
  }

  // ==================== AUTO-FIX ====================

  async fixFinding(finding) {
    if (!finding.fixable || !finding.fixAction) return;

    const action = finding.fixAction;
    let fixed = false;

    try {
      // Re-read latest document state
      let doc = await this.db.read('documents', this.selectedDocId);
      if (!doc) {
        if (window.CC && window.CC.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }

      switch (action.type) {
        case 'standardize-bullet-ending':
          fixed = this.applyBulletEndingFix(doc, action);
          break;
        case 'remove-duplicate-skill':
          fixed = this.applyRemoveDuplicateSkill(doc, action);
          break;
        case 'remove-duplicate-sub-skill':
          fixed = this.applyRemoveDuplicateSubSkill(doc, action);
          break;
        case 'reformat-date':
          fixed = this.applyReformatDate(doc, action);
          break;
        case 'fix-verb-tense':
          fixed = this.applyVerbTenseFix(doc, action);
          break;
        default:
          if (window.CC && window.CC.toast) window.CC.toast.show('Unknown fix type', 'error');
          return;
      }

      if (fixed) {
        doc.lastModified = new Date().toISOString();
        await this.db.put('documents', doc);
        this.selectedDoc = doc;

        // Remove the fixed finding from the list
        this.findings = this.findings.filter(f => f.id !== finding.id);

        this.renderResults();
        if (window.CC && window.CC.toast) window.CC.toast.show('Fixed: ' + (CATEGORY_LABELS[finding.category] || finding.category), 'success');
      }
    } catch (e) {
      if (window.CC && window.CC.toast) window.CC.toast.show('Failed to apply fix: ' + (e.message || 'Unknown error'), 'error');
    }
  }

  async fixAll() {
    const activeFixable = this.findings.filter(f => f.fixable && !this.ignoredFindingIds.has(f.id));
    if (activeFixable.length === 0) return;

    try {
      let doc = await this.db.read('documents', this.selectedDocId);
      if (!doc) {
        if (window.CC && window.CC.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }

      let fixedCount = 0;
      const fixedIds = [];

      // Group fixes by type for better ordering: remove duplicates first, then bullet endings
      const duplicateFixes = activeFixable.filter(f => f.fixAction && (f.fixAction.type === 'remove-duplicate-skill' || f.fixAction.type === 'remove-duplicate-sub-skill'));
      const bulletFixes = activeFixable.filter(f => f.fixAction && f.fixAction.type === 'standardize-bullet-ending');

      // Apply duplicate removal in reverse index order to preserve indices
      const sortedDupFixes = [...duplicateFixes].sort((a, b) => {
        const aIdx = a.fixAction.subItemIndex !== undefined ? a.fixAction.subItemIndex : a.fixAction.itemIndex;
        const bIdx = b.fixAction.subItemIndex !== undefined ? b.fixAction.subItemIndex : b.fixAction.itemIndex;
        return bIdx - aIdx; // Descending order
      });

      sortedDupFixes.forEach(finding => {
        let applied = false;
        switch (finding.fixAction.type) {
          case 'remove-duplicate-skill':
            applied = this.applyRemoveDuplicateSkill(doc, finding.fixAction);
            break;
          case 'remove-duplicate-sub-skill':
            applied = this.applyRemoveDuplicateSubSkill(doc, finding.fixAction);
            break;
        }
        if (applied) {
          fixedCount++;
          fixedIds.push(finding.id);
        }
      });

      // Apply bullet ending fixes
      bulletFixes.forEach(finding => {
        if (this.applyBulletEndingFix(doc, finding.fixAction)) {
          fixedCount++;
          fixedIds.push(finding.id);
        }
      });

      // Apply date + tense fixes (field-level edits, order-independent)
      activeFixable
        .filter(f => f.fixAction && (f.fixAction.type === 'reformat-date' || f.fixAction.type === 'fix-verb-tense'))
        .forEach(finding => {
          let applied = false;
          if (finding.fixAction.type === 'reformat-date') applied = this.applyReformatDate(doc, finding.fixAction);
          else applied = this.applyVerbTenseFix(doc, finding.fixAction);
          if (applied) {
            fixedCount++;
            fixedIds.push(finding.id);
          }
        });

      if (fixedCount > 0) {
        doc.lastModified = new Date().toISOString();
        await this.db.put('documents', doc);
        this.selectedDoc = doc;

        // Remove fixed findings
        this.findings = this.findings.filter(f => !fixedIds.includes(f.id));

        this.renderResults();
        if (window.CC && window.CC.toast) window.CC.toast.show('Fixed ' + fixedCount + ' issue' + (fixedCount !== 1 ? 's' : ''), 'success');
      }
    } catch (e) {
      if (window.CC && window.CC.toast) window.CC.toast.show('Failed to apply fixes: ' + (e.message || 'Unknown error'), 'error');
    }
  }

  // --- Fix Implementations ---

  applyBulletEndingFix(doc, action) {
    const sections = doc.sections || [];
    const section = sections.find(s => s.id === action.sectionId);
    if (!section) return false;

    const items = section.items || [];
    const item = items[action.itemIndex];
    if (!item) return false;

    if (action.field === 'achievements') {
      const achievements = item.achievements || [];
      const ach = achievements[action.lineIndex];
      if (ach === undefined) return false;

      if (typeof ach === 'string') {
        if (action.addPeriod && !ach.trim().endsWith('.')) {
          achievements[action.lineIndex] = ach.trimEnd() + '.';
          return true;
        } else if (!action.addPeriod && ach.trim().endsWith('.')) {
          achievements[action.lineIndex] = ach.trimEnd().slice(0, -1);
          return true;
        }
      } else if (ach && typeof ach === 'object' && typeof ach.text === 'string') {
        if (action.addPeriod && !ach.text.trim().endsWith('.')) {
          ach.text = ach.text.trimEnd() + '.';
          return true;
        } else if (!action.addPeriod && ach.text.trim().endsWith('.')) {
          ach.text = ach.text.trimEnd().slice(0, -1);
          return true;
        }
      }
      return false;
    }

    // Handle description/responsibilities/roleSummary fields
    const fieldName = action.field;
    const text = item[fieldName];
    if (typeof text !== 'string') return false;

    const lines = text.split('\n');
    let lineIdx = action.lineIndex;

    // Map lineIndex to actual line in the text (skipping empty lines)
    let nonEmptyCount = -1;
    let actualLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0) {
        nonEmptyCount++;
        if (nonEmptyCount === lineIdx) {
          actualLineIndex = i;
          break;
        }
      }
    }

    if (actualLineIndex === -1) return false;

    const line = lines[actualLineIndex];
    const trimmedLine = line.trimEnd();

    if (action.addPeriod && !trimmedLine.endsWith('.')) {
      lines[actualLineIndex] = trimmedLine + '.';
      item[fieldName] = lines.join('\n');
      return true;
    } else if (!action.addPeriod && trimmedLine.endsWith('.')) {
      lines[actualLineIndex] = trimmedLine.slice(0, -1);
      item[fieldName] = lines.join('\n');
      return true;
    }

    return false;
  }

  applyRemoveDuplicateSkill(doc, action) {
    const sections = doc.sections || [];
    const section = sections.find(s => s.id === action.sectionId);
    if (!section) return false;

    const items = section.items || [];
    if (action.itemIndex < 0 || action.itemIndex >= items.length) return false;

    section.items = items.filter((_, i) => i !== action.itemIndex);
    return true;
  }

  applyRemoveDuplicateSubSkill(doc, action) {
    const sections = doc.sections || [];
    const section = sections.find(s => s.id === action.sectionId);
    if (!section) return false;

    const items = section.items || [];
    const item = items[action.itemIndex];
    if (!item || !Array.isArray(item.items)) return false;

    if (action.subItemIndex < 0 || action.subItemIndex >= item.items.length) return false;

    item.items = item.items.filter((_, i) => i !== action.subItemIndex);
    return true;
  }

  applyReformatDate(doc, action) {
    const section = (doc.sections || []).find(s => s.id === action.sectionId);
    if (!section) return false;
    const item = (section.items || [])[action.itemIndex];
    if (!item || typeof item[action.field] !== 'string') return false;
    item[action.field] = action.newValue;
    return true;
  }

  /** Locate a bullet line (achievements array or description-family field). */
  _locateBulletLine(doc, action) {
    const section = (doc.sections || []).find(s => s.id === action.sectionId);
    if (!section) return null;
    const item = (section.items || [])[action.itemIndex];
    if (!item) return null;
    if (action.field === 'achievements') {
      const achievements = item.achievements || [];
      const ach = achievements[action.lineIndex];
      if (ach === undefined) return null;
      return { kind: 'achievement', achievements, index: action.lineIndex, value: typeof ach === 'string' ? ach : ach?.text || '' };
    }
    const text = item[action.field];
    if (typeof text !== 'string') return null;
    const lines = text.split('\n');
    let nonEmpty = -1;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      nonEmpty++;
      if (nonEmpty === action.lineIndex) {
        return { kind: 'field', item, field: action.field, lines, index: i, value: lines[i] };
      }
    }
    return null;
  }

  applyVerbTenseFix(doc, action) {
    const loc = this._locateBulletLine(doc, action);
    if (!loc || !action.pastVerb) return false;
    const apply = (oldText) => {
      const m = String(oldText).match(/^(\s*["'“‘(•·\-*]*)([A-Za-z'-]+)([\s\S]*)$/);
      if (!m) return null;
      let verb = action.pastVerb;
      if (/^[A-Z]/.test(m[2])) verb = verb.charAt(0).toUpperCase() + verb.slice(1);
      return m[1] + verb + m[3];
    };
    if (loc.kind === 'achievement') {
      const next = apply(loc.value);
      if (next === null || next === loc.value) return false;
      const cur = loc.achievements[loc.index];
      loc.achievements[loc.index] = typeof cur === 'string' ? next : { ...cur, text: next };
      return true;
    }
    const next = apply(loc.value);
    if (next === null || next === loc.value) return false;
    loc.lines[loc.index] = next;
    loc.item[loc.field] = loc.lines.join('\n');
    return true;
  }

  // ==================== UTILITY ====================

  hasUnsavedChanges() {
    return false;
  }
}

export {
  firstVerbWord,
  isPastVerb,
  presentBaseOf,
  pastFormOf,
  parseMonthYear,
  renderInFormat,
  reformatDateString,
};


