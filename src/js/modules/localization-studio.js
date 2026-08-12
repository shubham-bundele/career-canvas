import { createElement, sanitizeInput } from '../utils/sanitize.js';
import eventBus from '../core/events.js';
import { STORES } from '../core/db.js';
import { generateUUID } from '../utils/id.js';

const STORAGE_KEY = 'cc_localization';

const DATE_FORMATS = [
  { id: 'mdy', label: 'MM/DD/YYYY', example: '08/11/2026' },
  { id: 'dmy', label: 'DD/MM/YYYY', example: '11/08/2026' },
  { id: 'ymd', label: 'YYYY-MM-DD', example: '2026-08-11' },
  { id: 'long', label: 'Month DD, YYYY', example: 'August 11, 2026' },
];

const NUMBER_FORMATS = [
  { id: 'us', label: '1,000.00', desc: 'US / UK' },
  { id: 'eu', label: '1.000,00', desc: 'EU / India' },
  { id: 'ch', label: "1'000.00", desc: 'Swiss' },
];

const PAPER_SIZES = [
  { id: 'a4', label: 'A4 (210 x 297 mm)', region: 'International' },
  { id: 'letter', label: 'US Letter (8.5 x 11 in)', region: 'US / Canada' },
  { id: 'legal', label: 'US Legal (8.5 x 14 in)', region: 'US' },
];

const DEFAULT_LABELS = {
  'Professional Summary': 'Professional Summary',
  'Work Experience': 'Work Experience',
  'Education': 'Education',
  'Skills': 'Skills',
  'Projects': 'Projects',
  'Certifications': 'Certifications',
  'Languages': 'Languages',
  'Volunteer Experience': 'Volunteer Experience',
  'Awards': 'Awards',
  'Publications': 'Publications',
  'References': 'References',
};

const AI_TRANSLATE_LANGUAGES = [
  { id: 'spanish', label: 'Spanish' },
  { id: 'french', label: 'French' },
  { id: 'german', label: 'German' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'chinese', label: 'Chinese' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'portuguese', label: 'Portuguese' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'korean', label: 'Korean' },
];

const HINDI_LABELS = {
  'Professional Summary': 'व्यावसायिक सारांश',
  'Work Experience': 'कार्य अनुभव',
  'Education': 'शिक्षा',
  'Skills': 'कौशल',
  'Projects': 'परियोजनाएँ',
  'Certifications': 'प्रमाण पत्र',
  'Languages': 'भाषाएँ',
  'Volunteer Experience': 'स्वयंसेवी अनुभव',
  'Awards': 'पुरस्कार',
  'Publications': 'प्रकाशन',
  'References': 'संदर्भ',
};

export class LocalizationStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { language: 'en', dateFormat: 'mdy', numberFormat: 'us', paperSize: 'a4', labels: { ...DEFAULT_LABELS } };
    } catch { return { language: 'en', dateFormat: 'mdy', numberFormat: 'us', paperSize: 'a4', labels: { ...DEFAULT_LABELS } }; }
  }

  saveConfig() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config)); } catch {}
  }

  async render() {
    this.container = createElement('div', '', { class: 'loc-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Localization Studio');
    this.container.innerHTML = '';
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'loc-content', id: 'loc-content' });
    this.container.appendChild(content);
    this.showSettings();
    return this.container;
  }

  renderHeader() {
    const hdr = createElement('div', '', { class: 'loc-header' });
    hdr.innerHTML = '<nav class="loc-breadcrumb" aria-label="Breadcrumb"><ol class="breadcrumb-list"><li class="breadcrumb-item"><a href="#/dashboard" class="breadcrumb-link">Dashboard</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item breadcrumb-current" aria-current="page">Localization</li></ol></nav>';
    const row = createElement('div', '', { class: 'loc-title-row' });
    const group = createElement('div', '', { class: 'loc-title-group' });
    group.appendChild(createElement('h1', 'Localization Studio', { class: 'loc-title' }));
    group.appendChild(createElement('p', 'Configure date formats, number formats, paper sizes, and section label translations for your documents.', { class: 'loc-description' }));
    row.appendChild(group);
    hdr.appendChild(row);
    return hdr;
  }

  showSettings() {
    const c = this.gc(); c.innerHTML = '';
    const w = createElement('div', '', { class: 'loc-settings' });

    // Language
    const langSec = this.makeSection('Interface Language');
    const langRow = createElement('div', '', { class: 'loc-option-row' });
    [['en', 'English'], ['hi', 'Hindi (हिन्दी)']].forEach(([val, label]) => {
      const btn = createElement('button', label, { class: `loc-option-btn ${this.config.language === val ? 'loc-option-btn--active' : ''}`, type: 'button' });
      this.al(btn, 'click', () => { this.config.language = val; if (val === 'hi') this.config.labels = { ...HINDI_LABELS }; else this.config.labels = { ...DEFAULT_LABELS }; this.saveConfig(); this.showSettings(); this.toast('Language updated', 'success'); });
      langRow.appendChild(btn);
    });
    langSec.appendChild(langRow);
    w.appendChild(langSec);

    // Date Format
    const dateSec = this.makeSection('Date Format');
    const dateRow = createElement('div', '', { class: 'loc-option-row' });
    DATE_FORMATS.forEach(fmt => {
      const btn = createElement('button', `${fmt.label} (${fmt.example})`, { class: `loc-option-btn ${this.config.dateFormat === fmt.id ? 'loc-option-btn--active' : ''}`, type: 'button' });
      this.al(btn, 'click', () => { this.config.dateFormat = fmt.id; this.saveConfig(); this.showSettings(); });
      dateRow.appendChild(btn);
    });
    dateSec.appendChild(dateRow);
    w.appendChild(dateSec);

    // Number Format
    const numSec = this.makeSection('Number Format');
    const numRow = createElement('div', '', { class: 'loc-option-row' });
    NUMBER_FORMATS.forEach(fmt => {
      const btn = createElement('button', `${fmt.label} (${fmt.desc})`, { class: `loc-option-btn ${this.config.numberFormat === fmt.id ? 'loc-option-btn--active' : ''}`, type: 'button' });
      this.al(btn, 'click', () => { this.config.numberFormat = fmt.id; this.saveConfig(); this.showSettings(); });
      numRow.appendChild(btn);
    });
    numSec.appendChild(numRow);
    w.appendChild(numSec);

    // Paper Size
    const paperSec = this.makeSection('Recommended Paper Size');
    const paperRow = createElement('div', '', { class: 'loc-option-row' });
    PAPER_SIZES.forEach(ps => {
      const btn = createElement('button', `${ps.label} — ${ps.region}`, { class: `loc-option-btn ${this.config.paperSize === ps.id ? 'loc-option-btn--active' : ''}`, type: 'button' });
      this.al(btn, 'click', () => { this.config.paperSize = ps.id; this.saveConfig(); this.showSettings(); });
      paperRow.appendChild(btn);
    });
    paperSec.appendChild(paperRow);
    w.appendChild(paperSec);

    // Section Labels
    const labelSec = this.makeSection('Section Label Translations');
    const labelGrid = createElement('div', '', { class: 'loc-label-grid' });
    const defaults = this.config.language === 'hi' ? HINDI_LABELS : DEFAULT_LABELS;
    Object.keys(DEFAULT_LABELS).forEach(key => {
      const row = createElement('div', '', { class: 'loc-label-row' });
      row.appendChild(createElement('span', key, { class: 'loc-label-original' }));
      const input = createElement('input', '', { class: 'loc-label-input', type: 'text', value: this.config.labels[key] || defaults[key] || key, 'aria-label': `Translation for ${key}` });
      this.al(input, 'change', e => { this.config.labels[key] = sanitizeInput(e.target.value, 100) || key; this.saveConfig(); });
      row.appendChild(input);
      labelGrid.appendChild(row);
    });
    labelSec.appendChild(labelGrid);
    w.appendChild(labelSec);

    // AI Translate Resume
    const aiSec = this.makeSection('AI Resume Translation');
    const aiDesc = createElement('p', 'Translate your entire resume into another language using AI. Select a document and target language.', { class: 'loc-section-desc' });
    aiSec.appendChild(aiDesc);
    const aiRow = createElement('div', '', { class: 'loc-ai-translate-row' });

    const docSelect = createElement('select', '', { class: 'loc-ai-select', 'aria-label': 'Select document to translate' });
    docSelect.appendChild(createElement('option', 'Select a document...', { value: '' }));
    docSelect.setAttribute('id', 'loc-ai-doc-select');
    aiRow.appendChild(docSelect);

    const langSelect = createElement('select', '', { class: 'loc-ai-select', 'aria-label': 'Select target language' });
    AI_TRANSLATE_LANGUAGES.forEach(lang => {
      langSelect.appendChild(createElement('option', lang.label, { value: lang.id }));
    });
    aiRow.appendChild(langSelect);

    const translateBtn = createElement('button', '', { class: 'btn btn-primary loc-ai-translate-btn' });
    translateBtn.innerHTML = '&#127757; AI Translate Resume';
    this.al(translateBtn, 'click', () => this.runAiTranslate(docSelect, langSelect, translateBtn));
    aiRow.appendChild(translateBtn);

    aiSec.appendChild(aiRow);
    w.appendChild(aiSec);

    this.loadDocumentsForTranslate(docSelect);

    // Export
    const actBar = createElement('div', '', { class: 'loc-action-bar' });
    const exportBtn = createElement('button', 'Export Settings', { class: 'btn btn-sm btn-outline' });
    this.al(exportBtn, 'click', () => this.exportSettings());
    actBar.appendChild(exportBtn);
    const resetBtn = createElement('button', 'Reset to Defaults', { class: 'btn btn-sm btn-ghost' });
    this.al(resetBtn, 'click', () => { this.config = { language: 'en', dateFormat: 'mdy', numberFormat: 'us', paperSize: 'a4', labels: { ...DEFAULT_LABELS } }; this.saveConfig(); this.showSettings(); this.toast('Reset to defaults', 'info'); });
    actBar.appendChild(resetBtn);
    w.appendChild(actBar);

    c.appendChild(w);
  }

  makeSection(title) {
    const sec = createElement('div', '', { class: 'loc-section' });
    sec.appendChild(createElement('h2', title, { class: 'loc-section-title' }));
    return sec;
  }

  exportSettings() {
    const blob = new Blob([JSON.stringify(this.config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'careercanvas-localization.json'; a.click();
    URL.revokeObjectURL(url);
    this.toast('Settings exported', 'success');
  }

  toast(msg, type) { if (window.CC?.toast) window.CC.toast.show(msg, type); }
  gc() { return this.container?.querySelector('#loc-content') || this.container; }
  al(el, ev, fn) { el.addEventListener(ev, fn); this.listeners.push({ element: el, event: ev, handler: fn }); }
  async loadDocumentsForTranslate(selectEl) {
    try {
      const docs = await this.db.getAll(STORES.DOCUMENTS);
      (docs || []).filter(d => !d.archived).forEach(doc => {
        selectEl.appendChild(createElement('option', doc.title || doc.name || 'Untitled', { value: doc.id }));
      });
    } catch {}
  }

  async runAiTranslate(docSelect, langSelect, btn) {
    const docId = docSelect.value;
    const lang = langSelect.value;

    if (!docId) {
      this.toast('Please select a document to translate', 'error');
      return;
    }

    btn.disabled = true;
    const origHTML = btn.innerHTML;
    btn.textContent = 'Translating...';

    try {
      const doc = await this.db.get(STORES.DOCUMENTS, docId);
      if (!doc) {
        this.toast('Document not found', 'error');
        return;
      }

      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());
      const translated = await ai.translateResume(doc, lang);

      if (!translated) {
        this.toast('AI returned empty translation', 'error');
        return;
      }

      this.showTranslateModal(translated, doc, lang);
    } catch (err) {
      this.toast('Translation failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHTML;
    }
  }

  showTranslateModal(translatedText, originalDoc, language) {
    const overlay = createElement('div', '', { class: 'loc-modal-overlay' });
    const modal = createElement('div', '', { class: 'loc-modal', role: 'dialog', 'aria-label': 'Translated Resume' });

    const modalHeader = createElement('div', '', { class: 'loc-modal-header' });
    const langLabel = AI_TRANSLATE_LANGUAGES.find(l => l.id === language);
    modalHeader.appendChild(createElement('h2', 'Translated Resume (' + (langLabel ? langLabel.label : language) + ')', { class: 'loc-modal-title' }));

    const closeBtn = createElement('button', '×', { class: 'loc-modal-close', 'aria-label': 'Close' });
    this.al(closeBtn, 'click', () => overlay.remove());
    modalHeader.appendChild(closeBtn);
    modal.appendChild(modalHeader);

    const body = createElement('div', '', { class: 'loc-modal-body' });
    const pre = createElement('pre', '', { class: 'loc-modal-content' });
    pre.textContent = translatedText;
    body.appendChild(pre);
    modal.appendChild(body);

    const footer = createElement('div', '', { class: 'loc-modal-footer' });

    const copyBtn = createElement('button', 'Copy All', { class: 'btn btn-outline' });
    this.al(copyBtn, 'click', async () => {
      try {
        await navigator.clipboard.writeText(translatedText);
        copyBtn.textContent = 'Copied!';
        this.toast('Translation copied to clipboard', 'success');
        setTimeout(() => { copyBtn.textContent = 'Copy All'; }, 2000);
      } catch {
        this.toast('Failed to copy', 'error');
      }
    });
    footer.appendChild(copyBtn);

    const createDocBtn = createElement('button', 'Create Translated Document', { class: 'btn btn-primary' });
    this.al(createDocBtn, 'click', async () => {
      createDocBtn.disabled = true;
      createDocBtn.textContent = 'Creating...';
      try {
        await this.createTranslatedDocument(originalDoc, translatedText, language);
        createDocBtn.textContent = 'Created!';
        this.toast('Translated document created', 'success');
      } catch (err) {
        createDocBtn.disabled = false;
        createDocBtn.textContent = 'Create Translated Document';
        this.toast('Failed: ' + (err.message || 'Unknown error'), 'error');
      }
    });
    footer.appendChild(createDocBtn);

    modal.appendChild(footer);
    overlay.appendChild(modal);

    this.al(overlay, 'click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  async createTranslatedDocument(originalDoc, translatedText, language) {
    const langLabel = AI_TRANSLATE_LANGUAGES.find(l => l.id === language);
    const langName = langLabel ? langLabel.label : language;

    const newDoc = JSON.parse(JSON.stringify(originalDoc));
    newDoc.id = generateUUID();
    newDoc.title = (originalDoc.title || originalDoc.name || 'Untitled') + ' (' + langName + ')';
    newDoc.name = newDoc.title;
    newDoc.createdAt = new Date().toISOString();
    newDoc.lastModified = new Date().toISOString();

    // Store the translated text in the summary/first content section
    if (newDoc.personalInfo && newDoc.personalInfo.resumeHeadline) {
      newDoc.personalInfo.resumeHeadline = newDoc.personalInfo.resumeHeadline + ' [' + langName + ']';
    }

    // Parse translated lines back into sections where possible
    const lines = translatedText.split('\n');
    let currentSectionIdx = -1;
    let currentItemIdx = -1;
    let bulletBuffer = [];

    if (Array.isArray(newDoc.sections)) {
      // Put the full translated text as content in the first visible section's description
      const firstSection = newDoc.sections.find(s => s.visible !== false);
      if (firstSection) {
        if (!firstSection.content) firstSection.content = '';
        firstSection.content = translatedText;
      }
    }

    // Add a metadata tag
    if (!newDoc.tags) newDoc.tags = [];
    newDoc.tags.push('translated-' + language);

    await this.db.put(STORES.DOCUMENTS, newDoc);

    // Refresh the document select dropdown
    const docSelect = this.container?.querySelector('#loc-ai-doc-select');
    if (docSelect) {
      docSelect.appendChild(createElement('option', newDoc.title, { value: newDoc.id }));
    }
  }

  hasUnsavedChanges() { return false; }
  destroy() {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}


