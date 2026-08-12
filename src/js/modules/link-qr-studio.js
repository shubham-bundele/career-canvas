/**
 * Link & QR Studio Module
 * Manage portfolio/social links and generate QR codes for resumes
 */

import { createElement, sanitizeURL } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';

const STORAGE_KEY = 'cc_links';

const LINK_TYPES = [
  'Portfolio',
  'LinkedIn',
  'GitHub',
  'Website',
  'Project Demo',
  'Credential'
];

const QR_SIZES = {
  small: { label: 'Small', px: 150 },
  medium: { label: 'Medium', px: 250 },
  large: { label: 'Large', px: 400 }
};

/**
 * ============================================================
 * QR Code Generator (Placeholder / Visual Approximation)
 *
 * NOTE FOR PRODUCTION USE: This generates a QR-code-looking
 * graphic that includes the three standard finder patterns,
 * timing patterns, and a deterministic data region based on a
 * hash of the input string. It is NOT a scannable QR code.
 * For scannable output, integrate a proper QR encoding library
 * such as qrcode.js, qr-creator, or similar.
 * ============================================================
 */

/**
 * Simple string hash (djb2 variant) returning a 32-bit unsigned int.
 */
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic PRNG seeded from a hash.  Produces repeatable
 * sequences so the same URL always yields the same pattern.
 */
function seededRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 0x100000000;
  };
}

/**
 * Draws the 7x7 finder pattern at (row, col) in the grid.
 */
function placeFinderPattern(grid, row, col) {
  const size = grid.length;
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const gr = row + r;
      const gc = col + c;
      if (gr < 0 || gc < 0 || gr >= size || gc >= size) continue;

      if (r === -1 || r === 7 || c === -1 || c === 7) {
        // separator (white)
        grid[gr][gc] = 0;
      } else if (r === 0 || r === 6 || c === 0 || c === 6) {
        // outer ring (dark)
        grid[gr][gc] = 1;
      } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
        // inner square (dark)
        grid[gr][gc] = 1;
      } else {
        // gap between outer ring and inner square (white)
        grid[gr][gc] = 0;
      }
    }
  }
}

/**
 * Draws horizontal and vertical timing patterns.
 */
function placeTimingPatterns(grid) {
  const size = grid.length;
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    if (grid[6][i] === -1) grid[6][i] = val;   // horizontal
    if (grid[i][6] === -1) grid[i][6] = val;   // vertical
  }
}

/**
 * Builds a visual QR-like grid for the given text.
 * Uses 21x21 (QR Version 1 size).
 */
function buildQrGrid(text) {
  const gridSize = 21;
  // -1 = unfilled, 0 = white, 1 = dark
  const grid = Array.from({ length: gridSize }, () => new Array(gridSize).fill(-1));

  // Finder patterns: top-left, top-right, bottom-left
  placeFinderPattern(grid, 0, 0);
  placeFinderPattern(grid, 0, gridSize - 7);
  placeFinderPattern(grid, gridSize - 7, 0);

  // Timing patterns
  placeTimingPatterns(grid);

  // Dark module (always set in real QR)
  grid[gridSize - 8][8] = 1;

  // Fill remaining cells with deterministic pseudo-random data
  const seed = hashString(text || '');
  const rand = seededRandom(seed);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === -1) {
        grid[r][c] = rand() < 0.5 ? 1 : 0;
      }
    }
  }

  return grid;
}

/**
 * Renders the QR grid onto a canvas element at the given pixel size.
 * Returns the canvas element.
 */
function renderQrCanvas(grid, sizePx) {
  const canvas = document.createElement('canvas');
  const modules = grid.length;
  const quietZone = 4; // modules of white border
  const totalModules = modules + quietZone * 2;
  const scale = Math.max(1, Math.floor(sizePx / totalModules));

  canvas.width = totalModules * scale;
  canvas.height = totalModules * scale;
  canvas.style.imageRendering = 'pixelated';

  const ctx = canvas.getContext('2d');
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw modules
  ctx.fillStyle = '#000000';
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (grid[r][c] === 1) {
        ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale);
      }
    }
  }

  return canvas;
}


// ============================================================
// LinkQrStudio class
// ============================================================

export class LinkQrStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];

    this.links = [];
    this.editingId = null;
    this.qrPreviewLinkId = null;
    this.qrSize = 'medium';
  }

  // ==================== LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'lqr-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Link & QR Studio');

    this.container.appendChild(this.renderHeader());

    const content = createElement('div', '', { class: 'lqr-content', id: 'lqr-content' });
    this.container.appendChild(content);

    this.loadLinks();
    this.renderContent();

    return this.container;
  }

  destroy() {
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  gc() {
    return this.container?.querySelector('#lqr-content') || this.container;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  // ==================== PERSISTENCE ====================

  loadLinks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.links = raw ? JSON.parse(raw) : [];
    } catch {
      this.links = [];
    }
  }

  saveLinks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.links));
    } catch {
      if (window.CC?.toast) window.CC.toast.show('Failed to save links', 'error');
    }
  }

  // ==================== HEADER ====================

  renderHeader() {
    const header = createElement('div', '', { class: 'lqr-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'lqr-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });
    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);
    const sep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(sep);
    const cur = createElement('li', 'Link & QR Studio', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(cur);
    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const row = createElement('div', '', { class: 'lqr-title-row' });
    const group = createElement('div', '', { class: 'lqr-title-group' });
    group.appendChild(createElement('h1', 'Link & QR Studio', { class: 'lqr-title' }));
    group.appendChild(createElement('p', 'Manage your portfolio and professional links. Generate QR codes for easy sharing on printed resumes, business cards, and cover letters.', { class: 'lqr-description' }));
    row.appendChild(group);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline lqr-back-btn' });
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

  // ==================== MAIN CONTENT ====================

  renderContent() {
    const c = this.gc();
    c.innerHTML = '';

    const layout = createElement('div', '', { class: 'lqr-layout' });

    // Left column: link list + add form
    const leftCol = createElement('div', '', { class: 'lqr-left-col' });
    leftCol.appendChild(this.renderLinkForm());
    leftCol.appendChild(this.renderLinkList());
    layout.appendChild(leftCol);

    // Right column: QR preview
    layout.appendChild(this.renderQrPanel());

    c.appendChild(layout);
  }

  // ==================== LINK FORM ====================

  renderLinkForm() {
    const editing = this.editingId ? this.links.find(l => l.id === this.editingId) : null;

    const card = createElement('div', '', { class: 'lqr-form-card' });
    const formTitle = createElement('h2', editing ? 'Edit Link' : 'Add Link', { class: 'lqr-section-title' });
    card.appendChild(formTitle);

    const form = createElement('form', '', { class: 'lqr-form' });
    form.setAttribute('novalidate', '');

    // Type selector
    const typeGroup = createElement('div', '', { class: 'lqr-form-group' });
    const typeLabel = createElement('label', 'Link Type', { class: 'lqr-label', for: 'lqr-type' });
    typeGroup.appendChild(typeLabel);
    const typeSelect = createElement('select', '', { class: 'lqr-select', id: 'lqr-type' });
    LINK_TYPES.forEach(t => {
      const opt = createElement('option', t);
      opt.value = t;
      if (editing && editing.type === t) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeGroup.appendChild(typeSelect);
    form.appendChild(typeGroup);

    // URL input
    const urlGroup = createElement('div', '', { class: 'lqr-form-group' });
    const urlLabel = createElement('label', 'URL', { class: 'lqr-label', for: 'lqr-url' });
    urlGroup.appendChild(urlLabel);
    const urlWrapper = createElement('div', '', { class: 'lqr-url-wrapper' });
    const urlInput = createElement('input', '', { class: 'lqr-input lqr-url-input', id: 'lqr-url', type: 'url', placeholder: 'https://example.com' });
    if (editing) urlInput.value = editing.url;
    urlWrapper.appendChild(urlInput);
    const urlIndicator = createElement('span', '', { class: 'lqr-url-indicator', 'aria-hidden': 'true' });
    urlWrapper.appendChild(urlIndicator);
    urlGroup.appendChild(urlWrapper);
    const urlHint = createElement('span', '', { class: 'lqr-url-hint', id: 'lqr-url-hint', 'aria-live': 'polite' });
    urlGroup.appendChild(urlHint);
    form.appendChild(urlGroup);

    // Real-time URL validation
    this.addListener(urlInput, 'input', () => {
      const val = urlInput.value.trim();
      if (!val) {
        urlIndicator.className = 'lqr-url-indicator';
        urlHint.textContent = '';
        urlInput.classList.remove('lqr-input--valid', 'lqr-input--invalid');
        return;
      }
      const sanitized = sanitizeURL(val, ['http:', 'https:']);
      if (sanitized) {
        urlIndicator.className = 'lqr-url-indicator lqr-url-indicator--valid';
        urlIndicator.textContent = '✓';
        urlHint.textContent = '';
        urlInput.classList.add('lqr-input--valid');
        urlInput.classList.remove('lqr-input--invalid');
      } else {
        urlIndicator.className = 'lqr-url-indicator lqr-url-indicator--invalid';
        urlIndicator.textContent = '✗';
        urlHint.textContent = 'Please enter a valid http or https URL';
        urlInput.classList.add('lqr-input--invalid');
        urlInput.classList.remove('lqr-input--valid');
      }
    });

    // Label input
    const labelGroup = createElement('div', '', { class: 'lqr-form-group' });
    const labelLabel = createElement('label', 'Label (optional)', { class: 'lqr-label', for: 'lqr-label' });
    labelGroup.appendChild(labelLabel);
    const labelInput = createElement('input', '', { class: 'lqr-input', id: 'lqr-label', type: 'text', placeholder: 'e.g. My Portfolio' });
    if (editing) labelInput.value = editing.label || '';
    labelGroup.appendChild(labelInput);
    form.appendChild(labelGroup);

    // Buttons
    const actions = createElement('div', '', { class: 'lqr-form-actions' });
    const submitBtn = createElement('button', editing ? 'Update Link' : 'Add Link', { class: 'btn btn-primary lqr-submit-btn', type: 'submit' });
    actions.appendChild(submitBtn);

    if (editing) {
      const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-outline lqr-cancel-btn', type: 'button' });
      this.addListener(cancelBtn, 'click', () => {
        this.editingId = null;
        this.renderContent();
      });
      actions.appendChild(cancelBtn);
    }

    form.appendChild(actions);

    // Form submit
    this.addListener(form, 'submit', (e) => {
      e.preventDefault();
      const type = typeSelect.value;
      const rawUrl = urlInput.value.trim();
      const label = labelInput.value.trim();

      // Validate URL
      const validUrl = sanitizeURL(rawUrl, ['http:', 'https:']);
      if (!validUrl) {
        urlInput.classList.add('lqr-input--invalid');
        urlInput.focus();
        urlHint.textContent = 'Please enter a valid http or https URL';
        return;
      }

      if (editing) {
        editing.type = type;
        editing.url = validUrl;
        editing.label = label;
      } else {
        this.links.push({
          id: generateUUID(),
          type,
          url: validUrl,
          label
        });
      }

      this.saveLinks();
      this.editingId = null;
      this.renderContent();
      if (window.CC?.toast) {
        window.CC.toast.show(editing ? 'Link updated' : 'Link added', 'success');
      }
    });

    card.appendChild(form);
    return card;
  }

  // ==================== LINK LIST ====================

  renderLinkList() {
    const section = createElement('div', '', { class: 'lqr-list-section' });
    section.appendChild(createElement('h2', `Your Links (${this.links.length})`, { class: 'lqr-section-title' }));

    if (this.links.length === 0) {
      const empty = createElement('div', '', { class: 'lqr-empty' });
      empty.appendChild(createElement('p', 'No links added yet. Add your first link above.', { class: 'lqr-empty-text' }));
      section.appendChild(empty);
      return section;
    }

    const list = createElement('div', '', { class: 'lqr-list' });
    this.links.forEach(link => list.appendChild(this.renderLinkCard(link)));
    section.appendChild(list);
    return section;
  }

  renderLinkCard(link) {
    const card = createElement('div', '', { class: 'lqr-link-card' });
    const isActive = this.qrPreviewLinkId === link.id;
    if (isActive) card.classList.add('lqr-link-card--active');

    // Header with type badge
    const header = createElement('div', '', { class: 'lqr-link-card-header' });
    const typeBadge = createElement('span', link.type, { class: `lqr-type-badge lqr-type-badge--${link.type.toLowerCase().replace(/\s+/g, '-')}` });
    header.appendChild(typeBadge);
    card.appendChild(header);

    // URL display
    const urlRow = createElement('div', '', { class: 'lqr-link-url-row' });
    const urlText = createElement('span', '', { class: 'lqr-link-url' });
    urlText.textContent = link.url;
    urlText.setAttribute('title', link.url);
    urlRow.appendChild(urlText);
    card.appendChild(urlRow);

    // Label
    if (link.label) {
      const labelEl = createElement('p', '', { class: 'lqr-link-label' });
      labelEl.textContent = link.label;
      card.appendChild(labelEl);
    }

    // Action buttons
    const actions = createElement('div', '', { class: 'lqr-link-actions' });

    const qrBtn = createElement('button', isActive ? 'Hide QR' : 'QR Code', { class: `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'} lqr-action-btn` });
    qrBtn.setAttribute('aria-label', `Generate QR code for ${link.label || link.url}`);
    this.addListener(qrBtn, 'click', () => {
      this.qrPreviewLinkId = isActive ? null : link.id;
      this.renderContent();
    });
    actions.appendChild(qrBtn);

    const copyBtn = createElement('button', 'Copy', { class: 'btn btn-sm btn-outline lqr-action-btn' });
    copyBtn.setAttribute('aria-label', `Copy URL for ${link.label || link.url}`);
    this.addListener(copyBtn, 'click', () => this.copyUrl(link.url));
    actions.appendChild(copyBtn);

    const editBtn = createElement('button', 'Edit', { class: 'btn btn-sm btn-outline lqr-action-btn' });
    editBtn.setAttribute('aria-label', `Edit ${link.label || link.url}`);
    this.addListener(editBtn, 'click', () => {
      this.editingId = link.id;
      this.renderContent();
    });
    actions.appendChild(editBtn);

    const delBtn = createElement('button', 'Delete', { class: 'btn btn-sm btn-outline lqr-delete-btn' });
    delBtn.setAttribute('aria-label', `Delete ${link.label || link.url}`);
    this.addListener(delBtn, 'click', () => this.deleteLink(link.id));
    actions.appendChild(delBtn);

    card.appendChild(actions);
    return card;
  }

  // ==================== QR PREVIEW PANEL ====================

  renderQrPanel() {
    const panel = createElement('div', '', { class: 'lqr-qr-panel' });
    panel.appendChild(createElement('h2', 'QR Code Preview', { class: 'lqr-section-title' }));

    const activeLink = this.qrPreviewLinkId ? this.links.find(l => l.id === this.qrPreviewLinkId) : null;

    if (!activeLink) {
      const placeholder = createElement('div', '', { class: 'lqr-qr-placeholder' });
      placeholder.appendChild(createElement('p', 'Select a link and click "QR Code" to generate a preview.', { class: 'lqr-qr-placeholder-text' }));
      panel.appendChild(placeholder);
      return panel;
    }

    // Size selector
    const sizeRow = createElement('div', '', { class: 'lqr-size-row' });
    sizeRow.appendChild(createElement('span', 'Size:', { class: 'lqr-size-label' }));
    const sizeGroup = createElement('div', '', { class: 'lqr-size-group' });
    Object.entries(QR_SIZES).forEach(([key, config]) => {
      const btn = createElement('button', config.label, {
        class: `btn btn-sm ${this.qrSize === key ? 'btn-primary' : 'btn-outline'} lqr-size-btn`,
        'data-size': key
      });
      btn.setAttribute('aria-pressed', this.qrSize === key ? 'true' : 'false');
      this.addListener(btn, 'click', () => {
        this.qrSize = key;
        this.renderContent();
      });
      sizeGroup.appendChild(btn);
    });
    sizeRow.appendChild(sizeGroup);
    panel.appendChild(sizeRow);

    // QR canvas area
    const qrArea = createElement('div', '', { class: 'lqr-qr-area' });
    const sizePx = QR_SIZES[this.qrSize].px;
    const grid = buildQrGrid(activeLink.url);
    const canvas = renderQrCanvas(grid, sizePx);
    canvas.className = 'lqr-qr-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `QR code for ${activeLink.label || activeLink.url}`);
    qrArea.appendChild(canvas);

    // Label below QR
    const qrLabel = createElement('p', '', { class: 'lqr-qr-label' });
    qrLabel.textContent = activeLink.label || activeLink.url;
    qrArea.appendChild(qrLabel);

    panel.appendChild(qrArea);

    // Notice
    const notice = createElement('p', 'Note: This QR code is a visual placeholder. For scannable codes, a dedicated QR encoding library is required.', { class: 'lqr-qr-notice' });
    panel.appendChild(notice);

    // Export button
    const exportBtn = createElement('button', 'Export as PNG', { class: 'btn btn-primary lqr-export-btn' });
    exportBtn.setAttribute('aria-label', 'Download QR code as PNG image');
    this.addListener(exportBtn, 'click', () => this.exportQrPng(canvas, activeLink));
    panel.appendChild(exportBtn);

    return panel;
  }

  // ==================== ACTIONS ====================

  async copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      if (window.CC?.toast) window.CC.toast.show('URL copied to clipboard', 'success');
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (window.CC?.toast) window.CC.toast.show('URL copied to clipboard', 'success');
      } catch {
        if (window.CC?.toast) window.CC.toast.show('Failed to copy URL', 'error');
      }
      document.body.removeChild(ta);
    }
  }

  deleteLink(id) {
    this.links = this.links.filter(l => l.id !== id);
    if (this.qrPreviewLinkId === id) this.qrPreviewLinkId = null;
    if (this.editingId === id) this.editingId = null;
    this.saveLinks();
    this.renderContent();
    if (window.CC?.toast) window.CC.toast.show('Link deleted', 'success');
  }

  exportQrPng(canvas, link) {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          if (window.CC?.toast) window.CC.toast.show('Failed to generate image', 'error');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = (link.label || link.type || 'qr-code').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        a.href = url;
        a.download = `${filename}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.CC?.toast) window.CC.toast.show('QR code exported', 'success');
      }, 'image/png');
    } catch {
      if (window.CC?.toast) window.CC.toast.show('Failed to export QR code', 'error');
    }
  }
}


