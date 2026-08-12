import { createElement, sanitizeInput } from '../utils/sanitize.js';
import eventBus from '../core/events.js';

export class ThemeStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];
    this.engine = null;
    this.searchQuery = '';
    this.filterCategory = 'all';
    this.editingTheme = null;
  }

  async render() {
    this.engine = window.CC?.themeEngine;
    if (!this.engine) throw new Error('ThemeEngine not available');

    this.container = createElement('div', '', { class: 'ts-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Theme Studio');

    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'ts-content', id: 'ts-content' });
    this.container.appendChild(content);
    this.showGallery();
    return this.container;
  }

  renderHeader() {
    const hdr = createElement('div', '', { class: 'ts-header' });
    const bc = createElement('nav', '', { class: 'ts-breadcrumb', 'aria-label': 'Breadcrumb' });
    bc.innerHTML = '<ol class="breadcrumb-list"><li class="breadcrumb-item"><a href="#/dashboard" class="breadcrumb-link">Dashboard</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item breadcrumb-current" aria-current="page">Theme Studio</li></ol>';
    hdr.appendChild(bc);

    const row = createElement('div', '', { class: 'ts-title-row' });
    const group = createElement('div', '', { class: 'ts-title-group' });
    group.appendChild(createElement('h1', 'Theme Studio', { class: 'ts-title' }));
    group.appendChild(createElement('p', 'Personalize the CareerCanvas interface. Themes change the app appearance only — your resume designs are not affected.', { class: 'ts-description' }));
    row.appendChild(group);

    const acts = createElement('div', '', { class: 'ts-header-actions' });
    const resetBtn = createElement('button', 'Reset to Default', { class: 'btn btn-sm btn-ghost' });
    this.al(resetBtn, 'click', () => { this.engine.resetToDefault(); this.updateThemeIcon(); this.showGallery(); this.toast('Reset to CareerCanvas Light', 'success'); });
    acts.appendChild(resetBtn);
    const importBtn = createElement('button', 'Import Theme', { class: 'btn btn-sm btn-outline' });
    this.al(importBtn, 'click', () => this.importTheme());
    acts.appendChild(importBtn);
    const createBtn = createElement('button', '+ Create Theme', { class: 'btn btn-sm btn-primary' });
    this.al(createBtn, 'click', () => this.showEditor(null));
    acts.appendChild(createBtn);
    row.appendChild(acts);
    hdr.appendChild(row);
    return hdr;
  }

  // ==================== GALLERY VIEW ====================

  showGallery() {
    const c = this.gc(); c.innerHTML = '';
    this.editingTheme = null;

    // Search & Filter bar
    const bar = createElement('div', '', { class: 'ts-toolbar' });
    const search = createElement('input', '', { class: 'ts-search', type: 'search', placeholder: 'Search themes...', 'aria-label': 'Search themes' });
    search.value = this.searchQuery;
    this.al(search, 'input', e => { this.searchQuery = e.target.value; this.renderCards(); });
    bar.appendChild(search);

    const categories = ['all', 'Light', 'Dark', 'Professional', 'Colorful', 'Calm', 'High Contrast', 'System', 'Custom'];
    const filterRow = createElement('div', '', { class: 'ts-filter-row' });
    categories.forEach(cat => {
      const btn = createElement('button', cat === 'all' ? 'All' : cat, {
        class: `ts-filter-btn ${this.filterCategory === cat ? 'ts-filter-btn--active' : ''}`, type: 'button'
      });
      this.al(btn, 'click', () => {
        this.filterCategory = cat;
        filterRow.querySelectorAll('.ts-filter-btn').forEach(b => b.classList.remove('ts-filter-btn--active'));
        btn.classList.add('ts-filter-btn--active');
        this.renderCards();
      });
      filterRow.appendChild(btn);
    });
    bar.appendChild(filterRow);
    c.appendChild(bar);

    const grid = createElement('div', '', { class: 'ts-grid', id: 'ts-grid' });
    c.appendChild(grid);
    this.renderCards();
  }

  renderCards() {
    const grid = this.container?.querySelector('#ts-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const currentId = this.engine.getCurrentThemeId();
    let themes = [...this.engine.getBuiltInThemes(), ...this.engine.getCustomThemes()];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      themes = themes.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q));
    }
    if (this.filterCategory !== 'all') {
      if (this.filterCategory === 'Custom') {
        themes = themes.filter(t => !t.builtIn);
      } else {
        themes = themes.filter(t => t.category === this.filterCategory || (this.filterCategory === 'System' && t.id === 'system'));
      }
    }

    if (themes.length === 0) {
      grid.appendChild(createElement('p', 'No themes match your search.', { class: 'ts-empty' }));
      return;
    }

    themes.forEach(theme => {
      const card = createElement('div', '', {
        class: `ts-card ${theme.id === currentId ? 'ts-card--active' : ''}`,
        tabindex: '0', role: 'button',
        'aria-label': `${theme.name}${theme.id === currentId ? ' (current)' : ''}`
      });

      // Color preview
      const preview = createElement('div', '', { class: 'ts-card-preview' });
      const colors = theme.previewColors || ['#fff', '#f0f0f0', '#333', '#666'];
      colors.forEach((color, i) => {
        const swatch = createElement('div', '', { class: `ts-swatch ts-swatch-${i}` });
        swatch.style.backgroundColor = color;
        preview.appendChild(swatch);
      });
      card.appendChild(preview);

      // Info
      const info = createElement('div', '', { class: 'ts-card-info' });
      const nameRow = createElement('div', '', { class: 'ts-card-name-row' });
      const name = createElement('h3', '', { class: 'ts-card-name' });
      name.textContent = theme.name;
      nameRow.appendChild(name);
      if (theme.id === currentId) {
        nameRow.appendChild(createElement('span', 'Active', { class: 'ts-active-badge' }));
      }
      info.appendChild(nameRow);

      if (theme.description) {
        const desc = createElement('p', '', { class: 'ts-card-desc' });
        desc.textContent = theme.description;
        info.appendChild(desc);
      }

      const meta = createElement('div', '', { class: 'ts-card-meta' });
      meta.textContent = `${theme.category || 'General'} · ${theme.mode || 'light'}`;
      info.appendChild(meta);
      card.appendChild(info);

      // Actions
      const acts = createElement('div', '', { class: 'ts-card-actions' });

      if (theme.id !== currentId && theme.id !== 'system') {
        const previewBtn = createElement('button', 'Preview', { class: 'btn btn-sm btn-ghost' });
        this.al(previewBtn, 'click', e => { e.stopPropagation(); this.previewTheme(theme.id); });
        acts.appendChild(previewBtn);
      }

      if (theme.id !== currentId) {
        const applyBtn = createElement('button', 'Apply', { class: 'btn btn-sm btn-primary' });
        this.al(applyBtn, 'click', e => { e.stopPropagation(); this.applyTheme(theme.id); });
        acts.appendChild(applyBtn);
      }

      if (!theme.builtIn) {
        const editBtn = createElement('button', 'Edit', { class: 'btn btn-sm btn-outline' });
        this.al(editBtn, 'click', e => { e.stopPropagation(); this.showEditor(theme); });
        acts.appendChild(editBtn);

        const dupBtn = createElement('button', 'Duplicate', { class: 'btn btn-sm btn-ghost' });
        this.al(dupBtn, 'click', e => { e.stopPropagation(); this.duplicateTheme(theme.id); });
        acts.appendChild(dupBtn);

        const exportBtn = createElement('button', 'Export', { class: 'btn btn-sm btn-ghost' });
        this.al(exportBtn, 'click', e => { e.stopPropagation(); this.exportTheme(theme.id); });
        acts.appendChild(exportBtn);

        const delBtn = createElement('button', 'Delete', { class: 'btn btn-sm btn-ghost ts-delete-btn' });
        this.al(delBtn, 'click', e => { e.stopPropagation(); this.deleteTheme(theme.id, theme.name); });
        acts.appendChild(delBtn);
      } else if (theme.id !== 'system') {
        const dupBtn = createElement('button', 'Customize', { class: 'btn btn-sm btn-outline' });
        this.al(dupBtn, 'click', e => { e.stopPropagation(); this.customizeBuiltIn(theme); });
        acts.appendChild(dupBtn);

        const exportBtn = createElement('button', 'Export', { class: 'btn btn-sm btn-ghost' });
        this.al(exportBtn, 'click', e => { e.stopPropagation(); this.exportTheme(theme.id); });
        acts.appendChild(exportBtn);
      }

      card.appendChild(acts);

      this.al(card, 'click', () => {
        if (theme.id !== currentId) this.applyTheme(theme.id);
      });
      this.al(card, 'keydown', e => {
        if (e.key === 'Enter' && theme.id !== currentId) this.applyTheme(theme.id);
      });

      grid.appendChild(card);
    });
  }

  // ==================== THEME ACTIONS ====================

  applyTheme(id) {
    this.engine.applyTheme(id);
    this.updateThemeIcon();
    this.showGallery();
    const theme = this.engine.getThemeById(id);
    this.toast(`Applied "${theme?.name || id}"`, 'success');
  }

  previewTheme(id) {
    this.engine.previewTheme(id);
    this.updateThemeIcon();
    const theme = this.engine.getThemeById(id);

    // Show preview bar
    let bar = this.container.querySelector('#ts-preview-bar');
    if (bar) bar.remove();
    bar = createElement('div', '', { class: 'ts-preview-bar', id: 'ts-preview-bar' });
    bar.appendChild(createElement('span', `Previewing: ${theme?.name || id}`, {}));
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-sm btn-ghost' });
    this.al(cancelBtn, 'click', () => { this.engine.cancelPreview(); this.updateThemeIcon(); bar.remove(); this.showGallery(); });
    bar.appendChild(cancelBtn);
    const confirmBtn = createElement('button', 'Apply This Theme', { class: 'btn btn-sm btn-primary' });
    this.al(confirmBtn, 'click', () => { this.engine.confirmPreview(); this.updateThemeIcon(); bar.remove(); this.showGallery(); this.toast(`Applied "${theme?.name}"`, 'success'); });
    bar.appendChild(confirmBtn);
    this.container.insertBefore(bar, this.gc());
  }

  duplicateTheme(id) {
    const dup = this.engine.duplicateCustomTheme(id);
    if (dup) { this.toast(`Duplicated as "${dup.name}"`, 'success'); this.showGallery(); }
    else this.toast('Failed to duplicate', 'error');
  }

  deleteTheme(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.engine.deleteCustomTheme(id);
    this.updateThemeIcon();
    this.toast('Theme deleted', 'info');
    this.showGallery();
  }

  exportTheme(id) {
    const data = this.engine.exportTheme(id);
    if (!data) { this.toast('Failed to export', 'error'); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${(data.theme?.name || id).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('Theme exported', 'success');
  }

  importTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 100 * 1024) { this.toast('File too large (max 100KB)', 'error'); return; }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const theme = this.engine.importTheme(data);
        this.toast(`Imported "${theme.name}"`, 'success');
        this.showGallery();
      } catch (e) {
        this.toast(`Import failed: ${e.message}`, 'error');
      }
    });
    input.click();
  }

  customizeBuiltIn(theme) {
    const copy = this.engine.createCustomTheme(`${theme.name} (Custom)`, theme.id);
    if (copy) {
      this.toast(`Created custom version of "${theme.name}"`, 'success');
      this.showEditor(copy);
    }
  }

  // ==================== EDITOR VIEW ====================

  showEditor(theme) {
    const c = this.gc(); c.innerHTML = '';

    const isNew = !theme;
    if (isNew) {
      const base = this.engine.getThemeById(this.engine.getCurrentThemeId()) || this.engine.getBuiltInThemes()[0];
      theme = this.engine.createCustomTheme('My Custom Theme', base.id);
    }
    this.editingTheme = { ...theme, tokens: { ...theme.tokens } };

    const wrapper = createElement('div', '', { class: 'ts-editor' });

    // Top bar
    const topBar = createElement('div', '', { class: 'ts-editor-topbar' });
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-ghost' });
    backBtn.innerHTML = '&#8592; Back to Gallery';
    this.al(backBtn, 'click', () => this.showGallery());
    topBar.appendChild(backBtn);
    topBar.appendChild(createElement('h2', isNew ? 'Create Theme' : `Edit: ${theme.name}`, { class: 'ts-editor-title' }));
    const saveBtn = createElement('button', 'Save Theme', { class: 'btn btn-sm btn-primary' });
    this.al(saveBtn, 'click', () => this.saveEditedTheme());
    topBar.appendChild(saveBtn);
    wrapper.appendChild(topBar);

    const cols = createElement('div', '', { class: 'ts-editor-columns' });

    // Left: Controls
    const left = createElement('div', '', { class: 'ts-editor-controls' });

    // Name
    const nameGrp = this.makeField('Theme Name', 'ts-ed-name', 'text', this.editingTheme.name, v => { this.editingTheme.name = v; });
    left.appendChild(nameGrp);

    // Description
    const descGrp = this.makeField('Description', 'ts-ed-desc', 'text', this.editingTheme.description || '', v => { this.editingTheme.description = v; });
    left.appendChild(descGrp);

    // Mode
    const modeGrp = createElement('div', '', { class: 'ts-field-group' });
    modeGrp.appendChild(createElement('label', 'Mode', { class: 'ts-field-label', for: 'ts-ed-mode' }));
    const modeSelect = createElement('select', '', { class: 'ts-field-select', id: 'ts-ed-mode' });
    [['light', 'Light'], ['dark', 'Dark']].forEach(([v, l]) => {
      const o = createElement('option', l, { value: v });
      if (v === this.editingTheme.mode) o.selected = true;
      modeSelect.appendChild(o);
    });
    this.al(modeSelect, 'change', e => { this.editingTheme.mode = e.target.value; });
    modeGrp.appendChild(modeSelect);
    left.appendChild(modeGrp);

    // Color sections
    const colorSections = [
      { title: 'Brand Colors', tokens: [
        ['color-primary', 'Primary'], ['color-primary-light', 'Primary Light'], ['color-primary-dark', 'Primary Dark']
      ]},
      { title: 'Backgrounds', tokens: [
        ['bg-primary', 'Primary BG'], ['bg-secondary', 'Secondary BG'], ['bg-tertiary', 'Tertiary BG'],
        ['bg-elevated', 'Elevated BG'], ['bg-hover', 'Hover BG']
      ]},
      { title: 'Text', tokens: [
        ['text-primary', 'Primary Text'], ['text-secondary', 'Secondary Text'], ['text-muted', 'Muted Text'], ['text-inverse', 'Inverse Text']
      ]},
      { title: 'Borders', tokens: [
        ['border-primary', 'Primary Border'], ['border-secondary', 'Secondary Border']
      ]},
      { title: 'Semantic', tokens: [
        ['color-success', 'Success'], ['color-warning', 'Warning'], ['color-error', 'Error'], ['color-info', 'Info']
      ]}
    ];

    colorSections.forEach(section => {
      const sec = createElement('div', '', { class: 'ts-color-section' });
      sec.appendChild(createElement('h3', section.title, { class: 'ts-color-section-title' }));
      const grid = createElement('div', '', { class: 'ts-color-grid' });
      section.tokens.forEach(([token, label]) => {
        const val = this.editingTheme.tokens[token] || '#000000';
        const isRgba = val.startsWith('rgba') || val.startsWith('rgb');
        const item = createElement('div', '', { class: 'ts-color-item' });
        const lbl = createElement('label', label, { class: 'ts-color-label', for: `ts-color-${token}` });
        item.appendChild(lbl);
        if (!isRgba) {
          const input = createElement('input', '', { class: 'ts-color-input', type: 'color', id: `ts-color-${token}` });
          input.value = val;
          this.al(input, 'input', e => {
            this.editingTheme.tokens[token] = e.target.value;
            this.livePreviewEdit();
          });
          item.appendChild(input);
        } else {
          const input = createElement('input', '', { class: 'ts-field-input ts-color-text-input', type: 'text', id: `ts-color-${token}` });
          input.value = val;
          this.al(input, 'change', e => {
            this.editingTheme.tokens[token] = e.target.value;
            this.livePreviewEdit();
          });
          item.appendChild(input);
        }
        const hexLabel = createElement('span', val, { class: 'ts-color-hex', id: `ts-hex-${token}` });
        item.appendChild(hexLabel);
        grid.appendChild(item);
      });
      sec.appendChild(grid);
      left.appendChild(sec);
    });

    cols.appendChild(left);

    // Right: Preview
    const right = createElement('div', '', { class: 'ts-editor-preview' });
    right.appendChild(createElement('h3', 'Preview', { class: 'ts-preview-title' }));
    const previewFrame = createElement('div', '', { class: 'ts-preview-frame', id: 'ts-preview-frame' });
    previewFrame.innerHTML = `
      <div class="ts-preview-mock">
        <div class="ts-mock-header">
          <div class="ts-mock-logo">C</div>
          <div class="ts-mock-nav"><span></span><span></span><span></span></div>
          <div class="ts-mock-btn"></div>
        </div>
        <div class="ts-mock-body">
          <div class="ts-mock-card">
            <div class="ts-mock-title"></div>
            <div class="ts-mock-text"></div>
            <div class="ts-mock-text ts-mock-text--short"></div>
          </div>
          <div class="ts-mock-card">
            <div class="ts-mock-title"></div>
            <div class="ts-mock-text"></div>
            <div class="ts-mock-badge ts-mock-badge--success">Success</div>
            <div class="ts-mock-badge ts-mock-badge--warning">Warning</div>
            <div class="ts-mock-badge ts-mock-badge--error">Error</div>
          </div>
          <div class="ts-mock-actions">
            <div class="ts-mock-btn-primary">Primary</div>
            <div class="ts-mock-btn-outline">Outline</div>
          </div>
        </div>
      </div>`;
    right.appendChild(previewFrame);
    this.applyPreviewTokens(previewFrame, this.editingTheme.tokens);
    cols.appendChild(right);

    wrapper.appendChild(cols);
    c.appendChild(wrapper);
  }

  makeField(label, id, type, value, onChange) {
    const grp = createElement('div', '', { class: 'ts-field-group' });
    grp.appendChild(createElement('label', label, { class: 'ts-field-label', for: id }));
    const input = createElement('input', '', { class: 'ts-field-input', type, id, maxlength: '100' });
    input.value = value;
    this.al(input, 'input', e => onChange(e.target.value));
    grp.appendChild(input);
    return grp;
  }

  livePreviewEdit() {
    const frame = this.container?.querySelector('#ts-preview-frame');
    if (frame) this.applyPreviewTokens(frame, this.editingTheme.tokens);
    // Also update hex labels
    for (const [token, val] of Object.entries(this.editingTheme.tokens)) {
      const hex = this.container?.querySelector(`#ts-hex-${token}`);
      if (hex) hex.textContent = val;
    }
  }

  applyPreviewTokens(frame, tokens) {
    for (const [key, val] of Object.entries(tokens)) {
      frame.style.setProperty(`--${key}`, val);
    }
  }

  saveEditedTheme() {
    if (!this.editingTheme) return;
    const t = this.editingTheme;
    t.name = sanitizeInput(t.name, 100) || 'Custom Theme';
    t.description = sanitizeInput(t.description || '', 200);
    t.previewColors = [
      t.tokens['bg-primary'] || '#fff',
      t.tokens['bg-secondary'] || '#f0f0f0',
      t.tokens['color-primary'] || '#333',
      t.tokens['text-primary'] || '#000'
    ];

    if (!this.engine.validateTheme(t)) {
      this.toast('Theme is missing required tokens', 'error');
      return;
    }

    this.engine.updateCustomTheme(t.id, t);
    this.toast(`Saved "${t.name}"`, 'success');
    this.showGallery();
  }

  // ==================== HELPERS ====================

  updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      const mode = this.engine.getResolvedMode();
      icon.textContent = mode === 'dark' ? '☀️' : '🌙';
    }
  }

  toast(msg, type) {
    if (window.CC?.toast) window.CC.toast.show(msg, type);
  }

  gc() { return this.container?.querySelector('#ts-content') || this.container; }

  al(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  hasUnsavedChanges() {
    return !!this.editingTheme;
  }

  destroy() {
    // Cancel any active preview
    if (this.engine?.previewThemeId) this.engine.cancelPreview();
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}


