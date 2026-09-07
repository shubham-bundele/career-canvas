import { createElement, sanitizeInput, sanitizeURL, sanitizeFilename, stripHTML, encodeHTML } from '../utils/sanitize.js';
import { formatTimeAgo, countWords } from '../utils/format.js';
import { generateUUID } from '../utils/id.js';
import eventBus from '../core/events.js';
import { STORES } from '../core/db.js';
import { MATCH_VERBS } from '../data/action-verbs.js';

const ANALYSIS_METHOD_VERSION = '1.0.0';
const MAX_JD_LENGTH = 50000;
const MAX_TITLE_LENGTH = 200;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;

export class JobMatcher {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];

    this.documents = [];
    this.jobDescriptions = [];
    this.savedAnalyses = [];

    this.selectedResumeId = null;
    this.selectedResume = null;
    this.activeJD = null;
    this.analysisResult = null;

    this.resumeSearch = '';
    this.resumeSort = 'lastModified';
    this.resumeSortDir = 'desc';
    this.resumeTypeFilter = 'all';

    this.resultSearch = '';
    this.resultFilter = 'all';
    this.resultCategoryFilter = 'all';
    this.resultSort = 'importance';
    this.dismissedIds = new Set();

    this.view = 'home';
    this.currentOperationId = null;
    this.operationCancelled = false;
  }

  // ==================== RENDER / LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'jm-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Job Description Matcher');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'jm-content', id: 'jm-content' });
    this.container.appendChild(content);
    await this.showHome();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'jm-header' });
    const breadcrumb = createElement('nav', '', { class: 'jm-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });
    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);
    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);
    const cur = createElement('li', 'Job Description Matcher', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);
    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    const row = createElement('div', '', { class: 'jm-title-row' });
    const group = createElement('div', '', { class: 'jm-title-group' });
    group.appendChild(createElement('h1', 'Job Description Matcher', { class: 'jm-title' }));
    group.appendChild(createElement('p', 'Compare your resume against job descriptions to identify matching keywords, missing terms, and improvement opportunities. Everything runs locally in your browser.', { class: 'jm-description' }));
    row.appendChild(group);
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline jm-back-btn' });
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

  hasUnsavedChanges() {
    return this.view === 'setup' && this.activeJD && (this.activeJD.descriptionText || '').trim().length > 0;
  }

  destroy() {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  // ==================== HOME VIEW ====================

  async showHome() {
    const c = this.gc(); c.innerHTML = ''; this.view = 'home';
    try { this.savedAnalyses = await this.db.getAll(STORES.MATCH_ANALYSES); } catch { this.savedAnalyses = []; }
    try { this.jobDescriptions = await this.db.getAll(STORES.JOB_DESCRIPTIONS); } catch { this.jobDescriptions = []; }

    const w = createElement('div', '', { class: 'jm-home' });

    const startCard = createElement('div', '', { class: 'jm-start-card' });
    startCard.tabIndex = 0;
    const icon = createElement('div', '', { class: 'jm-start-icon', 'aria-hidden': 'true' });
    icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect x="4" y="8" width="24" height="32" rx="2" stroke="currentColor" stroke-width="2"/><rect x="36" y="24" width="24" height="32" rx="2" stroke="currentColor" stroke-width="2"/><line x1="8" y1="16" x2="24" y2="16" stroke="currentColor" stroke-width="2"/><line x1="8" y1="22" x2="24" y2="22" stroke="currentColor" stroke-width="2"/><line x1="8" y1="28" x2="20" y2="28" stroke="currentColor" stroke-width="2"/><line x1="40" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="2"/><line x1="40" y1="38" x2="56" y2="38" stroke="currentColor" stroke-width="2"/><line x1="40" y1="44" x2="52" y2="44" stroke="currentColor" stroke-width="2"/><path d="M28 24 L36 32" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/></svg>';
    startCard.appendChild(icon);
    startCard.appendChild(createElement('h2', 'Start New Analysis', { class: 'jm-start-title' }));
    startCard.appendChild(createElement('p', 'Select a resume and paste a job description to compare them.', { class: 'jm-start-msg' }));
    const startBtn = createElement('button', 'New Analysis', { class: 'btn btn-primary' });
    this.addListener(startBtn, 'click', () => this.showSetup());
    startCard.appendChild(startBtn);
    this.addListener(startCard, 'keydown', e => { if (e.key === 'Enter') this.showSetup(); });
    w.appendChild(startCard);

    if (this.savedAnalyses.length === 0 && this.jobDescriptions.filter(j => !j.archived).length === 0) {
      w.appendChild(createElement('p', 'Your past analyses and saved job descriptions will appear here.', { class: 'jm-empty-hint' }));
    }

    if (this.savedAnalyses.length > 0) {
      const sec = createElement('div', '', { class: 'jm-saved-section' });
      sec.appendChild(createElement('h2', `Saved Analyses (${this.savedAnalyses.length})`, { class: 'jm-section-title' }));
      const list = createElement('div', '', { class: 'jm-saved-list' });
      [...this.savedAnalyses].sort((a, b) => new Date(b.lastModified || b.createdAt) - new Date(a.lastModified || a.createdAt))
        .forEach(a => list.appendChild(this.renderSavedCard(a)));
      sec.appendChild(list);
      w.appendChild(sec);
    }

    if (this.jobDescriptions.length > 0) {
      const jdSec = createElement('div', '', { class: 'jm-saved-section' });
      jdSec.appendChild(createElement('h2', `Saved Job Descriptions (${this.jobDescriptions.filter(j => !j.archived).length})`, { class: 'jm-section-title' }));
      const jdList = createElement('div', '', { class: 'jm-saved-list' });
      this.jobDescriptions.filter(j => !j.archived)
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .forEach(jd => {
          const card = createElement('div', '', { class: 'jm-saved-card' });
          card.tabIndex = 0;
          const hdr = createElement('div', '', { class: 'jm-saved-card-header' });
          const t = createElement('h3', '', { class: 'jm-saved-card-title' });
          t.textContent = jd.title || 'Untitled';
          hdr.appendChild(t);
          card.appendChild(hdr);
          if (jd.company) { const co = createElement('p', '', { class: 'jm-saved-card-company' }); co.textContent = jd.company; card.appendChild(co); }
          const meta = createElement('div', '', { class: 'jm-saved-card-meta' });
          meta.textContent = `${countWords(jd.descriptionText || '')} words · ${formatTimeAgo(jd.lastModified)}`;
          card.appendChild(meta);
          const acts = createElement('div', '', { class: 'jm-saved-card-actions' });
          const useBtn = createElement('button', 'Use', { class: 'btn btn-sm btn-primary' });
          this.addListener(useBtn, 'click', e => { e.stopPropagation(); this.loadJDAndShowSetup(jd); });
          acts.appendChild(useBtn);
          const delBtn = createElement('button', 'Delete', { class: 'btn btn-sm btn-ghost jm-delete-btn' });
          this.addListener(delBtn, 'click', e => { e.stopPropagation(); this.deleteJD(jd.id); });
          acts.appendChild(delBtn);
          card.appendChild(acts);
          this.addListener(card, 'click', () => this.loadJDAndShowSetup(jd));
          this.addListener(card, 'keydown', e => { if (e.key === 'Enter') this.loadJDAndShowSetup(jd); });
          jdList.appendChild(card);
        });
      jdSec.appendChild(jdList);
      w.appendChild(jdSec);
    }

    c.appendChild(w);
  }

  renderSavedCard(analysis) {
    const card = createElement('div', '', { class: 'jm-saved-card' });
    card.tabIndex = 0;
    const hdr = createElement('div', '', { class: 'jm-saved-card-header' });
    const title = createElement('h3', '', { class: 'jm-saved-card-title' });
    title.textContent = analysis.name || analysis.jobTitle || 'Untitled';
    hdr.appendChild(title);
    if (analysis.overallEstimate !== undefined) {
      hdr.appendChild(createElement('span', `${analysis.overallEstimate}%`, {
        class: `jm-score-badge ${this.getScoreClass(analysis.overallEstimate)}`
      }));
    } else if (analysis.matchScore !== undefined) {
      hdr.appendChild(createElement('span', `${analysis.matchScore}%`, {
        class: `jm-score-badge ${this.getScoreClass(analysis.matchScore)}`
      }));
    }
    card.appendChild(hdr);
    if (analysis.company) { const co = createElement('p', '', { class: 'jm-saved-card-company' }); co.textContent = analysis.company; card.appendChild(co); }
    const meta = createElement('div', '', { class: 'jm-saved-card-meta' });
    meta.textContent = `Resume: ${analysis.resumeNameSnapshot || analysis.resumeName || 'Unknown'} · ${formatTimeAgo(analysis.lastModified || analysis.createdAt)}`;
    card.appendChild(meta);
    if (analysis.staleStatus && analysis.staleStatus !== 'current') {
      const stale = createElement('div', '', { class: 'jm-stale-badge' });
      stale.textContent = 'May be outdated';
      card.appendChild(stale);
    }
    const acts = createElement('div', '', { class: 'jm-saved-card-actions' });
    const viewBtn = createElement('button', 'View', { class: 'btn btn-sm btn-outline' });
    this.addListener(viewBtn, 'click', e => { e.stopPropagation(); this.viewSavedAnalysis(analysis); });
    acts.appendChild(viewBtn);
    const delBtn = createElement('button', 'Delete', { class: 'btn btn-sm btn-ghost jm-delete-btn' });
    this.addListener(delBtn, 'click', e => { e.stopPropagation(); this.deleteAnalysis(analysis.id); });
    acts.appendChild(delBtn);
    card.appendChild(acts);
    this.addListener(card, 'click', () => this.viewSavedAnalysis(analysis));
    this.addListener(card, 'keydown', e => { if (e.key === 'Enter') this.viewSavedAnalysis(analysis); });
    return card;
  }

  // ==================== SETUP VIEW (Steps 2 & 3) ====================

  async showSetup() {
    const c = this.gc(); c.innerHTML = ''; this.view = 'setup';
    try { this.documents = await this.db.getAll(STORES.DOCUMENTS); } catch { this.documents = []; }

    const w = createElement('div', '', { class: 'jm-setup' });

    // Step indicator
    const steps = createElement('div', '', { class: 'jm-steps', role: 'list', 'aria-label': 'Analysis steps' });
    steps.innerHTML = '<span class="jm-step jm-step--active" role="listitem" aria-current="step">1. Select Resume</span><span class="jm-step-sep" aria-hidden="true">&#8594;</span><span class="jm-step" role="listitem">2. Job Description</span><span class="jm-step-sep" aria-hidden="true">&#8594;</span><span class="jm-step" role="listitem">3. Analyze</span>';
    w.appendChild(steps);

    const cols = createElement('div', '', { class: 'jm-setup-columns' });

    // LEFT: Resume selection
    const left = createElement('div', '', { class: 'jm-setup-col' });
    left.appendChild(createElement('h2', 'Select Resume', { class: 'jm-col-title', id: 'resume-select-label' }));

    // Search
    const searchRow = createElement('div', '', { class: 'jm-search-row' });
    const searchInput = createElement('input', '', { class: 'jm-field-input jm-search-input', type: 'search', placeholder: 'Search resumes...', 'aria-label': 'Search resumes' });
    searchInput.value = this.resumeSearch;
    this.addListener(searchInput, 'input', e => { this.resumeSearch = e.target.value; this.renderResumeList(); });
    searchRow.appendChild(searchInput);

    const sortSelect = createElement('select', '', { class: 'jm-sort-select', 'aria-label': 'Sort resumes' });
    [['lastModified', 'Last Modified'], ['name', 'Name A-Z'], ['created', 'Date Created']].forEach(([v, l]) => {
      const o = createElement('option', l, { value: v });
      if (v === this.resumeSort) o.selected = true;
      sortSelect.appendChild(o);
    });
    this.addListener(sortSelect, 'change', e => { this.resumeSort = e.target.value; this.renderResumeList(); });
    searchRow.appendChild(sortSelect);
    left.appendChild(searchRow);

    // Type filter
    const filterRow = createElement('div', '', { class: 'jm-filter-row' });
    [['all', 'All'], ['resume', 'Resumes'], ['cv', 'CVs']].forEach(([v, l]) => {
      const btn = createElement('button', l, { class: `jm-filter-btn ${this.resumeTypeFilter === v ? 'jm-filter-btn--active' : ''}`, type: 'button' });
      this.addListener(btn, 'click', () => {
        this.resumeTypeFilter = v;
        filterRow.querySelectorAll('.jm-filter-btn').forEach(b => b.classList.remove('jm-filter-btn--active'));
        btn.classList.add('jm-filter-btn--active');
        this.renderResumeList();
      });
      filterRow.appendChild(btn);
    });
    left.appendChild(filterRow);

    const resumeListEl = createElement('div', '', { class: 'jm-resume-list', id: 'jm-resume-list', role: 'listbox', 'aria-labelledby': 'resume-select-label' });
    left.appendChild(resumeListEl);
    cols.appendChild(left);

    // RIGHT: Job description
    const right = createElement('div', '', { class: 'jm-setup-col' });
    right.appendChild(createElement('h2', 'Job Description', { class: 'jm-col-title' }));

    // JD toolbar
    const jdToolbar = createElement('div', '', { class: 'jm-jd-toolbar' });
    const newJdBtn = createElement('button', 'New', { class: 'btn btn-sm btn-outline' });
    this.addListener(newJdBtn, 'click', () => this.newJD());
    jdToolbar.appendChild(newJdBtn);
    const loadJdBtn = createElement('button', 'Load Saved', { class: 'btn btn-sm btn-outline' });
    this.addListener(loadJdBtn, 'click', () => this.showJDPicker());
    jdToolbar.appendChild(loadJdBtn);
    const saveJdBtn = createElement('button', 'Save', { class: 'btn btn-sm btn-outline', id: 'jm-save-jd-btn' });
    this.addListener(saveJdBtn, 'click', () => this.saveCurrentJD());
    jdToolbar.appendChild(saveJdBtn);
    right.appendChild(jdToolbar);

    // Init activeJD if needed
    if (!this.activeJD) this.newJD(true);

    // Title
    const titleGrp = createElement('div', '', { class: 'jm-field-group' });
    titleGrp.appendChild(createElement('label', 'Job Title', { class: 'jm-field-label', for: 'jm-jd-title' }));
    const titleIn = createElement('input', '', { class: 'jm-field-input', type: 'text', id: 'jm-jd-title', placeholder: 'e.g., Senior Software Engineer', maxlength: String(MAX_TITLE_LENGTH) });
    titleIn.value = this.activeJD.title || '';
    this.addListener(titleIn, 'input', e => { this.activeJD.title = e.target.value; });
    titleGrp.appendChild(titleIn);
    right.appendChild(titleGrp);

    // Company
    const compGrp = createElement('div', '', { class: 'jm-field-group' });
    compGrp.appendChild(createElement('label', 'Company', { class: 'jm-field-label', for: 'jm-jd-company' }));
    const compIn = createElement('input', '', { class: 'jm-field-input', type: 'text', id: 'jm-jd-company', placeholder: 'e.g., Acme Corp', maxlength: String(MAX_TITLE_LENGTH) });
    compIn.value = this.activeJD.company || '';
    this.addListener(compIn, 'input', e => { this.activeJD.company = e.target.value; });
    compGrp.appendChild(compIn);
    right.appendChild(compGrp);

    // Source URL
    const urlGrp = createElement('div', '', { class: 'jm-field-group' });
    urlGrp.appendChild(createElement('label', 'Source URL (optional)', { class: 'jm-field-label', for: 'jm-jd-url' }));
    const urlIn = createElement('input', '', { class: 'jm-field-input', type: 'url', id: 'jm-jd-url', placeholder: 'https://...', maxlength: '2048' });
    urlIn.value = this.activeJD.sourceUrl || '';
    this.addListener(urlIn, 'input', e => { this.activeJD.sourceUrl = e.target.value; });
    urlGrp.appendChild(urlIn);
    right.appendChild(urlGrp);

    // Description textarea
    const jdGrp = createElement('div', '', { class: 'jm-field-group jm-field-group--grow' });
    jdGrp.appendChild(createElement('label', 'Paste the full job description', { class: 'jm-field-label', for: 'jm-jd-text' }));
    const ta = createElement('textarea', '', { class: 'jm-jd-textarea', id: 'jm-jd-text', placeholder: 'Paste the complete job description here...\n\nInclude responsibilities, requirements, qualifications, and preferred skills for the best analysis.', rows: '12' });
    ta.value = this.activeJD.descriptionText || '';
    ta.maxLength = MAX_JD_LENGTH;
    this.addListener(ta, 'input', e => {
      this.activeJD.descriptionText = e.target.value;
      this.updateWordCount();
      this.updateAnalyzeBtn();
    });
    jdGrp.appendChild(ta);
    const wcRow = createElement('div', '', { class: 'jm-wc-row' });
    wcRow.appendChild(createElement('span', '', { class: 'jm-word-count', id: 'jm-word-count' }));
    wcRow.appendChild(createElement('span', '', { class: 'jm-char-count', id: 'jm-char-count' }));
    jdGrp.appendChild(wcRow);
    right.appendChild(jdGrp);

    cols.appendChild(right);
    w.appendChild(cols);

    // Action bar
    const bar = createElement('div', '', { class: 'jm-action-bar' });
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-outline' });
    this.addListener(cancelBtn, 'click', () => { this.resetState(); this.showHome(); });
    bar.appendChild(cancelBtn);
    const analyzeBtn = createElement('button', 'Analyze Match', { class: 'btn btn-primary jm-analyze-btn', id: 'jm-analyze-btn', disabled: 'true' });
    this.addListener(analyzeBtn, 'click', () => this.runAnalysis());
    bar.appendChild(analyzeBtn);
    w.appendChild(bar);

    c.appendChild(w);
    this.renderResumeList();
    this.updateWordCount();
    this.updateAnalyzeBtn();
  }

  renderResumeList() {
    const listEl = this.container?.querySelector('#jm-resume-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    let eligible = this.documents.filter(d => !d.archived && ['resume', 'cv', 'academicCV'].includes(d.type));
    if (this.resumeTypeFilter !== 'all') {
      eligible = eligible.filter(d => d.type === this.resumeTypeFilter);
    }
    if (this.resumeSearch.trim()) {
      const q = this.resumeSearch.toLowerCase();
      eligible = eligible.filter(d => (d.name || '').toLowerCase().includes(q) || (d.targetRole || '').toLowerCase().includes(q));
    }
    switch (this.resumeSort) {
      case 'name': eligible.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'created': eligible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default: eligible.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    if (eligible.length === 0) {
      const empty = createElement('div', '', { class: 'jm-empty-msg' });
      empty.textContent = this.documents.filter(d => ['resume', 'cv', 'academicCV'].includes(d.type)).length === 0
        ? 'No resumes found. Create one from the Dashboard first.'
        : 'No resumes match your search.';
      listEl.appendChild(empty);
      return;
    }

    eligible.forEach(doc => {
      const item = createElement('button', '', {
        class: `jm-resume-item ${this.selectedResumeId === doc.id ? 'jm-resume-item--selected' : ''}`,
        type: 'button', role: 'option',
        'aria-selected': this.selectedResumeId === doc.id ? 'true' : 'false'
      });
      const top = createElement('div', '', { class: 'jm-resume-item-top' });
      const name = createElement('span', '', { class: 'jm-resume-item-name' });
      name.textContent = (doc.name || '').trim() || 'Untitled';
      top.appendChild(name);
      const badge = createElement('span', doc.type === 'cv' ? 'CV' : 'Resume', { class: `jm-type-badge jm-type-badge--${doc.type}` });
      top.appendChild(badge);
      item.appendChild(top);
      if (doc.targetRole) {
        const role = createElement('span', '', { class: 'jm-resume-item-role' });
        role.textContent = doc.targetRole;
        item.appendChild(role);
      }
      const meta = createElement('span', '', { class: 'jm-resume-item-meta' });
      meta.textContent = `${doc.templateId || 'default'} · ${formatTimeAgo(doc.lastModified)}`;
      item.appendChild(meta);

      this.addListener(item, 'click', () => {
        this.selectedResumeId = doc.id;
        this.selectedResume = doc;
        listEl.querySelectorAll('.jm-resume-item').forEach(el => {
          el.classList.remove('jm-resume-item--selected');
          el.setAttribute('aria-selected', 'false');
        });
        item.classList.add('jm-resume-item--selected');
        item.setAttribute('aria-selected', 'true');
        this.updateAnalyzeBtn();
      });
      listEl.appendChild(item);
    });
  }

  updateWordCount() {
    const wc = this.container?.querySelector('#jm-word-count');
    const cc = this.container?.querySelector('#jm-char-count');
    const text = this.activeJD?.descriptionText || '';
    if (wc) wc.textContent = `${countWords(text)} words`;
    if (cc) cc.textContent = `${text.length} / ${MAX_JD_LENGTH} chars`;
  }

  updateAnalyzeBtn() {
    const btn = this.container?.querySelector('#jm-analyze-btn');
    if (!btn) return;
    btn.disabled = !(this.selectedResumeId && (this.activeJD?.descriptionText || '').trim().length >= 20);
  }

  // ==================== JOB DESCRIPTION CRUD (Step 3) ====================

  newJD(silent = false) {
    this.activeJD = {
      id: generateUUID(), schemaVersion: 1,
      title: '', company: '', targetRole: '', sourceUrl: '',
      descriptionText: '', normalizedText: '', tags: [],
      archived: false,
      createdAt: new Date().toISOString(), lastModified: new Date().toISOString(),
      analysisIds: []
    };
    if (!silent && this.view === 'setup') this.showSetup();
  }

  async saveCurrentJD() {
    if (!this.activeJD) return;
    const jd = this.activeJD;
    jd.title = sanitizeInput(jd.title, MAX_TITLE_LENGTH) || 'Untitled Job Description';
    jd.company = sanitizeInput(jd.company, MAX_TITLE_LENGTH);
    jd.descriptionText = (jd.descriptionText || '').substring(0, MAX_JD_LENGTH);
    jd.normalizedText = this.normalizeText(jd.descriptionText);
    jd.lastModified = new Date().toISOString();
    if (jd.sourceUrl) { const s = sanitizeURL(jd.sourceUrl, ['http:', 'https:']); jd.sourceUrl = s || ''; }
    try {
      await this.db.put(STORES.JOB_DESCRIPTIONS, jd);
      if (window.CC?.toast) window.CC.toast.show('Job description saved', 'success');
    } catch (e) {
      if (window.CC?.toast) window.CC.toast.show('Failed to save', 'error');
    }
  }

  async loadJDAndShowSetup(jd) {
    this.activeJD = { ...jd };
    await this.showSetup();
  }

  async deleteJD(id) {
    if (!confirm('Delete this job description?')) return;
    try {
      await this.db.delete(STORES.JOB_DESCRIPTIONS, id);
      if (window.CC?.toast) window.CC.toast.show('Job description deleted', 'info');
      if (this.activeJD?.id === id) this.newJD(true);
      await this.showHome();
    } catch (e) {
      if (window.CC?.toast) window.CC.toast.show('Failed to delete', 'error');
    }
  }

  showJDPicker() {
    if (!window.CC?.modal) return;
    const body = createElement('div', '', { class: 'jm-jd-picker' });
    const jds = this.jobDescriptions.filter(j => !j.archived).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    if (jds.length === 0) {
      body.appendChild(createElement('p', 'No saved job descriptions.', { class: 'jm-empty-msg' }));
    } else {
      jds.forEach(jd => {
        const item = createElement('button', '', { class: 'jm-jd-picker-item', type: 'button' });
        const name = createElement('strong', '', {}); name.textContent = jd.title || 'Untitled';
        item.appendChild(name);
        if (jd.company) { item.appendChild(createElement('span', ` — ${jd.company}`, {})); }
        item.appendChild(createElement('span', ` · ${formatTimeAgo(jd.lastModified)}`, { class: 'jm-saved-card-meta' }));
        item.addEventListener('click', () => {
          this.activeJD = { ...jd };
          window.CC.modal.close();
          this.showSetup();
        });
        body.appendChild(item);
      });
    }
    window.CC.modal.show({ title: 'Load Saved Job Description', body, size: 'medium' });
  }

  // ==================== ANALYSIS ENGINE (Steps 4-7) ====================

  async runAnalysis() {
    const opId = generateUUID();
    this.currentOperationId = opId;
    this.operationCancelled = false;

    const c = this.gc(); c.innerHTML = '';
    const loading = createElement('div', '', { class: 'jm-loading', role: 'status', 'aria-live': 'polite' });
    const spinner = createElement('div', '', { class: 'jm-spinner', 'aria-hidden': 'true' });
    loading.appendChild(spinner);
    const statusEl = createElement('p', 'Reading resume...', { id: 'jm-analysis-status' });
    loading.appendChild(statusEl);
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-outline btn-sm' });
    this.addListener(cancelBtn, 'click', () => { this.operationCancelled = true; });
    loading.appendChild(cancelBtn);
    c.appendChild(loading);

    const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

    try {
      const resume = this.selectedResume || await this.db.get(STORES.DOCUMENTS, this.selectedResumeId);
      if (!resume) throw new Error('Resume not found');
      if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();

      setStatus('Processing job description...');
      await this.tick();

      const rawJD = stripHTML(this.activeJD.descriptionText || '');
      const jdNorm = this.normalizeText(rawJD);
      if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();

      setStatus('Extracting resume content...');
      await this.tick();

      const resumeText = this.extractResumeText(resume);
      const resumeNorm = this.normalizeText(resumeText);
      if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();

      setStatus('Extracting terms from job description...');
      await this.tick();

      const jdTerms = this.extractTerms(rawJD, jdNorm);
      if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();

      setStatus('Comparing with resume...');
      await this.tick();

      const resumeTerms = this.extractTerms(resumeText, resumeNorm);
      const comparison = this.compareTerms(jdTerms, resumeTerms, resume, jdNorm);
      if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();

      setStatus('Calculating match estimate...');
      await this.tick();

      const estimate = this.calculateEstimate(comparison);
      const requirements = this.extractRequirements(rawJD);

      // Optional on-device semantic similarity (only when Local AI is enabled).
      // Never blocks or fails the keyword analysis.
      let semanticScore = null;
      try {
        const { LocalAI } = await import('./local-ai.js');
        if (LocalAI.isEnabled()) {
          setStatus('Computing semantic similarity (on-device)...');
          await this.tick();
          const [resumeVec, jdVec] = await Promise.all([
            LocalAI.getEmbeddings(resumeText),
            LocalAI.getEmbeddings(rawJD),
          ]);
          if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();
          if (resumeVec && jdVec) semanticScore = Math.round(LocalAI.cosineSimilarity(resumeVec, jdVec) * 100);
        }
      } catch (e) {
        console.warn('Semantic similarity skipped:', e?.message || e);
      }

      // Save the JD if not already saved
      await this.saveCurrentJD();

      const analysis = {
        id: generateUUID(),
        schemaVersion: 1,
        name: `${this.activeJD.title || 'Untitled'} — ${resume.name}`,
        resumeId: resume.id,
        resumeNameSnapshot: resume.name,
        resumeModifiedAtSnapshot: resume.lastModified,
        resumeFingerprint: this.fingerprint(resumeNorm),
        jobDescriptionId: this.activeJD.id,
        jobDescriptionTitleSnapshot: this.activeJD.title,
        jobDescriptionFingerprint: this.fingerprint(jdNorm),
        analysisMethodVersion: ANALYSIS_METHOD_VERSION,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        overallEstimate: estimate.overall,
        categoryResults: estimate.categories,
        matchedTerms: comparison.matched,
        missingTerms: comparison.missing,
        resumeOnlyTerms: comparison.resumeOnly,
        requirements,
        semanticScore,
        dismissedSuggestionIds: [],
        staleStatus: 'current'
      };

      if (this.operationCancelled || this.currentOperationId !== opId) return this.showSetup();

      await this.db.put(STORES.MATCH_ANALYSES, analysis);
      this.analysisResult = analysis;
      this.dismissedIds = new Set(analysis.dismissedSuggestionIds || []);
      this.showResults();

    } catch (e) {
      console.error('Analysis failed:', e);
      if (this.currentOperationId !== opId) return;
      c.innerHTML = '';
      const err = createElement('div', '', { class: 'jm-error' });
      err.appendChild(createElement('p', `Analysis failed: ${e.message}`, {}));
      const retry = createElement('button', 'Go Back', { class: 'btn btn-primary' });
      this.addListener(retry, 'click', () => this.showSetup());
      err.appendChild(retry);
      c.appendChild(err);
    }
  }

  // ---- Text Processing ----

  normalizeText(text) {
    if (!text) return '';
    return text.normalize('NFC').toLowerCase()
      .replace(/[‘’‚‛]/g, "'")
      .replace(/[“”„‟]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ').trim();
  }

  fingerprint(text) {
    let h = 0;
    const s = (text || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
    return h.toString(36);
  }

  extractTerms(rawText, normText) {
    const terms = [];
    const seen = new Set();

    // Multi-word phrases first (longest match)
    const phrases = this.getPhraseDictionary();
    for (const [phrase, category] of phrases) {
      const pNorm = phrase.toLowerCase();
      if (normText.includes(pNorm)) {
        const count = (normText.match(new RegExp(this.escRegex(pNorm), 'g')) || []).length;
        if (!seen.has(pNorm)) {
          seen.add(pNorm);
          terms.push({ display: phrase, normalized: pNorm, category, matchType: 'phrase', frequency: count });
        }
      }
    }

    // Single-word technical terms
    const words = normText.replace(/[^a-z0-9#+.\/\-]/gi, ' ').split(/\s+/).filter(w => w.length >= 2);
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    for (const [word, count] of Object.entries(freq)) {
      if (this.isStopWord(word)) continue;
      const phraseContains = [...seen].some(p => p.includes(word) && p !== word);
      if (phraseContains) continue;
      if (this.isTechnicalTerm(word)) {
        if (!seen.has(word)) { seen.add(word); terms.push({ display: word, normalized: word, category: this.categorizeTerm(word), matchType: 'exact', frequency: count }); }
      } else if (word.length >= 3 && !this.isCommonWord(word) && count >= 1) {
        if (!seen.has(word)) { seen.add(word); terms.push({ display: word, normalized: word, category: this.categorizeTerm(word), matchType: 'exact', frequency: count }); }
      }
    }
    return terms;
  }

  compareTerms(jdTerms, resumeTerms, resume, jdNorm) {
    const matched = [], missing = [], resumeOnly = [];
    const resumeSet = new Set(resumeTerms.map(t => t.normalized));
    const jdSet = new Set(jdTerms.map(t => t.normalized));
    const abbrevMap = this.getAbbreviationMap();

    for (const term of jdTerms) {
      const importance = this.classifyImportance(term, jdNorm);
      const evidence = this.findEvidence(term.normalized, resume);
      let matchType = 'missing';

      if (resumeSet.has(term.normalized)) {
        matchType = term.matchType;
      } else {
        const abbrevMatch = abbrevMap.get(term.normalized);
        if (abbrevMatch && resumeSet.has(abbrevMatch)) matchType = 'abbreviation';
        const reverseAbbrev = [...abbrevMap.entries()].find(([, v]) => v === term.normalized);
        if (reverseAbbrev && resumeSet.has(reverseAbbrev[0])) matchType = 'abbreviation';
        if (matchType === 'missing') {
          const related = this.findRelatedTerm(term.normalized, resumeTerms);
          if (related) matchType = 'related';
        }
      }

      const result = {
        id: generateUUID(), displayTerm: term.display, normalizedTerm: term.normalized,
        category: term.category, matchType, importance: importance.level,
        requirementLevel: importance.requirement, jobFrequency: term.frequency,
        resumeFrequency: evidence.length, resumeSections: [...new Set(evidence.map(e => e.resumeSection))],
        evidence, status: matchType === 'missing' ? 'missing' : 'matched',
        explanation: this.explainMatch(term, matchType, importance, evidence),
        dismissed: false
      };

      if (matchType === 'missing') missing.push(result);
      else matched.push(result);
    }

    for (const term of resumeTerms) {
      if (!jdSet.has(term.normalized) && !this.isStopWord(term.normalized)) {
        const abbrevMatch = abbrevMap.get(term.normalized);
        if (abbrevMatch && jdSet.has(abbrevMatch)) continue;
        const reverseAbbrev = [...abbrevMap.entries()].find(([, v]) => v === term.normalized);
        if (reverseAbbrev && jdSet.has(reverseAbbrev[0])) continue;

        resumeOnly.push({
          id: generateUUID(), displayTerm: term.display, normalizedTerm: term.normalized,
          category: term.category, matchType: 'resume-only', importance: 'mentioned',
          requirementLevel: 'general', jobFrequency: 0, resumeFrequency: term.frequency,
          resumeSections: [], evidence: [], status: 'resume-only',
          explanation: 'This term appears in your resume but not in the job description.',
          dismissed: false
        });
      }
    }

    matched.sort((a, b) => this.importanceWeight(b.importance) - this.importanceWeight(a.importance));
    missing.sort((a, b) => this.importanceWeight(b.importance) - this.importanceWeight(a.importance));
    return { matched, missing, resumeOnly };
  }

  classifyImportance(term, jdNorm) {
    const requiredPatterns = [/\b(must have|required|mandatory|essential|minimum)\b/];
    const preferredPatterns = [/\b(preferred|nice to have|bonus|desired|plus|ideal|advantage)\b/];
    const near = this.getContext(jdNorm, term.normalized, 80);

    let requirement = 'general';
    for (const p of requiredPatterns) { if (p.test(near)) { requirement = 'required'; break; } }
    if (requirement === 'general') {
      for (const p of preferredPatterns) { if (p.test(near)) { requirement = 'preferred'; break; } }
    }

    let level = 'mentioned';
    if (requirement === 'required') level = 'required';
    else if (requirement === 'preferred') level = 'preferred';
    else if (term.frequency >= 3) level = 'repeated';

    return { level, requirement };
  }

  getContext(text, term, radius) {
    const idx = text.indexOf(term);
    if (idx === -1) return '';
    return text.substring(Math.max(0, idx - radius), Math.min(text.length, idx + term.length + radius));
  }

  findEvidence(term, resume) {
    const evidence = [];
    const norm = term.toLowerCase();
    const sections = resume.sections || [];
    const pi = resume.personalInfo || {};

    for (const field of ['professionalTitle', 'resumeHeadline']) {
      if (pi[field] && pi[field].toLowerCase().includes(norm)) {
        const text = pi[field];
        const idx = text.toLowerCase().indexOf(norm);
        evidence.push({
          resumeSection: 'personalInfo', fieldPath: `personalInfo.${field}`,
          entryId: null, excerpt: text.substring(Math.max(0, idx - 40), Math.min(text.length, idx + norm.length + 40)),
          matchStart: Math.min(40, idx), matchEnd: Math.min(40, idx) + norm.length, matchType: 'exact'
        });
      }
    }

    sections.forEach((section, si) => {
      if (section.content) {
        const plain = stripHTML(section.content).toLowerCase();
        if (plain.includes(norm)) {
          const idx = plain.indexOf(norm);
          evidence.push({
            resumeSection: section.sectionType || section.title, fieldPath: `sections[${si}].content`,
            entryId: null, excerpt: plain.substring(Math.max(0, idx - 40), Math.min(plain.length, idx + norm.length + 40)),
            matchStart: Math.min(40, idx), matchEnd: Math.min(40, idx) + norm.length, matchType: 'exact'
          });
        }
      }
      (section.items || []).forEach((item, ii) => {
        const textFields = ['jobTitle', 'company', 'roleSummary', 'responsibilities', 'projectName', 'summary',
          'problem', 'solution', 'personalContribution', 'results', 'degree', 'qualification', 'specialization',
          'institution', 'description', 'name', 'issuingOrganization', 'role', 'language', 'category', 'text'];
        for (const f of textFields) {
          if (item[f] && typeof item[f] === 'string') {
            const plain = stripHTML(item[f]).toLowerCase();
            if (plain.includes(norm)) {
              const idx = plain.indexOf(norm);
              evidence.push({
                resumeSection: section.sectionType || section.title,
                fieldPath: `sections[${si}].items[${ii}].${f}`,
                entryId: item.id || null,
                excerpt: plain.substring(Math.max(0, idx - 40), Math.min(plain.length, idx + norm.length + 40)),
                matchStart: Math.min(40, idx), matchEnd: Math.min(40, idx) + norm.length, matchType: 'exact'
              });
            }
          }
        }
        for (const f of ['technologies', 'methods', 'skillTags', 'relatedSkills', 'relevantCoursework']) {
          if (Array.isArray(item[f])) {
            const joined = item[f].join(', ').toLowerCase();
            if (joined.includes(norm)) {
              evidence.push({
                resumeSection: section.sectionType || section.title,
                fieldPath: `sections[${si}].items[${ii}].${f}`,
                entryId: item.id || null, excerpt: item[f].join(', '),
                matchStart: joined.indexOf(norm), matchEnd: joined.indexOf(norm) + norm.length, matchType: 'exact'
              });
            }
          }
        }
        if (Array.isArray(item.achievements)) {
          item.achievements.forEach((ach, ai) => {
            if (ach?.text) {
              const plain = stripHTML(ach.text).toLowerCase();
              if (plain.includes(norm)) {
                const idx = plain.indexOf(norm);
                evidence.push({
                  resumeSection: section.sectionType || section.title,
                  fieldPath: `sections[${si}].items[${ii}].achievements[${ai}].text`,
                  entryId: ach.id || null,
                  excerpt: plain.substring(Math.max(0, idx - 40), Math.min(plain.length, idx + norm.length + 40)),
                  matchStart: Math.min(40, idx), matchEnd: Math.min(40, idx) + norm.length, matchType: 'exact'
                });
              }
            }
          });
        }
      });
    });

    return evidence.slice(0, 10);
  }

  explainMatch(term, matchType, importance, evidence) {
    const parts = [];
    if (matchType === 'exact' || matchType === 'phrase') parts.push(`"${term.display}" found in your resume.`);
    else if (matchType === 'abbreviation') parts.push(`"${term.display}" matched via known abbreviation.`);
    else if (matchType === 'related') parts.push(`A related term to "${term.display}" was found in your resume.`);
    else parts.push(`"${term.display}" was not found in your resume.`);
    if (importance.requirement === 'required') parts.push('This appears to be a required qualification.');
    else if (importance.requirement === 'preferred') parts.push('This is listed as preferred.');
    if (term.frequency >= 3) parts.push(`Mentioned ${term.frequency} times in the description.`);
    if (evidence.length > 0) parts.push(`Found in: ${[...new Set(evidence.map(e => e.resumeSection))].join(', ')}.`);
    return parts.join(' ');
  }

  calculateEstimate(comparison) {
    const cats = {};
    const weights = { required: 3, preferred: 1.5, repeated: 2, mentioned: 1 };
    const catWeights = { hardSkills: 2.5, tools: 2, certifications: 2, qualifications: 2, education: 1.5, responsibilityVerbs: 1, softSkills: 0.5, domain: 1.5, general: 1 };

    const allJD = [...comparison.matched, ...comparison.missing];
    for (const term of allJD) {
      const cat = term.category || 'general';
      if (!cats[cat]) cats[cat] = { matched: 0, total: 0, weight: catWeights[cat] || 1, label: this.categoryLabel(cat) };
      cats[cat].total++;
      if (term.status === 'matched') cats[cat].matched++;
    }

    let weightedSum = 0, totalWeight = 0;
    const categories = [];
    for (const [key, cat] of Object.entries(cats)) {
      const pct = cat.total > 0 ? Math.round((cat.matched / cat.total) * 100) : 0;
      weightedSum += pct * cat.weight;
      totalWeight += cat.weight;
      categories.push({ category: key, label: cat.label, matched: cat.matched, total: cat.total, percentage: pct, weight: cat.weight });
    }
    categories.sort((a, b) => b.weight - a.weight);
    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    return { overall, categories };
  }

  categoryLabel(cat) {
    const labels = { hardSkills: 'Hard Skills', tools: 'Tools & Technologies', certifications: 'Certifications',
      qualifications: 'Qualifications', education: 'Education', responsibilityVerbs: 'Responsibility Verbs',
      softSkills: 'Soft Skills', domain: 'Domain Knowledge', general: 'General Terms' };
    return labels[cat] || cat;
  }

  importanceWeight(level) {
    return { required: 4, repeated: 3, preferred: 2, mentioned: 1 }[level] || 0;
  }

  // ==================== RESULTS VIEW (Step 8) ====================

  showResults() {
    const c = this.gc(); c.innerHTML = ''; this.view = 'results';
    const r = this.analysisResult;
    if (!r) return this.showHome();

    const w = createElement('div', '', { class: 'jm-results' });

    // Top bar
    const bar = createElement('div', '', { class: 'jm-results-topbar' });
    const info = createElement('div', '', { class: 'jm-results-info' });
    const label = createElement('strong', '', {}); label.textContent = `${r.name || r.jobTitle || 'Analysis'}`;
    info.appendChild(label);
    info.appendChild(createElement('span', ` · Resume: ${r.resumeNameSnapshot || r.resumeName || 'Unknown'}`, { class: 'jm-results-meta' }));
    if (r.analysisMethodVersion) info.appendChild(createElement('span', ` · v${r.analysisMethodVersion}`, { class: 'jm-results-meta' }));
    bar.appendChild(info);

    const acts = createElement('div', '', { class: 'jm-results-actions' });
    const exportJsonBtn = createElement('button', 'Export JSON', { class: 'btn btn-sm btn-outline' });
    this.addListener(exportJsonBtn, 'click', () => this.exportJSON());
    acts.appendChild(exportJsonBtn);
    const exportTextBtn = createElement('button', 'Export Text', { class: 'btn btn-sm btn-outline' });
    this.addListener(exportTextBtn, 'click', () => this.exportText());
    acts.appendChild(exportTextBtn);
    const printBtn = createElement('button', 'Print', { class: 'btn btn-sm btn-outline' });
    this.addListener(printBtn, 'click', () => window.print());
    acts.appendChild(printBtn);
    const tailorBtn = createElement('button', 'Create Tailored Copy', { class: 'btn btn-sm btn-primary' });
    this.addListener(tailorBtn, 'click', () => this.createTailoredCopy());
    acts.appendChild(tailorBtn);
    const newBtn = createElement('button', 'New Analysis', { class: 'btn btn-sm btn-outline' });
    this.addListener(newBtn, 'click', () => { this.resetState(); this.showSetup(); });
    acts.appendChild(newBtn);
    const homeBtn = createElement('button', 'All Analyses', { class: 'btn btn-sm btn-ghost' });
    this.addListener(homeBtn, 'click', () => { this.resetState(); this.showHome(); });
    acts.appendChild(homeBtn);
    bar.appendChild(acts);
    w.appendChild(bar);

    // Staleness warning
    if (r.staleStatus && r.staleStatus !== 'current') {
      const staleWarn = createElement('div', '', { class: 'jm-stale-warning', role: 'alert' });
      staleWarn.textContent = 'This analysis may be outdated because the source resume or job description has changed since it was run.';
      const rerunBtn = createElement('button', 'Re-run Analysis', { class: 'btn btn-sm btn-primary' });
      this.addListener(rerunBtn, 'click', () => this.rerunAnalysis());
      staleWarn.appendChild(rerunBtn);
      w.appendChild(staleWarn);
    }

    // Score card
    const sc = createElement('div', '', { class: `jm-score-card ${this.getScoreClass(r.overallEstimate ?? r.matchScore ?? 0)}` });
    const circle = createElement('div', '', { class: 'jm-score-circle' });
    circle.appendChild(createElement('div', String(r.overallEstimate ?? r.matchScore ?? 0), { class: 'jm-score-value' }));
    circle.appendChild(createElement('div', '%', { class: 'jm-score-pct' }));
    sc.appendChild(circle);
    const details = createElement('div', '', { class: 'jm-score-details' });
    details.appendChild(createElement('h2', 'Local keyword match estimate', { class: 'jm-score-title' }));
    const disclaimer = createElement('p', 'This is a local, rule-based comparison. It is not an official ATS score and does not predict interviews, ranking, or employment decisions.', { class: 'jm-disclaimer' });
    details.appendChild(disclaimer);
    const stats = createElement('div', '', { class: 'jm-score-stats' });
    const m = r.matchedTerms || r.matched || [];
    const mi = r.missingTerms || r.missing || [];
    const ro = r.resumeOnlyTerms || r.resumeOnly || [];
    stats.innerHTML = `<span class="jm-stat"><strong>${m.length}</strong> matched</span><span class="jm-stat-sep">·</span><span class="jm-stat"><strong>${mi.length}</strong> missing</span><span class="jm-stat-sep">·</span><span class="jm-stat"><strong>${ro.length}</strong> resume-only</span>`;
    details.appendChild(stats);
    if (r.semanticScore !== null && r.semanticScore !== undefined) {
      const sem = createElement('p', `Semantic similarity (on-device AI): ${r.semanticScore}%`, { class: 'jm-semantic-stat' });
      sem.style.cssText = 'font-size:12px;color:var(--text-secondary);margin-top:6px;';
      details.appendChild(sem);
    }
    sc.appendChild(details);
    w.appendChild(sc);

    // Category breakdown
    if (r.categoryResults && r.categoryResults.length > 0) {
      const catSec = createElement('div', '', { class: 'jm-categories' });
      catSec.appendChild(createElement('h2', 'Category Breakdown', { class: 'jm-section-title' }));
      const catGrid = createElement('div', '', { class: 'jm-cat-grid' });
      r.categoryResults.forEach(cat => {
        const catCard = createElement('div', '', { class: 'jm-cat-card' });
        const catLabel = createElement('div', cat.label, { class: 'jm-cat-label' });
        catCard.appendChild(catLabel);
        const catBar = createElement('div', '', { class: 'jm-cat-bar' });
        const fill = createElement('div', '', { class: `jm-cat-fill ${this.getScoreClass(cat.percentage)}` });
        fill.style.width = `${cat.percentage}%`;
        catBar.appendChild(fill);
        catCard.appendChild(catBar);
        catCard.appendChild(createElement('div', `${cat.matched}/${cat.total} (${cat.percentage}%)`, { class: 'jm-cat-stat' }));
        catGrid.appendChild(catCard);
      });
      catSec.appendChild(catGrid);
      w.appendChild(catSec);
    }

    // AI Enhancement section
    const aiSec = createElement('div', '', { class: 'jm-ai-section' });
    aiSec.appendChild(createElement('h2', '🤖 AI-Powered Gap Analysis', { class: 'jm-section-title' }));
    const aiDesc = createElement('p', 'Use AI to generate tailored suggestions for improving your resume based on this job description.', { class: 'jm-ai-desc' });
    aiSec.appendChild(aiDesc);
    const aiBtn = createElement('button', '🤖 AI Enhancement', { class: 'btn btn-primary jm-ai-btn' });
    const aiResultsContainer = createElement('div', '', { class: 'jm-ai-results', id: 'jm-ai-results' });
    this.addListener(aiBtn, 'click', async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = 'Analyzing with AI...';
      try {
        const jobDescription = this.activeJD?.descriptionText || '';
        if (!jobDescription.trim()) {
          if (window.CC?.toast) window.CC.toast.show('No job description text available', 'error');
          aiBtn.disabled = false;
          aiBtn.textContent = '🤖 AI Enhancement';
          return;
        }
        const resumeDoc = this.selectedResume || await this.db.get(STORES.DOCUMENTS, r.resumeId);
        if (!resumeDoc) {
          if (window.CC?.toast) window.CC.toast.show('Resume not found', 'error');
          aiBtn.disabled = false;
          aiBtn.textContent = '🤖 AI Enhancement';
          return;
        }
        const { AiFormatter } = await import('./ai-formatter.js');
        const apiKey = AiFormatter.getApiKey();
        if (!apiKey && !AiFormatter.hasLocalOption()) {
          if (window.CC?.toast) window.CC.toast.show('No API key configured. Go to Settings to add your AI API key or enable Local AI.', 'error');
          aiBtn.disabled = false;
          aiBtn.textContent = '🤖 AI Enhancement';
          return;
        }
        const ai = new AiFormatter(apiKey);
        const suggestions = await ai.enhanceForJD(resumeDoc, jobDescription);
        aiResultsContainer.innerHTML = '';
        if (!suggestions || suggestions.length === 0) {
          aiResultsContainer.appendChild(createElement('p', 'No suggestions generated. Your resume may already be well-aligned with this job description.', { class: 'jm-empty-msg' }));
        } else {
          suggestions.forEach((s, idx) => {
            const card = createElement('div', '', { class: 'jm-ai-suggestion-card' });
            const header = createElement('div', '', { class: 'jm-ai-suggestion-header' });
            header.appendChild(createElement('span', `#${idx + 1}`, { class: 'jm-ai-suggestion-num' }));
            if (s.field) {
              const fieldBadge = createElement('span', '', { class: 'jm-ai-field-badge' });
              fieldBadge.textContent = s.field;
              header.appendChild(fieldBadge);
            }
            card.appendChild(header);
            if (s.original) {
              const origBlock = createElement('div', '', { class: 'jm-ai-block jm-ai-block--original' });
              origBlock.appendChild(createElement('strong', 'Original:', {}));
              const origText = createElement('p', '', {});
              origText.textContent = s.original;
              origBlock.appendChild(origText);
              card.appendChild(origBlock);
            }
            if (s.suggestion) {
              const sugBlock = createElement('div', '', { class: 'jm-ai-block jm-ai-block--suggestion' });
              sugBlock.appendChild(createElement('strong', 'Suggested:', {}));
              const sugText = createElement('p', '', {});
              sugText.textContent = s.suggestion;
              sugBlock.appendChild(sugText);
              card.appendChild(sugBlock);
            }
            if (s.message) {
              const whyBlock = createElement('div', '', { class: 'jm-ai-block jm-ai-block--why' });
              whyBlock.appendChild(createElement('strong', 'Why:', {}));
              const whyText = createElement('p', '', {});
              whyText.textContent = s.message;
              whyBlock.appendChild(whyText);
              card.appendChild(whyBlock);
            }
            if (s.suggestion) {
              const applyBtn = createElement('button', 'Apply', { class: 'btn btn-sm btn-outline jm-ai-apply-btn' });
              this.addListener(applyBtn, 'click', () => {
                navigator.clipboard.writeText(s.suggestion).then(() => {
                  if (window.CC?.toast) window.CC.toast.show('Copied — paste this into your resume editor', 'success');
                }).catch(() => {
                  if (window.CC?.toast) window.CC.toast.show('Failed to copy to clipboard', 'error');
                });
              });
              card.appendChild(applyBtn);
            }
            aiResultsContainer.appendChild(card);
          });
        }
        aiBtn.textContent = '🤖 Re-run AI Enhancement';
        aiBtn.disabled = false;
      } catch (err) {
        console.error('AI Enhancement failed:', err);
        aiResultsContainer.innerHTML = '';
        const errMsg = createElement('p', '', { class: 'jm-error-msg' });
        errMsg.textContent = `AI Enhancement failed: ${err.message}`;
        aiResultsContainer.appendChild(errMsg);
        aiBtn.textContent = '🤖 AI Enhancement';
        aiBtn.disabled = false;
      }
    });
    aiSec.appendChild(aiBtn);
    aiSec.appendChild(aiResultsContainer);
    w.appendChild(aiSec);

    // Filters
    const filterBar = createElement('div', '', { class: 'jm-result-filters' });
    const searchIn = createElement('input', '', { class: 'jm-field-input jm-search-input', type: 'search', placeholder: 'Search terms...', 'aria-label': 'Search results' });
    searchIn.value = this.resultSearch;
    this.addListener(searchIn, 'input', e => { this.resultSearch = e.target.value; this.renderTermSections(w); });
    filterBar.appendChild(searchIn);

    const statusFilter = createElement('select', '', { class: 'jm-sort-select', 'aria-label': 'Filter by status' });
    [['all', 'All Terms'], ['matched', 'Matched'], ['missing', 'Missing'], ['resume-only', 'Resume Only'], ['exact', 'Exact Match'], ['phrase', 'Phrase Match'], ['abbreviation', 'Abbreviation'], ['related', 'Related Term']].forEach(([v, l]) => {
      const o = createElement('option', l, { value: v });
      if (v === this.resultFilter) o.selected = true;
      statusFilter.appendChild(o);
    });
    this.addListener(statusFilter, 'change', e => { this.resultFilter = e.target.value; this.renderTermSections(w); });
    filterBar.appendChild(statusFilter);

    const catFilter = createElement('select', '', { class: 'jm-sort-select', 'aria-label': 'Filter by category' });
    const allCats = new Set([...m, ...mi, ...ro].map(t => t.category));
    catFilter.appendChild(createElement('option', 'All Categories', { value: 'all' }));
    allCats.forEach(cat => {
      const o = createElement('option', this.categoryLabel(cat), { value: cat });
      if (cat === this.resultCategoryFilter) o.selected = true;
      catFilter.appendChild(o);
    });
    this.addListener(catFilter, 'change', e => { this.resultCategoryFilter = e.target.value; this.renderTermSections(w); });
    filterBar.appendChild(catFilter);

    const clearBtn = createElement('button', 'Clear Filters', { class: 'btn btn-sm btn-ghost' });
    this.addListener(clearBtn, 'click', () => {
      this.resultSearch = ''; this.resultFilter = 'all'; this.resultCategoryFilter = 'all';
      searchIn.value = ''; statusFilter.value = 'all'; catFilter.value = 'all';
      this.renderTermSections(w);
    });
    filterBar.appendChild(clearBtn);
    w.appendChild(filterBar);

    // Term sections
    const termContainer = createElement('div', '', { class: 'jm-keyword-sections', id: 'jm-term-sections' });
    w.appendChild(termContainer);
    this.renderTermSections(w);

    // Methodology
    w.appendChild(this.renderMethodology());

    // Privacy note
    const priv = createElement('div', '', { class: 'jm-privacy-note' });
    priv.innerHTML = '&#128274; All analysis runs locally in your browser. No data is uploaded.';
    w.appendChild(priv);

    c.appendChild(w);
  }

  renderTermSections(wrapper) {
    const container = wrapper.querySelector('#jm-term-sections');
    if (!container) return;
    container.innerHTML = '';
    const r = this.analysisResult;
    const m = r.matchedTerms || r.matched || [];
    const mi = r.missingTerms || r.missing || [];
    const ro = r.resumeOnlyTerms || r.resumeOnly || [];

    const filterTerms = (terms) => {
      let result = [...terms];
      if (this.resultSearch.trim()) {
        const q = this.resultSearch.toLowerCase();
        result = result.filter(t => (t.displayTerm || t).toLowerCase().includes(q) || (t.normalizedTerm || '').includes(q));
      }
      if (this.resultCategoryFilter !== 'all') {
        result = result.filter(t => t.category === this.resultCategoryFilter);
      }
      if (this.resultFilter === 'matched') result = result.filter(t => t.status === 'matched');
      else if (this.resultFilter === 'missing') result = result.filter(t => t.status === 'missing');
      else if (this.resultFilter === 'resume-only') result = result.filter(t => t.status === 'resume-only');
      else if (['exact', 'phrase', 'abbreviation', 'related'].includes(this.resultFilter)) {
        result = result.filter(t => t.matchType === this.resultFilter);
      }
      return result;
    };

    const filteredMissing = filterTerms(mi);
    const filteredMatched = filterTerms(m);
    const filteredResumeOnly = filterTerms(ro);

    if (this.resultFilter === 'all' || this.resultFilter === 'missing') {
      if (filteredMissing.length > 0) container.appendChild(this.renderTermSection('Missing from Resume', filteredMissing, 'jm-kw-missing', 'Add only if it truthfully represents your experience.'));
    }
    if (this.resultFilter === 'all' || ['matched', 'exact', 'phrase', 'abbreviation', 'related'].includes(this.resultFilter)) {
      if (filteredMatched.length > 0) container.appendChild(this.renderTermSection('Matched Keywords', filteredMatched, 'jm-kw-matched', 'These terms appear in both your resume and the job description.'));
    }
    if (this.resultFilter === 'all' || this.resultFilter === 'resume-only') {
      if (filteredResumeOnly.length > 0) container.appendChild(this.renderTermSection('Resume-Only Keywords', filteredResumeOnly, 'jm-kw-resume-only', 'These terms appear in your resume but not in the job description.'));
    }

    if (filteredMissing.length === 0 && filteredMatched.length === 0 && filteredResumeOnly.length === 0) {
      container.appendChild(createElement('p', 'No terms match your current filters.', { class: 'jm-empty-msg' }));
    }
  }

  renderTermSection(title, terms, className, description) {
    const sec = createElement('div', '', { class: `jm-kw-section ${className}` });
    sec.appendChild(createElement('h3', `${title} (${terms.length})`, { class: 'jm-kw-title' }));
    if (description) sec.appendChild(createElement('p', description, { class: 'jm-kw-desc' }));

    const tags = createElement('div', '', { class: 'jm-kw-tags' });
    terms.forEach(term => {
      if (typeof term === 'string') {
        const tag = createElement('span', '', { class: 'jm-kw-tag' }); tag.textContent = term; tags.appendChild(tag);
        return;
      }
      if (this.dismissedIds.has(term.id)) return;

      const tag = createElement('div', '', { class: `jm-term-card jm-term-card--${term.status || 'general'}` });
      tag.tabIndex = 0;
      const termHeader = createElement('div', '', { class: 'jm-term-header' });
      const termName = createElement('span', '', { class: 'jm-term-name' }); termName.textContent = term.displayTerm;
      termHeader.appendChild(termName);

      const badges = createElement('div', '', { class: 'jm-term-badges' });
      if (term.matchType && term.matchType !== 'missing' && term.matchType !== 'resume-only') {
        badges.appendChild(createElement('span', term.matchType, { class: `jm-match-badge jm-match-badge--${term.matchType}` }));
      }
      if (term.importance === 'required') badges.appendChild(createElement('span', 'Required', { class: 'jm-importance-badge jm-importance--required' }));
      else if (term.importance === 'preferred') badges.appendChild(createElement('span', 'Preferred', { class: 'jm-importance-badge jm-importance--preferred' }));
      if (term.category) badges.appendChild(createElement('span', this.categoryLabel(term.category), { class: 'jm-cat-badge' }));
      termHeader.appendChild(badges);
      tag.appendChild(termHeader);

      if (term.explanation) {
        const exp = createElement('p', '', { class: 'jm-term-explanation' }); exp.textContent = term.explanation;
        tag.appendChild(exp);
      }

      if (term.evidence && term.evidence.length > 0) {
        const evSec = createElement('details', '', { class: 'jm-evidence-details' });
        evSec.appendChild(createElement('summary', `Evidence (${term.evidence.length} locations)`, {}));
        term.evidence.slice(0, 5).forEach(ev => {
          const evItem = createElement('div', '', { class: 'jm-evidence-item' });
          evItem.appendChild(createElement('span', ev.resumeSection, { class: 'jm-evidence-section' }));
          const excerpt = createElement('span', '', { class: 'jm-evidence-excerpt' });
          excerpt.textContent = `...${ev.excerpt}...`;
          evItem.appendChild(excerpt);
          evSec.appendChild(evItem);
        });
        tag.appendChild(evSec);
      }

      if (term.status === 'missing') {
        const dismissBtn = createElement('button', 'Dismiss', { class: 'btn btn-sm btn-ghost jm-dismiss-btn' });
        this.addListener(dismissBtn, 'click', e => { e.stopPropagation(); this.dismissSuggestion(term.id); tag.remove(); });
        tag.appendChild(dismissBtn);
      }
      tags.appendChild(tag);
    });
    sec.appendChild(tags);
    return sec;
  }

  async dismissSuggestion(termId) {
    this.dismissedIds.add(termId);
    if (this.analysisResult) {
      this.analysisResult.dismissedSuggestionIds = [...this.dismissedIds];
      this.analysisResult.lastModified = new Date().toISOString();
      try { await this.db.put(STORES.MATCH_ANALYSES, this.analysisResult); } catch {}
    }
  }

  renderMethodology() {
    const sec = createElement('details', '', { class: 'jm-methodology' });
    sec.appendChild(createElement('summary', 'How This Analysis Works', {}));
    const content = createElement('div', '', { class: 'jm-methodology-content' });
    content.innerHTML = `
      <p><strong>Methodology Version:</strong> ${ANALYSIS_METHOD_VERSION}</p>
      <p>This is a local, deterministic, rule-based comparison. It uses keyword extraction, phrase recognition, abbreviation matching, and category-weighted scoring.</p>
      <h4>Match Types</h4>
      <ul>
        <li><strong>Exact Match:</strong> Same term found in both documents (weight: 1.0)</li>
        <li><strong>Phrase Match:</strong> Multi-word phrase recognized (weight: 1.0)</li>
        <li><strong>Abbreviation:</strong> Known abbreviation matched, e.g., JS = JavaScript (weight: 0.9)</li>
        <li><strong>Related Term:</strong> Semantically related term from dictionary (weight: 0.7)</li>
      </ul>
      <h4>Category Weights</h4>
      <ul>
        <li>Hard Skills: 2.5, Tools & Technologies: 2.0, Certifications: 2.0</li>
        <li>Qualifications: 2.0, Domain Knowledge: 1.5, Responsibility Verbs: 1.0</li>
        <li>Soft Skills: 0.5, General: 1.0</li>
      </ul>
      <h4>Limitations</h4>
      <ul>
        <li>Cannot understand context, meaning, or quality of experience</li>
        <li>Related-term matching is dictionary-limited</li>
        <li>Does not predict ATS scoring, interview chances, or hiring decisions</li>
        <li>May miss industry-specific jargon not in built-in dictionaries</li>
      </ul>`;
    sec.appendChild(content);
    return sec;
  }

  // ==================== SAVED ANALYSIS (Step 9) ====================

  async viewSavedAnalysis(analysis) {
    const live = await this.db.get(STORES.MATCH_ANALYSES, analysis.id);
    if (live) analysis = live;
    await this.checkStaleness(analysis);
    this.analysisResult = analysis;
    this.dismissedIds = new Set(analysis.dismissedSuggestionIds || []);
    this.selectedResumeId = analysis.resumeId;
    this.showResults();
  }

  async checkStaleness(analysis) {
    let stale = 'current';
    try {
      const resume = await this.db.get(STORES.DOCUMENTS, analysis.resumeId);
      if (resume) {
        const currentFP = this.fingerprint(this.normalizeText(this.extractResumeText(resume)));
        if (currentFP !== analysis.resumeFingerprint) stale = 'stale-resume';
      } else {
        stale = 'stale-resume';
      }
    } catch {}
    try {
      if (analysis.jobDescriptionId) {
        const jd = await this.db.get(STORES.JOB_DESCRIPTIONS, analysis.jobDescriptionId);
        if (jd) {
          const currentFP = this.fingerprint(this.normalizeText(jd.descriptionText || ''));
          if (currentFP !== analysis.jobDescriptionFingerprint) {
            stale = stale === 'stale-resume' ? 'stale-both' : 'stale-jd';
          }
        }
      }
    } catch {}
    if (stale !== analysis.staleStatus) {
      analysis.staleStatus = stale;
      try { await this.db.put(STORES.MATCH_ANALYSES, analysis); } catch {}
    }
  }

  async rerunAnalysis() {
    const r = this.analysisResult;
    if (!r) return;
    try {
      this.selectedResumeId = r.resumeId;
      this.selectedResume = await this.db.get(STORES.DOCUMENTS, r.resumeId);
      if (r.jobDescriptionId) {
        const jd = await this.db.get(STORES.JOB_DESCRIPTIONS, r.jobDescriptionId);
        if (jd) this.activeJD = { ...jd };
      }
      if (!this.activeJD) {
        this.newJD(true);
        this.activeJD.title = r.jobDescriptionTitleSnapshot || r.jobTitle || '';
        this.activeJD.company = r.company || '';
      }
      await this.runAnalysis();
    } catch (e) {
      if (window.CC?.toast) window.CC.toast.show('Failed to re-run analysis', 'error');
    }
  }

  async deleteAnalysis(id) {
    if (!confirm('Delete this analysis?')) return;
    try {
      await this.db.delete(STORES.MATCH_ANALYSES, id);
      if (window.CC?.toast) window.CC.toast.show('Analysis deleted', 'info');
      if (this.analysisResult?.id === id) this.analysisResult = null;
      await this.showHome();
    } catch (e) {
      if (window.CC?.toast) window.CC.toast.show('Failed to delete', 'error');
    }
  }

  // ==================== EXPORT (Step 11) ====================

  exportJSON() {
    const r = this.analysisResult; if (!r) return;
    const data = {
      application: 'CareerCanvas Job Description Matcher',
      schemaVersion: r.schemaVersion || 1,
      analysisMethodVersion: r.analysisMethodVersion || ANALYSIS_METHOD_VERSION,
      exportTimestamp: new Date().toISOString(),
      analysis: {
        name: r.name, resumeName: r.resumeNameSnapshot || r.resumeName,
        jobTitle: r.jobDescriptionTitleSnapshot || r.jobTitle,
        company: r.company, analysisDate: r.createdAt,
        overallEstimate: r.overallEstimate ?? r.matchScore,
        categoryResults: r.categoryResults || [],
        matchedTerms: (r.matchedTerms || r.matched || []).map(t => typeof t === 'string' ? t : { term: t.displayTerm, category: t.category, matchType: t.matchType, importance: t.importance }),
        missingTerms: (r.missingTerms || r.missing || []).map(t => typeof t === 'string' ? t : { term: t.displayTerm, category: t.category, importance: t.importance }),
        resumeOnlyTerms: (r.resumeOnlyTerms || r.resumeOnly || []).map(t => typeof t === 'string' ? t : { term: t.displayTerm, category: t.category })
      },
      disclaimer: 'This is a local, rule-based keyword comparison. It is not an official ATS score and does not predict interviews, ranking, or employment decisions.'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, sanitizeFilename(`${r.name || 'analysis'}_match_report`) + '.json');
  }

  exportText() {
    const r = this.analysisResult; if (!r) return;
    const m = r.matchedTerms || r.matched || [];
    const mi = r.missingTerms || r.missing || [];
    const lines = [
      'JOB DESCRIPTION MATCH REPORT', '=' .repeat(40), '',
      `Analysis: ${r.name || 'Untitled'}`, `Resume: ${r.resumeNameSnapshot || r.resumeName || 'Unknown'}`,
      `Job Title: ${r.jobDescriptionTitleSnapshot || r.jobTitle || ''}`, `Company: ${r.company || 'N/A'}`,
      `Date: ${new Date(r.createdAt).toLocaleDateString()}`, `Method Version: ${r.analysisMethodVersion || ANALYSIS_METHOD_VERSION}`, '',
      `MATCH ESTIMATE: ${r.overallEstimate ?? r.matchScore ?? 0}%`, '',
    ];
    if (r.categoryResults) {
      lines.push('CATEGORY BREAKDOWN', '-'.repeat(30));
      r.categoryResults.forEach(c => lines.push(`  ${c.label}: ${c.matched}/${c.total} (${c.percentage}%)`));
      lines.push('');
    }
    lines.push(`MATCHED TERMS (${m.length})`, '-'.repeat(30));
    m.forEach(t => lines.push(`  ${typeof t === 'string' ? t : `${t.displayTerm} [${t.category}] (${t.matchType})`}`));
    lines.push('', `MISSING TERMS (${mi.length})`, '-'.repeat(30));
    mi.forEach(t => lines.push(`  ${typeof t === 'string' ? t : `${t.displayTerm} [${t.category}] (${t.importance})`}`));
    lines.push('', 'DISCLAIMER', 'This is a local, rule-based keyword comparison. It is not an official ATS score and does not predict interviews, ranking, or employment decisions.');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    this.downloadBlob(blob, sanitizeFilename(`${r.name || 'analysis'}_match_report`) + '.txt');
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    if (window.CC?.toast) window.CC.toast.show(`Exported: ${filename}`, 'success');
  }

  // ==================== TAILORED COPY (Step 12) ====================

  async createTailoredCopy() {
    const r = this.analysisResult; if (!r) return;
    try {
      const resume = await this.db.get(STORES.DOCUMENTS, r.resumeId);
      if (!resume) { if (window.CC?.toast) window.CC.toast.show('Source resume not found', 'error'); return; }
      const copy = JSON.parse(JSON.stringify(resume));
      copy.id = generateUUID();
      copy.name = `${resume.name} — Tailored for ${r.jobDescriptionTitleSnapshot || r.jobTitle || 'Job'}`;
      copy.createdAt = new Date().toISOString();
      copy.lastModified = copy.createdAt;
      copy.pinned = false;
      copy.archived = false;
      copy.linkedJobDescriptionId = r.jobDescriptionId || null;
      copy.linkedAnalysisId = r.id;
      await this.db.put(STORES.DOCUMENTS, copy);
      if (window.CC?.toast) window.CC.toast.show(`Tailored copy created: "${copy.name}"`, 'success');
      if (window.CC?.router) window.CC.router.navigate(`/editor/${copy.id}`);
    } catch (e) {
      if (window.CC?.toast) window.CC.toast.show('Failed to create tailored copy', 'error');
    }
  }

  // ==================== DICTIONARIES ====================

  extractResumeText(doc) {
    const parts = [];
    if (doc.personalInfo) {
      const pi = doc.personalInfo;
      [pi.professionalTitle, pi.resumeHeadline].filter(Boolean).forEach(v => parts.push(v));
    }
    if (doc.sections && Array.isArray(doc.sections)) {
      for (const section of doc.sections) {
        if (section.content) parts.push(stripHTML(section.content));
        if (section.items && Array.isArray(section.items)) {
          for (const item of section.items) {
            for (const f of ['jobTitle', 'company', 'roleSummary', 'responsibilities', 'projectName', 'summary', 'problem', 'solution', 'personalContribution', 'results', 'degree', 'qualification', 'specialization', 'institution', 'description', 'name', 'issuingOrganization', 'role', 'language', 'category', 'text']) {
              if (item[f] && typeof item[f] === 'string') parts.push(stripHTML(item[f]));
            }
            for (const f of ['technologies', 'methods', 'skillTags', 'relatedSkills', 'relevantCoursework']) {
              if (Array.isArray(item[f])) parts.push(item[f].join(' '));
            }
            if (Array.isArray(item.achievements)) {
              for (const ach of item.achievements) {
                if (ach?.text) parts.push(stripHTML(ach.text));
                if (Array.isArray(ach?.skillTags)) parts.push(ach.skillTags.join(' '));
              }
            }
          }
        }
      }
    }
    return parts.join(' ');
  }

  getPhraseDictionary() {
    return [
      ['machine learning', 'hardSkills'], ['deep learning', 'hardSkills'], ['artificial intelligence', 'hardSkills'],
      ['natural language processing', 'hardSkills'], ['computer vision', 'hardSkills'], ['data science', 'hardSkills'],
      ['data analysis', 'hardSkills'], ['data engineering', 'hardSkills'], ['data modeling', 'hardSkills'],
      ['project management', 'softSkills'], ['product management', 'softSkills'], ['stakeholder management', 'softSkills'],
      ['agile methodology', 'hardSkills'], ['scrum master', 'certifications'], ['test automation', 'hardSkills'],
      ['continuous integration', 'hardSkills'], ['continuous delivery', 'hardSkills'], ['continuous deployment', 'hardSkills'],
      ['version control', 'tools'], ['code review', 'hardSkills'], ['pull request', 'hardSkills'],
      ['user experience', 'hardSkills'], ['user interface', 'hardSkills'], ['responsive design', 'hardSkills'],
      ['full stack', 'hardSkills'], ['front end', 'hardSkills'], ['back end', 'hardSkills'],
      ['rest api', 'hardSkills'], ['web services', 'hardSkills'], ['microservices', 'hardSkills'],
      ['cloud computing', 'hardSkills'], ['distributed systems', 'hardSkills'], ['system design', 'hardSkills'],
      ['quality assurance', 'hardSkills'], ['business intelligence', 'hardSkills'], ['technical writing', 'hardSkills'],
      ['problem solving', 'softSkills'], ['critical thinking', 'softSkills'], ['team leadership', 'softSkills'],
      ['cross functional', 'softSkills'], ['object oriented', 'hardSkills'], ['functional programming', 'hardSkills'],
      ['event driven', 'hardSkills'], ['test driven', 'hardSkills'], ['behavior driven', 'hardSkills'],
      ['react native', 'tools'], ['node.js', 'tools'], ['vue.js', 'tools'], ['next.js', 'tools'],
      ['ruby on rails', 'tools'], ['spring boot', 'tools'], ['asp.net', 'tools'], ['.net core', 'tools'],
      ['amazon web services', 'tools'], ['google cloud', 'tools'], ['microsoft azure', 'tools'],
      ['github actions', 'tools'], ['gitlab ci', 'tools'], ['azure devops', 'tools'],
      ['power bi', 'tools'], ['google analytics', 'tools'], ['apache kafka', 'tools'], ['apache spark', 'tools'],
      ['unit testing', 'hardSkills'], ['integration testing', 'hardSkills'], ['end to end', 'hardSkills'],
      ['site reliability', 'hardSkills'], ['information security', 'hardSkills'], ['cyber security', 'hardSkills'],
      ['software development', 'hardSkills'], ['software engineering', 'hardSkills'],
      ["bachelor's degree", 'education'], ["master's degree", 'education'], ['phd', 'education'],
    ];
  }

  getAbbreviationMap() {
    return new Map([
      ['js', 'javascript'], ['ts', 'typescript'], ['py', 'python'], ['rb', 'ruby'],
      ['k8s', 'kubernetes'], ['tf', 'terraform'], ['gcp', 'google cloud'],
      ['aws', 'amazon web services'], ['ml', 'machine learning'], ['ai', 'artificial intelligence'],
      ['nlp', 'natural language processing'], ['ci/cd', 'continuous integration'],
      ['ui', 'user interface'], ['ux', 'user experience'], ['qa', 'quality assurance'],
      ['pm', 'project management'], ['bi', 'business intelligence'], ['db', 'database'],
      ['api', 'application programming interface'], ['sdk', 'software development kit'],
      ['sql', 'structured query language'], ['css', 'cascading style sheets'],
      ['html', 'hypertext markup language'], ['sre', 'site reliability'],
      ['devops', 'development operations'], ['oop', 'object oriented'],
      ['tdd', 'test driven development'], ['bdd', 'behavior driven development'],
      ['e2e', 'end to end'], ['pmp', 'project management professional'],
    ]);
  }

  findRelatedTerm(term, resumeTerms) {
    const related = new Map([
      ['react', ['reactjs', 'react.js']], ['vue', ['vuejs', 'vue.js']], ['angular', ['angularjs']],
      ['node', ['nodejs', 'node.js']], ['express', ['expressjs']], ['next', ['nextjs', 'next.js']],
      ['python', ['django', 'flask', 'fastapi']], ['java', ['spring', 'maven', 'gradle']],
      ['javascript', ['ecmascript', 'es6', 'es2015']], ['typescript', ['ts']],
      ['docker', ['containerization', 'containers']], ['kubernetes', ['k8s', 'container orchestration']],
      ['aws', ['amazon', 'cloud']], ['azure', ['microsoft cloud']], ['gcp', ['google cloud']],
      ['postgresql', ['postgres']], ['mongodb', ['mongo']], ['redis', ['caching']],
      ['agile', ['scrum', 'kanban', 'sprint']], ['scrum', ['agile', 'sprint']],
      ['leadership', ['management', 'team lead']], ['management', ['leadership', 'team lead']],
      ['testing', ['qa', 'quality assurance']], ['devops', ['ci/cd', 'infrastructure']],
    ]);

    const rSet = new Set(resumeTerms.map(t => t.normalized));
    const termRelated = related.get(term);
    if (termRelated) {
      for (const r of termRelated) { if (rSet.has(r)) return r; }
    }
    for (const [key, values] of related) {
      if (values.includes(term) && rSet.has(key)) return key;
    }
    return null;
  }

  categorizeTerm(word) {
    const w = word.toLowerCase();
    const tech = new Set(['javascript', 'typescript', 'python', 'java', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'go', 'golang', 'scala', 'c++', 'c#', 'r', 'matlab', 'perl', 'lua', 'dart', 'elixir', 'haskell', 'clojure', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'sql', 'nosql', 'graphql', 'react', 'angular', 'vue', 'svelte', 'redux', 'node', 'express', 'django', 'flask', 'rails', 'spring', 'laravel', '.net', 'webpack', 'vite', 'babel']);
    const tools = new Set(['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github', 'gitlab', 'bitbucket', 'git', 'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'elasticsearch', 'kafka', 'jira', 'confluence', 'figma', 'jest', 'cypress', 'playwright', 'selenium', 'pytest', 'nginx', 'prometheus', 'grafana', 'datadog', 'splunk', 'npm', 'yarn', 'linux', 'windows']);
    const certs = new Set(['pmp', 'aws certified', 'cpa', 'cfa', 'cissp', 'ccna', 'scrum master', 'csm', 'psm']);
    const soft = new Set(['communication', 'teamwork', 'leadership', 'collaboration', 'adaptability', 'creativity', 'initiative', 'mentoring', 'negotiation', 'presentation']);
    const verbs = new Set(MATCH_VERBS);

    if (tech.has(w)) return 'hardSkills';
    if (tools.has(w)) return 'tools';
    if (certs.has(w)) return 'certifications';
    if (soft.has(w)) return 'softSkills';
    if (verbs.has(w)) return 'responsibilityVerbs';
    return 'general';
  }

  isStopWord(w) {
    const stops = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'its', 'let', 'say', 'she', 'too', 'use', 'way', 'who', 'how', 'man', 'did', 'get', 'may', 'him', 'his', 'old', 'see', 'now', 'any', 'new', 'own', 'few', 'also', 'with', 'this', 'that', 'from', 'they', 'been', 'have', 'will', 'each', 'make', 'like', 'just', 'over', 'such', 'take', 'than', 'them', 'very', 'some', 'what', 'know', 'when', 'come', 'could', 'other', 'about', 'which', 'their', 'would', 'there', 'these', 'into', 'more', 'most', 'then', 'work', 'able', 'well', 'only', 'year', 'years', 'your', 'does', 'should', 'must', 'while', 'where', 'after', 'being', 'both', 'between', 'during', 'before', 'first', 'through', 'same', 'back', 'much', 'because', 'good', 'give', 'many', 'still', 'every', 'want', 'role', 'join', 'team', 'looking', 'position', 'company', 'ideal', 'candidate', 'opportunity', 'experience', 'strong', 'working', 'including', 'using', 'within', 'across', 'related', 'etc', 'per', 'via', 'key', 'day', 'based', 'part', 'high', 'level', 'upon']);
    return stops.has(w);
  }

  isCommonWord(w) {
    const common = new Set(['ability', 'apply', 'build', 'business', 'client', 'collaborate', 'communication', 'complex', 'deliver', 'demonstrate', 'design', 'develop', 'development', 'drive', 'ensure', 'environment', 'excellent', 'hands', 'help', 'implement', 'improve', 'innovation', 'knowledge', 'large', 'lead', 'leverage', 'maintain', 'manage', 'multiple', 'others', 'partner', 'people', 'perform', 'process', 'provide', 'report', 'scale', 'skills', 'software', 'solution', 'solutions', 'success', 'support', 'systems', 'technical', 'technology', 'tools', 'understand', 'understanding']);
    return common.has(w);
  }

  isTechnicalTerm(w) {
    const tech = new Set(['javascript', 'typescript', 'python', 'java', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'go', 'golang', 'scala', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'sql', 'nosql', 'graphql', 'rest', 'restful', 'react', 'angular', 'vue', 'svelte', 'ember', 'backbone', 'jquery', 'redux', 'mobx', 'rxjs', 'node', 'express', 'django', 'flask', 'fastapi', 'rails', 'spring', 'laravel', 'symfony', '.net', 'asp', 'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'circleci', 'travis', 'github', 'gitlab', 'bitbucket', 'git', 'svn', 'mercurial', 'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'sqlite', 'oracle', 'kafka', 'rabbitmq', 'spark', 'hadoop', 'airflow', 'jest', 'mocha', 'cypress', 'playwright', 'selenium', 'pytest', 'junit', 'rspec', 'webpack', 'vite', 'babel', 'rollup', 'parcel', 'esbuild', 'npm', 'yarn', 'pnpm', 'figma', 'sketch', 'jira', 'confluence', 'trello', 'asana', 'notion', 'linear', 'linux', 'unix', 'windows', 'macos', 'ios', 'android', 'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit', 'matplotlib', 'agile', 'scrum', 'kanban', 'waterfall', 'tdd', 'bdd', 'devops', 'sre', 'cicd', 'api', 'apis', 'sdk', 'cli', 'gui', 'ide', 'orm', 'mvc', 'mvvm', 'c++', 'c#', 'f#', 'r', 'matlab', 'perl', 'lua', 'dart', 'elixir', 'haskell', 'clojure', 'lambda', 's3', 'ec2', 'rds', 'sqs', 'sns', 'cloudformation', 'ecs', 'eks', 'fargate', 'nginx', 'apache', 'caddy', 'haproxy', 'prometheus', 'grafana', 'datadog', 'newrelic', 'splunk', 'kibana', 'oauth', 'jwt', 'saml', 'ssl', 'tls', 'https', 'cors', 'csrf', 'xss', 'microservices', 'monolith', 'serverless', 'websocket', 'grpc', 'soap', 'blockchain', 'ai', 'ml', 'nlp', 'iot']);
    return tech.has(w.toLowerCase().replace(/[^a-z0-9#+.\/]/g, ''));
  }

  extractRequirements(jdText) {
    const lines = jdText.split(/\n/).map(l => l.trim()).filter(Boolean);
    const req = { required: [], preferred: [], responsibilities: [] };
    let section = 'unknown';
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (/\b(requirements?|qualifications?|must have|minimum|required)\b/i.test(lower)) { section = 'required'; continue; }
      if (/\b(preferred|nice to have|bonus|desired|plus|ideal)\b/i.test(lower)) { section = 'preferred'; continue; }
      if (/\b(responsibilities|duties|what you|role|you will|about the role)\b/i.test(lower)) { section = 'responsibilities'; continue; }
      const isBullet = /^[-•*▪▸►⦁◦‣]\s/.test(line) || /^\d+[.)\s]/.test(line);
      if (isBullet || line.length > 20) {
        const clean = line.replace(/^[-•*▪▸►⦁◦‣\d.)\s]+/, '').trim();
        if (clean.length > 10 && section !== 'unknown') req[section]?.push(clean);
      }
    }
    return req;
  }

  getScoreClass(score) {
    if (score >= 70) return 'jm-score--high';
    if (score >= 40) return 'jm-score--medium';
    return 'jm-score--low';
  }

  resetState() {
    this.selectedResumeId = null; this.selectedResume = null;
    this.activeJD = null; this.analysisResult = null;
    this.resultSearch = ''; this.resultFilter = 'all';
    this.resultCategoryFilter = 'all'; this.dismissedIds.clear();
  }

  gc() { return this.container?.querySelector('#jm-content') || this.container; }
  tick() { return new Promise(r => setTimeout(r, 30)); }
  escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }
}

export default JobMatcher;
