/**
 * Version & Snapshot Studio Module
 * Provides document versioning, snapshot creation, comparison, and restoration
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { formatTimeAgo, formatFileSize, formatDate, truncate, pluralize } from '../utils/format.js';
import { STORES } from '../core/db.js';
import eventBus from '../core/events.js';

// ==================== CONSTANTS ====================

const MAX_SNAPSHOT_NAME_LENGTH = 120;
const SORT_OPTIONS = {
  LAST_MODIFIED: 'lastModified',
  NAME_ASC: 'nameAsc',
  NAME_DESC: 'nameDesc',
  CREATED_DATE: 'createdDate'
};

// ==================== HELPERS ====================

/**
 * Deep-clones a plain object via structured clone (or JSON fallback)
 */
function deepClone(obj) {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Returns a human-readable label for a document type
 */
function docTypeLabel(type) {
  const labels = {
    resume: 'Resume',
    cv: 'CV',
    coverLetter: 'Cover Letter',
    referenceSheet: 'Reference Sheet',
    portfolio: 'Portfolio',
    onePager: 'One-Pager'
  };
  return labels[type] || type || 'Document';
}

/**
 * Computes a shallow diff between two objects, returning arrays of changed, added, and removed keys
 */
function shallowDiff(oldObj, newObj) {
  oldObj = oldObj || {};
  newObj = newObj || {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changed = [];
  const added = [];
  const removed = [];

  for (const key of allKeys) {
    const inOld = key in oldObj;
    const inNew = key in newObj;
    if (inOld && !inNew) {
      removed.push(key);
    } else if (!inOld && inNew) {
      added.push(key);
    } else if (inOld && inNew) {
      const oldVal = typeof oldObj[key] === 'object' ? JSON.stringify(oldObj[key]) : String(oldObj[key] ?? '');
      const newVal = typeof newObj[key] === 'object' ? JSON.stringify(newObj[key]) : String(newObj[key] ?? '');
      if (oldVal !== newVal) {
        changed.push(key);
      }
    }
  }

  return { changed, added, removed };
}

/**
 * Returns a human-friendly label for a camelCase field name
 */
function fieldLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

// ==================== VERSION STUDIO CLASS ====================

export class VersionStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];

    // State
    this.documents = [];
    this.snapshots = [];
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.expandedSnapshotId = null;
    this.compareSnapshotId = null;

    // Document selection state
    this.docSearch = '';
    this.docSort = SORT_OPTIONS.LAST_MODIFIED;
    this.docTypeFilter = 'all';
  }

  // ==================== LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'vs-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Version & Snapshot Studio');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'vs-content', id: 'vs-content' });
    this.container.appendChild(content);
    await this.showDocumentSelection();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'vs-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'vs-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });
    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);
    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);
    const cur = createElement('li', 'Version Studio', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);
    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const row = createElement('div', '', { class: 'vs-title-row' });
    const group = createElement('div', '', { class: 'vs-title-group' });
    group.appendChild(createElement('h1', 'Version & Snapshot Studio', { class: 'vs-title' }));
    group.appendChild(createElement('p', 'Create point-in-time snapshots of your documents, compare changes, and restore previous versions. All data stays in your browser.', { class: 'vs-description' }));
    row.appendChild(group);
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline vs-back-btn' });
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
    return this.container?.querySelector('#vs-content') || this.container;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  // ==================== DOCUMENT SELECTION VIEW ====================

  async showDocumentSelection() {
    const c = this.gc();
    c.innerHTML = '';
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.expandedSnapshotId = null;
    this.compareSnapshotId = null;

    try {
      this.documents = await this.db.getAll(STORES.DOCUMENTS);
    } catch {
      this.documents = [];
    }

    const wrapper = createElement('div', '', { class: 'vs-doc-selection' });

    // Search and sort bar
    const toolbar = createElement('div', '', { class: 'vs-toolbar' });

    const searchInput = createElement('input', '', {
      class: 'vs-search-input',
      type: 'search',
      'aria-label': 'Search documents'
    });
    searchInput.placeholder = 'Search documents...';
    searchInput.value = this.docSearch;
    this.addListener(searchInput, 'input', (e) => {
      this.docSearch = e.target.value;
      this.renderDocumentGrid(grid);
    });
    toolbar.appendChild(searchInput);

    const sortSelect = createElement('select', '', { class: 'vs-sort-select', 'aria-label': 'Sort documents' });
    const sortOpts = [
      ['lastModified', 'Last Modified'],
      ['nameAsc', 'Name (A-Z)'],
      ['nameDesc', 'Name (Z-A)'],
      ['createdDate', 'Date Created']
    ];
    sortOpts.forEach(([val, label]) => {
      const opt = createElement('option', label);
      opt.value = val;
      if (val === this.docSort) opt.selected = true;
      sortSelect.appendChild(opt);
    });
    this.addListener(sortSelect, 'change', (e) => {
      this.docSort = e.target.value;
      this.renderDocumentGrid(grid);
    });
    toolbar.appendChild(sortSelect);
    wrapper.appendChild(toolbar);

    // Type filter pills
    const filterRow = createElement('div', '', { class: 'vs-filter-row' });
    const types = [
      ['all', 'All'],
      ['resume', 'Resumes'],
      ['cv', 'CVs'],
      ['coverLetter', 'Cover Letters'],
      ['referenceSheet', 'References']
    ];
    types.forEach(([val, label]) => {
      const btn = createElement('button', label, {
        class: 'vs-filter-btn' + (this.docTypeFilter === val ? ' vs-filter-btn--active' : ''),
        'aria-pressed': this.docTypeFilter === val ? 'true' : 'false'
      });
      this.addListener(btn, 'click', () => {
        this.docTypeFilter = val;
        this.renderDocumentSelection();
      });
      filterRow.appendChild(btn);
    });
    wrapper.appendChild(filterRow);

    // Document grid
    const grid = createElement('div', '', { class: 'vs-doc-grid', id: 'vs-doc-grid' });
    wrapper.appendChild(grid);
    this.renderDocumentGrid(grid);

    c.appendChild(wrapper);
  }

  renderDocumentSelection() {
    const c = this.gc();
    if (!c) return;
    c.innerHTML = '';
    this.showDocumentSelection();
  }

  renderDocumentGrid(grid) {
    grid.innerHTML = '';
    let docs = [...this.documents].filter(d => !d.archived);

    // Type filter
    if (this.docTypeFilter !== 'all') {
      docs = docs.filter(d => d.type === this.docTypeFilter);
    }

    // Search filter
    if (this.docSearch.trim()) {
      const q = this.docSearch.toLowerCase().trim();
      docs = docs.filter(d => {
        const name = (d.name || '').toLowerCase();
        const title = (d.personalInfo?.professionalTitle || '').toLowerCase();
        const fullName = (d.personalInfo?.fullName || '').toLowerCase();
        return name.includes(q) || title.includes(q) || fullName.includes(q);
      });
    }

    // Sort
    docs.sort((a, b) => {
      switch (this.docSort) {
        case SORT_OPTIONS.NAME_ASC:
          return (a.name || '').localeCompare(b.name || '');
        case SORT_OPTIONS.NAME_DESC:
          return (b.name || '').localeCompare(a.name || '');
        case SORT_OPTIONS.CREATED_DATE:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case SORT_OPTIONS.LAST_MODIFIED:
        default:
          return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
      }
    });

    if (docs.length === 0) {
      const empty = createElement('div', '', { class: 'vs-empty' });
      if (this.documents.length === 0) {
        empty.appendChild(createElement('p', 'No documents found. Create a document from the Dashboard first.', { class: 'vs-empty-msg' }));
      } else {
        empty.appendChild(createElement('p', 'No documents match your filters.', { class: 'vs-empty-msg' }));
      }
      grid.appendChild(empty);
      return;
    }

    docs.forEach(doc => {
      const card = createElement('div', '', { class: 'vs-doc-card' });
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Select ${doc.name || 'Untitled'}`);

      const top = createElement('div', '', { class: 'vs-doc-card-top' });
      const nameEl = createElement('span', '', { class: 'vs-doc-card-name' });
      nameEl.textContent = doc.name || 'Untitled';
      top.appendChild(nameEl);

      const typeBadge = createElement('span', docTypeLabel(doc.type), {
        class: 'vs-type-badge vs-type-badge--' + (doc.type || 'resume')
      });
      top.appendChild(typeBadge);
      card.appendChild(top);

      if (doc.personalInfo?.fullName) {
        const author = createElement('p', '', { class: 'vs-doc-card-author' });
        author.textContent = doc.personalInfo.fullName;
        card.appendChild(author);
      }

      const meta = createElement('div', '', { class: 'vs-doc-card-meta' });
      const parts = [];
      if (doc.sections) {
        const count = Array.isArray(doc.sections) ? doc.sections.length : Object.keys(doc.sections).length;
        parts.push(count + ' ' + pluralize(count, 'section'));
      }
      if (doc.lastModified) {
        parts.push(formatTimeAgo(doc.lastModified));
      }
      meta.textContent = parts.join(' · ');
      card.appendChild(meta);

      const selectHandler = () => this.selectDocument(doc.id);
      this.addListener(card, 'click', selectHandler);
      this.addListener(card, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectHandler();
        }
      });

      grid.appendChild(card);
    });
  }

  // ==================== SNAPSHOT HISTORY VIEW ====================

  async selectDocument(docId) {
    try {
      this.selectedDoc = await this.db.read(STORES.DOCUMENTS, docId);
    } catch {
      window.CC?.toast?.('Failed to load document.', 'error');
      return;
    }
    if (!this.selectedDoc) {
      window.CC?.toast?.('Document not found.', 'error');
      return;
    }
    this.selectedDocId = docId;
    this.expandedSnapshotId = null;
    this.compareSnapshotId = null;
    await this.showSnapshotHistory();
  }

  async showSnapshotHistory() {
    const c = this.gc();
    c.innerHTML = '';

    // Load snapshots for this document
    try {
      this.snapshots = await this.db.getByIndex(STORES.SNAPSHOTS, 'documentId', this.selectedDocId);
    } catch {
      this.snapshots = [];
    }
    // Sort newest first
    this.snapshots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const wrapper = createElement('div', '', { class: 'vs-history' });

    // Selected document bar
    wrapper.appendChild(this.renderSelectedDocBar());

    // Create Snapshot form area
    wrapper.appendChild(this.renderCreateSnapshotForm());

    // Snapshot list
    const listSection = createElement('div', '', { class: 'vs-snapshot-section' });
    const listTitle = createElement('h2', '', { class: 'vs-section-title' });
    listTitle.textContent = `Snapshots (${this.snapshots.length})`;
    listSection.appendChild(listTitle);

    if (this.snapshots.length === 0) {
      const emptyMsg = createElement('div', '', { class: 'vs-empty' });
      emptyMsg.appendChild(createElement('p', 'No snapshots yet. Create your first snapshot above to save a point-in-time copy of this document.', { class: 'vs-empty-msg' }));
      listSection.appendChild(emptyMsg);
    } else {
      const list = createElement('div', '', { class: 'vs-snapshot-list', id: 'vs-snapshot-list' });
      this.snapshots.forEach(snap => list.appendChild(this.renderSnapshotCard(snap)));
      listSection.appendChild(list);
    }
    wrapper.appendChild(listSection);

    // Comparison view (if active)
    if (this.compareSnapshotId) {
      const compareSection = await this.buildComparisonView(this.compareSnapshotId);
      if (compareSection) wrapper.appendChild(compareSection);
    }

    // Storage info
    wrapper.appendChild(await this.renderStorageInfo());

    c.appendChild(wrapper);
  }

  renderSelectedDocBar() {
    const bar = createElement('div', '', { class: 'vs-selected-doc' });

    const info = createElement('div', '', { class: 'vs-selected-doc-info' });
    const nameEl = createElement('span', '', { class: 'vs-selected-doc-name' });
    nameEl.textContent = this.selectedDoc.name || 'Untitled';
    info.appendChild(nameEl);

    const typeBadge = createElement('span', docTypeLabel(this.selectedDoc.type), {
      class: 'vs-type-badge vs-type-badge--' + (this.selectedDoc.type || 'resume')
    });
    info.appendChild(typeBadge);

    if (this.selectedDoc.lastModified) {
      const modEl = createElement('span', '', { class: 'vs-selected-doc-meta' });
      modEl.textContent = 'Modified ' + formatTimeAgo(this.selectedDoc.lastModified);
      info.appendChild(modEl);
    }

    bar.appendChild(info);

    const changeBtn = createElement('button', 'Change Document', { class: 'btn btn-sm btn-outline' });
    this.addListener(changeBtn, 'click', () => this.showDocumentSelection());
    bar.appendChild(changeBtn);

    return bar;
  }

  // ==================== CREATE SNAPSHOT ====================

  renderCreateSnapshotForm() {
    const form = createElement('div', '', { class: 'vs-create-form' });
    const formTitle = createElement('h2', 'Create Snapshot', { class: 'vs-section-title' });
    form.appendChild(formTitle);

    const row = createElement('div', '', { class: 'vs-create-row' });

    const inputGroup = createElement('div', '', { class: 'vs-create-input-group' });
    const label = createElement('label', 'Snapshot Name', { class: 'vs-field-label', for: 'vs-snapshot-name' });
    inputGroup.appendChild(label);
    const input = createElement('input', '', {
      class: 'vs-field-input',
      type: 'text',
      id: 'vs-snapshot-name',
      'aria-label': 'Snapshot name'
    });
    input.placeholder = 'e.g., Before applying to Acme Corp';
    input.maxLength = MAX_SNAPSHOT_NAME_LENGTH;
    inputGroup.appendChild(input);
    row.appendChild(inputGroup);

    const createBtn = createElement('button', 'Create Snapshot', { class: 'btn btn-primary vs-create-btn' });
    this.addListener(createBtn, 'click', async () => {
      const name = input.value.trim();
      if (!name) {
        window.CC?.toast?.('Please enter a snapshot name.', 'error');
        input.focus();
        return;
      }
      await this.createSnapshot(name);
      input.value = '';
    });
    this.addListener(input, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn.click();
      }
    });
    row.appendChild(createBtn);
    form.appendChild(row);

    return form;
  }

  async createSnapshot(name) {
    try {
      // Re-read the current state of the document
      const currentDoc = await this.db.read(STORES.DOCUMENTS, this.selectedDocId);
      if (!currentDoc) {
        window.CC?.toast?.('Document no longer exists.', 'error');
        return;
      }

      const snapshot = {
        id: generateUUID(),
        documentId: this.selectedDocId,
        name: name.substring(0, MAX_SNAPSHOT_NAME_LENGTH),
        data: deepClone(currentDoc),
        createdAt: new Date().toISOString()
      };

      await this.db.create(STORES.SNAPSHOTS, snapshot);
      window.CC?.toast?.('Snapshot created successfully.', 'success');

      // Refresh the view
      this.selectedDoc = currentDoc;
      await this.showSnapshotHistory();
    } catch (err) {
      console.error('Failed to create snapshot:', err);
      window.CC?.toast?.('Failed to create snapshot.', 'error');
    }
  }

  // ==================== SNAPSHOT CARD ====================

  renderSnapshotCard(snap) {
    const isExpanded = this.expandedSnapshotId === snap.id;
    const card = createElement('div', '', {
      class: 'vs-snapshot-card' + (isExpanded ? ' vs-snapshot-card--expanded' : '')
    });

    // Header row (always visible)
    const header = createElement('div', '', { class: 'vs-snapshot-header' });
    header.tabIndex = 0;
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    header.setAttribute('aria-label', 'Toggle snapshot details for ' + snap.name);

    const headerInfo = createElement('div', '', { class: 'vs-snapshot-header-info' });
    const nameEl = createElement('h3', '', { class: 'vs-snapshot-name' });
    nameEl.textContent = snap.name || 'Untitled Snapshot';
    headerInfo.appendChild(nameEl);

    const metaEl = createElement('span', '', { class: 'vs-snapshot-meta' });
    metaEl.textContent = formatTimeAgo(snap.createdAt);
    if (snap.createdAt) {
      metaEl.title = formatDate(snap.createdAt, 'long');
    }
    headerInfo.appendChild(metaEl);
    header.appendChild(headerInfo);

    // Preview summary on header
    const previewBrief = createElement('span', '', { class: 'vs-snapshot-brief' });
    const briefParts = [];
    if (snap.data?.personalInfo?.fullName) {
      briefParts.push(snap.data.personalInfo.fullName);
    }
    if (snap.data?.sections) {
      const secCount = Array.isArray(snap.data.sections) ? snap.data.sections.length : Object.keys(snap.data.sections).length;
      briefParts.push(secCount + ' ' + pluralize(secCount, 'section'));
    }
    previewBrief.textContent = briefParts.join(' · ');
    header.appendChild(previewBrief);

    // Expand/collapse indicator
    const chevron = createElement('span', '', { class: 'vs-chevron', 'aria-hidden': 'true' });
    chevron.innerHTML = isExpanded ? '&#9650;' : '&#9660;';
    header.appendChild(chevron);

    const toggleHandler = () => {
      this.expandedSnapshotId = isExpanded ? null : snap.id;
      this.compareSnapshotId = null;
      this.showSnapshotHistory();
    };
    this.addListener(header, 'click', toggleHandler);
    this.addListener(header, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleHandler();
      }
    });
    card.appendChild(header);

    // Expanded detail panel
    if (isExpanded) {
      card.appendChild(this.renderSnapshotDetail(snap));
    }

    return card;
  }

  // ==================== SNAPSHOT DETAIL / PREVIEW ====================

  renderSnapshotDetail(snap) {
    const detail = createElement('div', '', { class: 'vs-snapshot-detail' });

    // Preview fields
    const preview = createElement('div', '', { class: 'vs-snapshot-preview' });
    preview.appendChild(createElement('h4', 'Snapshot Content', { class: 'vs-detail-title' }));

    const fields = createElement('dl', '', { class: 'vs-detail-fields' });

    // Personal info
    if (snap.data?.personalInfo?.fullName) {
      this.addDetailField(fields, 'Full Name', snap.data.personalInfo.fullName);
    }
    if (snap.data?.personalInfo?.professionalTitle) {
      this.addDetailField(fields, 'Professional Title', snap.data.personalInfo.professionalTitle);
    }
    if (snap.data?.personalInfo?.email) {
      this.addDetailField(fields, 'Email', snap.data.personalInfo.email);
    }

    // Sections count
    if (snap.data?.sections) {
      const secCount = Array.isArray(snap.data.sections) ? snap.data.sections.length : Object.keys(snap.data.sections).length;
      this.addDetailField(fields, 'Sections', secCount + ' ' + pluralize(secCount, 'section'));

      // List section types
      if (Array.isArray(snap.data.sections) && snap.data.sections.length > 0) {
        const sectionNames = snap.data.sections
          .map(s => fieldLabel(s.type || s.title || 'Unknown'))
          .slice(0, 8)
          .join(', ');
        const suffix = snap.data.sections.length > 8 ? (' + ' + (snap.data.sections.length - 8) + ' more') : '';
        this.addDetailField(fields, 'Section Types', sectionNames + suffix);
      }
    }

    // Design settings
    if (snap.data?.design) {
      if (snap.data.design.templateId) {
        this.addDetailField(fields, 'Template', snap.data.design.templateId);
      }
      if (snap.data.design.accentColor) {
        const colorEl = createElement('div', '', { class: 'vs-color-preview-row' });
        const swatch = createElement('span', '', { class: 'vs-color-swatch' });
        swatch.style.backgroundColor = snap.data.design.accentColor;
        colorEl.appendChild(swatch);
        const colorText = createElement('span', snap.data.design.accentColor);
        colorEl.appendChild(colorText);

        const dt = createElement('dt', 'Accent Color', { class: 'vs-detail-label' });
        const dd = createElement('dd', '', { class: 'vs-detail-value' });
        dd.appendChild(colorEl);
        fields.appendChild(dt);
        fields.appendChild(dd);
      }
    }

    // Created date
    this.addDetailField(fields, 'Snapshot Created', formatDate(snap.createdAt, 'long'));

    // Document name at time of snapshot
    if (snap.data?.name) {
      this.addDetailField(fields, 'Document Name (at snapshot)', snap.data.name);
    }

    preview.appendChild(fields);
    detail.appendChild(preview);

    // Action buttons
    const actions = createElement('div', '', { class: 'vs-snapshot-actions' });

    const compareBtn = createElement('button', 'Compare with Current', { class: 'btn btn-sm btn-outline' });
    this.addListener(compareBtn, 'click', async () => {
      this.compareSnapshotId = snap.id;
      await this.showSnapshotHistory();
      // Scroll to comparison
      const compEl = this.container.querySelector('#vs-comparison');
      if (compEl) compEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    actions.appendChild(compareBtn);

    const restoreBtn = createElement('button', 'Restore', { class: 'btn btn-sm btn-primary' });
    this.addListener(restoreBtn, 'click', () => this.confirmRestore(snap));
    actions.appendChild(restoreBtn);

    const deleteBtn = createElement('button', 'Delete', { class: 'btn btn-sm btn-outline vs-delete-btn' });
    this.addListener(deleteBtn, 'click', () => this.confirmDelete(snap));
    actions.appendChild(deleteBtn);

    detail.appendChild(actions);
    return detail;
  }

  addDetailField(container, label, value) {
    const dt = createElement('dt', label, { class: 'vs-detail-label' });
    const dd = createElement('dd', '', { class: 'vs-detail-value' });
    dd.textContent = value;
    container.appendChild(dt);
    container.appendChild(dd);
  }

  // ==================== COMPARE SNAPSHOT VS CURRENT ====================

  async buildComparisonView(snapshotId) {
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (!snap) return null;

    let currentDoc;
    try {
      currentDoc = await this.db.read(STORES.DOCUMENTS, this.selectedDocId);
    } catch {
      window.CC?.toast?.('Failed to load current document for comparison.', 'error');
      return null;
    }
    if (!currentDoc) return null;

    const section = createElement('div', '', { class: 'vs-comparison', id: 'vs-comparison' });
    const sectionHeader = createElement('div', '', { class: 'vs-comparison-header' });
    sectionHeader.appendChild(createElement('h2', 'Comparison: Snapshot vs Current', { class: 'vs-section-title' }));
    const compMeta = createElement('p', '', { class: 'vs-comparison-meta' });
    compMeta.textContent = `Comparing "${snap.name}" (${formatTimeAgo(snap.createdAt)}) with the current document state.`;
    sectionHeader.appendChild(compMeta);

    const closeBtn = createElement('button', 'Close Comparison', { class: 'btn btn-sm btn-outline' });
    this.addListener(closeBtn, 'click', () => {
      this.compareSnapshotId = null;
      this.showSnapshotHistory();
    });
    sectionHeader.appendChild(closeBtn);
    section.appendChild(sectionHeader);

    const snapData = snap.data || {};
    const diffContainer = createElement('div', '', { class: 'vs-diff-container' });

    let hasAnyDifference = false;

    // Personal Info diff
    const piDiff = shallowDiff(snapData.personalInfo || {}, currentDoc.personalInfo || {});
    if (piDiff.changed.length || piDiff.added.length || piDiff.removed.length) {
      hasAnyDifference = true;
      diffContainer.appendChild(this.renderDiffSection(
        'Personal Information',
        piDiff,
        snapData.personalInfo || {},
        currentDoc.personalInfo || {}
      ));
    }

    // Sections diff
    const snapSections = Array.isArray(snapData.sections) ? snapData.sections : [];
    const curSections = Array.isArray(currentDoc.sections) ? currentDoc.sections : [];
    const sectionsDiff = this.compareSections(snapSections, curSections);
    if (sectionsDiff.changed.length || sectionsDiff.added.length || sectionsDiff.removed.length) {
      hasAnyDifference = true;
      diffContainer.appendChild(this.renderSectionsDiff(sectionsDiff));
    }

    // Design diff
    const designDiff = shallowDiff(snapData.design || {}, currentDoc.design || {});
    if (designDiff.changed.length || designDiff.added.length || designDiff.removed.length) {
      hasAnyDifference = true;
      diffContainer.appendChild(this.renderDiffSection(
        'Design Settings',
        designDiff,
        snapData.design || {},
        currentDoc.design || {}
      ));
    }

    // Settings diff
    const settingsDiff = shallowDiff(snapData.settings || {}, currentDoc.settings || {});
    if (settingsDiff.changed.length || settingsDiff.added.length || settingsDiff.removed.length) {
      hasAnyDifference = true;
      diffContainer.appendChild(this.renderDiffSection(
        'Document Settings',
        settingsDiff,
        snapData.settings || {},
        currentDoc.settings || {}
      ));
    }

    // Top-level fields diff (name, type, etc.)
    const topKeys = ['name', 'type', 'targetRole', 'tags'];
    const snapTop = {};
    const curTop = {};
    topKeys.forEach(k => {
      if (snapData[k] !== undefined) snapTop[k] = snapData[k];
      if (currentDoc[k] !== undefined) curTop[k] = currentDoc[k];
    });
    const topDiff = shallowDiff(snapTop, curTop);
    if (topDiff.changed.length || topDiff.added.length || topDiff.removed.length) {
      hasAnyDifference = true;
      diffContainer.appendChild(this.renderDiffSection('Document Properties', topDiff, snapTop, curTop));
    }

    if (!hasAnyDifference) {
      const noDiff = createElement('div', '', { class: 'vs-no-diff' });
      noDiff.appendChild(createElement('p', 'No differences found. The snapshot matches the current document.', { class: 'vs-no-diff-msg' }));
      diffContainer.appendChild(noDiff);
    }

    section.appendChild(diffContainer);
    return section;
  }

  renderDiffSection(title, diff, oldObj, newObj) {
    const section = createElement('div', '', { class: 'vs-diff-section' });
    section.appendChild(createElement('h3', title, { class: 'vs-diff-title' }));

    const table = createElement('div', '', { class: 'vs-diff-table', role: 'table', 'aria-label': title + ' differences' });

    // Table header
    const thead = createElement('div', '', { class: 'vs-diff-row vs-diff-row--header', role: 'row' });
    thead.appendChild(createElement('div', 'Field', { class: 'vs-diff-cell vs-diff-cell--field', role: 'columnheader' }));
    thead.appendChild(createElement('div', 'Snapshot', { class: 'vs-diff-cell vs-diff-cell--old', role: 'columnheader' }));
    thead.appendChild(createElement('div', 'Current', { class: 'vs-diff-cell vs-diff-cell--new', role: 'columnheader' }));
    thead.appendChild(createElement('div', 'Status', { class: 'vs-diff-cell vs-diff-cell--status', role: 'columnheader' }));
    table.appendChild(thead);

    // Changed rows
    diff.changed.forEach(key => {
      const row = createElement('div', '', { class: 'vs-diff-row', role: 'row' });
      row.appendChild(createElement('div', fieldLabel(key), { class: 'vs-diff-cell vs-diff-cell--field', role: 'cell' }));

      const oldCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--old', role: 'cell' });
      oldCell.textContent = this.formatDiffValue(oldObj[key]);
      row.appendChild(oldCell);

      const newCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--new', role: 'cell' });
      newCell.textContent = this.formatDiffValue(newObj[key]);
      row.appendChild(newCell);

      const statusCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--status', role: 'cell' });
      statusCell.appendChild(createElement('span', 'Changed', { class: 'vs-diff-badge vs-diff-badge--changed' }));
      row.appendChild(statusCell);
      table.appendChild(row);
    });

    // Added rows
    diff.added.forEach(key => {
      const row = createElement('div', '', { class: 'vs-diff-row', role: 'row' });
      row.appendChild(createElement('div', fieldLabel(key), { class: 'vs-diff-cell vs-diff-cell--field', role: 'cell' }));
      row.appendChild(createElement('div', '—', { class: 'vs-diff-cell vs-diff-cell--old vs-diff-cell--empty', role: 'cell' }));

      const newCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--new', role: 'cell' });
      newCell.textContent = this.formatDiffValue(newObj[key]);
      row.appendChild(newCell);

      const statusCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--status', role: 'cell' });
      statusCell.appendChild(createElement('span', 'Added', { class: 'vs-diff-badge vs-diff-badge--added' }));
      row.appendChild(statusCell);
      table.appendChild(row);
    });

    // Removed rows
    diff.removed.forEach(key => {
      const row = createElement('div', '', { class: 'vs-diff-row', role: 'row' });
      row.appendChild(createElement('div', fieldLabel(key), { class: 'vs-diff-cell vs-diff-cell--field', role: 'cell' }));

      const oldCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--old', role: 'cell' });
      oldCell.textContent = this.formatDiffValue(oldObj[key]);
      row.appendChild(oldCell);

      row.appendChild(createElement('div', '—', { class: 'vs-diff-cell vs-diff-cell--new vs-diff-cell--empty', role: 'cell' }));

      const statusCell = createElement('div', '', { class: 'vs-diff-cell vs-diff-cell--status', role: 'cell' });
      statusCell.appendChild(createElement('span', 'Removed', { class: 'vs-diff-badge vs-diff-badge--removed' }));
      row.appendChild(statusCell);
      table.appendChild(row);
    });

    section.appendChild(table);
    return section;
  }

  compareSections(snapSections, curSections) {
    const changed = [];
    const added = [];
    const removed = [];

    const snapById = new Map(snapSections.map(s => [s.id || s.type, s]));
    const curById = new Map(curSections.map(s => [s.id || s.type, s]));

    // Check for removed and changed
    for (const [id, snapSec] of snapById) {
      if (!curById.has(id)) {
        removed.push({ id, section: snapSec, label: fieldLabel(snapSec.type || snapSec.title || id) });
      } else {
        const curSec = curById.get(id);
        const snapStr = JSON.stringify(snapSec);
        const curStr = JSON.stringify(curSec);
        if (snapStr !== curStr) {
          changed.push({
            id,
            label: fieldLabel(curSec.type || curSec.title || id),
            snapshot: snapSec,
            current: curSec
          });
        }
      }
    }

    // Check for added
    for (const [id, curSec] of curById) {
      if (!snapById.has(id)) {
        added.push({ id, section: curSec, label: fieldLabel(curSec.type || curSec.title || id) });
      }
    }

    return { changed, added, removed };
  }

  renderSectionsDiff(sectionsDiff) {
    const section = createElement('div', '', { class: 'vs-diff-section' });
    section.appendChild(createElement('h3', 'Document Sections', { class: 'vs-diff-title' }));

    if (sectionsDiff.added.length > 0) {
      const addedGroup = createElement('div', '', { class: 'vs-diff-group' });
      addedGroup.appendChild(createElement('h4', 'Added Sections', { class: 'vs-diff-group-title' }));
      sectionsDiff.added.forEach(item => {
        const row = createElement('div', '', { class: 'vs-diff-item' });
        row.appendChild(createElement('span', item.label, { class: 'vs-diff-item-name' }));
        row.appendChild(createElement('span', 'Added', { class: 'vs-diff-badge vs-diff-badge--added' }));
        addedGroup.appendChild(row);
      });
      section.appendChild(addedGroup);
    }

    if (sectionsDiff.removed.length > 0) {
      const removedGroup = createElement('div', '', { class: 'vs-diff-group' });
      removedGroup.appendChild(createElement('h4', 'Removed Sections', { class: 'vs-diff-group-title' }));
      sectionsDiff.removed.forEach(item => {
        const row = createElement('div', '', { class: 'vs-diff-item' });
        row.appendChild(createElement('span', item.label, { class: 'vs-diff-item-name' }));
        row.appendChild(createElement('span', 'Removed', { class: 'vs-diff-badge vs-diff-badge--removed' }));
        removedGroup.appendChild(row);
      });
      section.appendChild(removedGroup);
    }

    if (sectionsDiff.changed.length > 0) {
      const changedGroup = createElement('div', '', { class: 'vs-diff-group' });
      changedGroup.appendChild(createElement('h4', 'Modified Sections', { class: 'vs-diff-group-title' }));
      sectionsDiff.changed.forEach(item => {
        const row = createElement('div', '', { class: 'vs-diff-item' });
        row.appendChild(createElement('span', item.label, { class: 'vs-diff-item-name' }));
        row.appendChild(createElement('span', 'Changed', { class: 'vs-diff-badge vs-diff-badge--changed' }));
        changedGroup.appendChild(row);
      });
      section.appendChild(changedGroup);
    }

    return section;
  }

  formatDiffValue(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.length + ' ' + pluralize(val.length, 'item');
      }
      return truncate(JSON.stringify(val), 80);
    }
    return truncate(String(val), 120);
  }

  // ==================== RESTORE SNAPSHOT ====================

  confirmRestore(snap) {
    if (window.CC?.modal) {
      window.CC.modal({
        title: 'Restore Snapshot',
        body: `Are you sure you want to restore "${snap.name}"? This will overwrite the current document data with the snapshot contents. This action cannot be undone.`,
        actions: [
          { label: 'Cancel', type: 'secondary' },
          {
            label: 'Restore',
            type: 'danger',
            handler: () => this.restoreSnapshot(snap)
          }
        ]
      });
    } else {
      // Fallback if modal is not available
      this.restoreSnapshot(snap);
    }
  }

  async restoreSnapshot(snap) {
    try {
      const currentDoc = await this.db.read(STORES.DOCUMENTS, this.selectedDocId);
      if (!currentDoc) {
        window.CC?.toast?.('Document no longer exists.', 'error');
        return;
      }

      // Restore snapshot data but preserve document id and update lastModified
      const restoredDoc = deepClone(snap.data);
      restoredDoc.id = currentDoc.id;
      restoredDoc.lastModified = new Date().toISOString();

      await this.db.update(STORES.DOCUMENTS, restoredDoc);
      this.selectedDoc = restoredDoc;
      window.CC?.toast?.('Document restored from snapshot successfully.', 'success');

      // Emit event so other modules know
      this.events.emit('document:save', { id: this.selectedDocId });

      await this.showSnapshotHistory();
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      window.CC?.toast?.('Failed to restore snapshot.', 'error');
    }
  }

  // ==================== DELETE SNAPSHOT ====================

  confirmDelete(snap) {
    if (window.CC?.modal) {
      window.CC.modal({
        title: 'Delete Snapshot',
        body: `Are you sure you want to delete the snapshot "${snap.name}"? This action cannot be undone.`,
        actions: [
          { label: 'Cancel', type: 'secondary' },
          {
            label: 'Delete',
            type: 'danger',
            handler: () => this.deleteSnapshot(snap.id)
          }
        ]
      });
    } else {
      this.deleteSnapshot(snap.id);
    }
  }

  async deleteSnapshot(snapshotId) {
    try {
      await this.db.delete(STORES.SNAPSHOTS, snapshotId);
      window.CC?.toast?.('Snapshot deleted.', 'info');

      // If we were comparing this snapshot, clear comparison
      if (this.compareSnapshotId === snapshotId) {
        this.compareSnapshotId = null;
      }
      // If we were expanding this snapshot, clear expansion
      if (this.expandedSnapshotId === snapshotId) {
        this.expandedSnapshotId = null;
      }

      await this.showSnapshotHistory();
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
      window.CC?.toast?.('Failed to delete snapshot.', 'error');
    }
  }

  // ==================== STORAGE INFO ====================

  async renderStorageInfo() {
    const bar = createElement('div', '', { class: 'vs-storage-bar' });
    try {
      const storage = await this.db.estimateStorage();
      const usageText = formatFileSize(storage.usage);
      const quotaText = formatFileSize(storage.quota);
      const pctText = storage.percentage.toFixed(1) + '%';

      const icon = createElement('span', '', { class: 'vs-storage-icon', 'aria-hidden': 'true' });
      icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.2"/><circle cx="4.5" cy="5" r="0.8" fill="currentColor"/><circle cx="4.5" cy="9.5" r="0.8" fill="currentColor"/></svg>';
      bar.appendChild(icon);

      const text = createElement('span', '', { class: 'vs-storage-text' });
      text.textContent = `Storage: ${usageText} of ${quotaText} used (${pctText})`;
      bar.appendChild(text);

      // Snapshots count
      const snapCountText = createElement('span', '', { class: 'vs-storage-snapshots' });
      snapCountText.textContent = `${this.snapshots.length} ${pluralize(this.snapshots.length, 'snapshot')} for this document`;
      bar.appendChild(snapCountText);

      if (storage.percentage > 80) {
        bar.classList.add('vs-storage-bar--warning');
        const warnEl = createElement('span', 'Storage is getting full. Consider deleting old snapshots.', { class: 'vs-storage-warning' });
        bar.appendChild(warnEl);
      }
    } catch {
      const text = createElement('span', 'Storage information unavailable.', { class: 'vs-storage-text' });
      bar.appendChild(text);
    }
    return bar;
  }

  // ==================== UTILITY ====================

  renderError(message) {
    const errorEl = createElement('div', '', { class: 'vs-error' });
    errorEl.appendChild(createElement('p', message, { class: 'vs-error-msg' }));
    const retryBtn = createElement('button', 'Go to Dashboard', { class: 'btn btn-primary' });
    this.addListener(retryBtn, 'click', () => {
      if (window.CC?.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    errorEl.appendChild(retryBtn);
    return errorEl;
  }
}

export { VersionStudio as default };
