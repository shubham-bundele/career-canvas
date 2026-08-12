/**
 * Accessibility Inspector Module
 * Analyzes resume documents for accessibility issues including color contrast,
 * font sizes, heading hierarchy, link clarity, dense text, and missing alt text.
 * All checks run locally in the browser.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { formatTimeAgo } from '../utils/format.js';
import { STORES } from '../core/db.js';
import eventBus from '../core/events.js';

// ==================== CONSTANTS ====================

const SEVERITY = { ERROR: 'error', WARNING: 'warning', INFO: 'info' };

const MIN_CONTRAST_RATIO = 4.5;
const FONT_SIZE_ERROR_THRESHOLD = 10;
const FONT_SIZE_WARNING_THRESHOLD = 11;
const NAME_SIZE_MIN = 14;
const HEADING_SIZE_MIN = 11;
const DENSE_TEXT_THRESHOLD = 500;

const CHECK_IDS = {
  COLOR_CONTRAST: 'color-contrast',
  FONT_SIZE: 'font-size',
  NAME_SIZE: 'name-size',
  HEADING_SIZE: 'heading-size',
  HEADING_HIERARCHY: 'heading-hierarchy',
  LINK_CLARITY: 'link-clarity',
  DENSE_PARAGRAPH: 'dense-paragraph',
  MISSING_ALT_TEXT: 'missing-alt-text'
};

// ==================== CLASS ====================

export class A11yInspector {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];

    // State
    this.documents = [];
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.findings = [];
    this.ignoredIds = new Set();
    this.showIgnored = false;

    // Document selection controls
    this.docSearch = '';
    this.docSort = 'lastModified';
    this.docSortDir = 'desc';

    this.view = 'select'; // 'select' | 'results'
  }

  // ==================== RENDER / LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'a11y-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Accessibility Inspector');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'a11y-content', id: 'a11y-content' });
    this.container.appendChild(content);
    await this.showDocumentSelection();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'a11y-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'a11y-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });
    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);
    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);
    const cur = createElement('li', 'Accessibility Inspector', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);
    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const row = createElement('div', '', { class: 'a11y-title-row' });
    const group = createElement('div', '', { class: 'a11y-title-group' });
    group.appendChild(createElement('h1', 'Accessibility Inspector', { class: 'a11y-title' }));
    group.appendChild(createElement('p', 'Check your resume for accessibility issues like color contrast, font sizes, heading structure, and more. All checks run locally in your browser.', { class: 'a11y-description' }));
    row.appendChild(group);
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline a11y-back-btn' });
    backBtn.innerHTML = '&#8592; Dashboard';
    backBtn.setAttribute('aria-label', 'Back to Dashboard');
    this.addListener(backBtn, 'click', () => {
      if (window.CC?.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    row.appendChild(backBtn);
    header.appendChild(row);

    return header;
  }

  destroy() {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  gc() {
    return this.container?.querySelector('#a11y-content') || this.container;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  // ==================== DOCUMENT SELECTION VIEW ====================

  async showDocumentSelection() {
    const c = this.gc();
    c.innerHTML = '';
    this.view = 'select';

    try {
      this.documents = await this.db.getAll(STORES.DOCUMENTS);
    } catch {
      this.documents = [];
    }

    const w = createElement('div', '', { class: 'a11y-select' });

    // Search and sort bar
    const toolbar = createElement('div', '', { class: 'a11y-toolbar' });

    const searchInput = createElement('input', '', {
      class: 'a11y-field-input a11y-search-input',
      type: 'search',
      placeholder: 'Search documents...',
      'aria-label': 'Search documents'
    });
    searchInput.value = this.docSearch;
    this.addListener(searchInput, 'input', e => {
      this.docSearch = e.target.value;
      this.renderDocGrid();
    });
    toolbar.appendChild(searchInput);

    const sortSelect = createElement('select', '', { class: 'a11y-sort-select', 'aria-label': 'Sort documents' });
    [['lastModified', 'Last Modified'], ['name', 'Name A-Z'], ['created', 'Date Created']].forEach(([v, l]) => {
      const o = createElement('option', l, { value: v });
      if (v === this.docSort) o.selected = true;
      sortSelect.appendChild(o);
    });
    this.addListener(sortSelect, 'change', e => {
      this.docSort = e.target.value;
      this.renderDocGrid();
    });
    toolbar.appendChild(sortSelect);

    w.appendChild(toolbar);

    // Document grid
    const grid = createElement('div', '', { class: 'a11y-doc-grid', id: 'a11y-doc-grid', role: 'listbox', 'aria-label': 'Select a document to inspect' });
    w.appendChild(grid);

    c.appendChild(w);
    this.renderDocGrid();
  }

  renderDocGrid() {
    const gridEl = this.container?.querySelector('#a11y-doc-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    let docs = this.documents.filter(d => !d.archived);

    // Search filter
    if (this.docSearch.trim()) {
      const q = this.docSearch.toLowerCase();
      docs = docs.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.targetRole || '').toLowerCase().includes(q) ||
        (d.type || '').toLowerCase().includes(q)
      );
    }

    // Sort
    switch (this.docSort) {
      case 'name':
        docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'created':
        docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        docs.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    if (docs.length === 0) {
      const empty = createElement('div', '', { class: 'a11y-empty-msg' });
      empty.textContent = this.documents.length === 0
        ? 'No documents found. Create one from the Dashboard first.'
        : 'No documents match your search.';
      gridEl.appendChild(empty);
      return;
    }

    docs.forEach(doc => {
      const card = createElement('div', '', { class: 'a11y-doc-card', role: 'option' });
      card.tabIndex = 0;
      card.setAttribute('aria-selected', 'false');

      const top = createElement('div', '', { class: 'a11y-doc-card-top' });
      const name = createElement('span', '', { class: 'a11y-doc-card-name' });
      name.textContent = (doc.name || '').trim() || 'Untitled';
      top.appendChild(name);

      const typeLabel = this.getDocTypeLabel(doc.type);
      const badge = createElement('span', typeLabel, { class: `a11y-type-badge a11y-type-badge--${doc.type}` });
      top.appendChild(badge);
      card.appendChild(top);

      if (doc.targetRole) {
        const role = createElement('span', '', { class: 'a11y-doc-card-role' });
        role.textContent = doc.targetRole;
        card.appendChild(role);
      }

      const meta = createElement('div', '', { class: 'a11y-doc-card-meta' });
      meta.textContent = `${doc.templateId || 'default'} · ${formatTimeAgo(doc.lastModified)}`;
      card.appendChild(meta);

      const inspectBtn = createElement('button', 'Inspect', { class: 'btn btn-sm btn-primary a11y-inspect-btn' });
      this.addListener(inspectBtn, 'click', e => {
        e.stopPropagation();
        this.selectAndInspect(doc);
      });
      card.appendChild(inspectBtn);

      this.addListener(card, 'click', () => this.selectAndInspect(doc));
      this.addListener(card, 'keydown', e => {
        if (e.key === 'Enter') this.selectAndInspect(doc);
      });

      gridEl.appendChild(card);
    });
  }

  getDocTypeLabel(type) {
    const labels = {
      resume: 'Resume', cv: 'CV', coverLetter: 'Cover Letter',
      referenceSheet: 'References', portfolio: 'Portfolio', onePager: 'One-Pager'
    };
    return labels[type] || type || 'Document';
  }

  async selectAndInspect(doc) {
    this.selectedDocId = doc.id;
    this.selectedDoc = doc;
    this.ignoredIds = new Set();
    this.showIgnored = false;

    // Run checks
    this.findings = this.runAllChecks(doc);
    this.showResults();
  }

  // ==================== ACCESSIBILITY CHECKS ENGINE ====================

  runAllChecks(doc) {
    const findings = [];
    const design = doc.design || {};
    const personalInfo = doc.personalInfo || {};
    const sections = doc.sections || [];

    // 1. Color contrast check
    findings.push(...this.checkColorContrast(design));

    // 2. Font size check
    findings.push(...this.checkFontSize(design));

    // 3. Name size check
    findings.push(...this.checkNameSize(design));

    // 4. Heading size check
    findings.push(...this.checkHeadingSize(design));

    // 5. Heading hierarchy check
    findings.push(...this.checkHeadingHierarchy(sections));

    // 6. Link clarity check
    findings.push(...this.checkLinkClarity(personalInfo));

    // 7. Dense paragraph check
    findings.push(...this.checkDenseParagraphs(sections));

    // 8. Missing photo alt text check
    findings.push(...this.checkMissingAltText(personalInfo, design));

    return findings;
  }

  // ---- Color Contrast ----

  checkColorContrast(design) {
    const findings = [];
    const accentColor = design.accentColor;

    if (!accentColor) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.COLOR_CONTRAST,
        severity: SEVERITY.INFO,
        location: 'Design Settings',
        field: 'design.accentColor',
        title: 'No accent color set',
        explanation: 'No accent color is configured. The default template color will be used. Consider setting one explicitly for consistent branding.',
        fixable: false
      }));
      return findings;
    }

    // Check against white background
    const ratio = this.getContrastRatio(accentColor, '#ffffff');

    if (ratio < MIN_CONTRAST_RATIO) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.COLOR_CONTRAST,
        severity: SEVERITY.ERROR,
        location: 'Design Settings',
        field: 'design.accentColor',
        title: 'Insufficient color contrast',
        explanation: `The accent color "${accentColor}" has a contrast ratio of ${ratio.toFixed(2)}:1 against a white background. WCAG AA requires at least ${MIN_CONTRAST_RATIO}:1 for normal text. Consider using a darker shade.`,
        fixable: false,
        currentValue: accentColor
      }));
    } else {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.COLOR_CONTRAST,
        severity: SEVERITY.INFO,
        location: 'Design Settings',
        field: 'design.accentColor',
        title: 'Color contrast is adequate',
        explanation: `The accent color "${accentColor}" has a contrast ratio of ${ratio.toFixed(2)}:1 against white, which meets WCAG AA requirements (${MIN_CONTRAST_RATIO}:1).`,
        fixable: false,
        pass: true
      }));
    }

    // Also check against light gray background (#f8fafc)
    const ratioLightBg = this.getContrastRatio(accentColor, '#f8fafc');
    if (ratioLightBg < MIN_CONTRAST_RATIO && ratio >= MIN_CONTRAST_RATIO) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.COLOR_CONTRAST,
        severity: SEVERITY.WARNING,
        location: 'Design Settings',
        field: 'design.accentColor',
        title: 'Marginal contrast on light backgrounds',
        explanation: `The accent color "${accentColor}" has a contrast ratio of ${ratioLightBg.toFixed(2)}:1 against light gray backgrounds. This may be hard to read in some templates with off-white sections.`,
        fixable: false
      }));
    }

    return findings;
  }

  // ---- Font Size ----

  checkFontSize(design) {
    const findings = [];
    const fontSize = this.parseFontSize(design.fontSize);

    if (fontSize === null) {
      return findings; // No font size configured, skip
    }

    if (fontSize < FONT_SIZE_ERROR_THRESHOLD) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.FONT_SIZE,
        severity: SEVERITY.ERROR,
        location: 'Design Settings',
        field: 'design.fontSize',
        title: 'Body font size too small',
        explanation: `The body font size is ${fontSize}px, which is below the minimum readable threshold of ${FONT_SIZE_ERROR_THRESHOLD}px. This will be very difficult to read, especially in print.`,
        fixable: true,
        fixValue: FONT_SIZE_ERROR_THRESHOLD,
        fixLabel: `Increase to ${FONT_SIZE_ERROR_THRESHOLD}px`,
        currentValue: fontSize
      }));
    } else if (fontSize < FONT_SIZE_WARNING_THRESHOLD) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.FONT_SIZE,
        severity: SEVERITY.WARNING,
        location: 'Design Settings',
        field: 'design.fontSize',
        title: 'Body font size may be small',
        explanation: `The body font size is ${fontSize}px. While technically readable, sizes below ${FONT_SIZE_WARNING_THRESHOLD}px can strain readers' eyes, especially on printed resumes.`,
        fixable: true,
        fixValue: FONT_SIZE_WARNING_THRESHOLD,
        fixLabel: `Increase to ${FONT_SIZE_WARNING_THRESHOLD}px`,
        currentValue: fontSize
      }));
    } else {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.FONT_SIZE,
        severity: SEVERITY.INFO,
        location: 'Design Settings',
        field: 'design.fontSize',
        title: 'Body font size is readable',
        explanation: `The body font size is ${fontSize}px, which is above the recommended minimum.`,
        fixable: false,
        pass: true
      }));
    }

    return findings;
  }

  // ---- Name Size ----

  checkNameSize(design) {
    const findings = [];
    const nameSize = this.parseFontSize(design.nameSize);

    if (nameSize === null) return findings;

    if (nameSize < NAME_SIZE_MIN) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.NAME_SIZE,
        severity: SEVERITY.WARNING,
        location: 'Design Settings',
        field: 'design.nameSize',
        title: 'Name font size is small',
        explanation: `The name/header font size is ${nameSize}px. For your name to stand out as a visual anchor, a size of at least ${NAME_SIZE_MIN}px is recommended.`,
        fixable: true,
        fixValue: NAME_SIZE_MIN,
        fixLabel: `Increase to ${NAME_SIZE_MIN}px`,
        currentValue: nameSize
      }));
    }

    return findings;
  }

  // ---- Heading Size ----

  checkHeadingSize(design) {
    const findings = [];
    const headingSize = this.parseFontSize(design.headingSize);

    if (headingSize === null) return findings;

    if (headingSize < HEADING_SIZE_MIN) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_SIZE,
        severity: SEVERITY.WARNING,
        location: 'Design Settings',
        field: 'design.headingSize',
        title: 'Section heading font size is small',
        explanation: `Section headings are ${headingSize}px. Headings below ${HEADING_SIZE_MIN}px may not provide sufficient visual hierarchy to help readers scan the document.`,
        fixable: true,
        fixValue: HEADING_SIZE_MIN,
        fixLabel: `Increase to ${HEADING_SIZE_MIN}px`,
        currentValue: headingSize
      }));
    }

    return findings;
  }

  // ---- Heading Hierarchy ----

  checkHeadingHierarchy(sections) {
    const findings = [];

    if (!sections || sections.length === 0) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_HIERARCHY,
        severity: SEVERITY.INFO,
        location: 'Document Structure',
        field: 'sections',
        title: 'No sections found',
        explanation: 'This document has no sections defined. Add sections to structure your resume content.',
        fixable: false
      }));
      return findings;
    }

    const visibleSections = sections.filter(s => s.visible !== false);

    if (visibleSections.length === 0) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_HIERARCHY,
        severity: SEVERITY.WARNING,
        location: 'Document Structure',
        field: 'sections',
        title: 'All sections are hidden',
        explanation: 'All sections in this document are marked as hidden. The printed resume will have no visible content sections.',
        fixable: false
      }));
      return findings;
    }

    // Check for untitled sections
    const untitledSections = visibleSections.filter(s => !(s.title || '').trim());
    if (untitledSections.length > 0) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_HIERARCHY,
        severity: SEVERITY.WARNING,
        location: 'Document Structure',
        field: 'sections',
        title: `${untitledSections.length} section(s) missing titles`,
        explanation: `${untitledSections.length} visible section(s) have no title. Section headings help readers and screen readers navigate the document. Consider adding descriptive titles.`,
        fixable: false
      }));
    }

    // Check for empty sections (no content and no items)
    const emptySections = visibleSections.filter(s =>
      !(s.content || '').trim() && (!s.items || s.items.length === 0)
    );
    if (emptySections.length > 0) {
      const names = emptySections.map(s => s.title || s.sectionType || 'Untitled').join(', ');
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_HIERARCHY,
        severity: SEVERITY.WARNING,
        location: 'Document Structure',
        field: 'sections',
        title: `${emptySections.length} empty section(s)`,
        explanation: `The following sections are visible but contain no content: ${names}. Empty sections create visual gaps and confuse assistive technology.`,
        fixable: false
      }));
    }

    // Check for duplicate section types
    const typeCount = {};
    visibleSections.forEach(s => {
      const t = s.sectionType || s.type || 'unknown';
      typeCount[t] = (typeCount[t] || 0) + 1;
    });
    const duplicates = Object.entries(typeCount).filter(([, c]) => c > 1);
    if (duplicates.length > 0) {
      const names = duplicates.map(([t, c]) => `${t} (${c}x)`).join(', ');
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_HIERARCHY,
        severity: SEVERITY.INFO,
        location: 'Document Structure',
        field: 'sections',
        title: 'Duplicate section types detected',
        explanation: `Multiple sections share the same type: ${names}. While not necessarily an error, this may confuse screen readers that use heading navigation.`,
        fixable: false
      }));
    }

    // If everything checks out
    if (untitledSections.length === 0 && emptySections.length === 0 && duplicates.length === 0) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.HEADING_HIERARCHY,
        severity: SEVERITY.INFO,
        location: 'Document Structure',
        field: 'sections',
        title: 'Heading structure looks good',
        explanation: `${visibleSections.length} visible sections all have titles and content.`,
        fixable: false,
        pass: true
      }));
    }

    return findings;
  }

  // ---- Link Clarity ----

  checkLinkClarity(personalInfo) {
    const findings = [];
    const urlFields = [
      { key: 'linkedinUrl', label: 'LinkedIn' },
      { key: 'githubUrl', label: 'GitHub' },
      { key: 'portfolioUrl', label: 'Portfolio' },
      { key: 'personalWebsite', label: 'Personal Website' },
      { key: 'gitlabUrl', label: 'GitLab' },
      { key: 'stackOverflowUrl', label: 'Stack Overflow' },
      { key: 'behance', label: 'Behance' },
      { key: 'dribbble', label: 'Dribbble' }
    ];

    let rawUrlCount = 0;
    let totalLinks = 0;

    for (const { key, label } of urlFields) {
      const val = personalInfo[key];
      if (!val || typeof val !== 'string' || !val.trim()) continue;

      totalLinks++;
      const trimmed = val.trim();

      // Check if the value looks like a raw URL with no descriptive context
      const isRawUrl = /^https?:\/\//i.test(trimmed);
      if (isRawUrl) {
        // Check for extremely long URLs
        if (trimmed.length > 60) {
          rawUrlCount++;
          findings.push(this.createFinding({
            checkId: CHECK_IDS.LINK_CLARITY,
            severity: SEVERITY.WARNING,
            location: `Personal Info > ${label}`,
            field: `personalInfo.${key}`,
            title: `Long URL for ${label}`,
            explanation: `The ${label} field contains a long raw URL (${trimmed.length} characters). In print, long URLs are hard to read and take up space. If your template displays the URL directly, consider shortening it.`,
            fixable: false
          }));
        }
      }
    }

    // Check otherProfiles
    if (Array.isArray(personalInfo.otherProfiles)) {
      personalInfo.otherProfiles.forEach((profile, idx) => {
        if (!profile) return;
        const url = profile.url || profile.value || '';
        const label = profile.label || profile.network || '';
        if (url && !label.trim()) {
          findings.push(this.createFinding({
            checkId: CHECK_IDS.LINK_CLARITY,
            severity: SEVERITY.WARNING,
            location: `Personal Info > Other Profiles [${idx + 1}]`,
            field: `personalInfo.otherProfiles[${idx}]`,
            title: 'Profile link missing label',
            explanation: 'This profile link has a URL but no descriptive label. Screen readers and print versions need a text label to identify the link purpose.',
            fixable: false
          }));
        }
      });
    }

    if (totalLinks > 0 && rawUrlCount === 0) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.LINK_CLARITY,
        severity: SEVERITY.INFO,
        location: 'Personal Info',
        field: 'personalInfo',
        title: 'Links look appropriate',
        explanation: `${totalLinks} link(s) found in personal info with reasonable lengths.`,
        fixable: false,
        pass: true
      }));
    }

    if (totalLinks === 0) {
      findings.push(this.createFinding({
        checkId: CHECK_IDS.LINK_CLARITY,
        severity: SEVERITY.INFO,
        location: 'Personal Info',
        field: 'personalInfo',
        title: 'No links configured',
        explanation: 'No profile URLs are set in personal info. Consider adding LinkedIn or portfolio links to help employers find you online.',
        fixable: false
      }));
    }

    return findings;
  }

  // ---- Dense Paragraphs ----

  checkDenseParagraphs(sections) {
    const findings = [];

    if (!sections || sections.length === 0) return findings;

    const textSectionTypes = [
      'summary', 'professionalSummary', 'careerObjective',
      'keyQualifications', 'coreCompetencies', 'declaration'
    ];

    for (const section of sections) {
      if (section.visible === false) continue;

      const sectionType = section.sectionType || section.type || '';
      const content = (section.content || '').trim();

      if (!content) continue;

      // Strip HTML tags for plain text length
      const plainText = this.stripHTMLSimple(content);

      if (textSectionTypes.includes(sectionType) && plainText.length > DENSE_TEXT_THRESHOLD) {
        const hasBreaks = /(\n\n|<br\s*\/?>.*<br\s*\/?>|<\/p>\s*<p)/i.test(content);
        if (!hasBreaks) {
          findings.push(this.createFinding({
            checkId: CHECK_IDS.DENSE_PARAGRAPH,
            severity: SEVERITY.WARNING,
            location: `Section: ${section.title || sectionType}`,
            field: `sections.${section.id}.content`,
            title: 'Dense text block detected',
            explanation: `The "${section.title || sectionType}" section contains ${plainText.length} characters in a single block without line breaks. Large text walls reduce readability. Consider breaking it into shorter paragraphs or bullet points.`,
            fixable: false
          }));
        }
      }

      // Also check items for dense text
      if (Array.isArray(section.items)) {
        section.items.forEach((item, idx) => {
          const textFields = ['responsibilities', 'roleSummary', 'description', 'summary', 'personalContribution'];
          for (const field of textFields) {
            if (item[field] && typeof item[field] === 'string') {
              const pt = this.stripHTMLSimple(item[field]);
              if (pt.length > DENSE_TEXT_THRESHOLD) {
                const hasBreaks = /(\n\n|<br\s*\/?>.*<br\s*\/?>|<\/p>\s*<p)/i.test(item[field]);
                if (!hasBreaks) {
                  const itemLabel = item.jobTitle || item.projectName || item.name || item.degree || `Item ${idx + 1}`;
                  findings.push(this.createFinding({
                    checkId: CHECK_IDS.DENSE_PARAGRAPH,
                    severity: SEVERITY.WARNING,
                    location: `${section.title || sectionType} > ${itemLabel}`,
                    field: `sections.${section.id}.items[${idx}].${field}`,
                    title: 'Dense text in entry',
                    explanation: `The "${field}" field in "${itemLabel}" has ${pt.length} characters without paragraph breaks. Break this into shorter statements or bullet points for better readability.`,
                    fixable: false
                  }));
                }
              }
            }
          }
        });
      }
    }

    return findings;
  }

  // ---- Missing Alt Text ----

  checkMissingAltText(personalInfo, design) {
    const findings = [];

    // Check for photograph without alt text
    const hasPhoto = personalInfo.photograph || design.photograph || design.profileImage;
    if (hasPhoto) {
      const altText = personalInfo.photographAlt || design.photographAlt || design.profileImageAlt;
      if (!altText || !(altText || '').trim()) {
        findings.push(this.createFinding({
          checkId: CHECK_IDS.MISSING_ALT_TEXT,
          severity: SEVERITY.WARNING,
          location: 'Personal Info / Design',
          field: 'personalInfo.photograph',
          title: 'Photo missing alt text',
          explanation: 'A profile photo is included but has no alternative text. Screen readers cannot describe the image without alt text. Consider adding a brief description (e.g., "Professional headshot of [Name]").',
          fixable: false
        }));
      }
    }

    // Check for signature without alt text
    const hasSignature = personalInfo.signature;
    if (hasSignature) {
      const sigAlt = personalInfo.signatureAlt;
      if (!sigAlt || !(sigAlt || '').trim()) {
        findings.push(this.createFinding({
          checkId: CHECK_IDS.MISSING_ALT_TEXT,
          severity: SEVERITY.INFO,
          location: 'Personal Info',
          field: 'personalInfo.signature',
          title: 'Signature image missing alt text',
          explanation: 'A signature image is included without alternative text. For accessibility, add alt text such as "Signature of [Name]".',
          fixable: false
        }));
      }
    }

    return findings;
  }

  // ==================== FINDING FACTORY ====================

  createFinding({ checkId, severity, location, field, title, explanation, fixable, fixValue, fixLabel, currentValue, pass }) {
    return {
      id: generateUUID(),
      checkId,
      severity,
      location,
      field,
      title,
      explanation,
      fixable: fixable || false,
      fixValue: fixValue !== undefined ? fixValue : null,
      fixLabel: fixLabel || null,
      currentValue: currentValue !== undefined ? currentValue : null,
      pass: pass || false
    };
  }

  // ==================== COLOR CONTRAST UTILITIES ====================

  hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return null;
    const num = parseInt(h, 16);
    if (isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  relativeLuminance(rgb) {
    const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  getContrastRatio(color1, color2) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    if (!rgb1 || !rgb2) return 0;

    const l1 = this.relativeLuminance(rgb1);
    const l2 = this.relativeLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // ==================== HELPERS ====================

  parseFontSize(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  stripHTMLSimple(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"');
  }

  // ==================== RESULTS VIEW ====================

  showResults() {
    const c = this.gc();
    c.innerHTML = '';
    this.view = 'results';

    if (!this.selectedDoc) return this.showDocumentSelection();

    const w = createElement('div', '', { class: 'a11y-results' });

    // Top bar with document info
    const topbar = createElement('div', '', { class: 'a11y-results-topbar' });
    const info = createElement('div', '', { class: 'a11y-results-info' });
    const docName = createElement('strong', '', {});
    docName.textContent = this.selectedDoc.name || 'Untitled';
    info.appendChild(docName);
    info.appendChild(createElement('span', ` · ${this.getDocTypeLabel(this.selectedDoc.type)} · ${formatTimeAgo(this.selectedDoc.lastModified)}`, { class: 'a11y-results-meta' }));
    topbar.appendChild(info);

    const acts = createElement('div', '', { class: 'a11y-results-actions' });
    const rerunBtn = createElement('button', 'Re-run Checks', { class: 'btn btn-sm btn-outline' });
    this.addListener(rerunBtn, 'click', () => this.rerunChecks());
    acts.appendChild(rerunBtn);

    const editBtn = createElement('button', 'Edit Document', { class: 'btn btn-sm btn-primary' });
    this.addListener(editBtn, 'click', () => this.navigateToEditor());
    acts.appendChild(editBtn);

    const chooseBtn = createElement('button', 'Choose Another', { class: 'btn btn-sm btn-ghost' });
    this.addListener(chooseBtn, 'click', () => this.showDocumentSelection());
    acts.appendChild(chooseBtn);
    topbar.appendChild(acts);
    w.appendChild(topbar);

    // Summary card
    w.appendChild(this.renderSummary());

    // Ignored toggle
    const ignoredCount = this.findings.filter(f => this.ignoredIds.has(f.id)).length;
    if (ignoredCount > 0) {
      const toggleRow = createElement('div', '', { class: 'a11y-ignored-toggle' });
      const toggleBtn = createElement('button', '', { class: 'btn btn-sm btn-ghost' });
      toggleBtn.textContent = this.showIgnored ? `Hide ${ignoredCount} ignored finding(s)` : `Show ${ignoredCount} ignored finding(s)`;
      this.addListener(toggleBtn, 'click', () => {
        this.showIgnored = !this.showIgnored;
        this.showResults();
      });
      toggleRow.appendChild(toggleBtn);
      w.appendChild(toggleRow);
    }

    // Findings list
    const findingsContainer = createElement('div', '', { class: 'a11y-findings', id: 'a11y-findings' });
    w.appendChild(findingsContainer);
    this.renderFindings(findingsContainer);

    // Privacy note
    const priv = createElement('div', '', { class: 'a11y-privacy-note' });
    priv.innerHTML = '&#128274; All checks run locally in your browser. No data is uploaded.';
    w.appendChild(priv);

    c.appendChild(w);
  }

  renderSummary() {
    const activeFindings = this.findings.filter(f => !this.ignoredIds.has(f.id));
    const errors = activeFindings.filter(f => f.severity === SEVERITY.ERROR && !f.pass);
    const warnings = activeFindings.filter(f => f.severity === SEVERITY.WARNING && !f.pass);
    const infos = activeFindings.filter(f => f.severity === SEVERITY.INFO && !f.pass);
    const passes = activeFindings.filter(f => f.pass);

    const hasIssues = errors.length > 0 || warnings.length > 0;
    const overallStatus = errors.length > 0 ? 'fail' : (warnings.length > 0 ? 'warn' : 'pass');

    const card = createElement('div', '', { class: `a11y-summary-card a11y-summary--${overallStatus}` });

    // Status icon
    const statusEl = createElement('div', '', { class: 'a11y-summary-status' });
    const iconEl = createElement('div', '', { class: `a11y-summary-icon a11y-summary-icon--${overallStatus}`, 'aria-hidden': 'true' });
    if (overallStatus === 'pass') {
      iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (overallStatus === 'warn') {
      iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    } else {
      iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }
    statusEl.appendChild(iconEl);

    const statusLabel = createElement('div', '', { class: 'a11y-summary-label' });
    if (overallStatus === 'pass') {
      statusLabel.textContent = 'All checks passed';
    } else if (overallStatus === 'warn') {
      statusLabel.textContent = 'Warnings found';
    } else {
      statusLabel.textContent = 'Issues found';
    }
    statusEl.appendChild(statusLabel);
    card.appendChild(statusEl);

    // Counts
    const counts = createElement('div', '', { class: 'a11y-summary-counts' });

    const errorCount = createElement('div', '', { class: 'a11y-count a11y-count--error' });
    errorCount.appendChild(createElement('span', String(errors.length), { class: 'a11y-count-num' }));
    errorCount.appendChild(createElement('span', errors.length === 1 ? 'Error' : 'Errors', { class: 'a11y-count-label' }));
    counts.appendChild(errorCount);

    const warnCount = createElement('div', '', { class: 'a11y-count a11y-count--warning' });
    warnCount.appendChild(createElement('span', String(warnings.length), { class: 'a11y-count-num' }));
    warnCount.appendChild(createElement('span', warnings.length === 1 ? 'Warning' : 'Warnings', { class: 'a11y-count-label' }));
    counts.appendChild(warnCount);

    const infoCount = createElement('div', '', { class: 'a11y-count a11y-count--info' });
    infoCount.appendChild(createElement('span', String(infos.length), { class: 'a11y-count-num' }));
    infoCount.appendChild(createElement('span', 'Info', { class: 'a11y-count-label' }));
    counts.appendChild(infoCount);

    const passCount = createElement('div', '', { class: 'a11y-count a11y-count--pass' });
    passCount.appendChild(createElement('span', String(passes.length), { class: 'a11y-count-num' }));
    passCount.appendChild(createElement('span', 'Passed', { class: 'a11y-count-label' }));
    counts.appendChild(passCount);

    card.appendChild(counts);

    return card;
  }

  renderFindings(container) {
    container.innerHTML = '';

    // Group findings by severity, passes at end
    const activeFindings = this.findings.filter(f => !this.ignoredIds.has(f.id) || this.showIgnored);

    const errors = activeFindings.filter(f => f.severity === SEVERITY.ERROR && !f.pass);
    const warnings = activeFindings.filter(f => f.severity === SEVERITY.WARNING && !f.pass);
    const infos = activeFindings.filter(f => f.severity === SEVERITY.INFO && !f.pass);
    const passes = activeFindings.filter(f => f.pass);

    if (errors.length > 0) {
      container.appendChild(this.renderFindingGroup('Errors', errors, 'error'));
    }
    if (warnings.length > 0) {
      container.appendChild(this.renderFindingGroup('Warnings', warnings, 'warning'));
    }
    if (infos.length > 0) {
      container.appendChild(this.renderFindingGroup('Informational', infos, 'info'));
    }
    if (passes.length > 0) {
      container.appendChild(this.renderFindingGroup('Passed Checks', passes, 'pass'));
    }

    if (activeFindings.length === 0) {
      container.appendChild(createElement('p', 'No findings to display.', { class: 'a11y-empty-msg' }));
    }
  }

  renderFindingGroup(title, findings, type) {
    const group = createElement('div', '', { class: `a11y-finding-group a11y-finding-group--${type}` });
    group.appendChild(createElement('h3', `${title} (${findings.length})`, { class: 'a11y-group-title' }));

    const list = createElement('div', '', { class: 'a11y-finding-list' });

    findings.forEach(finding => {
      list.appendChild(this.renderFindingCard(finding));
    });

    group.appendChild(list);
    return group;
  }

  renderFindingCard(finding) {
    const isIgnored = this.ignoredIds.has(finding.id);
    const card = createElement('div', '', {
      class: `a11y-finding-card a11y-finding-card--${finding.severity} ${isIgnored ? 'a11y-finding-card--ignored' : ''} ${finding.pass ? 'a11y-finding-card--pass' : ''}`
    });
    card.tabIndex = 0;

    // Header row: severity badge + title
    const header = createElement('div', '', { class: 'a11y-finding-header' });

    const severity = createElement('span', '', { class: `a11y-severity-badge a11y-severity--${finding.pass ? 'pass' : finding.severity}` });
    if (finding.pass) {
      severity.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      severity.setAttribute('aria-label', 'Passed');
    } else if (finding.severity === SEVERITY.ERROR) {
      severity.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      severity.setAttribute('aria-label', 'Error');
    } else if (finding.severity === SEVERITY.WARNING) {
      severity.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      severity.setAttribute('aria-label', 'Warning');
    } else {
      severity.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
      severity.setAttribute('aria-label', 'Info');
    }
    header.appendChild(severity);

    const titleEl = createElement('span', '', { class: 'a11y-finding-title' });
    titleEl.textContent = finding.title;
    header.appendChild(titleEl);

    if (isIgnored) {
      header.appendChild(createElement('span', 'Ignored', { class: 'a11y-ignored-badge' }));
    }

    card.appendChild(header);

    // Location
    const location = createElement('div', '', { class: 'a11y-finding-location' });
    location.textContent = finding.location;
    card.appendChild(location);

    // Explanation
    const explanation = createElement('p', '', { class: 'a11y-finding-explanation' });
    explanation.textContent = finding.explanation;
    card.appendChild(explanation);

    // Actions row
    if (!finding.pass) {
      const actions = createElement('div', '', { class: 'a11y-finding-actions' });

      // Go to Setting button
      if (finding.field && finding.field.startsWith('design.')) {
        const goBtn = createElement('button', 'Go to Setting', { class: 'btn btn-sm btn-outline' });
        this.addListener(goBtn, 'click', e => {
          e.stopPropagation();
          this.navigateToEditor();
        });
        actions.appendChild(goBtn);
      }

      // Auto-fix button
      if (finding.fixable && finding.fixValue !== null) {
        const fixBtn = createElement('button', finding.fixLabel || 'Auto-fix', { class: 'btn btn-sm btn-primary' });
        this.addListener(fixBtn, 'click', e => {
          e.stopPropagation();
          this.applyAutoFix(finding);
        });
        actions.appendChild(fixBtn);
      }

      // Ignore button
      const ignoreBtn = createElement('button', isIgnored ? 'Unignore' : 'Ignore', { class: 'btn btn-sm btn-ghost' });
      this.addListener(ignoreBtn, 'click', e => {
        e.stopPropagation();
        this.toggleIgnore(finding.id);
      });
      actions.appendChild(ignoreBtn);

      card.appendChild(actions);
    }

    return card;
  }

  // ==================== ACTIONS ====================

  toggleIgnore(findingId) {
    if (this.ignoredIds.has(findingId)) {
      this.ignoredIds.delete(findingId);
    } else {
      this.ignoredIds.add(findingId);
    }
    this.showResults();
  }

  async applyAutoFix(finding) {
    if (!this.selectedDoc || !finding.fixable) return;

    try {
      // Re-read the document to get latest version
      const doc = await this.db.read(STORES.DOCUMENTS, this.selectedDocId);
      if (!doc) {
        if (window.CC?.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }

      // Apply fix based on field
      let fixed = false;

      if (!doc.design) doc.design = {};

      switch (finding.field) {
        case 'design.fontSize':
          doc.design.fontSize = finding.fixValue;
          fixed = true;
          break;
        case 'design.nameSize':
          doc.design.nameSize = finding.fixValue;
          fixed = true;
          break;
        case 'design.headingSize':
          doc.design.headingSize = finding.fixValue;
          fixed = true;
          break;
        default:
          if (window.CC?.toast) window.CC.toast.show('This issue cannot be auto-fixed', 'info');
          return;
      }

      if (fixed) {
        doc.lastModified = new Date().toISOString();
        await this.db.update(STORES.DOCUMENTS, doc);
        this.selectedDoc = doc;

        if (window.CC?.toast) window.CC.toast.show(`Fixed: ${finding.title}`, 'success');

        // Re-run checks with updated document
        this.findings = this.runAllChecks(doc);
        this.showResults();
      }
    } catch (err) {
      console.error('Auto-fix failed:', err);
      if (window.CC?.toast) window.CC.toast.show('Failed to apply fix: ' + err.message, 'error');
    }
  }

  async rerunChecks() {
    if (!this.selectedDocId) return;

    try {
      // Re-read the document for latest data
      const doc = await this.db.read(STORES.DOCUMENTS, this.selectedDocId);
      if (!doc) {
        if (window.CC?.toast) window.CC.toast.show('Document not found. It may have been deleted.', 'error');
        this.showDocumentSelection();
        return;
      }

      this.selectedDoc = doc;
      this.findings = this.runAllChecks(doc);
      this.showResults();

      if (window.CC?.toast) window.CC.toast.show('Checks re-run successfully', 'success');
    } catch (err) {
      console.error('Re-run failed:', err);
      if (window.CC?.toast) window.CC.toast.show('Failed to re-run checks', 'error');
    }
  }

  navigateToEditor() {
    if (this.selectedDocId) {
      if (window.CC?.router) {
        window.CC.router.navigate(`/editor/${this.selectedDocId}`);
      } else {
        window.location.hash = `#/editor/${this.selectedDocId}`;
      }
    }
  }
}

export { A11yInspector as default };
