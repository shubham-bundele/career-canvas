/**
 * Data & Backup Studio Module
 * Provides data management, backup/restore, category export, and health check
 * for all IndexedDB stores in the CareerCanvas application.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { formatFileSize } from '../utils/format.js';
import { STORES } from '../core/db.js';
import eventBus from '../core/events.js';

/**
 * Human-friendly labels for each store
 */
const STORE_LABELS = {
  [STORES.DOCUMENTS]: 'Documents',
  [STORES.MASTER_PROFILE]: 'Master Profile',
  [STORES.JOB_DESCRIPTIONS]: 'Job Descriptions',
  [STORES.APPLICATIONS]: 'Applications',
  [STORES.CONTENT_LIBRARY]: 'Content Library',
  [STORES.SNAPSHOTS]: 'Snapshots',
  [STORES.IMAGES]: 'Images',
  [STORES.DESIGN_PRESETS]: 'Design Presets',
  [STORES.MATCH_ANALYSES]: 'Match Analyses',
  [STORES.SKILLS_MATRICES]: 'Skills Matrices',
  [STORES.CUSTOM_SECTIONS]: 'Custom Sections'
};

/**
 * SVG icon paths for each store (simple, single-path where possible)
 */
const STORE_ICONS = {
  [STORES.DOCUMENTS]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  [STORES.MASTER_PROFILE]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  [STORES.JOB_DESCRIPTIONS]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
  [STORES.APPLICATIONS]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  [STORES.CONTENT_LIBRARY]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  [STORES.SNAPSHOTS]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  [STORES.IMAGES]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  [STORES.DESIGN_PRESETS]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.02 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z"/></svg>',
  [STORES.MATCH_ANALYSES]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  [STORES.SKILLS_MATRICES]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  [STORES.CUSTOM_SECTIONS]: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
};

const BACKUP_VERSION = 1;

// ============================================================

export class DataStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];

    this.storeCounts = {};
    this.storageInfo = null;
    this.pendingImport = null;
  }

  // ==================== RENDER / LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'ds-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Data & Backup Studio');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'ds-content', id: 'ds-content' });
    this.container.appendChild(content);
    await this.showOverview();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'ds-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'ds-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });
    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);
    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);
    const cur = createElement('li', 'Data & Backup Studio', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);
    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const row = createElement('div', '', { class: 'ds-title-row' });
    const group = createElement('div', '', { class: 'ds-title-group' });
    group.appendChild(createElement('h1', 'Data & Backup Studio', { class: 'ds-title' }));
    group.appendChild(createElement('p', 'Manage your CareerCanvas data. Export backups, import data, inspect individual stores, and run health checks. Everything stays in your browser.', { class: 'ds-description' }));
    row.appendChild(group);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline ds-back-btn' });
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
    return this.container?.querySelector('#ds-content') || this.container;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  // ==================== OVERVIEW DASHBOARD ====================

  async showOverview() {
    const c = this.gc();
    c.innerHTML = '';

    // Load counts for all stores
    await this.loadStoreCounts();
    this.storageInfo = await this.db.estimateStorage();

    const overview = createElement('div', '', { class: 'ds-overview' });

    // Storage usage bar
    overview.appendChild(this.renderStorageBar());

    // Global action buttons
    overview.appendChild(this.renderGlobalActions());

    // Store cards grid
    overview.appendChild(this.renderStoreGrid());

    c.appendChild(overview);
  }

  async loadStoreCounts() {
    this.storeCounts = {};
    const storeKeys = Object.values(STORES);
    for (const storeName of storeKeys) {
      try {
        this.storeCounts[storeName] = await this.db.count(storeName);
      } catch {
        this.storeCounts[storeName] = -1;
      }
    }
  }

  renderStorageBar() {
    const section = createElement('div', '', { class: 'ds-storage-section' });
    section.appendChild(createElement('h2', 'Storage Usage', { class: 'ds-section-title' }));

    const bar = createElement('div', '', { class: 'ds-storage-bar-wrapper' });
    const track = createElement('div', '', { class: 'ds-storage-track' });
    const fill = createElement('div', '', { class: 'ds-storage-fill' });

    const pct = this.storageInfo ? this.storageInfo.percentage : 0;
    fill.style.width = Math.min(pct, 100).toFixed(1) + '%';

    if (pct > 80) {
      fill.classList.add('ds-storage-fill--warning');
    } else if (pct > 95) {
      fill.classList.add('ds-storage-fill--danger');
    }

    track.appendChild(fill);
    bar.appendChild(track);

    const info = createElement('div', '', { class: 'ds-storage-info' });
    const usedText = this.storageInfo ? formatFileSize(this.storageInfo.usage) : '0 Bytes';
    const totalText = this.storageInfo ? formatFileSize(this.storageInfo.quota) : 'Unknown';
    const pctText = pct.toFixed(1) + '%';
    info.appendChild(createElement('span', usedText + ' used of ' + totalText, { class: 'ds-storage-used' }));
    info.appendChild(createElement('span', pctText, { class: 'ds-storage-pct' }));
    bar.appendChild(info);

    section.appendChild(bar);
    return section;
  }

  renderGlobalActions() {
    const actions = createElement('div', '', { class: 'ds-global-actions' });

    const exportBtn = createElement('button', '', { class: 'btn btn-primary ds-action-btn' });
    const exportIcon = createElement('span', '', { class: 'ds-btn-icon', 'aria-hidden': 'true' });
    exportIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    exportBtn.appendChild(exportIcon);
    exportBtn.appendChild(document.createTextNode(' Export Full Backup'));
    this.addListener(exportBtn, 'click', () => this.exportFullBackup());
    actions.appendChild(exportBtn);

    const importBtn = createElement('button', '', { class: 'btn btn-outline ds-action-btn' });
    const importIcon = createElement('span', '', { class: 'ds-btn-icon', 'aria-hidden': 'true' });
    importIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    importBtn.appendChild(importIcon);
    importBtn.appendChild(document.createTextNode(' Import Backup'));
    this.addListener(importBtn, 'click', () => this.showImportView());
    actions.appendChild(importBtn);

    const healthBtn = createElement('button', '', { class: 'btn btn-outline ds-action-btn' });
    const healthIcon = createElement('span', '', { class: 'ds-btn-icon', 'aria-hidden': 'true' });
    healthIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
    healthBtn.appendChild(healthIcon);
    healthBtn.appendChild(document.createTextNode(' Health Check'));
    this.addListener(healthBtn, 'click', () => this.runHealthCheck());
    actions.appendChild(healthBtn);

    return actions;
  }

  renderStoreGrid() {
    const section = createElement('div', '', { class: 'ds-stores-section' });
    section.appendChild(createElement('h2', 'Data Stores', { class: 'ds-section-title' }));

    const grid = createElement('div', '', { class: 'ds-store-grid' });

    const storeKeys = Object.values(STORES);
    for (const storeName of storeKeys) {
      grid.appendChild(this.renderStoreCard(storeName));
    }

    section.appendChild(grid);
    return section;
  }

  renderStoreCard(storeName) {
    const card = createElement('div', '', { class: 'ds-store-card' });
    card.setAttribute('data-store', storeName);

    const header = createElement('div', '', { class: 'ds-store-card-header' });

    const iconWrap = createElement('div', '', { class: 'ds-store-icon', 'aria-hidden': 'true' });
    iconWrap.innerHTML = STORE_ICONS[storeName] || '';
    header.appendChild(iconWrap);

    const info = createElement('div', '', { class: 'ds-store-info' });
    const label = STORE_LABELS[storeName] || storeName;
    info.appendChild(createElement('h3', label, { class: 'ds-store-name' }));

    const count = this.storeCounts[storeName];
    const countText = count === -1 ? 'Error' : count + (count === 1 ? ' record' : ' records');
    info.appendChild(createElement('span', countText, { class: 'ds-store-count' }));

    header.appendChild(info);
    card.appendChild(header);

    // Action buttons
    const actions = createElement('div', '', { class: 'ds-store-actions' });

    const exportBtn = createElement('button', 'Export', { class: 'btn btn-sm btn-outline ds-store-export-btn', type: 'button' });
    exportBtn.setAttribute('aria-label', 'Export ' + label);
    this.addListener(exportBtn, 'click', (e) => {
      e.stopPropagation();
      this.exportCategory(storeName);
    });
    actions.appendChild(exportBtn);

    const deleteBtn = createElement('button', 'Delete All', { class: 'btn btn-sm btn-outline ds-store-delete-btn', type: 'button' });
    deleteBtn.setAttribute('aria-label', 'Delete all ' + label);
    this.addListener(deleteBtn, 'click', (e) => {
      e.stopPropagation();
      this.confirmDeleteCategory(storeName);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    return card;
  }

  // ==================== EXPORT FULL BACKUP ====================

  async exportFullBackup() {
    try {
      const stores = {};
      const storeKeys = Object.values(STORES);
      for (const storeName of storeKeys) {
        try {
          stores[storeName] = await this.db.getAll(storeName);
        } catch {
          stores[storeName] = [];
        }
      }

      const backup = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        application: 'CareerCanvas',
        stores
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().split('T')[0];
      const filename = 'careercanvas-backup-' + today + '.json';

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.CC?.toast) window.CC.toast.show('Full backup exported successfully', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      if (window.CC?.toast) window.CC.toast.show('Export failed: ' + err.message, 'error');
    }
  }

  // ==================== EXPORT SELECTED CATEGORY ====================

  async exportCategory(storeName) {
    try {
      const data = await this.db.getAll(storeName);

      const backup = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        application: 'CareerCanvas',
        storeName,
        data
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().split('T')[0];
      const label = (STORE_LABELS[storeName] || storeName).toLowerCase().replace(/\s+/g, '-');
      const filename = 'careercanvas-' + label + '-' + today + '.json';

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const count = data.length;
      if (window.CC?.toast) window.CC.toast.show('Exported ' + count + ' record' + (count === 1 ? '' : 's') + ' from ' + (STORE_LABELS[storeName] || storeName), 'success');
    } catch (err) {
      console.error('Category export failed:', err);
      if (window.CC?.toast) window.CC.toast.show('Export failed: ' + err.message, 'error');
    }
  }

  // ==================== DELETE CATEGORY DATA ====================

  confirmDeleteCategory(storeName) {
    if (!window.CC?.modal) {
      this.showInlineDeleteConfirm(storeName);
      return;
    }

    const label = STORE_LABELS[storeName] || storeName;
    const count = this.storeCounts[storeName] || 0;

    const body = createElement('div', '', { class: 'ds-delete-confirm' });
    body.appendChild(createElement('p', 'You are about to delete all ' + count + ' record' + (count === 1 ? '' : 's') + ' from "' + label + '". This action cannot be undone.', { class: 'ds-delete-warning-text' }));

    const fieldGroup = createElement('div', '', { class: 'ds-field-group' });
    fieldGroup.appendChild(createElement('label', 'Type "' + label + '" to confirm:', { class: 'ds-field-label' }));
    const confirmInput = createElement('input', '', {
      class: 'ds-field-input',
      type: 'text',
      'aria-label': 'Type store name to confirm deletion'
    });
    confirmInput.setAttribute('placeholder', label);
    fieldGroup.appendChild(confirmInput);
    body.appendChild(fieldGroup);

    const errorMsg = createElement('p', '', { class: 'ds-delete-error' });
    errorMsg.style.display = 'none';
    body.appendChild(errorMsg);

    const actionRow = createElement('div', '', { class: 'ds-delete-actions' });
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-outline', type: 'button' });
    cancelBtn.addEventListener('click', () => {
      if (window.CC?.modal) window.CC.modal.close();
    });
    actionRow.appendChild(cancelBtn);

    const deleteBtn = createElement('button', 'Delete All Data', { class: 'btn btn-danger', type: 'button' });
    deleteBtn.addEventListener('click', async () => {
      const typed = confirmInput.value.trim();
      if (typed !== label) {
        errorMsg.textContent = 'Name does not match. Please type "' + label + '" exactly.';
        errorMsg.style.display = 'block';
        confirmInput.focus();
        return;
      }
      if (window.CC?.modal) window.CC.modal.close();
      await this.executeDeleteCategory(storeName);
    });
    actionRow.appendChild(deleteBtn);
    body.appendChild(actionRow);

    window.CC.modal.show({
      title: 'Delete ' + label + '?',
      body,
      size: 'small',
      closable: true
    });
  }

  /**
   * Inline delete confirmation fallback (when modal is unavailable)
   */
  showInlineDeleteConfirm(storeName) {
    const label = STORE_LABELS[storeName] || storeName;
    const count = this.storeCounts[storeName] || 0;

    const card = this.container?.querySelector('[data-store="' + storeName + '"]');
    if (!card) return;

    // Remove any existing confirm panel
    const existing = card.querySelector('.ds-inline-confirm');
    if (existing) existing.remove();

    const panel = createElement('div', '', { class: 'ds-inline-confirm' });
    panel.appendChild(createElement('p', 'Delete all ' + count + ' record' + (count === 1 ? '' : 's') + '? Type "' + label + '" to confirm.', { class: 'ds-inline-confirm-text' }));

    const input = createElement('input', '', {
      class: 'ds-field-input ds-inline-confirm-input',
      type: 'text'
    });
    input.setAttribute('placeholder', label);
    panel.appendChild(input);

    const errorMsg = createElement('p', '', { class: 'ds-delete-error' });
    errorMsg.style.display = 'none';
    panel.appendChild(errorMsg);

    const row = createElement('div', '', { class: 'ds-inline-confirm-actions' });
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-sm btn-outline', type: 'button' });
    this.addListener(cancelBtn, 'click', () => panel.remove());
    row.appendChild(cancelBtn);

    const delBtn = createElement('button', 'Confirm Delete', { class: 'btn btn-sm btn-danger', type: 'button' });
    this.addListener(delBtn, 'click', async () => {
      if (input.value.trim() !== label) {
        errorMsg.textContent = 'Name does not match.';
        errorMsg.style.display = 'block';
        input.focus();
        return;
      }
      panel.remove();
      await this.executeDeleteCategory(storeName);
    });
    row.appendChild(delBtn);
    panel.appendChild(row);

    card.appendChild(panel);
    input.focus();
  }

  async executeDeleteCategory(storeName) {
    const label = STORE_LABELS[storeName] || storeName;
    try {
      await this.db.clear(storeName);
      if (window.CC?.toast) window.CC.toast.show('All data in "' + label + '" deleted', 'info');
      await this.showOverview();
    } catch (err) {
      console.error('Delete failed:', err);
      if (window.CC?.toast) window.CC.toast.show('Delete failed: ' + err.message, 'error');
    }
  }

  // ==================== IMPORT BACKUP ====================

  showImportView() {
    const c = this.gc();
    c.innerHTML = '';
    this.pendingImport = null;

    const wrapper = createElement('div', '', { class: 'ds-import-view' });

    // Back button
    const nav = createElement('div', '', { class: 'ds-import-nav' });
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline' });
    backBtn.innerHTML = '&#8592; Back to Overview';
    this.addListener(backBtn, 'click', () => this.showOverview());
    nav.appendChild(backBtn);
    wrapper.appendChild(nav);

    wrapper.appendChild(createElement('h2', 'Import Backup', { class: 'ds-section-title' }));
    wrapper.appendChild(createElement('p', 'Select a previously exported CareerCanvas backup file (.json) to restore your data.', { class: 'ds-import-desc' }));

    // File drop zone
    const dropZone = createElement('div', '', { class: 'ds-drop-zone', role: 'button', tabindex: '0' });
    dropZone.setAttribute('aria-label', 'Click or drag a file to import');

    const dropIcon = createElement('div', '', { class: 'ds-drop-icon', 'aria-hidden': 'true' });
    dropIcon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    dropZone.appendChild(dropIcon);
    dropZone.appendChild(createElement('p', 'Click to select file or drag & drop', { class: 'ds-drop-text' }));
    dropZone.appendChild(createElement('p', 'Accepts .json backup files', { class: 'ds-drop-hint' }));

    const fileInput = createElement('input', '', { type: 'file', class: 'ds-file-input' });
    fileInput.setAttribute('accept', '.json');
    fileInput.style.display = 'none';

    this.addListener(dropZone, 'click', () => fileInput.click());
    this.addListener(dropZone, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    this.addListener(fileInput, 'change', (e) => {
      if (e.target.files?.length) this.handleImportFile(e.target.files[0]);
    });

    // Drag-and-drop handlers
    this.addListener(dropZone, 'dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('ds-drop-zone--active');
    });
    this.addListener(dropZone, 'dragleave', () => {
      dropZone.classList.remove('ds-drop-zone--active');
    });
    this.addListener(dropZone, 'drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('ds-drop-zone--active');
      if (e.dataTransfer?.files?.length) {
        this.handleImportFile(e.dataTransfer.files[0]);
      }
    });

    wrapper.appendChild(dropZone);
    wrapper.appendChild(fileInput);

    // Preview container (shown after file is parsed)
    const preview = createElement('div', '', { class: 'ds-import-preview', id: 'ds-import-preview' });
    preview.style.display = 'none';
    wrapper.appendChild(preview);

    c.appendChild(wrapper);
  }

  async handleImportFile(file) {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      if (window.CC?.toast) window.CC.toast.show('Please select a .json backup file', 'error');
      return;
    }

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        if (window.CC?.toast) window.CC.toast.show('Invalid JSON file. Could not parse the file.', 'error');
        return;
      }

      // Validate structure
      const validation = this.validateImportData(data);
      if (!validation.valid) {
        if (window.CC?.toast) window.CC.toast.show(validation.error, 'error');
        return;
      }

      this.pendingImport = {
        data,
        filename: file.name,
        fileSize: file.size,
        warnings: validation.warnings
      };

      this.renderImportPreview();
    } catch (err) {
      console.error('File read error:', err);
      if (window.CC?.toast) window.CC.toast.show('Failed to read file: ' + err.message, 'error');
    }
  }

  validateImportData(data) {
    const warnings = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid backup format: file does not contain a JSON object.' };
    }

    if (data.version === undefined || data.version === null) {
      return { valid: false, error: 'Missing version field. This does not appear to be a CareerCanvas backup.' };
    }

    if (typeof data.version !== 'number' || data.version < 1) {
      return { valid: false, error: 'Invalid backup version: ' + data.version };
    }

    if (data.version > BACKUP_VERSION) {
      warnings.push('Backup version (' + data.version + ') is newer than the current app version (' + BACKUP_VERSION + '). Some data may not import correctly.');
    }

    // Determine if this is a full backup or a single-category export
    const isFullBackup = data.stores && typeof data.stores === 'object';
    const isCategoryBackup = data.storeName && Array.isArray(data.data);

    if (!isFullBackup && !isCategoryBackup) {
      return { valid: false, error: 'Unrecognized backup format. Expected either a full backup (with "stores") or a category backup (with "storeName" and "data").' };
    }

    const knownStores = Object.values(STORES);

    if (isFullBackup) {
      const storeNames = Object.keys(data.stores);
      if (storeNames.length === 0) {
        warnings.push('Backup contains no store data.');
      }
      for (const name of storeNames) {
        if (!knownStores.includes(name)) {
          warnings.push('Unknown store "' + name + '" will be skipped during import.');
        }
        if (!Array.isArray(data.stores[name])) {
          warnings.push('Store "' + name + '" does not contain an array. It will be skipped.');
        }
      }
    }

    if (isCategoryBackup) {
      if (!knownStores.includes(data.storeName)) {
        warnings.push('Store "' + data.storeName + '" is not recognized. Data may not import correctly.');
      }
    }

    return { valid: true, warnings };
  }

  renderImportPreview() {
    const preview = this.container?.querySelector('#ds-import-preview');
    if (!preview || !this.pendingImport) return;

    preview.innerHTML = '';
    preview.style.display = 'block';

    const { data, filename, fileSize, warnings } = this.pendingImport;

    // File info
    const fileInfo = createElement('div', '', { class: 'ds-import-file-info' });
    fileInfo.appendChild(createElement('strong', filename, {}));
    fileInfo.appendChild(createElement('span', ' (' + formatFileSize(fileSize) + ')', { class: 'ds-import-file-size' }));
    if (data.exportedAt) {
      const date = new Date(data.exportedAt);
      if (!isNaN(date.getTime())) {
        fileInfo.appendChild(createElement('span', ' - Exported on ' + date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), { class: 'ds-import-date' }));
      }
    }
    preview.appendChild(fileInfo);

    // Warnings
    if (warnings.length > 0) {
      const warnBox = createElement('div', '', { class: 'ds-import-warnings' });
      warnBox.appendChild(createElement('strong', 'Warnings:', {}));
      const warnList = createElement('ul', '', { class: 'ds-warn-list' });
      for (const w of warnings) {
        warnList.appendChild(createElement('li', w, {}));
      }
      warnBox.appendChild(warnList);
      preview.appendChild(warnBox);
    }

    // Content summary
    const isFullBackup = data.stores && typeof data.stores === 'object';
    const isCategoryBackup = data.storeName && Array.isArray(data.data);

    const summary = createElement('div', '', { class: 'ds-import-summary' });
    summary.appendChild(createElement('h3', 'Backup Contents', { class: 'ds-import-summary-title' }));

    const table = createElement('table', '', { class: 'ds-import-table' });
    const thead = createElement('thead', '', {});
    const headRow = createElement('tr', '', {});
    headRow.appendChild(createElement('th', 'Store', {}));
    headRow.appendChild(createElement('th', 'Records', {}));
    headRow.appendChild(createElement('th', 'Status', {}));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = createElement('tbody', '', {});
    const knownStores = Object.values(STORES);
    let totalRecords = 0;

    if (isFullBackup) {
      for (const [storeName, records] of Object.entries(data.stores)) {
        const tr = createElement('tr', '', {});
        const label = STORE_LABELS[storeName] || storeName;
        tr.appendChild(createElement('td', label, {}));

        const count = Array.isArray(records) ? records.length : 0;
        totalRecords += count;
        tr.appendChild(createElement('td', String(count), {}));

        const known = knownStores.includes(storeName);
        const statusTd = createElement('td', '', {});
        const badge = createElement('span', known ? 'Ready' : 'Unknown', {
          class: 'ds-status-badge ' + (known ? 'ds-status-badge--ok' : 'ds-status-badge--warn')
        });
        statusTd.appendChild(badge);
        tr.appendChild(statusTd);

        tbody.appendChild(tr);
      }
    } else if (isCategoryBackup) {
      const tr = createElement('tr', '', {});
      const label = STORE_LABELS[data.storeName] || data.storeName;
      tr.appendChild(createElement('td', label, {}));
      totalRecords = data.data.length;
      tr.appendChild(createElement('td', String(totalRecords), {}));
      const known = knownStores.includes(data.storeName);
      const statusTd = createElement('td', '', {});
      const badge = createElement('span', known ? 'Ready' : 'Unknown', {
        class: 'ds-status-badge ' + (known ? 'ds-status-badge--ok' : 'ds-status-badge--warn')
      });
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    summary.appendChild(table);
    summary.appendChild(createElement('p', 'Total: ' + totalRecords + ' record' + (totalRecords === 1 ? '' : 's'), { class: 'ds-import-total' }));
    preview.appendChild(summary);

    // Import note
    preview.appendChild(createElement('p', 'Existing records with the same ID will be updated. New records will be created. No existing data will be deleted.', { class: 'ds-import-note' }));

    // Confirm / cancel buttons
    const actions = createElement('div', '', { class: 'ds-import-actions' });
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-outline', type: 'button' });
    this.addListener(cancelBtn, 'click', () => {
      this.pendingImport = null;
      this.showImportView();
    });
    actions.appendChild(cancelBtn);

    const confirmBtn = createElement('button', 'Confirm Import', { class: 'btn btn-primary', type: 'button' });
    this.addListener(confirmBtn, 'click', () => this.executeImport());
    actions.appendChild(confirmBtn);

    preview.appendChild(actions);
  }

  async executeImport() {
    if (!this.pendingImport) return;

    const { data } = this.pendingImport;
    const isFullBackup = data.stores && typeof data.stores === 'object';
    const isCategoryBackup = data.storeName && Array.isArray(data.data);
    const knownStores = Object.values(STORES);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    try {
      if (isFullBackup) {
        for (const [storeName, records] of Object.entries(data.stores)) {
          if (!knownStores.includes(storeName) || !Array.isArray(records)) {
            skipped += Array.isArray(records) ? records.length : 0;
            continue;
          }
          for (const record of records) {
            try {
              const existing = record.id ? await this.db.read(storeName, record.id) : null;
              if (existing) {
                await this.db.update(storeName, record);
              } else {
                await this.db.create(storeName, record);
              }
              imported++;
            } catch {
              // Try update as fallback (record might already exist with same key)
              try {
                await this.db.update(storeName, record);
                imported++;
              } catch {
                errors++;
              }
            }
          }
        }
      } else if (isCategoryBackup) {
        const storeName = data.storeName;
        if (knownStores.includes(storeName)) {
          for (const record of data.data) {
            try {
              const existing = record.id ? await this.db.read(storeName, record.id) : null;
              if (existing) {
                await this.db.update(storeName, record);
              } else {
                await this.db.create(storeName, record);
              }
              imported++;
            } catch {
              try {
                await this.db.update(storeName, record);
                imported++;
              } catch {
                errors++;
              }
            }
          }
        } else {
          skipped = data.data.length;
        }
      }

      let msg = 'Import complete: ' + imported + ' record' + (imported === 1 ? '' : 's') + ' imported';
      if (skipped > 0) msg += ', ' + skipped + ' skipped';
      if (errors > 0) msg += ', ' + errors + ' error' + (errors === 1 ? '' : 's');

      if (window.CC?.toast) window.CC.toast.show(msg, errors > 0 ? 'warning' : 'success');

      this.pendingImport = null;
      await this.showOverview();
    } catch (err) {
      console.error('Import failed:', err);
      if (window.CC?.toast) window.CC.toast.show('Import failed: ' + err.message, 'error');
    }
  }

  // ==================== HEALTH CHECK ====================

  async runHealthCheck() {
    const c = this.gc();
    c.innerHTML = '';

    const wrapper = createElement('div', '', { class: 'ds-health-view' });

    // Back button
    const nav = createElement('div', '', { class: 'ds-health-nav' });
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline' });
    backBtn.innerHTML = '&#8592; Back to Overview';
    this.addListener(backBtn, 'click', () => this.showOverview());
    nav.appendChild(backBtn);
    wrapper.appendChild(nav);

    wrapper.appendChild(createElement('h2', 'Storage Health Check', { class: 'ds-section-title' }));
    wrapper.appendChild(createElement('p', 'Testing read and write access to all data stores...', { class: 'ds-health-desc' }));

    // Status container
    const statusContainer = createElement('div', '', { class: 'ds-health-results', id: 'ds-health-results' });

    // Spinner while running
    const spinner = createElement('div', '', { class: 'ds-spinner-wrap' });
    const spinEl = createElement('div', '', { class: 'ds-spinner', 'aria-label': 'Running health check' });
    spinner.appendChild(spinEl);
    spinner.appendChild(createElement('p', 'Running checks...', { class: 'ds-spinner-text' }));
    statusContainer.appendChild(spinner);
    wrapper.appendChild(statusContainer);
    c.appendChild(wrapper);

    // Run the actual health check
    const results = await this.performHealthCheck();
    this.renderHealthResults(results);
  }

  async performHealthCheck() {
    const storeKeys = Object.values(STORES);
    const results = [];

    for (const storeName of storeKeys) {
      const result = {
        storeName,
        label: STORE_LABELS[storeName] || storeName,
        readOk: false,
        writeOk: false,
        count: 0,
        error: null
      };

      // Test read
      try {
        result.count = await this.db.count(storeName);
        result.readOk = true;
      } catch (err) {
        result.error = 'Read failed: ' + err.message;
      }

      // Test write (create then immediately delete)
      if (result.readOk) {
        const testId = '__healthcheck_' + generateUUID();
        try {
          await this.db.create(storeName, { id: testId, __healthCheck: true });
          await this.db.delete(storeName, testId);
          result.writeOk = true;
        } catch (err) {
          result.error = 'Write test failed: ' + err.message;
          // Attempt cleanup
          try { await this.db.delete(storeName, testId); } catch { /* ignore */ }
        }
      }

      results.push(result);
    }

    return results;
  }

  renderHealthResults(results) {
    const container = this.container?.querySelector('#ds-health-results');
    if (!container) return;
    container.innerHTML = '';

    // Summary
    const passCount = results.filter(r => r.readOk && r.writeOk).length;
    const totalCount = results.length;
    const allPassed = passCount === totalCount;

    const summaryCard = createElement('div', '', {
      class: 'ds-health-summary ' + (allPassed ? 'ds-health-summary--pass' : 'ds-health-summary--fail')
    });

    const summaryIcon = createElement('div', '', { class: 'ds-health-summary-icon', 'aria-hidden': 'true' });
    if (allPassed) {
      summaryIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else {
      summaryIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }
    summaryCard.appendChild(summaryIcon);

    const summaryText = createElement('div', '', { class: 'ds-health-summary-text' });
    summaryText.appendChild(createElement('h3', allPassed ? 'All Systems Healthy' : 'Issues Detected', { class: 'ds-health-summary-title' }));
    summaryText.appendChild(createElement('p', passCount + ' of ' + totalCount + ' stores passed all checks', { class: 'ds-health-summary-detail' }));
    summaryCard.appendChild(summaryText);
    container.appendChild(summaryCard);

    // Individual results
    const table = createElement('table', '', { class: 'ds-health-table' });
    const thead = createElement('thead', '', {});
    const headRow = createElement('tr', '', {});
    headRow.appendChild(createElement('th', 'Store', {}));
    headRow.appendChild(createElement('th', 'Records', {}));
    headRow.appendChild(createElement('th', 'Read', {}));
    headRow.appendChild(createElement('th', 'Write', {}));
    headRow.appendChild(createElement('th', 'Status', {}));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = createElement('tbody', '', {});
    for (const result of results) {
      const tr = createElement('tr', '', {});
      tr.appendChild(createElement('td', result.label, {}));
      tr.appendChild(createElement('td', result.count >= 0 ? String(result.count) : 'N/A', {}));

      const readTd = createElement('td', '', {});
      readTd.appendChild(createElement('span', result.readOk ? 'Pass' : 'Fail', {
        class: 'ds-check-badge ' + (result.readOk ? 'ds-check-badge--pass' : 'ds-check-badge--fail')
      }));
      tr.appendChild(readTd);

      const writeTd = createElement('td', '', {});
      writeTd.appendChild(createElement('span', result.writeOk ? 'Pass' : 'Fail', {
        class: 'ds-check-badge ' + (result.writeOk ? 'ds-check-badge--pass' : 'ds-check-badge--fail')
      }));
      tr.appendChild(writeTd);

      const statusTd = createElement('td', '', {});
      const passed = result.readOk && result.writeOk;
      if (passed) {
        statusTd.appendChild(createElement('span', 'Healthy', { class: 'ds-check-badge ds-check-badge--pass' }));
      } else {
        const errSpan = createElement('span', result.error || 'Check failed', { class: 'ds-health-error-text' });
        statusTd.appendChild(errSpan);
      }
      tr.appendChild(statusTd);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);

    // Storage info
    if (this.storageInfo) {
      const storageNote = createElement('div', '', { class: 'ds-health-storage-note' });
      storageNote.appendChild(createElement('p', 'Storage: ' + formatFileSize(this.storageInfo.usage) + ' used of ' + formatFileSize(this.storageInfo.quota) + ' (' + this.storageInfo.percentage.toFixed(1) + '%)', { class: 'ds-health-storage-text' }));
      if (!this.storageInfo.available) {
        storageNote.appendChild(createElement('p', 'Warning: Storage is nearly full. Consider exporting and deleting old data.', { class: 'ds-health-storage-warn' }));
      }
      container.appendChild(storageNote);
    }

    // Re-run button
    const rerunRow = createElement('div', '', { class: 'ds-health-rerun' });
    const rerunBtn = createElement('button', 'Run Again', { class: 'btn btn-outline btn-sm', type: 'button' });
    this.addListener(rerunBtn, 'click', () => this.runHealthCheck());
    rerunRow.appendChild(rerunBtn);
    container.appendChild(rerunRow);
  }
}

