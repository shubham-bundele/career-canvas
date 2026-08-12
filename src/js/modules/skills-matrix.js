import { createElement, stripHTML, encodeHTML } from '../utils/sanitize.js';
import { formatTimeAgo } from '../utils/format.js';
import eventBus from '../core/events.js';
import { SkillsMatrixAnalyzer } from './skills-matrix-analyzer.js';
import { STRENGTH_LEVELS, SKILL_STATUSES } from './skills-matrix-data.js';

const STRENGTH_LABELS = {
  [STRENGTH_LEVELS.STRONG]: 'Strong',
  [STRENGTH_LEVELS.MODERATE]: 'Moderate',
  [STRENGTH_LEVELS.LIMITED]: 'Limited',
  [STRENGTH_LEVELS.LISTED_ONLY]: 'Listed Only',
  [STRENGTH_LEVELS.SUGGESTED]: 'Suggested',
  [STRENGTH_LEVELS.NO_EVIDENCE]: 'No Evidence'
};

const STATUS_LABELS = {
  [SKILL_STATUSES.STRONGLY_EVIDENCED]: 'Strongly Evidenced',
  [SKILL_STATUSES.EVIDENCED]: 'Evidenced',
  [SKILL_STATUSES.WEAKLY_EVIDENCED]: 'Weakly Evidenced',
  [SKILL_STATUSES.LISTED_WITHOUT_EVIDENCE]: 'Listed Without Evidence',
  [SKILL_STATUSES.EVIDENCE_WITHOUT_LISTING]: 'Missing from Skills Section',
  [SKILL_STATUSES.SUGGESTED_UNVERIFIED]: 'Suggested',
  [SKILL_STATUSES.REJECTED]: 'Rejected',
  [SKILL_STATUSES.USER_CONFIRMED]: 'Confirmed',
  [SKILL_STATUSES.MENTIONED]: 'Mentioned'
};

export class SkillsMatrix {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];
    this.analyzer = new SkillsMatrixAnalyzer();
    this.documents = [];
    this.selectedResumeId = null;
    this.selectedResume = null;
    this.analysisResult = null;
    this.searchQuery = '';
    this.filterCategory = 'all';
    this.filterStrength = 'all';
    this.filterStatus = 'all';
    this.sortField = 'strength';
    this.sortDirection = 'asc';
    this.expandedSkillId = null;
    this.resumeSearchQuery = '';
    this.resumeFilterType = 'all';
    this.resumeSortField = 'lastModified';
  }

  async render() {
    this.container = createElement('div', '', { class: 'skills-matrix-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Skills Evidence Matrix');

    const header = this.renderHeader();
    this.container.appendChild(header);

    const content = createElement('div', '', { class: 'skills-matrix-content' });
    content.setAttribute('id', 'skills-matrix-content');
    this.container.appendChild(content);

    await this.showResumeSelection();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'skills-matrix-header' });

    const breadcrumb = createElement('nav', '', { class: 'skills-matrix-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });

    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcHomeLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcHomeLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcHomeLink);
    bcList.appendChild(bcHome);

    const bcSep = createElement('li', '', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcSep.textContent = '/';
    bcList.appendChild(bcSep);

    const bcCurrent = createElement('li', '', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcCurrent.textContent = 'Skills Evidence Matrix';
    bcList.appendChild(bcCurrent);

    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    const titleRow = createElement('div', '', { class: 'skills-matrix-title-row' });
    const titleGroup = createElement('div', '', { class: 'skills-matrix-title-group' });
    const title = createElement('h1', 'Skills Evidence Matrix', { class: 'skills-matrix-title' });
    titleGroup.appendChild(title);
    const subtitle = createElement('p', 'Analyze your resume to identify which skills are evidenced, which lack support, and which are missing from your skills section.', { class: 'skills-matrix-subtitle' });
    titleGroup.appendChild(subtitle);
    titleRow.appendChild(titleGroup);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline skills-matrix-back-btn' });
    backBtn.innerHTML = '&#8592; Dashboard';
    backBtn.setAttribute('aria-label', 'Back to Dashboard');
    this.addListener(backBtn, 'click', () => {
      if (window.CC && window.CC.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    titleRow.appendChild(backBtn);
    header.appendChild(titleRow);
    return header;
  }

  // ==================== RESUME SELECTION (Step 2) ====================

  async showResumeSelection() {
    const content = this.container.querySelector('#skills-matrix-content');
    if (!content) return;
    content.innerHTML = '';

    try {
      this.documents = await this.db.getAll('documents');
    } catch (e) {
      content.appendChild(this.renderError('Failed to load documents. Please try again.'));
      return;
    }

    const wrapper = createElement('div', '', { class: 'sm-resume-selection' });

    const sectionTitle = createElement('h2', 'Select a Resume to Analyze', { class: 'sm-section-title' });
    wrapper.appendChild(sectionTitle);

    const controls = createElement('div', '', { class: 'sm-resume-controls' });

    const searchInput = createElement('input', '', {
      class: 'sm-search-input',
      type: 'search',
      placeholder: 'Search documents...',
      'aria-label': 'Search documents'
    });
    this.addListener(searchInput, 'input', (e) => {
      this.resumeSearchQuery = e.target.value.toLowerCase();
      this.renderResumeList();
    });
    controls.appendChild(searchInput);

    const typeFilter = createElement('select', '', { class: 'sm-filter-select', 'aria-label': 'Filter by document type' });
    const types = [
      { value: 'all', label: 'All Types' },
      { value: 'resume', label: 'Resumes' },
      { value: 'cv', label: 'CVs' },
      { value: 'academicCV', label: 'Academic CVs' }
    ];
    types.forEach(t => {
      const opt = createElement('option', t.label, { value: t.value });
      typeFilter.appendChild(opt);
    });
    this.addListener(typeFilter, 'change', (e) => {
      this.resumeFilterType = e.target.value;
      this.renderResumeList();
    });
    controls.appendChild(typeFilter);

    const sortSelect = createElement('select', '', { class: 'sm-filter-select', 'aria-label': 'Sort documents' });
    const sorts = [
      { value: 'lastModified', label: 'Last Modified' },
      { value: 'name', label: 'Name A-Z' },
      { value: 'created', label: 'Date Created' }
    ];
    sorts.forEach(s => {
      const opt = createElement('option', s.label, { value: s.value });
      sortSelect.appendChild(opt);
    });
    this.addListener(sortSelect, 'change', (e) => {
      this.resumeSortField = e.target.value;
      this.renderResumeList();
    });
    controls.appendChild(sortSelect);

    wrapper.appendChild(controls);

    const listContainer = createElement('div', '', { class: 'sm-resume-list', id: 'sm-resume-list' });
    wrapper.appendChild(listContainer);

    content.appendChild(wrapper);
    this.renderResumeList();
  }

  renderResumeList() {
    const listContainer = this.container.querySelector('#sm-resume-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let filtered = this.documents.filter(d => !d.archived);

    if (this.resumeFilterType !== 'all') {
      filtered = filtered.filter(d => d.type === this.resumeFilterType);
    }

    if (this.resumeSearchQuery) {
      filtered = filtered.filter(d => {
        const searchable = [d.name, d.targetRole, d.targetCompany, d.type, ...(d.tags || [])].join(' ').toLowerCase();
        return searchable.includes(this.resumeSearchQuery);
      });
    }

    switch (this.resumeSortField) {
      case 'name': filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'created': filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default: filtered.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    if (filtered.length === 0) {
      const empty = createElement('div', '', { class: 'sm-resume-empty' });
      if (this.documents.length === 0) {
        empty.innerHTML = '<p>No documents found. Create a resume first.</p>';
        const createBtn = createElement('button', '+ Create Resume', { class: 'btn btn-primary btn-sm' });
        this.addListener(createBtn, 'click', () => {
          eventBus.emit('document:create', { type: 'resume' });
        });
        empty.appendChild(createBtn);
      } else {
        empty.innerHTML = '<p>No documents match your search or filter.</p>';
        const clearBtn = createElement('button', 'Clear Filters', { class: 'btn btn-outline btn-sm' });
        this.addListener(clearBtn, 'click', () => {
          this.resumeSearchQuery = '';
          this.resumeFilterType = 'all';
          const searchInput = this.container.querySelector('.sm-search-input');
          if (searchInput) searchInput.value = '';
          const typeSelect = this.container.querySelector('.sm-filter-select');
          if (typeSelect) typeSelect.value = 'all';
          this.renderResumeList();
        });
        empty.appendChild(clearBtn);
      }
      listContainer.appendChild(empty);
      return;
    }

    const grid = createElement('div', '', { class: 'sm-resume-grid', role: 'radiogroup', 'aria-label': 'Select a resume' });

    filtered.forEach((doc, index) => {
      const card = createElement('div', '', {
        class: 'sm-resume-card',
        role: 'radio',
        'aria-checked': 'false',
        'aria-label': doc.name || 'Untitled',
        'data-doc-id': doc.id
      });
      card.tabIndex = index === 0 ? 0 : -1;

      const typeIcons = { resume: '📄', cv: '📋', academicCV: '🎓', coverLetter: '✉️', referenceSheet: '👥' };
      const typeLabels = { resume: 'Resume', cv: 'CV', academicCV: 'Academic CV', coverLetter: 'Cover Letter', referenceSheet: 'References' };

      const cardHeader = createElement('div', '', { class: 'sm-resume-card-header' });
      const icon = createElement('span', typeIcons[doc.type] || '📄', { class: 'sm-resume-card-icon', 'aria-hidden': 'true' });
      cardHeader.appendChild(icon);
      const badge = createElement('span', typeLabels[doc.type] || 'Document', { class: 'sm-resume-card-badge' });
      cardHeader.appendChild(badge);
      if (doc.atsMode) {
        const atsBadge = createElement('span', 'ATS', { class: 'sm-resume-card-badge sm-badge-ats' });
        cardHeader.appendChild(atsBadge);
      }
      card.appendChild(cardHeader);

      const cardTitle = createElement('h3', '', { class: 'sm-resume-card-title' });
      cardTitle.textContent = doc.name || 'Untitled';
      card.appendChild(cardTitle);

      if (doc.targetRole) {
        const role = createElement('p', '', { class: 'sm-resume-card-detail' });
        role.textContent = doc.targetRole;
        card.appendChild(role);
      }

      const skillCount = this.countSkillsInDoc(doc);
      const sectionCount = (Array.isArray(doc.sections) ? doc.sections : []).filter(s => s.visible !== false).length;

      const metaRow = createElement('div', '', { class: 'sm-resume-card-meta' });
      const metaModified = createElement('span', formatTimeAgo(doc.lastModified), {});
      metaRow.appendChild(metaModified);
      const metaSep = createElement('span', ' · ', { 'aria-hidden': 'true' });
      metaRow.appendChild(metaSep);
      const metaSections = createElement('span', `${sectionCount} sections`, {});
      metaRow.appendChild(metaSections);
      if (skillCount > 0) {
        const metaSep2 = createElement('span', ' · ', { 'aria-hidden': 'true' });
        metaRow.appendChild(metaSep2);
        const metaSkills = createElement('span', `${skillCount} skills`, {});
        metaRow.appendChild(metaSkills);
      }
      card.appendChild(metaRow);

      this.addListener(card, 'click', () => this.selectResume(doc.id));
      this.addListener(card, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectResume(doc.id);
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

  countSkillsInDoc(doc) {
    if (!doc.sections || !Array.isArray(doc.sections)) return 0;
    let count = 0;
    for (const section of doc.sections) {
      if (['skills', 'technicalSkills', 'toolsAndTechnologies', 'coreCompetencies'].includes(section.sectionType || section.type)) {
        if (section.items) {
          for (const item of section.items) {
            if (item.skills) count += item.skills.split(/[,;|]/).filter(Boolean).length;
            else if (item.name) count += 1;
          }
        }
      }
    }
    return count;
  }

  async selectResume(docId) {
    try {
      this.selectedResume = await this.db.get('documents', docId);
      if (!this.selectedResume) {
        if (window.CC?.toast) window.CC.toast.show('Document not found', 'error');
        return;
      }
      this.selectedResumeId = docId;

      const saved = await this.loadSavedMatrix(docId);
      if (saved && !this.isMatrixStale(saved)) {
        this.analysisResult = saved.analysis;
        this.showMatrix();
        if (window.CC?.toast) window.CC.toast.show('Loaded saved analysis', 'info');
        return;
      }
      if (saved && this.isMatrixStale(saved)) {
        if (window.CC?.toast) window.CC.toast.show('Resume has changed since last analysis. Re-running...', 'info');
      }
      await this.runAnalysis();
    } catch (e) {
      console.error('Failed to select resume:', e);
      if (window.CC?.toast) window.CC.toast.show('Failed to load document', 'error');
    }
  }

  // ==================== ANALYSIS (Steps 3-7) ====================

  async runAnalysis() {
    const content = this.container.querySelector('#skills-matrix-content');
    if (!content) return;

    content.innerHTML = '';
    const loading = createElement('div', '', { class: 'sm-loading', role: 'status', 'aria-label': 'Analyzing resume' });
    loading.innerHTML = '<div class="sm-loading-spinner"></div><p>Analyzing skills evidence...</p>';
    content.appendChild(loading);

    await new Promise(r => setTimeout(r, 50));

    try {
      this.analysisResult = this.analyzer.analyze(this.selectedResume);
      this.showMatrix();
    } catch (e) {
      console.error('Analysis failed:', e);
      content.innerHTML = '';
      content.appendChild(this.renderError('Analysis failed. The document may have an unexpected structure.'));
    }
  }

  // ==================== MATRIX DISPLAY (Step 8) ====================

  showMatrix() {
    const content = this.container.querySelector('#skills-matrix-content');
    if (!content) return;
    content.innerHTML = '';

    const wrapper = createElement('div', '', { class: 'sm-matrix-wrapper' });

    wrapper.appendChild(this.renderSelectedResumeBar());
    wrapper.appendChild(this.renderSummaryCards());
    wrapper.appendChild(this.renderMatrixControls());
    wrapper.appendChild(this.renderMatrixTable());
    wrapper.appendChild(this.renderPrivacyFooter());

    content.appendChild(wrapper);
  }

  renderSelectedResumeBar() {
    const bar = createElement('div', '', { class: 'sm-selected-resume-bar' });
    const info = createElement('div', '', { class: 'sm-selected-resume-info' });
    const label = createElement('span', 'Analyzing: ', { class: 'sm-selected-label' });
    info.appendChild(label);
    const name = createElement('strong', '', {});
    name.textContent = this.selectedResume.name;
    info.appendChild(name);

    if (this.analysisResult) {
      const date = createElement('span', ` · Analyzed ${formatTimeAgo(this.analysisResult.analyzedAt)}`, { class: 'sm-analyzed-date' });
      info.appendChild(date);
    }
    bar.appendChild(info);

    const actions = createElement('div', '', { class: 'sm-selected-resume-actions' });
    const changeBtn = createElement('button', 'Change Resume', { class: 'btn btn-sm btn-outline' });
    this.addListener(changeBtn, 'click', () => {
      this.selectedResumeId = null;
      this.selectedResume = null;
      this.analysisResult = null;
      this.showResumeSelection();
    });
    actions.appendChild(changeBtn);

    const rerunBtn = createElement('button', 'Re-run Analysis', { class: 'btn btn-sm btn-secondary' });
    this.addListener(rerunBtn, 'click', () => this.runAnalysis());
    actions.appendChild(rerunBtn);

    const saveBtn = createElement('button', 'Save Matrix', { class: 'btn btn-sm btn-primary' });
    this.addListener(saveBtn, 'click', () => this.saveMatrix());
    actions.appendChild(saveBtn);

    const exportBtn = createElement('button', 'Export', { class: 'btn btn-sm btn-ghost' });
    this.addListener(exportBtn, 'click', () => this.showExportMenu(exportBtn));
    actions.appendChild(exportBtn);

    bar.appendChild(actions);
    return bar;
  }

  renderSummaryCards() {
    const summary = this.analysisResult.summary;
    const container = createElement('div', '', { class: 'sm-summary-cards' });

    const cards = [
      { label: 'Total Skills', value: summary.total, cls: 'sm-summary-total' },
      { label: 'Strong', value: summary.strong, cls: 'sm-summary-strong' },
      { label: 'Moderate', value: summary.moderate, cls: 'sm-summary-moderate' },
      { label: 'Limited', value: summary.limited, cls: 'sm-summary-limited' },
      { label: 'Listed Only', value: summary.listedOnly, cls: 'sm-summary-listed' },
      { label: 'Missing from Skills', value: summary.missingFromSkills, cls: 'sm-summary-missing' }
    ];

    cards.forEach(c => {
      const card = createElement('div', '', { class: `sm-summary-card ${c.cls}` });
      const val = createElement('div', String(c.value), { class: 'sm-summary-value' });
      card.appendChild(val);
      const lbl = createElement('div', c.label, { class: 'sm-summary-label' });
      card.appendChild(lbl);
      container.appendChild(card);
    });

    return container;
  }

  renderMatrixControls() {
    const controls = createElement('div', '', { class: 'sm-matrix-controls' });

    const searchInput = createElement('input', '', {
      class: 'sm-search-input',
      type: 'search',
      placeholder: 'Search skills...',
      'aria-label': 'Search skills'
    });
    this.addListener(searchInput, 'input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderMatrixBody();
    });
    controls.appendChild(searchInput);

    const categories = ['all', ...new Set(this.analysisResult.skills.map(s => s.category))];
    const catSelect = createElement('select', '', { class: 'sm-filter-select', 'aria-label': 'Filter by category' });
    categories.forEach(c => {
      const opt = createElement('option', c === 'all' ? 'All Categories' : c, { value: c });
      catSelect.appendChild(opt);
    });
    this.addListener(catSelect, 'change', (e) => { this.filterCategory = e.target.value; this.renderMatrixBody(); });
    controls.appendChild(catSelect);

    const strengthSelect = createElement('select', '', { class: 'sm-filter-select', 'aria-label': 'Filter by strength' });
    const strengths = [
      { value: 'all', label: 'All Strengths' },
      { value: STRENGTH_LEVELS.STRONG, label: 'Strong' },
      { value: STRENGTH_LEVELS.MODERATE, label: 'Moderate' },
      { value: STRENGTH_LEVELS.LIMITED, label: 'Limited' },
      { value: STRENGTH_LEVELS.LISTED_ONLY, label: 'Listed Only' },
      { value: 'missing', label: 'Missing from Skills' }
    ];
    strengths.forEach(s => {
      const opt = createElement('option', s.label, { value: s.value });
      strengthSelect.appendChild(opt);
    });
    this.addListener(strengthSelect, 'change', (e) => { this.filterStrength = e.target.value; this.renderMatrixBody(); });
    controls.appendChild(strengthSelect);

    const sortSelect = createElement('select', '', { class: 'sm-filter-select', 'aria-label': 'Sort skills' });
    const sortOpts = [
      { value: 'strength', label: 'Sort: Strength' },
      { value: 'name', label: 'Sort: Name A-Z' },
      { value: 'evidence', label: 'Sort: Evidence Count' },
      { value: 'category', label: 'Sort: Category' }
    ];
    sortOpts.forEach(s => {
      const opt = createElement('option', s.label, { value: s.value });
      sortSelect.appendChild(opt);
    });
    this.addListener(sortSelect, 'change', (e) => { this.sortField = e.target.value; this.renderMatrixBody(); });
    controls.appendChild(sortSelect);

    const clearBtn = createElement('button', 'Clear Filters', { class: 'btn btn-sm btn-ghost sm-clear-filters' });
    this.addListener(clearBtn, 'click', () => {
      this.searchQuery = '';
      this.filterCategory = 'all';
      this.filterStrength = 'all';
      this.sortField = 'strength';
      controls.querySelectorAll('input').forEach(i => { i.value = ''; });
      controls.querySelectorAll('select').forEach(s => { s.selectedIndex = 0; });
      this.renderMatrixBody();
    });
    controls.appendChild(clearBtn);

    return controls;
  }

  renderMatrixTable() {
    const wrapper = createElement('div', '', { class: 'sm-matrix-table-wrapper', id: 'sm-matrix-table-wrapper' });
    this.renderMatrixBody(wrapper);
    return wrapper;
  }

  renderMatrixBody(wrapper) {
    const container = wrapper || this.container.querySelector('#sm-matrix-table-wrapper');
    if (!container) return;
    container.innerHTML = '';

    let skills = [...this.analysisResult.skills];

    if (this.searchQuery) {
      skills = skills.filter(s => s.displayName.toLowerCase().includes(this.searchQuery) || s.category.toLowerCase().includes(this.searchQuery));
    }
    if (this.filterCategory !== 'all') {
      skills = skills.filter(s => s.category === this.filterCategory);
    }
    if (this.filterStrength === 'missing') {
      skills = skills.filter(s => s.status === SKILL_STATUSES.EVIDENCE_WITHOUT_LISTING);
    } else if (this.filterStrength !== 'all') {
      skills = skills.filter(s => s.strength === this.filterStrength);
    }

    switch (this.sortField) {
      case 'name': skills.sort((a, b) => a.displayName.localeCompare(b.displayName)); break;
      case 'evidence': skills.sort((a, b) => b.nonListingEvidenceCount - a.nonListingEvidenceCount); break;
      case 'category': skills.sort((a, b) => a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName)); break;
      default: {
        const order = { strong: 0, moderate: 1, limited: 2, listed_only: 3, suggested: 4, no_evidence: 5 };
        skills.sort((a, b) => (order[a.strength] || 5) - (order[b.strength] || 5) || a.displayName.localeCompare(b.displayName));
      }
    }

    if (skills.length === 0) {
      const empty = createElement('div', '', { class: 'sm-no-results' });
      empty.textContent = this.analysisResult.skills.length === 0 ? 'No skills found in this resume.' : 'No skills match your current filters.';
      container.appendChild(empty);
      return;
    }

    // Desktop table
    const table = createElement('table', '', { class: 'sm-table', 'aria-label': 'Skills Evidence Matrix' });
    const thead = createElement('thead', '', {});
    const headerRow = createElement('tr', '', {});
    ['Skill', 'Category', 'Status', 'Strength', 'Evidence', 'Recent Use', 'Actions'].forEach(h => {
      const th = createElement('th', h, { scope: 'col' });
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createElement('tbody', '', { id: 'sm-table-body' });
    skills.forEach(skill => {
      tbody.appendChild(this.renderSkillRow(skill));
      if (this.expandedSkillId === skill.id) {
        tbody.appendChild(this.renderEvidenceDetailRow(skill));
      }
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // Mobile cards
    const mobileContainer = createElement('div', '', { class: 'sm-mobile-cards' });
    skills.forEach(skill => {
      mobileContainer.appendChild(this.renderSkillCard(skill));
    });
    container.appendChild(mobileContainer);
  }

  renderSkillRow(skill) {
    const row = createElement('tr', '', { class: `sm-row sm-row--${skill.strength}`, 'data-skill-id': skill.id });

    const nameCell = createElement('td', '', { class: 'sm-cell-name' });
    const nameBtn = createElement('button', '', { class: 'sm-skill-name-btn' });
    nameBtn.textContent = skill.displayName;
    nameBtn.setAttribute('aria-expanded', this.expandedSkillId === skill.id ? 'true' : 'false');
    this.addListener(nameBtn, 'click', () => this.toggleSkillDetail(skill.id));
    nameCell.appendChild(nameBtn);
    if (!skill.listedInSkills) {
      const missingBadge = createElement('span', 'Not in Skills', { class: 'sm-badge sm-badge-missing' });
      nameCell.appendChild(missingBadge);
    }
    row.appendChild(nameCell);

    const catCell = createElement('td', skill.category, { class: 'sm-cell-category' });
    row.appendChild(catCell);

    const statusCell = createElement('td', '', { class: 'sm-cell-status' });
    const statusBadge = createElement('span', STATUS_LABELS[skill.status] || skill.status, {
      class: `sm-status-badge sm-status--${skill.strength}`
    });
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    const strengthCell = createElement('td', '', { class: 'sm-cell-strength' });
    const strengthIndicator = createElement('div', '', { class: 'sm-strength-indicator' });
    const dots = this.getStrengthDots(skill.strength);
    strengthIndicator.innerHTML = dots;
    const strengthLabel = createElement('span', STRENGTH_LABELS[skill.strength] || skill.strength, { class: 'sm-strength-label' });
    strengthIndicator.appendChild(strengthLabel);
    strengthCell.appendChild(strengthIndicator);
    row.appendChild(strengthCell);

    const evidenceCell = createElement('td', String(skill.nonListingEvidenceCount), { class: 'sm-cell-evidence' });
    row.appendChild(evidenceCell);

    const recentCell = createElement('td', '', { class: 'sm-cell-recent' });
    if (skill.mostRecentDate) {
      recentCell.textContent = skill.mostRecentDate.current ? 'Current' :
        (skill.mostRecentDate.year ? String(skill.mostRecentDate.year) : '—');
    } else {
      recentCell.textContent = '—';
    }
    row.appendChild(recentCell);

    const actionsCell = createElement('td', '', { class: 'sm-cell-actions' });
    const viewBtn = createElement('button', 'View', { class: 'btn btn-sm btn-ghost', 'aria-label': `View evidence for ${skill.displayName}` });
    this.addListener(viewBtn, 'click', () => this.toggleSkillDetail(skill.id));
    actionsCell.appendChild(viewBtn);

    if (!skill.listedInSkills && skill.status !== SKILL_STATUSES.REJECTED) {
      const addBtn = createElement('button', '+Add', { class: 'btn btn-sm btn-ghost sm-btn-add', 'aria-label': `Add ${skill.displayName} to skills section` });
      this.addListener(addBtn, 'click', () => this.addSkillToResume(skill));
      actionsCell.appendChild(addBtn);
    }
    row.appendChild(actionsCell);

    return row;
  }

  renderSkillCard(skill) {
    const card = createElement('div', '', { class: `sm-skill-card sm-card--${skill.strength}` });

    const cardHeader = createElement('div', '', { class: 'sm-skill-card-header' });
    const nameEl = createElement('h3', '', { class: 'sm-skill-card-name' });
    nameEl.textContent = skill.displayName;
    cardHeader.appendChild(nameEl);
    const strengthBadge = createElement('span', STRENGTH_LABELS[skill.strength] || '', {
      class: `sm-status-badge sm-status--${skill.strength}`
    });
    cardHeader.appendChild(strengthBadge);
    card.appendChild(cardHeader);

    const details = createElement('div', '', { class: 'sm-skill-card-details' });
    const cat = createElement('span', skill.category, { class: 'sm-skill-card-cat' });
    details.appendChild(cat);
    const sep = createElement('span', ' · ', { 'aria-hidden': 'true' });
    details.appendChild(sep);
    const evCount = createElement('span', `${skill.nonListingEvidenceCount} evidence`, {});
    details.appendChild(evCount);
    if (skill.mostRecentDate) {
      const sep2 = createElement('span', ' · ', { 'aria-hidden': 'true' });
      details.appendChild(sep2);
      const recent = createElement('span', skill.mostRecentDate.current ? 'Current' : String(skill.mostRecentDate.year || ''), {});
      details.appendChild(recent);
    }
    card.appendChild(details);

    if (!skill.listedInSkills) {
      const missing = createElement('div', 'Not listed in Skills section', { class: 'sm-skill-card-warning' });
      card.appendChild(missing);
    }

    if (skill.statusReasons && skill.statusReasons.length > 0) {
      const reasons = createElement('div', '', { class: 'sm-skill-card-reasons' });
      skill.statusReasons.forEach(r => {
        const reason = createElement('span', r, { class: 'sm-reason-chip' });
        reasons.appendChild(reason);
      });
      card.appendChild(reasons);
    }

    const viewBtn = createElement('button', 'View Evidence', { class: 'btn btn-sm btn-outline sm-card-view-btn', 'aria-label': `View evidence for ${skill.displayName}` });
    this.addListener(viewBtn, 'click', () => this.toggleSkillDetail(skill.id));
    card.appendChild(viewBtn);

    if (this.expandedSkillId === skill.id) {
      card.appendChild(this.renderEvidenceDetailPanel(skill));
    }

    return card;
  }

  getStrengthDots(level) {
    const levels = { strong: 4, moderate: 3, limited: 2, listed_only: 1, suggested: 0, no_evidence: 0 };
    const filled = levels[level] || 0;
    let html = '';
    for (let i = 0; i < 4; i++) {
      html += `<span class="sm-dot ${i < filled ? 'sm-dot--filled' : ''}" aria-hidden="true"></span>`;
    }
    return html;
  }

  // ==================== EVIDENCE DETAIL (Step 9) ====================

  toggleSkillDetail(skillId) {
    this.expandedSkillId = this.expandedSkillId === skillId ? null : skillId;
    this.renderMatrixBody();
  }

  renderEvidenceDetailRow(skill) {
    const row = createElement('tr', '', { class: 'sm-evidence-detail-row' });
    const cell = createElement('td', '', { colspan: '7' });
    cell.appendChild(this.renderEvidenceDetailPanel(skill));
    row.appendChild(cell);
    return row;
  }

  renderEvidenceDetailPanel(skill) {
    const panel = createElement('div', '', { class: 'sm-evidence-panel', role: 'region', 'aria-label': `Evidence for ${skill.displayName}` });

    const header = createElement('div', '', { class: 'sm-evidence-header' });
    const title = createElement('h3', '', { class: 'sm-evidence-title' });
    title.textContent = `${skill.displayName} — Evidence Detail`;
    header.appendChild(title);

    const statusInfo = createElement('div', '', { class: 'sm-evidence-status-info' });
    statusInfo.innerHTML = `
      <span class="sm-status-badge sm-status--${skill.strength}">${STRENGTH_LABELS[skill.strength] || skill.strength}</span>
      <span>${skill.category}</span>
    `;
    header.appendChild(statusInfo);
    panel.appendChild(header);

    if (skill.statusReasons && skill.statusReasons.length > 0) {
      const reasonsEl = createElement('div', '', { class: 'sm-evidence-reasons' });
      const reasonsTitle = createElement('h4', 'Why this rating:', { class: 'sm-evidence-reasons-title' });
      reasonsEl.appendChild(reasonsTitle);
      const reasonsList = createElement('ul', '', { class: 'sm-reasons-list' });
      skill.statusReasons.forEach(r => {
        const li = createElement('li', r, {});
        reasonsList.appendChild(li);
      });
      reasonsEl.appendChild(reasonsList);
      panel.appendChild(reasonsEl);
    }

    const evidenceList = createElement('div', '', { class: 'sm-evidence-list' });
    const evidenceTitle = createElement('h4', `Evidence Locations (${skill.evidence.length})`, { class: 'sm-evidence-list-title' });
    evidenceList.appendChild(evidenceTitle);

    if (skill.evidence.length === 0) {
      const noEvidence = createElement('p', 'No evidence found for this skill.', { class: 'sm-no-evidence' });
      evidenceList.appendChild(noEvidence);
    } else {
      skill.evidence.forEach(ev => {
        const card = createElement('div', '', { class: `sm-evidence-card sm-evidence-card--${ev.evidenceType}` });

        const evHeader = createElement('div', '', { class: 'sm-evidence-card-header' });
        const sectionLabel = createElement('span', ev.sectionTitle || ev.sectionType, { class: 'sm-evidence-section-label' });
        evHeader.appendChild(sectionLabel);

        const typeLabel = createElement('span', this.formatEvidenceType(ev.evidenceType), { class: 'sm-evidence-type-label' });
        evHeader.appendChild(typeLabel);

        if (ev.hidden) {
          const hiddenBadge = createElement('span', 'Hidden Section', { class: 'sm-badge sm-badge-hidden' });
          evHeader.appendChild(hiddenBadge);
        }
        if (ev.hasMetric) {
          const metricBadge = createElement('span', 'Has Metrics', { class: 'sm-badge sm-badge-metric' });
          evHeader.appendChild(metricBadge);
        }
        if (ev.hasResult) {
          const resultBadge = createElement('span', 'Result-Based', { class: 'sm-badge sm-badge-result' });
          evHeader.appendChild(resultBadge);
        }

        card.appendChild(evHeader);

        if (ev.excerpt) {
          const excerpt = createElement('blockquote', '', { class: 'sm-evidence-excerpt' });
          excerpt.textContent = ev.excerpt;
          card.appendChild(excerpt);
        }

        if (ev.dateRange) {
          const dateInfo = createElement('div', '', { class: 'sm-evidence-date' });
          dateInfo.textContent = this.formatDateRange(ev.dateRange);
          card.appendChild(dateInfo);
        }

        evidenceList.appendChild(card);
      });
    }

    panel.appendChild(evidenceList);

    // Timeline
    const timeline = this.renderSkillTimeline(skill);
    if (timeline) panel.appendChild(timeline);

    const actionBar = createElement('div', '', { class: 'sm-evidence-actions' });

    if (!skill.userConfirmed) {
      const confirmBtn = createElement('button', 'Confirm Skill', { class: 'btn btn-sm btn-primary' });
      this.addListener(confirmBtn, 'click', () => this.confirmSkill(skill.id));
      actionBar.appendChild(confirmBtn);
    } else {
      const confirmed = createElement('span', 'Confirmed', { class: 'sm-status-badge sm-status--strong' });
      actionBar.appendChild(confirmed);
    }

    if (!skill.userRejected && !skill.userConfirmed) {
      const rejectBtn = createElement('button', 'Reject Suggestion', { class: 'btn btn-sm btn-ghost sm-btn-reject' });
      this.addListener(rejectBtn, 'click', () => this.rejectSkill(skill.id));
      actionBar.appendChild(rejectBtn);
    }

    if (skill.userRejected) {
      const restoreBtn = createElement('button', 'Restore', { class: 'btn btn-sm btn-outline' });
      this.addListener(restoreBtn, 'click', () => this.restoreSkill(skill.id));
      actionBar.appendChild(restoreBtn);
    }

    if (!skill.listedInSkills && !skill.userRejected) {
      const addBtn = createElement('button', 'Add to Skills Section', { class: 'btn btn-sm btn-outline sm-btn-add' });
      this.addListener(addBtn, 'click', () => this.addSkillToResume(skill));
      actionBar.appendChild(addBtn);
    }

    panel.appendChild(actionBar);
    return panel;
  }

  renderSkillTimeline(skill) {
    const datedEvidence = skill.evidence.filter(e => e.dateRange && (e.dateRange.start || e.dateRange.end));
    if (datedEvidence.length === 0) return null;

    const container = createElement('div', '', { class: 'sm-timeline' });
    const title = createElement('h4', 'Evidence Timeline', { class: 'sm-timeline-title' });
    container.appendChild(title);

    const entries = datedEvidence.map(e => {
      const start = e.dateRange.start;
      const end = e.dateRange.end;
      return {
        label: e.sectionTitle || e.sectionType,
        type: this.formatEvidenceType(e.evidenceType),
        startYear: start ? start.year : null,
        endYear: end ? (end.current ? new Date().getFullYear() : end.year) : null,
        current: end?.current || false
      };
    }).filter(e => e.startYear || e.endYear).sort((a, b) => (a.startYear || 0) - (b.startYear || 0));

    if (entries.length === 0) return null;

    const allYears = entries.flatMap(e => [e.startYear, e.endYear].filter(Boolean));
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears, new Date().getFullYear());
    const span = maxYear - minYear || 1;

    const estimate = createElement('p', '', { class: 'sm-timeline-estimate' });
    estimate.textContent = `Earliest: ${minYear} · Latest: ${entries.some(e => e.current) ? 'Present' : maxYear} · Estimated from dated resume evidence`;
    container.appendChild(estimate);

    const track = createElement('div', '', { class: 'sm-timeline-track' });

    entries.forEach(entry => {
      const bar = createElement('div', '', { class: 'sm-timeline-bar' });
      const startPct = ((entry.startYear || minYear) - minYear) / span * 100;
      const endPct = ((entry.endYear || entry.startYear || minYear) - minYear) / span * 100;
      bar.style.left = `${startPct}%`;
      bar.style.width = `${Math.max(endPct - startPct, 3)}%`;
      bar.title = `${entry.label}: ${entry.startYear || '?'}–${entry.current ? 'Present' : (entry.endYear || '?')}`;

      const label = createElement('span', `${entry.label} (${entry.startYear || '?'}–${entry.current ? 'Present' : (entry.endYear || '?')})`, { class: 'sm-timeline-label' });
      bar.appendChild(label);
      track.appendChild(bar);
    });

    container.appendChild(track);
    return container;
  }

  showExportMenu(anchorBtn) {
    const existing = this.container.querySelector('.sm-export-menu');
    if (existing) { existing.remove(); return; }

    const menu = createElement('div', '', { class: 'sm-export-menu' });
    const items = [
      { label: 'Export JSON', action: () => this.exportJSON() },
      { label: 'Export CSV', action: () => this.exportCSV() },
      { label: 'Export Text Report', action: () => this.exportText() },
      { label: 'Print Report', action: () => window.print() }
    ];
    items.forEach(item => {
      const btn = createElement('button', item.label, { class: 'sm-export-menu-item' });
      this.addListener(btn, 'click', () => { menu.remove(); item.action(); });
      menu.appendChild(btn);
    });

    anchorBtn.parentElement.style.position = 'relative';
    anchorBtn.parentElement.appendChild(menu);

    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== anchorBtn) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  formatEvidenceType(type) {
    const labels = {
      skill_listing: 'Skill Listing',
      experience_usage: 'Work Experience',
      achievement_evidence: 'Achievement',
      project_evidence: 'Project',
      education_evidence: 'Education',
      certification_evidence: 'Certification',
      training_evidence: 'Training',
      publication_evidence: 'Publication',
      volunteer_evidence: 'Volunteer',
      leadership_evidence: 'Leadership',
      custom_evidence: 'Custom Section',
      summary_mention: 'Summary/Headline'
    };
    return labels[type] || type;
  }

  formatDateRange(range) {
    if (!range) return '';
    const fmt = (d) => {
      if (!d) return '?';
      if (d.current) return 'Present';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return d.month ? `${months[(d.month - 1)] || ''} ${d.year}` : String(d.year);
    };
    if (range.start && range.end) return `${fmt(range.start)} – ${fmt(range.end)}`;
    if (range.start) return fmt(range.start);
    return '';
  }

  // ==================== RECONCILIATION (Step 10) ====================

  async addSkillToResume(skill) {
    if (!this.selectedResume) return;
    const resume = await this.db.get('documents', this.selectedResumeId);
    if (!resume) { if (window.CC?.toast) window.CC.toast.show('Resume not found', 'error'); return; }

    let skillsSection = resume.sections.find(s =>
      ['skills', 'technicalSkills', 'toolsAndTechnologies', 'coreCompetencies'].includes(s.sectionType || s.type)
    );

    if (!skillsSection) {
      const { generateUUID } = await import('../utils/id.js');
      skillsSection = { id: generateUUID(), sectionType: 'skills', title: 'Skills', type: 'list', visible: true, content: '', items: [] };
      resume.sections.push(skillsSection);
    }

    const alreadyExists = (skillsSection.items || []).some(item => {
      const text = (item.skills || item.name || '').toLowerCase();
      return text.includes(skill.displayName.toLowerCase());
    });

    if (alreadyExists) {
      if (window.CC?.toast) window.CC.toast.show(`"${skill.displayName}" is already in skills section`, 'info');
      return;
    }

    if (!confirm(`Add "${skill.displayName}" to your Skills section?`)) return;

    const { generateUUID } = await import('../utils/id.js');
    skillsSection.items = skillsSection.items || [];
    skillsSection.items.push({
      id: generateUUID(), name: skill.displayName, category: skill.category,
      skills: skill.displayName, included: true, order: skillsSection.items.length
    });

    resume.lastModified = new Date().toISOString();
    await this.db.put('documents', resume);
    this.selectedResume = resume;

    if (window.CC?.toast) window.CC.toast.show(`Added "${skill.displayName}" to Skills section`, 'success');
    await this.runAnalysis();
  }

  async confirmSkill(skillId) {
    if (!this.analysisResult) return;
    const skill = this.analysisResult.skills.find(s => s.id === skillId);
    if (skill) {
      skill.userConfirmed = true;
      skill.userRejected = false;
      this.renderMatrixBody();
    }
  }

  async rejectSkill(skillId) {
    if (!this.analysisResult) return;
    const skill = this.analysisResult.skills.find(s => s.id === skillId);
    if (skill) {
      skill.userRejected = true;
      skill.userConfirmed = false;
      skill.status = SKILL_STATUSES.REJECTED;
      this.renderMatrixBody();
      if (window.CC?.toast) window.CC.toast.show(`Rejected "${skill.displayName}"`, 'info');
    }
  }

  async restoreSkill(skillId) {
    if (!this.analysisResult) return;
    const skill = this.analysisResult.skills.find(s => s.id === skillId);
    if (skill) {
      skill.userRejected = false;
      skill.status = skill.listedInSkills ? SKILL_STATUSES.LISTED_WITHOUT_EVIDENCE : SKILL_STATUSES.EVIDENCE_WITHOUT_LISTING;
      this.renderMatrixBody();
    }
  }

  // ==================== EXPORT (Step 14) ====================

  exportJSON() {
    if (!this.analysisResult) return;
    const data = {
      schemaVersion: 1,
      methodVersion: '1.0',
      exportedAt: new Date().toISOString(),
      resume: { id: this.selectedResume.id, name: this.selectedResume.name, type: this.selectedResume.type },
      analysis: this.analysisResult,
      disclaimer: 'This analysis is based on text matching and rule-based assessment. It does not represent professional evaluation of skill proficiency.'
    };
    this.downloadFile(JSON.stringify(data, null, 2), `skills-matrix-${this.sanitizeFilename(this.selectedResume.name)}.json`, 'application/json');
  }

  exportCSV() {
    if (!this.analysisResult) return;
    const header = 'Skill,Category,Status,Strength,Evidence Count,Most Recent Use,Listed in Skills\n';
    const rows = this.analysisResult.skills.map(s => {
      return [
        `"${s.displayName.replace(/"/g, '""')}"`,
        `"${s.category}"`,
        `"${STATUS_LABELS[s.status] || s.status}"`,
        `"${STRENGTH_LABELS[s.strength] || s.strength}"`,
        s.nonListingEvidenceCount,
        s.mostRecentDate ? (s.mostRecentDate.current ? 'Current' : s.mostRecentDate.year) : '',
        s.listedInSkills ? 'Yes' : 'No'
      ].join(',');
    }).join('\n');
    this.downloadFile(header + rows, `skills-matrix-${this.sanitizeFilename(this.selectedResume.name)}.csv`, 'text/csv');
  }

  exportText() {
    if (!this.analysisResult) return;
    const r = this.analysisResult;
    let text = `SKILLS EVIDENCE MATRIX REPORT\n${'='.repeat(40)}\n\n`;
    text += `Resume: ${this.selectedResume.name}\n`;
    text += `Analysis Date: ${new Date(r.analyzedAt).toLocaleDateString()}\n`;
    text += `Total Skills: ${r.summary.total}\n\n`;
    text += `SUMMARY\n${'-'.repeat(20)}\n`;
    text += `Strong: ${r.summary.strong} | Moderate: ${r.summary.moderate} | Limited: ${r.summary.limited}\n`;
    text += `Listed Only: ${r.summary.listedOnly} | Missing from Skills: ${r.summary.missingFromSkills}\n\n`;

    const groups = {};
    r.skills.forEach(s => { (groups[s.category] = groups[s.category] || []).push(s); });

    for (const [cat, skills] of Object.entries(groups)) {
      text += `\n${cat.toUpperCase()}\n${'-'.repeat(cat.length)}\n`;
      skills.forEach(s => {
        text += `  ${s.displayName} — ${STRENGTH_LABELS[s.strength] || s.strength} (${s.nonListingEvidenceCount} evidence)\n`;
      });
    }

    text += `\n\nDISCLAIMER: This analysis is based on text matching and rule-based assessment.\n`;
    text += `It does not represent professional evaluation of skill proficiency.\n`;

    this.downloadFile(text, `skills-matrix-${this.sanitizeFilename(this.selectedResume.name)}.txt`, 'text/plain');
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  sanitizeFilename(name) {
    return (name || 'document').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  }

  // ==================== SAVE/LOAD MATRIX (Step 13) ====================

  async saveMatrix() {
    if (!this.analysisResult || !this.selectedResumeId) return;
    const { generateUUID } = await import('../utils/id.js');
    const now = new Date().toISOString();

    const existing = await this.loadSavedMatrix(this.selectedResumeId);
    const record = {
      id: existing ? existing.id : generateUUID(),
      documentId: this.selectedResumeId,
      resumeFingerprint: this.analysisResult.resumeFingerprint,
      resumeLastModified: this.selectedResume.lastModified,
      analysisMethodVersion: '1.0',
      analysis: this.analysisResult,
      createdAt: existing ? existing.createdAt : now,
      lastModified: now
    };

    try {
      await this.db.put('skillsMatrices', record);
      if (window.CC?.toast) window.CC.toast.show('Matrix saved', 'success');
    } catch (e) {
      console.error('Failed to save matrix:', e);
      if (window.CC?.toast) window.CC.toast.show('Failed to save matrix', 'error');
    }
  }

  async loadSavedMatrix(docId) {
    try {
      const all = await this.db.getAll('skillsMatrices');
      return all.find(m => m.documentId === docId) || null;
    } catch (e) {
      return null;
    }
  }

  isMatrixStale(savedMatrix) {
    if (!savedMatrix || !this.selectedResume) return true;
    return savedMatrix.resumeFingerprint !== this.analyzer.computeFingerprint(this.selectedResume);
  }

  // ==================== COMMON ====================

  renderError(message) {
    const el = createElement('div', '', { class: 'sm-error' });
    const icon = createElement('span', '⚠', { class: 'sm-error-icon', 'aria-hidden': 'true' });
    el.appendChild(icon);
    const text = createElement('p', message, { class: 'sm-error-text' });
    el.appendChild(text);
    const retryBtn = createElement('button', 'Try Again', { class: 'btn btn-sm btn-primary' });
    this.addListener(retryBtn, 'click', () => this.showResumeSelection());
    el.appendChild(retryBtn);
    return el;
  }

  renderPrivacyFooter() {
    const footer = createElement('div', '', { class: 'skills-matrix-privacy-note' });
    const lockIcon = createElement('span', '', { 'aria-hidden': 'true' });
    lockIcon.innerHTML = '&#128274;';
    footer.appendChild(lockIcon);
    footer.appendChild(document.createTextNode(' Your resume and skill evidence are analyzed locally in this browser and are not uploaded by this tool.'));
    return footer;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  hasUnsavedChanges() {
    return false;
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
    this.selectedResumeId = null;
    this.selectedResume = null;
    this.analysisResult = null;
  }
}

export default SkillsMatrix;
