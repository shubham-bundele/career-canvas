/**
 * Privacy & Redaction Studio Module
 * Scans resume documents for potentially sensitive information patterns
 * and allows users to review, dismiss, or redact findings before sharing.
 *
 * All detection is heuristic-based and findings are labeled as "potential"
 * rather than definitive identifications.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';

/**
 * Sensitivity pattern types
 */
const PATTERN_TYPES = {
  PHONE: 'phone',
  EMAIL: 'email',
  ADDRESS: 'address',
  GOVERNMENT_ID: 'governmentId',
  PRIVATE_URL: 'privateUrl'
};

/**
 * Human-readable labels for pattern types
 */
const PATTERN_LABELS = {
  [PATTERN_TYPES.PHONE]: 'Phone Number',
  [PATTERN_TYPES.EMAIL]: 'Email Address',
  [PATTERN_TYPES.ADDRESS]: 'Street Address',
  [PATTERN_TYPES.GOVERNMENT_ID]: 'Government ID',
  [PATTERN_TYPES.PRIVATE_URL]: 'Private/Internal URL'
};

/**
 * Badge color classes for pattern types
 */
const PATTERN_COLORS = {
  [PATTERN_TYPES.PHONE]: '#2563eb',
  [PATTERN_TYPES.EMAIL]: '#7c3aed',
  [PATTERN_TYPES.ADDRESS]: '#059669',
  [PATTERN_TYPES.GOVERNMENT_ID]: '#dc2626',
  [PATTERN_TYPES.PRIVATE_URL]: '#d97706'
};

/**
 * Default redaction placeholders per type
 */
const DEFAULT_PLACEHOLDERS = {
  [PATTERN_TYPES.PHONE]: '[PHONE]',
  [PATTERN_TYPES.EMAIL]: '[EMAIL]',
  [PATTERN_TYPES.ADDRESS]: '[ADDRESS]',
  [PATTERN_TYPES.GOVERNMENT_ID]: '[ID]',
  [PATTERN_TYPES.PRIVATE_URL]: '[URL]'
};

/**
 * Finding statuses
 */
const FINDING_STATUS = {
  PENDING: 'pending',
  DISMISSED: 'dismissed',
  REDACT: 'redact'
};

/**
 * Regex patterns for sensitive data detection
 */
const DETECTION_PATTERNS = {
  [PATTERN_TYPES.PHONE]: [
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
    /\+\d{1,3}\s?\(?\d{1,4}\)?\s?\d{1,4}\s?\d{1,9}/g,
    /\+\d{1,3}\s\d{3}\s\d{3}\s\d{4}/g
  ],
  [PATTERN_TYPES.EMAIL]: [
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  ],
  [PATTERN_TYPES.ADDRESS]: [
    /\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Pl|Place|Way|Cir(?:cle)?|Terr(?:ace)?|Pike|Hwy|Highway)\.?(?:\s*(?:#|Apt|Suite|Ste|Unit|Fl|Floor)\s*\w+)?/gi
  ],
  [PATTERN_TYPES.GOVERNMENT_ID]: [
    /\d{3}-\d{2}-\d{4}/g
  ],
  [PATTERN_TYPES.PRIVATE_URL]: [
    /https?:\/\/[^\s]*(?:internal|intranet|private|corp\.|\.local)[^\s]*/gi,
    /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[^\s]*/g,
    /https?:\/\/(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}[^\s]*/g
  ]
};

/**
 * PrivacyStudio class
 */
export class PrivacyStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];

    this.documents = [];
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.findings = [];
    this.view = 'select'; // 'select' | 'results'
  }

  // ==================== LIFECYCLE ====================

  /**
   * Renders the Privacy Studio container and initial view
   * @returns {HTMLElement} The container element
   */
  async render() {
    this.container = createElement('div', '', { class: 'privacy-studio-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Privacy and Redaction Studio');

    this.container.appendChild(this.renderHeader());

    const content = createElement('div', '', { class: 'ps-content', id: 'ps-content' });
    this.container.appendChild(content);

    await this.showDocumentSelection();

    return this.container;
  }

  /**
   * Adds an event listener and tracks it for cleanup
   */
  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  /**
   * Removes all tracked listeners and clears the container
   */
  destroy() {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  // ==================== HEADER ====================

  renderHeader() {
    const header = createElement('div', '', { class: 'ps-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'ps-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });

    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);

    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);

    const cur = createElement('li', 'Privacy Check', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);

    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const row = createElement('div', '', { class: 'ps-title-row' });
    const group = createElement('div', '', { class: 'ps-title-group' });
    group.appendChild(createElement('h1', 'Privacy & Redaction Studio', { class: 'ps-title' }));
    group.appendChild(createElement('p',
      'Scan your documents for potentially sensitive information such as phone numbers, email addresses, physical addresses, and ID patterns. Review each finding and choose to dismiss or redact before sharing. All processing happens locally in your browser.',
      { class: 'ps-description' }
    ));
    row.appendChild(group);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline ps-back-btn' });
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

  // ==================== DOCUMENT SELECTION VIEW ====================

  async showDocumentSelection() {
    this.view = 'select';
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.findings = [];

    const content = this.container.querySelector('#ps-content');
    if (!content) return;
    content.innerHTML = '';

    try {
      this.documents = await this.db.getAll('documents');
    } catch (err) {
      console.error('Privacy Studio: failed to load documents', err);
      this.documents = [];
    }

    if (this.documents.length === 0) {
      const empty = createElement('div', '', { class: 'ps-empty-state' });
      empty.appendChild(createElement('p', 'No documents found. Create a resume or cover letter first, then return here to check for sensitive information.', { class: 'ps-empty-text' }));
      const goBtn = createElement('button', 'Go to Dashboard', { class: 'btn btn-primary' });
      this.addListener(goBtn, 'click', () => {
        if (window.CC?.router) window.CC.router.navigate('/dashboard');
        else window.location.hash = '#/dashboard';
      });
      empty.appendChild(goBtn);
      content.appendChild(empty);
      return;
    }

    const selectSection = createElement('div', '', { class: 'ps-select-section' });
    selectSection.appendChild(createElement('h2', 'Select a Document to Scan', { class: 'ps-section-title' }));
    selectSection.appendChild(createElement('p', 'Choose a document to scan for potentially sensitive information patterns.', { class: 'ps-section-desc' }));

    const grid = createElement('div', '', { class: 'ps-doc-grid' });

    this.documents.forEach(doc => {
      const card = createElement('div', '', { class: 'ps-doc-card' });
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Scan document: ${doc.name || 'Untitled'}`);

      const cardName = createElement('div', doc.name || 'Untitled', { class: 'ps-doc-card-name' });
      card.appendChild(cardName);

      const cardType = createElement('div', this.formatDocType(doc.type), { class: 'ps-doc-card-type' });
      card.appendChild(cardType);

      if (doc.lastModified) {
        const modified = createElement('div', `Last modified: ${new Date(doc.lastModified).toLocaleDateString()}`, { class: 'ps-doc-card-date' });
        card.appendChild(modified);
      }

      const scanBtn = createElement('button', 'Scan for Sensitive Data', { class: 'btn btn-sm btn-primary ps-scan-btn' });
      scanBtn.setAttribute('aria-label', `Scan ${doc.name || 'Untitled'} for sensitive data`);
      this.addListener(scanBtn, 'click', (e) => {
        e.stopPropagation();
        this.scanDocument(doc.id);
      });
      card.appendChild(scanBtn);

      this.addListener(card, 'click', () => this.scanDocument(doc.id));
      this.addListener(card, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.scanDocument(doc.id);
        }
      });

      grid.appendChild(card);
    });

    selectSection.appendChild(grid);
    content.appendChild(selectSection);
  }

  formatDocType(type) {
    if (!type) return 'Document';
    const labels = {
      resume: 'Resume',
      'cover-letter': 'Cover Letter',
      coverLetter: 'Cover Letter',
      reference: 'Reference Sheet'
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  // ==================== SCANNING ====================

  async scanDocument(docId) {
    try {
      this.selectedDoc = await this.db.get('documents', docId);
    } catch (err) {
      console.error('Privacy Studio: failed to load document', err);
      if (window.CC?.toast) window.CC.toast.error('Failed to load document.');
      return;
    }

    if (!this.selectedDoc) {
      if (window.CC?.toast) window.CC.toast.error('Document not found.');
      return;
    }

    this.selectedDocId = docId;
    this.findings = this.performScan(this.selectedDoc);
    this.view = 'results';
    this.renderResults();
  }

  /**
   * Performs the privacy scan across all text fields in the document
   * @param {Object} doc - The document to scan
   * @returns {Array} Array of finding objects
   */
  performScan(doc) {
    const findings = [];

    // Scan personalInfo fields
    if (doc.personalInfo && typeof doc.personalInfo === 'object') {
      this.scanObject(doc.personalInfo, 'personalInfo', 'Personal Info', findings);
    }

    // Scan sections
    if (Array.isArray(doc.sections)) {
      doc.sections.forEach((section, sectionIndex) => {
        const sectionLabel = section.title || section.type || `Section ${sectionIndex + 1}`;
        const sectionPath = `sections[${sectionIndex}]`;

        // Scan section-level string fields
        if (section.title) {
          this.scanString(section.title, `${sectionPath}.title`, `${sectionLabel} > Title`, findings);
        }

        // Scan items within sections
        if (Array.isArray(section.items)) {
          section.items.forEach((item, itemIndex) => {
            const itemLabel = item.title || item.company || item.institution || `Item ${itemIndex + 1}`;
            const itemPath = `${sectionPath}.items[${itemIndex}]`;
            const itemLocationPrefix = `${sectionLabel} > ${itemLabel}`;

            this.scanObject(item, itemPath, itemLocationPrefix, findings);
          });
        }
      });
    }

    return findings;
  }

  /**
   * Recursively scans an object's string fields
   */
  scanObject(obj, pathPrefix, locationPrefix, findings) {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        const fieldPath = `${pathPrefix}.${key}`;
        const location = `${locationPrefix} > ${this.formatFieldName(key)}`;
        this.scanString(value, fieldPath, location, findings);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.scanObject(value, `${pathPrefix}.${key}`, `${locationPrefix} > ${this.formatFieldName(key)}`, findings);
      }
    }
  }

  /**
   * Scans a single string value against all patterns
   */
  scanString(value, fieldPath, location, findings) {
    for (const [type, patterns] of Object.entries(DETECTION_PATTERNS)) {
      for (const pattern of patterns) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(value)) !== null) {
          const matchedText = match[0];

          // Avoid duplicates (same text at same field path)
          const isDuplicate = findings.some(
            f => f.matchedText === matchedText && f.fieldPath === fieldPath && f.type === type
          );

          if (!isDuplicate) {
            findings.push({
              id: generateUUID(),
              type,
              matchedText,
              fieldPath,
              location,
              status: FINDING_STATUS.PENDING,
              placeholder: DEFAULT_PLACEHOLDERS[type] || '[REDACTED]'
            });
          }
        }
      }
    }
  }

  /**
   * Formats a camelCase field name to human-readable
   */
  formatFieldName(name) {
    if (!name) return '';
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==================== RESULTS VIEW ====================

  renderResults() {
    const content = this.container.querySelector('#ps-content');
    if (!content) return;
    content.innerHTML = '';

    const resultsSection = createElement('div', '', { class: 'ps-results-section' });

    // Back to document selection button
    const backRow = createElement('div', '', { class: 'ps-results-back-row' });
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline ps-results-back-btn' });
    backBtn.innerHTML = '&#8592; Choose Different Document';
    backBtn.setAttribute('aria-label', 'Back to document selection');
    this.addListener(backBtn, 'click', () => this.showDocumentSelection());
    backRow.appendChild(backBtn);
    resultsSection.appendChild(backRow);

    // Document name
    const docNameRow = createElement('div', '', { class: 'ps-results-doc-name-row' });
    docNameRow.appendChild(createElement('h2', `Scanning: ${this.selectedDoc.name || 'Untitled'}`, { class: 'ps-results-doc-name' }));
    resultsSection.appendChild(docNameRow);

    // Summary bar
    resultsSection.appendChild(this.renderSummaryBar());

    // Findings list
    const pendingFindings = this.findings.filter(f => f.status === FINDING_STATUS.PENDING);
    const dismissedFindings = this.findings.filter(f => f.status === FINDING_STATUS.DISMISSED);
    const redactFindings = this.findings.filter(f => f.status === FINDING_STATUS.REDACT);

    if (this.findings.length === 0) {
      const noResults = createElement('div', '', { class: 'ps-no-results' });
      noResults.appendChild(createElement('p', 'No potentially sensitive information patterns were detected in this document.', { class: 'ps-no-results-text' }));
      noResults.appendChild(createElement('p', 'This does not guarantee the document is free of sensitive data. Always review your documents manually before sharing.', { class: 'ps-no-results-disclaimer' }));
      resultsSection.appendChild(noResults);
    } else {
      // Pending findings
      if (pendingFindings.length > 0) {
        const pendingSection = createElement('div', '', { class: 'ps-findings-group' });
        pendingSection.appendChild(createElement('h3', `Pending Review (${pendingFindings.length})`, { class: 'ps-findings-group-title' }));
        pendingFindings.forEach(finding => {
          pendingSection.appendChild(this.renderFindingCard(finding));
        });
        resultsSection.appendChild(pendingSection);
      }

      // Marked for redaction
      if (redactFindings.length > 0) {
        const redactSection = createElement('div', '', { class: 'ps-findings-group ps-findings-group-redact' });
        redactSection.appendChild(createElement('h3', `Marked for Redaction (${redactFindings.length})`, { class: 'ps-findings-group-title ps-findings-group-title-redact' }));
        redactFindings.forEach(finding => {
          redactSection.appendChild(this.renderFindingCard(finding));
        });
        resultsSection.appendChild(redactSection);
      }

      // Dismissed findings
      if (dismissedFindings.length > 0) {
        const dismissedSection = createElement('div', '', { class: 'ps-findings-group ps-findings-group-dismissed' });
        const dismissedHeader = createElement('div', '', { class: 'ps-findings-group-header-toggle' });
        dismissedHeader.setAttribute('tabindex', '0');
        dismissedHeader.setAttribute('role', 'button');
        dismissedHeader.setAttribute('aria-expanded', 'false');
        dismissedHeader.setAttribute('aria-label', `Show dismissed findings (${dismissedFindings.length})`);
        dismissedHeader.appendChild(createElement('h3', `Dismissed (${dismissedFindings.length})`, { class: 'ps-findings-group-title ps-findings-group-title-dismissed' }));

        const dismissedContent = createElement('div', '', { class: 'ps-dismissed-content' });
        dismissedContent.style.display = 'none';
        dismissedFindings.forEach(finding => {
          dismissedContent.appendChild(this.renderFindingCard(finding));
        });

        this.addListener(dismissedHeader, 'click', () => {
          const isHidden = dismissedContent.style.display === 'none';
          dismissedContent.style.display = isHidden ? 'block' : 'none';
          dismissedHeader.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });
        this.addListener(dismissedHeader, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dismissedHeader.click();
          }
        });

        dismissedSection.appendChild(dismissedHeader);
        dismissedSection.appendChild(dismissedContent);
        resultsSection.appendChild(dismissedSection);
      }

      // Bottom action bar
      resultsSection.appendChild(this.renderActionBar());
    }

    content.appendChild(resultsSection);
  }

  // ==================== SUMMARY BAR ====================

  renderSummaryBar() {
    const bar = createElement('div', '', { class: 'ps-summary-bar', 'aria-label': 'Scan results summary' });

    const totalCount = this.findings.length;
    const pendingCount = this.findings.filter(f => f.status === FINDING_STATUS.PENDING).length;
    const redactCount = this.findings.filter(f => f.status === FINDING_STATUS.REDACT).length;
    const dismissedCount = this.findings.filter(f => f.status === FINDING_STATUS.DISMISSED).length;

    // Total findings
    bar.appendChild(this.createSummaryItem('Total Findings', totalCount, '#6b7280'));

    // By status
    bar.appendChild(this.createSummaryItem('Pending', pendingCount, '#f59e0b'));
    bar.appendChild(this.createSummaryItem('Will Redact', redactCount, '#dc2626'));
    bar.appendChild(this.createSummaryItem('Dismissed', dismissedCount, '#10b981'));

    // Separator
    const sep = createElement('div', '', { class: 'ps-summary-separator' });
    bar.appendChild(sep);

    // By type
    for (const type of Object.values(PATTERN_TYPES)) {
      const count = this.findings.filter(f => f.type === type).length;
      if (count > 0) {
        bar.appendChild(this.createSummaryItem(PATTERN_LABELS[type], count, PATTERN_COLORS[type]));
      }
    }

    return bar;
  }

  createSummaryItem(label, count, color) {
    const item = createElement('div', '', { class: 'ps-summary-item' });
    const dot = createElement('span', '', { class: 'ps-summary-dot' });
    dot.style.backgroundColor = color;
    item.appendChild(dot);
    item.appendChild(createElement('span', `${label}: `, { class: 'ps-summary-label' }));
    item.appendChild(createElement('span', String(count), { class: 'ps-summary-count' }));
    return item;
  }

  // ==================== FINDING CARD ====================

  renderFindingCard(finding) {
    const card = createElement('div', '', {
      class: `ps-finding-card ps-finding-card-${finding.status}`,
      'data-finding-id': finding.id
    });
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `${PATTERN_LABELS[finding.type] || finding.type} finding: ${finding.status}`);

    // Top row: type badge + status
    const topRow = createElement('div', '', { class: 'ps-finding-top-row' });

    const badge = createElement('span', PATTERN_LABELS[finding.type] || finding.type, { class: 'ps-finding-badge' });
    badge.style.backgroundColor = PATTERN_COLORS[finding.type] || '#6b7280';
    badge.style.color = '#ffffff';
    topRow.appendChild(badge);

    const statusBadge = createElement('span', this.getStatusLabel(finding.status), {
      class: `ps-finding-status ps-finding-status-${finding.status}`
    });
    topRow.appendChild(statusBadge);

    card.appendChild(topRow);

    // Location
    const locationEl = createElement('div', '', { class: 'ps-finding-location' });
    locationEl.appendChild(createElement('span', 'Location: ', { class: 'ps-finding-location-label' }));
    locationEl.appendChild(createElement('span', finding.location, { class: 'ps-finding-location-value' }));
    card.appendChild(locationEl);

    // Matched text
    const matchBox = createElement('div', '', { class: 'ps-finding-match-box' });
    matchBox.appendChild(createElement('span', 'Matched text: ', { class: 'ps-finding-match-label' }));
    const matchValue = createElement('code', finding.matchedText, { class: 'ps-finding-match-value' });
    matchBox.appendChild(matchValue);
    card.appendChild(matchBox);

    // Placeholder display for redacted findings
    if (finding.status === FINDING_STATUS.REDACT) {
      const placeholderRow = createElement('div', '', { class: 'ps-finding-placeholder-row' });
      placeholderRow.appendChild(createElement('span', 'Will be replaced with: ', { class: 'ps-finding-placeholder-label' }));
      placeholderRow.appendChild(createElement('code', finding.placeholder, { class: 'ps-finding-placeholder-value' }));
      card.appendChild(placeholderRow);
    }

    // Actions
    const actions = createElement('div', '', { class: 'ps-finding-actions' });

    if (finding.status === FINDING_STATUS.PENDING) {
      // Dismiss button
      const dismissBtn = createElement('button', 'Dismiss (Not Sensitive)', { class: 'btn btn-sm btn-outline ps-btn-dismiss' });
      dismissBtn.setAttribute('aria-label', `Dismiss finding: ${finding.matchedText}`);
      this.addListener(dismissBtn, 'click', () => {
        this.updateFindingStatus(finding.id, FINDING_STATUS.DISMISSED);
      });
      actions.appendChild(dismissBtn);

      // Redact button with placeholder choice
      const redactGroup = createElement('div', '', { class: 'ps-redact-group' });

      const placeholderSelect = createElement('select', '', {
        class: 'ps-placeholder-select',
        'aria-label': `Redaction placeholder for ${finding.matchedText}`
      });

      const defaultOpt = createElement('option', DEFAULT_PLACEHOLDERS[finding.type] || '[REDACTED]');
      defaultOpt.value = DEFAULT_PLACEHOLDERS[finding.type] || '[REDACTED]';
      defaultOpt.selected = true;
      placeholderSelect.appendChild(defaultOpt);

      if (DEFAULT_PLACEHOLDERS[finding.type] !== '[REDACTED]') {
        const genericOpt = createElement('option', '[REDACTED]');
        genericOpt.value = '[REDACTED]';
        placeholderSelect.appendChild(genericOpt);
      }

      // Add all other type-specific placeholders as options
      for (const [pType, pLabel] of Object.entries(DEFAULT_PLACEHOLDERS)) {
        if (pType !== finding.type && pLabel !== '[REDACTED]') {
          const opt = createElement('option', pLabel);
          opt.value = pLabel;
          placeholderSelect.appendChild(opt);
        }
      }

      redactGroup.appendChild(placeholderSelect);

      const redactBtn = createElement('button', 'Redact', { class: 'btn btn-sm btn-danger ps-btn-redact' });
      redactBtn.setAttribute('aria-label', `Redact finding: ${finding.matchedText}`);
      this.addListener(redactBtn, 'click', () => {
        const selectedPlaceholder = placeholderSelect.value;
        this.markForRedaction(finding.id, selectedPlaceholder);
      });
      redactGroup.appendChild(redactBtn);

      actions.appendChild(redactGroup);
    } else if (finding.status === FINDING_STATUS.DISMISSED) {
      // Undo dismiss
      const undoBtn = createElement('button', 'Undo Dismiss', { class: 'btn btn-sm btn-outline ps-btn-undo' });
      undoBtn.setAttribute('aria-label', `Undo dismiss for: ${finding.matchedText}`);
      this.addListener(undoBtn, 'click', () => {
        this.updateFindingStatus(finding.id, FINDING_STATUS.PENDING);
      });
      actions.appendChild(undoBtn);
    } else if (finding.status === FINDING_STATUS.REDACT) {
      // Undo redact
      const undoBtn = createElement('button', 'Undo Redaction', { class: 'btn btn-sm btn-outline ps-btn-undo' });
      undoBtn.setAttribute('aria-label', `Undo redaction for: ${finding.matchedText}`);
      this.addListener(undoBtn, 'click', () => {
        this.updateFindingStatus(finding.id, FINDING_STATUS.PENDING);
      });
      actions.appendChild(undoBtn);
    }

    card.appendChild(actions);

    return card;
  }

  getStatusLabel(status) {
    switch (status) {
      case FINDING_STATUS.PENDING: return 'Pending';
      case FINDING_STATUS.DISMISSED: return 'Dismissed';
      case FINDING_STATUS.REDACT: return 'Will Redact';
      default: return status;
    }
  }

  // ==================== FINDING STATUS UPDATES ====================

  updateFindingStatus(findingId, newStatus) {
    const finding = this.findings.find(f => f.id === findingId);
    if (!finding) return;

    finding.status = newStatus;
    this.renderResults();
  }

  markForRedaction(findingId, placeholder) {
    const finding = this.findings.find(f => f.id === findingId);
    if (!finding) return;

    finding.status = FINDING_STATUS.REDACT;
    finding.placeholder = placeholder || DEFAULT_PLACEHOLDERS[finding.type] || '[REDACTED]';
    this.renderResults();
  }

  // ==================== ACTION BAR ====================

  renderActionBar() {
    const bar = createElement('div', '', { class: 'ps-action-bar' });

    const redactCount = this.findings.filter(f => f.status === FINDING_STATUS.REDACT).length;

    const redactAllPendingBtn = createElement('button', 'Redact All Pending', { class: 'btn btn-sm btn-outline ps-btn-redact-all' });
    const pendingCount = this.findings.filter(f => f.status === FINDING_STATUS.PENDING).length;
    if (pendingCount === 0) {
      redactAllPendingBtn.disabled = true;
      redactAllPendingBtn.setAttribute('aria-disabled', 'true');
    }
    redactAllPendingBtn.setAttribute('aria-label', `Redact all ${pendingCount} pending findings`);
    this.addListener(redactAllPendingBtn, 'click', () => {
      if (pendingCount === 0) return;
      this.findings.forEach(f => {
        if (f.status === FINDING_STATUS.PENDING) {
          f.status = FINDING_STATUS.REDACT;
        }
      });
      this.renderResults();
    });
    bar.appendChild(redactAllPendingBtn);

    const dismissAllPendingBtn = createElement('button', 'Dismiss All Pending', { class: 'btn btn-sm btn-outline ps-btn-dismiss-all' });
    if (pendingCount === 0) {
      dismissAllPendingBtn.disabled = true;
      dismissAllPendingBtn.setAttribute('aria-disabled', 'true');
    }
    dismissAllPendingBtn.setAttribute('aria-label', `Dismiss all ${pendingCount} pending findings`);
    this.addListener(dismissAllPendingBtn, 'click', () => {
      if (pendingCount === 0) return;
      this.findings.forEach(f => {
        if (f.status === FINDING_STATUS.PENDING) {
          f.status = FINDING_STATUS.DISMISSED;
        }
      });
      this.renderResults();
    });
    bar.appendChild(dismissAllPendingBtn);

    const createCopyBtn = createElement('button', `Create Redacted Copy (${redactCount} redactions)`, { class: 'btn btn-primary ps-btn-create-copy' });
    createCopyBtn.setAttribute('aria-label', `Create a redacted copy of the document with ${redactCount} redactions`);
    if (redactCount === 0) {
      createCopyBtn.disabled = true;
      createCopyBtn.setAttribute('aria-disabled', 'true');
    }
    this.addListener(createCopyBtn, 'click', () => {
      if (redactCount === 0) return;
      this.createRedactedCopy();
    });
    bar.appendChild(createCopyBtn);

    return bar;
  }

  // ==================== REDACTED COPY CREATION ====================

  /**
   * Creates a redacted copy of the document with all 'redact' findings applied.
   * The original document is not modified.
   */
  async createRedactedCopy() {
    const redactFindings = this.findings.filter(f => f.status === FINDING_STATUS.REDACT);
    if (redactFindings.length === 0) {
      if (window.CC?.toast) window.CC.toast.warning('No findings marked for redaction.');
      return;
    }

    // Deep clone the original document
    let redactedDoc;
    try {
      redactedDoc = JSON.parse(JSON.stringify(this.selectedDoc));
    } catch (err) {
      console.error('Privacy Studio: failed to clone document', err);
      if (window.CC?.toast) window.CC.toast.error('Failed to create redacted copy.');
      return;
    }

    // Assign new identity
    redactedDoc.id = generateUUID();
    redactedDoc.name = (this.selectedDoc.name || 'Untitled') + ' (Redacted)';
    redactedDoc.lastModified = Date.now();
    redactedDoc.createdAt = Date.now();

    // Apply each redaction
    for (const finding of redactFindings) {
      this.applyRedaction(redactedDoc, finding);
    }

    // Save to IndexedDB
    try {
      await this.db.put('documents', redactedDoc);
      // Verify: re-scan the redacted copy for anything the redaction missed
      // (e.g. the same value appearing in a field that was never flagged).
      let remaining = [];
      try {
        remaining = this.performScan(redactedDoc) || [];
      } catch { remaining = []; }
      if (window.CC?.toast) {
        if (remaining.length > 0) {
          window.CC.toast.warning(
            `Redacted copy saved, but ${remaining.length} sensitive item${remaining.length === 1 ? '' : 's'} may remain — open the redacted copy in Privacy Studio to review.`,
            8000
          );
        } else {
          window.CC.toast.success(`Redacted copy "${redactedDoc.name}" created and verified clean. The original was not modified.`);
        }
      }
    } catch (err) {
      console.error('Privacy Studio: failed to save redacted document', err);
      if (window.CC?.toast) window.CC.toast.error('Failed to save redacted copy.');
    }
  }

  /**
   * Applies a single redaction to the cloned document by navigating the field path
   * and replacing the matched text with the placeholder.
   */
  applyRedaction(doc, finding) {
    const { fieldPath, matchedText, placeholder } = finding;

    // Parse the field path to navigate the object
    // e.g., "personalInfo.phone" or "sections[0].items[1].description"
    const segments = this.parseFieldPath(fieldPath);
    if (segments.length === 0) return;

    // Navigate to the parent and get the final key
    let current = doc;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (current === null || current === undefined) return;
      current = current[seg];
    }

    const lastKey = segments[segments.length - 1];
    if (current === null || current === undefined) return;

    if (typeof current[lastKey] === 'string') {
      // Replace all occurrences of the matched text in this field
      current[lastKey] = current[lastKey].split(matchedText).join(placeholder);
    }
  }

  /**
   * Parses a field path string into an array of path segments.
   * Handles both dot notation and bracket notation.
   * e.g., "sections[0].items[1].description" -> ["sections", 0, "items", 1, "description"]
   */
  parseFieldPath(path) {
    const segments = [];
    const regex = /([^.\[\]]+)|\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
      if (match[1] !== undefined) {
        segments.push(match[1]);
      } else if (match[2] !== undefined) {
        segments.push(parseInt(match[2], 10));
      }
    }

    return segments;
  }
}


