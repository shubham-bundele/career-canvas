/**
 * Dashboard Module
 * Displays user documents and provides quick actions
 */

import eventBus, { EVENTS } from '../core/events.js';
import { createElement, sanitizeInput } from '../utils/sanitize.js';
import { formatTimeAgo, pluralize } from '../utils/format.js';
import { DOCUMENT_TYPES } from '../core/schema.js';
import authState from '../auth/auth-state.js';
import { GUEST_OWNER_ID, getCurrentOwnerId, filterDocumentsByOwner,
adoptLegacyDocuments, countGuestDocuments, loadOwnerDocuments } from '../auth/user-store.js';
import { fetchCloudDocuments, pushDocument, deleteCloudDocument, mergeDocuments } from '../auth/cloud-store.js';

/**
 * Deletes a document and all data owned by it: version snapshots
 * (`snapshots.documentId`), saved skill matrices (`skillsMatrices.documentId`)
 * and JD-match analyses (`matchAnalyses.resumeId`). Application-tracker
 * entries are deliberately kept — they are the user's job-search history.
 * Every step is best-effort so a half-missing record can never abort the
 * delete. Uses the index fast-path with a full-scan fallback for older DBs.
 * @param {Object} db - Database wrapper
 * @param {string} id - Document id
 * @returns {Promise<Object>} Counts per area, e.g. { snapshots: 2, ... }
 */
export async function deleteDocumentAndRelated(db, id) {
  const stats = { document: false, snapshots: 0, matrices: 0, analyses: 0 };
  if (!db || !id) return stats;

  try {
    await db.delete('documents', id);
    stats.document = true;
  } catch (e) { /* already gone — keep going */ }

  const deleteWhere = async (store, field, key) => {
    let count = 0;
    let records = null;
    try {
      records = await db.getByIndex(store, field, id);
    } catch (e) {
      // Pre-index DB: fall back to a full scan.
      try {
        const all = await db.getAll(store);
        records = (all || []).filter(r => r && r[field] === id);
      } catch (e2) { /* store missing — nothing to do */ }
    }
    if (Array.isArray(records)) {
      for (const r of records) {
        if (!r || r.id === undefined) continue;
        try {
          await db.delete(store, r.id);
          count++;
        } catch (e) { /* keep going */ }
      }
    }
    return count;
  };

  stats.snapshots = await deleteWhere('snapshots', 'documentId', id);
  stats.matrices = await deleteWhere('skillsMatrices', 'documentId', id);
  stats.analyses = await deleteWhere('matchAnalyses', 'resumeId', id);
  return stats;
}

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
    const dropHint = createElement('p', 'Supports .json, .pdf, .docx, .txt, .md, .html and images — drop several files for batch import', { style: 'font-size:13px;color:var(--text-secondary, #64748b);' });
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
   * Loads documents for the current owner.
   * - Guests see only temporary guest documents (never synced, cleared on
   *   auth transitions).
   * - Signed-in users see only their own saved resumes: legacy untagged
   *   documents are adopted once, then cloud documents are merged in
   *   (newer `lastModified` wins) and local-only work is pushed up.
   */
  async loadDocuments() {
    try {
      const ownerId = getCurrentOwnerId();
      // Index-backed on DB v5+ (falls back to a full scan on older DBs).
      const all = await loadOwnerDocuments(this.db, ownerId);
      if (ownerId !== GUEST_OWNER_ID) {
        try { await adoptLegacyDocuments(this.db, all, ownerId); } catch (e) { /* best-effort */ }
      }
      this.documents = filterDocumentsByOwner(all, ownerId);
      this.filterAndRenderDocuments();
      this.updateStats();
      this.renderOwnerBanner();
      if (ownerId !== GUEST_OWNER_ID) {
        this.syncWithCloud(ownerId).catch(() => { /* offline-first: local already rendered */ });
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      this.renderError('Failed to load documents. Please refresh the page.');
    }
  }

  /**
   * Best-effort cloud reconciliation for signed-in users. Local IndexedDB
   * stays the source of truth and is always rendered first; the cloud only
   * ever adds newer documents or receives local-only work.
   * @param {string} ownerId
   */
  async syncWithCloud(ownerId) {
    const cloud = await fetchCloudDocuments();
    if (!cloud.ok || !this.container) return;
    const { merged, cloudNewer, localOnly } = mergeDocuments(this.documents, cloud.documents);
    for (const doc of cloudNewer) {
      try { await this.db.put('documents', { ...doc, ownerId }); } catch (e) { /* keep going */ }
    }
    for (const doc of localOnly) {
      pushDocument({ ...doc, ownerId });
    }
    if (!this.container) return;
    this.documents = filterDocumentsByOwner(
      merged.map((d) => ({ ...d, ownerId: d.ownerId || ownerId })),
      ownerId
    );
    this.filterAndRenderDocuments();
    this.updateStats();
  }

  /**
   * Guest-mode banner: guest work is temporary and never saved. Signed-in
   * users see nothing (their resumes are saved + synced).
   */
  renderOwnerBanner() {
    if (!this.container) return;
    const prev = this.container.querySelector('.dashboard-owner-banner');
    if (prev) prev.remove();
    if (getCurrentOwnerId() !== GUEST_OWNER_ID) return;
    const banner = createElement('div', '', { class: 'dashboard-owner-banner', role: 'status' });
    const text = createElement('span', '', { class: 'dashboard-owner-banner-text' });
    text.textContent = 'You are in Guest mode — resumes you create here are temporary and will not be saved. Sign in to save your resumes.';
    banner.appendChild(text);
    const btn = createElement('button', 'Sign In to Save', { class: 'btn btn-sm btn-primary', type: 'button' });
    const goSignIn = async () => {
      // Guest work is wiped on sign-in — offer a backup first (same guard
      // as the header guest menu in app.js).
      try {
        const n = await countGuestDocuments(this.db);
        if (n > 0) {
          const saveFirst = confirm(
            `You have ${n} unsaved guest resume${n === 1 ? '' : 's'}. Guest work is temporary and will be cleared when you sign in.\n\nPress OK to download a backup first, or Cancel to continue to sign in.`
          );
          if (saveFirst) {
            eventBus.emit('dashboard:exportAll');
            if (window.CC && window.CC.toast) window.CC.toast.show('Backup downloading — sign in when ready, then re-import it.', 'info', 6000);
            return;
          }
        }
      } catch (e) { /* proceed to sign in */ }
      const current = window.CC && window.CC.router ? window.CC.router.getCurrentRoute() : null;
      if (current && current.path && current.path !== '/welcome') authState.setIntendedRoute(current.path);
      if (window.CC && window.CC.router) window.CC.router.navigate('/login');
    };
    btn.addEventListener('click', goSignIn);
    this.listeners.push({ element: btn, event: 'click', handler: goSignIn });
    banner.appendChild(btn);
    const grid = this.container.querySelector('#dashboard-grid');
    if (grid && grid.parentNode) grid.parentNode.insertBefore(banner, grid);
    else this.container.prepend(banner);
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

    this.renderDuplicateBanner();

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

  /** Normalized identity key for duplicate grouping (name + owner email). */
  static duplicateKey(doc) {
    const name = String(doc?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = String(doc?.personalInfo?.email || '').toLowerCase().trim();
    return `${name}|${email}`;
  }

  /** Group documents with identical identity keys (pure, unit-tested). */
  static groupDuplicates(docs) {
    const map = new Map();
    for (const d of (docs || []).filter((x) => x && !x.archived)) {
      const k = Dashboard.duplicateKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(d);
    }
    return [...map.values()].filter((g) => g.length > 1);
  }

  findDuplicateGroups() {
    return Dashboard.groupDuplicates(this.documents);
  }

  /** Banner above the grid when likely duplicates exist (unfiltered view only). */
  renderDuplicateBanner() {
    const prev = this.container.querySelector('.dashboard-duplicates');
    if (prev) prev.remove();
    if ((this.currentFilter && this.currentFilter !== 'all') || this.searchQuery) return;
    const groups = this.findDuplicateGroups();
    if (!groups.length) return;
    const grid = this.container.querySelector('#dashboard-grid');
    if (!grid) return;
    const banner = createElement('div', '', { class: 'dashboard-duplicates', role: 'status' });
    const total = groups.reduce((n, g) => n + g.length, 0);
    const title = createElement('strong', `Possible duplicates: ${total} documents in ${groups.length} group${groups.length === 1 ? '' : 's'}`, {});
    banner.appendChild(title);
    groups.slice(0, 3).forEach((g) => {
      const row = createElement('div', '', { class: 'dashboard-duplicates-group' });
      g.forEach((d) => {
        const btn = createElement('button', d.name || 'Untitled', { class: 'btn btn-sm btn-ghost', type: 'button' });
        const h = () => this.openDocument(d.id);
        btn.addEventListener('click', h);
        this.listeners.push({ element: btn, event: 'click', handler: h });
        row.appendChild(btn);
      });
      banner.appendChild(row);
    });
    grid.parentNode.insertBefore(banner, grid);
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

      const importBtn = createElement('button', 'Import Existing', {
        class: 'dashboard-btn-secondary'
      });
      const importHandler = () => {
        if (this.events && typeof this.events.emit === 'function') this.events.emit('dashboard:import');
        else if (window.CC?.router) window.CC.router.navigate('/import');
      };
      importBtn.addEventListener('click', importHandler);
      this.listeners.push({ element: importBtn, event: 'click', handler: importHandler });
      emptyState.appendChild(importBtn);
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
      // Keep metadata.title in sync — the editor overwrites name from it on save.
      copy.metadata = { ...(copy.metadata || {}), title: copy.name };
      await this.db.put('documents', copy);
      pushDocument(copy); // best-effort cloud mirror (no-op for guests/offline)
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
              // Keep metadata.title in sync — the editor overwrites name from it on save.
              doc.metadata = { ...(doc.metadata || {}), title: doc.name };
              doc.lastModified = new Date().toISOString();
              await this.db.put('documents', doc);
              pushDocument(doc); // best-effort cloud mirror (no-op for guests/offline)
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
    pushDocument(doc); // best-effort cloud mirror (no-op for guests/offline)
    await this.loadDocuments();
  }

  async deleteDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;

    // App modal (not native confirm()): styled, keyboard-accessible,
    // automation-friendly, and X/Escape safely cancels.
    const modalApi = window.CC && window.CC.modal;
    let confirmed = false;
    if (modalApi && typeof modalApi.confirm === 'function') {
      confirmed = await modalApi.confirm(
        `Are you sure you want to delete "${doc.name}"? This action cannot be undone.`,
        null,
        { title: 'Delete Document', danger: true, confirmLabel: 'Delete' }
      ).catch(() => false);
    } else {
      confirmed = confirm(`Are you sure you want to delete "${doc.name}"? This action cannot be undone.`);
    }
    if (!confirmed) return;
    try {
      await deleteDocumentAndRelated(this.db, id);
      deleteCloudDocument(id); // best-effort cloud mirror (no-op for guests/offline)
      await this.loadDocuments();
      // Notify other modules + the global handler (which toasts). The global
      // handler's own delete is a harmless no-op on the already-gone records.
      eventBus.emit(EVENTS.DOCUMENT_DELETE, { id });
    } catch (e) {
      console.error('Failed to delete document:', e);
      if (window.CC && window.CC.toast) window.CC.toast.show('Failed to delete document', 'error');
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

    // Single code path for all drops: routing, validation, duplicates,
    // batch progress and navigation live in the import manager.
    try {
      await importManager.importFileBatch(Array.from(fileList || []));
    } catch (error) {
      console.error('Drop import failed:', error);
    }

    // Reload documents after all imports
    await this.loadDocuments();
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
