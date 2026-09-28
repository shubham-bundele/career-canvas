/**
 * Document Package Studio Module
 * Create and manage application packages that bundle resumes,
 * cover letters, and reference sheets for specific job applications.
 */

import { createElement, sanitizeInput } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';

const STORAGE_KEY = 'cc_packages';

/**
 * Document type labels for display
 */
const DOC_TYPE_LABELS = {
  resume: 'Resume',
  cv: 'CV',
  coverLetter: 'Cover Letter',
  referenceSheet: 'References',
  portfolio: 'Portfolio',
  onePager: 'One Pager'
};

/**
 * Document type icons for display
 */
const DOC_TYPE_ICONS = {
  resume: '\u{1F4C4}',
  cv: '\u{1F4CB}',
  coverLetter: '✉️',
  referenceSheet: '\u{1F4C7}',
  portfolio: '\u{1F4BC}',
  onePager: '\u{1F4DD}'
};

/**
 * PackageStudio class
 */
export class PackageStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];
    this.packages = [];
    this.editingPackageId = null;
    this.availableDocuments = [];
  }

  /**
   * Registers an event listener and tracks it for cleanup
   * @param {HTMLElement} el - Element to attach listener to
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  addListener(el, event, handler) {
    this.listeners.push({ element: el, event, handler });
    el.addEventListener(event, handler);
  }

  /**
   * Removes all registered event listeners and clears the container
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
  }

  /**
   * Loads packages from localStorage
   */
  loadPackages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.packages = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load packages:', e);
      this.packages = [];
    }
  }

  /**
   * Saves packages to localStorage
   */
  savePackages() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.packages));
    } catch (e) {
      console.error('Failed to save packages:', e);
      if (window.CC && window.CC.toast) {
        window.CC.toast.show('Failed to save packages', 'error');
      }
    }
  }

  /**
   * Loads available documents from IndexedDB
   */
  async loadDocuments() {
    try {
      this.availableDocuments = await this.db.getAll('documents') || [];
    } catch (e) {
      console.error('Failed to load documents:', e);
      this.availableDocuments = [];
    }
  }

  /**
   * Renders the module and returns the container element
   * @returns {HTMLElement} Container element
   */
  async render() {
    this.container = createElement('div', '', { class: 'package-studio-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Document Package Studio');

    this.loadPackages();
    await this.loadDocuments();

    if (this.editingPackageId) {
      this.renderPackageEditor();
    } else {
      this.renderPackageList();
    }

    return this.container;
  }

  /**
   * Re-renders the current view in place
   */
  async refresh() {
    if (!this.container) return;

    // Remove old listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    this.container.innerHTML = '';
    await this.loadDocuments();

    if (this.editingPackageId) {
      this.renderPackageEditor();
    } else {
      this.renderPackageList();
    }
  }

  // ---------------------------------------------------------------------------
  // Package List View
  // ---------------------------------------------------------------------------

  /**
   * Renders the main package list view
   */
  renderPackageList() {
    // Breadcrumb navigation
    const breadcrumb = createElement('nav', '', {
      class: 'package-studio-breadcrumb',
      'aria-label': 'Breadcrumb'
    });
    const breadcrumbList = createElement('ol', '', { class: 'breadcrumb-list' });

    const dashboardCrumb = createElement('li', '', { class: 'breadcrumb-item' });
    const dashboardLink = createElement('button', 'Dashboard', {
      class: 'breadcrumb-link',
      type: 'button'
    });
    this.addListener(dashboardLink, 'click', () => {
      if (window.CC && window.CC.router) {
        window.CC.router.navigate('/dashboard');
      }
    });
    dashboardCrumb.appendChild(dashboardLink);
    breadcrumbList.appendChild(dashboardCrumb);

    const separator = createElement('li', '›', {
      class: 'breadcrumb-separator',
      'aria-hidden': 'true'
    });
    breadcrumbList.appendChild(separator);

    const currentCrumb = createElement('li', 'Document Packages', {
      class: 'breadcrumb-item breadcrumb-current',
      'aria-current': 'page'
    });
    breadcrumbList.appendChild(currentCrumb);

    breadcrumb.appendChild(breadcrumbList);
    this.container.appendChild(breadcrumb);

    // Header
    const header = createElement('div', '', { class: 'package-studio-header' });

    const headerLeft = createElement('div', '', { class: 'package-studio-header-left' });
    const title = createElement('h1', 'Document Package Studio', {
      class: 'package-studio-title'
    });
    headerLeft.appendChild(title);

    const subtitle = createElement('p', 'Bundle your resumes, cover letters, and references into organized application packages for specific companies and roles.', {
      class: 'package-studio-subtitle'
    });
    headerLeft.appendChild(subtitle);
    header.appendChild(headerLeft);

    const headerActions = createElement('div', '', { class: 'package-studio-header-actions' });

    const backBtn = createElement('button', '← Back to Dashboard', {
      class: 'btn btn-outline btn-sm',
      type: 'button',
      'aria-label': 'Back to Dashboard'
    });
    this.addListener(backBtn, 'click', () => {
      if (window.CC && window.CC.router) {
        window.CC.router.navigate('/dashboard');
      }
    });
    headerActions.appendChild(backBtn);

    const createBtn = createElement('button', '+ New Package', {
      class: 'btn btn-primary btn-sm',
      type: 'button',
      'aria-label': 'Create new document package'
    });
    this.addListener(createBtn, 'click', () => this.showCreatePackageForm());
    headerActions.appendChild(createBtn);

    header.appendChild(headerActions);
    this.container.appendChild(header);

    // Package cards or empty state
    if (this.packages.length === 0) {
      this.container.appendChild(this.renderEmptyState());
    } else {
      const grid = createElement('div', '', {
        class: 'package-studio-grid',
        role: 'list',
        'aria-label': 'Document packages'
      });

      this.packages.forEach(pkg => {
        grid.appendChild(this.renderPackageCard(pkg));
      });

      this.container.appendChild(grid);
    }
  }

  /**
   * Renders the empty state when no packages exist
   * @returns {HTMLElement} Empty state element
   */
  renderEmptyState() {
    const empty = createElement('div', '', {
      class: 'package-studio-empty',
      role: 'status'
    });

    const icon = createElement('div', '\u{1F4E6}', { class: 'package-studio-empty-icon' });
    empty.appendChild(icon);

    const emptyTitle = createElement('h2', 'No packages yet', {
      class: 'package-studio-empty-title'
    });
    empty.appendChild(emptyTitle);

    const emptyMsg = createElement('p', 'Create your first document package to bundle resumes, cover letters, and references for a specific job application.', {
      class: 'package-studio-empty-message'
    });
    empty.appendChild(emptyMsg);

    const createBtn = createElement('button', 'Create First Package', {
      class: 'btn btn-primary',
      type: 'button'
    });
    this.addListener(createBtn, 'click', () => this.showCreatePackageForm());
    empty.appendChild(createBtn);

    return empty;
  }

  /**
   * Renders a single package card
   * @param {Object} pkg - Package object
   * @returns {HTMLElement} Card element
   */
  renderPackageCard(pkg) {
    const card = createElement('div', '', {
      class: 'package-studio-card',
      role: 'listitem',
      tabindex: '0',
      'aria-label': `Package: ${pkg.name || 'Untitled'}`
    });

    // Card header with name
    const cardHeader = createElement('div', '', { class: 'package-studio-card-header' });
    const cardName = createElement('h3', pkg.name || 'Untitled Package', {
      class: 'package-studio-card-name'
    });
    cardHeader.appendChild(cardName);
    card.appendChild(cardHeader);

    // Company and role
    if (pkg.targetCompany || pkg.targetRole) {
      const details = createElement('div', '', { class: 'package-studio-card-details' });

      if (pkg.targetCompany) {
        const company = createElement('span', pkg.targetCompany, {
          class: 'package-studio-card-company'
        });
        details.appendChild(company);
      }

      if (pkg.targetCompany && pkg.targetRole) {
        const divider = createElement('span', ' — ', {
          class: 'package-studio-card-divider'
        });
        details.appendChild(divider);
      }

      if (pkg.targetRole) {
        const role = createElement('span', pkg.targetRole, {
          class: 'package-studio-card-role'
        });
        details.appendChild(role);
      }

      card.appendChild(details);
    }

    // Document count
    const itemCount = (pkg.items || []).length;
    const countText = itemCount === 1 ? '1 document' : `${itemCount} documents`;
    const count = createElement('p', countText, {
      class: 'package-studio-card-count'
    });
    card.appendChild(count);

    // Document type badges
    if (itemCount > 0) {
      const badges = createElement('div', '', { class: 'package-studio-card-badges' });
      const typesSeen = new Set();
      pkg.items.forEach(item => {
        if (!typesSeen.has(item.docType)) {
          typesSeen.add(item.docType);
          const iconChar = DOC_TYPE_ICONS[item.docType] || '\u{1F4C4}';
          const label = DOC_TYPE_LABELS[item.docType] || 'Document';
          const badge = createElement('span', `${iconChar} ${label}`, {
            class: 'package-studio-badge'
          });
          badges.appendChild(badge);
        }
      });
      card.appendChild(badges);
    }

    // Updated timestamp
    const updatedDate = pkg.updatedAt ? new Date(pkg.updatedAt) : new Date(pkg.createdAt);
    const dateStr = updatedDate.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const meta = createElement('p', `Updated ${dateStr}`, {
      class: 'package-studio-card-meta'
    });
    card.appendChild(meta);

    // Action buttons
    const actions = createElement('div', '', { class: 'package-studio-card-actions' });

    const editBtn = createElement('button', 'Edit', {
      class: 'btn btn-sm btn-outline',
      type: 'button',
      'aria-label': `Edit package ${pkg.name || 'Untitled'}`
    });
    this.addListener(editBtn, 'click', (e) => {
      e.stopPropagation();
      this.editPackage(pkg.id);
    });
    actions.appendChild(editBtn);

    const dupeBtn = createElement('button', 'Duplicate', {
      class: 'btn btn-sm btn-outline',
      type: 'button',
      'aria-label': `Duplicate package ${pkg.name || 'Untitled'}`
    });
    this.addListener(dupeBtn, 'click', (e) => {
      e.stopPropagation();
      this.duplicatePackage(pkg.id);
    });
    actions.appendChild(dupeBtn);

    const exportBtn = createElement('button', 'Export', {
      class: 'btn btn-sm btn-outline',
      type: 'button',
      'aria-label': `Export package ${pkg.name || 'Untitled'} manifest`
    });
    this.addListener(exportBtn, 'click', (e) => {
      e.stopPropagation();
      this.exportPackageManifest(pkg.id);
    });
    actions.appendChild(exportBtn);

    const deleteBtn = createElement('button', 'Delete', {
      class: 'btn btn-sm btn-danger',
      type: 'button',
      'aria-label': `Delete package ${pkg.name || 'Untitled'}`
    });
    this.addListener(deleteBtn, 'click', (e) => {
      e.stopPropagation();
      this.deletePackage(pkg.id);
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);

    // Click card to edit
    this.addListener(card, 'click', (e) => {
      if (!e.target.closest('.package-studio-card-actions')) {
        this.editPackage(pkg.id);
      }
    });

    // Keyboard: Enter/Space to edit
    this.addListener(card, 'keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) {
        e.preventDefault();
        this.editPackage(pkg.id);
      }
    });

    return card;
  }

  // ---------------------------------------------------------------------------
  // Create / Edit Package Form (via modal)
  // ---------------------------------------------------------------------------

  /**
   * Shows the create package modal form
   */
  showCreatePackageForm() {
    this.showPackageFormModal(null);
  }

  /**
   * Shows the edit package info modal form
   * @param {Object} pkg - Existing package to edit
   */
  showEditPackageInfoForm(pkg) {
    this.showPackageFormModal(pkg);
  }

  /**
   * Renders and shows the package name/company/role form in a modal
   * @param {Object|null} existing - Existing package or null for new
   */
  showPackageFormModal(existing) {
    const isEdit = !!existing;
    const pkg = existing || {
      name: '',
      targetCompany: '',
      targetRole: ''
    };

    const form = createElement('div', '', { class: 'package-form' });

    // Name field
    const nameGroup = createElement('div', '', { class: 'form-group mb-3' });
    const nameLabel = createElement('label', 'Package Name *', {
      class: 'form-label',
      for: 'pkg-name'
    });
    nameGroup.appendChild(nameLabel);
    const nameInput = createElement('input', '', {
      class: 'form-input',
      type: 'text',
      id: 'pkg-name',
      maxlength: '100',
      placeholder: 'e.g., Google SWE Application'
    });
    nameInput.value = pkg.name;
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    // Company field
    const companyGroup = createElement('div', '', { class: 'form-group mb-3' });
    const companyLabel = createElement('label', 'Target Company', {
      class: 'form-label',
      for: 'pkg-company'
    });
    companyGroup.appendChild(companyLabel);
    const companyInput = createElement('input', '', {
      class: 'form-input',
      type: 'text',
      id: 'pkg-company',
      maxlength: '100',
      placeholder: 'e.g., Google'
    });
    companyInput.value = pkg.targetCompany;
    companyGroup.appendChild(companyInput);
    form.appendChild(companyGroup);

    // Role field
    const roleGroup = createElement('div', '', { class: 'form-group mb-3' });
    const roleLabel = createElement('label', 'Target Role', {
      class: 'form-label',
      for: 'pkg-role'
    });
    roleGroup.appendChild(roleLabel);
    const roleInput = createElement('input', '', {
      class: 'form-input',
      type: 'text',
      id: 'pkg-role',
      maxlength: '100',
      placeholder: 'e.g., Senior Software Engineer'
    });
    roleInput.value = pkg.targetRole;
    roleGroup.appendChild(roleInput);
    form.appendChild(roleGroup);

    if (window.CC && window.CC.modal) {
      window.CC.modal.show({
        title: isEdit ? 'Edit Package Details' : 'Create New Package',
        body: form,
        size: 'small',
        actions: [
          {
            label: 'Cancel',
            type: 'secondary',
            handler: () => {
              window.CC.modal.close();
            }
          },
          {
            label: isEdit ? 'Save Changes' : 'Create Package',
            type: 'primary',
            handler: async () => {
              const name = nameInput.value.trim();
              if (!name) {
                if (window.CC.toast) {
                  window.CC.toast.show('Package name is required', 'error');
                }
                return false;
              }

              const sanitizedName = sanitizeInput(name, 100);
              const sanitizedCompany = sanitizeInput(companyInput.value.trim(), 100);
              const sanitizedRole = sanitizeInput(roleInput.value.trim(), 100);

              if (isEdit) {
                const idx = this.packages.findIndex(p => p.id === existing.id);
                if (idx !== -1) {
                  this.packages[idx].name = sanitizedName;
                  this.packages[idx].targetCompany = sanitizedCompany;
                  this.packages[idx].targetRole = sanitizedRole;
                  this.packages[idx].updatedAt = new Date().toISOString();
                  this.savePackages();
                }
              } else {
                const newPkg = {
                  id: generateUUID(),
                  name: sanitizedName,
                  targetCompany: sanitizedCompany,
                  targetRole: sanitizedRole,
                  items: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                this.packages.push(newPkg);
                this.savePackages();
              }

              window.CC.modal.close();
              await this.refresh();

              if (window.CC.toast) {
                window.CC.toast.show(
                  isEdit ? 'Package updated' : 'Package created',
                  'success'
                );
              }
              return true;
            }
          }
        ]
      });
      setTimeout(() => nameInput.focus(), 100);
    }
  }

  // ---------------------------------------------------------------------------
  // Package Editor View
  // ---------------------------------------------------------------------------

  /**
   * Enters the package editor view for a given package
   * @param {string} packageId - Package ID to edit
   */
  async editPackage(packageId) {
    this.editingPackageId = packageId;
    await this.refresh();
  }

  /**
   * Returns to the package list view
   */
  async returnToList() {
    this.editingPackageId = null;
    await this.refresh();
  }

  /**
   * Renders the package editor view (document selection, reorder, manifest)
   */
  renderPackageEditor() {
    const pkg = this.packages.find(p => p.id === this.editingPackageId);
    if (!pkg) {
      this.editingPackageId = null;
      this.renderPackageList();
      return;
    }

    // Breadcrumb
    const breadcrumb = createElement('nav', '', {
      class: 'package-studio-breadcrumb',
      'aria-label': 'Breadcrumb'
    });
    const breadcrumbList = createElement('ol', '', { class: 'breadcrumb-list' });

    const dashboardCrumb = createElement('li', '', { class: 'breadcrumb-item' });
    const dashboardLink = createElement('button', 'Dashboard', {
      class: 'breadcrumb-link',
      type: 'button'
    });
    this.addListener(dashboardLink, 'click', () => {
      if (window.CC && window.CC.router) {
        window.CC.router.navigate('/dashboard');
      }
    });
    dashboardCrumb.appendChild(dashboardLink);
    breadcrumbList.appendChild(dashboardCrumb);

    const sep1 = createElement('li', '›', {
      class: 'breadcrumb-separator',
      'aria-hidden': 'true'
    });
    breadcrumbList.appendChild(sep1);

    const packagesCrumb = createElement('li', '', { class: 'breadcrumb-item' });
    const packagesLink = createElement('button', 'Document Packages', {
      class: 'breadcrumb-link',
      type: 'button'
    });
    this.addListener(packagesLink, 'click', () => this.returnToList());
    packagesCrumb.appendChild(packagesLink);
    breadcrumbList.appendChild(packagesCrumb);

    const sep2 = createElement('li', '›', {
      class: 'breadcrumb-separator',
      'aria-hidden': 'true'
    });
    breadcrumbList.appendChild(sep2);

    const currentCrumb = createElement('li', pkg.name || 'Untitled', {
      class: 'breadcrumb-item breadcrumb-current',
      'aria-current': 'page'
    });
    breadcrumbList.appendChild(currentCrumb);

    breadcrumb.appendChild(breadcrumbList);
    this.container.appendChild(breadcrumb);

    // Header
    const header = createElement('div', '', { class: 'package-studio-editor-header' });

    const headerLeft = createElement('div', '', { class: 'package-studio-header-left' });
    const title = createElement('h1', pkg.name || 'Untitled Package', {
      class: 'package-studio-title'
    });
    headerLeft.appendChild(title);

    if (pkg.targetCompany || pkg.targetRole) {
      const subParts = [];
      if (pkg.targetCompany) subParts.push(pkg.targetCompany);
      if (pkg.targetRole) subParts.push(pkg.targetRole);
      const subtitle = createElement('p', subParts.join(' — '), {
        class: 'package-studio-subtitle'
      });
      headerLeft.appendChild(subtitle);
    }

    header.appendChild(headerLeft);

    const headerActions = createElement('div', '', { class: 'package-studio-header-actions' });

    const backBtn = createElement('button', '← Back to Packages', {
      class: 'btn btn-outline btn-sm',
      type: 'button',
      'aria-label': 'Back to package list'
    });
    this.addListener(backBtn, 'click', () => this.returnToList());
    headerActions.appendChild(backBtn);

    const editInfoBtn = createElement('button', 'Edit Details', {
      class: 'btn btn-outline btn-sm',
      type: 'button',
      'aria-label': 'Edit package details'
    });
    this.addListener(editInfoBtn, 'click', () => this.showEditPackageInfoForm(pkg));
    headerActions.appendChild(editInfoBtn);

    const exportBtn = createElement('button', 'Export Manifest', {
      class: 'btn btn-outline btn-sm',
      type: 'button',
      'aria-label': 'Export package manifest as JSON'
    });
    this.addListener(exportBtn, 'click', () => this.exportPackageManifest(pkg.id));
    headerActions.appendChild(exportBtn);

    header.appendChild(headerActions);
    this.container.appendChild(header);

    // Two-column layout: document selection + selected items
    const editorBody = createElement('div', '', { class: 'package-studio-editor-body' });

    // Left: Available documents
    const availablePanel = this.renderAvailableDocumentsPanel(pkg);
    editorBody.appendChild(availablePanel);

    // Right: Selected items with reorder/remove + manifest preview
    const selectedPanel = this.renderSelectedItemsPanel(pkg);
    editorBody.appendChild(selectedPanel);

    this.container.appendChild(editorBody);

    // Manifest preview
    const manifestPanel = this.renderManifestPreview(pkg);
    this.container.appendChild(manifestPanel);
  }

  /**
   * Renders the available documents selection panel
   * @param {Object} pkg - Current package
   * @returns {HTMLElement} Panel element
   */
  renderAvailableDocumentsPanel(pkg) {
    const panel = createElement('div', '', {
      class: 'package-studio-panel package-studio-available',
      role: 'region',
      'aria-label': 'Available documents'
    });

    const panelTitle = createElement('h2', 'Available Documents', {
      class: 'package-studio-panel-title'
    });
    panel.appendChild(panelTitle);

    const panelDesc = createElement('p', 'Click a document to add it to this package.', {
      class: 'package-studio-panel-desc'
    });
    panel.appendChild(panelDesc);

    // Already-added doc IDs for quick lookup
    const addedIds = new Set((pkg.items || []).map(item => item.docId));

    if (this.availableDocuments.length === 0) {
      const noDocsMsg = createElement('p', 'No documents found. Create a resume, cover letter, or reference sheet first.', {
        class: 'package-studio-no-docs'
      });
      panel.appendChild(noDocsMsg);
      return panel;
    }

    const docList = createElement('ul', '', {
      class: 'package-studio-doc-list',
      role: 'list',
      'aria-label': 'Available documents to add'
    });

    this.availableDocuments.forEach(doc => {
      const isAdded = addedIds.has(doc.id);
      const li = createElement('li', '', {
        class: `package-studio-doc-item ${isAdded ? 'package-studio-doc-added' : ''}`,
        role: 'listitem',
        tabindex: '0',
        'aria-label': `${doc.name || 'Untitled'} - ${DOC_TYPE_LABELS[doc.type] || 'Document'}${isAdded ? ' (already added)' : ''}`
      });

      const icon = createElement('span', DOC_TYPE_ICONS[doc.type] || '\u{1F4C4}', {
        class: 'package-studio-doc-icon',
        'aria-hidden': 'true'
      });
      li.appendChild(icon);

      const info = createElement('div', '', { class: 'package-studio-doc-info' });
      const docName = createElement('span', doc.name || 'Untitled', {
        class: 'package-studio-doc-name'
      });
      info.appendChild(docName);

      const docType = createElement('span', DOC_TYPE_LABELS[doc.type] || 'Document', {
        class: 'package-studio-doc-type'
      });
      info.appendChild(docType);
      li.appendChild(info);

      if (isAdded) {
        const addedBadge = createElement('span', 'Added', {
          class: 'package-studio-doc-added-badge'
        });
        li.appendChild(addedBadge);
      } else {
        const addBtn = createElement('button', '+ Add', {
          class: 'btn btn-sm btn-primary',
          type: 'button',
          'aria-label': `Add ${doc.name || 'Untitled'} to package`
        });
        this.addListener(addBtn, 'click', (e) => {
          e.stopPropagation();
          this.addDocumentToPackage(pkg.id, doc);
        });
        li.appendChild(addBtn);
      }

      // Keyboard support on list item
      this.addListener(li, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isAdded) {
            this.addDocumentToPackage(pkg.id, doc);
          }
        }
      });

      docList.appendChild(li);
    });

    panel.appendChild(docList);
    return panel;
  }

  /**
   * Renders the selected items panel with reorder and remove controls
   * @param {Object} pkg - Current package
   * @returns {HTMLElement} Panel element
   */
  renderSelectedItemsPanel(pkg) {
    const panel = createElement('div', '', {
      class: 'package-studio-panel package-studio-selected',
      role: 'region',
      'aria-label': 'Selected documents in package'
    });

    const panelTitle = createElement('h2', 'Package Contents', {
      class: 'package-studio-panel-title'
    });
    panel.appendChild(panelTitle);

    const items = pkg.items || [];

    if (items.length === 0) {
      const emptyMsg = createElement('p', 'No documents in this package yet. Select documents from the left panel to add them.', {
        class: 'package-studio-selected-empty'
      });
      panel.appendChild(emptyMsg);
      return panel;
    }

    const countText = items.length === 1 ? '1 document' : `${items.length} documents`;
    const countEl = createElement('p', countText, {
      class: 'package-studio-selected-count'
    });
    panel.appendChild(countEl);

    const itemList = createElement('ol', '', {
      class: 'package-studio-item-list',
      role: 'list',
      'aria-label': 'Package items in order'
    });

    items.forEach((item, index) => {
      const li = createElement('li', '', {
        class: 'package-studio-item',
        role: 'listitem',
        'aria-label': `${index + 1}. ${item.docName || 'Untitled'}`
      });

      // Order number
      const orderNum = createElement('span', String(index + 1), {
        class: 'package-studio-item-order'
      });
      li.appendChild(orderNum);

      // Document icon and info
      const icon = createElement('span', DOC_TYPE_ICONS[item.docType] || '\u{1F4C4}', {
        class: 'package-studio-item-icon',
        'aria-hidden': 'true'
      });
      li.appendChild(icon);

      const info = createElement('div', '', { class: 'package-studio-item-info' });
      const itemName = createElement('span', item.docName || 'Untitled', {
        class: 'package-studio-item-name'
      });
      info.appendChild(itemName);

      const itemType = createElement('span', DOC_TYPE_LABELS[item.docType] || 'Document', {
        class: 'package-studio-item-type'
      });
      info.appendChild(itemType);
      li.appendChild(info);

      // Reorder and remove buttons
      const controls = createElement('div', '', { class: 'package-studio-item-controls' });

      // Move up
      const moveUpBtn = createElement('button', '↑', {
        class: 'btn btn-sm btn-ghost',
        type: 'button',
        'aria-label': `Move ${item.docName || 'Untitled'} up`,
        ...(index === 0 ? { disabled: 'true' } : {})
      });
      this.addListener(moveUpBtn, 'click', (e) => {
        e.stopPropagation();
        this.moveItemInPackage(pkg.id, index, -1);
      });
      controls.appendChild(moveUpBtn);

      // Move down
      const moveDownBtn = createElement('button', '↓', {
        class: 'btn btn-sm btn-ghost',
        type: 'button',
        'aria-label': `Move ${item.docName || 'Untitled'} down`,
        ...(index === items.length - 1 ? { disabled: 'true' } : {})
      });
      this.addListener(moveDownBtn, 'click', (e) => {
        e.stopPropagation();
        this.moveItemInPackage(pkg.id, index, 1);
      });
      controls.appendChild(moveDownBtn);

      // Remove
      const removeBtn = createElement('button', '✕', {
        class: 'btn btn-sm btn-danger',
        type: 'button',
        'aria-label': `Remove ${item.docName || 'Untitled'} from package`
      });
      this.addListener(removeBtn, 'click', (e) => {
        e.stopPropagation();
        this.removeItemFromPackage(pkg.id, index);
      });
      controls.appendChild(removeBtn);

      li.appendChild(controls);
      itemList.appendChild(li);
    });

    panel.appendChild(itemList);
    return panel;
  }

  /**
   * Renders the package manifest preview
   * @param {Object} pkg - Current package
   * @returns {HTMLElement} Manifest preview element
   */
  renderManifestPreview(pkg) {
    const panel = createElement('div', '', {
      class: 'package-studio-manifest',
      role: 'region',
      'aria-label': 'Package manifest preview'
    });

    const panelHeader = createElement('div', '', { class: 'package-studio-manifest-header' });
    const panelTitle = createElement('h2', 'Package Manifest', {
      class: 'package-studio-panel-title'
    });
    panelHeader.appendChild(panelTitle);

    const exportManifestBtn = createElement('button', 'Download JSON', {
      class: 'btn btn-sm btn-outline',
      type: 'button',
      'aria-label': 'Download package manifest as JSON file'
    });
    this.addListener(exportManifestBtn, 'click', () => this.exportPackageManifest(pkg.id));
    panelHeader.appendChild(exportManifestBtn);

    panel.appendChild(panelHeader);

    // Build manifest data
    const manifest = this.buildManifest(pkg);
    const manifestJson = JSON.stringify(manifest, null, 2);

    const pre = createElement('pre', '', {
      class: 'package-studio-manifest-code',
      tabindex: '0',
      'aria-label': 'Package manifest JSON'
    });
    const code = createElement('code', manifestJson);
    pre.appendChild(code);
    panel.appendChild(pre);

    return panel;
  }

  // ---------------------------------------------------------------------------
  // Package Operations
  // ---------------------------------------------------------------------------

  /**
   * Adds a document to a package
   * @param {string} packageId - Target package ID
   * @param {Object} doc - Document object from IndexedDB
   */
  async addDocumentToPackage(packageId, doc) {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return;

    // Check if already added
    if (pkg.items.some(item => item.docId === doc.id)) {
      if (window.CC && window.CC.toast) {
        window.CC.toast.show('Document is already in this package', 'info');
      }
      return;
    }

    pkg.items.push({
      docId: doc.id,
      docName: doc.name || 'Untitled',
      docType: doc.type || 'resume',
      addedAt: new Date().toISOString()
    });
    pkg.updatedAt = new Date().toISOString();
    this.savePackages();

    if (window.CC && window.CC.toast) {
      window.CC.toast.show(`Added "${doc.name || 'Untitled'}" to package`, 'success');
    }

    await this.refresh();
  }

  /**
   * Removes an item from a package by index
   * @param {string} packageId - Package ID
   * @param {number} itemIndex - Index of item to remove
   */
  async removeItemFromPackage(packageId, itemIndex) {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg || itemIndex < 0 || itemIndex >= pkg.items.length) return;

    const removedName = pkg.items[itemIndex].docName || 'Untitled';
    pkg.items.splice(itemIndex, 1);
    pkg.updatedAt = new Date().toISOString();
    this.savePackages();

    if (window.CC && window.CC.toast) {
      window.CC.toast.show(`Removed "${removedName}" from package`, 'info');
    }

    await this.refresh();
  }

  /**
   * Moves an item within a package
   * @param {string} packageId - Package ID
   * @param {number} itemIndex - Current index of the item
   * @param {number} direction - Direction to move: -1 for up, +1 for down
   */
  async moveItemInPackage(packageId, itemIndex, direction) {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return;

    const newIndex = itemIndex + direction;
    if (newIndex < 0 || newIndex >= pkg.items.length) return;

    // Swap items
    const temp = pkg.items[itemIndex];
    pkg.items[itemIndex] = pkg.items[newIndex];
    pkg.items[newIndex] = temp;

    pkg.updatedAt = new Date().toISOString();
    this.savePackages();

    await this.refresh();
  }

  /**
   * Duplicates an existing package
   * @param {string} packageId - Package ID to duplicate
   */
  async duplicatePackage(packageId) {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return;

    const duplicate = {
      id: generateUUID(),
      name: `${pkg.name} (Copy)`,
      targetCompany: pkg.targetCompany,
      targetRole: pkg.targetRole,
      items: pkg.items.map(item => ({
        docId: item.docId,
        docName: item.docName,
        docType: item.docType,
        addedAt: new Date().toISOString()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.packages.push(duplicate);
    this.savePackages();

    if (window.CC && window.CC.toast) {
      window.CC.toast.show(`Duplicated package "${pkg.name}"`, 'success');
    }

    await this.refresh();
  }

  /**
   * Deletes a package after confirmation
   * @param {string} packageId - Package ID to delete
   */
  async deletePackage(packageId) {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return;

    const doDelete = async () => {
      this.packages = this.packages.filter(p => p.id !== packageId);
      this.savePackages();

      // If we are editing this package, return to list
      if (this.editingPackageId === packageId) {
        this.editingPackageId = null;
      }

      if (window.CC && window.CC.toast) {
        window.CC.toast.show(`Deleted package "${pkg.name}"`, 'info');
      }

      await this.refresh();
    };

    if (window.CC && window.CC.modal && window.CC.modal.confirm) {
      window.CC.modal.confirm(
        `Delete package "${pkg.name}"? This cannot be undone.`,
        doDelete
      );
    } else if (confirm(`Delete package "${pkg.name}"? This cannot be undone.`)) {
      await doDelete();
    }
  }

  /**
   * Builds a manifest object for a package
   * @param {Object} pkg - Package object
   * @returns {Object} Manifest data
   */
  buildManifest(pkg) {
    return {
      packageName: pkg.name,
      targetCompany: pkg.targetCompany || null,
      targetRole: pkg.targetRole || null,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      documentCount: (pkg.items || []).length,
      documents: (pkg.items || []).map((item, index) => ({
        order: index + 1,
        documentId: item.docId,
        documentName: item.docName,
        documentType: item.docType,
        typeLabel: DOC_TYPE_LABELS[item.docType] || 'Document',
        addedAt: item.addedAt
      }))
    };
  }

  /**
   * Exports a package manifest as a JSON file download
   * @param {string} packageId - Package ID to export
   */
  exportPackageManifest(packageId) {
    const pkg = this.packages.find(p => p.id === packageId);
    if (!pkg) return;

    const manifest = this.buildManifest(pkg);
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeName = (pkg.name || 'package').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}-manifest.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);

    if (window.CC && window.CC.toast) {
      window.CC.toast.show(`Exported manifest for "${pkg.name}"`, 'success');
    }
  }
}


