import { createElement, sanitizeInput, encodeHTML } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { formatTimeAgo } from '../utils/format.js';
import eventBus from '../core/events.js';
import { STORES } from '../core/db.js';

const FIELD_TYPES = [
  { value: 'shortText', label: 'Short Text', icon: 'T' },
  { value: 'longText', label: 'Long Text', icon: '¶' },
  { value: 'richText', label: 'Rich Text', icon: 'R' },
  { value: 'date', label: 'Date', icon: 'D' },
  { value: 'monthYear', label: 'Month & Year', icon: 'MY' },
  { value: 'dateRange', label: 'Date Range', icon: 'DR' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'email', label: 'Email', icon: '@' },
  { value: 'phone', label: 'Phone', icon: '☎' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'select', label: 'Select', icon: '▼' },
  { value: 'multiSelect', label: 'Multi-select', icon: '☐' },
  { value: 'checkbox', label: 'Checkbox', icon: '✓' },
  { value: 'tags', label: 'Tags', icon: '⊞' },
];

const SECTION_CATEGORIES = [
  'Career', 'Academic', 'Technical', 'Student', 'International', 'Personal', 'Custom'
];

export class SectionStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];
    this.definitions = [];
    this.editing = null;
    this.view = 'list';
  }

  async render() {
    this.container = createElement('div', '', { class: 'ss-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Section Studio');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'ss-content', id: 'ss-content' });
    this.container.appendChild(content);
    await this.showList();
    return this.container;
  }

  renderHeader() {
    const hdr = createElement('div', '', { class: 'ss-header' });
    hdr.innerHTML = '<nav class="ss-breadcrumb" aria-label="Breadcrumb"><ol class="breadcrumb-list"><li class="breadcrumb-item"><a href="#/dashboard" class="breadcrumb-link">Dashboard</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item breadcrumb-current" aria-current="page">Section Studio</li></ol></nav>';
    const row = createElement('div', '', { class: 'ss-title-row' });
    const group = createElement('div', '', { class: 'ss-title-group' });
    group.appendChild(createElement('h1', 'Section Studio', { class: 'ss-title' }));
    group.appendChild(createElement('p', 'Create custom resume section types with a visual field builder. Custom sections can be added to any document.', { class: 'ss-description' }));
    row.appendChild(group);
    const acts = createElement('div', '', { class: 'ss-header-actions' });
    const importBtn = createElement('button', 'Import Definition', { class: 'btn btn-sm btn-outline' });
    this.al(importBtn, 'click', () => this.importDefinition());
    acts.appendChild(importBtn);
    const createBtn = createElement('button', '+ Create Section Type', { class: 'btn btn-sm btn-primary' });
    this.al(createBtn, 'click', () => this.showEditor(null));
    acts.appendChild(createBtn);
    row.appendChild(acts);
    hdr.appendChild(row);
    return hdr;
  }

  // ==================== LIST VIEW ====================

  async showList() {
    const c = this.gc(); c.innerHTML = ''; this.view = 'list'; this.editing = null;
    try { this.definitions = await this.db.getAll(STORES.CUSTOM_SECTIONS); } catch { this.definitions = []; }

    if (this.definitions.length === 0) {
      const empty = createElement('div', '', { class: 'ss-empty' });
      empty.appendChild(createElement('h2', 'No custom sections yet', { class: 'ss-empty-title' }));
      empty.appendChild(createElement('p', 'Create a custom section type to add unique sections to your resumes. Define fields, set validation, and reuse across documents.', { class: 'ss-empty-msg' }));
      const btn = createElement('button', 'Create Your First Section Type', { class: 'btn btn-primary' });
      this.al(btn, 'click', () => this.showEditor(null));
      empty.appendChild(btn);
      c.appendChild(empty);
      return;
    }

    const grid = createElement('div', '', { class: 'ss-grid' });
    [...this.definitions].sort((a, b) => new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt)).forEach(def => {
      const card = createElement('div', '', { class: 'ss-card', tabindex: '0' });

      const hdr = createElement('div', '', { class: 'ss-card-header' });
      if (def.icon) hdr.appendChild(createElement('span', def.icon, { class: 'ss-card-icon', 'aria-hidden': 'true' }));
      const name = createElement('h3', '', { class: 'ss-card-name' }); name.textContent = def.name || 'Untitled';
      hdr.appendChild(name);
      card.appendChild(hdr);

      if (def.description) { const desc = createElement('p', '', { class: 'ss-card-desc' }); desc.textContent = def.description; card.appendChild(desc); }

      const meta = createElement('div', '', { class: 'ss-card-meta' });
      meta.textContent = `${(def.fields || []).length} fields · ${def.category || 'Custom'} · ${def.entryMode === 'multiple' ? 'Multiple entries' : 'Single entry'} · ${formatTimeAgo(def.modifiedAt || def.createdAt)}`;
      card.appendChild(meta);

      const acts = createElement('div', '', { class: 'ss-card-actions' });
      const editBtn = createElement('button', 'Edit', { class: 'btn btn-sm btn-outline' });
      this.al(editBtn, 'click', e => { e.stopPropagation(); this.showEditor(def); });
      acts.appendChild(editBtn);
      const dupBtn = createElement('button', 'Duplicate', { class: 'btn btn-sm btn-ghost' });
      this.al(dupBtn, 'click', e => { e.stopPropagation(); this.duplicateDef(def); });
      acts.appendChild(dupBtn);
      const expBtn = createElement('button', 'Export', { class: 'btn btn-sm btn-ghost' });
      this.al(expBtn, 'click', e => { e.stopPropagation(); this.exportDefinition(def); });
      acts.appendChild(expBtn);
      const delBtn = createElement('button', 'Delete', { class: 'btn btn-sm btn-ghost ss-delete-btn' });
      this.al(delBtn, 'click', e => { e.stopPropagation(); this.deleteDef(def); });
      acts.appendChild(delBtn);
      card.appendChild(acts);

      this.al(card, 'click', () => this.showEditor(def));
      this.al(card, 'keydown', e => { if (e.key === 'Enter') this.showEditor(def); });
      grid.appendChild(card);
    });

    c.appendChild(grid);
  }

  // ==================== EDITOR VIEW ====================

  showEditor(def) {
    const c = this.gc(); c.innerHTML = ''; this.view = 'editor';
    const isNew = !def;
    if (isNew) {
      def = {
        id: generateUUID(), schemaVersion: 1,
        name: '', description: '', icon: '📋', category: 'Custom',
        entryMode: 'multiple', fields: [],
        atsLabel: '', printVisible: true,
        createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString()
      };
    }
    this.editing = JSON.parse(JSON.stringify(def));

    const w = createElement('div', '', { class: 'ss-editor' });

    // Top bar
    const bar = createElement('div', '', { class: 'ss-editor-topbar' });
    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-ghost' });
    backBtn.innerHTML = '&#8592; Back';
    this.al(backBtn, 'click', () => this.showList());
    bar.appendChild(backBtn);
    bar.appendChild(createElement('h2', isNew ? 'Create Section Type' : `Edit: ${def.name || 'Untitled'}`, { class: 'ss-editor-title' }));
    const saveBtn = createElement('button', 'Save', { class: 'btn btn-sm btn-primary' });
    this.al(saveBtn, 'click', () => this.saveDef());
    bar.appendChild(saveBtn);
    w.appendChild(bar);

    const cols = createElement('div', '', { class: 'ss-editor-cols' });

    // Left: Settings
    const left = createElement('div', '', { class: 'ss-editor-settings' });
    left.appendChild(createElement('h3', 'Section Settings', { class: 'ss-section-heading' }));

    left.appendChild(this.makeField('Section Name', 'ss-name', 'text', this.editing.name, v => { this.editing.name = v; }, 'e.g., Grants & Funding'));
    left.appendChild(this.makeField('Description', 'ss-desc', 'text', this.editing.description, v => { this.editing.description = v; }, 'Short description of this section'));
    left.appendChild(this.makeField('Icon (emoji)', 'ss-icon', 'text', this.editing.icon, v => { this.editing.icon = v; }, '📋'));
    left.appendChild(this.makeField('ATS Label', 'ss-ats', 'text', this.editing.atsLabel || '', v => { this.editing.atsLabel = v; }, 'Label for ATS parsing'));

    // Category select
    const catGrp = createElement('div', '', { class: 'ss-field-group' });
    catGrp.appendChild(createElement('label', 'Category', { class: 'ss-field-label', for: 'ss-cat' }));
    const catSelect = createElement('select', '', { class: 'ss-field-select', id: 'ss-cat' });
    SECTION_CATEGORIES.forEach(cat => {
      const o = createElement('option', cat, { value: cat });
      if (cat === this.editing.category) o.selected = true;
      catSelect.appendChild(o);
    });
    this.al(catSelect, 'change', e => { this.editing.category = e.target.value; });
    catGrp.appendChild(catSelect);
    left.appendChild(catGrp);

    // Entry mode
    const modeGrp = createElement('div', '', { class: 'ss-field-group' });
    modeGrp.appendChild(createElement('label', 'Entry Mode', { class: 'ss-field-label', for: 'ss-mode' }));
    const modeSelect = createElement('select', '', { class: 'ss-field-select', id: 'ss-mode' });
    [['single', 'Single Entry'], ['multiple', 'Multiple Entries']].forEach(([v, l]) => {
      const o = createElement('option', l, { value: v });
      if (v === this.editing.entryMode) o.selected = true;
      modeSelect.appendChild(o);
    });
    this.al(modeSelect, 'change', e => { this.editing.entryMode = e.target.value; });
    modeGrp.appendChild(modeSelect);
    left.appendChild(modeGrp);

    // Print visible
    const printGrp = createElement('div', '', { class: 'ss-field-group ss-checkbox-group' });
    const printCb = createElement('input', '', { type: 'checkbox', id: 'ss-print' });
    printCb.checked = this.editing.printVisible !== false;
    this.al(printCb, 'change', e => { this.editing.printVisible = e.target.checked; });
    printGrp.appendChild(printCb);
    printGrp.appendChild(createElement('label', 'Visible in print', { for: 'ss-print' }));
    left.appendChild(printGrp);

    cols.appendChild(left);

    // Right: Field builder
    const right = createElement('div', '', { class: 'ss-editor-fields' });
    right.appendChild(createElement('h3', 'Fields', { class: 'ss-section-heading' }));

    const fieldList = createElement('div', '', { class: 'ss-field-list', id: 'ss-field-list' });
    right.appendChild(fieldList);
    this.renderFields();

    const addBtn = createElement('button', '+ Add Field', { class: 'btn btn-sm btn-outline ss-add-field-btn' });
    this.al(addBtn, 'click', () => { this.addField(); this.renderFields(); });
    right.appendChild(addBtn);

    cols.appendChild(right);
    w.appendChild(cols);

    // Preview
    const previewSection = createElement('div', '', { class: 'ss-preview-section' });
    previewSection.appendChild(createElement('h3', 'Preview', { class: 'ss-section-heading' }));
    const preview = createElement('div', '', { class: 'ss-preview', id: 'ss-preview' });
    previewSection.appendChild(preview);
    w.appendChild(previewSection);
    this.renderPreview();

    c.appendChild(w);
  }

  addField() {
    this.editing.fields.push({
      id: generateUUID(), label: 'New Field', fieldType: 'shortText',
      placeholder: '', helpText: '', required: false,
      maxLength: 200, defaultValue: '', atsLabel: '',
      printVisible: true, displayOrder: this.editing.fields.length, hidden: false,
      options: []
    });
  }

  renderFields() {
    const list = this.container?.querySelector('#ss-field-list');
    if (!list) return;
    list.innerHTML = '';

    if (this.editing.fields.length === 0) {
      list.appendChild(createElement('p', 'No fields yet. Add fields to define the structure of this section.', { class: 'ss-empty-fields' }));
      return;
    }

    this.editing.fields.forEach((field, idx) => {
      const card = createElement('div', '', { class: 'ss-field-card' });

      const topRow = createElement('div', '', { class: 'ss-field-top' });
      const handle = createElement('span', '⠿', { class: 'ss-field-handle', 'aria-hidden': 'true' });
      topRow.appendChild(handle);

      const labelInput = createElement('input', '', { class: 'ss-field-input ss-field-label-input', type: 'text', value: field.label, placeholder: 'Field label', 'aria-label': 'Field label' });
      this.al(labelInput, 'input', e => { field.label = e.target.value; this.renderPreview(); });
      topRow.appendChild(labelInput);

      const typeSelect = createElement('select', '', { class: 'ss-field-select ss-field-type-select', 'aria-label': 'Field type' });
      FIELD_TYPES.forEach(ft => {
        const o = createElement('option', `${ft.icon} ${ft.label}`, { value: ft.value });
        if (ft.value === field.fieldType) o.selected = true;
        typeSelect.appendChild(o);
      });
      this.al(typeSelect, 'change', e => { field.fieldType = e.target.value; this.renderPreview(); });
      topRow.appendChild(typeSelect);

      const moveUpBtn = createElement('button', '↑', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Move up', disabled: idx === 0 ? 'true' : undefined });
      this.al(moveUpBtn, 'click', () => { this.swapFields(idx, idx - 1); this.renderFields(); });
      topRow.appendChild(moveUpBtn);

      const moveDownBtn = createElement('button', '↓', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Move down', disabled: idx === this.editing.fields.length - 1 ? 'true' : undefined });
      this.al(moveDownBtn, 'click', () => { this.swapFields(idx, idx + 1); this.renderFields(); });
      topRow.appendChild(moveDownBtn);

      const removeBtn = createElement('button', '✕', { class: 'btn btn-sm btn-ghost ss-remove-field', 'aria-label': 'Remove field' });
      this.al(removeBtn, 'click', () => { this.editing.fields.splice(idx, 1); this.renderFields(); this.renderPreview(); });
      topRow.appendChild(removeBtn);
      card.appendChild(topRow);

      // Settings row
      const settingsRow = createElement('div', '', { class: 'ss-field-settings' });

      const placeholderInput = createElement('input', '', { class: 'ss-field-input', type: 'text', value: field.placeholder || '', placeholder: 'Placeholder text', 'aria-label': 'Placeholder' });
      this.al(placeholderInput, 'input', e => { field.placeholder = e.target.value; });
      settingsRow.appendChild(placeholderInput);

      const reqCb = createElement('input', '', { type: 'checkbox', id: `ss-req-${field.id}`, 'aria-label': 'Required' });
      reqCb.checked = field.required;
      this.al(reqCb, 'change', e => { field.required = e.target.checked; });
      const reqLabel = createElement('label', 'Required', { for: `ss-req-${field.id}`, class: 'ss-checkbox-label' });
      settingsRow.appendChild(reqCb);
      settingsRow.appendChild(reqLabel);

      card.appendChild(settingsRow);

      // Options for select/multiSelect
      if (field.fieldType === 'select' || field.fieldType === 'multiSelect') {
        const optRow = createElement('div', '', { class: 'ss-field-options' });
        optRow.appendChild(createElement('label', 'Options (comma-separated)', { class: 'ss-field-label' }));
        const optInput = createElement('input', '', { class: 'ss-field-input', type: 'text', value: (field.options || []).join(', '), placeholder: 'Option 1, Option 2, Option 3' });
        this.al(optInput, 'input', e => { field.options = e.target.value.split(',').map(o => o.trim()).filter(Boolean); });
        optRow.appendChild(optInput);
        card.appendChild(optRow);
      }

      list.appendChild(card);
    });
  }

  swapFields(i, j) {
    if (j < 0 || j >= this.editing.fields.length) return;
    const temp = this.editing.fields[i];
    this.editing.fields[i] = this.editing.fields[j];
    this.editing.fields[j] = temp;
  }

  renderPreview() {
    const preview = this.container?.querySelector('#ss-preview');
    if (!preview || !this.editing) return;
    preview.innerHTML = '';

    const section = createElement('div', '', { class: 'ss-preview-section-mock' });
    const title = createElement('h3', '', { class: 'ss-preview-section-title' });
    title.textContent = `${this.editing.icon || ''} ${this.editing.name || 'Section Name'}`;
    section.appendChild(title);

    if (this.editing.fields.length === 0) {
      section.appendChild(createElement('p', 'Add fields to see a preview', { class: 'ss-preview-empty' }));
    } else {
      const form = createElement('div', '', { class: 'ss-preview-form' });
      this.editing.fields.forEach(field => {
        const grp = createElement('div', '', { class: 'ss-preview-field' });
        const lbl = createElement('label', '', { class: 'ss-preview-label' });
        lbl.textContent = `${field.label || 'Field'}${field.required ? ' *' : ''}`;
        grp.appendChild(lbl);

        let input;
        switch (field.fieldType) {
          case 'longText':
          case 'richText':
            input = createElement('textarea', '', { class: 'ss-preview-input', rows: '3', placeholder: field.placeholder || '' });
            break;
          case 'checkbox':
            input = createElement('input', '', { type: 'checkbox', class: 'ss-preview-checkbox' });
            break;
          case 'select':
            input = createElement('select', '', { class: 'ss-preview-input' });
            input.appendChild(createElement('option', field.placeholder || 'Select...', { value: '' }));
            (field.options || []).forEach(opt => input.appendChild(createElement('option', opt, { value: opt })));
            break;
          default:
            input = createElement('input', '', { class: 'ss-preview-input', type: field.fieldType === 'email' ? 'email' : field.fieldType === 'url' ? 'url' : field.fieldType === 'number' ? 'number' : 'text', placeholder: field.placeholder || '' });
        }
        grp.appendChild(input);
        if (field.helpText) grp.appendChild(createElement('span', field.helpText, { class: 'ss-preview-help' }));
        form.appendChild(grp);
      });
      section.appendChild(form);
    }

    preview.appendChild(section);
  }

  // ==================== CRUD ====================

  async saveDef() {
    if (!this.editing) return;
    const def = this.editing;
    def.name = sanitizeInput(def.name, 100) || 'Untitled Section';
    def.description = sanitizeInput(def.description || '', 500);
    def.icon = (def.icon || '').substring(0, 4);
    def.modifiedAt = new Date().toISOString();

    for (const field of def.fields) {
      field.label = sanitizeInput(field.label, 100) || 'Field';
      field.placeholder = sanitizeInput(field.placeholder || '', 200);
      field.helpText = sanitizeInput(field.helpText || '', 200);
    }

    try {
      await this.db.put(STORES.CUSTOM_SECTIONS, def);
      this.toast(`Saved "${def.name}"`, 'success');
      await this.showList();
    } catch (e) {
      this.toast('Failed to save', 'error');
    }
  }

  async duplicateDef(def) {
    const copy = JSON.parse(JSON.stringify(def));
    copy.id = generateUUID();
    copy.name = `${def.name} (Copy)`;
    copy.createdAt = new Date().toISOString();
    copy.modifiedAt = copy.createdAt;
    try {
      await this.db.put(STORES.CUSTOM_SECTIONS, copy);
      this.toast(`Duplicated "${def.name}"`, 'success');
      await this.showList();
    } catch (e) {
      this.toast('Failed to duplicate', 'error');
    }
  }

  async deleteDef(def) {
    if (!confirm(`Delete "${def.name}"? This cannot be undone.`)) return;
    try {
      await this.db.delete(STORES.CUSTOM_SECTIONS, def.id);
      this.toast('Deleted', 'info');
      await this.showList();
    } catch (e) {
      this.toast('Failed to delete', 'error');
    }
  }

  exportDefinition(def) {
    const data = { app: 'CareerCanvas', type: 'section-definition', schemaVersion: 1, definition: { ...def } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `section-${(def.name || 'custom').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click(); URL.revokeObjectURL(url);
    this.toast('Exported', 'success');
  }

  importDefinition() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file || file.size > 100 * 1024) { this.toast('File too large', 'error'); return; }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.definition || data.type !== 'section-definition') throw new Error('Invalid file');
        const def = data.definition;
        if (!def.name || !def.fields) throw new Error('Missing required fields');
        // Security: validate no executable content
        for (const field of def.fields) {
          if (typeof field.label !== 'string') throw new Error('Invalid field');
          if (field.label.includes('<script') || field.label.includes('javascript:')) throw new Error('Unsafe content');
        }
        def.id = generateUUID();
        def.createdAt = new Date().toISOString();
        def.modifiedAt = def.createdAt;
        await this.db.put(STORES.CUSTOM_SECTIONS, def);
        this.toast(`Imported "${def.name}"`, 'success');
        await this.showList();
      } catch (e) {
        this.toast(`Import failed: ${e.message}`, 'error');
      }
    });
    input.click();
  }

  // ==================== HELPERS ====================

  makeField(label, id, type, value, onChange, placeholder) {
    const grp = createElement('div', '', { class: 'ss-field-group' });
    grp.appendChild(createElement('label', label, { class: 'ss-field-label', for: id }));
    const input = createElement('input', '', { class: 'ss-field-input', type, id, maxlength: '200', placeholder: placeholder || '' });
    input.value = value || '';
    this.al(input, 'input', e => onChange(e.target.value));
    grp.appendChild(input);
    return grp;
  }

  toast(msg, type) { if (window.CC?.toast) window.CC.toast.show(msg, type); }
  gc() { return this.container?.querySelector('#ss-content') || this.container; }
  al(el, event, handler) { el.addEventListener(event, handler); this.listeners.push({ element: el, event, handler }); }
  hasUnsavedChanges() { return this.view === 'editor'; }

  destroy() {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}


