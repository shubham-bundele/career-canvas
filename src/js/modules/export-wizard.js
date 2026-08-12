/**
 * Export Wizard — Unified layout + live preview workspace.
 * Left panel: controls + AI suggestions. Right panel: live preview.
 * All changes reflect instantly in preview. No tab switching needed.
 */

import { createElement, encodeHTML } from '../utils/sanitize.js';

export class ExportWizard {
  constructor() {
    this.overlay = null;
    this.listeners = [];
    this.suggestions = [];
    this.dismissed = new Set();
    this.doc = null;
    this.originalHTML = '';
    this.onExport = null;
    this.previewEl = null;
    this.zoom = 80;
    this.exportFormat = 'pdf';
  }

  async show(html, doc, options = {}) {
    this.doc = doc;
    this.originalHTML = html;
    this.pageSize = options.pageSize || doc?.design?.pageSize || 'A4';
    this.templateEngine = options.templateEngine;

    this.settings = {
      topMargin: 32, bottomMargin: 32, sideMargin: 40,
      sectionSpacing: parseInt(doc?.design?.sectionSpacing) || 14,
      paragraphSpacing: parseInt(doc?.design?.paragraphSpacing) || 8,
      fontSize: parseInt(doc?.design?.fontSize) || 11,
      lineHeight: parseFloat(doc?.design?.lineHeight) || 1.4
    };

    this.suggestions = this._analyze(doc);

    return new Promise(resolve => {
      this.onExport = resolve;
      this._build();
    });
  }

  // ==================== BUILD UI ====================

  _build() {
    this.overlay = createElement('div', '', { class: 'ew-overlay' });

    const shell = createElement('div', '', { class: 'ew-shell' });

    // ---- HEADER ----
    const header = createElement('div', '', { class: 'ew-header' });
    header.innerHTML = '<div class="ew-header-left"><h2 class="ew-title">✨ Export Wizard</h2></div>';
    const closeBtn = createElement('button', '×', { class: 'ew-close' });
    this._on(closeBtn, 'click', () => this._done(null));
    header.appendChild(closeBtn);
    shell.appendChild(header);

    // ---- WORKSPACE (left + right) ----
    const workspace = createElement('div', '', { class: 'ew-workspace' });

    // LEFT PANEL — controls + suggestions
    const left = createElement('div', '', { class: 'ew-left' });
    left.id = 'ew-left';
    this._buildLeftPanel(left);
    workspace.appendChild(left);

    // RIGHT PANEL — live preview
    const right = createElement('div', '', { class: 'ew-right' });

    // Preview toolbar
    const prevBar = createElement('div', '', { class: 'ew-prev-bar' });
    prevBar.innerHTML = `<span class="ew-prev-label">${this.pageSize} Preview</span>`;

    const zoomGrp = createElement('div', '', { class: 'ew-zoom' });
    const zoomOut = createElement('button', '−', { class: 'ew-zoom-btn' });
    const zoomLbl = createElement('span', this.zoom + '%', { class: 'ew-zoom-lbl' });
    const zoomIn = createElement('button', '+', { class: 'ew-zoom-btn' });
    this._on(zoomOut, 'click', () => { this.zoom = Math.max(40, this.zoom - 10); zoomLbl.textContent = this.zoom + '%'; this._applyZoom(); });
    this._on(zoomIn, 'click', () => { this.zoom = Math.min(150, this.zoom + 10); zoomLbl.textContent = this.zoom + '%'; this._applyZoom(); });
    zoomGrp.appendChild(zoomOut);
    zoomGrp.appendChild(zoomLbl);
    zoomGrp.appendChild(zoomIn);
    prevBar.appendChild(zoomGrp);
    right.appendChild(prevBar);

    // Preview scroll area
    const scroll = createElement('div', '', { class: 'ew-prev-scroll' });
    this.previewEl = createElement('div', '', { class: 'ew-prev-page' });
    scroll.appendChild(this.previewEl);
    right.appendChild(scroll);

    workspace.appendChild(right);
    shell.appendChild(workspace);

    // ---- FOOTER ----
    const footer = createElement('div', '', { class: 'ew-footer' });
    const cancelBtn = createElement('button', 'Back to Editor', { class: 'btn btn-ghost' });
    this._on(cancelBtn, 'click', () => this._done(null));
    footer.appendChild(cancelBtn);

    const exportBtn = createElement('button', `✨ Export as ${(this.exportFormat || 'PDF').toUpperCase()}`, { class: 'btn btn-primary ew-export-btn' });
    exportBtn.id = 'ew-export-btn';
    this._on(exportBtn, 'click', () => this._done({ html: this._html(), format: this.exportFormat, settings: { ...this.settings }, pageSize: this.pageSize }));
    footer.appendChild(exportBtn);
    shell.appendChild(footer);

    this.overlay.appendChild(shell);
    document.body.appendChild(this.overlay);

    this._on(document, 'keydown', e => { if (e.key === 'Escape') this._done(null); });

    // Initial preview render
    this._refreshPreview();
  }

  // ==================== LEFT PANEL ====================

  _buildLeftPanel(left) {
    left.innerHTML = '';

    // ---- EXPORT FORMAT ----
    const fmtSec = this._section('Export Format');
    const fmtRow = createElement('div', '', { class: 'ew-preset-row' });
    const formats = [
      { id: 'pdf', label: '📄 PDF', desc: 'Print to PDF' },
      { id: 'html', label: '🌐 HTML', desc: 'Web page' },
      { id: 'txt', label: '📝 Text', desc: 'Plain text' },
      { id: 'md', label: '📋 Markdown', desc: 'Markdown' },
      { id: 'json', label: '💾 JSON', desc: 'Data file' }
    ];
    formats.forEach(f => {
      const btn = createElement('button', f.label, { class: `ew-preset-btn ${this.exportFormat === f.id ? 'ew-preset-btn--active' : ''}` });
      btn.title = f.desc;
      this._on(btn, 'click', () => {
        this.exportFormat = f.id;
        const expBtn = document.getElementById('ew-export-btn');
        if (expBtn) expBtn.textContent = `✨ Export as ${f.id.toUpperCase()}`;
        this._buildLeftPanel(left);
        this._refreshPreview();
      });
      fmtRow.appendChild(btn);
    });
    fmtSec.appendChild(fmtRow);
    left.appendChild(fmtSec);

    // ---- PAGE SIZE ----
    const pageSec = this._section('Page Size');
    const pageRow = createElement('div', '', { class: 'ew-preset-row' });
    [['A4', '📐 A4'], ['Letter', '📃 Letter']].forEach(([v, l]) => {
      const btn = createElement('button', l, { class: `ew-preset-btn ${this.pageSize === v ? 'ew-preset-btn--active' : ''}` });
      this._on(btn, 'click', () => { this.pageSize = v; this._buildLeftPanel(left); this._refreshPreview(); });
      pageRow.appendChild(btn);
    });
    pageSec.appendChild(pageRow);
    left.appendChild(pageSec);

    // ---- PRESETS ----
    const presetSec = this._section('Quick Presets');
    const presetRow = createElement('div', '', { class: 'ew-preset-row' });
    const presets = [
      { label: '📐 Compact', v: { topMargin: 18, bottomMargin: 18, sideMargin: 24, sectionSpacing: 6, paragraphSpacing: 3, fontSize: 9.5, lineHeight: 1.2 } },
      { label: '📄 Standard', v: { topMargin: 32, bottomMargin: 32, sideMargin: 40, sectionSpacing: 14, paragraphSpacing: 8, fontSize: 11, lineHeight: 1.4 } },
      { label: '📖 Spacious', v: { topMargin: 44, bottomMargin: 44, sideMargin: 52, sectionSpacing: 22, paragraphSpacing: 14, fontSize: 12, lineHeight: 1.65 } }
    ];
    presets.forEach(p => {
      const btn = createElement('button', p.label, { class: 'ew-preset-btn' });
      this._on(btn, 'click', () => {
        Object.assign(this.settings, p.v);
        this._buildLeftPanel(left);
        this._refreshPreview();
      });
      presetRow.appendChild(btn);
    });
    presetSec.appendChild(presetRow);
    left.appendChild(presetSec);

    // ---- LAYOUT CONTROLS ----
    const layoutSec = this._section('Layout Controls');
    const grid = createElement('div', '', { class: 'ew-ctrl-grid' });
    const ctrls = [
      { k: 'topMargin', l: 'Top Margin', u: 'px', min: 8, max: 60, s: 2 },
      { k: 'bottomMargin', l: 'Bottom Margin', u: 'px', min: 8, max: 60, s: 2 },
      { k: 'sideMargin', l: 'Side Margins', u: 'px', min: 12, max: 70, s: 2 },
      { k: 'sectionSpacing', l: 'Section Gap', u: 'px', min: 0, max: 30, s: 1 },
      { k: 'paragraphSpacing', l: 'Entry Gap', u: 'px', min: 0, max: 20, s: 1 },
      { k: 'fontSize', l: 'Font Size', u: 'px', min: 8, max: 14, s: 0.5 },
      { k: 'lineHeight', l: 'Line Height', u: '×', min: 1.0, max: 2.0, s: 0.05 }
    ];
    ctrls.forEach(c => grid.appendChild(this._slider(c)));
    layoutSec.appendChild(grid);
    left.appendChild(layoutSec);

    // ---- ACCENT COLOR ----
    const colorSec = this._section('Accent Color');
    const colorRow = createElement('div', '', { class: 'ew-ctrl' });
    const colorInputRow = createElement('div', '', { class: 'ew-ctrl-row' });
    colorInputRow.appendChild(createElement('span', 'Color', { class: 'ew-ctrl-label' }));
    const colorInput = createElement('input', '', { type: 'color', class: 'ew-color-input' });
    colorInput.value = this.doc?.design?.accentColor || '#1a56db';
    this._on(colorInput, 'input', e => {
      if (this.doc?.design) this.doc.design.accentColor = e.target.value;
      this._refreshPreview();
    });
    colorInputRow.appendChild(colorInput);
    colorRow.appendChild(colorInputRow);
    colorSec.appendChild(colorRow);
    left.appendChild(colorSec);

    // ---- SECTION VISIBILITY ----
    if (this.doc?.sections?.length > 0) {
      const visSec = this._section('Section Visibility');
      const visList = createElement('div', '', { class: 'ew-vis-list' });
      this.doc.sections.forEach(sec => {
        const row = createElement('label', '', { class: 'ew-vis-row' });
        const cb = createElement('input', '', { type: 'checkbox' });
        cb.checked = sec.visible !== false;
        cb.style.cssText = 'width:14px;height:14px;accent-color:var(--color-primary);cursor:pointer;';
        this._on(cb, 'change', () => {
          sec.visible = cb.checked;
          this._refreshPreview();
        });
        row.appendChild(cb);
        const label = createElement('span', sec.title || sec.sectionType || 'Section', {});
        label.style.cssText = 'font-size:11px;color:var(--text-primary);cursor:pointer;';
        row.appendChild(label);
        visList.appendChild(row);
      });
      visSec.appendChild(visList);
      left.appendChild(visSec);
    }

    // ---- PAGE ESTIMATE ----
    const estSec = this._section('Document Info');
    const estInfo = createElement('div', '', { class: 'ew-info-grid' });
    let totalChars = 0;
    const visibleSecs = (this.doc?.sections || []).filter(s => s.visible !== false);
    visibleSecs.forEach(sec => {
      if (sec.content) totalChars += sec.content.length;
      (sec.items || []).forEach(it => {
        if (it.included === false) return;
        Object.values(it).forEach(v => { if (typeof v === 'string') totalChars += v.length; });
        (it.achievements || []).forEach(a => { if (a?.text) totalChars += a.text.length; });
      });
    });
    const estPages = Math.max(1, Math.ceil(totalChars / 2800));
    estInfo.innerHTML = `
      <div class="ew-info-item"><span class="ew-info-label">Sections</span><span class="ew-info-val">${visibleSecs.length}</span></div>
      <div class="ew-info-item"><span class="ew-info-label">Est. Pages</span><span class="ew-info-val">${estPages}</span></div>
      <div class="ew-info-item"><span class="ew-info-label">Page Size</span><span class="ew-info-val">${this.pageSize}</span></div>
      <div class="ew-info-item"><span class="ew-info-label">Format</span><span class="ew-info-val">${(this.exportFormat || 'pdf').toUpperCase()}</span></div>
    `;
    estSec.appendChild(estInfo);
    left.appendChild(estSec);

    // ---- AI SUGGESTIONS ----
    const active = this.suggestions.filter(s => !this.dismissed.has(s.id));
    if (active.length > 0) {
      const sugSec = this._section(`Suggestions (${active.length})`);
      active.forEach(sug => sugSec.appendChild(this._suggestionCard(sug, left)));
      left.appendChild(sugSec);
    }
  }

  _section(title) {
    const sec = createElement('div', '', { class: 'ew-sec' });
    sec.appendChild(createElement('h3', title, { class: 'ew-sec-title' }));
    return sec;
  }

  _slider(c) {
    const wrap = createElement('div', '', { class: 'ew-ctrl' });
    const row = createElement('div', '', { class: 'ew-ctrl-row' });
    row.appendChild(createElement('span', c.l, { class: 'ew-ctrl-label' }));
    const val = createElement('span', `${this.settings[c.k]}${c.u}`, { class: 'ew-ctrl-val' });
    row.appendChild(val);
    wrap.appendChild(row);

    const input = createElement('input', '', { type: 'range', class: 'ew-slider', min: String(c.min), max: String(c.max), step: String(c.s), value: String(this.settings[c.k]) });
    this._on(input, 'input', e => {
      const v = parseFloat(e.target.value);
      this.settings[c.k] = v;
      val.textContent = `${v}${c.u}`;
      this._refreshPreview();
    });
    wrap.appendChild(input);
    return wrap;
  }

  _suggestionCard(sug, leftPanel) {
    const card = createElement('div', '', { class: `ew-sug ew-sug--${sug.type}` });
    const icon = sug.type === 'error' ? '❌' : sug.type === 'warning' ? '⚠️' : '💡';

    const top = createElement('div', '', { class: 'ew-sug-top' });
    top.innerHTML = `<span class="ew-sug-icon">${icon}</span><strong>${encodeHTML(sug.title)}</strong>`;
    card.appendChild(top);

    card.appendChild(createElement('p', sug.desc, { class: 'ew-sug-desc' }));

    const acts = createElement('div', '', { class: 'ew-sug-acts' });
    if (sug.fix) {
      const fixBtn = createElement('button', sug.fix.label, { class: 'ew-sug-fix' });
      this._on(fixBtn, 'click', () => {
        sug.fix.action();
        this.dismissed.add(sug.id);
        this._buildLeftPanel(leftPanel);
        this._refreshPreview();
        if (window.CC?.toast) window.CC.toast.show(`Fixed: ${sug.title}`, 'success');
      });
      acts.appendChild(fixBtn);
    }
    const dismiss = createElement('button', 'Dismiss', { class: 'ew-sug-dismiss' });
    this._on(dismiss, 'click', () => { this.dismissed.add(sug.id); this._buildLeftPanel(leftPanel); });
    acts.appendChild(dismiss);
    card.appendChild(acts);

    return card;
  }

  // ==================== PREVIEW ====================

  _refreshPreview() {
    if (!this.previewEl) return;
    this.previewEl.innerHTML = this._html();
    this._applyZoom();
  }

  _applyZoom() {
    if (!this.previewEl) return;
    this.previewEl.style.transform = `scale(${this.zoom / 100})`;
    this.previewEl.style.transformOrigin = 'top center';
  }

  _html() {
    let html = this.originalHTML;
    if (this.templateEngine && this.doc) {
      try { html = this.templateEngine.render(this.doc.design?.template || this.doc.templateId || 'ats-essential', this.doc, this.doc.design); } catch (e) {}
    }
    const s = this.settings;
    return `<style>
      .resume-template,[data-template]{padding:${s.topMargin}px ${s.sideMargin}px ${s.bottomMargin}px!important;font-size:${s.fontSize}px!important;line-height:${s.lineHeight}!important}
      .resume-section,[class*="resume-section"]{margin-bottom:${s.sectionSpacing}px!important;break-inside:avoid-page;page-break-inside:avoid}
      .resume-entry,[class*="resume-entry"]{margin-bottom:${s.paragraphSpacing}px!important;break-inside:avoid-page;page-break-inside:avoid}
      .resume-summary{margin-bottom:${s.paragraphSpacing}px!important}
      h2,h3,.resume-section-title{break-after:avoid-page;page-break-after:avoid}
      table,ul,ol{break-inside:avoid-page;page-break-inside:avoid}
      .resume-header{break-inside:avoid-page}
      .resume-bullets{break-inside:avoid-page}
      .resume-bullets li{margin-bottom:${Math.max(1,s.paragraphSpacing-4)}px!important}
      p,li{orphans:3;widows:3}
    </style>` + html;
  }

  // ==================== ANALYSIS ====================

  _analyze(doc) {
    const s = [];
    if (!doc) return s;
    const pi = doc.personalInfo || {};
    const secs = (doc.sections || []).filter(x => x && x.visible !== false);

    // Duplicate content
    const seen = [];
    for (const sec of secs) {
      if (sec.content && sec.content.trim().length > 80) {
        const fp = sec.content.trim().substring(0, 100);
        if (seen.includes(fp)) s.push({ id: 'dup-' + sec.id, type: 'error', title: 'Duplicate Content', desc: `"${sec.title}" has duplicated text.`, fix: { label: 'Remove', action: () => { sec.content = ''; } } });
        seen.push(fp);
      }
    }

    // Long summary
    for (const sec of secs) {
      const t = sec.sectionType || sec.type || '';
      if (['summary', 'professionalSummary', 'objective'].includes(t) && sec.content) {
        const w = sec.content.trim().split(/\s+/).length;
        if (w > 80) s.push({ id: 'sum', type: 'warning', title: `Summary: ${w} Words`, desc: 'Aim for 40-60 words for best impact.', fix: { label: 'Trim to 60', action: () => { sec.content = sec.content.trim().split(/\s+/).slice(0, 60).join(' ') + '...'; } } });
      }
    }

    // Empty sections
    for (const sec of secs) {
      const has = sec.content?.trim() || (Array.isArray(sec.items) && sec.items.some(i => i.included !== false));
      if (!has) s.push({ id: 'empty-' + sec.id, type: 'warning', title: `Empty: "${sec.title}"`, desc: 'Wastes space. Hide it or add content.', fix: { label: 'Hide', action: () => { sec.visible = false; } } });
    }

    // Missing critical contact
    if (!pi.email?.trim()) s.push({ id: 'email', type: 'error', title: 'No Email', desc: 'Add email in Personal Info.' });
    if (!pi.fullName?.trim()) s.push({ id: 'name', type: 'error', title: 'No Name', desc: 'Add your name in Personal Info.' });

    // Page estimate
    let chars = 0;
    for (const sec of secs) {
      if (sec.content) chars += sec.content.length;
      if (Array.isArray(sec.items)) for (const it of sec.items) {
        if (!it || it.included === false) continue;
        for (const f of [it.text, it.description, it.skills, it.name, it.summary, it.roleSummary, it.jobTitle, it.company]) if (f) chars += String(f).length;
        if (Array.isArray(it.achievements)) for (const a of it.achievements) if (a?.text) chars += a.text.length;
      }
    }
    const pg = Math.ceil(chars / 2800);
    if (doc.type === 'resume' && pg > 2) s.push({ id: 'pages', type: 'info', title: `~${pg} Pages`, desc: 'Try Compact preset or reduce content for 1-2 pages.' });

    // Tips
    if (!pi.linkedinUrl?.trim()) s.push({ id: 'li', type: 'info', title: 'Add LinkedIn', desc: '87% of recruiters check LinkedIn profiles.' });

    return s;
  }

  // ==================== LIFECYCLE ====================

  _on(el, ev, fn) { el.addEventListener(ev, fn); this.listeners.push({ element: el, event: ev, handler: fn }); }

  _done(result) {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.overlay?.parentNode) this.overlay.remove();
    if (this.onExport) this.onExport(result);
  }

  destroy() { this._done(null); }
}

export default ExportWizard;
