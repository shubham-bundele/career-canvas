/**
 * ResumeEditor - Main resume editing interface
 * Provides a complete WYSIWYG editor with live preview
 */

import { escapeHtml } from '../utils/sanitize.js';
import { generateId } from '../utils/id.js';
import { timeAgo, wordCount, charCount } from '../utils/format.js';
import { getTipsForSection } from '../data/writing-tips.js';
import {
  createEmptyDocument,
  createWorkExperienceItem,
  createEducationItem,
  createProjectItem,
  createSkillItem,
  createCertificationItem,
  createLanguageItem,
  createAchievementItem
} from '../core/schema.js';

const AUTOSAVE_DELAY = 1000;
const PREVIEW_DELAY = 300;
const MAX_HISTORY = 50;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EMPLOYMENT_TYPES = [
  'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Temporary'
];

const REMOTE_TYPES = [
  'Onsite', 'Remote', 'Hybrid'
];

const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'Legal', label: 'Legal (8.5 × 14 in)' },
  { value: 'A5', label: 'A5 (148 × 210 mm)' }
];

const SECTION_TYPES = [
  { id: 'summary', label: 'Summary', icon: '📝', type: 'text' },
  { id: 'objective', label: 'Objective', icon: '🎯', type: 'text' },
  { id: 'experience', label: 'Work Experience', icon: '💼', type: 'list' },
  { id: 'education', label: 'Education', icon: '🎓', type: 'list' },
  { id: 'projects', label: 'Projects', icon: '🚀', type: 'list' },
  { id: 'skills', label: 'Skills', icon: '⚡', type: 'list' },
  { id: 'certifications', label: 'Certifications', icon: '📜', type: 'list' },
  { id: 'languages', label: 'Languages', icon: '🌐', type: 'list' },
  { id: 'publications', label: 'Publications', icon: '📚', type: 'list' },
  { id: 'awards', label: 'Awards & Honors', icon: '🏆', type: 'list' },
  { id: 'volunteer', label: 'Volunteer Work', icon: '🤝', type: 'list' }
];

export class ResumeEditor {
  constructor(documentId, db, state, events, templateEngine, atsChecker) {
    this.documentId = documentId;
    this.db = db;
    this.state = state;
    this.events = events;
    this.templateEngine = templateEngine;
    this.atsChecker = atsChecker;

    // Document state
    this.document = null;
    this.saveStatus = 'saved'; // 'saved', 'saving', 'unsaved'
    this.lastSaveTime = null;

    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;

    // UI state
    this.expandedSections = new Set();
    this.expandedEntries = new Map(); // sectionId -> Set of entryIds
    this.activeSection = null;
    this.zoomLevel = 'fit';
    this.mobileView = 'edit'; // 'edit', 'preview', 'design', 'export'

    // DOM references
    this.container = null;
    this.toolbarEl = null;
    this.leftPanelEl = null;
    this.previewEl = null;
    this.rightPanelEl = null;

    // Timers
    this.autosaveTimer = null;
    this.previewTimer = null;

    // Bind methods
    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.handleKeyboardShortcut = this.handleKeyboardShortcut.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleRedo = this.handleRedo.bind(this);
  }

  async render() {
    // Load document
    await this.loadDocument();

    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'resume-editor';

    // Render sections
    this.toolbarEl = this.renderToolbar();
    this.leftPanelEl = this.renderLeftPanel();
    this.previewEl = this.renderPreview();
    this.rightPanelEl = this.renderRightPanel();

    // Build layout
    this.mainContentEl = document.createElement('div');
    this.mainContentEl.className = 'editor-main-content';
    this.mainContentEl.appendChild(this.leftPanelEl);

    // Resize handle between left panel and preview
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'panel-resize-handle';
    resizeHandle.title = 'Drag to resize';
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const delta = e.clientX - startX;
      const newWidth = Math.max(220, Math.min(600, startWidth + delta));
      this.leftPanelEl.style.width = newWidth + 'px';
    };
    const onMouseUp = () => {
      isResizing = false;
      resizeHandle.classList.remove('panel-resize-handle--active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = this.leftPanelEl.offsetWidth;
      resizeHandle.classList.add('panel-resize-handle--active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    this.mainContentEl.appendChild(resizeHandle);
    this.mainContentEl.appendChild(this.previewEl);

    // Resize handle between preview and right panel
    const rightResizeHandle = document.createElement('div');
    rightResizeHandle.className = 'panel-resize-handle panel-resize-handle--right';
    rightResizeHandle.title = 'Drag to resize';
    let isResizingRight = false;
    let startXR = 0;
    let startWidthR = 0;

    const onMouseMoveR = (e) => {
      if (!isResizingRight) return;
      const delta = startXR - e.clientX;
      const newWidth = Math.max(200, Math.min(500, startWidthR + delta));
      this.rightPanelEl.style.width = newWidth + 'px';
    };
    const onMouseUpR = () => {
      isResizingRight = false;
      rightResizeHandle.classList.remove('panel-resize-handle--active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMoveR);
      document.removeEventListener('mouseup', onMouseUpR);
    };
    rightResizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizingRight = true;
      startXR = e.clientX;
      startWidthR = this.rightPanelEl.offsetWidth;
      rightResizeHandle.classList.add('panel-resize-handle--active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMoveR);
      document.addEventListener('mouseup', onMouseUpR);
    });

    this.mainContentEl.appendChild(rightResizeHandle);
    this.mainContentEl.appendChild(this.rightPanelEl);

    this.container.appendChild(this.toolbarEl);
    this.container.appendChild(this.mainContentEl);

    // Add mobile navigation
    this.container.appendChild(this.renderMobileNav());

    // Attach event listeners
    this.attachEventListeners();

    // Initial preview render — delay slightly to ensure DOM is laid out
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.updatePreview());
    });

    return this.container;
  }

  renderToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    // Document name (editable)
    const nameContainer = document.createElement('div');
    nameContainer.className = 'toolbar-section toolbar-doc-name';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'doc-name-input';
    nameInput.value = this.document.metadata.title || 'Untitled Resume';
    nameInput.addEventListener('change', (e) => {
      this.document.metadata.title = e.target.value;
      this.markUnsaved();
      this.scheduleAutosave();
    });
    nameContainer.appendChild(nameInput);

    // Save status
    const statusEl = document.createElement('span');
    statusEl.className = 'save-status';
    statusEl.dataset.status = this.saveStatus;
    statusEl.textContent = this.getSaveStatusText();
    nameContainer.appendChild(statusEl);

    toolbar.appendChild(nameContainer);

    // Template selector
    const templateSection = document.createElement('div');
    templateSection.className = 'toolbar-section';

    const templateLabel = document.createElement('label');
    templateLabel.textContent = 'Template: ';
    templateSection.appendChild(templateLabel);

    const templateSelect = document.createElement('select');
    templateSelect.className = 'template-select';
    const allTemplates = this.templateEngine.getAll();
    let filteredTemplates;
    if (this.document.type === 'coverLetter') {
      filteredTemplates = allTemplates.filter(t => t.category === 'cover-letter');
    } else if (this.document.type === 'referenceSheet') {
      filteredTemplates = allTemplates.filter(t => t.category === 'references');
    } else {
      filteredTemplates = allTemplates.filter(t => !t.category || (t.category !== 'cover-letter' && t.category !== 'references'));
    }
    const resumeTemplates = filteredTemplates.length > 0 ? filteredTemplates : allTemplates;
    resumeTemplates.forEach(tpl => {
      const option = document.createElement('option');
      option.value = tpl.id;
      option.textContent = tpl.name;
      option.selected = this.document.design.template === tpl.id;
      templateSelect.appendChild(option);
    });
    templateSelect.addEventListener('change', (e) => {
      this.document.design.template = e.target.value;
      this.markUnsaved();
      this.scheduleAutosave();
      this.updatePreview();
    });
    templateSection.appendChild(templateSelect);
    toolbar.appendChild(templateSection);

    // Page size selector
    const pageSizeSection = document.createElement('div');
    pageSizeSection.className = 'toolbar-section';

    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.textContent = 'Page: ';
    pageSizeSection.appendChild(pageSizeLabel);

    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.className = 'page-size-select';
    PAGE_SIZES.forEach(size => {
      const option = document.createElement('option');
      option.value = size.value;
      option.textContent = size.label;
      option.selected = this.document.design.pageSize === size.value;
      pageSizeSelect.appendChild(option);
    });
    pageSizeSelect.addEventListener('change', (e) => {
      this.document.design.pageSize = e.target.value;
      this.markUnsaved();
      this.scheduleAutosave();
      this.updatePreview();
    });
    pageSizeSection.appendChild(pageSizeSelect);
    toolbar.appendChild(pageSizeSection);

    // ATS mode toggle
    const atsSection = document.createElement('div');
    atsSection.className = 'toolbar-section';

    const atsButton = document.createElement('button');
    atsButton.className = 'toolbar-btn ats-toggle';
    const atsActive = !!this.document.settings.atsMode;
    atsButton.dataset.active = atsActive;
    if (atsActive) atsButton.classList.add('active');
    atsButton.textContent = 'ATS Mode';
    atsButton.title = 'Toggle ATS-friendly formatting';
    atsButton.addEventListener('click', () => {
      this.toggleAtsMode();
    });
    atsSection.appendChild(atsButton);
    toolbar.appendChild(atsSection);

    // Smart Format button
    const smartSection = document.createElement('div');
    smartSection.className = 'toolbar-section';
    const smartBtn = document.createElement('button');
    smartBtn.className = 'toolbar-btn toolbar-btn--smart';
    smartBtn.textContent = '✨ Smart Format';
    smartBtn.title = 'Analyze and fix formatting issues';
    smartBtn.addEventListener('click', () => this.showSmartFormatter());
    smartSection.appendChild(smartBtn);
    toolbar.appendChild(smartSection);

    // Undo/Redo
    const historySection = document.createElement('div');
    historySection.className = 'toolbar-section toolbar-history';

    const undoBtn = document.createElement('button');
    undoBtn.className = 'toolbar-btn icon-btn';
    undoBtn.innerHTML = '&#8634;';
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.disabled = !this.canUndo();
    undoBtn.addEventListener('click', this.handleUndo);
    historySection.appendChild(undoBtn);

    const redoBtn = document.createElement('button');
    redoBtn.className = 'toolbar-btn icon-btn';
    redoBtn.innerHTML = '&#8635;';
    redoBtn.title = 'Redo (Ctrl+Y)';
    redoBtn.disabled = !this.canRedo();
    redoBtn.addEventListener('click', this.handleRedo);
    historySection.appendChild(redoBtn);

    toolbar.appendChild(historySection);

    // Import dropdown — shows format options, then review panel before merging
    const importSection = document.createElement('div');
    importSection.className = 'toolbar-section';
    importSection.style.position = 'relative';

    const importBtn = document.createElement('button');
    importBtn.className = 'toolbar-btn';
    importBtn.textContent = 'Import ▾';
    importBtn.title = 'Import content into this document';
    importBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = importSection.querySelector('.import-dropdown-menu');
      if (existing) { existing.remove(); return; }

      const menu = document.createElement('div');
      menu.className = 'import-dropdown-menu';
      menu.style.cssText = 'position:absolute;top:100%;left:0;z-index:var(--z-tooltip);background:var(--bg-elevated);border:1px solid var(--border-primary);border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);padding:var(--space-1) 0;min-width:220px;animation:navDropFade 0.15s ease-out;';

      const formats = [
        { id: 'docx', icon: '📝', label: 'Word Document (.docx)', accept: '.docx' },
        { id: 'pdf', icon: '📄', label: 'PDF Document (.pdf)', accept: '.pdf' },
        { id: 'json', icon: '📋', label: 'CareerCanvas JSON (.json)', accept: '.json' },
        { id: 'txt', icon: '📃', label: 'Plain Text (.txt)', accept: '.txt,.md,.html,.htm' }
      ];

      formats.forEach(fmt => {
        const item = document.createElement('button');
        item.style.cssText = 'display:flex;align-items:center;gap:var(--space-2);width:100%;padding:var(--space-2) var(--space-4);border:none;background:none;color:var(--text-primary);font-size:var(--font-size-sm);cursor:pointer;text-align:left;transition:background 0.15s;';
        item.innerHTML = `<span>${fmt.icon}</span><span>${fmt.label}</span>`;
        item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg-hover)'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'none'; });
        item.addEventListener('click', () => {
          menu.remove();
          this._handleEditorImport(fmt);
        });
        menu.appendChild(item);
      });

      importSection.appendChild(menu);
      const closeMenu = (e2) => { if (!importSection.contains(e2.target)) { menu.remove(); document.removeEventListener('click', closeMenu); } };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
    });
    importSection.appendChild(importBtn);
    toolbar.appendChild(importSection);

    // Export dropdown
    const exportSection = document.createElement('div');
    exportSection.className = 'toolbar-section toolbar-export';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'toolbar-btn';
    exportBtn.textContent = 'Export ▾';
    exportBtn.addEventListener('click', (e) => {
      this.showExportMenu(e.target);
    });
    exportSection.appendChild(exportBtn);
    toolbar.appendChild(exportSection);


    return toolbar;
  }

  renderLeftPanel() {
    const panel = document.createElement('div');
    panel.className = 'editor-left-panel';

    // Personal info section
    panel.appendChild(this.renderPersonalInfoSection());

    // Cover letter specific fields
    if (this.document.type === 'coverLetter' && this.document.coverLetter) {
      panel.appendChild(this.renderCoverLetterSection());
    }

    // Section navigator controls (search + filters)
    if (this.document.type !== 'coverLetter' && this.document.sections && this.document.sections.length > 0) {
      panel.appendChild(this.renderSectionNavigator());
    }

    // Dynamic sections (filtered)
    if (this.document.sections && this.document.sections.length > 0) {
      const filtered = this.getFilteredSections();
      filtered.forEach(({ section, originalIndex }) => {
        panel.appendChild(this.renderSection(section, originalIndex));
      });

      if (filtered.length === 0 && (this._sectionSearch || this._sectionFilter)) {
        const noResults = document.createElement('div');
        noResults.className = 'section-no-results';
        noResults.textContent = 'No sections match your search or filter.';
        panel.appendChild(noResults);
      }
    }

    // Add section button (not for cover letters)
    if (this.document.type !== 'coverLetter') {
      const addSectionBtn = document.createElement('button');
      addSectionBtn.className = 'add-section-btn';
      addSectionBtn.textContent = '+ Add Section';
      addSectionBtn.addEventListener('click', (e) => {
        this.showAddSectionMenu(e.target);
      });
      panel.appendChild(addSectionBtn);
    }

    return panel;
  }

  renderSectionNavigator() {
    const nav = document.createElement('div');
    nav.className = 'section-navigator';

    // Search
    const searchRow = document.createElement('div');
    searchRow.className = 'section-nav-search';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-input section-search-input';
    searchInput.placeholder = 'Search sections...';
    searchInput.value = this._sectionSearch || '';
    searchInput.addEventListener('input', (e) => {
      this._sectionSearch = e.target.value.toLowerCase();
      this.refreshLeftPanel();
    });
    searchRow.appendChild(searchInput);

    if (this._sectionSearch) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'icon-btn section-search-clear';
      clearBtn.textContent = '✕';
      clearBtn.title = 'Clear search';
      clearBtn.addEventListener('click', () => {
        this._sectionSearch = '';
        this.refreshLeftPanel();
      });
      searchRow.appendChild(clearBtn);
    }

    nav.appendChild(searchRow);

    // Filter chips
    const filters = document.createElement('div');
    filters.className = 'section-nav-filters';

    const filterOptions = [
      { id: '', label: 'All' },
      { id: 'visible', label: 'Visible' },
      { id: 'hidden', label: 'Hidden' },
      { id: 'complete', label: 'Complete' },
      { id: 'incomplete', label: 'Incomplete' },
    ];

    filterOptions.forEach(opt => {
      const chip = document.createElement('button');
      chip.className = 'section-filter-chip' + ((this._sectionFilter || '') === opt.id ? ' active' : '');
      chip.textContent = opt.label;
      chip.addEventListener('click', () => {
        this._sectionFilter = opt.id;
        this.refreshLeftPanel();
      });
      filters.appendChild(chip);
    });

    nav.appendChild(filters);

    return nav;
  }

  getFilteredSections() {
    const search = this._sectionSearch || '';
    const filter = this._sectionFilter || '';

    return this.document.sections
      .map((section, index) => ({ section, originalIndex: index }))
      .filter(({ section }) => {
        // Search filter
        if (search && !section.title.toLowerCase().includes(search) &&
            !section.sectionType?.toLowerCase().includes(search)) {
          return false;
        }
        // Type filter
        if (filter === 'visible' && section.visible === false) return false;
        if (filter === 'hidden' && section.visible !== false) return false;
        if (filter === 'complete') {
          if (section.type === 'text') {
            if (!section.content || !section.content.trim()) return false;
          } else {
            if (!section.items || section.items.length === 0) return false;
          }
        }
        if (filter === 'incomplete') {
          if (section.type === 'text') {
            if (section.content && section.content.trim()) return false;
          } else {
            if (section.items && section.items.length > 0) return false;
          }
        }
        return true;
      });
  }

  renderCoverLetterSection() {
    const section = document.createElement('div');
    section.className = 'editor-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.addEventListener('click', () => {
      this.toggleSection('cover-letter');
      this.refreshLeftPanel();
    });

    const titleContainer = document.createElement('div');
    titleContainer.className = 'section-title-container';
    const title = document.createElement('h3');
    title.textContent = 'Cover Letter Details';
    titleContainer.appendChild(title);
    header.appendChild(titleContainer);

    const arrow = document.createElement('span');
    arrow.className = 'expand-arrow';
    arrow.textContent = this.expandedSections.has('cover-letter') ? '▼' : '▶';
    header.appendChild(arrow);

    section.appendChild(header);

    if (this.expandedSections.has('cover-letter')) {
      const body = document.createElement('div');
      body.className = 'section-body';

      const cl = this.document.coverLetter;

      const fields = [
        { key: 'recipientName', label: 'Recipient Name', type: 'text', placeholder: 'e.g., Sarah Johnson' },
        { key: 'recipientTitle', label: 'Recipient Title', type: 'text', placeholder: 'e.g., Hiring Manager', ac: 'jobTitle' },
        { key: 'company', label: 'Company', type: 'text', placeholder: 'e.g., Acme Corp', ac: 'company' },
        { key: 'companyAddress', label: 'Company Address', type: 'text', placeholder: 'e.g., 123 Main St, City', ac: 'location' },
        { key: 'date', label: 'Date', type: 'text', placeholder: 'e.g., January 15, 2025' },
        { key: 'salutation', label: 'Greeting', type: 'text', placeholder: 'e.g., Dear Ms. Johnson' },
        { key: 'closing', label: 'Sign-off', type: 'text', placeholder: 'e.g., Sincerely' },
      ];

      fields.forEach(field => {
        const group = this.createFormGroup(field.label, field.type, cl[field.key] || '', (v) => {
          cl[field.key] = v;
          this.handleFieldChange();
        }, field.ac || false);
        const input = group.querySelector('input');
        if (input && field.placeholder) input.placeholder = field.placeholder;
        body.appendChild(group);
      });

      // Body textarea
      const bodyGroup = document.createElement('div');
      bodyGroup.className = 'form-group';
      const bodyLabel = document.createElement('label');
      bodyLabel.className = 'form-label';
      bodyLabel.textContent = 'Letter Body';
      bodyGroup.appendChild(bodyLabel);

      const bodyHelp = document.createElement('span');
      bodyHelp.className = 'form-help';
      bodyHelp.textContent = 'Separate paragraphs with blank lines';
      bodyGroup.appendChild(bodyHelp);

      // AI Write Cover Letter button
      const aiCoverBtn = document.createElement('button');
      aiCoverBtn.className = 'btn btn-sm btn-primary';
      aiCoverBtn.textContent = '✨ AI Write Cover Letter';
      aiCoverBtn.title = 'Generate a cover letter using AI based on a job description';
      aiCoverBtn.style.cssText = 'margin: 8px 0;';
      aiCoverBtn.addEventListener('click', () => {
        const form = document.createElement('div');
        const jdLabel = document.createElement('label');
        jdLabel.className = 'form-label';
        jdLabel.textContent = 'Paste the job description below:';
        form.appendChild(jdLabel);
        const jdTextarea = document.createElement('textarea');
        jdTextarea.className = 'form-input';
        jdTextarea.rows = 8;
        jdTextarea.placeholder = 'Paste the job description here so AI can tailor your cover letter...';
        form.appendChild(jdTextarea);

        if (window.CC && window.CC.modal) {
          window.CC.modal.show({
            title: 'AI Write Cover Letter',
            body: form,
            size: 'small',
            actions: [
              { label: 'Cancel', type: 'secondary', handler: () => null },
              { label: 'Generate', type: 'primary', handler: () => {
                const jobDescription = jdTextarea.value.trim();
                if (!jobDescription) {
                  if (window.CC && window.CC.toast) window.CC.toast.show('Please enter a job description', 'error');
                  return false;
                }
                // Close modal, then run async generation
                (async () => {
                  aiCoverBtn.textContent = 'Generating...';
                  aiCoverBtn.disabled = true;
                  try {
                    const { AiFormatter } = await import('./ai-formatter.js');
                    const ai = new AiFormatter(AiFormatter.getApiKey());
                    const result = await ai.generateCoverLetter(this.document, jobDescription);
                    cl.body = result;
                    this.handleFieldChange();
                    this.refreshLeftPanel();
                    if (window.CC && window.CC.toast) window.CC.toast.show('Cover letter generated!', 'success');
                  } catch (err) {
                    console.error('AI Cover Letter generation failed:', err);
                    if (window.CC && window.CC.toast) window.CC.toast.show('AI generation failed: ' + err.message, 'error');
                  } finally {
                    aiCoverBtn.textContent = '✨ AI Write Cover Letter';
                    aiCoverBtn.disabled = false;
                  }
                })();
                return true;
              }}
            ]
          });
          setTimeout(() => jdTextarea.focus(), 100);
        }
      });
      bodyGroup.appendChild(aiCoverBtn);

      const bodyTextarea = document.createElement('textarea');
      bodyTextarea.className = 'form-input';
      bodyTextarea.rows = 12;
      bodyTextarea.placeholder = 'Write your cover letter here...\n\nStart with why you are interested in the role.\n\nDescribe relevant experience and achievements.\n\nExplain why you are a good fit for the company.';
      bodyTextarea.value = cl.body || '';
      bodyTextarea.addEventListener('input', (e) => {
        cl.body = e.target.value;
        this.handleFieldChange();
      });
      bodyGroup.appendChild(bodyTextarea);
      body.appendChild(bodyGroup);

      section.appendChild(body);
    }

    return section;
  }

  renderPersonalInfoSection() {
    const section = document.createElement('div');
    section.className = 'editor-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.addEventListener('click', () => {
      this.toggleSection('personal-info');
      this.refreshLeftPanel();
    });

    const piTitleContainer = document.createElement('div');
    piTitleContainer.className = 'section-title-container';
    const title = document.createElement('h3');
    title.textContent = 'Personal Information';
    piTitleContainer.appendChild(title);
    header.appendChild(piTitleContainer);

    const arrow = document.createElement('span');
    arrow.className = 'expand-arrow';
    arrow.textContent = this.expandedSections.has('personal-info') ? '▼' : '▶';
    header.appendChild(arrow);

    section.appendChild(header);

    if (this.expandedSections.has('personal-info')) {
      const body = document.createElement('div');
      body.className = 'section-body';

      const fields = [
        { key: 'fullName', label: 'Full Name', type: 'text', required: true },
        { key: 'preferredName', label: 'Preferred Name', type: 'text' },
        { key: 'professionalTitle', label: 'Professional Title', type: 'text', ac: 'jobTitle' },
        { key: 'resumeHeadline', label: 'Resume Headline', type: 'text' },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'city', label: 'City', type: 'text', ac: 'location', linkedLocation: true },
        { key: 'state', label: 'State/Province', type: 'text', ac: 'state' },
        { key: 'country', label: 'Country', type: 'text', ac: 'country' },
        { key: 'personalWebsite', label: 'Personal Website', type: 'url' },
        { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
        { key: 'githubUrl', label: 'GitHub URL', type: 'url' }
      ];

      fields.forEach(field => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) {
          const req = document.createElement('span');
          req.className = 'required';
          req.textContent = '*';
          label.appendChild(req);
        }
        fieldGroup.appendChild(label);

        const input = document.createElement('input');
        input.type = field.type;
        input.className = 'form-input';
        input.value = this.document.personalInfo[field.key] || '';
        input.dataset.field = field.key;
        input.addEventListener('input', (e) => {
          this.document.personalInfo[field.key] = e.target.value;
          this.handleFieldChange();
        });
        fieldGroup.appendChild(input);

        if (field.ac) {
          import('./autocomplete.js').then(({ Autocomplete }) => {
            Autocomplete.attach(input, field.ac, {
              onSelect: (val) => {
                this.document.personalInfo[field.key] = val;
                this.handleFieldChange();

                // Auto-fill state and country when city is selected
                if (field.linkedLocation) {
                  import('../data/autocomplete-data.js').then(({ getLocationByCity }) => {
                    const loc = getLocationByCity(val);
                    if (loc) {
                      this.document.personalInfo.state = loc.state;
                      this.document.personalInfo.country = loc.country;
                      this.handleFieldChange();
                      this.refreshLeftPanel();
                    }
                  }).catch(() => {});
                }
              }
            });
          }).catch(() => {});
        }

        body.appendChild(fieldGroup);
      });

      section.appendChild(body);
    }

    return section;
  }

  renderSection(section, index) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'editor-section';
    sectionEl.dataset.sectionId = section.id;
    sectionEl.dataset.sectionIndex = index;

    const header = document.createElement('div');
    header.className = 'section-header';

    // Drag handle (mouse + keyboard)
    const dragHandle = document.createElement('span');
    dragHandle.className = 'section-drag-handle';
    dragHandle.textContent = '⠿';
    dragHandle.title = 'Drag to reorder, or press Enter then use arrow keys';
    dragHandle.setAttribute('role', 'button');
    dragHandle.setAttribute('tabindex', '0');
    dragHandle.setAttribute('aria-label', `Reorder ${section.title}. Press Enter to start, arrow keys to move, Enter to confirm, Escape to cancel.`);
    dragHandle.setAttribute('aria-roledescription', 'reorder handle');

    // Mouse/touch drag
    dragHandle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.startSectionDrag(e, sectionEl, index);
    });

    // Keyboard reorder
    dragHandle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this._kbMoveState) {
          // Confirm move
          this.confirmKeyboardMove();
        } else {
          // Start move mode
          this.startKeyboardMove(index, dragHandle);
        }
      } else if (this._kbMoveState) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.keyboardMoveStep(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.keyboardMoveStep(1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelKeyboardMove();
        }
      }
    });

    header.appendChild(dragHandle);

    // Title and badge
    const titleContainer = document.createElement('div');
    titleContainer.className = 'section-title-container';
    titleContainer.addEventListener('click', () => {
      this.toggleSection(section.id);
      this.refreshLeftPanel();
    });

    const title = document.createElement('h3');
    title.textContent = section.title;
    titleContainer.appendChild(title);

    if (section.type === 'list' && section.items) {
      const badge = document.createElement('span');
      badge.className = 'item-count-badge';
      badge.textContent = section.items.length;
      titleContainer.appendChild(badge);
    }

    // Column indicator for 2-column templates
    if (section.column === 'sidebar') {
      const colBadge = document.createElement('span');
      colBadge.className = 'column-badge column-badge-sidebar';
      colBadge.textContent = 'Sidebar';
      colBadge.title = 'This section is in the sidebar column';
      titleContainer.appendChild(colBadge);
    }

    header.appendChild(titleContainer);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'section-actions';

    // More actions menu (contains visibility, move, rename, etc.)
    const moreBtn = document.createElement('button');
    moreBtn.className = 'icon-btn section-more-btn';
    moreBtn.innerHTML = '⋯';
    moreBtn.title = 'Section actions';
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSectionActionsMenu(e.target, section, index);
    });
    actions.appendChild(moreBtn);

    const arrow = document.createElement('span');
    arrow.className = 'expand-arrow';
    arrow.textContent = this.expandedSections.has(section.id) ? '▼' : '▶';
    actions.appendChild(arrow);

    header.appendChild(actions);
    sectionEl.appendChild(header);

    if (this.expandedSections.has(section.id)) {
      const body = document.createElement('div');
      body.className = 'section-body';

      if (section.type === 'text') {
        body.appendChild(this.renderTextSection(section));
      } else if (section.type === 'list') {
        body.appendChild(this.renderListSection(section));
      }

      sectionEl.appendChild(body);
    }

    return sectionEl;
  }

  renderTextSection(section) {
    const container = document.createElement('div');
    container.className = 'text-section-editor';

    const textarea = document.createElement('textarea');
    textarea.className = 'section-textarea';
    textarea.rows = 6;
    textarea.value = section.content || '';
    textarea.placeholder = `Write your ${section.title.toLowerCase()} here...`;
    textarea.addEventListener('input', (e) => {
      section.content = e.target.value;
      this.handleFieldChange();
      this.updateCharCount(e.target);
    });
    container.appendChild(textarea);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'd-flex justify-between items-center';

    const charCountEl = document.createElement('div');
    charCountEl.className = 'char-count';
    charCountEl.textContent = `${charCount(section.content || '')} characters`;
    bottomRow.appendChild(charCountEl);

    const expandBtn = document.createElement('button');
    expandBtn.className = 'btn-ghost btn-sm expand-editor-btn';
    expandBtn.textContent = '⛶ Expand Editor';
    expandBtn.title = 'Open full-screen text editor';
    expandBtn.addEventListener('click', () => {
      this.openPopupTextEditor(section);
    });
    bottomRow.appendChild(expandBtn);

    // AI Summary button for summary/objective sections
    if (section.sectionType === 'summary' || section.sectionType === 'objective') {
      const aiSummaryBtn = document.createElement('button');
      aiSummaryBtn.className = 'btn btn-sm btn-ghost';
      aiSummaryBtn.textContent = '✨ AI Summary';
      aiSummaryBtn.title = 'Generate a professional summary using AI';
      aiSummaryBtn.addEventListener('click', async () => {
        const originalText = aiSummaryBtn.textContent;
        aiSummaryBtn.textContent = 'Generating...';
        aiSummaryBtn.disabled = true;
        try {
          const { AiFormatter } = await import('./ai-formatter.js');
          const ai = new AiFormatter(AiFormatter.getApiKey());
          const result = await ai.generateSummary(this.document);
          section.content = result;
          textarea.value = result;
          this.handleFieldChange();
          this.updateCharCount(textarea);
        } catch (err) {
          console.error('AI Summary generation failed:', err);
          if (window.CC && window.CC.toast) {
            window.CC.toast.show('AI Summary failed: ' + err.message, 'error');
          }
        } finally {
          aiSummaryBtn.textContent = originalText;
          aiSummaryBtn.disabled = false;
        }
      });
      bottomRow.appendChild(aiSummaryBtn);
    }

    container.appendChild(bottomRow);

    return container;
  }

  renderListSection(section) {
    const container = document.createElement('div');
    container.className = 'list-section-editor';

    if (section.items && section.items.length > 0) {
      section.items.forEach((item, index) => {
        container.appendChild(this.renderListItem(section, item, index));
      });
    } else {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = `No ${section.title.toLowerCase()} added yet.`;
      container.appendChild(emptyMsg);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'add-entry-btn';
    addBtn.textContent = `+ Add ${this.getSingularSectionName(section.sectionType)}`;
    addBtn.addEventListener('click', () => {
      this.addListItem(section);
    });
    container.appendChild(addBtn);

    // AI Suggest Skills button (only for skills sections)
    if (section.sectionType === 'skills') {
      const aiSkillBtn = document.createElement('button');
      aiSkillBtn.className = 'btn btn-sm btn-ghost ai-suggest-skills-btn';
      aiSkillBtn.textContent = '✨ AI Suggest Skills';
      aiSkillBtn.title = 'Analyze your resume and suggest relevant skills';
      aiSkillBtn.style.cssText = 'margin-top: 8px; width: 100%;';
      aiSkillBtn.addEventListener('click', async () => {
        // Remove any existing suggestion area
        const existing = container.querySelector('.ai-skills-suggestion-area');
        if (existing) existing.remove();

        const originalText = aiSkillBtn.textContent;
        aiSkillBtn.textContent = 'Analyzing skills...';
        aiSkillBtn.disabled = true;

        // Create suggestion area with loading state
        const suggestionArea = document.createElement('div');
        suggestionArea.className = 'ai-skills-suggestion-area';
        suggestionArea.innerHTML = '<span class="ai-skills-loading">Analyzing your resume for skill suggestions...</span>';
        container.appendChild(suggestionArea);

        try {
          const { AiFormatter } = await import('./ai-formatter.js');
          const ai = new AiFormatter(AiFormatter.getApiKey());
          const suggestedSkills = await ai.extractSkills(this.document);

          // Filter out skills that are already in the section
          const existingNames = (section.items || []).map(i => (i.name || '').toLowerCase().trim());
          const newSuggestions = suggestedSkills.filter(s => !existingNames.includes(s.toLowerCase().trim()));

          suggestionArea.innerHTML = '';

          if (newSuggestions.length === 0) {
            suggestionArea.innerHTML = '<span class="ai-skills-empty">No new skill suggestions found. Your skills section looks comprehensive!</span>';
          } else {
            const header = document.createElement('div');
            header.className = 'ai-skills-header';
            header.innerHTML = '<span>Suggested skills (click + to add):</span>';
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn-ghost btn-sm';
            closeBtn.textContent = '✕';
            closeBtn.title = 'Dismiss suggestions';
            closeBtn.addEventListener('click', () => suggestionArea.remove());
            header.appendChild(closeBtn);
            suggestionArea.appendChild(header);

            const chipsContainer = document.createElement('div');
            chipsContainer.className = 'ai-skills-chips';

            newSuggestions.forEach(skillName => {
              const chip = document.createElement('span');
              chip.className = 'ai-skill-chip';

              const label = document.createElement('span');
              label.className = 'ai-skill-chip-label';
              label.textContent = skillName;

              const addChipBtn = document.createElement('button');
              addChipBtn.className = 'ai-skill-chip-add';
              addChipBtn.textContent = '+';
              addChipBtn.title = `Add "${skillName}" to skills`;
              addChipBtn.addEventListener('click', () => {
                const newItem = createSkillItem();
                newItem.name = skillName;
                if (!section.items) section.items = [];
                section.items.push(newItem);
                this.handleFieldChange();
                this.refreshLeftPanel();
                // Mark chip as added
                chip.classList.add('ai-skill-chip-added');
                addChipBtn.textContent = '✓';
                addChipBtn.disabled = true;
              });

              chip.appendChild(label);
              chip.appendChild(addChipBtn);
              chipsContainer.appendChild(chip);
            });

            suggestionArea.appendChild(chipsContainer);
          }
        } catch (err) {
          console.error('AI skill suggestion failed:', err);
          suggestionArea.innerHTML = '<span class="ai-skills-error">Failed to suggest skills: ' + escapeHtml(err.message) + '</span>';
          if (window.CC && window.CC.toast) {
            window.CC.toast.show('AI skill suggestion failed: ' + err.message, 'error');
          }
        } finally {
          aiSkillBtn.textContent = originalText;
          aiSkillBtn.disabled = false;
        }
      });
      container.appendChild(aiSkillBtn);
    }

    return container;
  }

  renderListItem(section, item, index) {
    const card = document.createElement('div');
    card.className = 'entry-card' + (item.hidden ? ' entry-hidden' : '');
    card.dataset.entryId = item.id;
    card.dataset.entryIndex = index;

    const cardHeader = document.createElement('div');
    cardHeader.className = 'entry-card-header';

    // Entry drag handle
    const entryDragHandle = document.createElement('span');
    entryDragHandle.className = 'entry-drag-handle';
    entryDragHandle.textContent = '⠿';
    entryDragHandle.title = 'Drag to reorder, or press Enter then arrow keys';
    entryDragHandle.setAttribute('role', 'button');
    entryDragHandle.setAttribute('tabindex', '0');
    entryDragHandle.setAttribute('aria-label', `Reorder ${this.getEntryTitle(section.sectionType, item)}`);

    // Mouse drag for entries
    entryDragHandle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      this.startEntryDrag(e, card, section, index);
    });

    // Keyboard reorder for entries
    entryDragHandle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (this._kbEntryMoveState) {
          this.confirmEntryKeyboardMove();
        } else {
          this.startEntryKeyboardMove(section, index, entryDragHandle);
        }
      } else if (this._kbEntryMoveState) {
        if (e.key === 'ArrowUp') { e.preventDefault(); this.entryKeyboardMoveStep(-1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); this.entryKeyboardMoveStep(1); }
        else if (e.key === 'Escape') { e.preventDefault(); this.cancelEntryKeyboardMove(); }
      }
    });
    cardHeader.appendChild(entryDragHandle);

    // Click to expand/collapse
    const info = document.createElement('div');
    info.className = 'entry-info';
    info.addEventListener('click', () => {
      this.toggleEntry(section.id, item.id);
      this.refreshLeftPanel();
    });

    const title = document.createElement('div');
    title.className = 'entry-title';
    title.textContent = this.getEntryTitle(section.sectionType, item);
    if (item.hidden) title.style.opacity = '0.5';
    info.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'entry-subtitle';
    subtitle.textContent = this.getEntrySubtitle(section.sectionType, item);
    info.appendChild(subtitle);

    cardHeader.appendChild(info);

    const cardActions = document.createElement('div');
    cardActions.className = 'entry-actions';

    // Hide/Show toggle
    const hideBtn = document.createElement('button');
    hideBtn.className = 'icon-btn';
    hideBtn.innerHTML = item.hidden ? '👁‍🗨' : '👁';
    hideBtn.title = item.hidden ? 'Show entry' : 'Hide entry';
    hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      item.hidden = !item.hidden;
      this.handleFieldChange();
      this.refreshLeftPanel();
    });
    cardActions.appendChild(hideBtn);

    const expandBtn = document.createElement('button');
    expandBtn.className = 'icon-btn';
    expandBtn.innerHTML = this.isEntryExpanded(section.id, item.id) ? '▼' : '▶';
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleEntry(section.id, item.id);
      this.refreshLeftPanel();
    });
    cardActions.appendChild(expandBtn);

    cardHeader.appendChild(cardActions);
    card.appendChild(cardHeader);

    if (this.isEntryExpanded(section.id, item.id)) {
      const cardBody = document.createElement('div');
      cardBody.className = 'entry-card-body';

      cardBody.appendChild(this.renderEntryEditor(section, item, index));

      card.appendChild(cardBody);
    }

    return card;
  }

  renderEntryEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'entry-editor';

    switch (section.sectionType) {
      case 'experience':
        editor.appendChild(this.renderExperienceEditor(section, item, index));
        break;
      case 'education':
        editor.appendChild(this.renderEducationEditor(section, item, index));
        break;
      case 'projects':
        editor.appendChild(this.renderProjectEditor(section, item, index));
        break;
      case 'skills':
        editor.appendChild(this.renderSkillEditor(section, item, index));
        break;
      case 'certifications':
        editor.appendChild(this.renderCertificationEditor(section, item, index));
        break;
      case 'languages':
        editor.appendChild(this.renderLanguageEditor(section, item, index));
        break;
      default:
        editor.appendChild(this.renderGenericEditor(section, item, index));
    }

    // Entry actions
    const actionsRow = document.createElement('div');
    actionsRow.className = 'entry-actions-row';

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'btn-secondary btn-sm';
    duplicateBtn.textContent = 'Duplicate';
    duplicateBtn.addEventListener('click', () => {
      this.duplicateListItem(section, index);
    });
    actionsRow.appendChild(duplicateBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      this.deleteListItem(section, index);
    });
    actionsRow.appendChild(deleteBtn);

    if (index > 0) {
      const moveUpBtn = document.createElement('button');
      moveUpBtn.className = 'btn-secondary btn-sm';
      moveUpBtn.textContent = '↑ Move Up';
      moveUpBtn.addEventListener('click', () => {
        this.moveListItem(section, index, index - 1);
      });
      actionsRow.appendChild(moveUpBtn);
    }

    if (index < section.items.length - 1) {
      const moveDownBtn = document.createElement('button');
      moveDownBtn.className = 'btn-secondary btn-sm';
      moveDownBtn.textContent = '↓ Move Down';
      moveDownBtn.addEventListener('click', () => {
        this.moveListItem(section, index, index + 1);
      });
      actionsRow.appendChild(moveDownBtn);
    }

    editor.appendChild(actionsRow);

    return editor;
  }

  renderExperienceEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'experience-editor';

    // Job Title
    const jobTitleGroup = this.createFormGroup('Job Title', 'text', item.jobTitle || '', (value) => {
      item.jobTitle = value;
      this.handleFieldChange();
    }, 'jobTitle');
    editor.appendChild(jobTitleGroup);

    // Company
    const companyGroup = this.createFormGroup('Company', 'text', item.company || '', (value) => {
      item.company = value;
      this.handleFieldChange();
    }, 'company');
    editor.appendChild(companyGroup);

    // Department
    const deptGroup = this.createFormGroup('Department', 'text', item.department || '', (value) => {
      item.department = value;
      this.handleFieldChange();
    });
    editor.appendChild(deptGroup);

    // Location
    const locationGroup = this.createFormGroup('Location', 'text', item.location || '', (value) => {
      item.location = value;
      this.handleFieldChange();
    }, 'location');
    editor.appendChild(locationGroup);

    // Employment Type
    const empTypeGroup = this.createSelectGroup('Employment Type', EMPLOYMENT_TYPES, item.employmentType || 'Full-time', (value) => {
      item.employmentType = value;
      this.handleFieldChange();
    });
    editor.appendChild(empTypeGroup);

    // Remote Type
    const remoteTypeGroup = this.createSelectGroup('Work Setting', REMOTE_TYPES, item.remoteType || 'Onsite', (value) => {
      item.remoteType = value;
      this.handleFieldChange();
    });
    editor.appendChild(remoteTypeGroup);

    // Dates
    const datesContainer = document.createElement('div');
    datesContainer.className = 'dates-container';

    const startDateGroup = document.createElement('div');
    startDateGroup.className = 'form-group date-group';
    const startLabel = document.createElement('label');
    startLabel.textContent = 'Start Date';
    startDateGroup.appendChild(startLabel);

    const startDateInputs = document.createElement('div');
    startDateInputs.className = 'date-inputs';

    const startMonthSelect = document.createElement('select');
    MONTHS.forEach((month, i) => {
      const option = document.createElement('option');
      option.value = i + 1;
      option.textContent = month;
      option.selected = item.startMonth === (i + 1);
      startMonthSelect.appendChild(option);
    });
    startMonthSelect.addEventListener('change', (e) => {
      item.startMonth = parseInt(e.target.value);
      this.handleFieldChange();
    });
    startDateInputs.appendChild(startMonthSelect);

    const startYearInput = document.createElement('input');
    startYearInput.type = 'number';
    startYearInput.placeholder = 'Year';
    startYearInput.value = item.startYear || '';
    startYearInput.addEventListener('input', (e) => {
      item.startYear = parseInt(e.target.value) || null;
      this.handleFieldChange();
    });
    startDateInputs.appendChild(startYearInput);

    startDateGroup.appendChild(startDateInputs);
    datesContainer.appendChild(startDateGroup);

    // Currently Working checkbox
    const currentlyWorkingGroup = document.createElement('div');
    currentlyWorkingGroup.className = 'form-group checkbox-group';

    const currentlyWorkingLabel = document.createElement('label');
    const currentlyWorkingCheckbox = document.createElement('input');
    currentlyWorkingCheckbox.type = 'checkbox';
    currentlyWorkingCheckbox.checked = item.currentlyWorking || false;
    currentlyWorkingCheckbox.addEventListener('change', (e) => {
      item.currentlyWorking = e.target.checked;
      this.handleFieldChange();
      this.refreshLeftPanel();
    });
    currentlyWorkingLabel.appendChild(currentlyWorkingCheckbox);
    currentlyWorkingLabel.appendChild(document.createTextNode(' I currently work here'));
    currentlyWorkingGroup.appendChild(currentlyWorkingLabel);
    datesContainer.appendChild(currentlyWorkingGroup);

    if (!item.currentlyWorking) {
      const endDateGroup = document.createElement('div');
      endDateGroup.className = 'form-group date-group';
      const endLabel = document.createElement('label');
      endLabel.textContent = 'End Date';
      endDateGroup.appendChild(endLabel);

      const endDateInputs = document.createElement('div');
      endDateInputs.className = 'date-inputs';

      const endMonthSelect = document.createElement('select');
      MONTHS.forEach((month, i) => {
        const option = document.createElement('option');
        option.value = i + 1;
        option.textContent = month;
        option.selected = item.endMonth === (i + 1);
        endMonthSelect.appendChild(option);
      });
      endMonthSelect.addEventListener('change', (e) => {
        item.endMonth = parseInt(e.target.value);
        this.handleFieldChange();
      });
      endDateInputs.appendChild(endMonthSelect);

      const endYearInput = document.createElement('input');
      endYearInput.type = 'number';
      endYearInput.placeholder = 'Year';
      endYearInput.value = item.endYear || '';
      endYearInput.addEventListener('input', (e) => {
        item.endYear = parseInt(e.target.value) || null;
        this.handleFieldChange();
      });
      endDateInputs.appendChild(endYearInput);

      endDateGroup.appendChild(endDateInputs);
      datesContainer.appendChild(endDateGroup);
    }

    editor.appendChild(datesContainer);

    // Role Summary
    const summaryGroup = document.createElement('div');
    summaryGroup.className = 'form-group';
    const summaryLabel = document.createElement('label');
    summaryLabel.textContent = 'Role Summary';
    summaryGroup.appendChild(summaryLabel);

    const summaryTextarea = document.createElement('textarea');
    summaryTextarea.rows = 3;
    summaryTextarea.value = item.roleSummary || '';
    summaryTextarea.placeholder = 'Brief overview of your role and responsibilities...';
    summaryTextarea.addEventListener('input', (e) => {
      item.roleSummary = e.target.value;
      this.handleFieldChange();
    });
    summaryGroup.appendChild(summaryTextarea);
    editor.appendChild(summaryGroup);

    // Achievements
    const achievementsSection = document.createElement('div');
    achievementsSection.className = 'achievements-section';

    const achievementsLabel = document.createElement('label');
    achievementsLabel.textContent = 'Key Achievements & Responsibilities';
    achievementsSection.appendChild(achievementsLabel);

    const achievementsList = document.createElement('div');
    achievementsList.className = 'achievements-list';

    if (!item.achievements) {
      item.achievements = [];
    }

    item.achievements.forEach((achievement, achIndex) => {
      achievementsList.appendChild(this.renderAchievementItem(item, achievement, achIndex));
    });

    achievementsSection.appendChild(achievementsList);

    const achievementBtns = document.createElement('div');
    achievementBtns.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-top: 8px;';

    const addAchievementBtn = document.createElement('button');
    addAchievementBtn.className = 'btn-secondary btn-sm';
    addAchievementBtn.textContent = '+ Add Achievement';
    addAchievementBtn.addEventListener('click', () => {
      item.achievements.push(createAchievementItem());
      this.handleFieldChange();
      this.refreshLeftPanel();
    });
    achievementBtns.appendChild(addAchievementBtn);

    const aiGenerateBtn = document.createElement('button');
    aiGenerateBtn.className = 'btn-secondary btn-sm ai-generate-btn';
    aiGenerateBtn.innerHTML = '✨ AI Generate';
    aiGenerateBtn.title = 'Generate achievement bullets with AI';
    aiGenerateBtn.addEventListener('click', async () => {
      if (!item.jobTitle) return;
      const originalText = aiGenerateBtn.innerHTML;
      aiGenerateBtn.innerHTML = '...';
      aiGenerateBtn.disabled = true;
      try {
        const { AiFormatter } = await import('./ai-formatter.js');
        const ai = new AiFormatter(AiFormatter.getApiKey());
        const bullets = await ai.generateBullets(item.jobTitle, item.company);
        if (Array.isArray(bullets)) {
          bullets.forEach(text => {
            const newAch = createAchievementItem();
            newAch.text = text;
            item.achievements.push(newAch);
          });
          this.handleFieldChange();
          this.refreshLeftPanel();
        }
      } catch (err) {
        console.error('AI generate failed:', err);
      } finally {
        aiGenerateBtn.innerHTML = originalText;
        aiGenerateBtn.disabled = false;
      }
    });
    achievementBtns.appendChild(aiGenerateBtn);

    achievementsSection.appendChild(achievementBtns);

    editor.appendChild(achievementsSection);

    // Technologies
    const techGroup = this.createFormGroup('Technologies/Tools', 'text', (item.technologies || []).join(', '), (value) => {
      item.technologies = value.split(',').map(t => t.trim()).filter(Boolean);
      this.handleFieldChange();
    });
    techGroup.querySelector('input').placeholder = 'e.g., JavaScript, React, Node.js';
    editor.appendChild(techGroup);

    return editor;
  }

  renderAchievementItem(experienceItem, achievement, index) {
    const item = document.createElement('div');
    item.className = 'achievement-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = achievement.text || '';
    input.placeholder = 'Describe an achievement or responsibility...';
    input.addEventListener('input', (e) => {
      experienceItem.achievements[index].text = e.target.value;
      this.handleFieldChange();
    });
    item.appendChild(input);

    const aiImproveBtn = document.createElement('button');
    aiImproveBtn.className = 'icon-btn ai-improve-btn';
    aiImproveBtn.innerHTML = '✨';
    aiImproveBtn.title = 'AI improve this bullet';
    aiImproveBtn.style.cssText = 'font-size: 14px; padding: 2px 5px; margin-left: 4px; cursor: pointer; flex-shrink: 0;';
    aiImproveBtn.addEventListener('click', async () => {
      if (!achievement.text || !achievement.text.trim()) return;
      const originalText = aiImproveBtn.innerHTML;
      aiImproveBtn.innerHTML = '...';
      aiImproveBtn.disabled = true;
      try {
        const { AiFormatter } = await import('./ai-formatter.js');
        const ai = new AiFormatter(AiFormatter.getApiKey());
        const improved = await ai.improveText(achievement.text, experienceItem.jobTitle + ' at ' + experienceItem.company);
        achievement.text = improved;
        input.value = improved;
        this.handleFieldChange();
      } catch (err) {
        console.error('AI improve failed:', err);
      } finally {
        aiImproveBtn.innerHTML = originalText;
        aiImproveBtn.disabled = false;
      }
    });
    item.appendChild(aiImproveBtn);

    const actions = document.createElement('div');
    actions.className = 'achievement-actions';

    if (index > 0) {
      const moveUpBtn = document.createElement('button');
      moveUpBtn.className = 'icon-btn';
      moveUpBtn.innerHTML = '▲';
      moveUpBtn.title = 'Move up';
      moveUpBtn.addEventListener('click', () => {
        const temp = experienceItem.achievements[index];
        experienceItem.achievements[index] = experienceItem.achievements[index - 1];
        experienceItem.achievements[index - 1] = temp;
        this.handleFieldChange();
        this.refreshLeftPanel();
      });
      actions.appendChild(moveUpBtn);
    }

    if (index < experienceItem.achievements.length - 1) {
      const moveDownBtn = document.createElement('button');
      moveDownBtn.className = 'icon-btn';
      moveDownBtn.innerHTML = '▼';
      moveDownBtn.title = 'Move down';
      moveDownBtn.addEventListener('click', () => {
        const temp = experienceItem.achievements[index];
        experienceItem.achievements[index] = experienceItem.achievements[index + 1];
        experienceItem.achievements[index + 1] = temp;
        this.handleFieldChange();
        this.refreshLeftPanel();
      });
      actions.appendChild(moveDownBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', () => {
      experienceItem.achievements.splice(index, 1);
      this.handleFieldChange();
      this.refreshLeftPanel();
    });
    actions.appendChild(deleteBtn);

    item.appendChild(actions);

    return item;
  }

  renderEducationEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'education-editor';

    editor.appendChild(this.createFormGroup('Degree', 'text', item.degree || '', (v) => {
      item.degree = v;
      this.handleFieldChange();
    }, 'degree'));

    editor.appendChild(this.createFormGroup('Field of Study', 'text', item.specialization || '', (v) => {
      item.specialization = v;
      this.handleFieldChange();
    }, 'specialization'));

    editor.appendChild(this.createFormGroup('Institution', 'text', item.institution || '', (v) => {
      item.institution = v;
      this.handleFieldChange();
    }, 'institution'));

    editor.appendChild(this.createFormGroup('Location', 'text', item.location || '', (v) => {
      item.location = v;
      this.handleFieldChange();
    }, 'location'));

    editor.appendChild(this.createFormGroup('GPA', 'text', item.gpa || '', (v) => {
      item.gpa = v;
      this.handleFieldChange();
    }));

    editor.appendChild(this.createFormGroup('Graduation Year', 'number', item.endDate || '', (v) => {
      item.endDate = parseInt(v) || null;
      this.handleFieldChange();
    }));

    return editor;
  }

  renderProjectEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'project-editor';

    editor.appendChild(this.createFormGroup('Project Name', 'text', item.projectName || '', (v) => {
      item.projectName = v;
      this.handleFieldChange();
    }, true));

    editor.appendChild(this.createFormGroup('Role', 'text', item.role || '', (v) => {
      item.role = v;
      this.handleFieldChange();
    }, 'jobTitle'));

    editor.appendChild(this.createFormGroup('URL', 'url', item.demoUrl || '', (v) => {
      item.demoUrl = v;
      this.handleFieldChange();
    }));

    const descGroup = document.createElement('div');
    descGroup.className = 'form-group';
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    descGroup.appendChild(descLabel);
    const descTextarea = document.createElement('textarea');
    descTextarea.rows = 3;
    descTextarea.value = item.summary || '';
    descTextarea.addEventListener('input', (e) => {
      item.summary = e.target.value;
      this.handleFieldChange();
    });
    descGroup.appendChild(descTextarea);
    editor.appendChild(descGroup);

    editor.appendChild(this.createFormGroup('Technologies', 'text', (item.technologies || []).join(', '), (v) => {
      item.technologies = v.split(',').map(t => t.trim()).filter(Boolean);
      this.handleFieldChange();
    }));

    return editor;
  }

  renderSkillEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'skill-editor';

    editor.appendChild(this.createFormGroup('Skill Name', 'text', item.name || '', (v) => {
      item.name = v;
      this.handleFieldChange();
    }, 'skill'));

    editor.appendChild(this.createSelectGroup('Proficiency', ['Beginner', 'Intermediate', 'Advanced', 'Expert'], item.proficiencyLevel || 'Intermediate', (v) => {
      item.proficiencyLevel = v;
      this.handleFieldChange();
    }));

    return editor;
  }

  renderCertificationEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'certification-editor';

    editor.appendChild(this.createFormGroup('Certification Name', 'text', item.name || '', (v) => {
      item.name = v;
      this.handleFieldChange();
    }, 'certification'));

    editor.appendChild(this.createFormGroup('Issuing Organization', 'text', item.issuingOrganization || '', (v) => {
      item.issuingOrganization = v;
      this.handleFieldChange();
    }, 'company'));

    editor.appendChild(this.createFormGroup('Issue Year', 'number', item.date || '', (v) => {
      item.date = parseInt(v) || null;
      this.handleFieldChange();
    }));

    editor.appendChild(this.createFormGroup('Credential ID', 'text', item.credentialId || '', (v) => {
      item.credentialId = v;
      this.handleFieldChange();
    }));

    return editor;
  }

  renderLanguageEditor(section, item, index) {
    const editor = document.createElement('div');
    editor.className = 'language-editor';

    editor.appendChild(this.createFormGroup('Language', 'text', item.language || '', (v) => {
      item.language = v;
      this.handleFieldChange();
    }, 'language'));

    editor.appendChild(this.createSelectGroup('Proficiency', ['Elementary', 'Limited Working', 'Professional Working', 'Full Professional', 'Native'], item.proficiency || 'Professional Working', (v) => {
      item.proficiency = v;
      this.handleFieldChange();
    }));

    return editor;
  }

  renderGenericEditor(section, item, index) {
    const editor = document.createElement('div');
    const msg = document.createElement('p');
    msg.textContent = 'Generic editor for this section type.';
    editor.appendChild(msg);
    return editor;
  }

  renderPreview() {
    const panel = document.createElement('div');
    panel.className = 'editor-preview-panel';

    // Zoom controls
    const controls = document.createElement('div');
    controls.className = 'preview-controls';

    const fitWidthBtn = document.createElement('button');
    fitWidthBtn.className = 'btn-sm';
    fitWidthBtn.textContent = 'Fit Width';
    fitWidthBtn.addEventListener('click', () => {
      this.zoomLevel = 'fit';
      this.updatePreview();
    });
    controls.appendChild(fitWidthBtn);

    const actualSizeBtn = document.createElement('button');
    actualSizeBtn.className = 'btn-sm';
    actualSizeBtn.textContent = 'Actual Size';
    actualSizeBtn.addEventListener('click', () => {
      this.zoomLevel = 100;
      this.updatePreview();
    });
    controls.appendChild(actualSizeBtn);

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'btn-sm';
    zoomOutBtn.textContent = '−';
    zoomOutBtn.addEventListener('click', () => {
      if (typeof this.zoomLevel === 'number') {
        this.zoomLevel = Math.max(25, this.zoomLevel - 10);
        this.updatePreview();
      }
    });
    controls.appendChild(zoomOutBtn);

    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'btn-sm';
    zoomInBtn.textContent = '+';
    zoomInBtn.addEventListener('click', () => {
      if (typeof this.zoomLevel === 'number') {
        this.zoomLevel = Math.min(200, this.zoomLevel + 10);
        this.updatePreview();
      }
    });
    controls.appendChild(zoomInBtn);

    const pageSizeLabel = document.createElement('span');
    pageSizeLabel.className = 'page-size-label';
    pageSizeLabel.textContent = this.document.design.pageSize;
    controls.appendChild(pageSizeLabel);

    // Design button — opens Design Studio drawer
    const designBtn = document.createElement('button');
    designBtn.className = 'btn-sm design-toggle-btn';
    designBtn.textContent = '🎨 Design';
    designBtn.title = 'Open Design Studio';
    designBtn.addEventListener('click', () => {
      this.openDesignStudio();
    });
    controls.appendChild(designBtn);

    panel.appendChild(controls);

    // Preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';

    const paper = document.createElement('div');
    paper.className = 'preview-paper';
    paper.dataset.pageSize = this.document.design.pageSize;

    const content = document.createElement('div');
    content.className = 'preview-content';
    content.innerHTML = '<p class="preview-loading">Loading preview...</p>';

    paper.appendChild(content);
    previewContainer.appendChild(paper);
    panel.appendChild(previewContainer);

    return panel;
  }

  renderRightPanel() {
    const panel = document.createElement('div');
    panel.className = 'editor-right-panel';

    // Writing tips
    const tipsSection = document.createElement('div');
    tipsSection.className = 'tips-section';

    const tipsTitle = document.createElement('h4');
    tipsTitle.textContent = 'Writing Tips';
    tipsSection.appendChild(tipsTitle);

    const tipsContent = document.createElement('div');
    tipsContent.className = 'tips-content';

    const initTips = getTipsForSection(this.activeSection || 'general');
    if (initTips && initTips.tips && initTips.tips.length > 0) {
      const titleEl = document.createElement('div');
      titleEl.className = 'tips-section-name';
      titleEl.textContent = initTips.title;
      tipsContent.appendChild(titleEl);
      const tipsList = document.createElement('ul');
      tipsList.className = 'tips-list';
      initTips.tips.slice(0, 6).forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        tipsList.appendChild(li);
      });
      tipsContent.appendChild(tipsList);
    } else {
      const noTips = document.createElement('p');
      noTips.textContent = 'Click on a section to see relevant writing tips.';
      tipsContent.appendChild(noTips);
    }

    tipsSection.appendChild(tipsContent);
    panel.appendChild(tipsSection);

    // Completion progress
    const progressSection = document.createElement('div');
    progressSection.className = 'progress-section';

    const progressTitle = document.createElement('h4');
    progressTitle.textContent = 'Completion';
    progressSection.appendChild(progressTitle);

    const progress = this.calculateProgress();
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.id = 'cc-progress-fill';
    progressFill.style.width = `${progress}%`;
    progressBar.appendChild(progressFill);
    progressSection.appendChild(progressBar);

    const progressText = document.createElement('p');
    progressText.id = 'cc-progress-text';
    progressText.textContent = `${progress}% complete`;
    progressSection.appendChild(progressText);

    panel.appendChild(progressSection);

    // Suggestions toggle
    const suggestSection = document.createElement('div');
    suggestSection.className = 'suggestions-toggle-section';

    const suggestTitle = document.createElement('h4');
    suggestTitle.textContent = 'Smart Suggestions';
    suggestSection.appendChild(suggestTitle);

    const suggestRow = document.createElement('div');
    suggestRow.className = 'd-flex items-center justify-between gap-2';
    suggestRow.style.marginBottom = '0.5rem';

    const suggestLabel = document.createElement('span');
    suggestLabel.style.fontSize = '0.8125rem';
    suggestLabel.style.color = 'var(--text-secondary)';
    suggestLabel.textContent = 'Online company logos & data';

    const suggestToggle = document.createElement('label');
    suggestToggle.className = 'toggle-switch';
    const suggestInput = document.createElement('input');
    suggestInput.type = 'checkbox';
    suggestInput.checked = localStorage.getItem('cc_online_suggestions') !== 'false';
    suggestInput.addEventListener('change', (e) => {
      localStorage.setItem('cc_online_suggestions', String(e.target.checked));
      statusText.textContent = e.target.checked ? (navigator.onLine ? '🟢 Online mode' : '🟡 Offline (no internet)') : '🔵 Local only';
    });
    const suggestSlider = document.createElement('span');
    suggestSlider.className = 'toggle-slider';
    suggestToggle.appendChild(suggestInput);
    suggestToggle.appendChild(suggestSlider);

    suggestRow.appendChild(suggestLabel);
    suggestRow.appendChild(suggestToggle);
    suggestSection.appendChild(suggestRow);

    const statusText = document.createElement('p');
    statusText.style.fontSize = '0.75rem';
    statusText.style.color = 'var(--text-muted)';
    const isOnline = localStorage.getItem('cc_online_suggestions') !== 'false';
    statusText.textContent = isOnline ? (navigator.onLine ? '🟢 Online mode' : '🟡 Offline (no internet)') : '🔵 Local only';
    suggestSection.appendChild(statusText);

    const suggestHelp = document.createElement('p');
    suggestHelp.style.fontSize = '0.6875rem';
    suggestHelp.style.color = 'var(--text-muted)';
    suggestHelp.style.marginTop = '0.25rem';
    suggestHelp.textContent = 'Local suggestions always available. Online adds company logos from Clearbit.';
    suggestSection.appendChild(suggestHelp);

    panel.appendChild(suggestSection);

    // Grammar Check section
    const grammarSection = document.createElement('div');
    grammarSection.className = 'grammar-section';

    const grammarTitle = document.createElement('h4');
    grammarTitle.textContent = 'Grammar Check';
    grammarSection.appendChild(grammarTitle);

    const grammarContent = document.createElement('div');
    grammarContent.className = 'grammar-content';

    const grammarBtn = document.createElement('button');
    grammarBtn.className = 'btn btn-sm btn-primary';
    grammarBtn.textContent = '🔍 Check Grammar';
    grammarBtn.style.width = '100%';
    grammarBtn.addEventListener('click', async () => {
      grammarContent.innerHTML = '';
      const loadingMsg = document.createElement('p');
      loadingMsg.style.cssText = 'font-size:var(--font-size-sm);color:var(--text-secondary);text-align:center;padding:var(--space-3) 0;';
      loadingMsg.textContent = 'Checking grammar...';
      grammarContent.appendChild(loadingMsg);

      try {
        const { AiFormatter } = await import('./ai-formatter.js');
        const ai = new AiFormatter(AiFormatter.getApiKey());
        const issues = await ai.checkGrammar(this.document);

        grammarContent.innerHTML = '';

        if (!issues || issues.length === 0) {
          const noIssues = document.createElement('p');
          noIssues.style.cssText = 'font-size:var(--font-size-sm);color:var(--color-success);text-align:center;padding:var(--space-3) 0;';
          noIssues.textContent = '✅ No grammar issues found!';
          grammarContent.appendChild(noIssues);
          return;
        }

        // Apply All button
        const applyAllBtn = document.createElement('button');
        applyAllBtn.className = 'btn btn-sm btn-primary';
        applyAllBtn.textContent = 'Apply All';
        applyAllBtn.style.cssText = 'width:100%;margin-bottom:var(--space-3);';
        applyAllBtn.addEventListener('click', () => {
          let applied = 0;
          issues.forEach(issue => {
            if (this._applyAiSuggestion(issue.original, issue.suggestion)) applied++;
          });
          if (applied > 0) {
            this.handleFieldChange();
            this.updatePreview();
          }
          applyAllBtn.textContent = `Applied ${applied} of ${issues.length} fixes`;
          applyAllBtn.disabled = true;
          // Disable individual apply buttons
          grammarContent.querySelectorAll('.grammar-apply-btn').forEach(b => { b.disabled = true; });
        });
        grammarContent.appendChild(applyAllBtn);

        issues.forEach((issue, idx) => {
          const card = document.createElement('div');
          card.style.cssText = 'border:1px solid var(--border-primary);border-radius:var(--radius-md);padding:var(--space-2);margin-bottom:var(--space-2);font-size:var(--font-size-xs);';

          const msg = document.createElement('p');
          msg.style.cssText = 'margin-bottom:var(--space-1);color:var(--text-primary);font-weight:500;';
          msg.textContent = issue.message || 'Grammar issue';
          card.appendChild(msg);

          const origEl = document.createElement('p');
          origEl.style.cssText = 'margin-bottom:var(--space-1);';
          const origStrike = document.createElement('s');
          origStrike.style.color = 'var(--color-danger, #e53e3e)';
          origStrike.textContent = issue.original || '';
          origEl.appendChild(origStrike);
          card.appendChild(origEl);

          const sugEl = document.createElement('p');
          sugEl.style.cssText = 'margin-bottom:var(--space-1);color:var(--color-success, #38a169);';
          sugEl.textContent = issue.suggestion || '';
          card.appendChild(sugEl);

          const applyBtn = document.createElement('button');
          applyBtn.className = 'btn btn-sm grammar-apply-btn';
          applyBtn.textContent = 'Apply';
          applyBtn.style.cssText = 'font-size:var(--font-size-xs);';
          applyBtn.addEventListener('click', () => {
            if (this._applyAiSuggestion(issue.original, issue.suggestion)) {
              this.handleFieldChange();
              this.updatePreview();
              applyBtn.textContent = 'Applied';
              applyBtn.disabled = true;
              card.style.opacity = '0.5';
            } else {
              applyBtn.textContent = 'N/A';
              applyBtn.disabled = true;
              applyBtn.style.opacity = '0.5';
            }
          });
          card.appendChild(applyBtn);

          grammarContent.appendChild(card);
        });
      } catch (err) {
        grammarContent.innerHTML = '';
        const errMsg = document.createElement('p');
        errMsg.style.cssText = 'font-size:var(--font-size-sm);color:var(--color-danger, #e53e3e);';
        errMsg.textContent = 'Grammar check failed: ' + (err.message || 'Unknown error');
        grammarContent.appendChild(errMsg);
      }
    });

    grammarContent.appendChild(grammarBtn);
    grammarSection.appendChild(grammarContent);
    panel.appendChild(grammarSection);

    // ATS Check — functional
    if (this.atsChecker) {
      const atsSection = document.createElement('div');
      atsSection.className = 'ats-section';

      const atsTitle = document.createElement('h4');
      atsTitle.textContent = 'ATS Optimization';
      atsSection.appendChild(atsTitle);

      const atsContent = document.createElement('div');
      atsContent.className = 'ats-content';

      // ATS Mode toggle row
      const toggleRow = document.createElement('div');
      toggleRow.className = 'ats-mode-toggle-row';

      const toggleLabel = document.createElement('div');
      toggleLabel.className = 'ats-mode-toggle-label';

      const labelText = document.createElement('span');
      labelText.textContent = 'ATS-Safe Mode';
      toggleLabel.appendChild(labelText);

      const isAtsOn = !!this.document.settings.atsMode;
      const statusText = document.createElement('span');
      statusText.id = 'ats-mode-status';
      statusText.className = isAtsOn ? 'ats-mode-status ats-mode-on' : 'ats-mode-status ats-mode-off';
      statusText.textContent = isAtsOn ? 'ON' : 'OFF';
      toggleLabel.appendChild(statusText);

      toggleRow.appendChild(toggleLabel);

      const toggleSwitch = document.createElement('label');
      toggleSwitch.className = 'ats-mode-switch';
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.id = 'ats-mode-sidebar-toggle';
      toggleInput.checked = isAtsOn;
      toggleInput.addEventListener('change', () => { this.toggleAtsMode(); });
      toggleSwitch.appendChild(toggleInput);
      const toggleSlider = document.createElement('span');
      toggleSlider.className = 'ats-mode-slider';
      toggleSwitch.appendChild(toggleSlider);
      toggleRow.appendChild(toggleSwitch);

      atsContent.appendChild(toggleRow);

      const modeHint = document.createElement('p');
      modeHint.className = 'ats-mode-hint';
      modeHint.textContent = 'Enforces single column, safe fonts, and simple formatting for ATS parsers.';
      atsContent.appendChild(modeHint);

      // Divider
      const divider = document.createElement('hr');
      divider.style.cssText = 'border:none;border-top:1px solid var(--border-primary);margin:var(--space-3) 0;';
      atsContent.appendChild(divider);

      // Results container (separate from toggle so runAtsCheck doesn't wipe the toggle)
      const atsResultsArea = document.createElement('div');
      atsResultsArea.id = 'ats-results-container';

      // Run ATS Check button
      const runBtn = document.createElement('button');
      runBtn.className = 'btn btn-sm btn-primary';
      runBtn.textContent = 'Run ATS Check';
      runBtn.style.width = '100%';
      runBtn.addEventListener('click', () => { this.runAtsCheck(); });
      atsResultsArea.appendChild(runBtn);

      const hint = document.createElement('p');
      hint.textContent = 'Analyze your resume for ATS compatibility issues.';
      hint.style.cssText = 'font-size:var(--font-size-xs);color:var(--text-muted);margin-top:var(--space-2);';
      atsResultsArea.appendChild(hint);

      atsContent.appendChild(atsResultsArea);

      atsSection.appendChild(atsContent);
      panel.appendChild(atsSection);
    }

    return panel;
  }

  renderMobileNav() {
    const nav = document.createElement('div');
    nav.className = 'mobile-nav';

    const tabs = [
      { id: 'edit', label: 'Edit', icon: '✏️' },
      { id: 'preview', label: 'Preview', icon: '👁' },
      { id: 'design', label: 'Design', icon: '🎨' },
      { id: 'export', label: 'Export', icon: '📤' }
    ];

    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'mobile-nav-btn';
      btn.dataset.active = this.mobileView === tab.id;
      btn.setAttribute('aria-label', tab.label);
      btn.innerHTML = `<span class="icon">${tab.icon}</span><span class="label">${tab.label}</span>`;
      btn.addEventListener('click', () => {
        this.mobileView = tab.id;
        this.updateMobileView();
      });
      nav.appendChild(btn);
    });

    // Quick actions: Save (with live status) + Export PDF — no tab switching needed
    const saveBtn = document.createElement('button');
    saveBtn.className = 'mobile-nav-btn mobile-nav-save';
    saveBtn.setAttribute('aria-label', 'Save now');
    saveBtn.innerHTML = `<span class="icon">💾</span><span class="label">${this.getSaveStatusText() || 'Save'}</span>`;
    saveBtn.addEventListener('click', () => this.saveDocument());
    nav.appendChild(saveBtn);

    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'mobile-nav-btn';
    pdfBtn.setAttribute('aria-label', 'Export PDF');
    pdfBtn.innerHTML = `<span class="icon">🖨️</span><span class="label">PDF</span>`;
    pdfBtn.addEventListener('click', () => this.handleExport('pdf'));
    nav.appendChild(pdfBtn);

    return nav;
  }

  // Helper methods for form creation
  createFormGroup(label, type, value, onChange, requiredOrAutocomplete, autocompleteField) {
    const group = document.createElement('div');
    group.className = 'form-group';

    let required = false;
    let acField = autocompleteField;
    if (typeof requiredOrAutocomplete === 'boolean') {
      required = requiredOrAutocomplete;
    } else if (typeof requiredOrAutocomplete === 'string') {
      acField = requiredOrAutocomplete;
    }

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    if (required) {
      const req = document.createElement('span');
      req.className = 'required';
      req.textContent = '*';
      labelEl.appendChild(req);
    }
    group.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-input';
    input.value = value || '';
    input.addEventListener('input', (e) => onChange(e.target.value));
    group.appendChild(input);

    if (acField) {
      import('./autocomplete.js').then(({ Autocomplete }) => {
        Autocomplete.attach(input, acField, {
          onSelect: (val) => onChange(val)
        });
      }).catch(() => {});
    }

    return group;
  }

  createSelectGroup(label, options, value, onChange) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const select = document.createElement('select');
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      option.selected = value === opt;
      select.appendChild(option);
    });
    select.addEventListener('change', (e) => onChange(e.target.value));
    group.appendChild(select);

    return group;
  }

  // Data management
  async loadDocument() {
    try {
      const doc = await this.db.get('documents', this.documentId);
      if (doc) {
        this.document = this.normalizeDocument(doc);
        this.expandedSections.add('personal-info');
        if (this.document.type === 'coverLetter') {
          this.expandedSections.add('cover-letter');
        }
        this.pushHistory();
      } else {
        this.document = this.normalizeDocument(createEmptyDocument());
        await this.saveDocument();
      }
    } catch (error) {
      console.error('Error loading document:', error);
      this.document = this.normalizeDocument(createEmptyDocument());
    }
  }

  normalizeDocument(doc) {
    // Ensure document has expected structure for editor
    if (!doc.metadata) {
      doc.metadata = {
        title: doc.name || 'Untitled Resume',
        lastModified: doc.lastModified,
        createdAt: doc.createdAt
      };
    }
    if (!doc.design) {
      doc.design = {};
    }
    doc.design.template = doc.design.template || doc.templateId || 'ats-essential';
    doc.design.pageSize = doc.design.pageSize || doc.pageSize || 'A4';
    if (!doc.design.fontFamily) doc.design.fontFamily = doc.design.fontFamily || 'Arial';
    if (!doc.design.fontSize) doc.design.fontSize = doc.design.fontSize || 11;
    if (!doc.design.nameSize) doc.design.nameSize = doc.design.nameSize || 22;
    if (!doc.design.headingSize) doc.design.headingSize = doc.design.headingSize || 14;
    if (!doc.design.lineHeight) doc.design.lineHeight = doc.design.lineHeight || 1.4;
    if (!doc.design.accentColor) doc.design.accentColor = doc.design.accentColor || '#2563eb';
    if (!doc.design.textColor) doc.design.textColor = doc.design.textColor || '#222222';
    if (!doc.design.sectionSpacing) doc.design.sectionSpacing = doc.design.sectionSpacing || 16;
    if (!doc.design.paragraphSpacing) doc.design.paragraphSpacing = doc.design.paragraphSpacing || 8;
    if (!doc.settings) {
      doc.settings = {
        atsMode: doc.atsMode || false
      };
    }
    if (!doc.sections) {
      doc.sections = [];
    }
    if (!doc.personalInfo) {
      doc.personalInfo = {};
    }
    return doc;
  }

  async saveDocument() {
    if (this.saveStatus === 'saving') return;

    this.saveStatus = 'saving';
    this.updateSaveStatus();

    try {
      // Sync metadata back to flat structure for storage
      const now = new Date().toISOString();
      this.document.lastModified = now;
      if (this.document.metadata) {
        this.document.name = this.document.metadata.title || 'Untitled Resume';
        this.document.metadata.lastModified = now;
      }
      if (this.document.design) {
        this.document.templateId = this.document.design.template;
        this.document.pageSize = this.document.design.pageSize;
      }
      if (this.document.settings) {
        this.document.atsMode = this.document.settings.atsMode;
      }

      await this.db.put('documents', this.document);
      this.saveStatus = 'saved';
      this.lastSaveTime = Date.now();
      this.events.emit('document:saved', { documentId: this.documentId });
    } catch (error) {
      console.error('Error saving document:', error);
      this.saveStatus = 'unsaved';
      this._saveRetryCount = (this._saveRetryCount || 0) + 1;
      if (this._saveRetryCount <= 3) {
        setTimeout(() => this.saveDocument(), 2000 * this._saveRetryCount);
      }
      this.events.emit('document:save-error', { documentId: this.documentId, error });
    }

    if (this.saveStatus === 'saved') {
      this._saveRetryCount = 0;
    }
    this.updateSaveStatus();
  }

  // Field change handling
  handleFieldChange() {
    this.markUnsaved();
    this.schedulePushHistory();
    this.scheduleAutosave();
    this.schedulePreviewUpdate();
    this.updateProgressBar();
  }

  schedulePushHistory() {
    if (this._historyTimer) clearTimeout(this._historyTimer);
    this._historyTimer = setTimeout(() => {
      this.pushHistory();
    }, 500);
  }

  markUnsaved() {
    if (this.saveStatus !== 'unsaved') {
      this.saveStatus = 'unsaved';
      this.updateSaveStatus();
    }
  }

  scheduleAutosave() {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = setTimeout(() => {
      this.handleSave();
    }, AUTOSAVE_DELAY);
  }

  schedulePreviewUpdate() {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    this.previewTimer = setTimeout(() => {
      this.updatePreview();
    }, PREVIEW_DELAY);
  }

  async handleSave() {
    await this.saveDocument();
    this.updatePreview();
  }

  // History management
  pushHistory() {
    const state = JSON.parse(JSON.stringify(this.document));

    // Truncate redo stack when making a new change
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(state);
    this.historyIndex = this.history.length - 1;

    // Trim oldest entries if over max
    while (this.history.length > MAX_HISTORY) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateHistoryButtons();
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  handleUndo() {
    if (!this.canUndo()) return;

    this.historyIndex--;
    this.document = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    this.updatePreview();
    this.refreshLeftPanel();
    this.updateHistoryButtons();
    this.markUnsaved();
    this.scheduleAutosave();
  }

  handleRedo() {
    if (!this.canRedo()) return;

    this.historyIndex++;
    this.document = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    this.updatePreview();
    this.refreshLeftPanel();
    this.updateHistoryButtons();
    this.markUnsaved();
    this.scheduleAutosave();
  }

  updateHistoryButtons() {
    if (this.toolbarEl) {
      const undoBtn = this.toolbarEl.querySelector('.toolbar-history button:first-child');
      const redoBtn = this.toolbarEl.querySelector('.toolbar-history button:last-child');
      if (undoBtn) undoBtn.disabled = !this.canUndo();
      if (redoBtn) redoBtn.disabled = !this.canRedo();
    }
  }

  // UI updates
  updateSaveStatus() {
    if (this.toolbarEl) {
      const statusEl = this.toolbarEl.querySelector('.save-status');
      if (statusEl) {
        statusEl.dataset.status = this.saveStatus;
        statusEl.textContent = this.getSaveStatusText();
      }
    }
    // Keep the mobile bottom-bar save button in sync
    if (this.container) {
      const label = this.container.querySelector('.mobile-nav-save .label');
      if (label) label.textContent = this.saveStatus === 'saved' ? 'Saved ✓' : this.getSaveStatusText() || 'Save';
    }
  }

  getSaveStatusText() {
    switch (this.saveStatus) {
      case 'saved':
        return this.lastSaveTime ? `Saved ${timeAgo(this.lastSaveTime)}` : 'Saved';
      case 'saving':
        return 'Saving...';
      case 'unsaved':
        return 'Unsaved changes';
      default:
        return '';
    }
  }

  updatePreview() {
    if (!this.previewEl) return;

    const paper = this.previewEl.querySelector('.preview-paper');
    const content = this.previewEl.querySelector('.preview-content');

    if (!paper || !content) return;

    try {
      const html = this.templateEngine.render(
        this.document.design.template,
        this.document,
        this.document.design
      );
      content.innerHTML = html;

      // Update page size label and paper data attribute
      const pageSizeLabel = this.previewEl.querySelector('.page-size-label');
      if (pageSizeLabel) {
        pageSizeLabel.textContent = this.document.design.pageSize || 'A4';
      }
      paper.dataset.pageSize = this.document.design.pageSize || 'A4';

      // Update ATS mode visual on toolbar
      if (this.toolbarEl) {
        const atsBtn = this.toolbarEl.querySelector('.ats-toggle');
        if (atsBtn) {
          atsBtn.dataset.active = String(this.document.settings.atsMode);
          atsBtn.classList.toggle('active', this.document.settings.atsMode);
        }
      }

      // Apply zoom
      if (this.zoomLevel === 'fit') {
        paper.style.transform = '';
        paper.style.transformOrigin = '';
      } else {
        const scale = this.zoomLevel / 100;
        paper.style.transform = `scale(${scale})`;
        paper.style.transformOrigin = 'top center';
      }

      // Mobile preview scaling
      if (window.innerWidth <= 768) {
        const paperW = paper.clientWidth || window.innerWidth;
        const contentW = content.scrollWidth || 794;
        if (contentW > paperW) {
          content.style.setProperty('--preview-zoom', (paperW / contentW).toFixed(4));
        } else {
          content.style.setProperty('--preview-zoom', '1');
        }
      } else {
        content.style.removeProperty('--preview-zoom');
      }
    } catch (error) {
      console.error('Error rendering preview:', error);
      content.innerHTML = '<p class="preview-error">Error rendering preview</p>';
    }
  }

  toggleAtsMode() {
    this.document.settings.atsMode = !this.document.settings.atsMode;
    const isOn = this.document.settings.atsMode;

    // Update toolbar button
    const atsBtn = this.toolbarEl?.querySelector('.ats-toggle');
    if (atsBtn) {
      atsBtn.dataset.active = String(isOn);
      atsBtn.classList.toggle('active', isOn);
    }

    // Update sidebar toggle switch
    const sidebarToggle = document.getElementById('ats-mode-sidebar-toggle');
    if (sidebarToggle) sidebarToggle.checked = isOn;

    // Update sidebar status text
    const statusEl = document.getElementById('ats-mode-status');
    if (statusEl) {
      statusEl.textContent = isOn ? 'ON' : 'OFF';
      statusEl.className = isOn ? 'ats-mode-status ats-mode-on' : 'ats-mode-status ats-mode-off';
    }

    if (isOn) {
      this.enforceAtsSafeRestrictions();
    } else {
      this.restoreFromAtsMode();
    }

    this.markUnsaved();
    this.scheduleAutosave();
    this.updatePreview();
    this.refreshLeftPanel();
  }

  refreshLeftPanel() {
    if (!this.leftPanelEl || !this.mainContentEl) return;

    const scrollTop = this.leftPanelEl.scrollTop;
    const newPanel = this.renderLeftPanel();
    this.mainContentEl.replaceChild(newPanel, this.leftPanelEl);
    this.leftPanelEl = newPanel;
    newPanel.scrollTop = scrollTop;
  }

  refreshToolbar() {
    if (!this.toolbarEl || !this.container) return;

    const newToolbar = this.renderToolbar();
    this.container.replaceChild(newToolbar, this.toolbarEl);
    this.toolbarEl = newToolbar;
  }

  updateMobileView() {
    if (this.container) {
      this.container.dataset.mobileView = this.mobileView;

      const navBtns = this.container.querySelectorAll('.mobile-nav-btn');
      navBtns.forEach(btn => {
        const isActive = btn.textContent.toLowerCase().includes(this.mobileView);
        btn.dataset.active = isActive;
      });
    }
  }

  updateCharCount(textarea) {
    const group = textarea.closest('.form-group, .text-section-editor');
    if (group) {
      const charCountEl = group.querySelector('.char-count');
      if (charCountEl) {
        charCountEl.textContent = `${charCount(textarea.value)} characters`;
      }
    }
  }

  // Section and entry management
  toggleSection(sectionId) {
    if (this.expandedSections.has(sectionId)) {
      this.expandedSections.delete(sectionId);
    } else {
      this.expandedSections.add(sectionId);
      // Track active section type for writing tips
      const sec = this.document.sections.find(s => s.id === sectionId);
      this.activeSection = sec ? (sec.sectionType || sec.type || 'general') : sectionId;
      this.refreshRightPanelTips();
    }
  }

  toggleEntry(sectionId, entryId) {
    if (!this.expandedEntries.has(sectionId)) {
      this.expandedEntries.set(sectionId, new Set());
    }
    const entries = this.expandedEntries.get(sectionId);
    if (entries.has(entryId)) {
      entries.delete(entryId);
    } else {
      entries.add(entryId);
    }
  }

  isEntryExpanded(sectionId, entryId) {
    return this.expandedEntries.has(sectionId) && this.expandedEntries.get(sectionId).has(entryId);
  }

  moveSection(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= this.document.sections.length) return;
    const section = this.document.sections[fromIndex];
    this.document.sections.splice(fromIndex, 1);
    this.document.sections.splice(toIndex, 0, section);
    this.handleFieldChange();
    this.refreshLeftPanel();
  }

  showSectionActionsMenu(button, section, index) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const actions = [
      { label: '⬆ Move to Top', handler: () => this.moveSection(index, 0), disabled: index === 0 },
      { label: '▲ Move Up', handler: () => this.moveSection(index, index - 1), disabled: index === 0 },
      { label: '▼ Move Down', handler: () => this.moveSection(index, index + 1), disabled: index >= this.document.sections.length - 1 },
      { label: '⬇ Move to Bottom', handler: () => this.moveSection(index, this.document.sections.length - 1), disabled: index >= this.document.sections.length - 1 },
      { label: '---' },
      { label: section.visible === false ? '👁 Show Section' : '👁‍🗨 Hide Section', handler: () => {
        section.visible = section.visible === false ? true : false;
        this.handleFieldChange();
        this.refreshLeftPanel();
      }},
      { label: '✏️ Rename Section', handler: () => {
        if (window.CC && window.CC.modal) {
          const form = document.createElement('div');
          const input = document.createElement('input');
          input.className = 'form-input';
          input.value = section.title;
          input.maxLength = 50;
          form.appendChild(input);
          window.CC.modal.show({
            title: 'Rename Section',
            body: form,
            size: 'small',
            actions: [
              { label: 'Cancel', type: 'secondary', handler: () => null },
              { label: 'Rename', type: 'primary', handler: () => {
                const name = input.value.trim();
                if (!name) return false;
                section.title = name;
                this.handleFieldChange();
                this.refreshLeftPanel();
                return true;
              }}
            ]
          });
          setTimeout(() => { input.focus(); input.select(); }, 100);
        }
      }},
      { label: '↩ Reset Name', handler: () => {
        const sectionDef = SECTION_TYPES.find(s => s.id === section.sectionType);
        if (sectionDef) {
          section.title = sectionDef.label;
          this.handleFieldChange();
          this.refreshLeftPanel();
        }
      }},
    ];

    // Column assignment (only for 2-column templates, not ATS mode)
    const currentTemplate = this.templateEngine.getById(this.document.design?.template);
    const is2Column = currentTemplate && currentTemplate.columnCount === 2;
    const isAtsMode = this.document.settings?.atsMode;

    if (is2Column && !isAtsMode) {
      actions.push({ label: '---' });
      const currentCol = section.column || 'main';
      if (currentCol === 'main') {
        actions.push({ label: '◫ Move to Sidebar', handler: () => {
          section.column = 'sidebar';
          this.handleFieldChange();
          this.refreshLeftPanel();
        }});
      } else {
        actions.push({ label: '◧ Move to Main Column', handler: () => {
          section.column = 'main';
          this.handleFieldChange();
          this.refreshLeftPanel();
        }});
      }
    } else if (isAtsMode && is2Column) {
      actions.push({ label: '---' });
      actions.push({ label: '◫ Move to Sidebar (disabled in ATS mode)', disabled: true, handler: () => {} });
    }

    // Duplicate section
    actions.push({ label: '---' });
    actions.push({ label: '📄 Duplicate Section', handler: () => {
      const copy = JSON.parse(JSON.stringify(section));
      copy.id = generateId();
      copy.title = section.title + ' (Copy)';
      this.document.sections.splice(index + 1, 0, copy);
      this.handleFieldChange();
      this.refreshLeftPanel();
    }});

    // Page break preference
    actions.push({ label: section.pageBreakBefore ? '↩ Remove Page Break Before' : '📃 Page Break Before', handler: () => {
      section.pageBreakBefore = !section.pageBreakBefore;
      this.handleFieldChange();
      this.refreshLeftPanel();
    }});

    // Delete only for custom sections (not built-in types)
    const isBuiltIn = SECTION_TYPES.some(s => s.id === section.sectionType);
    if (!isBuiltIn || section.sectionType === 'custom') {
      actions.push({ label: '---' });
      actions.push({ label: '🗑 Delete Section', handler: () => {
        if (confirm(`Delete "${section.title}"? This cannot be undone.`)) {
          this.document.sections.splice(index, 1);
          this.handleFieldChange();
          this.refreshLeftPanel();
        }
      }});
    }

    actions.forEach(action => {
      if (action.label === '---') {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        menu.appendChild(divider);
        return;
      }
      const item = document.createElement('button');
      item.className = 'context-menu-item';
      item.textContent = action.label;
      if (action.disabled) {
        item.disabled = true;
        item.style.opacity = '0.4';
      }
      item.addEventListener('click', () => {
        menu.remove();
        if (!action.disabled) action.handler();
      });
      menu.appendChild(item);
    });

    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 240))}px`;
    menu.style.maxWidth = 'calc(100vw - 16px)';
    menu.style.maxHeight = '60vh';
    menu.style.overflowY = 'auto';
    menu.style.zIndex = '600';
    menu.style.visibility = 'hidden';

    document.body.appendChild(menu);

    // Measure actual height and flip above button if it would overflow
    const menuH = menu.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    if (spaceBelow >= menuH || spaceBelow >= spaceAbove) {
      menu.style.top = `${rect.bottom + 4}px`;
    } else {
      menu.style.top = `${rect.top - menuH - 4}px`;
    }

    // Clamp to viewport
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 8) {
      menu.style.top = `${window.innerHeight - menuH - 8}px`;
    }
    if (menuRect.top < 8) {
      menu.style.top = '8px';
    }

    menu.style.visibility = '';

    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== button) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  // Section drag-and-drop
  startSectionDrag(e, sectionEl, fromIndex) {
    this._dragState = {
      fromIndex,
      currentIndex: fromIndex,
      sectionEl,
      startY: e.clientY,
      ghost: null,
      indicator: null,
      scrollTimer: null
    };

    // Create ghost element
    const rect = sectionEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'section-drag-ghost';
    ghost.textContent = this.document.sections[fromIndex].title;
    ghost.style.width = rect.width + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = e.clientY - 20 + 'px';
    document.body.appendChild(ghost);
    this._dragState.ghost = ghost;

    // Create drop indicator
    const indicator = document.createElement('div');
    indicator.className = 'section-drop-indicator';
    indicator.style.display = 'none';
    document.body.appendChild(indicator);
    this._dragState.indicator = indicator;

    // Mark source
    sectionEl.classList.add('section-dragging');

    // Bind pointer events
    this._dragMoveHandler = (ev) => this.handleSectionDragMove(ev);
    this._dragEndHandler = (ev) => this.endSectionDrag(ev, false);
    this._dragKeyHandler = (ev) => {
      if (ev.key === 'Escape') this.endSectionDrag(ev, true);
    };

    document.addEventListener('pointermove', this._dragMoveHandler);
    document.addEventListener('pointerup', this._dragEndHandler);
    document.addEventListener('keydown', this._dragKeyHandler);
    document.body.style.userSelect = 'none';
  }

  handleSectionDragMove(e) {
    if (!this._dragState) return;
    const { ghost, indicator } = this._dragState;

    // Move ghost
    ghost.style.top = e.clientY - 20 + 'px';

    // Find drop target
    const panel = this.leftPanelEl;
    if (!panel) return;

    const sectionEls = panel.querySelectorAll('.editor-section[data-section-index]');
    let targetIndex = this._dragState.fromIndex;
    let indicatorY = 0;
    let foundTarget = false;

    sectionEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const idx = parseInt(el.dataset.sectionIndex);

      if (e.clientY < midY && !foundTarget) {
        targetIndex = idx;
        indicatorY = rect.top;
        foundTarget = true;
      } else if (!foundTarget) {
        targetIndex = idx + 1;
        indicatorY = rect.bottom;
      }
    });

    if (targetIndex > this.document.sections.length - 1) {
      targetIndex = this.document.sections.length - 1;
    }

    this._dragState.currentIndex = targetIndex;

    // Show indicator
    if (targetIndex !== this._dragState.fromIndex) {
      const panelRect = panel.getBoundingClientRect();
      indicator.style.display = 'block';
      indicator.style.top = indicatorY + 'px';
      indicator.style.left = panelRect.left + 8 + 'px';
      indicator.style.width = panelRect.width - 16 + 'px';
    } else {
      indicator.style.display = 'none';
    }

    // Edge auto-scroll
    const panelRect = panel.getBoundingClientRect();
    const edgeZone = 40;
    if (e.clientY < panelRect.top + edgeZone) {
      panel.scrollTop -= 8;
    } else if (e.clientY > panelRect.bottom - edgeZone) {
      panel.scrollTop += 8;
    }
  }

  endSectionDrag(e, cancelled) {
    if (!this._dragState) return;
    const { fromIndex, currentIndex, ghost, indicator, sectionEl } = this._dragState;

    // Cleanup
    if (ghost) ghost.remove();
    if (indicator) indicator.remove();
    sectionEl.classList.remove('section-dragging');
    document.removeEventListener('pointermove', this._dragMoveHandler);
    document.removeEventListener('pointerup', this._dragEndHandler);
    document.removeEventListener('keydown', this._dragKeyHandler);
    document.body.style.userSelect = '';

    // Apply move if not cancelled and position changed
    if (!cancelled && currentIndex !== fromIndex) {
      this.moveSection(fromIndex, currentIndex > fromIndex ? currentIndex - 1 : currentIndex);
    }

    this._dragState = null;
  }

  // Keyboard section reordering
  startKeyboardMove(index, handleEl) {
    this._kbMoveState = {
      originalIndex: index,
      currentIndex: index,
      handleEl
    };
    handleEl.classList.add('kb-move-active');
    this.announce(`Moving ${this.document.sections[index].title}. Use arrow keys. Position ${index + 1} of ${this.document.sections.length}.`);
  }

  keyboardMoveStep(direction) {
    if (!this._kbMoveState) return;
    const { currentIndex } = this._kbMoveState;
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= this.document.sections.length) {
      this.announce('Cannot move further.');
      return;
    }

    // Swap in state
    const sections = this.document.sections;
    const temp = sections[currentIndex];
    sections[currentIndex] = sections[newIndex];
    sections[newIndex] = temp;

    this._kbMoveState.currentIndex = newIndex;

    this.refreshLeftPanel();
    this.schedulePreviewUpdate();

    // Re-focus the handle at the new position
    requestAnimationFrame(() => {
      const handles = this.leftPanelEl.querySelectorAll('.section-drag-handle');
      if (handles[newIndex]) {
        handles[newIndex].focus();
        handles[newIndex].classList.add('kb-move-active');
      }
    });

    this.announce(`${this.document.sections[newIndex].title} moved to position ${newIndex + 1} of ${sections.length}.`);
  }

  confirmKeyboardMove() {
    if (!this._kbMoveState) return;
    const { originalIndex, currentIndex, handleEl } = this._kbMoveState;

    handleEl.classList.remove('kb-move-active');

    if (originalIndex !== currentIndex) {
      this.handleFieldChange();
      this.announce(`Section placed at position ${currentIndex + 1}. Saved.`);
    } else {
      this.announce('No change made.');
    }

    this._kbMoveState = null;
  }

  cancelKeyboardMove() {
    if (!this._kbMoveState) return;
    const { originalIndex, currentIndex, handleEl } = this._kbMoveState;

    // Undo any moves by restoring from history
    if (originalIndex !== currentIndex) {
      // Swap back
      const sections = this.document.sections;
      const item = sections.splice(currentIndex, 1)[0];
      sections.splice(originalIndex, 0, item);
      this.refreshLeftPanel();
      this.schedulePreviewUpdate();
    }

    handleEl.classList.remove('kb-move-active');
    this._kbMoveState = null;
    this.announce('Move cancelled. Original order restored.');

    // Re-focus original position
    requestAnimationFrame(() => {
      const handles = this.leftPanelEl.querySelectorAll('.section-drag-handle');
      if (handles[originalIndex]) handles[originalIndex].focus();
    });
  }

  announce(message) {
    let liveRegion = document.getElementById('cc-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'cc-live-region';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  // Entry drag-and-drop
  startEntryDrag(e, cardEl, section, fromIndex) {
    this._entryDragState = { section, fromIndex, currentIndex: fromIndex, cardEl, ghost: null, indicator: null };

    const rect = cardEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'section-drag-ghost';
    ghost.textContent = this.getEntryTitle(section.sectionType, section.items[fromIndex]);
    ghost.style.width = Math.min(rect.width, 250) + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = e.clientY - 16 + 'px';
    document.body.appendChild(ghost);
    this._entryDragState.ghost = ghost;

    const indicator = document.createElement('div');
    indicator.className = 'section-drop-indicator';
    indicator.style.display = 'none';
    document.body.appendChild(indicator);
    this._entryDragState.indicator = indicator;

    cardEl.classList.add('section-dragging');

    this._entryDragMoveH = (ev) => {
      ghost.style.top = ev.clientY - 16 + 'px';
      const cards = cardEl.parentElement.querySelectorAll('.entry-card[data-entry-index]');
      let targetIdx = fromIndex;
      let indY = 0;
      let found = false;
      cards.forEach(el => {
        const r = el.getBoundingClientRect();
        const idx = parseInt(el.dataset.entryIndex);
        if (ev.clientY < r.top + r.height / 2 && !found) { targetIdx = idx; indY = r.top; found = true; }
        else if (!found) { targetIdx = idx + 1; indY = r.bottom; }
      });
      this._entryDragState.currentIndex = Math.min(targetIdx, section.items.length - 1);
      if (this._entryDragState.currentIndex !== fromIndex) {
        const pr = cardEl.parentElement.getBoundingClientRect();
        indicator.style.display = 'block';
        indicator.style.top = indY + 'px';
        indicator.style.left = pr.left + 8 + 'px';
        indicator.style.width = pr.width - 16 + 'px';
      } else {
        indicator.style.display = 'none';
      }
    };
    this._entryDragEndH = () => {
      ghost.remove(); indicator.remove(); cardEl.classList.remove('section-dragging');
      document.removeEventListener('pointermove', this._entryDragMoveH);
      document.removeEventListener('pointerup', this._entryDragEndH);
      document.body.style.userSelect = '';
      const { currentIndex } = this._entryDragState;
      if (currentIndex !== fromIndex) {
        this.moveListItem(section, fromIndex, currentIndex > fromIndex ? currentIndex : currentIndex);
      }
      this._entryDragState = null;
    };
    document.addEventListener('pointermove', this._entryDragMoveH);
    document.addEventListener('pointerup', this._entryDragEndH);
    document.body.style.userSelect = 'none';
  }

  // Entry keyboard reorder
  startEntryKeyboardMove(section, index, handleEl) {
    this._kbEntryMoveState = { section, originalIndex: index, currentIndex: index, handleEl };
    handleEl.classList.add('kb-move-active');
    this.announce(`Moving ${this.getEntryTitle(section.sectionType, section.items[index])}. Position ${index + 1} of ${section.items.length}.`);
  }

  entryKeyboardMoveStep(direction) {
    if (!this._kbEntryMoveState) return;
    const { section, currentIndex } = this._kbEntryMoveState;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= section.items.length) { this.announce('Cannot move further.'); return; }

    const temp = section.items[currentIndex];
    section.items[currentIndex] = section.items[newIndex];
    section.items[newIndex] = temp;
    this._kbEntryMoveState.currentIndex = newIndex;

    this.refreshLeftPanel();
    this.schedulePreviewUpdate();
    requestAnimationFrame(() => {
      const handles = this.leftPanelEl.querySelectorAll(`.entry-card[data-entry-index="${newIndex}"] .entry-drag-handle`);
      if (handles[0]) { handles[0].focus(); handles[0].classList.add('kb-move-active'); }
    });
    this.announce(`Moved to position ${newIndex + 1} of ${section.items.length}.`);
  }

  confirmEntryKeyboardMove() {
    if (!this._kbEntryMoveState) return;
    this._kbEntryMoveState.handleEl.classList.remove('kb-move-active');
    if (this._kbEntryMoveState.originalIndex !== this._kbEntryMoveState.currentIndex) {
      this.handleFieldChange();
      this.announce('Entry placed. Saved.');
    } else { this.announce('No change.'); }
    this._kbEntryMoveState = null;
  }

  cancelEntryKeyboardMove() {
    if (!this._kbEntryMoveState) return;
    const { section, originalIndex, currentIndex, handleEl } = this._kbEntryMoveState;
    if (originalIndex !== currentIndex) {
      const item = section.items.splice(currentIndex, 1)[0];
      section.items.splice(originalIndex, 0, item);
      this.refreshLeftPanel();
      this.schedulePreviewUpdate();
    }
    handleEl.classList.remove('kb-move-active');
    this._kbEntryMoveState = null;
    this.announce('Move cancelled.');
    requestAnimationFrame(() => {
      const handles = this.leftPanelEl.querySelectorAll(`.entry-card[data-entry-index="${originalIndex}"] .entry-drag-handle`);
      if (handles[0]) handles[0].focus();
    });
  }

  // Sidebar width control
  renderSidebarWidthControl() {
    const container = document.createElement('div');
    container.className = 'sidebar-width-control';

    const label = document.createElement('h4');
    label.textContent = 'Sidebar Width';
    label.style.marginBottom = 'var(--space-2)';
    container.appendChild(label);

    const currentWidth = this.document.design?.sidebarWidth || 30; // percentage

    // Slider
    const sliderRow = document.createElement('div');
    sliderRow.className = 'd-flex items-center gap-2';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '20';
    slider.max = '45';
    slider.step = '1';
    slider.value = currentWidth;
    slider.className = 'cc-slider';
    slider.setAttribute('aria-label', `Sidebar width: ${currentWidth}%`);
    slider.setAttribute('aria-valuemin', '20');
    slider.setAttribute('aria-valuemax', '45');
    slider.setAttribute('aria-valuenow', currentWidth);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'sidebar-width-value';
    valueDisplay.textContent = currentWidth + '%';

    this.updateSliderFill(slider);
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      valueDisplay.textContent = val + '%';
      slider.setAttribute('aria-valuenow', val);
      slider.setAttribute('aria-label', `Sidebar width: ${val}%`);
      if (!this.document.design) this.document.design = {};
      this.document.design.sidebarWidth = val;
      this.updateSliderFill(slider);
      this.schedulePreviewUpdate();
    });

    slider.addEventListener('change', () => {
      this.handleFieldChange();
    });

    // Keyboard: Shift+Arrow for larger steps
    slider.addEventListener('keydown', (e) => {
      if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 5 : -5;
        const newVal = Math.max(20, Math.min(45, parseInt(slider.value) + step));
        slider.value = newVal;
        slider.dispatchEvent(new Event('input'));
        slider.dispatchEvent(new Event('change'));
      }
    });

    sliderRow.appendChild(slider);
    sliderRow.appendChild(valueDisplay);
    container.appendChild(sliderRow);

    // Presets
    const presets = document.createElement('div');
    presets.className = 'sidebar-width-presets';

    const presetOptions = [
      { label: 'Narrow', value: 22 },
      { label: 'Balanced', value: 30 },
      { label: 'Wide', value: 38 },
    ];

    presetOptions.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-preset-btn' + (currentWidth === preset.value ? ' active' : '');
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        slider.value = preset.value;
        slider.dispatchEvent(new Event('input'));
        slider.dispatchEvent(new Event('change'));
        presets.querySelectorAll('.sidebar-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      presets.appendChild(btn);
    });

    // Reset
    const resetBtn = document.createElement('button');
    resetBtn.className = 'sidebar-preset-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      slider.value = 30;
      slider.dispatchEvent(new Event('input'));
      slider.dispatchEvent(new Event('change'));
      presets.querySelectorAll('.sidebar-preset-btn').forEach(b => b.classList.remove('active'));
      presets.querySelector('.sidebar-preset-btn:nth-child(2)')?.classList.add('active');
    });
    presets.appendChild(resetBtn);

    container.appendChild(presets);

    return container;
  }

  // Photo control
  renderPhotoControl() {
    const container = document.createElement('div');
    container.className = 'photo-control';

    const label = document.createElement('h4');
    label.textContent = 'Profile Photo';
    label.style.marginBottom = 'var(--space-2)';
    container.appendChild(label);

    if (!this.document.design) this.document.design = {};
    const design = this.document.design;
    const currentSize = design.photoSize || 100;
    const currentShape = design.photoShape || 'circle';
    const currentPhoto = this.document.personalInfo.photograph || null;

    // Photo upload/preview
    const uploadSection = document.createElement('div');
    uploadSection.className = 'photo-upload-section';

    if (currentPhoto) {
      const preview = document.createElement('div');
      preview.className = 'photo-preview';
      const img = document.createElement('img');
      img.src = currentPhoto;
      img.alt = 'Profile photo';
      img.className = 'photo-preview-img';
      img.style.width = currentSize + 'px';
      img.style.height = currentSize + 'px';
      img.style.borderRadius = currentShape === 'circle' ? '50%' : currentShape === 'rounded' ? '12px' : '0';
      img.style.objectFit = 'cover';
      preview.appendChild(img);
      uploadSection.appendChild(preview);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-danger-outline';
      removeBtn.textContent = '✕ Remove Photo';
      removeBtn.style.marginTop = 'var(--space-2)';
      removeBtn.addEventListener('click', () => {
        this.document.personalInfo.photograph = null;
        this.handleFieldChange();
        this.refreshLeftPanel();
        // Re-render photo control in drawer
        const drawer = document.querySelector('.ds-content');
        if (drawer) {
          const photoSec = drawer.querySelector('.photo-control');
          if (photoSec) {
            const newControl = this.renderPhotoControl();
            photoSec.replaceWith(newControl);
          }
        }
      });
      uploadSection.appendChild(removeBtn);
    } else {
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'btn btn-sm btn-outline photo-upload-btn';
      uploadBtn.textContent = '📷 Upload Photo';
      uploadBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            if (window.CC && window.CC.toast) window.CC.toast.show('Photo must be under 2MB', 'error');
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.document.personalInfo.photograph = ev.target.result;
            this.handleFieldChange();
            // Re-render photo control
            const drawer = document.querySelector('.ds-content');
            if (drawer) {
              const photoSec = drawer.querySelector('.photo-control');
              if (photoSec) {
                const newControl = this.renderPhotoControl();
                photoSec.replaceWith(newControl);
              }
            }
          };
          reader.readAsDataURL(file);
        });
        input.click();
      });
      uploadSection.appendChild(uploadBtn);

      const hint = document.createElement('p');
      hint.textContent = 'JPEG, PNG or WebP. Max 2MB. Stored locally.';
      hint.style.fontSize = 'var(--font-size-xs)';
      hint.style.color = 'var(--text-muted)';
      hint.style.marginTop = 'var(--space-1)';
      uploadSection.appendChild(hint);
    }
    container.appendChild(uploadSection);

    // Shape selector
    const shapeRow = document.createElement('div');
    shapeRow.className = 'd-flex items-center gap-2 mb-3';

    const shapeLabel = document.createElement('span');
    shapeLabel.textContent = 'Shape:';
    shapeLabel.style.fontSize = 'var(--font-size-sm)';
    shapeLabel.style.color = 'var(--text-secondary)';
    shapeRow.appendChild(shapeLabel);

    const shapes = [
      { value: 'circle', label: '●', title: 'Circle' },
      { value: 'rounded', label: '▢', title: 'Rounded Square' },
      { value: 'square', label: '■', title: 'Square' },
    ];

    shapes.forEach(shape => {
      const btn = document.createElement('button');
      btn.className = 'photo-shape-btn' + (currentShape === shape.value ? ' active' : '');
      btn.textContent = shape.label;
      btn.title = shape.title;
      btn.setAttribute('aria-label', shape.title);
      btn.addEventListener('click', () => {
        design.photoShape = shape.value;
        this.handleFieldChange();
        shapeRow.querySelectorAll('.photo-shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      shapeRow.appendChild(btn);
    });
    container.appendChild(shapeRow);

    // Size slider
    const sizeRow = document.createElement('div');
    sizeRow.className = 'd-flex items-center gap-2';

    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Size:';
    sizeLabel.style.fontSize = 'var(--font-size-sm)';
    sizeLabel.style.color = 'var(--text-secondary)';
    sizeLabel.style.minWidth = '36px';
    sizeRow.appendChild(sizeLabel);

    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.min = '50';
    sizeSlider.max = '180';
    sizeSlider.step = '5';
    sizeSlider.value = currentSize;
    sizeSlider.className = 'sidebar-width-slider';
    sizeSlider.setAttribute('aria-label', `Photo size: ${currentSize}px`);
    sizeSlider.setAttribute('aria-valuenow', currentSize);

    const sizeValue = document.createElement('span');
    sizeValue.className = 'sidebar-width-value';
    sizeValue.textContent = currentSize + 'px';
    this.updateSliderFill(sizeSlider);

    sizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      sizeValue.textContent = val + 'px';
      sizeSlider.setAttribute('aria-valuenow', val);
      sizeSlider.setAttribute('aria-label', `Photo size: ${val}px`);
      design.photoSize = val;
      this.updateSliderFill(sizeSlider);
      this.schedulePreviewUpdate();
    });

    sizeSlider.addEventListener('change', () => {
      this.handleFieldChange();
    });

    // Keyboard: Shift+Arrow for 20px steps
    sizeSlider.addEventListener('keydown', (e) => {
      if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 20 : -20;
        const newVal = Math.max(50, Math.min(180, parseInt(sizeSlider.value) + step));
        sizeSlider.value = newVal;
        sizeSlider.dispatchEvent(new Event('input'));
        sizeSlider.dispatchEvent(new Event('change'));
      }
    });

    sizeRow.appendChild(sizeSlider);
    sizeRow.appendChild(sizeValue);
    container.appendChild(sizeRow);

    // Reset button
    const resetRow = document.createElement('div');
    resetRow.style.marginTop = 'var(--space-2)';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'sidebar-preset-btn';
    resetBtn.textContent = 'Reset Photo';
    resetBtn.addEventListener('click', () => {
      design.photoSize = 100;
      design.photoShape = 'circle';
      sizeSlider.value = 100;
      sizeSlider.dispatchEvent(new Event('input'));
      sizeSlider.dispatchEvent(new Event('change'));
      shapeRow.querySelectorAll('.photo-shape-btn').forEach(b => b.classList.remove('active'));
      shapeRow.querySelector('.photo-shape-btn')?.classList.add('active');
    });
    resetRow.appendChild(resetBtn);
    container.appendChild(resetRow);

    return container;
  }

  // Popup text editor with formatting toolbar
  // Design Studio Drawer
  openDesignStudio() {
    // Don't open twice
    if (document.querySelector('.design-studio-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'design-studio-overlay';

    const drawer = document.createElement('div');
    drawer.className = 'design-studio-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Design Studio');

    // === HEADER ===
    const header = document.createElement('div');
    header.className = 'ds-header';

    const headerInfo = document.createElement('div');
    headerInfo.className = 'ds-header-info';
    const title = document.createElement('h3');
    title.className = 'ds-title';
    title.textContent = 'Design Studio';
    headerInfo.appendChild(title);
    const tpl = this.templateEngine.getById(this.document.design?.template);
    const tplName = document.createElement('span');
    tplName.className = 'ds-template-name';
    tplName.textContent = tpl ? tpl.name : 'Default';
    headerInfo.appendChild(tplName);
    header.appendChild(headerInfo);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ds-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close (Esc)';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);
    drawer.appendChild(header);

    // === SCROLLABLE CONTENT ===
    const content = document.createElement('div');
    content.className = 'ds-content';

    // Quick Styles section
    const stylesSection = document.createElement('div');
    stylesSection.className = 'ds-section';
    const stylesHeader = document.createElement('h4');
    stylesHeader.className = 'ds-section-title';
    stylesHeader.textContent = '⚡ Quick Styles';
    stylesSection.appendChild(stylesHeader);
    const stylesContent = document.createElement('div');
    stylesSection.appendChild(stylesContent);
    this.populateQuickStylesGroup(stylesContent);
    content.appendChild(stylesSection);

    // Font & Typography section
    const fontSection = document.createElement('div');
    fontSection.className = 'ds-section';
    const fontHeader = document.createElement('h4');
    fontHeader.className = 'ds-section-title';
    fontHeader.textContent = '🔤 Fonts & Typography';
    fontSection.appendChild(fontHeader);

    import('./font-manager.js').then(({ FontManager }) => {
      const fm = new FontManager(this.document.design || {}, (settings) => {
        this.document.design = { ...this.document.design, ...settings };
        this.markUnsaved();
        this.scheduleAutosave();
        this.updatePreview();
      });
      fontSection.appendChild(fm.render());
    }).catch(() => {});
    content.appendChild(fontSection);

    // Photo section
    const photoSection = document.createElement('div');
    photoSection.className = 'ds-section';
    const photoHeader = document.createElement('h4');
    photoHeader.className = 'ds-section-title';
    photoHeader.textContent = '📷 Photo';
    photoSection.appendChild(photoHeader);
    photoSection.appendChild(this.renderPhotoControl());
    content.appendChild(photoSection);

    // Sidebar width (2-column templates only)
    const currentTpl = this.templateEngine.getById(this.document.design?.template);
    if (currentTpl && currentTpl.columnCount === 2 && !this.document.settings?.atsMode) {
      const sidebarSection = document.createElement('div');
      sidebarSection.className = 'ds-section';
      const sidebarHeader = document.createElement('h4');
      sidebarHeader.className = 'ds-section-title';
      sidebarHeader.textContent = '◫ Sidebar';
      sidebarSection.appendChild(sidebarHeader);
      sidebarSection.appendChild(this.renderSidebarWidthControl());
      content.appendChild(sidebarSection);
    }

    drawer.appendChild(content);

    // === FOOTER ===
    const footer = document.createElement('div');
    footer.className = 'ds-footer';

    const undoBtn = document.createElement('button');
    undoBtn.className = 'btn btn-sm btn-ghost';
    undoBtn.textContent = '↶ Undo';
    undoBtn.disabled = !this.canUndo();
    undoBtn.addEventListener('click', () => {
      this.handleUndo();
      undoBtn.disabled = !this.canUndo();
      redoBtn.disabled = !this.canRedo();
      this.updatePreview();
      this.refreshLeftPanel();
    });
    footer.appendChild(undoBtn);

    const redoBtn = document.createElement('button');
    redoBtn.className = 'btn btn-sm btn-ghost';
    redoBtn.textContent = '↷ Redo';
    redoBtn.disabled = !this.canRedo();
    redoBtn.addEventListener('click', () => {
      this.handleRedo();
      undoBtn.disabled = !this.canUndo();
      redoBtn.disabled = !this.canRedo();
      this.updatePreview();
      this.refreshLeftPanel();
    });
    footer.appendChild(redoBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-sm btn-danger-outline';
    resetBtn.textContent = '⟲ Reset';
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all design settings to default? Your content will not be changed.')) return;
      const defaults = { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11, nameSize: 22, headingSize: 13, lineHeight: 1.4, accentColor: '#2563eb', textColor: '#1f2937', sectionSpacing: 16, paragraphSpacing: 8, photoSize: 80, photoShape: 'circle', sidebarWidth: 35 };
      Object.assign(this.document.design || {}, defaults);
      this.handleFieldChange();
      this.updatePreview();
      close();
      if (window.CC && window.CC.toast) window.CC.toast.show('Design settings reset to defaults', 'info');
    });
    footer.appendChild(resetBtn);

    const spacer = document.createElement('div');
    spacer.className = 'ds-footer-spacer';
    footer.appendChild(spacer);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm btn-primary';
    saveBtn.textContent = '💾 Save';
    saveBtn.addEventListener('click', () => {
      this.handleSave();
      });
    footer.appendChild(saveBtn);

    const closeFooterBtn = document.createElement('button');
    closeFooterBtn.className = 'btn btn-sm btn-ghost';
    closeFooterBtn.textContent = '✕ Close';
    closeFooterBtn.addEventListener('click', close);
    footer.appendChild(closeFooterBtn);

    drawer.appendChild(footer);

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    // Keyboard & backdrop
    const keyHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', keyHandler);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    function close() {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      document.removeEventListener('keydown', keyHandler);
    }

    setTimeout(() => closeBtn.focus(), 100);
  }

  updateProgressBar() {
    const progress = this.calculateProgress();
    const fill = this.rightPanelEl && this.rightPanelEl.querySelector('#cc-progress-fill');
    const text = this.rightPanelEl && this.rightPanelEl.querySelector('#cc-progress-text');
    if (fill) fill.style.width = `${progress}%`;
    if (text) text.textContent = `${progress}% complete`;
  }

  refreshRightPanelTips() {
    if (!this.rightPanelEl) return;
    const tipsContent = this.rightPanelEl.querySelector('.tips-content');
    if (!tipsContent) return;

    tipsContent.innerHTML = '';

    // Map editor sectionType to writing-tips keys
    const tipsKeyMap = {
      'summary': 'professionalSummary',
      'objective': 'careerObjective',
      'experience': 'professionalExperience',
      'education': 'education',
      'skills': 'skills',
      'projects': 'projects',
      'certifications': 'certifications',
      'publications': 'publications',
      'volunteer': 'volunteerExperience',
      'languages': 'languages',
      'references': 'references',
      'awards': 'general',
    };
    const tipsKey = tipsKeyMap[this.activeSection] || this.activeSection || 'general';
    const tips = getTipsForSection(tipsKey);

    if (tips && tips.tips && tips.tips.length > 0) {
      const titleEl = document.createElement('div');
      titleEl.className = 'tips-section-name';
      titleEl.textContent = tips.title;
      tipsContent.appendChild(titleEl);

      const tipsList = document.createElement('ul');
      tipsList.className = 'tips-list';
      tips.tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        tipsList.appendChild(li);
      });
      tipsContent.appendChild(tipsList);
    } else {
      const noTips = document.createElement('p');
      noTips.textContent = 'Select a section to see relevant tips.';
      tipsContent.appendChild(noTips);
    }
  }

  updateSliderFill(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    slider.style.background = `linear-gradient(to right, var(--color-primary, #2563eb) 0%, var(--color-primary, #2563eb) ${pct}%, var(--bg-tertiary, #334155) ${pct}%, var(--bg-tertiary, #334155) 100%)`;
  }

  enforceAtsSafeRestrictions() {
    if (!this.document.design) this.document.design = {};
    const design = this.document.design;
    const warnings = [];

    // Save original settings for restore when ATS mode is turned off
    if (!this.document._atsOriginals) {
      this.document._atsOriginals = {
        fontFamily: design.fontFamily,
        fontSize: design.fontSize,
        textColor: design.textColor,
        accentColor: design.accentColor,
        templateId: this.document.templateId,
        sidebarSections: [],
        photoHidden: false
      };
      if (this.document.sections) {
        this.document.sections.forEach(s => {
          if (s.column === 'sidebar') {
            this.document._atsOriginals.sidebarSections.push(s.id);
          }
        });
      }
    }

    // 1. Enforce minimum font size
    if (design.fontSize && design.fontSize < 10) {
      design.fontSize = 10;
      warnings.push('Font size set to 10pt minimum');
    }

    // 2. Enforce safe font family
    const safeFonts = ['Arial', 'Helvetica', 'Calibri', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Cambria', 'Garamond', 'Palatino'];
    const currentFont = (design.fontFamily || '').split(',')[0].trim().replace(/"/g, '');
    const isSafe = safeFonts.some(f => currentFont.toLowerCase() === f.toLowerCase());
    if (!isSafe && currentFont) {
      design.fontFamily = 'Arial, Helvetica, sans-serif';
      warnings.push('Font changed to Arial (ATS-safe)');
    }

    // 3. Reset column assignments to main
    if (this.document.sections) {
      this.document.sections.forEach(s => {
        if (s.column === 'sidebar') {
          s.column = 'main';
          warnings.push(`"${s.title}" moved to single column`);
        }
      });
    }

    // 4. Switch to single-column ATS template if on a multi-column template
    if (this.templateEngine) {
      const currentTpl = this.templateEngine.getById(this.document.templateId);
      if (currentTpl && currentTpl.columnCount > 1) {
        this.document.templateId = 'ats-modern';
        warnings.push('Switched to ATS Modern template (single column)');
      }
    }

    // 5. Enforce readable text contrast
    if (design.textColor) {
      const hex = design.textColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > 180) {
          design.textColor = '#1a1a1a';
          warnings.push('Text color darkened for readability');
        }
      }
    }

    // 6. Neutralize accent color for plain output
    if (design.accentColor && design.accentColor !== '#000000' && design.accentColor !== '#1a1a1a') {
      design.accentColor = '#1a1a1a';
      warnings.push('Accent color set to black (plain formatting)');
    }

    // 7. Hide photo (ATS cannot parse images)
    if (this.document.personalInfo && (this.document.personalInfo.photograph || this.document.personalInfo.photo)) {
      this.document._atsOriginals.photoHidden = true;
      this.document._atsOriginals.photograph = this.document.personalInfo.photograph;
      this.document._atsOriginals.photo = this.document.personalInfo.photo;
      this.document.personalInfo.photograph = '';
      this.document.personalInfo.photo = '';
      warnings.push('Profile photo hidden (ATS cannot read images)');
    }

    if (warnings.length > 0 && window.CC && window.CC.toast) {
      window.CC.toast.show('ATS Mode: ' + warnings.join('. '), 'info', 8000);
    }
  }

  restoreFromAtsMode() {
    const orig = this.document._atsOriginals;
    if (!orig) return;

    const design = this.document.design || {};
    const restored = [];

    if (orig.fontFamily && design.fontFamily !== orig.fontFamily) {
      design.fontFamily = orig.fontFamily;
      restored.push('Font restored');
    }
    if (orig.fontSize && design.fontSize !== orig.fontSize) {
      design.fontSize = orig.fontSize;
    }
    if (orig.textColor) design.textColor = orig.textColor;
    if (orig.accentColor) design.accentColor = orig.accentColor;

    if (orig.templateId && this.document.templateId !== orig.templateId) {
      this.document.templateId = orig.templateId;
      restored.push('Template restored');
    }

    if (orig.sidebarSections && orig.sidebarSections.length > 0 && this.document.sections) {
      this.document.sections.forEach(s => {
        if (orig.sidebarSections.includes(s.id)) {
          s.column = 'sidebar';
        }
      });
      restored.push('Sidebar layout restored');
    }

    if (orig.photoHidden) {
      if (this.document.personalInfo) {
        if (orig.photograph) this.document.personalInfo.photograph = orig.photograph;
        if (orig.photo) this.document.personalInfo.photo = orig.photo;
        restored.push('Photo restored');
      }
    }

    delete this.document._atsOriginals;

    if (restored.length > 0 && window.CC && window.CC.toast) {
      window.CC.toast.show('Original settings restored: ' + restored.join(', '), 'info');
    }
  }

  populateQuickStylesGroup(container) {
    import('../data/typography-presets.js').then(({ typographyPresets }) => {
      container.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = 'preset-grid';

      typographyPresets.forEach(preset => {
        const card = document.createElement('button');
        card.className = 'preset-card';
        card.type = 'button';

        const swatch = document.createElement('div');
        swatch.className = 'preset-swatch';
        swatch.style.fontFamily = preset.preview.font;
        swatch.style.borderLeftColor = preset.preview.color;
        swatch.textContent = 'Aa';
        card.appendChild(swatch);

        const info = document.createElement('div');
        info.className = 'preset-info';
        const name = document.createElement('div');
        name.className = 'preset-name';
        name.textContent = preset.name;
        info.appendChild(name);
        const desc = document.createElement('div');
        desc.className = 'preset-desc';
        desc.textContent = preset.description;
        info.appendChild(desc);
        card.appendChild(info);

        card.addEventListener('click', () => {
          this.applyTypographyPreset(preset);
          grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
        });

        grid.appendChild(card);
      });

      container.appendChild(grid);
    }).catch(() => {
      container.textContent = 'Failed to load presets.';
    });
  }

  applyTypographyPreset(preset) {
    if (!this.document.design) this.document.design = {};
    Object.assign(this.document.design, preset.settings);
    this.handleFieldChange();
    this.updatePreview();
    if (window.CC && window.CC.toast) {
      window.CC.toast.show(`Applied "${preset.name}" style`, 'success');
    }
  }

  openPopupTextEditor(section) {
    const originalContent = section.content || '';
    let isDirty = false;

    const body = document.createElement('div');
    body.className = 'popup-text-editor';

    // Formatting toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'popup-format-toolbar';

    const formatButtons = [
      { cmd: 'bold', icon: 'B', title: 'Bold (Ctrl+B)', style: 'font-weight:bold' },
      { cmd: 'italic', icon: 'I', title: 'Italic (Ctrl+I)', style: 'font-style:italic' },
      { cmd: 'underline', icon: 'U', title: 'Underline (Ctrl+U)', style: 'text-decoration:underline' },
      { cmd: '|' },
      { cmd: 'insertUnorderedList', icon: '• List', title: 'Bullet List' },
      { cmd: 'insertOrderedList', icon: '1. List', title: 'Numbered List' },
      { cmd: '|' },
      { cmd: 'indent', icon: '→', title: 'Indent' },
      { cmd: 'outdent', icon: '←', title: 'Outdent' },
      { cmd: '|' },
      { cmd: 'createLink', icon: '🔗', title: 'Insert Link' },
      { cmd: 'unlink', icon: '🔗̸', title: 'Remove Link' },
      { cmd: '|' },
      { cmd: 'removeFormat', icon: '⊘', title: 'Remove Formatting' },
    ];

    formatButtons.forEach(btn => {
      if (btn.cmd === '|') {
        const sep = document.createElement('span');
        sep.className = 'format-separator';
        toolbar.appendChild(sep);
        return;
      }
      const button = document.createElement('button');
      button.className = 'format-btn';
      button.innerHTML = `<span style="${btn.style || ''}">${btn.icon}</span>`;
      button.title = btn.title;
      button.type = 'button';
      button.setAttribute('aria-label', btn.title);
      button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep focus in editor
        if (btn.cmd === 'createLink') {
          const url = prompt('Enter URL:', 'https://');
          if (url && url.trim() && !url.trim().toLowerCase().startsWith('javascript:')) {
            document.execCommand(btn.cmd, false, url.trim());
          }
        } else {
          document.execCommand(btn.cmd, false, null);
        }
        isDirty = true;
        updateCounts();
      });
      toolbar.appendChild(button);
    });

    body.appendChild(toolbar);

    // Contenteditable editing area
    const editorArea = document.createElement('div');
    editorArea.className = 'popup-text-contenteditable';
    editorArea.setAttribute('contenteditable', 'true');
    editorArea.setAttribute('role', 'textbox');
    editorArea.setAttribute('aria-multiline', 'true');
    editorArea.setAttribute('aria-label', `${section.title} content`);

    // Load content: if plain text convert to HTML, if HTML use as-is
    import('../utils/rich-text-sanitizer.js').catch(() => null).then(mod => {
      if (mod && mod.isHtmlContent && mod.isHtmlContent(originalContent)) {
        editorArea.innerHTML = mod.sanitizeRichText(originalContent);
      } else if (mod && mod.plainTextToHtml) {
        editorArea.innerHTML = mod.plainTextToHtml(originalContent);
      } else {
        editorArea.textContent = originalContent;
      }
    }).catch(() => {
      editorArea.textContent = originalContent;
    });

    if (!originalContent) {
      editorArea.dataset.placeholder = `Write your ${section.title.toLowerCase()} here...`;
    }

    editorArea.addEventListener('input', () => {
      isDirty = true;
      updateCounts();
    });

    body.appendChild(editorArea);

    // Counts
    const countsRow = document.createElement('div');
    countsRow.className = 'popup-text-counts';
    const charEl = document.createElement('span');
    const wordEl = document.createElement('span');
    countsRow.appendChild(charEl);
    countsRow.appendChild(wordEl);
    body.appendChild(countsRow);

    function updateCounts() {
      const text = editorArea.textContent || '';
      charEl.textContent = `${text.length} characters`;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      wordEl.textContent = `${words} words`;
    }
    setTimeout(updateCounts, 200);

    if (window.CC && window.CC.modal) {
      window.CC.modal.show({
        title: `Edit: ${section.title}`,
        body: body,
        size: 'large',
        closable: true,
        actions: [
          {
            label: 'Cancel',
            type: 'secondary',
            handler: () => {
              if (isDirty && !confirm('Discard unsaved changes?')) return false;
              return null;
            }
          },
          {
            label: 'Save',
            type: 'primary',
            handler: () => {
              // Sanitize before saving
              import('../utils/rich-text-sanitizer.js').then(mod => {
                section.content = mod ? mod.sanitizeRichText(editorArea.innerHTML) : editorArea.innerHTML;
              }).catch(() => {
                section.content = editorArea.textContent;
              }).finally(() => {
                section.content = section.content || editorArea.textContent;
                this.handleFieldChange();
                this.refreshLeftPanel();
                if (window.CC.toast) window.CC.toast.show('Content saved', 'success');
              });
              return true;
            }
          }
        ]
      });

      // Attach floating toolbar
      import('./floating-toolbar.js').then(({ FloatingToolbar }) => {
        const floatingTb = new FloatingToolbar();
        floatingTb.attach(editorArea);
        // Clean up when modal closes
        const origClose = window.CC.modal.close.bind(window.CC.modal);
        const patchedClose = function() {
          floatingTb.destroy();
          return origClose();
        };
        // Will be cleaned up when modal DOM is removed
        editorArea._floatingToolbar = floatingTb;
      }).catch(() => {});

      setTimeout(() => { editorArea.focus(); }, 150);
    }
  }

  addListItem(section) {
    let newItem;

    switch (section.sectionType) {
      case 'experience':
        newItem = createWorkExperienceItem();
        break;
      case 'education':
        newItem = createEducationItem();
        break;
      case 'projects':
        newItem = createProjectItem();
        break;
      case 'skills':
        newItem = createSkillItem();
        break;
      case 'certifications':
        newItem = createCertificationItem();
        break;
      case 'languages':
        newItem = createLanguageItem();
        break;
      default:
        newItem = { id: generateId() };
    }

    if (!section.items) {
      section.items = [];
    }

    section.items.push(newItem);
    this.toggleEntry(section.id, newItem.id);
    this.handleFieldChange();
    this.refreshLeftPanel();
  }

  duplicateListItem(section, index) {
    const original = section.items[index];
    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = generateId();
    section.items.splice(index + 1, 0, duplicate);
    this.handleFieldChange();
    this.refreshLeftPanel();
  }

  deleteListItem(section, index) {
    if (confirm('Are you sure you want to delete this item?')) {
      section.items.splice(index, 1);
      this.handleFieldChange();
      this.refreshLeftPanel();
    }
  }

  _applyAiSuggestion(original, suggestion, fieldHint) {
    if (!original || !suggestion || !this.document) return false;
    const origClean = original.trim();
    const origNorm = origClean.toLowerCase().replace(/\s+/g, ' ');
    if (origNorm.length < 2) return false;
    let found = false;

    const matches = (text) => {
      if (!text || typeof text !== 'string') return false;
      const textNorm = text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (textNorm === origNorm) return true;
      if (origNorm.length > 5 && textNorm.includes(origNorm)) return true;
      if (origNorm.length > 5 && origNorm.includes(textNorm) && textNorm.length > origNorm.length * 0.4) return true;
      // Fuzzy: check if 80% of words match
      if (origNorm.length > 10) {
        const origWords = origNorm.split(/\s+/);
        const textWords = textNorm.split(/\s+/);
        const matchCount = origWords.filter(w => textWords.includes(w)).length;
        if (matchCount >= origWords.length * 0.7) return true;
      }
      return false;
    };

    const tryReplace = (obj, key) => {
      if (found || !obj || !obj[key] || typeof obj[key] !== 'string') return;
      const fieldNorm = obj[key].trim().toLowerCase().replace(/\s+/g, ' ');
      if (fieldNorm === origNorm) {
        obj[key] = suggestion.trim();
        found = true;
      } else if (origNorm.length > 5 && fieldNorm.includes(origNorm)) {
        const regex = new RegExp(origClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        obj[key] = obj[key].replace(regex, suggestion.trim());
        found = true;
      } else if (matches(obj[key])) {
        obj[key] = suggestion.trim();
        found = true;
      }
    };

    const trySet = (obj, key) => {
      if (found || !obj) return;
      if (!obj[key] || obj[key].trim() === '') {
        obj[key] = suggestion.trim();
        found = true;
      }
    };

    // Search ALL personalInfo fields
    const pi = this.document.personalInfo;
    if (pi) {
      const piKeys = Object.keys(pi).filter(k => typeof pi[k] === 'string');
      for (const key of piKeys) {
        tryReplace(pi, key);
        if (found) return true;
      }
      // If fieldHint mentions a personalInfo field and it's empty, set it
      if (fieldHint) {
        const hint = fieldHint.toLowerCase();
        if (hint.includes('name') && !pi.fullName) { trySet(pi, 'fullName'); if (found) return true; }
        if (hint.includes('email') && !pi.email) { trySet(pi, 'email'); if (found) return true; }
        if (hint.includes('phone') && !pi.phone) { trySet(pi, 'phone'); if (found) return true; }
        if (hint.includes('title') && !pi.professionalTitle) { trySet(pi, 'professionalTitle'); if (found) return true; }
        if (hint.includes('city') || hint.includes('location')) { trySet(pi, 'city'); if (found) return true; }
        if (hint.includes('linkedin')) { trySet(pi, 'linkedinUrl'); if (found) return true; }
        if (hint.includes('github')) { trySet(pi, 'githubUrl'); if (found) return true; }
        if (hint.includes('website')) { trySet(pi, 'personalWebsite'); if (found) return true; }
      }
    }

    // Search ALL section fields and ALL item fields
    if (this.document.sections) {
      for (const section of this.document.sections) {
        tryReplace(section, 'content');
        if (found) return true;
        tryReplace(section, 'title');
        if (found) return true;
        if (section.items) {
          for (const item of section.items) {
            // Search every string field on the item
            const itemKeys = Object.keys(item).filter(k => typeof item[k] === 'string' && k !== 'id');
            for (const key of itemKeys) {
              tryReplace(item, key);
              if (found) return true;
            }
            // Search arrays (technologies, skillTags, etc.)
            for (const key of Object.keys(item)) {
              if (Array.isArray(item[key])) {
                for (let ai = 0; ai < item[key].length; ai++) {
                  if (typeof item[key][ai] === 'string' && matches(item[key][ai])) {
                    item[key][ai] = suggestion.trim();
                    found = true;
                    return true;
                  }
                }
              }
            }
            // Search achievements
            if (item.achievements && Array.isArray(item.achievements)) {
              for (const ach of item.achievements) {
                if (typeof ach === 'string' && matches(ach)) {
                  const idx = item.achievements.indexOf(ach);
                  item.achievements[idx] = suggestion.trim();
                  found = true;
                  return true;
                }
                if (typeof ach === 'object' && ach) {
                  for (const ak of Object.keys(ach)) {
                    if (typeof ach[ak] === 'string') { tryReplace(ach, ak); if (found) return true; }
                  }
                }
              }
            }
          }
        }
      }
    }

    // If fieldHint suggests creating a missing section/item and nothing was replaced
    if (!found && fieldHint) {
      const hint = fieldHint.toLowerCase();
      // Handle "education missing" — add an education section if none exists
      if (hint.includes('education') && hint.includes('missing')) {
        let eduSection = this.document.sections?.find(s => (s.sectionType || s.type) === 'education');
        if (!eduSection) {
          eduSection = { id: generateId(), sectionType: 'education', type: 'list', title: 'Education', items: [], visible: true, column: 'main', order: this.document.sections.length };
          this.document.sections.push(eduSection);
        }
        eduSection.items.push({ id: generateId(), degree: suggestion.trim(), institution: '', included: true, order: eduSection.items.length });
        return true;
      }
      if (hint.includes('certification') && hint.includes('missing')) {
        let certSection = this.document.sections?.find(s => (s.sectionType || s.type) === 'certifications');
        if (!certSection) {
          certSection = { id: generateId(), sectionType: 'certifications', type: 'list', title: 'Certifications', items: [], visible: true, column: 'main', order: this.document.sections.length };
          this.document.sections.push(certSection);
        }
        certSection.items.push({ id: generateId(), name: suggestion.trim(), issuingOrganization: '', included: true, order: certSection.items.length });
        return true;
      }
      if (hint.includes('skills') && hint.includes('missing')) {
        let skillSection = this.document.sections?.find(s => (s.sectionType || s.type) === 'skills');
        if (!skillSection) {
          skillSection = { id: generateId(), sectionType: 'skills', type: 'list', title: 'Skills', items: [], visible: true, column: 'main', order: this.document.sections.length };
          this.document.sections.push(skillSection);
        }
        suggestion.split(',').map(s => s.trim()).filter(Boolean).forEach((skill, i) => {
          skillSection.items.push({ id: generateId(), name: skill, category: '', included: true, order: skillSection.items.length });
        });
        return true;
      }
    }

    return found;
  }

  moveListItem(section, fromIndex, toIndex) {
    const item = section.items[fromIndex];
    section.items.splice(fromIndex, 1);
    section.items.splice(toIndex, 0, item);
    this.handleFieldChange();
    this.refreshLeftPanel();
  }

  // Menus and dialogs
  showAddSectionMenu(button) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    SECTION_TYPES.forEach(sectionType => {
      const alreadyExists = this.document.sections.some(s => s.sectionType === sectionType.id);

      const item = document.createElement('button');
      item.className = 'context-menu-item';
      item.innerHTML = `${sectionType.icon} ${sectionType.label}`;
      item.disabled = alreadyExists;
      item.addEventListener('click', () => {
        this.addSection(sectionType);
        menu.remove();
      });
      menu.appendChild(item);
    });

    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 200)}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 220))}px`;
    menu.style.maxWidth = 'calc(100vw - 16px)';
    menu.style.maxHeight = '60vh';
    menu.style.overflowY = 'auto';
    menu.style.zIndex = '600';

    document.body.appendChild(menu);

    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== button) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  addSection(sectionType) {
    const newSection = {
      id: generateId(),
      sectionType: sectionType.id,
      title: sectionType.label,
      type: sectionType.type,
      visible: true,
      column: 'main',
      items: sectionType.type === 'list' ? [] : undefined,
      content: sectionType.type === 'text' ? '' : undefined
    };

    this.document.sections.push(newSection);
    this.expandedSections.add(newSection.id);
    this.handleFieldChange();
    this.refreshLeftPanel();
  }

  /** Skeleton placeholder for AI result areas while waiting (role=status for AT). */
  aiLoadingSkeleton(label) {
    return `<div class="cc-skeleton-block" role="status" aria-live="polite" aria-label="${String(label || 'Loading AI results').replace(/"/g, '')}">`
      + `<div class="cc-skeleton cc-skeleton--title"></div>`
      + `<div class="cc-skeleton cc-skeleton--line"></div>`
      + `<div class="cc-skeleton cc-skeleton--line"></div>`
      + `<div class="cc-skeleton cc-skeleton--short"></div></div>`;
  }

  async showSmartFormatter() {
    const existing = document.querySelector('.smart-format-panel');
    if (existing) { existing.remove(); return; }

    const { SmartFormatter } = await import('./smart-formatter.js');
    const formatter = new SmartFormatter();
    const result = formatter.analyze(this.document);

    const overlay = document.createElement('div');
    overlay.className = 'smart-format-overlay';

    const panel = document.createElement('div');
    panel.className = 'smart-format-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'smart-format-header';

    const scoreEl = document.createElement('div');
    scoreEl.className = 'smart-format-score';
    const scoreClass = result.score >= 80 ? 'good' : result.score >= 50 ? 'ok' : 'poor';
    scoreEl.innerHTML = `<span class="smart-format-score-value smart-format-score--${scoreClass}">${result.score}</span><span class="smart-format-score-label">Format Score</span>`;
    header.appendChild(scoreEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'smart-format-title-group';
    titleEl.innerHTML = `<h2 class="smart-format-title">Smart Formatter</h2><p class="smart-format-subtitle">${result.summary.total} issues found · ${result.summary.errors} errors · ${result.summary.warnings} warnings</p>`;
    header.appendChild(titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'smart-format-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Auto-fix button
    if (result.issues.length > 0) {
      const fixBar = document.createElement('div');
      fixBar.className = 'smart-format-fix-bar';
      const fixBtn = document.createElement('button');
      fixBtn.className = 'btn btn-sm btn-primary';
      fixBtn.textContent = '⚡ Auto-Fix All';
      fixBtn.addEventListener('click', () => {
        const count = formatter.applyAutoFixes(this.document);
        this.handleFieldChange();
        if (window.CC?.toast) window.CC.toast.show(`Fixed ${count} formatting issues`, 'success');
        overlay.remove();
        this.showSmartFormatter();
      });
      fixBar.appendChild(fixBtn);
      const fixLabel = document.createElement('span');
      fixLabel.className = 'smart-format-fix-label';
      fixLabel.textContent = 'Fix double spaces, trailing whitespace, and other formatting issues';
      fixBar.appendChild(fixLabel);
      panel.appendChild(fixBar);
    }

    // Issues list
    const list = document.createElement('div');
    list.className = 'smart-format-list';

    if (result.issues.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'smart-format-empty';
      empty.innerHTML = '✅ No formatting issues found!';
      list.appendChild(empty);
    } else {
      const grouped = {};
      result.issues.forEach(issue => {
        const cat = issue.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(issue);
      });

      for (const [cat, issues] of Object.entries(grouped)) {
        const catHeader = document.createElement('div');
        catHeader.className = 'smart-format-category';
        catHeader.textContent = cat.charAt(0).toUpperCase() + cat.slice(1) + ` (${issues.length})`;
        list.appendChild(catHeader);

        for (const issue of issues) {
          const item = document.createElement('div');
          item.className = `smart-format-item smart-format-item--${issue.severity}`;
          const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
          item.innerHTML = `<span class="smart-format-icon">${icon}</span><span class="smart-format-msg">${issue.message}</span>`;
          if (issue.fix?.suggestion) {
            const sug = document.createElement('div');
            sug.className = 'smart-format-suggestion';
            sug.textContent = issue.fix.suggestion;
            item.appendChild(sug);
          }
          list.appendChild(item);
        }
      }
    }

    panel.appendChild(list);

    // === AI-Powered Section ===
    const aiSection = document.createElement('div');
    aiSection.className = 'smart-format-ai-section';

    const aiHeader = document.createElement('div');
    aiHeader.className = 'smart-format-category';
    aiHeader.textContent = '🤖 AI-Powered Analysis (Gemini)';
    aiSection.appendChild(aiHeader);

    const aiContent = document.createElement('div');
    aiContent.id = 'smart-format-ai-content';
    aiContent.style.padding = 'var(--space-3)';

    const { AiFormatter } = await import('./ai-formatter.js');

    {
      const savedKey = AiFormatter.getApiKey();
      const ai = new AiFormatter(savedKey);

      const showKeySetup = () => {
        const existing = aiContent.querySelector('#smart-format-key-row');
        if (existing) return;
        const keyRow = document.createElement('div');
        keyRow.id = 'smart-format-key-row';
        keyRow.style.cssText = 'margin-bottom:var(--space-3);';
        keyRow.innerHTML = `
          <p style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-bottom:var(--space-2);">AI features require a free API key (Gemini or Gemini):</p>
          <div style="display:flex;gap:var(--space-2);align-items:center;">
            <input type="password" id="smart-format-ai-key" placeholder="Paste Gemini or Gemini API key..." style="flex:1;padding:var(--space-2);border:1px solid var(--border-primary);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--font-size-xs);">
            <button class="btn btn-sm btn-primary" id="smart-format-key-save" style="font-size:var(--font-size-xs);white-space:nowrap;">Save & Run</button>
          </div>
          <div style="display:flex;gap:var(--space-2);margin-top:var(--space-1);">
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="font-size:0.625rem;color:var(--color-primary);">Get Gemini key</a>
            <a href="https://console.gemini.com" target="_blank" rel="noopener" style="font-size:0.625rem;color:var(--text-muted);">Get Gemini key</a>
          </div>
        `;
        aiContent.insertBefore(keyRow, aiContent.firstChild);
        keyRow.querySelector('#smart-format-key-save').addEventListener('click', () => {
          const k = keyRow.querySelector('#smart-format-ai-key').value.trim();
          if (!k) return;
          AiFormatter.setApiKey(k);
          ai.apiKey = k;
          ai.provider = ai._detectProvider(k);
          keyRow.remove();
          if (window.CC?.toast) window.CC.toast.show('API key saved', 'success');
        });
      };

      if (!savedKey && !(await AiFormatter.isServerConfigured())) showKeySetup();
      const aiResultsArea = document.createElement('div');
      aiResultsArea.id = 'ai-results-area';

      // AI action buttons
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3);';

      const analyzeBtn = document.createElement('button');
      analyzeBtn.className = 'btn btn-sm btn-primary';
      analyzeBtn.textContent = '🔍 AI Analyze';
      analyzeBtn.addEventListener('click', async () => {
        if (!ai.apiKey && !AiFormatter.hasLocalOption()) { showKeySetup(); return; }
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = '⏳ Analyzing...';
        aiResultsArea.innerHTML = this.aiLoadingSkeleton('AI is analyzing your resume...');
        try {
          const suggestions = await ai.analyzeResume(this.document);
          aiResultsArea.innerHTML = '';
          if (suggestions.length === 0) {
            aiResultsArea.innerHTML = '<p style="color:var(--color-success);font-size:var(--font-size-sm);padding:var(--space-2);">✅ No AI suggestions — your resume looks great!</p>';
            return;
          }
          suggestions.forEach(s => {
            const card = document.createElement('div');
            card.style.cssText = 'padding:var(--space-2) var(--space-3);border-left:3px solid ' + (s.severity === 'error' ? 'var(--color-error)' : s.severity === 'warning' ? 'var(--color-warning)' : 'var(--color-info)') + ';background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:var(--space-2);';

            const sevIcon = s.severity === 'error' ? '❌' : s.severity === 'warning' ? '⚠️' : 'ℹ️';
            const catBadge = document.createElement('span');
            catBadge.style.cssText = 'font-size:0.625rem;padding:1px 6px;border-radius:var(--radius-full);background:var(--bg-tertiary);color:var(--text-muted);margin-left:var(--space-1);';
            catBadge.textContent = s.category;

            const msg = document.createElement('div');
            msg.style.cssText = 'font-size:var(--font-size-xs);color:var(--text-primary);font-weight:500;margin-bottom:var(--space-1);';
            msg.textContent = `${sevIcon} ${s.message}`;
            msg.appendChild(catBadge);
            card.appendChild(msg);

            if (s.original) {
              const orig = document.createElement('div');
              orig.style.cssText = 'font-size:0.6875rem;color:var(--text-muted);text-decoration:line-through;margin-bottom:var(--space-1);';
              orig.textContent = s.original.length > 100 ? s.original.substring(0, 100) + '...' : s.original;
              card.appendChild(orig);
            }

            if (s.suggestion) {
              const sug = document.createElement('div');
              sug.style.cssText = 'font-size:0.6875rem;color:var(--color-success);margin-bottom:var(--space-1);';
              sug.textContent = '→ ' + (s.suggestion.length > 120 ? s.suggestion.substring(0, 120) + '...' : s.suggestion);
              card.appendChild(sug);

              const btnGroup = document.createElement('div');
              btnGroup.style.cssText = 'display:flex;gap:var(--space-1);margin-top:var(--space-1);';

              if (s.original && s.original.length > 3) {
                const applyBtn = document.createElement('button');
                applyBtn.className = 'btn btn-sm btn-primary';
                applyBtn.textContent = '✓ Apply';
                applyBtn.style.cssText = 'font-size:0.625rem;padding:2px 10px;height:auto;';
                applyBtn.addEventListener('click', () => {
                  const applied = this._applyAiSuggestion(s.original, s.suggestion, s.field);
                  if (applied) {
                    applyBtn.textContent = '✓ Applied';
                    applyBtn.disabled = true;
                    card.style.opacity = '0.5';
                    this.handleFieldChange();
                    this.updatePreview();
                  } else {
                    applyBtn.textContent = 'N/A';
                    applyBtn.disabled = true;
                    applyBtn.style.opacity = '0.5';
                  }
                });
                btnGroup.appendChild(applyBtn);
              }

              const copyBtn = document.createElement('button');
              copyBtn.className = 'btn btn-sm btn-ghost';
              copyBtn.textContent = '📋 Copy';
              copyBtn.style.cssText = 'font-size:0.625rem;padding:2px 8px;height:auto;';
              copyBtn.addEventListener('click', async () => {
                try {
                  await navigator.clipboard.writeText(s.suggestion);
                  copyBtn.textContent = '✓ Copied';
                  setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
                } catch { }
              });
              btnGroup.appendChild(copyBtn);

              card.appendChild(btnGroup);
            }

            aiResultsArea.appendChild(card);
          });

          // Apply All button
          const applyAllBar = document.createElement('div');
          applyAllBar.style.cssText = 'display:flex;gap:var(--space-2);align-items:center;padding:var(--space-3);background:var(--color-primary-50);border-radius:var(--radius-lg);margin-top:var(--space-3);';

          const applyAllBtn = document.createElement('button');
          applyAllBtn.className = 'btn btn-sm btn-primary';
          applyAllBtn.textContent = '⚡ Apply All Suggestions';
          applyAllBtn.addEventListener('click', () => {
            let applied = 0;
            suggestions.forEach(s => {
              if (s.original && s.suggestion && s.original.length > 3) {
                if (this._applyAiSuggestion(s.original, s.suggestion, s.field)) applied++;
              }
            });
            this.handleFieldChange();
            this.refreshLeftPanel();
            this.updatePreview();
            aiResultsArea.querySelectorAll('.btn-primary').forEach(b => {
              if (b.textContent === '✓ Apply') { b.textContent = '✓ Applied'; b.disabled = true; }
            });
            aiResultsArea.querySelectorAll('[style*="border-left"]').forEach(c => { c.style.opacity = '0.5'; });
            if (window.CC?.toast) window.CC.toast.show(`Applied ${applied} of ${suggestions.length} suggestions`, 'success');
          });
          applyAllBar.appendChild(applyAllBtn);

          const applyAllLabel = document.createElement('span');
          applyAllLabel.style.cssText = 'font-size:var(--font-size-xs);color:var(--text-secondary);';
          applyAllLabel.textContent = `${suggestions.filter(s => s.original && s.suggestion).length} replaceable suggestions`;
          applyAllBar.appendChild(applyAllLabel);

          aiResultsArea.appendChild(applyAllBar);
        } catch (err) {
          aiResultsArea.innerHTML = '';
          const errEl = document.createElement('p');
          errEl.style.cssText = 'color:var(--color-error);font-size:var(--font-size-sm);padding:var(--space-2);';
          errEl.textContent = err.message;
          aiResultsArea.appendChild(errEl);
        } finally {
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = '🔍 AI Analyze';
        }
      });
      btnRow.appendChild(analyzeBtn);

      const summaryBtn = document.createElement('button');
      summaryBtn.className = 'btn btn-sm btn-outline';
      summaryBtn.textContent = '📝 AI Summary';
      summaryBtn.addEventListener('click', async () => {
        if (!ai.apiKey && !AiFormatter.hasLocalOption()) { showKeySetup(); return; }
        summaryBtn.disabled = true;
        summaryBtn.textContent = '⏳ Generating...';
        aiResultsArea.innerHTML = this.aiLoadingSkeleton('Generating AI summary...');
        try {
          const summary = await ai.generateSummary(this.document);
          aiResultsArea.innerHTML = '';

          const sumCard = document.createElement('div');
          sumCard.style.cssText = 'padding:var(--space-3);background:var(--bg-secondary);border-radius:var(--radius-lg);border-left:3px solid var(--color-primary);';

          const sumLabel = document.createElement('div');
          sumLabel.style.cssText = 'font-size:var(--font-size-xs);font-weight:600;color:var(--text-primary);margin-bottom:var(--space-2);';
          sumLabel.textContent = 'AI-Generated Professional Summary';
          sumCard.appendChild(sumLabel);

          const sumText = document.createElement('p');
          sumText.style.cssText = 'font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.5;margin-bottom:var(--space-2);';
          sumText.textContent = summary;
          sumCard.appendChild(sumText);

          const sumActions = document.createElement('div');
          sumActions.style.cssText = 'display:flex;gap:var(--space-2);';

          const useSumBtn = document.createElement('button');
          useSumBtn.className = 'btn btn-sm btn-primary';
          useSumBtn.textContent = 'Use This Summary';
          useSumBtn.addEventListener('click', () => {
            const sumSection = this.document.sections.find(s => {
              const st = s.sectionType || s.type || '';
              return st.includes('ummary') || st.includes('bjective') || st.includes('profile');
            });
            if (sumSection) {
              sumSection.content = summary;
            } else {
              const { generateUUID } = { generateUUID: () => crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) };
              this.document.sections.unshift({
                id: generateUUID(),
                sectionType: 'professionalSummary',
                type: 'text',
                title: 'Professional Summary',
                content: summary,
                items: [],
                visible: true,
                column: 'main',
                order: 0
              });
            }
            this.handleFieldChange();
            this.refreshLeftPanel();
            if (window.CC?.toast) window.CC.toast.show('Summary applied!', 'success');
            overlay.remove();
          });
          sumActions.appendChild(useSumBtn);

          const copySumBtn = document.createElement('button');
          copySumBtn.className = 'btn btn-sm btn-ghost';
          copySumBtn.textContent = '📋 Copy';
          copySumBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(summary);
              copySumBtn.textContent = '✓ Copied';
              setTimeout(() => { copySumBtn.textContent = '📋 Copy'; }, 1500);
            } catch { }
          });
          sumActions.appendChild(copySumBtn);

          sumCard.appendChild(sumActions);
          aiResultsArea.appendChild(sumCard);
        } catch (err) {
          aiResultsArea.innerHTML = '';
          const errEl = document.createElement('p');
          errEl.style.cssText = 'color:var(--color-error);font-size:var(--font-size-sm);padding:var(--space-2);';
          errEl.textContent = err.message;
          aiResultsArea.appendChild(errEl);
        } finally {
          summaryBtn.disabled = false;
          summaryBtn.textContent = '📝 AI Summary';
        }
      });
      btnRow.appendChild(summaryBtn);

      aiContent.appendChild(btnRow);
      aiContent.appendChild(aiResultsArea);
    }

    aiSection.appendChild(aiContent);
    panel.appendChild(aiSection);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
  }

  showExportMenu(button) {
    const existing = document.querySelector('.context-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const formats = [
      { id: 'pdf', label: 'Export as PDF', icon: '📄' },
      { id: 'text', label: 'Export as Text', icon: '📝' },
      { id: 'json', label: 'Export as JSON', icon: '💾' },
      { id: 'markdown', label: 'Export as Markdown', icon: '📋' },
      { id: 'html', label: 'Export as HTML', icon: '🌐' }
    ];

    const cleanup = () => {
      if (menu.parentNode) menu.remove();
      document.removeEventListener('click', onOutsideClick, true);
      document.removeEventListener('keydown', onEscape);
    };

    formats.forEach(format => {
      const item = document.createElement('button');
      item.className = 'context-menu-item';
      item.innerHTML = `${format.icon} ${format.label}`;
      item.addEventListener('click', () => {
        cleanup();
        this.handleExport(format.id);
      });
      menu.appendChild(item);
    });

    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 200)}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 220))}px`;
    menu.style.maxWidth = 'calc(100vw - 16px)';
    menu.style.maxHeight = '60vh';
    menu.style.overflowY = 'auto';
    menu.style.zIndex = '600';

    document.body.appendChild(menu);

    const onOutsideClick = (e) => {
      if (!menu.contains(e.target) && !button.contains(e.target)) {
        cleanup();
      }
    };

    const onEscape = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        button.focus();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', onOutsideClick, true);
      document.addEventListener('keydown', onEscape);
    }, 0);
  }

  runAtsCheck() {
    if (!this.atsChecker || !this.document) return;

    const container = this.container && this.container.querySelector('#ats-results-container');
    if (!container) return;

    container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-3);padding:var(--space-6);"><div class="cc-spinner"></div><p style="color:var(--text-muted);font-size:var(--font-size-sm);">Analyzing ATS compatibility...</p></div>';

    // Use setTimeout so the spinner renders before sync work blocks the thread
    setTimeout(() => {
    try {
      const results = this.atsChecker.analyze(this.document, this.document.design);

      container.innerHTML = '';

      // Score display
      const scoreClass = results.score >= 80 ? 'score-good' : results.score >= 50 ? 'score-medium' : 'score-low';
      const scoreColor = results.score >= 80 ? 'var(--color-success)' : results.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

      const scoreRow = document.createElement('div');
      scoreRow.style.cssText = 'display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--bg-secondary);border-radius:var(--radius-lg);';

      const scoreCircle = document.createElement('div');
      scoreCircle.style.cssText = `width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-lg);font-weight:800;color:white;background:${scoreColor};flex-shrink:0;`;
      scoreCircle.textContent = `${results.score}%`;
      scoreRow.appendChild(scoreCircle);

      const scoreInfo = document.createElement('div');
      scoreInfo.style.cssText = 'flex:1;min-width:0;';
      const scoreLabel = document.createElement('div');
      scoreLabel.style.cssText = 'font-size:var(--font-size-sm);font-weight:600;color:var(--text-primary);';
      scoreLabel.textContent = results.score >= 80 ? 'Good ATS Compatibility' : results.score >= 50 ? 'Needs Improvement' : 'Low Compatibility';
      scoreInfo.appendChild(scoreLabel);
      const scoreDetail = document.createElement('div');
      scoreDetail.style.cssText = 'font-size:var(--font-size-xs);color:var(--text-muted);';
      const passed = results.checks.filter(c => c.status === 'pass').length;
      scoreDetail.textContent = `${passed}/${results.checks.length} checks passed`;
      scoreInfo.appendChild(scoreDetail);
      scoreRow.appendChild(scoreInfo);
      container.appendChild(scoreRow);

      // Checks list — show warnings/failures first, then passes
      const sorted = [...results.checks].sort((a, b) => {
        const order = { fail: 0, warning: 1, info: 2, pass: 3 };
        return (order[a.status] || 4) - (order[b.status] || 4);
      });

      sorted.forEach(check => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:var(--space-2) 0;border-bottom:1px solid var(--border-primary);';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:var(--space-2);cursor:pointer;';

        const icon = document.createElement('span');
        icon.style.cssText = 'font-size:var(--font-size-sm);flex-shrink:0;';
        if (check.status === 'pass') { icon.textContent = '✅'; }
        else if (check.status === 'warning') { icon.textContent = '⚠️'; }
        else if (check.status === 'fail') { icon.textContent = '❌'; }
        else { icon.textContent = 'ℹ️'; }
        header.appendChild(icon);

        const name = document.createElement('span');
        name.style.cssText = 'font-size:var(--font-size-xs);font-weight:500;color:var(--text-primary);flex:1;';
        name.textContent = check.name;
        header.appendChild(name);

        item.appendChild(header);

        if (check.status !== 'pass') {
          const detail = document.createElement('div');
          detail.style.cssText = 'font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:var(--space-1);padding-left:calc(var(--font-size-sm) + var(--space-2));line-height:1.4;';
          detail.textContent = check.message || '';
          if (check.suggestion) {
            const sug = document.createElement('div');
            sug.style.cssText = 'margin-top:var(--space-1);color:var(--color-primary);font-weight:500;';
            sug.textContent = '💡 ' + check.suggestion;
            detail.appendChild(sug);
          }
          item.appendChild(detail);
        }

        container.appendChild(item);
      });

      // Action buttons row
      const actionRow = document.createElement('div');
      actionRow.style.cssText = 'display:flex;gap:var(--space-2);margin-top:var(--space-3);';

      const rerunBtn = document.createElement('button');
      rerunBtn.className = 'btn btn-sm btn-outline';
      rerunBtn.textContent = '↻ Re-run';
      rerunBtn.style.flex = '1';
      rerunBtn.addEventListener('click', () => {
        rerunBtn.disabled = true;
        rerunBtn.textContent = '↻ Running...';
        this.runAtsCheck();
      });
      actionRow.appendChild(rerunBtn);

      const aiFixBtn = document.createElement('button');
      aiFixBtn.className = 'btn btn-sm btn-primary';
      aiFixBtn.textContent = '🤖 AI Fix Suggestions';
      aiFixBtn.style.flex = '1';
      aiFixBtn.addEventListener('click', () => {
        aiFixBtn.disabled = true;
        aiFixBtn.textContent = '🤖 Analyzing...';
        this._runAiAtsFix(container);
      });
      actionRow.appendChild(aiFixBtn);

      container.appendChild(actionRow);

      // Disclaimer
      const disclaimer = document.createElement('p');
      disclaimer.style.cssText = 'font-size:0.625rem;color:var(--text-muted);margin-top:var(--space-2);line-height:1.4;font-style:italic;';
      disclaimer.textContent = 'Local rule-based check + optional AI suggestions via Gemini.';
      container.appendChild(disclaimer);

    } catch (err) {
      console.error('ATS check failed:', err);
      container.innerHTML = '';
      const errMsg = document.createElement('p');
      errMsg.style.cssText = 'color:var(--color-error);font-size:var(--font-size-sm);';
      errMsg.textContent = 'ATS check failed. Try again.';
      container.appendChild(errMsg);
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-sm btn-outline';
      retryBtn.textContent = 'Retry';
      retryBtn.style.cssText = 'width:100%;margin-top:var(--space-2);';
      retryBtn.addEventListener('click', () => this.runAtsCheck());
      container.appendChild(retryBtn);
    }
    }, 50);
  }

  _showAiKeySetup(container) {
    const setupArea = document.createElement('div');
    setupArea.style.cssText = 'margin-top:var(--space-3);border-top:1px solid var(--border-primary);padding-top:var(--space-3);';
    setupArea.innerHTML = `
      <p style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-bottom:var(--space-2);">AI suggestions require a free API key (Gemini or Gemini):</p>
      <input type="password" placeholder="Paste Gemini or Gemini API key..." style="width:100%;padding:var(--space-2);border:1px solid var(--border-primary);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--font-size-xs);margin-bottom:var(--space-2);" id="ats-ai-key-input">
      <div style="display:flex;gap:var(--space-2);align-items:center;">
        <button class="btn btn-sm btn-primary" id="ats-ai-key-save">Save & Run</button>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="font-size:var(--font-size-xs);color:var(--color-primary);">Gemini key ↗</a>
        <a href="https://console.gemini.com" target="_blank" rel="noopener" style="font-size:var(--font-size-xs);color:var(--text-secondary);">Gemini key ↗</a>
      </div>
    `;
    container.appendChild(setupArea);
    setupArea.querySelector('#ats-ai-key-save').addEventListener('click', () => {
      const key = setupArea.querySelector('#ats-ai-key-input').value.trim();
      if (!key) return;
      const { AiFormatter } = window._AiFormatterRef || {};
      if (AiFormatter) AiFormatter.setApiKey(key);
      else localStorage.setItem('cc_ai_api_key', key);
      setupArea.remove();
      this._runAiAtsFix(container);
    });
  }

  async _runAiAtsFix(container) {
    const { AiFormatter } = await import('./ai-formatter.js');
    window._AiFormatterRef = { AiFormatter };

    const aiArea = document.createElement('div');
    aiArea.style.cssText = 'margin-top:var(--space-3);border-top:1px solid var(--border-primary);padding-top:var(--space-3);';
    aiArea.innerHTML = '<p style="color:var(--text-muted);font-size:var(--font-size-xs);">🤖 Getting AI suggestions...</p>';
    container.appendChild(aiArea);

    try {
      const ai = new AiFormatter(AiFormatter.getApiKey());
      const suggestions = await ai.analyzeResume(this.document);
      aiArea.innerHTML = '';

      if (!suggestions || suggestions.length === 0) {
        aiArea.innerHTML = '<p style="color:var(--color-success);font-size:var(--font-size-xs);padding:var(--space-2);">✅ AI found no issues!</p>';
        return;
      }

      const aiTitle = document.createElement('div');
      aiTitle.style.cssText = 'font-size:var(--font-size-xs);font-weight:700;color:var(--text-primary);margin-bottom:var(--space-2);';
      aiTitle.textContent = `🤖 AI Suggestions (${suggestions.length})`;
      aiArea.appendChild(aiTitle);

      // Apply All button at top
      const applyAllBtn = document.createElement('button');
      applyAllBtn.className = 'btn btn-sm btn-primary';
      applyAllBtn.textContent = '⚡ Apply All AI Fixes';
      applyAllBtn.style.cssText = 'width:100%;margin-bottom:var(--space-2);';
      applyAllBtn.addEventListener('click', () => {
        let applied = 0;
        suggestions.forEach(s => {
          if (s.original && s.suggestion && s.original.length > 3) {
            if (this._applyAiSuggestion(s.original, s.suggestion, s.field)) applied++;
          }
        });
        this.handleFieldChange();
        this.refreshLeftPanel();
        this.updatePreview();
        applyAllBtn.textContent = `✓ Applied ${applied} fixes`;
        applyAllBtn.disabled = true;
        aiArea.querySelectorAll('.ai-ats-apply').forEach(b => { b.textContent = '✓'; b.disabled = true; });
        aiArea.querySelectorAll('.ai-ats-card').forEach(c => { c.style.opacity = '0.5'; });
        if (window.CC?.toast) window.CC.toast.show(`Applied ${applied} AI suggestions`, 'success');
      });
      aiArea.appendChild(applyAllBtn);

      suggestions.forEach(s => {
        const card = document.createElement('div');
        card.className = 'ai-ats-card';
        card.style.cssText = 'padding:var(--space-2);border-left:3px solid ' + (s.severity === 'error' ? 'var(--color-error)' : s.severity === 'warning' ? 'var(--color-warning)' : 'var(--color-info)') + ';background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:var(--space-2);';

        const icon = s.severity === 'error' ? '❌' : s.severity === 'warning' ? '⚠️' : 'ℹ️';
        const msg = document.createElement('div');
        msg.style.cssText = 'font-size:0.6875rem;color:var(--text-primary);font-weight:500;margin-bottom:2px;';
        msg.textContent = `${icon} ${s.message}`;
        card.appendChild(msg);

        if (s.suggestion) {
          const sug = document.createElement('div');
          sug.style.cssText = 'font-size:0.625rem;color:var(--color-success);margin-bottom:var(--space-1);';
          sug.textContent = '→ ' + (s.suggestion.length > 80 ? s.suggestion.substring(0, 80) + '...' : s.suggestion);
          card.appendChild(sug);

          if (s.original && s.original.length > 3) {
            const applyBtn = document.createElement('button');
            applyBtn.className = 'btn btn-sm btn-primary ai-ats-apply';
            applyBtn.textContent = 'Apply';
            applyBtn.style.cssText = 'font-size:0.5625rem;padding:1px 8px;height:auto;';
            applyBtn.addEventListener('click', () => {
              if (this._applyAiSuggestion(s.original, s.suggestion, s.field)) {
                applyBtn.textContent = '✓ Applied';
                applyBtn.disabled = true;
                card.style.opacity = '0.5';
                this.handleFieldChange();
                this.refreshLeftPanel();
                this.updatePreview();
              } else {
                applyBtn.textContent = 'N/A';
                applyBtn.disabled = true;
                applyBtn.style.opacity = '0.5';
              }
            });
            card.appendChild(applyBtn);
          }
        }

        aiArea.appendChild(card);
      });
    } catch (err) {
      aiArea.remove();
      if (err.message.includes('API key') || err.message.includes('not configured') || err.message.includes('Server error') || err.message.includes('405')) {
        this._showAiKeySetup(container);
      } else {
        const errArea = document.createElement('div');
        errArea.style.cssText = 'margin-top:var(--space-3);border-top:1px solid var(--border-primary);padding-top:var(--space-3);';
        const errEl = document.createElement('p');
        errEl.style.cssText = 'color:var(--color-error);font-size:var(--font-size-xs);margin-bottom:var(--space-2);';
        errEl.textContent = err.message;
        errArea.appendChild(errEl);
        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn btn-sm btn-outline';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => { errArea.remove(); this._runAiAtsFix(container); });
        errArea.appendChild(retryBtn);
        container.appendChild(errArea);
      }
    }
  }

  // Actions
  dismissAllPopups() {
    document.querySelectorAll('.autocomplete-dropdown, .context-menu, .floating-format-toolbar').forEach(el => el.remove());
  }

  async _handleEditorImport(fmt) {
    const im = window.CC && window.CC.importManager;
    if (!im) { if (window.CC?.toast) window.CC.toast.show('Import manager not available', 'error'); return; }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fmt.accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      document.body.removeChild(input);
      if (!file) return;

      try {
        if (window.CC?.toast) window.CC.toast.show('Reading file...', 'info');

        let parsed;

        if (fmt.id === 'json') {
          const content = await im.readFileAsText(file);
          const data = JSON.parse(content);
          if (data.personalInfo || data.sections) {
            parsed = { name: data.personalInfo?.fullName || '', email: data.personalInfo?.email || '', phone: data.personalInfo?.phone || '', location: data.personalInfo?.city || '', sections: [], sourceFile: file.name, _rawText: content, _jsonData: data };
            if (data.sections && Array.isArray(data.sections)) {
              parsed.sections = data.sections.map(s => ({ title: s.title || s.sectionType || 'Section', type: s.sectionType || s.type || 'custom', content: s.content ? [s.content] : (s.items || []).map(it => it.jobTitle || it.degree || it.name || it.text || it.category || JSON.stringify(it).substring(0, 80)) }));
            }
          } else {
            if (window.CC?.toast) window.CC.toast.show('Invalid JSON structure', 'error');
            return;
          }
        } else if (fmt.id === 'docx') {
          const mammoth = await import('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/+esm');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const div = document.createElement('div');
          div.innerHTML = result.value;
          div.querySelectorAll('script,style,iframe,object,embed').forEach(el => el.remove());
          parsed = im.parseHTMLContent(div);
          parsed._rawText = div.textContent || '';
          parsed.sourceFile = file.name;
        } else if (fmt.id === 'pdf') {
          const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/+esm');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pages = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const items = content.items.filter(it => it.str && it.str.trim());
            if (items.length === 0) { pages.push(''); continue; }
            items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
            const lines = [];
            let curLine = [items[0]];
            for (let j = 1; j < items.length; j++) {
              if (curLine.length > 0 && Math.abs(items[j].transform[5] - curLine[0].transform[5]) <= 3) {
                curLine.push(items[j]);
              } else {
                curLine.sort((a, b) => a.transform[4] - b.transform[4]);
                lines.push(curLine.map(it => it.str).join(' '));
                curLine = [items[j]];
              }
            }
            if (curLine.length > 0) {
              curLine.sort((a, b) => a.transform[4] - b.transform[4]);
              lines.push(curLine.map(it => it.str).join(' '));
            }
            pages.push(lines.join('\n'));
          }
          const fullText = pages.join('\n\n');
          parsed = im.parsePlainText(fullText);
          parsed._rawText = fullText;
          parsed.sourceFile = file.name;
        } else {
          const text = await im.readFileAsText(file);
          parsed = im.parsePlainText(text);
          parsed._rawText = text;
          parsed.sourceFile = file.name;
        }

        // Show the review panel
        const confirmed = await im.showFieldMapping(parsed);
        if (!confirmed) return;

        // Ask: replace current or create new?
        const choice = await new Promise(res => {
          if (!window.CC?.modal) { res('new'); return; }
          const choiceBody = document.createElement('div');
          choiceBody.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
          choiceBody.innerHTML = `<p style="color:var(--text-secondary);font-size:var(--font-size-sm);margin:0;">You have "${this.document.name}" open. How would you like to import "${file.name}"?</p>`;
          window.CC.modal.show({
            title: 'Import into...',
            body: choiceBody,
            size: 'small',
            actions: [
              { label: 'Cancel', type: 'secondary', handler: () => { res(null); return null; } },
              { label: 'Replace Current', type: 'danger', handler: () => { res('replace'); return true; } },
              { label: 'Create New Document', type: 'primary', handler: () => { res('new'); return true; } }
            ]
          });
        });

        if (!choice) return;

        if (choice === 'new') {
          try {
            const newDoc = im.createDocumentFromParsed(im.parsedData || parsed);
            newDoc.name = file.name.replace(/\.[^.]+$/, '') || 'Imported Resume';
            if (parsed._templateId) {
              newDoc.templateId = parsed._templateId;
              if (newDoc.design) newDoc.design.template = parsed._templateId;
            }
            await this.db.put('documents', newDoc);
            if (window.CC?.toast) window.CC.toast.show(`Created "${newDoc.name}"`, 'success');
            if (window.CC?.router) window.CC.router.navigate(`/editor/${newDoc.id}`);
          } catch (err) {
            console.error('Create new document failed:', err);
            if (window.CC?.toast) window.CC.toast.show('Failed to create document', 'error');
          }
          return;
        }

        // Replace current document content
        const pd = im.parsedData;
        if (pd.name) this.document.personalInfo.fullName = pd.name;
        if (pd.email) this.document.personalInfo.email = pd.email;
        if (pd.phone) this.document.personalInfo.phone = pd.phone;
        if (pd.location) {
          const parts = pd.location.split(',').map(s => s.trim());
          this.document.personalInfo.city = parts[0] || '';
          if (parts[1]) this.document.personalInfo.state = parts[1];
          if (parts[2]) this.document.personalInfo.country = parts[2];
        }
        if (pd.professionalTitle) this.document.personalInfo.professionalTitle = pd.professionalTitle;
        if (pd.linkedin) this.document.personalInfo.linkedinUrl = pd.linkedin;
        if (pd.github) this.document.personalInfo.githubUrl = pd.github;
        if (pd.website) this.document.personalInfo.personalWebsite = pd.website;

        if (pd._jsonData) {
          const jd = pd._jsonData;
          if (jd.personalInfo) Object.assign(this.document.personalInfo, jd.personalInfo);
          if (jd.sections) this.document.sections = jd.sections;
          if (jd.design) Object.assign(this.document.design || {}, jd.design);
        } else if (pd.sections && pd.sections.length > 0) {
          const tempDoc = im.createDocumentFromParsed(pd);
          if (tempDoc.sections && tempDoc.sections.length > 0) {
            this.document.sections = tempDoc.sections;
          }
          if (pd._templateId) {
            this.document.design.template = pd._templateId;
            this.document.templateId = pd._templateId;
          }
        }

        this.handleFieldChange();
        this.refreshLeftPanel();
        this.updatePreview();
        await this.saveDocument();

        if (window.CC?.toast) window.CC.toast.show(`Replaced content with "${file.name}"`, 'success');
      } catch (err) {
        console.error('Import failed:', err);
        if (window.CC?.toast) window.CC.toast.show('Import failed: ' + err.message, 'error');
      }
    });

    input.click();
  }

  async handleExport(format) {
    const em = window.CC && window.CC.exportManager;
    if (!em) {
      if (window.CC && window.CC.toast) window.CC.toast.show('Export manager not available', 'error');
      return;
    }

    this.dismissAllPopups();
    this.updatePreview();

    const doc = this.document;
    const getPreviewHTML = () => {
      const el = this.previewEl && this.previewEl.querySelector('.preview-content');
      if (!el || !el.innerHTML || el.innerHTML.includes('preview-loading') || el.innerHTML.includes('preview-error')) {
        try {
          return this.templateEngine.render(doc.design.template, doc, doc.design);
        } catch (e) {
          console.error('Export render fallback failed:', e);
          return '';
        }
      }
      return el.innerHTML;
    };

    // For PDF and HTML — show Export Wizard first
    if (format === 'pdf' || format === 'html') {
      try {
        const { ExportWizard } = await import('./export-wizard.js');
        const wizard = new ExportWizard();
        const renderedHTML = getPreviewHTML();

        const optimized = await wizard.show(renderedHTML, doc, {
          pageSize: doc.design?.pageSize || doc.pageSize || 'A4',
          templateEngine: this.templateEngine,
          design: doc.design
        });

        if (!optimized) return; // Cancelled

        // Handle both old string format and new object format
        const exportHTML = typeof optimized === 'string' ? optimized : optimized.html;
        const exportFormat = typeof optimized === 'object' ? optimized.format : format;

        if (exportFormat === 'pdf') {
          const previewContent = this.previewEl?.querySelector('.preview-content');
          if (previewContent) {
            previewContent.innerHTML = exportHTML;
          }
          em.exportPDF(previewContent || this.container, doc);
          setTimeout(() => this.updatePreview(), 500);
        } else if (exportFormat === 'txt') {
          em.exportPlainText(doc);
        } else if (exportFormat === 'md') {
          em.exportMarkdown(doc);
        } else if (exportFormat === 'json') {
          em.exportJSON(doc);
        } else {
          em.exportHTML(doc, exportHTML);
        }
      } catch (e) {
        console.error('Export wizard error:', e);
        // Fallback to direct export
        if (format === 'pdf') {
          const previewEl = this.previewEl?.querySelector('.preview-content');
          em.exportPDF(previewEl || this.container, doc);
        } else {
          em.exportHTML(doc, getPreviewHTML());
        }
      }
      return;
    }

    switch (format) {
      case 'text':
        em.exportPlainText(doc);
        break;
      case 'json':
        em.exportJSON(doc);
        break;
      case 'markdown':
        em.exportMarkdown(doc);
        break;
      default:
        if (window.CC && window.CC.toast) window.CC.toast.show(`Unknown export format: ${format}`, 'error');
    }
  }

  handlePrint() {
    this.dismissAllPopups();
    this.handleExport('pdf');
  }

  handleKeyboardShortcut(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      this.handleUndo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.handleRedo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      this.handlePrint();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      this.toggleAtsMode();
    }
  }

  // Utility methods
  getEntryTitle(sectionType, item) {
    switch (sectionType) {
      case 'experience':
        return item.jobTitle || 'Untitled Position';
      case 'education':
        return item.degree || 'Untitled Degree';
      case 'projects':
        return item.projectName || 'Untitled Project';
      case 'skills':
        return item.name || 'Untitled Skill';
      case 'certifications':
        return item.name || 'Untitled Certification';
      case 'languages':
        return item.language || 'Untitled Language';
      default:
        return 'Untitled';
    }
  }

  getEntrySubtitle(sectionType, item) {
    switch (sectionType) {
      case 'experience':
        return item.company || '';
      case 'education':
        return item.institution || '';
      case 'projects':
        return item.role || '';
      case 'skills':
        return item.proficiencyLevel || '';
      case 'certifications':
        return item.issuingOrganization || '';
      case 'languages':
        return item.proficiency || '';
      default:
        return '';
    }
  }

  getSingularSectionName(sectionType) {
    const map = {
      'experience': 'Experience',
      'education': 'Education',
      'projects': 'Project',
      'skills': 'Skill',
      'certifications': 'Certification',
      'languages': 'Language',
      'publications': 'Publication',
      'awards': 'Award',
      'volunteer': 'Volunteer Experience'
    };
    return map[sectionType] || 'Entry';
  }

  calculateProgress() {
    let filled = 0;
    let total = 0;

    // Personal info — core fields
    const requiredFields = ['fullName', 'email', 'phone'];
    const recommendedFields = ['professionalTitle', 'city', 'linkedinUrl'];

    requiredFields.forEach(field => {
      total += 2; // required fields worth double
      if (this.document.personalInfo[field] && this.document.personalInfo[field].trim()) filled += 2;
    });

    recommendedFields.forEach(field => {
      total++;
      if (this.document.personalInfo[field] && this.document.personalInfo[field].trim()) filled++;
    });

    // Sections — check actual content quality
    this.document.sections.forEach(section => {
      if (!section.visible && section.visible !== undefined) return; // skip hidden

      if (section.type === 'text') {
        total++;
        if (section.content && section.content.trim().length > 20) filled++; // meaningful content
      } else if (section.type === 'list') {
        total++;
        const validItems = (section.items || []).filter(item => {
          if (!item || item.hidden) return false;
          // Check if item has meaningful content
          const values = Object.values(item).filter(v =>
            typeof v === 'string' && v.trim().length > 0 && v !== item.id
          );
          return values.length > 1; // more than just the ID
        });
        if (validItems.length > 0) filled++;
      }
    });

    return total > 0 ? Math.round((filled / total) * 100) : 0;
  }

  // Event listeners
  attachEventListeners() {
    document.addEventListener('keydown', this.handleKeyboardShortcut);
    this.saveStatusTimer = setInterval(() => this.updateSaveStatus(), 30000);
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeyboardShortcut);
  }

  // Cleanup
  destroy() {
    this.removeEventListeners();

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }

    if (this.saveStatusTimer) {
      clearInterval(this.saveStatusTimer);
    }

    if (this._historyTimer) {
      clearTimeout(this._historyTimer);
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.toolbarEl = null;
    this.leftPanelEl = null;
    this.previewEl = null;
    this.rightPanelEl = null;
  }
}
