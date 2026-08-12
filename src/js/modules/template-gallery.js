/**
 * Template Studio Module
 * Production-quality template browsing, preview, comparison, and application
 */

import { createElement } from '../utils/sanitize.js';
import { EVENTS } from '../core/events.js';
import { createEmptyDocument } from '../core/schema.js';
import { sampleResumeData, sampleCoverLetterData, sampleReferenceData } from '../data/sample-data.js';

const FILTER_CATEGORIES = {
  ATS_FRIENDLY: 'atsLevelFriendly',
  PROFESSIONAL: 'categoryProfessional',
  TECHNICAL: 'categoryTechnical',
  CREATIVE: 'categoryCreative',
  STUDENT: 'categoryStudent',
  EXECUTIVE: 'categoryExecutive',
  ACADEMIC: 'categoryAcademic',
  ONE_COLUMN: 'columnOne',
  TWO_COLUMNS: 'columnTwo',
  PHOTO: 'photoYes',
  NO_PHOTO: 'photoNo',
  SERIF: 'fontSerif',
  SANS_SERIF: 'fontSansSerif'
};

const DOC_TYPE_TABS = [
  { key: 'resume', label: 'Resumes', docTypes: ['resume', 'cv'] },
  { key: 'cover-letter', label: 'Cover Letters', docTypes: ['cover-letter'] },
  { key: 'references', label: 'References', docTypes: ['references'] },
  { key: 'all', label: 'All Templates', docTypes: null }
];

function normalizeSampleData(data) {
  if (!data || !data.sections) return data;
  const clone = JSON.parse(JSON.stringify(data));
  for (const section of clone.sections) {
    if (!section.items) section.items = [];

    // Summary/objective sections: if content exists but items is empty, create an item
    const st = section.type || section.sectionType || '';
    if ((st.includes('ummary') || st.includes('bjective')) && section.content && section.items.length === 0) {
      section.items.push({ id: 'auto-1', content: section.content, included: true });
    }

    for (const item of section.items) {
      if (item.skills && typeof item.skills === 'string') {
        item.skills = item.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (item.achievements && Array.isArray(item.achievements)) {
        item.highlights = item.achievements.map(a =>
          typeof a === 'string' ? a : (a && a.text ? a.text : '')
        ).filter(Boolean);
      }
    }
  }
  return clone;
}

const normalizedResume = normalizeSampleData(sampleResumeData);
const normalizedCoverLetter = sampleCoverLetterData;
const normalizedReference = sampleReferenceData;

function getSampleForTemplate(template) {
  if (!template || !template.docTypes) return normalizedResume;
  if (template.docTypes.includes('cover-letter')) return normalizedCoverLetter;
  if (template.docTypes.includes('references')) return normalizedReference;
  return normalizedResume;
}

function getDocTypeForTemplate(template) {
  if (!template || !template.docTypes) return 'resume';
  if (template.docTypes.includes('cover-letter')) return 'cover-letter';
  if (template.docTypes.includes('references')) return 'references';
  return 'resume';
}

export class TemplateGallery {
  constructor(templateEngine, db, events) {
    this.templateEngine = templateEngine || (window.CC && window.CC.templateEngine);
    this.db = db || (window.CC && window.CC.db);
    this.events = events || (window.CC && window.CC.events);
    this.container = null;
    this.templates = [];
    this.filteredTemplates = [];
    this.searchQuery = '';
    this.activeFilters = new Set();
    this.activeDocType = 'resume';
    this.selectedTemplate = null;
    this.compareMode = false;
    this.compareTemplates = [];
    this.previewMode = 'sample';
    this.currentDocument = null;
    this.listeners = [];
    this.previewCache = new Map();
    this.modalEl = null;
    this.comparisonEl = null;
  }

  render(currentDocument = null) {
    this.currentDocument = currentDocument;
    this.templates = this.templateEngine ? this.templateEngine.getAll() : [];
    this.filteredTemplates = [...this.templates];
    this.applyDocTypeFilter();

    this.container = createElement('div', '', { class: 'template-gallery-container' });

    const header = this.renderHeader();
    this.container.appendChild(header);

    const mainContent = createElement('div', '', { class: 'template-gallery-main' });

    const sidebar = this.renderSidebar();
    mainContent.appendChild(sidebar);

    const gridContainer = createElement('div', '', { class: 'template-gallery-grid-container' });
    const grid = createElement('div', '', { class: 'template-gallery-grid', id: 'template-gallery-grid' });
    gridContainer.appendChild(grid);
    mainContent.appendChild(gridContainer);

    this.container.appendChild(mainContent);

    this.renderTemplates();
    this.loadFavorites();
    this.setupPreviewScaling();

    return this.container;
  }

  setupPreviewScaling() {
    requestAnimationFrame(() => {
      this.updatePreviewScales();
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updatePreviewScales();
      });
      const gridContainer = this.container.querySelector('.template-gallery-grid-container');
      if (gridContainer) {
        this.resizeObserver.observe(gridContainer);
      }
    }
  }

  updatePreviewScales() {
    if (!this.container) return;
    const previews = this.container.querySelectorAll('.template-gallery-preview');
    previews.forEach(preview => {
      const inner = preview.querySelector('.template-gallery-preview-inner');
      if (!inner) return;
      const cardWidth = preview.offsetWidth;
      if (cardWidth > 0) {
        const scale = cardWidth / 816;
        inner.style.transform = `scale(${scale})`;
        preview.style.height = `${1056 * scale}px`;
      }
    });
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'template-gallery-header' });

    const topRow = createElement('div', '', { class: 'template-gallery-header-top' });

    const titleArea = createElement('div', '', { class: 'template-gallery-title-area' });
    const title = createElement('h2', 'Template Studio', { class: 'template-gallery-title' });
    titleArea.appendChild(title);

    const count = this.templates.length;
    const subtitle = createElement('p', `${count} professionally designed templates`, {
      class: 'template-gallery-subtitle'
    });
    titleArea.appendChild(subtitle);
    topRow.appendChild(titleArea);
    header.appendChild(topRow);

    // Doc type tabs
    const tabBar = createElement('div', '', { class: 'template-gallery-tabs' });
    DOC_TYPE_TABS.forEach(tab => {
      const tabBtn = createElement('button', tab.label, {
        class: `template-gallery-tab${this.activeDocType === tab.key ? ' active' : ''}`,
        'data-tab': tab.key
      });
      const tabHandler = () => {
        this.activeDocType = tab.key;
        tabBar.querySelectorAll('.template-gallery-tab').forEach(t => t.classList.remove('active'));
        tabBtn.classList.add('active');
        this.applyDocTypeFilter();
        this.filterTemplates();
      };
      tabBtn.addEventListener('click', tabHandler);
      this.listeners.push({ element: tabBtn, event: 'click', handler: tabHandler });
      tabBar.appendChild(tabBtn);
    });
    header.appendChild(tabBar);

    // Search + controls row
    const controlsRow = createElement('div', '', { class: 'template-gallery-controls-row' });

    const searchInput = createElement('input', '', {
      class: 'template-gallery-search-input',
      type: 'text',
      placeholder: 'Search templates by name, style, or industry...',
      id: 'template-search-input'
    });
    const searchHandler = (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterTemplates();
    };
    searchInput.addEventListener('input', searchHandler);
    this.listeners.push({ element: searchInput, event: 'input', handler: searchHandler });
    controlsRow.appendChild(searchInput);

    const controls = createElement('div', '', { class: 'template-gallery-controls' });

    const compareToggle = createElement('button', 'Compare', {
      class: `template-gallery-btn${this.compareMode ? ' active' : ''}`,
      id: 'compare-mode-btn'
    });
    const compareHandler = () => {
      this.compareMode = !this.compareMode;
      this.compareTemplates = [];
      compareToggle.classList.toggle('active', this.compareMode);
      compareToggle.textContent = this.compareMode ? 'Exit Compare' : 'Compare';
      if (!this.compareMode && this.comparisonEl) {
        this.closeComparison();
      }
      this.renderTemplates();
    };
    compareToggle.addEventListener('click', compareHandler);
    this.listeners.push({ element: compareToggle, event: 'click', handler: compareHandler });
    controls.appendChild(compareToggle);

    controlsRow.appendChild(controls);
    header.appendChild(controlsRow);

    return header;
  }

  renderSidebar() {
    const sidebar = createElement('div', '', { class: 'template-gallery-sidebar' });

    const sidebarTitle = createElement('h3', 'Filters', { class: 'template-gallery-sidebar-title' });
    sidebar.appendChild(sidebarTitle);

    const clearBtn = createElement('button', 'Clear All Filters', {
      class: 'template-gallery-btn-secondary template-gallery-clear-filters'
    });
    const clearHandler = () => {
      this.activeFilters.clear();
      this.container.querySelectorAll('.template-filter-checkbox').forEach(cb => { cb.checked = false; });
      this.filterTemplates();
    };
    clearBtn.addEventListener('click', clearHandler);
    this.listeners.push({ element: clearBtn, event: 'click', handler: clearHandler });
    sidebar.appendChild(clearBtn);

    const filterGroups = [
      {
        title: 'Style',
        filters: [
          { id: FILTER_CATEGORIES.ATS_FRIENDLY, label: 'ATS-Friendly' },
          { id: FILTER_CATEGORIES.PROFESSIONAL, label: 'Professional' },
          { id: FILTER_CATEGORIES.TECHNICAL, label: 'Technical' },
          { id: FILTER_CATEGORIES.CREATIVE, label: 'Creative' }
        ]
      },
      {
        title: 'Experience Level',
        filters: [
          { id: FILTER_CATEGORIES.STUDENT, label: 'Student' },
          { id: FILTER_CATEGORIES.EXECUTIVE, label: 'Executive' },
          { id: FILTER_CATEGORIES.ACADEMIC, label: 'Academic' }
        ]
      },
      {
        title: 'Layout',
        filters: [
          { id: FILTER_CATEGORIES.ONE_COLUMN, label: 'One Column' },
          { id: FILTER_CATEGORIES.TWO_COLUMNS, label: 'Two Columns' }
        ]
      },
      {
        title: 'Photo',
        filters: [
          { id: FILTER_CATEGORIES.PHOTO, label: 'With Photo' },
          { id: FILTER_CATEGORIES.NO_PHOTO, label: 'No Photo' }
        ]
      },
      {
        title: 'Typography',
        filters: [
          { id: FILTER_CATEGORIES.SERIF, label: 'Serif' },
          { id: FILTER_CATEGORIES.SANS_SERIF, label: 'Sans Serif' }
        ]
      }
    ];

    filterGroups.forEach(group => {
      const groupEl = createElement('div', '', { class: 'template-filter-group' });
      const groupTitle = createElement('h4', group.title, { class: 'template-filter-group-title' });
      groupEl.appendChild(groupTitle);

      group.filters.forEach(filter => {
        const filterItem = createElement('label', '', { class: 'template-filter-item' });
        const checkbox = createElement('input', '', {
          class: 'template-filter-checkbox',
          type: 'checkbox',
          'data-filter': filter.id
        });
        const checkHandler = (e) => {
          if (e.target.checked) {
            this.activeFilters.add(filter.id);
          } else {
            this.activeFilters.delete(filter.id);
          }
          this.filterTemplates();
        };
        checkbox.addEventListener('change', checkHandler);
        this.listeners.push({ element: checkbox, event: 'change', handler: checkHandler });
        filterItem.appendChild(checkbox);
        const label = createElement('span', filter.label, { class: 'template-filter-label' });
        filterItem.appendChild(label);
        groupEl.appendChild(filterItem);
      });

      sidebar.appendChild(groupEl);
    });

    return sidebar;
  }

  applyDocTypeFilter() {
    const tab = DOC_TYPE_TABS.find(t => t.key === this.activeDocType);
    if (!tab || !tab.docTypes) {
      this.filteredTemplates = [...this.templates];
    } else {
      this.filteredTemplates = this.templates.filter(t =>
        t.docTypes && t.docTypes.some(dt => tab.docTypes.includes(dt))
      );
    }
  }

  filterTemplates() {
    this.applyDocTypeFilter();

    this.filteredTemplates = this.filteredTemplates.filter(template => {
      if (this.searchQuery) {
        const searchText = [
          template.name,
          template.description,
          template.category,
          ...(template.recommendedIndustries || []),
          ...(template.recommendedLevels || [])
        ].join(' ').toLowerCase();
        if (!searchText.includes(this.searchQuery)) return false;
      }

      if (this.activeFilters.size > 0) {
        let matches = true;
        this.activeFilters.forEach(filterId => {
          if (filterId.startsWith('atsLevel')) {
            if (template.atsLevel !== 'high') matches = false;
          } else if (filterId.startsWith('category')) {
            const category = filterId.replace('category', '').toLowerCase();
            if (template.category !== category) matches = false;
          } else if (filterId.startsWith('font')) {
            const wantSerif = filterId === 'fontSerif';
            const fontFamily = (template.fontFamily || (template.fontPresets && template.fontPresets[0] && template.fontPresets[0].fontFamily) || '').toLowerCase();
            const serifFonts = ['georgia', 'times', 'garamond', 'palatino', 'cambria', 'serif'];
            const isSerif = serifFonts.some(f => fontFamily.includes(f));
            if (wantSerif !== isSerif) matches = false;
          } else if (filterId.startsWith('column')) {
            const cols = filterId.includes('One') ? 1 : 2;
            if (template.columnCount !== cols) matches = false;
          } else if (filterId.startsWith('photo')) {
            const hasPhoto = filterId.includes('Yes');
            if (template.photoSupport !== hasPhoto) matches = false;
          }
        });
        if (!matches) return false;
      }

      return true;
    });

    this.renderTemplates();
  }

  renderTemplates() {
    const grid = this.container.querySelector('#template-gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (this.filteredTemplates.length === 0) {
      const empty = createElement('div', '', { class: 'template-gallery-empty' });
      empty.innerHTML = '<div class="template-gallery-empty-icon">&#128269;</div><div class="template-gallery-empty-text">No templates match your filters</div><div class="template-gallery-empty-hint">Try adjusting your filters or search terms</div>';
      grid.appendChild(empty);
      return;
    }

    const categories = this.groupByCategory(this.filteredTemplates);

    Object.entries(categories).forEach(([category, templates]) => {
      const categorySection = createElement('div', '', { class: 'template-gallery-category' });
      const categoryTitle = createElement('h3', '', { class: 'template-gallery-category-title' });
      categoryTitle.innerHTML = `${this.getCategoryIcon(category)} ${this.getCategoryLabel(category)} <span class="template-gallery-category-count">${templates.length}</span>`;
      categorySection.appendChild(categoryTitle);

      const categoryGrid = createElement('div', '', { class: 'template-gallery-category-grid' });

      templates.forEach(template => {
        const card = this.createTemplateCard(template);
        categoryGrid.appendChild(card);
      });

      categorySection.appendChild(categoryGrid);
      grid.appendChild(categorySection);
    });

    requestAnimationFrame(() => this.updatePreviewScales());
  }

  groupByCategory(templates) {
    const order = ['ats', 'professional', 'technical', 'creative', 'cover-letter', 'references', 'general'];
    const grouped = {};
    templates.forEach(template => {
      const category = template.category || 'general';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(template);
    });
    const sorted = {};
    order.forEach(cat => { if (grouped[cat]) sorted[cat] = grouped[cat]; });
    Object.keys(grouped).forEach(cat => { if (!sorted[cat]) sorted[cat] = grouped[cat]; });
    return sorted;
  }

  getCategoryLabel(category) {
    const labels = {
      ats: 'ATS-Optimized',
      professional: 'Professional',
      technical: 'Technical',
      creative: 'Creative',
      'cover-letter': 'Cover Letters',
      references: 'References',
      general: 'General'
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  getCategoryIcon(category) {
    const icons = {
      ats: '&#9989;',
      professional: '&#128188;',
      technical: '&#128187;',
      creative: '&#127912;',
      'cover-letter': '&#9993;',
      references: '&#128101;',
      general: '&#128196;'
    };
    return icons[category] || '&#128196;';
  }

  createTemplateCard(template) {
    const card = createElement('div', '', {
      class: `template-gallery-card${this.compareMode && this.compareTemplates.includes(template.id) ? ' selected' : ''}`,
      'data-template-id': template.id
    });

    // Real rendered preview
    const preview = createElement('div', '', { class: 'template-gallery-preview' });
    const previewInner = createElement('div', '', { class: 'template-gallery-preview-inner' });

    this.renderPreview(template, previewInner);
    preview.appendChild(previewInner);

    // Page size badges overlay
    if (template.supportedPageSizes && template.supportedPageSizes.length > 0) {
      const sizeBadge = createElement('div', template.supportedPageSizes.map(s => s.toUpperCase()).join(' / '), {
        class: 'template-gallery-size-badge'
      });
      preview.appendChild(sizeBadge);
    }

    card.appendChild(preview);

    // Template info
    const info = createElement('div', '', { class: 'template-gallery-info' });

    const name = createElement('h4', template.name, { class: 'template-gallery-name' });
    info.appendChild(name);

    const badges = createElement('div', '', { class: 'template-gallery-badges' });

    if (template.atsLevel === 'high') {
      const atsBadge = createElement('span', 'ATS', { class: 'template-gallery-badge badge-ats' });
      badges.appendChild(atsBadge);
    }

    if (template.columnCount > 1) {
      const colBadge = createElement('span', `${template.columnCount} Col`, { class: 'template-gallery-badge badge-columns' });
      badges.appendChild(colBadge);
    }

    if (template.photoSupport) {
      const photoBadge = createElement('span', 'Photo', { class: 'template-gallery-badge badge-photo' });
      badges.appendChild(photoBadge);
    }

    const docType = getDocTypeForTemplate(template);
    if (docType !== 'resume') {
      const typeBadge = createElement('span', docType === 'cover-letter' ? 'Cover Letter' : 'References', {
        class: 'template-gallery-badge badge-type'
      });
      badges.appendChild(typeBadge);
    }

    info.appendChild(badges);

    if (template.description) {
      const desc = createElement('p', template.description, { class: 'template-gallery-description' });
      info.appendChild(desc);
    }

    if (template.recommendedLevels && template.recommendedLevels.length > 0) {
      const levels = template.recommendedLevels.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ');
      const recommended = createElement('p', levels, { class: 'template-gallery-recommended' });
      info.appendChild(recommended);
    }

    card.appendChild(info);

    // Actions
    const actions = createElement('div', '', { class: 'template-gallery-actions' });

    const isFav = this.isFavorite(template.id);
    const favoriteBtn = createElement('button', isFav ? '★' : '☆', {
      class: `template-gallery-btn-icon${isFav ? ' is-favorited' : ''}`,
      'aria-label': 'Toggle favorite',
      title: 'Favorite'
    });
    const favoriteHandler = (e) => {
      e.stopPropagation();
      this.toggleFavorite(template.id);
      const nowFav = this.isFavorite(template.id);
      favoriteBtn.textContent = nowFav ? '★' : '☆';
      favoriteBtn.classList.toggle('is-favorited', nowFav);
    };
    favoriteBtn.addEventListener('click', favoriteHandler);
    this.listeners.push({ element: favoriteBtn, event: 'click', handler: favoriteHandler });
    actions.appendChild(favoriteBtn);

    const previewBtn = createElement('button', 'Preview', {
      class: 'template-gallery-btn-secondary-sm',
      title: 'Full preview'
    });
    const previewHandler = (e) => {
      e.stopPropagation();
      this.showPreviewModal(template);
    };
    previewBtn.addEventListener('click', previewHandler);
    this.listeners.push({ element: previewBtn, event: 'click', handler: previewHandler });
    actions.appendChild(previewBtn);

    const applyBtn = createElement('button', this.compareMode ? 'Select' : 'Use Template', {
      class: 'template-gallery-btn-primary'
    });
    const applyHandler = (e) => {
      e.stopPropagation();
      if (this.compareMode) {
        this.selectForCompare(template.id);
      } else {
        this.applyTemplate(template);
      }
    };
    applyBtn.addEventListener('click', applyHandler);
    this.listeners.push({ element: applyBtn, event: 'click', handler: applyHandler });
    actions.appendChild(applyBtn);

    card.appendChild(actions);

    const cardClickHandler = () => {
      if (this.compareMode) {
        this.selectForCompare(template.id);
      } else {
        this.showPreviewModal(template);
      }
    };
    card.addEventListener('click', cardClickHandler);
    this.listeners.push({ element: card, event: 'click', handler: cardClickHandler });

    return card;
  }

  renderPreview(template, container) {
    try {
      const sample = getSampleForTemplate(template);
      const html = this.templateEngine.render(template.id, sample, {});
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="template-gallery-preview-placeholder">${template.name.charAt(0)}</div>`;
    }
  }

  // ========== Preview Modal ==========

  showPreviewModal(template) {
    this.closePreviewModal();

    const overlay = createElement('div', '', { class: 'template-modal-overlay' });
    const modal = createElement('div', '', { class: 'template-modal' });

    // Modal header
    const modalHeader = createElement('div', '', { class: 'template-modal-header' });

    const modalTitle = createElement('div', '', { class: 'template-modal-title-area' });
    const modalName = createElement('h2', template.name, { class: 'template-modal-name' });
    modalTitle.appendChild(modalName);

    if (template.description) {
      const modalDesc = createElement('p', template.description, { class: 'template-modal-description' });
      modalTitle.appendChild(modalDesc);
    }
    modalHeader.appendChild(modalTitle);

    const modalActions = createElement('div', '', { class: 'template-modal-actions' });

    // Page size toggle
    const sizeToggle = createElement('div', '', { class: 'template-modal-size-toggle' });
    const sizes = template.supportedPageSizes || ['letter', 'a4'];
    let currentSize = sizes[0] || 'letter';

    sizes.forEach(size => {
      const sizeBtn = createElement('button', size.toUpperCase(), {
        class: `template-modal-size-btn${size === currentSize ? ' active' : ''}`
      });
      const sizeHandler = () => {
        currentSize = size;
        sizeToggle.querySelectorAll('.template-modal-size-btn').forEach(b => b.classList.remove('active'));
        sizeBtn.classList.add('active');
        previewContainer.className = `template-modal-preview template-modal-preview--${size}`;
      };
      sizeBtn.addEventListener('click', sizeHandler);
      this.listeners.push({ element: sizeBtn, event: 'click', handler: sizeHandler });
      sizeToggle.appendChild(sizeBtn);
    });
    modalActions.appendChild(sizeToggle);

    const useBtn = createElement('button', 'Use This Template', { class: 'template-gallery-btn-primary template-modal-use-btn' });
    const useHandler = () => {
      this.closePreviewModal();
      this.applyTemplate(template);
    };
    useBtn.addEventListener('click', useHandler);
    this.listeners.push({ element: useBtn, event: 'click', handler: useHandler });
    modalActions.appendChild(useBtn);

    const closeBtn = createElement('button', '×', { class: 'template-modal-close', 'aria-label': 'Close preview' });
    const closeHandler = () => this.closePreviewModal();
    closeBtn.addEventListener('click', closeHandler);
    this.listeners.push({ element: closeBtn, event: 'click', handler: closeHandler });
    modalActions.appendChild(closeBtn);

    modalHeader.appendChild(modalActions);
    modal.appendChild(modalHeader);

    // Modal body with preview and metadata
    const modalBody = createElement('div', '', { class: 'template-modal-body' });

    // Preview pane
    const previewContainer = createElement('div', '', {
      class: `template-modal-preview template-modal-preview--${currentSize}`
    });
    const previewPage = createElement('div', '', { class: 'template-modal-page' });

    try {
      const sample = getSampleForTemplate(template);
      previewPage.innerHTML = this.templateEngine.render(template.id, sample, {});
    } catch (err) {
      previewPage.innerHTML = `<div style="padding:40px;text-align:center;color:#999;">Preview unavailable</div>`;
    }
    previewContainer.appendChild(previewPage);
    modalBody.appendChild(previewContainer);

    // Metadata sidebar
    const metaSidebar = createElement('div', '', { class: 'template-modal-meta' });

    const metaGroups = [
      { label: 'Category', value: this.getCategoryLabel(template.category) },
      { label: 'ATS Level', value: (template.atsLevel || 'medium').charAt(0).toUpperCase() + (template.atsLevel || 'medium').slice(1) },
      { label: 'Layout', value: template.columnCount === 1 ? 'Single Column' : `${template.columnCount} Columns` },
      { label: 'Photo Support', value: template.photoSupport ? 'Yes' : 'No' },
      { label: 'Page Sizes', value: (template.supportedPageSizes || []).map(s => s.toUpperCase()).join(', ') },
      { label: 'Document Types', value: (template.docTypes || []).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') }
    ];

    if (template.recommendedIndustries && template.recommendedIndustries.length > 0) {
      metaGroups.push({ label: 'Industries', value: template.recommendedIndustries.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ') });
    }

    if (template.recommendedLevels && template.recommendedLevels.length > 0) {
      metaGroups.push({ label: 'Experience', value: template.recommendedLevels.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') });
    }

    metaGroups.forEach(({ label, value }) => {
      const row = createElement('div', '', { class: 'template-modal-meta-row' });
      const labelEl = createElement('span', label, { class: 'template-modal-meta-label' });
      const valueEl = createElement('span', value, { class: 'template-modal-meta-value' });
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      metaSidebar.appendChild(row);
    });

    // Color presets
    if (template.colorPresets && template.colorPresets.length > 0) {
      const colorSection = createElement('div', '', { class: 'template-modal-meta-section' });
      colorSection.appendChild(createElement('h4', 'Color Presets', { class: 'template-modal-meta-heading' }));
      const colorRow = createElement('div', '', { class: 'template-modal-color-row' });
      template.colorPresets.forEach(preset => {
        const swatch = createElement('div', '', { class: 'template-modal-color-swatch' });
        swatch.style.backgroundColor = preset.accentColor || '#333';
        swatch.title = preset.name;
        colorRow.appendChild(swatch);
      });
      colorSection.appendChild(colorRow);
      metaSidebar.appendChild(colorSection);
    }

    // Font presets
    if (template.fontPresets && template.fontPresets.length > 0) {
      const fontSection = createElement('div', '', { class: 'template-modal-meta-section' });
      fontSection.appendChild(createElement('h4', 'Fonts', { class: 'template-modal-meta-heading' }));
      template.fontPresets.forEach(preset => {
        const fontItem = createElement('div', preset.name, { class: 'template-modal-font-item' });
        fontItem.style.fontFamily = preset.fontFamily;
        fontSection.appendChild(fontItem);
      });
      metaSidebar.appendChild(fontSection);
    }

    modalBody.appendChild(metaSidebar);
    modal.appendChild(modalBody);

    overlay.appendChild(modal);

    const overlayClickHandler = (e) => {
      if (e.target === overlay) this.closePreviewModal();
    };
    overlay.addEventListener('click', overlayClickHandler);
    this.listeners.push({ element: overlay, event: 'click', handler: overlayClickHandler });

    const escHandler = (e) => {
      if (e.key === 'Escape') this.closePreviewModal();
    };
    document.addEventListener('keydown', escHandler);
    this.listeners.push({ element: document, event: 'keydown', handler: escHandler });

    document.body.appendChild(overlay);
    this.modalEl = overlay;

    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  closePreviewModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
      setTimeout(() => {
        if (this.modalEl && this.modalEl.parentNode) {
          this.modalEl.parentNode.removeChild(this.modalEl);
        }
        this.modalEl = null;
      }, 200);
    }
  }

  // ========== Comparison ==========

  selectForCompare(templateId) {
    const index = this.compareTemplates.indexOf(templateId);
    if (index === -1) {
      if (this.compareTemplates.length < 2) {
        this.compareTemplates.push(templateId);
      } else {
        this.compareTemplates[0] = templateId;
      }
    } else {
      this.compareTemplates.splice(index, 1);
    }

    this.container.querySelectorAll('.template-gallery-card').forEach(card => {
      const cardId = card.getAttribute('data-template-id');
      card.classList.toggle('selected', this.compareTemplates.includes(cardId));
    });

    if (this.compareTemplates.length === 2) {
      this.showComparison();
    } else if (this.comparisonEl) {
      this.closeComparison();
    }
  }

  showComparison() {
    this.closeComparison();

    const t1 = this.templateEngine.getById(this.compareTemplates[0]);
    const t2 = this.templateEngine.getById(this.compareTemplates[1]);
    if (!t1 || !t2) return;

    const overlay = createElement('div', '', { class: 'template-modal-overlay template-compare-overlay' });

    const modal = createElement('div', '', { class: 'template-compare-modal' });

    // Header
    const header = createElement('div', '', { class: 'template-compare-header' });
    header.appendChild(createElement('h2', 'Template Comparison', { class: 'template-modal-name' }));

    const closeBtn = createElement('button', '×', { class: 'template-modal-close', 'aria-label': 'Close comparison' });
    const closeHandler = () => this.closeComparison();
    closeBtn.addEventListener('click', closeHandler);
    this.listeners.push({ element: closeBtn, event: 'click', handler: closeHandler });
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Side by side previews
    const body = createElement('div', '', { class: 'template-compare-body' });

    [t1, t2].forEach(template => {
      const col = createElement('div', '', { class: 'template-compare-col' });
      col.appendChild(createElement('h3', template.name, { class: 'template-compare-col-title' }));

      const previewPage = createElement('div', '', { class: 'template-compare-page' });
      try {
        const sample = getSampleForTemplate(template);
        previewPage.innerHTML = this.templateEngine.render(template.id, sample, {});
      } catch (err) {
        previewPage.textContent = 'Preview unavailable';
      }
      col.appendChild(previewPage);

      // Metadata table
      const meta = createElement('div', '', { class: 'template-compare-meta' });
      const rows = [
        ['ATS Level', template.atsLevel],
        ['Columns', template.columnCount],
        ['Photo', template.photoSupport ? 'Yes' : 'No'],
        ['Page Sizes', (template.supportedPageSizes || []).join(', ').toUpperCase()],
        ['Levels', (template.recommendedLevels || []).join(', ')]
      ];
      rows.forEach(([label, value]) => {
        const row = createElement('div', '', { class: 'template-compare-meta-row' });
        row.appendChild(createElement('span', label, { class: 'template-modal-meta-label' }));
        row.appendChild(createElement('span', String(value), { class: 'template-modal-meta-value' }));
        meta.appendChild(row);
      });
      col.appendChild(meta);

      const useBtn = createElement('button', 'Use This Template', { class: 'template-gallery-btn-primary' });
      const useHandler = () => {
        this.closeComparison();
        this.compareMode = false;
        this.compareTemplates = [];
        this.applyTemplate(template);
      };
      useBtn.addEventListener('click', useHandler);
      this.listeners.push({ element: useBtn, event: 'click', handler: useHandler });
      col.appendChild(useBtn);

      body.appendChild(col);
    });

    modal.appendChild(body);
    overlay.appendChild(modal);

    const overlayClickHandler = (e) => {
      if (e.target === overlay) this.closeComparison();
    };
    overlay.addEventListener('click', overlayClickHandler);
    this.listeners.push({ element: overlay, event: 'click', handler: overlayClickHandler });

    const escHandler = (e) => {
      if (e.key === 'Escape') this.closeComparison();
    };
    document.addEventListener('keydown', escHandler);
    this.listeners.push({ element: document, event: 'keydown', handler: escHandler });

    document.body.appendChild(overlay);
    this.comparisonEl = overlay;

    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  closeComparison() {
    if (this.comparisonEl) {
      this.comparisonEl.classList.remove('open');
      setTimeout(() => {
        if (this.comparisonEl && this.comparisonEl.parentNode) {
          this.comparisonEl.parentNode.removeChild(this.comparisonEl);
        }
        this.comparisonEl = null;
      }, 200);
    }
  }

  // ========== Apply Template ==========

  async applyTemplate(template) {
    const docType = getDocTypeForTemplate(template);

    let schemaType = 'resume';
    if (docType === 'cover-letter') schemaType = 'coverLetter';
    else if (docType === 'references') schemaType = 'referenceSheet';

    const doc = createEmptyDocument(schemaType, `New ${template.name}`);
    doc.templateId = template.id;

    if (template.colorPresets && template.colorPresets[0]) {
      doc.design = doc.design || {};
      Object.assign(doc.design, template.colorPresets[0]);
    }
    if (template.fontPresets && template.fontPresets[0]) {
      doc.design = doc.design || {};
      doc.design.fontFamily = template.fontPresets[0].fontFamily;
    }

    try {
      if (this.db) {
        await this.db.put('documents', doc);
      }

      if (this.events) {
        this.events.emit(EVENTS.DOCUMENT_CREATE, { id: doc.id, type: schemaType });
      }

      if (window.CC && window.CC.toast) {
        window.CC.toast.show(`Created "${doc.name}" with ${template.name} template`, 'success');
      }

      if (window.CC && window.CC.router) {
        window.CC.router.navigate(`/editor/${doc.id}`);
      }
    } catch (err) {
      console.error('Failed to apply template:', err);
      if (window.CC && window.CC.toast) {
        window.CC.toast.show('Failed to create document', 'error');
      }
    }
  }

  // ========== Favorites ==========

  toggleFavorite(templateId) {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(templateId);
    if (index === -1) {
      favorites.push(templateId);
    } else {
      favorites.splice(index, 1);
    }
    this.saveFavorites(favorites);
  }

  isFavorite(templateId) {
    return this.getFavorites().includes(templateId);
  }

  getFavorites() {
    try {
      const favorites = localStorage.getItem('templateFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  }

  saveFavorites(favorites) {
    try {
      localStorage.setItem('templateFavorites', JSON.stringify(favorites));
    } catch {
      // storage full
    }
  }

  loadFavorites() {
    this.favorites = this.getFavorites();
  }

  // ========== Cleanup ==========

  destroy() {
    this.closePreviewModal();
    this.closeComparison();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.previewCache.clear();
  }
}

export default TemplateGallery;
