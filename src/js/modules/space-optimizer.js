/**
 * Space Optimizer Module
 * Analyzes resume documents and generates reversible suggestions
 * to optimize space usage and target a specific page count.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { STORES } from '../core/db.js';

/**
 * Suggestion categories
 */
const CATEGORIES = {
  SPACING: 'spacing',
  TYPOGRAPHY: 'typography',
  MARGINS: 'margins',
  CONTENT: 'content',
  SECTIONS: 'sections'
};

const CATEGORY_LABELS = {
  [CATEGORIES.SPACING]: 'Spacing',
  [CATEGORIES.TYPOGRAPHY]: 'Typography',
  [CATEGORIES.MARGINS]: 'Margins',
  [CATEGORIES.CONTENT]: 'Content',
  [CATEGORIES.SECTIONS]: 'Sections'
};

const CATEGORY_ICONS = {
  [CATEGORIES.SPACING]: '↕',
  [CATEGORIES.TYPOGRAPHY]: 'Aa',
  [CATEGORIES.MARGINS]: '□',
  [CATEGORIES.CONTENT]: '✎',
  [CATEGORIES.SECTIONS]: '☰'
};

/**
 * Default design values used when document has no explicit design settings
 */
const DESIGN_DEFAULTS = {
  baseFontSize: 11,
  lineHeight: 1.5,
  sectionSpacing: 16,
  paragraphSpacing: 8,
  margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }
};

export class SpaceOptimizer {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];

    this.documents = [];
    this.selectedDocId = null;
    this.selectedDoc = null;

    this.targetPages = null;
    this.suggestions = [];
    this.appliedSuggestions = [];

    this.resumeSearchQuery = '';
    this.resumeFilterType = 'all';
    this.resumeSortField = 'lastModified';
  }

  // ==================== RENDER / LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'so-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Resume Space Optimizer');

    this.container.appendChild(this.renderHeader());

    const content = createElement('div', '', { class: 'so-content', id: 'so-content' });
    this.container.appendChild(content);

    await this.showDocumentSelection();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'so-header' });

    const breadcrumb = createElement('nav', '', { class: 'so-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });

    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);

    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);

    const cur = createElement('li', 'Space Optimizer', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);

    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    const titleRow = createElement('div', '', { class: 'so-title-row' });
    const titleGroup = createElement('div', '', { class: 'so-title-group' });
    titleGroup.appendChild(createElement('h1', 'Resume Space Optimizer', { class: 'so-title' }));
    titleGroup.appendChild(createElement('p', 'Analyze your document layout and apply reversible optimizations to fit your resume into the target page count.', { class: 'so-description' }));
    titleRow.appendChild(titleGroup);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline so-back-btn' });
    backBtn.innerHTML = '&#8592; Dashboard';
    backBtn.setAttribute('aria-label', 'Back to Dashboard');
    this.addListener(backBtn, 'click', () => {
      if (window.CC?.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    titleRow.appendChild(backBtn);
    header.appendChild(titleRow);

    return header;
  }

  gc() {
    return this.container ? this.container.querySelector('#so-content') : null;
  }

  // ==================== DOCUMENT SELECTION ====================

  async showDocumentSelection() {
    const content = this.gc();
    if (!content) return;
    content.innerHTML = '';

    try {
      this.documents = await this.db.getAll(STORES.DOCUMENTS);
    } catch (e) {
      content.appendChild(this.renderError('Failed to load documents. Please try again.'));
      return;
    }

    const wrapper = createElement('div', '', { class: 'so-doc-selection' });
    wrapper.appendChild(createElement('h2', 'Select a Document to Optimize', { class: 'so-section-title' }));

    const controls = createElement('div', '', { class: 'so-doc-controls' });

    const searchInput = createElement('input', '', {
      class: 'so-search-input',
      type: 'search',
      placeholder: 'Search documents...',
      'aria-label': 'Search documents'
    });
    this.addListener(searchInput, 'input', (e) => {
      this.resumeSearchQuery = e.target.value.toLowerCase();
      this.renderDocumentList();
    });
    controls.appendChild(searchInput);

    const typeFilter = createElement('select', '', { class: 'so-filter-select', 'aria-label': 'Filter by document type' });
    const types = [
      { value: 'all', label: 'All Types' },
      { value: 'resume', label: 'Resumes' },
      { value: 'cv', label: 'CVs' },
      { value: 'cover-letter', label: 'Cover Letters' },
      { value: 'reference', label: 'References' }
    ];
    types.forEach(t => {
      typeFilter.appendChild(createElement('option', t.label, { value: t.value }));
    });
    this.addListener(typeFilter, 'change', (e) => {
      this.resumeFilterType = e.target.value;
      this.renderDocumentList();
    });
    controls.appendChild(typeFilter);

    const sortSelect = createElement('select', '', { class: 'so-filter-select', 'aria-label': 'Sort documents' });
    const sorts = [
      { value: 'lastModified', label: 'Last Modified' },
      { value: 'name', label: 'Name A-Z' }
    ];
    sorts.forEach(s => {
      sortSelect.appendChild(createElement('option', s.label, { value: s.value }));
    });
    this.addListener(sortSelect, 'change', (e) => {
      this.resumeSortField = e.target.value;
      this.renderDocumentList();
    });
    controls.appendChild(sortSelect);

    wrapper.appendChild(controls);

    const listContainer = createElement('div', '', { class: 'so-doc-list', id: 'so-doc-list' });
    wrapper.appendChild(listContainer);

    content.appendChild(wrapper);
    this.renderDocumentList();
  }

  renderDocumentList() {
    const listContainer = this.container.querySelector('#so-doc-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let filtered = this.documents.filter(d => !d.archived);

    if (this.resumeFilterType !== 'all') {
      filtered = filtered.filter(d => d.type === this.resumeFilterType);
    }

    if (this.resumeSearchQuery) {
      filtered = filtered.filter(d => {
        const searchable = [d.title, d.name, d.targetRole, d.type, ...(d.tags || [])].join(' ').toLowerCase();
        return searchable.includes(this.resumeSearchQuery);
      });
    }

    switch (this.resumeSortField) {
      case 'name':
        filtered.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
        break;
      default:
        filtered.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    if (filtered.length === 0) {
      const empty = createElement('div', '', { class: 'so-doc-empty' });
      if (this.documents.length === 0) {
        empty.appendChild(createElement('p', 'No documents found. Create a resume first.'));
      } else {
        empty.appendChild(createElement('p', 'No documents match your search or filter.'));
        const clearBtn = createElement('button', 'Clear Filters', { class: 'btn btn-outline btn-sm' });
        this.addListener(clearBtn, 'click', () => {
          this.resumeSearchQuery = '';
          this.resumeFilterType = 'all';
          const si = this.container.querySelector('.so-search-input');
          if (si) si.value = '';
          const tf = this.container.querySelector('.so-filter-select');
          if (tf) tf.value = 'all';
          this.renderDocumentList();
        });
        empty.appendChild(clearBtn);
      }
      listContainer.appendChild(empty);
      return;
    }

    const grid = createElement('div', '', { class: 'so-doc-grid', role: 'radiogroup', 'aria-label': 'Select a document' });

    filtered.forEach((doc, index) => {
      const card = createElement('div', '', {
        class: 'so-doc-card',
        role: 'radio',
        'aria-checked': 'false',
        'aria-label': doc.title || doc.name || 'Untitled',
        'data-doc-id': doc.id
      });
      card.tabIndex = index === 0 ? 0 : -1;

      const typeIcons = { resume: '📄', cv: '📋', 'cover-letter': '✉️', reference: '👥' };
      const typeLabels = { resume: 'Resume', cv: 'CV', 'cover-letter': 'Cover Letter', reference: 'References' };

      const cardHeader = createElement('div', '', { class: 'so-doc-card-header' });
      cardHeader.appendChild(createElement('span', typeIcons[doc.type] || '📄', { class: 'so-doc-card-icon', 'aria-hidden': 'true' }));
      cardHeader.appendChild(createElement('span', typeLabels[doc.type] || 'Document', { class: 'so-doc-card-badge' }));
      card.appendChild(cardHeader);

      const cardTitle = createElement('h3', '', { class: 'so-doc-card-title' });
      cardTitle.textContent = doc.title || doc.name || 'Untitled';
      card.appendChild(cardTitle);

      const sectionCount = Array.isArray(doc.sections) ? doc.sections.filter(s => s.visible !== false).length : 0;
      const meta = createElement('div', '', { class: 'so-doc-card-meta' });
      meta.appendChild(createElement('span', this.formatTimeAgo(doc.lastModified)));
      meta.appendChild(createElement('span', ' · ', { 'aria-hidden': 'true' }));
      meta.appendChild(createElement('span', sectionCount + ' sections'));
      card.appendChild(meta);

      this.addListener(card, 'click', () => this.selectDocument(doc.id));
      this.addListener(card, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectDocument(doc.id);
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const next = card.nextElementSibling;
          if (next) { next.focus(); next.tabIndex = 0; card.tabIndex = -1; }
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = card.previousElementSibling;
          if (prev) { prev.focus(); prev.tabIndex = 0; card.tabIndex = -1; }
        }
      });

      grid.appendChild(card);
    });

    listContainer.appendChild(grid);
  }

  async selectDocument(docId) {
    try {
      this.selectedDoc = await this.db.get(STORES.DOCUMENTS, docId);
      if (!this.selectedDoc) {
        if (window.CC?.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }
      this.selectedDocId = docId;
      this.appliedSuggestions = [];
      this.suggestions = [];
      this.targetPages = null;
      this.showTargetSelector();
    } catch (e) {
      console.error('Failed to select document:', e);
      if (window.CC?.toast) window.CC.toast.show('Failed to load document', 'error');
    }
  }

  // ==================== TARGET PAGE COUNT ====================

  showTargetSelector() {
    const content = this.gc();
    if (!content) return;
    content.innerHTML = '';

    const wrapper = createElement('div', '', { class: 'so-target-selection' });

    const selectedBar = this.renderSelectedDocBar();
    wrapper.appendChild(selectedBar);

    wrapper.appendChild(createElement('h2', 'Choose Target Page Count', { class: 'so-section-title' }));
    wrapper.appendChild(createElement('p', 'Select how many pages you want your resume to fit into. The optimizer will generate suggestions based on your target.', { class: 'so-section-desc' }));

    const btnGroup = createElement('div', '', { class: 'so-target-group', role: 'radiogroup', 'aria-label': 'Target page count' });

    const options = [
      { value: 1, label: '1 Page', desc: 'Concise single-page resume' },
      { value: 2, label: '2 Pages', desc: 'Standard professional resume' },
      { value: 3, label: '3 Pages', desc: 'Detailed CV or senior role' },
      { value: null, label: 'No Fixed Target', desc: 'Just show all optimizations' }
    ];

    options.forEach(opt => {
      const btn = createElement('button', '', {
        class: 'so-target-btn' + (this.targetPages === opt.value ? ' so-target-btn--active' : ''),
        role: 'radio',
        'aria-checked': this.targetPages === opt.value ? 'true' : 'false'
      });

      btn.appendChild(createElement('span', opt.label, { class: 'so-target-btn-label' }));
      btn.appendChild(createElement('span', opt.desc, { class: 'so-target-btn-desc' }));

      this.addListener(btn, 'click', () => {
        this.targetPages = opt.value;
        this.analyzeSuggestions();
        this.showSuggestions();
      });

      btnGroup.appendChild(btn);
    });

    wrapper.appendChild(btnGroup);
    content.appendChild(wrapper);
  }

  renderSelectedDocBar() {
    const bar = createElement('div', '', { class: 'so-selected-bar' });
    const info = createElement('div', '', { class: 'so-selected-info' });
    info.appendChild(createElement('span', 'Document: ', { class: 'so-selected-label' }));
    const name = createElement('strong', '');
    name.textContent = this.selectedDoc.title || this.selectedDoc.name || 'Untitled';
    info.appendChild(name);
    bar.appendChild(info);

    const changeBtn = createElement('button', 'Change Document', { class: 'btn btn-sm btn-outline' });
    this.addListener(changeBtn, 'click', () => {
      this.selectedDocId = null;
      this.selectedDoc = null;
      this.suggestions = [];
      this.appliedSuggestions = [];
      this.showDocumentSelection();
    });
    bar.appendChild(changeBtn);

    return bar;
  }

  // ==================== ANALYSIS ====================

  analyzeSuggestions() {
    this.suggestions = [];
    if (!this.selectedDoc) return;

    const design = this.selectedDoc.design || {};
    const sections = Array.isArray(this.selectedDoc.sections) ? this.selectedDoc.sections : [];

    const currentSectionSpacing = design.sectionSpacing != null ? design.sectionSpacing : DESIGN_DEFAULTS.sectionSpacing;
    const currentParagraphSpacing = design.paragraphSpacing != null ? design.paragraphSpacing : DESIGN_DEFAULTS.paragraphSpacing;
    const currentFontSize = design.baseFontSize != null ? design.baseFontSize : DESIGN_DEFAULTS.baseFontSize;
    const currentLineHeight = design.lineHeight != null ? design.lineHeight : DESIGN_DEFAULTS.lineHeight;
    const currentMargins = design.margins || { ...DESIGN_DEFAULTS.margins };

    // 1. Reduce section spacing
    if (currentSectionSpacing > 10) {
      this.suggestions.push({
        id: generateUUID(),
        description: 'Reduce section spacing',
        detail: 'Decrease the vertical gap between resume sections to reclaim space.',
        category: CATEGORIES.SPACING,
        estimatedSpaceSaved: 5,
        field: 'design.sectionSpacing',
        originalValue: currentSectionSpacing,
        newValue: 10,
        displayOriginal: currentSectionSpacing + 'px',
        displayNew: '10px'
      });
    }

    // 2. Reduce paragraph spacing
    if (currentParagraphSpacing > 4) {
      this.suggestions.push({
        id: generateUUID(),
        description: 'Reduce paragraph spacing',
        detail: 'Tighten the gap between paragraphs and bullet groups.',
        category: CATEGORIES.SPACING,
        estimatedSpaceSaved: 4,
        field: 'design.paragraphSpacing',
        originalValue: currentParagraphSpacing,
        newValue: 4,
        displayOriginal: currentParagraphSpacing + 'px',
        displayNew: '4px'
      });
    }

    // 3. Use compact font size
    if (currentFontSize > 10) {
      this.suggestions.push({
        id: generateUUID(),
        description: 'Use compact font size',
        detail: 'Reduce the base font size to fit more content per page.',
        category: CATEGORIES.TYPOGRAPHY,
        estimatedSpaceSaved: 8,
        field: 'design.baseFontSize',
        originalValue: currentFontSize,
        newValue: 10,
        displayOriginal: currentFontSize + 'pt',
        displayNew: '10pt'
      });
    }

    // 4. Reduce line height
    if (currentLineHeight > 1.3) {
      this.suggestions.push({
        id: generateUUID(),
        description: 'Reduce line height',
        detail: 'Decrease line spacing to make text blocks more compact.',
        category: CATEGORIES.TYPOGRAPHY,
        estimatedSpaceSaved: 6,
        field: 'design.lineHeight',
        originalValue: currentLineHeight,
        newValue: 1.3,
        displayOriginal: currentLineHeight.toFixed(1),
        displayNew: '1.3'
      });
    }

    // 5. Reduce margins
    const avgMargin = (currentMargins.top + currentMargins.right + currentMargins.bottom + currentMargins.left) / 4;
    if (avgMargin > 15) {
      this.suggestions.push({
        id: generateUUID(),
        description: 'Reduce margins',
        detail: 'Shrink page margins to increase the usable content area.',
        category: CATEGORIES.MARGINS,
        estimatedSpaceSaved: 10,
        field: 'design.margins',
        originalValue: { ...currentMargins },
        newValue: { top: 15, right: 15, bottom: 15, left: 15 },
        displayOriginal: avgMargin.toFixed(1) + 'mm avg',
        displayNew: '15mm all sides'
      });
    }

    // 6. Condense older experience
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const expSections = sections.filter(s =>
      s.type === 'experience' && Array.isArray(s.items) && s.visible !== false
    );

    expSections.forEach(section => {
      section.items.forEach(item => {
        if (!item.endDate && !item.description) return;
        const endDate = item.endDate ? new Date(item.endDate) : null;
        const isOld = endDate && endDate < fiveYearsAgo;

        if (isOld && item.description && item.description.length > 100) {
          this.suggestions.push({
            id: generateUUID(),
            description: 'Condense older experience',
            detail: 'Truncate description for "' + (item.title || 'Untitled') + '" (older than 5 years).',
            category: CATEGORIES.CONTENT,
            estimatedSpaceSaved: 3,
            field: 'section-item-description',
            sectionId: section.id,
            itemId: item.id,
            originalValue: item.description,
            newValue: item.description.substring(0, 100).trim() + '...',
            displayOriginal: item.description.length + ' chars',
            displayNew: '~100 chars'
          });
        }
      });
    });

    // 7. Hide optional sections
    const optionalTypes = ['interests', 'references', 'languages'];

    sections.forEach(section => {
      if (optionalTypes.includes(section.type) && section.visible !== false) {
        this.suggestions.push({
          id: generateUUID(),
          description: 'Hide optional section',
          detail: 'Hide the "' + (section.title || section.type) + '" section to save space.',
          category: CATEGORIES.SECTIONS,
          estimatedSpaceSaved: 5,
          field: 'section-visibility',
          sectionId: section.id,
          originalValue: true,
          newValue: false,
          displayOriginal: 'Visible',
          displayNew: 'Hidden'
        });
      }
    });
  }

  // ==================== SUGGESTIONS VIEW ====================

  showSuggestions() {
    const content = this.gc();
    if (!content) return;
    content.innerHTML = '';

    const wrapper = createElement('div', '', { class: 'so-suggestions-view' });
    wrapper.appendChild(this.renderSelectedDocBar());
    wrapper.appendChild(this.renderTargetBar());
    wrapper.appendChild(this.renderSummaryBar());

    // AI Condense Content button
    wrapper.appendChild(this.renderAiCondenseButton());

    if (this.suggestions.length === 0) {
      const empty = createElement('div', '', { class: 'so-no-suggestions' });
      empty.appendChild(createElement('p', 'No optimization suggestions available for this document. Your spacing and layout settings are already compact.'));
      wrapper.appendChild(empty);
    } else {
      const list = createElement('div', '', { class: 'so-suggestion-list', id: 'so-suggestion-list' });
      this.suggestions.forEach(s => list.appendChild(this.renderSuggestionCard(s)));
      wrapper.appendChild(list);
    }

    wrapper.appendChild(this.renderPrivacyFooter());
    content.appendChild(wrapper);
  }

  renderTargetBar() {
    const bar = createElement('div', '', { class: 'so-target-bar' });
    const label = createElement('span', '', { class: 'so-target-bar-label' });
    label.textContent = this.targetPages != null
      ? 'Target: ' + this.targetPages + ' page' + (this.targetPages !== 1 ? 's' : '')
      : 'Target: No fixed target';
    bar.appendChild(label);

    const changeBtn = createElement('button', 'Change Target', { class: 'btn btn-sm btn-ghost' });
    this.addListener(changeBtn, 'click', () => this.showTargetSelector());
    bar.appendChild(changeBtn);

    return bar;
  }

  renderSummaryBar() {
    const bar = createElement('div', '', { class: 'so-summary-bar' });

    const available = this.suggestions.length;
    const applied = this.appliedSuggestions.length;
    const totalSaved = this.appliedSuggestions.reduce((sum, id) => {
      const s = this.suggestions.find(sug => sug.id === id);
      return sum + (s ? s.estimatedSpaceSaved : 0);
    }, 0);

    const statsRow = createElement('div', '', { class: 'so-summary-stats' });

    const availableStat = createElement('div', '', { class: 'so-summary-stat' });
    availableStat.appendChild(createElement('span', String(available), { class: 'so-summary-stat-value' }));
    availableStat.appendChild(createElement('span', 'Available', { class: 'so-summary-stat-label' }));
    statsRow.appendChild(availableStat);

    const appliedStat = createElement('div', '', { class: 'so-summary-stat so-summary-stat--applied' });
    appliedStat.appendChild(createElement('span', String(applied), { class: 'so-summary-stat-value' }));
    appliedStat.appendChild(createElement('span', 'Applied', { class: 'so-summary-stat-label' }));
    statsRow.appendChild(appliedStat);

    const savedStat = createElement('div', '', { class: 'so-summary-stat so-summary-stat--saved' });
    savedStat.appendChild(createElement('span', '~' + totalSaved + '%', { class: 'so-summary-stat-value' }));
    savedStat.appendChild(createElement('span', 'Est. Space Saved', { class: 'so-summary-stat-label' }));
    statsRow.appendChild(savedStat);

    bar.appendChild(statsRow);
    return bar;
  }

  renderSuggestionCard(suggestion) {
    const isApplied = this.appliedSuggestions.includes(suggestion.id);

    const card = createElement('div', '', {
      class: 'so-suggestion-card' + (isApplied ? ' so-suggestion-card--applied' : ''),
      'data-suggestion-id': suggestion.id
    });

    const cardHeader = createElement('div', '', { class: 'so-suggestion-card-header' });

    const categoryBadge = createElement('span', '', { class: 'so-category-badge so-category--' + suggestion.category });
    categoryBadge.appendChild(createElement('span', CATEGORY_ICONS[suggestion.category] || '', { class: 'so-category-icon', 'aria-hidden': 'true' }));
    categoryBadge.appendChild(document.createTextNode(' ' + (CATEGORY_LABELS[suggestion.category] || suggestion.category)));
    cardHeader.appendChild(categoryBadge);

    const spaceBadge = createElement('span', '~' + suggestion.estimatedSpaceSaved + '% space saved', { class: 'so-space-badge' });
    cardHeader.appendChild(spaceBadge);

    if (isApplied) {
      const appliedBadge = createElement('span', '✓ Applied', { class: 'so-applied-badge' });
      cardHeader.appendChild(appliedBadge);
    }

    card.appendChild(cardHeader);

    const title = createElement('h3', '', { class: 'so-suggestion-title' });
    title.textContent = suggestion.description;
    card.appendChild(title);

    const detail = createElement('p', '', { class: 'so-suggestion-detail' });
    detail.textContent = suggestion.detail;
    card.appendChild(detail);

    const values = createElement('div', '', { class: 'so-suggestion-values' });
    const currentBox = createElement('div', '', { class: 'so-value-box so-value-box--current' });
    currentBox.appendChild(createElement('span', 'Current', { class: 'so-value-label' }));
    currentBox.appendChild(createElement('span', String(suggestion.displayOriginal), { class: 'so-value-data' }));
    values.appendChild(currentBox);

    const arrow = createElement('span', '→', { class: 'so-value-arrow', 'aria-hidden': 'true' });
    values.appendChild(arrow);

    const newBox = createElement('div', '', { class: 'so-value-box so-value-box--new' });
    newBox.appendChild(createElement('span', 'Proposed', { class: 'so-value-label' }));
    newBox.appendChild(createElement('span', String(suggestion.displayNew), { class: 'so-value-data' }));
    values.appendChild(newBox);

    card.appendChild(values);

    const actions = createElement('div', '', { class: 'so-suggestion-actions' });

    if (!isApplied) {
      const applyBtn = createElement('button', 'Apply', { class: 'btn btn-sm btn-primary so-apply-btn' });
      this.addListener(applyBtn, 'click', () => this.applySuggestion(suggestion.id));
      actions.appendChild(applyBtn);
    } else {
      const undoBtn = createElement('button', 'Undo', { class: 'btn btn-sm btn-outline so-undo-btn' });
      this.addListener(undoBtn, 'click', () => this.undoSuggestion(suggestion.id));
      actions.appendChild(undoBtn);
    }

    card.appendChild(actions);
    return card;
  }

  // ==================== APPLY / UNDO ====================

  async applySuggestion(suggestionId) {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    try {
      const doc = await this.db.get(STORES.DOCUMENTS, this.selectedDocId);
      if (!doc) {
        if (window.CC?.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }

      if (!doc.design) doc.design = {};

      if (suggestion.field === 'design.sectionSpacing') {
        doc.design.sectionSpacing = suggestion.newValue;
      } else if (suggestion.field === 'design.paragraphSpacing') {
        doc.design.paragraphSpacing = suggestion.newValue;
      } else if (suggestion.field === 'design.baseFontSize') {
        doc.design.baseFontSize = suggestion.newValue;
      } else if (suggestion.field === 'design.lineHeight') {
        doc.design.lineHeight = suggestion.newValue;
      } else if (suggestion.field === 'design.margins') {
        doc.design.margins = { ...suggestion.newValue };
      } else if (suggestion.field === 'section-item-description') {
        const section = (doc.sections || []).find(s => s.id === suggestion.sectionId);
        if (section) {
          const item = (section.items || []).find(i => i.id === suggestion.itemId);
          if (item) item.description = suggestion.newValue;
        }
      } else if (suggestion.field === 'section-visibility') {
        const section = (doc.sections || []).find(s => s.id === suggestion.sectionId);
        if (section) section.visible = suggestion.newValue;
      }

      doc.lastModified = new Date().toISOString();
      await this.db.put(STORES.DOCUMENTS, doc);
      this.selectedDoc = doc;

      this.appliedSuggestions.push(suggestionId);
      this.showSuggestions();

      if (window.CC?.toast) window.CC.toast.show('Optimization applied', 'success');
    } catch (e) {
      console.error('Failed to apply suggestion:', e);
      if (window.CC?.toast) window.CC.toast.show('Failed to apply optimization', 'error');
    }
  }

  async undoSuggestion(suggestionId) {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    try {
      const doc = await this.db.get(STORES.DOCUMENTS, this.selectedDocId);
      if (!doc) {
        if (window.CC?.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }

      if (!doc.design) doc.design = {};

      if (suggestion.field === 'design.sectionSpacing') {
        doc.design.sectionSpacing = suggestion.originalValue;
      } else if (suggestion.field === 'design.paragraphSpacing') {
        doc.design.paragraphSpacing = suggestion.originalValue;
      } else if (suggestion.field === 'design.baseFontSize') {
        doc.design.baseFontSize = suggestion.originalValue;
      } else if (suggestion.field === 'design.lineHeight') {
        doc.design.lineHeight = suggestion.originalValue;
      } else if (suggestion.field === 'design.margins') {
        doc.design.margins = { ...suggestion.originalValue };
      } else if (suggestion.field === 'section-item-description') {
        const section = (doc.sections || []).find(s => s.id === suggestion.sectionId);
        if (section) {
          const item = (section.items || []).find(i => i.id === suggestion.itemId);
          if (item) item.description = suggestion.originalValue;
        }
      } else if (suggestion.field === 'section-visibility') {
        const section = (doc.sections || []).find(s => s.id === suggestion.sectionId);
        if (section) section.visible = suggestion.originalValue;
      }

      doc.lastModified = new Date().toISOString();
      await this.db.put(STORES.DOCUMENTS, doc);
      this.selectedDoc = doc;

      this.appliedSuggestions = this.appliedSuggestions.filter(id => id !== suggestionId);
      this.showSuggestions();

      if (window.CC?.toast) window.CC.toast.show('Optimization reverted', 'info');
    } catch (e) {
      console.error('Failed to undo suggestion:', e);
      if (window.CC?.toast) window.CC.toast.show('Failed to revert optimization', 'error');
    }
  }

  // ==================== AI CONDENSE ====================

  renderAiCondenseButton() {
    const section = createElement('div', '', { class: 'so-ai-condense-section' });

    const btn = createElement('button', '', { class: 'btn btn-primary so-ai-condense-btn' });
    btn.innerHTML = '&#10024; AI Condense Content';
    btn.setAttribute('aria-label', 'AI Condense Content - shorten long achievement bullets');
    this.addListener(btn, 'click', () => this.runAiCondense(btn));
    section.appendChild(btn);

    const resultsContainer = createElement('div', '', { class: 'so-ai-condense-results', id: 'so-ai-condense-results' });
    section.appendChild(resultsContainer);

    return section;
  }

  _collectBullets() {
    const bullets = [];
    const sections = Array.isArray(this.selectedDoc.sections) ? this.selectedDoc.sections : [];
    sections.forEach(section => {
      if (section.visible === false || !Array.isArray(section.items)) return;
      section.items.forEach(item => {
        if (item.included === false || item.hidden) return;
        if (Array.isArray(item.achievements)) {
          item.achievements.forEach((ach, achIndex) => {
            const text = typeof ach === 'string' ? ach : (ach?.text || '');
            if (text.length > 100) {
              bullets.push({
                sectionId: section.id,
                itemId: item.id,
                achIndex,
                text,
                itemTitle: item.jobTitle || item.title || item.projectName || item.name || 'Untitled'
              });
            }
          });
        }
      });
    });
    return bullets;
  }

  async runAiCondense(btn) {
    const resultsContainer = this.container.querySelector('#so-ai-condense-results');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    const longBullets = this._collectBullets();

    if (longBullets.length === 0) {
      const msg = createElement('p', 'No achievement bullets over 100 characters found. Your content is already concise.', { class: 'so-ai-condense-empty' });
      resultsContainer.appendChild(msg);
      return;
    }

    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.textContent = 'Condensing...';

    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());
      const bulletTexts = longBullets.map(b => b.text);
      const condensed = await ai.condenseBullets(bulletTexts);

      if (!condensed || condensed.length === 0) {
        resultsContainer.appendChild(createElement('p', 'AI returned no condensed results. Try again later.', { class: 'so-ai-condense-empty' }));
        return;
      }

      this.showAiCondenseResults(resultsContainer, longBullets, condensed);
    } catch (err) {
      const errEl = createElement('p', 'AI error: ' + (err.message || 'Unknown error'), { class: 'so-ai-condense-error' });
      resultsContainer.appendChild(errEl);
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }

  showAiCondenseResults(container, longBullets, condensed) {
    container.innerHTML = '';

    const header = createElement('div', '', { class: 'so-ai-condense-header' });
    header.appendChild(createElement('h3', 'Condensed Bullets (' + Math.min(longBullets.length, condensed.length) + ' results)', { class: 'so-ai-condense-title' }));

    const applyAllBtn = createElement('button', 'Apply All', { class: 'btn btn-sm btn-primary' });
    this.addListener(applyAllBtn, 'click', async () => {
      applyAllBtn.disabled = true;
      applyAllBtn.textContent = 'Applying...';
      try {
        for (let i = 0; i < Math.min(longBullets.length, condensed.length); i++) {
          const condensedText = typeof condensed[i] === 'string' ? condensed[i] : (condensed[i]?.text || condensed[i]?.condensed || String(condensed[i]));
          await this._applyCondensedBullet(longBullets[i], condensedText);
        }
        if (window.CC?.toast) window.CC.toast.show('All condensed bullets applied', 'success');
        container.querySelectorAll('.so-ai-condense-apply-btn').forEach(b => {
          b.disabled = true;
          b.textContent = 'Applied';
        });
        applyAllBtn.textContent = 'All Applied';
      } catch (err) {
        if (window.CC?.toast) window.CC.toast.show('Failed to apply: ' + err.message, 'error');
        applyAllBtn.disabled = false;
        applyAllBtn.textContent = 'Apply All';
      }
    });
    header.appendChild(applyAllBtn);
    container.appendChild(header);

    const count = Math.min(longBullets.length, condensed.length);
    for (let i = 0; i < count; i++) {
      const bullet = longBullets[i];
      const condensedText = typeof condensed[i] === 'string' ? condensed[i] : (condensed[i]?.text || condensed[i]?.condensed || String(condensed[i]));

      const card = createElement('div', '', { class: 'so-ai-condense-card' });

      const cardLabel = createElement('div', '', { class: 'so-ai-condense-card-label' });
      cardLabel.textContent = bullet.itemTitle;
      card.appendChild(cardLabel);

      const comparison = createElement('div', '', { class: 'so-ai-condense-comparison' });

      const beforeBox = createElement('div', '', { class: 'so-value-box so-value-box--current' });
      beforeBox.appendChild(createElement('span', 'Before (' + bullet.text.length + ' chars)', { class: 'so-value-label' }));
      const beforeText = createElement('p', '', { class: 'so-ai-condense-text' });
      beforeText.textContent = bullet.text;
      beforeBox.appendChild(beforeText);
      comparison.appendChild(beforeBox);

      const arrow = createElement('span', '→', { class: 'so-value-arrow', 'aria-hidden': 'true' });
      comparison.appendChild(arrow);

      const afterBox = createElement('div', '', { class: 'so-value-box so-value-box--new' });
      afterBox.appendChild(createElement('span', 'After (' + condensedText.length + ' chars)', { class: 'so-value-label' }));
      const afterText = createElement('p', '', { class: 'so-ai-condense-text' });
      afterText.textContent = condensedText;
      afterBox.appendChild(afterText);
      comparison.appendChild(afterBox);

      card.appendChild(comparison);

      const applyBtn = createElement('button', 'Apply', { class: 'btn btn-sm btn-outline so-ai-condense-apply-btn' });
      this.addListener(applyBtn, 'click', async () => {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying...';
        try {
          await this._applyCondensedBullet(bullet, condensedText);
          applyBtn.textContent = 'Applied';
          if (window.CC?.toast) window.CC.toast.show('Bullet condensed', 'success');
        } catch (err) {
          applyBtn.disabled = false;
          applyBtn.textContent = 'Apply';
          if (window.CC?.toast) window.CC.toast.show('Failed: ' + err.message, 'error');
        }
      });
      card.appendChild(applyBtn);

      container.appendChild(card);
    }
  }

  async _applyCondensedBullet(bulletInfo, condensedText) {
    const doc = await this.db.get(STORES.DOCUMENTS, this.selectedDocId);
    if (!doc) throw new Error('Document not found');

    const section = (doc.sections || []).find(s => s.id === bulletInfo.sectionId);
    if (!section) throw new Error('Section not found');

    const item = (section.items || []).find(it => it.id === bulletInfo.itemId);
    if (!item || !Array.isArray(item.achievements)) throw new Error('Item not found');

    const ach = item.achievements[bulletInfo.achIndex];
    if (typeof ach === 'string') {
      item.achievements[bulletInfo.achIndex] = condensedText;
    } else if (ach && typeof ach === 'object') {
      ach.text = condensedText;
    }

    doc.lastModified = new Date().toISOString();
    await this.db.put(STORES.DOCUMENTS, doc);
    this.selectedDoc = doc;
  }

  // ==================== HELPERS ====================

  renderError(message) {
    const el = createElement('div', '', { class: 'so-error' });
    el.appendChild(createElement('span', '⚠', { class: 'so-error-icon', 'aria-hidden': 'true' }));
    el.appendChild(createElement('p', message, { class: 'so-error-text' }));

    const retryBtn = createElement('button', 'Try Again', { class: 'btn btn-sm btn-primary' });
    this.addListener(retryBtn, 'click', () => this.showDocumentSelection());
    el.appendChild(retryBtn);

    return el;
  }

  renderPrivacyFooter() {
    const footer = createElement('div', '', { class: 'so-privacy-note' });
    const lockIcon = createElement('span', '', { 'aria-hidden': 'true' });
    lockIcon.innerHTML = '&#128274;';
    footer.appendChild(lockIcon);
    footer.appendChild(document.createTextNode(' All analysis runs locally in your browser. Your documents are never uploaded.'));
    return footer;
  }

  formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 30) return diffDay + 'd ago';
    return date.toLocaleDateString();
  }

  hasUnsavedChanges() {
    return false;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

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
    this.suggestions = [];
    this.appliedSuggestions = [];
  }
}

