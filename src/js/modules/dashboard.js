/**
 * Dashboard Module
 * Displays user documents and provides quick actions
 */

import eventBus, { EVENTS } from '../core/events.js';
import { createElement, sanitizeInput } from '../utils/sanitize.js';
import { formatTimeAgo, pluralize } from '../utils/format.js';
import { DOCUMENT_TYPES } from '../core/schema.js';

/**
 * Filter types
 */
const FILTER_TYPES = {
  ALL: 'all',
  RESUMES: 'resumes',
  CVS: 'cvs',
  COVER_LETTERS: 'coverLetters',
  REFERENCES: 'references',
  ARCHIVED: 'archived'
};

/**
 * Sort types
 */
const SORT_TYPES = {
  LAST_MODIFIED: 'lastModified',
  NAME_ASC: 'nameAsc',
  NAME_DESC: 'nameDesc',
  CREATED_DATE: 'createdDate',
  TYPE: 'type'
};

/**
 * Dashboard class
 */
export class Dashboard {
  constructor(dbManager, events, templateEngine) {
    this.db = dbManager;
    this.events = events;
    this.templateEngine = templateEngine;
    this.container = null;
    this.documents = [];
    this.filteredDocuments = [];
    this.currentFilter = FILTER_TYPES.ALL;
    this.currentSort = SORT_TYPES.LAST_MODIFIED;
    this.searchQuery = '';
    this.selectedTags = [];
    this.listeners = [];
  }

  /**
   * Renders the dashboard
   * @returns {HTMLElement} Dashboard container
   */
  render() {
    this.container = createElement('div', '', { class: 'dashboard-container' });

    // Drop overlay (hidden by default, shown during drag)
    this.dropOverlay = createElement('div', '', { class: 'dashboard-drop-overlay' });
    this.dropOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(59,130,246,0.08);display:none;align-items:center;justify-content:center;z-index:1000;pointer-events:none;';
    const dropOverlayContent = createElement('div', '', {});
    dropOverlayContent.style.cssText = 'border:3px dashed var(--color-primary, #3b82f6);border-radius:16px;padding:48px 64px;text-align:center;background:rgba(255,255,255,0.95);pointer-events:none;box-shadow:0 8px 32px rgba(0,0,0,0.12);';
    const dropIcon = createElement('div', '📥', { style: 'font-size:48px;margin-bottom:8px;' });
    dropOverlayContent.appendChild(dropIcon);
    const dropTitle = createElement('p', 'Drop files to import', { style: 'font-size:18px;font-weight:600;margin:8px 0 4px;color:var(--text-primary, #1a1a2e);' });
    dropOverlayContent.appendChild(dropTitle);
    const dropHint = createElement('p', 'Supports .json, .pdf, .docx, .txt, .md, .html files', { style: 'font-size:13px;color:var(--text-secondary, #64748b);' });
    dropOverlayContent.appendChild(dropHint);
    this.dropOverlay.appendChild(dropOverlayContent);
    this.container.appendChild(this.dropOverlay);

    // Header
    const header = this.renderHeader();
    this.container.appendChild(header);

    // Quick actions
    const quickActions = this.renderQuickActions();
    this.container.appendChild(quickActions);

    // Search and filters
    const searchFilters = this.renderSearchFilters();
    this.container.appendChild(searchFilters);

    // Documents grid
    const grid = createElement('div', '', {
      class: 'dashboard-grid',
      id: 'dashboard-grid'
    });
    this.container.appendChild(grid);

    // Storage info
    const storageInfo = this.renderStorageInfo();
    this.container.appendChild(storageInfo);

    // Setup drag and drop
    this.setupDragAndDrop();

    // Load documents
    this.loadDocuments();

    return this.container;
  }

  /**
   * Renders the header section
   * @returns {HTMLElement} Header element
   */
  renderHeader() {
    const header = createElement('div', '', { class: 'dashboard-header' });

    const welcomeContainer = createElement('div', '', { class: 'dashboard-welcome' });

    // Get user name from settings or use default
    const userName = this.getUserName();
    const welcomeText = userName ? `Welcome back, ${userName}` : 'Welcome to CareerCanvas';

    const welcomeTitle = createElement('h1', welcomeText, { class: 'dashboard-welcome-title' });
    welcomeContainer.appendChild(welcomeTitle);

    // Quick stats
    const stats = this.renderQuickStats();
    welcomeContainer.appendChild(stats);

    header.appendChild(welcomeContainer);

    return header;
  }

  /**
   * Gets user name from localStorage
   * @returns {string} User name or empty string
   */
  getUserName() {
    try {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.name || '';
      }
    } catch (e) {
      console.error('Failed to get user name:', e);
    }
    return '';
  }

  /**
   * Renders quick stats
   * @returns {HTMLElement} Stats element
   */
  renderQuickStats() {
    const stats = createElement('div', '', {
      class: 'dashboard-stats',
      id: 'dashboard-stats'
    });

    // Will be updated after documents load
    const statsHtml = this.getStatsHTML(0, 0, 0);
    stats.innerHTML = statsHtml;

    return stats;
  }

  /**
   * Gets stats HTML
   * @param {number} totalDocs - Total documents
   * @param {number} resumes - Resume count
   * @param {number} cvs - CV count
   * @returns {string} Stats HTML
   */
  getStatsHTML(totalDocs, resumes, cvs) {
    return `
      <span class="dashboard-stat">
        <strong>${totalDocs}</strong> ${pluralize(totalDocs, 'document')}
      </span>
      <span class="dashboard-stat-divider">•</span>
      <span class="dashboard-stat">
        <strong>${resumes}</strong> ${pluralize(resumes, 'resume')}
      </span>
      <span class="dashboard-stat-divider">•</span>
      <span class="dashboard-stat">
        <strong>${cvs}</strong> ${pluralize(cvs, 'CV')}
      </span>
    `;
  }

  /**
   * Renders quick action buttons
   * @returns {HTMLElement} Quick actions element
   */
  renderQuickActions() {
    const actions = createElement('div', '', { class: 'dashboard-quick-actions' });

    const actionButtons = [
      { id: 'new-resume', icon: '📄', label: 'New Resume', action: () => this.createDocument(DOCUMENT_TYPES.RESUME) },
      { id: 'new-cv', icon: '📋', label: 'New CV', action: () => this.createDocument(DOCUMENT_TYPES.CV) },
      { id: 'new-cover-letter', icon: '✉️', label: 'New Cover Letter', action: () => this.createDocument(DOCUMENT_TYPES.COVER_LETTER) },
      { id: 'import', icon: '📥', label: 'Import', action: () => this.importDocument() },
      { id: 'export-all', icon: '📤', label: 'Export All', action: () => this.exportAll() }
    ];

    actionButtons.forEach(btn => {
      const button = createElement('button', '', {
        class: 'dashboard-action-btn',
        'aria-label': btn.label
      });

      const icon = createElement('span', btn.icon, { class: 'dashboard-action-icon' });
      button.appendChild(icon);

      const label = createElement('span', btn.label, { class: 'dashboard-action-label' });
      button.appendChild(label);

      const clickHandler = btn.action;
      button.addEventListener('click', clickHandler);
      this.listeners.push({ element: button, event: 'click', handler: clickHandler });

      actions.appendChild(button);
    });

    // Permanent file drop zone
    const dropZone = createElement('div', '', { class: 'dashboard-drop-zone' });
    dropZone.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px 16px;border:2px dashed var(--border-primary, #d1d5db);border-radius:var(--radius-lg, 12px);cursor:pointer;transition:all 0.2s;min-height:80px;background:var(--bg-secondary, #f8fafc);';
    const dropZoneIcon = createElement('span', '📂', { style: 'font-size:24px;' });
    dropZone.appendChild(dropZoneIcon);
    const dropZoneText = createElement('span', 'Drop files here or click to import', {
      style: 'font-size:13px;color:var(--text-secondary, #64748b);font-weight:500;text-align:center;'
    });
    dropZone.appendChild(dropZoneText);
    const dropZoneSub = createElement('span', '.json, .pdf, .docx, .txt, .md, .html, .png, .jpg, .jpeg', {
      style: 'font-size:11px;color:var(--text-tertiary, #94a3b8);'
    });
    dropZone.appendChild(dropZoneSub);

    const dropZoneClickHandler = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.json,.pdf,.docx,.txt,.md,.html,.png,.jpg,.jpeg';
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.processDroppedFiles(e.target.files);
        }
      });
      input.click();
    };
    dropZone.addEventListener('click', dropZoneClickHandler);
    this.listeners.push({ element: dropZone, event: 'click', handler: dropZoneClickHandler });

    const zoneOverHandler = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--color-primary, #3b82f6)';
      dropZone.style.background = 'var(--color-primary-50, rgba(59,130,246,0.08))';
    };
    const zoneLeaveHandler = () => {
      dropZone.style.borderColor = 'var(--border-primary, #d1d5db)';
      dropZone.style.background = 'var(--bg-secondary, #f8fafc)';
    };
    const zoneDropHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      zoneLeaveHandler();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.processDroppedFiles(e.dataTransfer.files);
      }
    };
    dropZone.addEventListener('dragover', zoneOverHandler);
    dropZone.addEventListener('dragleave', zoneLeaveHandler);
    dropZone.addEventListener('drop', zoneDropHandler);
    this.listeners.push(
      { element: dropZone, event: 'dragover', handler: zoneOverHandler },
      { element: dropZone, event: 'dragleave', handler: zoneLeaveHandler },
      { element: dropZone, event: 'drop', handler: zoneDropHandler }
    );

    actions.appendChild(dropZone);

    return actions;
  }

  /**
   * Renders search and filter controls
   * @returns {HTMLElement} Search/filter element
   */
  renderSearchFilters() {
    const container = createElement('div', '', { class: 'dashboard-filters' });

    // Search bar
    const searchContainer = createElement('div', '', { class: 'dashboard-search-container' });

    const searchInput = createElement('input', '', {
      class: 'dashboard-search-input',
      type: 'text',
      placeholder: 'Search documents...',
      id: 'dashboard-search-input'
    });

    const searchHandler = (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAndRenderDocuments();
    };
    searchInput.addEventListener('input', searchHandler);
    this.listeners.push({ element: searchInput, event: 'input', handler: searchHandler });

    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);

    // Filter buttons
    const filterButtons = createElement('div', '', { class: 'dashboard-filter-buttons' });

    const filters = [
      { id: FILTER_TYPES.ALL, label: 'All' },
      { id: FILTER_TYPES.RESUMES, label: 'Resumes' },
      { id: FILTER_TYPES.CVS, label: 'CVs' },
      { id: FILTER_TYPES.COVER_LETTERS, label: 'Cover Letters' },
      { id: FILTER_TYPES.REFERENCES, label: 'References' },
      { id: FILTER_TYPES.ARCHIVED, label: 'Archived' }
    ];

    filters.forEach(filter => {
      const button = createElement('button', filter.label, {
        class: `dashboard-filter-btn ${filter.id === this.currentFilter ? 'active' : ''}`,
        'data-filter': filter.id
      });

      const clickHandler = () => this.setFilter(filter.id);
      button.addEventListener('click', clickHandler);
      this.listeners.push({ element: button, event: 'click', handler: clickHandler });

      filterButtons.appendChild(button);
    });

    container.appendChild(filterButtons);

    // Sort dropdown
    const sortContainer = createElement('div', '', { class: 'dashboard-sort-container' });

    const sortLabel = createElement('label', 'Sort by: ', {
      class: 'dashboard-sort-label',
      for: 'dashboard-sort-select'
    });
    sortContainer.appendChild(sortLabel);

    const sortSelect = createElement('select', '', {
      class: 'dashboard-sort-select',
      id: 'dashboard-sort-select'
    });

    const sortOptions = [
      { value: SORT_TYPES.LAST_MODIFIED, label: 'Last Modified' },
      { value: SORT_TYPES.NAME_ASC, label: 'Name A-Z' },
      { value: SORT_TYPES.NAME_DESC, label: 'Name Z-A' },
      { value: SORT_TYPES.CREATED_DATE, label: 'Created Date' },
      { value: SORT_TYPES.TYPE, label: 'Type' }
    ];

    sortOptions.forEach(opt => {
      const option = createElement('option', opt.label, { value: opt.value });
      if (opt.value === this.currentSort) {
        option.selected = true;
      }
      sortSelect.appendChild(option);
    });

    const changeHandler = (e) => {
      this.currentSort = e.target.value;
      this.filterAndRenderDocuments();
    };
    sortSelect.addEventListener('change', changeHandler);
    this.listeners.push({ element: sortSelect, event: 'change', handler: changeHandler });

    sortContainer.appendChild(sortSelect);
    container.appendChild(sortContainer);

    return container;
  }

  /**
   * Loads documents from database
   */
  async loadDocuments() {
    try {
      this.documents = await this.db.getAll('documents');
      this.filterAndRenderDocuments();
      this.updateStats();
    } catch (error) {
      console.error('Failed to load documents:', error);
      this.renderError('Failed to load documents. Please refresh the page.');
    }
  }

  /**
   * Filters and renders documents based on current filters
   */
  filterAndRenderDocuments() {
    // Apply filters
    this.filteredDocuments = this.documents.filter(doc => {
      // Filter by type
      if (this.currentFilter === FILTER_TYPES.RESUMES && doc.type !== DOCUMENT_TYPES.RESUME) {
        return false;
      }
      if (this.currentFilter === FILTER_TYPES.CVS && doc.type !== DOCUMENT_TYPES.CV) {
        return false;
      }
      if (this.currentFilter === FILTER_TYPES.COVER_LETTERS && doc.type !== DOCUMENT_TYPES.COVER_LETTER) {
        return false;
      }
      if (this.currentFilter === FILTER_TYPES.REFERENCES && doc.type !== DOCUMENT_TYPES.REFERENCE_SHEET) {
        return false;
      }
      if (this.currentFilter === FILTER_TYPES.ARCHIVED && !doc.archived) {
        return false;
      }
      if (this.currentFilter !== FILTER_TYPES.ARCHIVED && doc.archived) {
        return false;
      }

      // Filter by search query
      if (this.searchQuery) {
        const searchableText = [
          doc.name,
          doc.targetRole,
          doc.targetCompany,
          ...(doc.tags || [])
        ].join(' ').toLowerCase();

        if (!searchableText.includes(this.searchQuery)) {
          return false;
        }
      }

      return true;
    });

    // Apply sort
    this.sortDocuments();

    // Render
    this.renderDocuments();
  }

  /**
   * Sorts documents based on current sort setting
   */
  sortDocuments() {
    switch (this.currentSort) {
      case SORT_TYPES.LAST_MODIFIED:
        this.filteredDocuments.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        break;
      case SORT_TYPES.NAME_ASC:
        this.filteredDocuments.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case SORT_TYPES.NAME_DESC:
        this.filteredDocuments.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case SORT_TYPES.CREATED_DATE:
        this.filteredDocuments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case SORT_TYPES.TYPE:
        this.filteredDocuments.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    // Pinned documents always first
    this.filteredDocuments.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }

  /**
   * Renders documents in the grid
   */
  renderDocuments() {
    const grid = this.container.querySelector('#dashboard-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (this.filteredDocuments.length === 0) {
      const emptyState = this.renderEmptyState();
      grid.appendChild(emptyState);
      return;
    }

    this.filteredDocuments.forEach((doc, index) => {
      const card = this.createDocumentCard(doc);
      card.style.setProperty('--card-index', index);
      grid.appendChild(card);
    });
  }

  /**
   * Creates a document card
   * @param {Object} doc - Document data
   * @returns {HTMLElement} Card element
   */
  createDocumentCard(doc) {
    const card = createElement('div', '', {
      class: `dashboard-card ${doc.pinned ? 'pinned' : ''}`,
      'data-doc-id': doc.id
    });

    // Card header
    const cardHeader = createElement('div', '', { class: 'dashboard-card-header' });

    const typeIcon = this.getDocumentTypeIcon(doc.type);
    const icon = createElement('span', typeIcon, { class: 'dashboard-card-icon' });
    cardHeader.appendChild(icon);

    const typeBadge = createElement('span', this.getDocumentTypeLabel(doc.type), {
      class: `dashboard-card-badge dashboard-card-badge-${doc.type}`
    });
    cardHeader.appendChild(typeBadge);

    if (doc.atsMode) {
      const atsBadge = createElement('span', 'ATS', {
        class: 'dashboard-card-badge dashboard-card-badge-ats'
      });
      cardHeader.appendChild(atsBadge);
    }

    if (doc.pinned) {
      const pinnedIcon = createElement('span', '⭐', {
        class: 'dashboard-card-pinned',
        'aria-label': 'Pinned'
      });
      cardHeader.appendChild(pinnedIcon);
    }

    card.appendChild(cardHeader);

    // Card title (editable)
    const titleContainer = createElement('div', '', { class: 'dashboard-card-title-container' });
    const title = createElement('h3', '', { class: 'dashboard-card-title' });
    title.textContent = doc.name;
    titleContainer.appendChild(title);
    card.appendChild(titleContainer);

    // Card details
    if (doc.targetRole) {
      const role = createElement('p', '', { class: 'dashboard-card-detail' });
      role.textContent = `Role: ${doc.targetRole}`;
      card.appendChild(role);
    }

    // Template info
    const templateInfo = createElement('p', '', { class: 'dashboard-card-detail' });
    templateInfo.textContent = `Template: ${doc.templateId || 'default'}`;
    card.appendChild(templateInfo);

    // Last modified
    const modified = createElement('p', '', { class: 'dashboard-card-meta' });
    modified.textContent = `Modified ${formatTimeAgo(doc.lastModified)}`;
    card.appendChild(modified);

    // Tags
    if (doc.tags && doc.tags.length > 0) {
      const tagsContainer = createElement('div', '', { class: 'dashboard-card-tags' });
      doc.tags.slice(0, 3).forEach(tag => {
        const tagEl = createElement('span', tag, { class: 'dashboard-card-tag' });
        tagsContainer.appendChild(tagEl);
      });
      card.appendChild(tagsContainer);
    }

    // Card actions
    const actions = this.createCardActions(doc);
    card.appendChild(actions);

    // Click to open
    const clickHandler = (e) => {
      // Don't trigger if clicking on action buttons
      if (e.target.closest('.dashboard-card-actions')) {
        return;
      }
      this.openDocument(doc.id);
    };
    card.addEventListener('click', clickHandler);
    this.listeners.push({ element: card, event: 'click', handler: clickHandler });

    return card;
  }

  /**
   * Creates card action buttons
   * @param {Object} doc - Document data
   * @returns {HTMLElement} Actions element
   */
  createCardActions(doc) {
    const actions = createElement('div', '', { class: 'dashboard-card-actions' });

    const actionButtons = [
      { icon: '📂', label: 'Open', action: () => this.openDocument(doc.id) },
      { icon: '📋', label: 'Duplicate', action: () => this.duplicateDocument(doc.id) },
      { icon: '✏️', label: 'Rename', action: () => this.renameDocument(doc.id) },
      { icon: '📤', label: 'Export', action: () => this.exportDocument(doc.id) },
      { icon: doc.archived ? '📥' : '📦', label: doc.archived ? 'Unarchive' : 'Archive', action: () => this.toggleArchive(doc.id) },
      { icon: '🗑️', label: 'Delete', action: () => this.deleteDocument(doc.id) }
    ];

    actionButtons.forEach(btn => {
      const button = createElement('button', btn.icon, {
        class: 'dashboard-card-action-btn',
        'aria-label': btn.label,
        title: btn.label
      });

      const clickHandler = (e) => {
        e.stopPropagation();
        btn.action();
      };
      button.addEventListener('click', clickHandler);
      this.listeners.push({ element: button, event: 'click', handler: clickHandler });

      actions.appendChild(button);
    });

    return actions;
  }

  /**
   * Renders empty state
   * @returns {HTMLElement} Empty state element
   */
  renderEmptyState() {
    const emptyState = createElement('div', '', { class: 'dashboard-empty-state' });

    const isFiltered = this.currentFilter !== 'all' || this.searchQuery;

    const icon = createElement('div', isFiltered ? '🔍' : '📄', { class: 'dashboard-empty-icon' });
    emptyState.appendChild(icon);

    const titleText = isFiltered ? 'No matching documents' : 'No documents yet';
    const title = createElement('h2', titleText, { class: 'dashboard-empty-title' });
    emptyState.appendChild(title);

    const messageText = isFiltered
      ? 'Try adjusting your search or filter to find what you\'re looking for.'
      : 'Create your first resume to get started!';
    const message = createElement('p', messageText, {
      class: 'dashboard-empty-message'
    });
    emptyState.appendChild(message);

    if (!isFiltered) {
      const button = createElement('button', 'Create First Document', {
        class: 'dashboard-btn-primary'
      });
      const clickHandler = () => this.createDocument(DOCUMENT_TYPES.RESUME);
      button.addEventListener('click', clickHandler);
      this.listeners.push({ element: button, event: 'click', handler: clickHandler });
      emptyState.appendChild(button);
    }

    return emptyState;
  }

  /**
   * Renders storage info
   * @returns {HTMLElement} Storage info element
   */
  renderStorageInfo() {
    const container = createElement('div', '', { class: 'dashboard-storage-info' });

    const title = createElement('h3', 'Storage Information', { class: 'dashboard-storage-title' });
    container.appendChild(title);

    const warning = createElement('p', 'Your documents are stored in your browser. Clearing browser data will delete all documents. Export regularly to back up your work.', {
      class: 'dashboard-storage-warning'
    });
    container.appendChild(warning);

    // Estimate storage usage
    const usageBar = createElement('div', '', {
      class: 'dashboard-storage-bar',
      id: 'dashboard-storage-bar'
    });
    const usageFill = createElement('div', '', { class: 'dashboard-storage-fill' });
    usageBar.appendChild(usageFill);
    container.appendChild(usageBar);

    const usageText = createElement('p', 'Calculating storage...', {
      class: 'dashboard-storage-text',
      id: 'dashboard-storage-text'
    });
    container.appendChild(usageText);

    this.updateStorageInfo();

    return container;
  }

  /**
   * Updates storage information
   */
  async updateStorageInfo() {
    try {
      if (!this.container) return;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (!this.container) return;
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

        const usageText = this.container.querySelector('#dashboard-storage-text');
        if (usageText) {
          usageText.textContent = `Using ${this.formatBytes(usage)} of ${this.formatBytes(quota)} (${percentUsed.toFixed(1)}%)`;
        }

        const usageFill = this.container.querySelector('.dashboard-storage-fill');
        if (usageFill) {
          usageFill.style.width = `${Math.min(percentUsed, 100)}%`;
        }
      }
    } catch (error) {
      console.error('Failed to estimate storage:', error);
    }
  }

  /**
   * Formats bytes to human-readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Updates quick stats
   */
  updateStats() {
    const totalDocs = this.documents.filter(d => !d.archived).length;
    const resumes = this.documents.filter(d => d.type === DOCUMENT_TYPES.RESUME && !d.archived).length;
    const cvs = this.documents.filter(d => d.type === DOCUMENT_TYPES.CV && !d.archived).length;

    const stats = this.container.querySelector('#dashboard-stats');
    if (stats) {
      stats.innerHTML = this.getStatsHTML(totalDocs, resumes, cvs);
    }
  }

  /**
   * Sets active filter
   * @param {string} filterId - Filter ID
   */
  setFilter(filterId) {
    this.currentFilter = filterId;

    // Update button states
    const buttons = this.container.querySelectorAll('.dashboard-filter-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-filter') === filterId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.filterAndRenderDocuments();
  }

  /**
   * Gets document type icon
   * @param {string} type - Document type
   * @returns {string} Icon
   */
  getDocumentTypeIcon(type) {
    const icons = {
      [DOCUMENT_TYPES.RESUME]: '📄',
      [DOCUMENT_TYPES.CV]: '📋',
      [DOCUMENT_TYPES.COVER_LETTER]: '✉️',
      [DOCUMENT_TYPES.REFERENCE_SHEET]: '📇',
      [DOCUMENT_TYPES.PORTFOLIO]: '💼'
    };
    return icons[type] || '📄';
  }

  /**
   * Gets document type label
   * @param {string} type - Document type
   * @returns {string} Label
   */
  getDocumentTypeLabel(type) {
    const labels = {
      [DOCUMENT_TYPES.RESUME]: 'Resume',
      [DOCUMENT_TYPES.CV]: 'CV',
      [DOCUMENT_TYPES.COVER_LETTER]: 'Cover Letter',
      [DOCUMENT_TYPES.REFERENCE_SHEET]: 'References',
      [DOCUMENT_TYPES.PORTFOLIO]: 'Portfolio'
    };
    return labels[type] || 'Document';
  }

  /**
   * Document action methods
   */

  createDocument(type) {
    eventBus.emit(EVENTS.DOCUMENT_CREATE, { type });
  }

  openDocument(id) {
    eventBus.emit(EVENTS.DOCUMENT_OPEN, { id });
  }

  async duplicateDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;
    try {
      const { generateId } = await import('../utils/id.js');
      const copy = { ...JSON.parse(JSON.stringify(doc)), id: generateId(), name: doc.name + ' (Copy)', createdAt: new Date().toISOString(), lastModified: new Date().toISOString() };
      await this.db.put('documents', copy);
      await this.loadDocuments();
    } catch (e) {
      console.error('Failed to duplicate document:', e);
    }
  }

  async renameDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;

    if (window.CC && window.CC.modal) {
      const form = createElement('div', '', {});
      const group = createElement('div', '', { class: 'form-group' });
      const label = createElement('label', 'Document Name', { class: 'form-label' });
      group.appendChild(label);
      const input = createElement('input', '', {
        class: 'form-input',
        type: 'text',
        value: doc.name,
        maxlength: '100'
      });
      input.value = doc.name;
      group.appendChild(input);
      form.appendChild(group);

      window.CC.modal.show({
        title: 'Rename Document',
        body: form,
        size: 'small',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => null },
          {
            label: 'Rename',
            type: 'primary',
            handler: async () => {
              const newName = input.value.trim();
              if (!newName) {
                if (window.CC.toast) window.CC.toast.show('Name cannot be empty', 'error');
                return false;
              }
              doc.name = sanitizeInput(newName);
              doc.lastModified = new Date().toISOString();
              await this.db.put('documents', doc);
              await this.loadDocuments();
              if (window.CC.toast) window.CC.toast.show(`Renamed to "${newName}"`, 'success');
              return true;
            }
          }
        ]
      });
      setTimeout(() => input.focus(), 100);
    }
  }

  exportDocument(id) {
    eventBus.emit(EVENTS.DOCUMENT_EXPORT, { id });
  }

  async toggleArchive(id) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;

    doc.archived = !doc.archived;
    doc.lastModified = new Date().toISOString();
    await this.db.put('documents', doc);
    await this.loadDocuments();
  }

  async deleteDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;

    if (confirm(`Are you sure you want to delete "${doc.name}"? This action cannot be undone.`)) {
      try {
        await this.db.delete('documents', id);
        await this.loadDocuments();
      } catch (e) {
        console.error('Failed to delete document:', e);
      }
    }
  }

  importDocument() {
    // Emit event for import manager to handle
    eventBus.emit('dashboard:import');
  }

  exportAll() {
    // Emit event for export manager to handle
    eventBus.emit('dashboard:exportAll');
  }

  /**
   * Renders error message
   * @param {string} message - Error message
   */
  renderError(message) {
    const grid = this.container.querySelector('#dashboard-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const error = createElement('div', message, { class: 'dashboard-error' });
    grid.appendChild(error);
  }

  /**
   * Sets up drag-and-drop on the dashboard container
   */
  setupDragAndDrop() {
    this._dragCounter = 0;

    const dragoverHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    };

    const dragenterHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._dragCounter++;
      if (this._dragCounter === 1) {
        this.container.classList.add('dashboard-drop-active');
        this.dropOverlay.style.display = 'flex';
      }
    };

    const dragleaveHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._dragCounter--;
      if (this._dragCounter <= 0) {
        this._dragCounter = 0;
        this.container.classList.remove('dashboard-drop-active');
        this.dropOverlay.style.display = 'none';
      }
    };

    const dropHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._dragCounter = 0;
      this.container.classList.remove('dashboard-drop-active');
      this.dropOverlay.style.display = 'none';

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.processDroppedFiles(files);
      }
    };

    this.container.addEventListener('dragover', dragoverHandler);
    this.container.addEventListener('dragenter', dragenterHandler);
    this.container.addEventListener('dragleave', dragleaveHandler);
    this.container.addEventListener('drop', dropHandler);

    this.listeners.push(
      { element: this.container, event: 'dragover', handler: dragoverHandler },
      { element: this.container, event: 'dragenter', handler: dragenterHandler },
      { element: this.container, event: 'dragleave', handler: dragleaveHandler },
      { element: this.container, event: 'drop', handler: dropHandler }
    );
  }

  /**
   * Processes dropped or selected files for multi-file import
   * @param {FileList} fileList - Files to import
   */
  async processDroppedFiles(fileList) {
    const importManager = window.CC?.importManager;
    if (!importManager) {
      if (window.CC?.toast) window.CC.toast.show('Import manager not available', 'error');
      return;
    }

    const files = Array.from(fileList);
    const supportedExtensions = ['.json', '.pdf', '.docx', '.txt', '.md', '.html'];
    const validFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      if (window.CC?.toast) window.CC.toast.show('No supported files found. Supports: .json, .pdf, .docx, .txt, .md, .html', 'warning');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const total = validFiles.length;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      if (total > 1 && window.CC?.toast) {
        window.CC.toast.show(`Importing ${i + 1} of ${total} files...`, 'info');
      }

      try {
        switch (ext) {
          case '.json':
            await importManager.importJSON(file);
            break;
          case '.pdf':
            await importManager.importPDF(file);
            break;
          case '.png':
          case '.jpg':
          case '.jpeg':
            if (importManager.importImage) {
              await importManager.importImage(file);
            } else {
              window.CC?.toast?.show?.('Image import not supported yet', 'warning');
            }
            break;
          case '.docx':
            if (importManager.importDOCX) {
              await importManager.importDOCX(file);
            } else {
              await importManager.importPlainText(file);
            }
            break;
          case '.txt':
          case '.md':
          case '.html':
          default:
            await importManager.importPlainText(file);
            break;
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
        errorCount++;
      }
    }

    // Reload documents after all imports
    await this.loadDocuments();

    // Show result toast
    if (total > 1 || errorCount > 0) {
      if (errorCount === 0) {
        if (window.CC?.toast) window.CC.toast.show(`Successfully imported ${successCount} ${successCount === 1 ? 'file' : 'files'}`, 'success');
      } else {
        if (window.CC?.toast) window.CC.toast.show(`Imported ${successCount} of ${total} files (${errorCount} failed)`, 'warning');
      }
    }
  }

  /**
   * Cleans up event listeners
   */
  destroy() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    this._dragCounter = 0;
    this.dropOverlay = null;

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
  }
}

export default Dashboard;
