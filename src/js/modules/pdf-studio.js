import { createElement, sanitizeInput, sanitizeFilename } from '../utils/sanitize.js';
import eventBus from '../core/events.js';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_PAGES = 500;

export class PdfStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];
    this.pdfjsLib = null;
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1.0;
    this.fileName = '';
    this.fileSize = 0;
    this.rendering = false;
    this.searchText = '';
    this.searchResults = [];
    this.loaded = false;
  }

  async render() {
    this.container = createElement('div', '', { class: 'pdf-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'PDF Studio');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'pdf-content', id: 'pdf-content' });
    this.container.appendChild(content);
    this.showLanding();
    return this.container;
  }

  renderHeader() {
    const hdr = createElement('div', '', { class: 'pdf-header' });
    hdr.innerHTML = '<nav class="pdf-breadcrumb" aria-label="Breadcrumb"><ol class="breadcrumb-list"><li class="breadcrumb-item"><a href="#/dashboard" class="breadcrumb-link">Dashboard</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item breadcrumb-current" aria-current="page">PDF Studio</li></ol></nav>';
    const row = createElement('div', '', { class: 'pdf-title-row' });
    const group = createElement('div', '', { class: 'pdf-title-group' });
    group.appendChild(createElement('h1', 'PDF Studio', { class: 'pdf-title' }));
    group.appendChild(createElement('p', 'View, organize, annotate, and combine PDF files locally in your browser. No files are uploaded.', { class: 'pdf-description' }));
    row.appendChild(group);
    hdr.appendChild(row);
    return hdr;
  }

  // ==================== LANDING VIEW ====================

  showLanding() {
    const c = this.gc(); c.innerHTML = '';

    const landing = createElement('div', '', { class: 'pdf-landing' });

    const dropZone = createElement('div', '', { class: 'pdf-drop-zone', tabindex: '0', role: 'button', 'aria-label': 'Open PDF file' });
    dropZone.innerHTML = '<div class="pdf-drop-icon" aria-hidden="true"><svg width="64" height="64" viewBox="0 0 64 64" fill="none"><rect x="12" y="4" width="40" height="52" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M20 28h24M20 36h24M20 44h16" stroke="currentColor" stroke-width="2"/><text x="32" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">PDF</text></svg></div>';
    dropZone.appendChild(createElement('h2', 'Open a PDF File', { class: 'pdf-drop-title' }));
    dropZone.appendChild(createElement('p', 'Drag and drop a PDF here, or click to browse', { class: 'pdf-drop-msg' }));
    dropZone.appendChild(createElement('p', 'All processing happens locally in your browser. Files are never uploaded.', { class: 'pdf-drop-privacy' }));

    this.al(dropZone, 'click', () => this.openFilePicker());
    this.al(dropZone, 'keydown', e => { if (e.key === 'Enter') this.openFilePicker(); });

    // Drag and drop
    this.al(dropZone, 'dragover', e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('pdf-drop-zone--active'); });
    this.al(dropZone, 'dragleave', e => { e.preventDefault(); dropZone.classList.remove('pdf-drop-zone--active'); });
    this.al(dropZone, 'drop', e => { e.preventDefault(); dropZone.classList.remove('pdf-drop-zone--active'); const file = e.dataTransfer?.files?.[0]; if (file) this.loadFile(file); });

    landing.appendChild(dropZone);

    // Limitations notice
    const notice = createElement('div', '', { class: 'pdf-notice' });
    notice.appendChild(createElement('h3', 'Browser PDF Capabilities', { class: 'pdf-notice-title' }));
    const limits = createElement('ul', '', { class: 'pdf-notice-list' });
    ['View and navigate PDF pages', 'Search text content', 'Zoom and rotate views', 'View file information', 'Page reordering, splitting, and merging (Stage 2+)', 'Annotations and highlights (Stage 4+)', 'Text editing is limited by browser PDF technology'].forEach(t => {
      limits.appendChild(createElement('li', t, {}));
    });
    notice.appendChild(limits);
    notice.appendChild(createElement('p', 'PDF Studio uses PDF.js (Mozilla, Apache 2.0) for rendering. Complex PDFs may render differently than in Adobe Acrobat.', { class: 'pdf-notice-footer' }));
    landing.appendChild(notice);

    c.appendChild(landing);
  }

  // ==================== FILE LOADING ====================

  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.addEventListener('change', () => { const file = input.files?.[0]; if (file) this.loadFile(file); });
    input.click();
  }

  async loadFile(file) {
    if (!file) return;

    // Validation
    if (file.size > MAX_FILE_SIZE) { this.toast(`File too large. Maximum: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`, 'error'); return; }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') { this.toast('Please select a PDF file', 'error'); return; }

    this.fileName = file.name;
    this.fileSize = file.size;

    const c = this.gc(); c.innerHTML = '';
    const loading = createElement('div', '', { class: 'pdf-loading', role: 'status' });
    loading.appendChild(createElement('div', '', { class: 'pdf-spinner', 'aria-hidden': 'true' }));
    loading.appendChild(createElement('p', 'Loading PDF library...', { id: 'pdf-load-status' }));
    c.appendChild(loading);

    try {
      // Lazy load PDF.js
      if (!this.pdfjsLib) {
        await this.loadPdfJs();
      }

      const status = c.querySelector('#pdf-load-status');
      if (status) status.textContent = 'Opening PDF...';

      const arrayBuffer = await file.arrayBuffer();

      // Validate PDF header
      const header = new Uint8Array(arrayBuffer.slice(0, 5));
      const headerStr = String.fromCharCode(...header);
      if (!headerStr.startsWith('%PDF')) {
        this.toast('File does not appear to be a valid PDF', 'error');
        this.showLanding();
        return;
      }

      const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;

      if (this.totalPages > MAX_PAGES) {
        this.toast(`PDF has ${this.totalPages} pages. Maximum supported: ${MAX_PAGES}`, 'warning');
      }

      this.currentPage = 1;
      this.scale = 1.0;
      this.loaded = true;
      this.showViewer();

    } catch (e) {
      console.error('PDF load error:', e);
      if (e.name === 'PasswordException') {
        this.toast('This PDF is password-protected. Password-protected PDFs are not supported.', 'error');
      } else {
        this.toast(`Failed to open PDF: ${e.message}`, 'error');
      }
      this.showLanding();
    }
  }

  async loadPdfJs() {
    try {
      const module = await import(PDFJS_CDN);
      this.pdfjsLib = module;
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    } catch (e) {
      throw new Error('Failed to load PDF.js library. Check your internet connection.');
    }
  }

  // ==================== VIEWER ====================

  showViewer() {
    const c = this.gc(); c.innerHTML = '';

    const viewer = createElement('div', '', { class: 'pdf-viewer' });

    // Toolbar
    const toolbar = createElement('div', '', { class: 'pdf-toolbar', role: 'toolbar', 'aria-label': 'PDF controls' });

    // File name
    const fileLabel = createElement('span', '', { class: 'pdf-file-name' });
    fileLabel.textContent = this.fileName;
    toolbar.appendChild(fileLabel);

    // Navigation
    const nav = createElement('div', '', { class: 'pdf-nav-group' });
    const prevBtn = createElement('button', '◀', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Previous page' });
    this.al(prevBtn, 'click', () => this.goToPage(this.currentPage - 1));
    nav.appendChild(prevBtn);

    const pageInput = createElement('input', '', { class: 'pdf-page-input', type: 'number', min: '1', max: String(this.totalPages), value: String(this.currentPage), 'aria-label': 'Page number' });
    this.al(pageInput, 'change', e => { const p = parseInt(e.target.value); if (p >= 1 && p <= this.totalPages) this.goToPage(p); else e.target.value = this.currentPage; });
    nav.appendChild(pageInput);

    nav.appendChild(createElement('span', ` / ${this.totalPages}`, { class: 'pdf-page-total' }));

    const nextBtn = createElement('button', '▶', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Next page' });
    this.al(nextBtn, 'click', () => this.goToPage(this.currentPage + 1));
    nav.appendChild(nextBtn);
    toolbar.appendChild(nav);

    // Zoom
    const zoomGroup = createElement('div', '', { class: 'pdf-zoom-group' });
    const zoomOutBtn = createElement('button', '−', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Zoom out' });
    this.al(zoomOutBtn, 'click', () => this.setZoom(this.scale - 0.25));
    zoomGroup.appendChild(zoomOutBtn);

    const zoomLabel = createElement('span', `${Math.round(this.scale * 100)}%`, { class: 'pdf-zoom-label', id: 'pdf-zoom-label' });
    zoomGroup.appendChild(zoomLabel);

    const zoomInBtn = createElement('button', '+', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Zoom in' });
    this.al(zoomInBtn, 'click', () => this.setZoom(this.scale + 0.25));
    zoomGroup.appendChild(zoomInBtn);

    const fitBtn = createElement('button', 'Fit', { class: 'btn btn-sm btn-ghost', 'aria-label': 'Fit to width' });
    this.al(fitBtn, 'click', () => this.fitToWidth());
    zoomGroup.appendChild(fitBtn);
    toolbar.appendChild(zoomGroup);

    // Actions
    const actGroup = createElement('div', '', { class: 'pdf-act-group' });
    const infoBtn = createElement('button', 'Info', { class: 'btn btn-sm btn-outline' });
    this.al(infoBtn, 'click', () => this.showInfo());
    actGroup.appendChild(infoBtn);

    const searchBtn = createElement('button', 'Search', { class: 'btn btn-sm btn-outline' });
    this.al(searchBtn, 'click', () => this.toggleSearch());
    actGroup.appendChild(searchBtn);

    const closeBtn = createElement('button', 'Close', { class: 'btn btn-sm btn-ghost' });
    this.al(closeBtn, 'click', () => { this.closePdf(); this.showLanding(); });
    actGroup.appendChild(closeBtn);
    toolbar.appendChild(actGroup);

    viewer.appendChild(toolbar);

    // Search bar (hidden by default)
    const searchBar = createElement('div', '', { class: 'pdf-search-bar', id: 'pdf-search-bar', hidden: true });
    const searchInput = createElement('input', '', { class: 'pdf-search-input', type: 'search', placeholder: 'Search text...', 'aria-label': 'Search PDF text' });
    this.al(searchInput, 'keydown', e => { if (e.key === 'Enter') this.searchInPdf(searchInput.value); });
    searchBar.appendChild(searchInput);
    const searchGoBtn = createElement('button', 'Find', { class: 'btn btn-sm btn-primary' });
    this.al(searchGoBtn, 'click', () => this.searchInPdf(searchInput.value));
    searchBar.appendChild(searchGoBtn);
    const searchResults = createElement('span', '', { class: 'pdf-search-results', id: 'pdf-search-results' });
    searchBar.appendChild(searchResults);
    viewer.appendChild(searchBar);

    // Main area with thumbnails and canvas
    const main = createElement('div', '', { class: 'pdf-main' });

    // Thumbnail sidebar
    const sidebar = createElement('div', '', { class: 'pdf-sidebar', id: 'pdf-sidebar' });
    sidebar.appendChild(createElement('h3', 'Pages', { class: 'pdf-sidebar-title' }));
    const thumbList = createElement('div', '', { class: 'pdf-thumb-list', id: 'pdf-thumb-list' });
    sidebar.appendChild(thumbList);
    main.appendChild(sidebar);

    // Canvas area
    const canvasArea = createElement('div', '', { class: 'pdf-canvas-area', id: 'pdf-canvas-area' });
    const canvas = document.createElement('canvas');
    canvas.id = 'pdf-canvas';
    canvas.className = 'pdf-canvas';
    canvasArea.appendChild(canvas);
    main.appendChild(canvasArea);

    viewer.appendChild(main);
    c.appendChild(viewer);

    // Render first page and thumbnails
    this.renderPage(this.currentPage);
    this.renderThumbnails();
  }

  async renderPage(pageNum) {
    if (!this.pdfDoc || this.rendering) return;
    if (pageNum < 1 || pageNum > this.totalPages) return;

    this.rendering = true;
    this.currentPage = pageNum;

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale * 2 }); // 2x for HiDPI

      const canvas = this.container?.querySelector('#pdf-canvas');
      if (!canvas) { this.rendering = false; return; }

      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 2}px`;
      canvas.style.height = `${viewport.height / 2}px`;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Update page input
      const pageInput = this.container?.querySelector('.pdf-page-input');
      if (pageInput) pageInput.value = pageNum;

      // Update active thumbnail
      this.container?.querySelectorAll('.pdf-thumb').forEach(t => {
        t.classList.toggle('pdf-thumb--active', parseInt(t.dataset.page) === pageNum);
      });

    } catch (e) {
      console.error('Page render error:', e);
    }

    this.rendering = false;
  }

  async renderThumbnails() {
    const list = this.container?.querySelector('#pdf-thumb-list');
    if (!list || !this.pdfDoc) return;
    list.innerHTML = '';

    const pagesToRender = Math.min(this.totalPages, 50); // Limit thumbnails for performance

    for (let i = 1; i <= pagesToRender; i++) {
      const thumb = createElement('button', '', { class: `pdf-thumb ${i === this.currentPage ? 'pdf-thumb--active' : ''}`, 'data-page': String(i), type: 'button', 'aria-label': `Page ${i}` });

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-thumb-canvas';
      thumb.appendChild(canvas);
      thumb.appendChild(createElement('span', String(i), { class: 'pdf-thumb-num' }));

      this.al(thumb, 'click', () => this.goToPage(i));
      list.appendChild(thumb);

      // Render thumbnail asynchronously
      this.renderThumbCanvas(canvas, i);
    }

    if (this.totalPages > 50) {
      list.appendChild(createElement('p', `Showing first 50 of ${this.totalPages} pages`, { class: 'pdf-thumb-note' }));
    }
  }

  async renderThumbCanvas(canvas, pageNum) {
    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.3 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) { /* Thumbnail render failed silently */ }
  }

  // ==================== NAVIGATION ====================

  goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.renderPage(pageNum);
  }

  setZoom(scale) {
    scale = Math.max(0.25, Math.min(4.0, scale));
    this.scale = scale;
    const label = this.container?.querySelector('#pdf-zoom-label');
    if (label) label.textContent = `${Math.round(scale * 100)}%`;
    this.renderPage(this.currentPage);
  }

  fitToWidth() {
    const area = this.container?.querySelector('#pdf-canvas-area');
    if (!area || !this.pdfDoc) return;
    this.pdfDoc.getPage(this.currentPage).then(page => {
      const viewport = page.getViewport({ scale: 1 });
      const areaWidth = area.clientWidth - 32;
      this.setZoom(areaWidth / viewport.width);
    });
  }

  // ==================== SEARCH ====================

  toggleSearch() {
    const bar = this.container?.querySelector('#pdf-search-bar');
    if (!bar) return;
    const hidden = bar.hidden;
    bar.hidden = !hidden;
    if (!hidden) return;
    const input = bar.querySelector('.pdf-search-input');
    if (input) input.focus();
  }

  async searchInPdf(query) {
    if (!query.trim() || !this.pdfDoc) return;
    const resultsEl = this.container?.querySelector('#pdf-search-results');
    if (resultsEl) resultsEl.textContent = 'Searching...';

    let found = 0;
    let firstPage = null;
    const q = query.toLowerCase();

    for (let i = 1; i <= this.totalPages; i++) {
      try {
        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ').toLowerCase();
        if (text.includes(q)) {
          found++;
          if (!firstPage) firstPage = i;
        }
      } catch { /* skip page */ }
    }

    if (resultsEl) resultsEl.textContent = found > 0 ? `Found on ${found} page${found > 1 ? 's' : ''}` : 'No results';
    if (firstPage) this.goToPage(firstPage);
  }

  // ==================== INFO ====================

  async showInfo() {
    if (!window.CC?.modal || !this.pdfDoc) return;
    let info = {};
    try { info = await this.pdfDoc.getMetadata(); } catch {}
    const metadata = info.info || {};

    const body = createElement('div', '', { class: 'pdf-info' });
    const rows = [
      ['File Name', this.fileName],
      ['File Size', this.formatBytes(this.fileSize)],
      ['Pages', String(this.totalPages)],
      ['Title', metadata.Title || 'N/A'],
      ['Author', metadata.Author || 'N/A'],
      ['Subject', metadata.Subject || 'N/A'],
      ['Creator', metadata.Creator || 'N/A'],
      ['Producer', metadata.Producer || 'N/A'],
      ['PDF Version', info.contentLength ? `Unknown` : 'N/A'],
    ];

    rows.forEach(([label, value]) => {
      const row = createElement('div', '', { class: 'pdf-info-row' });
      row.appendChild(createElement('dt', label, { class: 'pdf-info-label' }));
      const dd = createElement('dd', '', { class: 'pdf-info-value' });
      dd.textContent = value;
      row.appendChild(dd);
      body.appendChild(row);
    });

    window.CC.modal.show({ title: 'PDF Information', body, size: 'small' });
  }

  // ==================== CLEANUP ====================

  closePdf() {
    if (this.pdfDoc) { this.pdfDoc.destroy(); this.pdfDoc = null; }
    this.loaded = false;
    this.currentPage = 1;
    this.totalPages = 0;
    this.fileName = '';
    this.fileSize = 0;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  toast(msg, type) { if (window.CC?.toast) window.CC.toast.show(msg, type); }
  gc() { return this.container?.querySelector('#pdf-content') || this.container; }
  al(el, ev, fn) { el.addEventListener(ev, fn); this.listeners.push({ element: el, event: ev, handler: fn }); }
  hasUnsavedChanges() { return false; }

  destroy() {
    this.closePdf();
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}


