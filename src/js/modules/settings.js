import { escapeHtml } from '../utils/sanitize.js';

/**
 * Normalizes either backup dialect into the flat shape the settings
 * importer consumes (store-name keys → record arrays, plus `preferences`):
 * - Settings/app exports: { type:'careercanvas-full-backup', <store>: [...], preferences }
 * - Data & Backup studio exports: { version:number, stores:{...} } (full) or
 *   { storeName, data:[...] } (single category).
 * @param {any} data - Parsed backup JSON
 * @returns {Object|null} Flat backup object, or null when unrecognized.
 */
export function normalizeBackupData(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.type === 'careercanvas-full-backup') return data;
  if (data.stores && typeof data.stores === 'object') {
    return { ...data, ...data.stores };
  }
  if (typeof data.storeName === 'string' && Array.isArray(data.data)) {
    return { ...data, [data.storeName]: data.data };
  }
  return null;
}

export class SettingsPanel {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.el = null;
  }

  async render() {
    this.el = document.createElement('div');
    this.el.className = 'container p-4';

    const storageInfo = await this.getStorageInfo();

    this.el.innerHTML = `
      <div class="settings-page">
        <h1 class="text-2xl mb-1">Settings</h1>
        <p class="text-muted mb-6">Manage your preferences, data, and privacy</p>

        <div class="settings-sections">
          <!-- Appearance -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Appearance</h2></div>
            <div class="card-body">
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Theme</span>
                  <span class="settings-desc">Choose light or dark mode</span>
                </div>
                <select id="setting-theme" class="form-select" style="width:auto">
                </select>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Default Page Size</span>
                  <span class="settings-desc">Default paper size for new documents</span>
                </div>
                <select id="setting-pagesize" class="form-select" style="width:auto">
                  <option value="a4">A4 (210 x 297 mm)</option>
                  <option value="letter">US Letter (8.5 x 11 in)</option>
                  <option value="legal">US Legal (8.5 x 14 in)</option>
                  <option value="a5">A5 (148 x 210 mm)</option>
                </select>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Preview Zoom</span>
                  <span class="settings-desc">Default zoom level for document preview</span>
                </div>
                <select id="setting-zoom" class="form-select" style="width:auto">
                  <option value="fit">Fit Width</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Editor -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Editor</h2></div>
            <div class="card-body">
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Autosave</span>
                  <span class="settings-desc">Automatically save changes as you type</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-autosave" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Show Character Counts</span>
                  <span class="settings-desc">Display character and word counts on text fields</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-charcounts" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Show Writing Tips</span>
                  <span class="settings-desc">Display contextual writing guidance in the editor</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-tips" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Spell Check</span>
                  <span class="settings-desc">Use browser spell checking in text fields</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-spellcheck" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- AI -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>AI</h2></div>
            <div class="card-body">
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Cloud API Key (Gemini)</span>
                  <span class="settings-desc">Optional. Needed only for local development — on Vercel the server key is used automatically. Stored in this browser only.</span>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info" style="flex:1">
                  <input type="password" id="setting-ai-key" class="form-input" placeholder="Paste Gemini API key (AIza...)" autocomplete="off" style="width:100%">
                  <span class="settings-desc" id="setting-ai-provider"></span>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-sm btn-primary" id="btn-ai-key-save">Save</button>
                  <button class="btn btn-sm btn-outline" id="btn-ai-key-clear">Clear</button>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Local AI (offline)</span>
                  <span class="settings-desc">Summarize, condense, tone check &amp; semantic match fully on-device. Downloads ~150–650 MB once.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-local-ai">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Advanced AI — WebGPU (offline)</span>
                  <span class="settings-desc" id="setting-webgpu-status">Full Llama-3.1 8B in the browser. Needs WebGPU + ~5 GB free space.</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-advanced-ai">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Local AI Cache</span>
                  <span class="settings-desc">Clear downloaded on-device models and cached embeddings</span>
                </div>
                <button class="btn btn-sm btn-outline" id="btn-clear-local-ai">Clear Cache</button>
              </div>
            </div>
          </section>

          <!-- Data & Storage -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Data &amp; Storage</h2></div>
            <div class="card-body">
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Storage Usage</span>
                  <span class="settings-desc">${storageInfo}</span>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Export All Data</span>
                  <span class="settings-desc">Download a complete backup of all documents and settings</span>
                </div>
                <button class="btn btn-sm btn-outline" id="btn-export-all">Export Backup</button>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Import Backup</span>
                  <span class="settings-desc">Restore from a previously exported backup file</span>
                </div>
                <button class="btn btn-sm btn-outline" id="btn-import-backup">Import Backup</button>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Clear Archived Documents</span>
                  <span class="settings-desc">Permanently delete all archived documents</span>
                </div>
                <button class="btn btn-sm btn-danger-outline" id="btn-clear-archived">Clear Archived</button>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Clear All Data</span>
                  <span class="settings-desc">Permanently delete all application data. This cannot be undone.</span>
                </div>
                <button class="btn btn-sm btn-danger" id="btn-clear-all">Delete All Data</button>
              </div>
              <div class="alert alert-warning mt-3">
                <strong>Important:</strong> All data is stored in your browser. Clearing browser data, using private/incognito mode, or uninstalling the browser will remove your documents. Export backups regularly.
              </div>
            </div>
          </section>

          <!-- Privacy -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Privacy</h2></div>
            <div class="card-body">
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Data Location</span>
                  <span class="settings-desc">All your data stays on this device. Nothing is sent to any server.</span>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Cookies</span>
                  <span class="settings-desc">CareerCanvas uses no tracking cookies or analytics. Only localStorage is used for your preferences.</span>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Third-Party Services</span>
                  <span class="settings-desc">No data is shared with third parties. No external APIs are called.</span>
                </div>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Photos &amp; Images</span>
                  <span class="settings-desc">Any photos you upload are stored locally as data URLs. They never leave your browser.</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Accessibility -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Accessibility</h2></div>
            <div class="card-body">
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Reduce Motion</span>
                  <span class="settings-desc">Minimize animations and transitions</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-reduce-motion">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">High Contrast</span>
                  <span class="settings-desc">Increase contrast for better readability</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="setting-high-contrast">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="settings-row">
                <div class="settings-row-info">
                  <span class="settings-label">Font Size</span>
                  <span class="settings-desc">Adjust the application interface font size</span>
                </div>
                <select id="setting-ui-fontsize" class="form-select" style="width:auto">
                  <option value="small">Small</option>
                  <option value="medium" selected>Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">Extra Large</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Keyboard Shortcuts -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Keyboard Shortcuts</h2></div>
            <div class="card-body">
              <div class="shortcuts-list">
                <div class="shortcut-row"><span>New Document</span><kbd>Ctrl+Shift+N</kbd></div>
                <div class="shortcut-row"><span>Save</span><kbd>Ctrl+S</kbd></div>
                <div class="shortcut-row"><span>Undo</span><kbd>Ctrl+Z</kbd></div>
                <div class="shortcut-row"><span>Redo</span><kbd>Ctrl+Y</kbd></div>
                <div class="shortcut-row"><span>Print / Export PDF</span><kbd>Ctrl+P</kbd></div>
                <div class="shortcut-row"><span>Toggle ATS Mode</span><kbd>Ctrl+Shift+A</kbd></div>
                <div class="shortcut-row"><span>Toggle Preview</span><kbd>Ctrl+Shift+P</kbd></div>
                <div class="shortcut-row"><span>Close Modal</span><kbd>Escape</kbd></div>
              </div>
            </div>
          </section>

          <!-- About -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>About CareerCanvas</h2></div>
            <div class="card-body">
              <p class="mb-2"><strong>CareerCanvas</strong> is a free, open-source resume builder.</p>
              <ul class="about-list">
                <li>No account required</li>
                <li>No paywall or premium features</li>
                <li>No watermarks on exports</li>
                <li>No download limits</li>
                <li>No ads or tracking</li>
                <li>All data stays on your device</li>
                <li>Works offline after first load</li>
              </ul>
              <p class="text-muted mt-3 text-sm">Version 1.0.0</p>
            </div>
          </section>

          <!-- Print Tips -->
          <section class="settings-section card mb-4">
            <div class="card-header"><h2>Printing Tips</h2></div>
            <div class="card-body">
              <div class="print-tips">
                <h3 class="text-md mb-2">Google Chrome / Microsoft Edge</h3>
                <ol class="print-steps">
                  <li>Click Print or press Ctrl+P</li>
                  <li>Set Destination to "Save as PDF" or your printer</li>
                  <li>Set Paper Size to match your document (A4 or Letter)</li>
                  <li>Set Margins to "None" or "Minimum"</li>
                  <li>Enable "Background graphics" if your template uses colors</li>
                  <li>Click Save or Print</li>
                </ol>
                <h3 class="text-md mb-2 mt-4">Mozilla Firefox</h3>
                <ol class="print-steps">
                  <li>Click Print or press Ctrl+P</li>
                  <li>Select "Save to PDF" or your printer</li>
                  <li>Set Paper Size to match your document</li>
                  <li>Set Margins to "None"</li>
                  <li>Under Options, check "Print backgrounds"</li>
                  <li>Click Print</li>
                </ol>
                <h3 class="text-md mb-2 mt-4">Safari</h3>
                <ol class="print-steps">
                  <li>Click File > Print or press Cmd+P</li>
                  <li>Click "PDF" dropdown > "Save as PDF"</li>
                  <li>Set Paper Size in Page Setup</li>
                  <li>Enable "Print backgrounds" in settings</li>
                  <li>Click Save</li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    this.loadPreferences();
    this.bindEvents();
    return this.el;
  }

  loadPreferences() {
    const pageSize = localStorage.getItem('cc_default_pagesize') || 'a4';
    const zoom = localStorage.getItem('cc_default_zoom') || 'fit';
    const autosave = localStorage.getItem('cc_autosave') !== 'false';
    const charCounts = localStorage.getItem('cc_charcounts') !== 'false';
    const tips = localStorage.getItem('cc_tips') !== 'false';
    const spellcheck = localStorage.getItem('cc_spellcheck') !== 'false';
    const reduceMotion = localStorage.getItem('cc_reduce_motion') === 'true';
    const highContrast = localStorage.getItem('cc_high_contrast') === 'true';
    const uiFontSize = localStorage.getItem('cc_ui_fontsize') || 'medium';
    const localAI = localStorage.getItem('cc_local_ai_enabled') === 'true';
    const advAI = localStorage.getItem('cc_advanced_ai_enabled') === 'true';
    const aiKey = localStorage.getItem('cc_ai_api_key') || '';

    this.populateThemeDropdown();
    this.setVal('setting-pagesize', pageSize);
    this.setVal('setting-zoom', zoom);
    this.setChecked('setting-autosave', autosave);
    this.setChecked('setting-charcounts', charCounts);
    this.setChecked('setting-tips', tips);
    this.setChecked('setting-spellcheck', spellcheck);
    this.setChecked('setting-reduce-motion', reduceMotion);
    this.setChecked('setting-high-contrast', highContrast);
    this.setVal('setting-ui-fontsize', uiFontSize);
    this.setChecked('setting-local-ai', localAI);
    this.setChecked('setting-advanced-ai', advAI);
    const keyInput = this.el.querySelector('#setting-ai-key');
    if (keyInput && aiKey) keyInput.value = aiKey;
    this.updateAiProviderLabel();
    this.updateWebgpuStatus();
  }

  populateThemeDropdown() {
    const select = this.el.querySelector('#setting-theme');
    if (!select) return;
    select.innerHTML = '';

    const engine = window.CC && window.CC.themeEngine;
    if (!engine) {
      const fallback = localStorage.getItem('cc_theme') || 'light';
      [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']].forEach(([v, l]) => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = l;
        if (v === fallback) opt.selected = true;
        select.appendChild(opt);
      });
      return;
    }

    const themes = engine.getBuiltInThemes();
    const custom = engine.getCustomThemes();
    const currentId = engine.getCurrentThemeId() || 'careercanvas-light';

    const grouped = {};
    [...themes, ...custom].forEach(t => {
      const cat = t.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });

    for (const [cat, items] of Object.entries(grouped)) {
      const group = document.createElement('optgroup');
      group.label = cat;
      items.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        if (t.id === currentId) opt.selected = true;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }
  }

  setVal(id, val) {
    const el = this.el.querySelector(`#${id}`);
    if (el) el.value = val;
  }

  setChecked(id, val) {
    const el = this.el.querySelector(`#${id}`);
    if (el) el.checked = val;
  }

  updateAiProviderLabel() {
    const label = this.el.querySelector('#setting-ai-provider');
    if (!label) return;
    const key = (this.el.querySelector('#setting-ai-key')?.value || localStorage.getItem('cc_ai_api_key') || '').trim();
    if (!key) { label.textContent = 'No key saved — cloud AI will use the server proxy when deployed.'; return; }
    const name = key.startsWith('gsk_') ? 'Groq' : 'Gemini';
    label.textContent = `Saved key provider: ${name}.`;
  }

  updateWebgpuStatus() {
    const el = this.el.querySelector('#setting-webgpu-status');
    if (!el) return;
    const ok = typeof navigator !== 'undefined' && !!navigator.gpu;
    el.textContent = ok
      ? 'WebGPU detected — Advanced AI can run on this device (~5 GB download once).'
      : 'WebGPU not detected in this browser — Advanced AI needs Chrome/Edge 113+ with WebGPU.';
  }

  bindEvents() {
    const on = (id, event, handler) => {
      const el = this.el.querySelector(`#${id}`);
      if (el) el.addEventListener(event, handler);
    };

    on('setting-theme', 'change', (e) => {
      const themeId = e.target.value;
      const engine = window.CC && window.CC.themeEngine;
      if (engine) {
        engine.applyTheme(themeId);
        if (window.CC.app && window.CC.app.updateThemeIcon) window.CC.app.updateThemeIcon();
      } else {
        localStorage.setItem('cc_theme', themeId);
        if (themeId === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
          document.documentElement.setAttribute('data-theme', themeId === 'dark' ? 'dark' : 'light');
        }
      }
    });

    on('setting-pagesize', 'change', (e) => {
      localStorage.setItem('cc_default_pagesize', e.target.value);
    });

    on('setting-zoom', 'change', (e) => {
      localStorage.setItem('cc_default_zoom', e.target.value);
    });

    on('setting-autosave', 'change', (e) => {
      localStorage.setItem('cc_autosave', e.target.checked);
    });

    on('setting-charcounts', 'change', (e) => {
      localStorage.setItem('cc_charcounts', e.target.checked);
    });

    on('setting-tips', 'change', (e) => {
      localStorage.setItem('cc_tips', e.target.checked);
    });

    on('setting-spellcheck', 'change', (e) => {
      localStorage.setItem('cc_spellcheck', e.target.checked);
    });

    on('setting-reduce-motion', 'change', (e) => {
      localStorage.setItem('cc_reduce_motion', e.target.checked);
      document.documentElement.classList.toggle('reduce-motion', e.target.checked);
    });

    on('setting-high-contrast', 'change', (e) => {
      localStorage.setItem('cc_high_contrast', e.target.checked);
      document.documentElement.classList.toggle('high-contrast', e.target.checked);
    });

    on('setting-ui-fontsize', 'change', (e) => {
      localStorage.setItem('cc_ui_fontsize', e.target.value);
      document.documentElement.setAttribute('data-ui-fontsize', e.target.value);
    });

    on('setting-local-ai', 'change', (e) => {
      localStorage.setItem('cc_local_ai_enabled', e.target.checked);
      if (window.CC?.toast) window.CC.toast.show(e.target.checked ? 'Local AI enabled (models download on first use)' : 'Local AI disabled', 'info');
    });

    on('setting-advanced-ai', 'change', (e) => {
      if (e.target.checked && !(typeof navigator !== 'undefined' && navigator.gpu)) {
        e.target.checked = false;
        if (window.CC?.toast) window.CC.toast.show('WebGPU not available — Advanced AI needs Chrome/Edge 113+', 'error');
        return;
      }
      localStorage.setItem('cc_advanced_ai_enabled', e.target.checked);
      if (window.CC?.toast) window.CC.toast.show(e.target.checked ? 'Advanced AI enabled (model downloads on first use)' : 'Advanced AI disabled', 'info');
    });

    on('setting-ai-key', 'input', () => this.updateAiProviderLabel());

    const btnKeySave = this.el.querySelector('#btn-ai-key-save');
    if (btnKeySave) {
      btnKeySave.addEventListener('click', async () => {
        const v = this.el.querySelector('#setting-ai-key')?.value.trim() || '';
        if (!v) {
          if (window.CC?.toast) window.CC.toast.show('Paste a key first', 'warning');
          return;
        }
        btnKeySave.disabled = true;
        const original = btnKeySave.textContent;
        btnKeySave.textContent = 'Checking…';
        try {
          const { AiFormatter } = await import('./ai-formatter.js');
          const check = await AiFormatter.validateKey(v);
          if (check.ok) {
            AiFormatter.setApiKey(v);
            this.updateAiProviderLabel();
            if (window.CC?.toast) window.CC.toast.show(`API key valid (${check.provider === 'groq' ? 'Groq' : 'Gemini'})`, 'success');
          } else if (check.offline) {
            AiFormatter.setApiKey(v);
            this.updateAiProviderLabel();
            if (window.CC?.toast) window.CC.toast.show('Could not reach provider (offline?) — key saved anyway', 'warning');
          } else {
            if (window.CC?.toast) window.CC.toast.show(check.error || 'Invalid key — not saved', 'error');
          }
        } finally {
          btnKeySave.disabled = false;
          btnKeySave.textContent = original;
        }
      });
    }

    const btnKeyClear = this.el.querySelector('#btn-ai-key-clear');
    if (btnKeyClear) {
      btnKeyClear.addEventListener('click', () => {
        localStorage.removeItem('cc_ai_api_key');
        const inp = this.el.querySelector('#setting-ai-key');
        if (inp) inp.value = '';
        this.updateAiProviderLabel();
        if (window.CC?.toast) window.CC.toast.show('API key removed', 'info');
      });
    }

    const btnClearLocal = this.el.querySelector('#btn-clear-local-ai');
    if (btnClearLocal) {
      btnClearLocal.addEventListener('click', async () => {
        try {
          if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('cc-local-ai');
          if (window.caches) {
            for (const k of await caches.keys()) {
              if (/transformers|mlc|webllm/i.test(k)) await caches.delete(k);
            }
          }
          if (window.CC?.toast) window.CC.toast.show('Local AI cache cleared', 'success');
        } catch {
          if (window.CC?.toast) window.CC.toast.show('Could not clear cache', 'error');
        }
      });
    }

    const btnExportAll = this.el.querySelector('#btn-export-all');
    if (btnExportAll) {
      btnExportAll.addEventListener('click', async () => {
        try {
          const allData = {};
          const stores = ['documents', 'masterProfile', 'jobDescriptions', 'applications', 'contentLibrary', 'snapshots', 'designPresets'];
          for (const store of stores) {
            try {
              allData[store] = await this.db.getAll(store);
            } catch (e) {
              allData[store] = [];
            }
          }
          allData.preferences = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cc_')) {
              allData.preferences[key] = localStorage.getItem(key);
            }
          }
          allData.exportDate = new Date().toISOString();
          allData.version = '1.0.0';
          allData.type = 'careercanvas-full-backup';

          const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `CareerCanvas_Backup_${new Date().toISOString().split('T')[0]}.json`;
          // Must be in the DOM for Firefox to trigger the download.
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);

          if (window.CC && window.CC.toast) {
            window.CC.toast.show('Backup exported successfully', 'success');
          }
        } catch (err) {
          if (window.CC && window.CC.toast) {
            window.CC.toast.show('Failed to export backup: ' + err.message, 'error');
          }
        }
      });
    }

    const btnImport = this.el.querySelector('#btn-import-backup');
    if (btnImport) {
      btnImport.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            // Accept both backup dialects: settings/app exports
            // ({type:'careercanvas-full-backup', flat store arrays}) and
            // Data & Backup studio exports ({version:number, stores:{...}}
            // or single-category {storeName, data}). See normalizeBackupData().
            const source = normalizeBackupData(data);
            if (!source) {
              if (window.CC && window.CC.toast) {
                window.CC.toast.show('Invalid backup file format', 'error');
              }
              return;
            }
            if (window.CC && window.CC.modal) {
              window.CC.modal.confirm(
                'This will add all documents from the backup. Existing documents will not be overwritten. Continue?',
                async () => {
                  const stores = ['documents', 'masterProfile', 'jobDescriptions', 'applications', 'contentLibrary', 'snapshots', 'designPresets'];
                  let count = 0;
                  for (const store of stores) {
                    if (source[store] && Array.isArray(source[store])) {
                      for (const item of source[store]) {
                        try {
                          // add-only: existing records keep their current data
                          // (as the confirmation dialog promises).
                          await this.db.create(store, item);
                          count++;
                        } catch (e) {
                          // Duplicate key or write error — skip
                        }
                      }
                    }
                  }
                  if (source.preferences) {
                    Object.entries(source.preferences).forEach(([k, v]) => {
                      localStorage.setItem(k, v);
                    });
                  }
                  window.CC.toast.show(`Imported ${count} items from backup`, 'success');
                }
              );
            }
          } catch (err) {
            if (window.CC && window.CC.toast) {
              window.CC.toast.show('Failed to read backup file: ' + err.message, 'error');
            }
          }
        });
        input.click();
      });
    }

    const btnClearArchived = this.el.querySelector('#btn-clear-archived');
    if (btnClearArchived) {
      btnClearArchived.addEventListener('click', () => {
        if (window.CC && window.CC.modal) {
          window.CC.modal.confirm(
            'Permanently delete all archived documents? This cannot be undone.',
            async () => {
              try {
                const docs = await this.db.getAll('documents');
                const archived = docs.filter(d => d.archived);
                for (const doc of archived) {
                  await this.db.delete('documents', doc.id);
                }
                window.CC.toast.show(`Deleted ${archived.length} archived documents`, 'info');
              } catch (err) {
                window.CC.toast.show('Failed to clear archived documents', 'error');
              }
            }
          );
        }
      });
    }

    const btnClearAll = this.el.querySelector('#btn-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        if (window.CC && window.CC.modal) {
          // Two sequential steps (confirm, then type DELETE). Awaited in
          // order — Modal.close() releases state synchronously, so opening
          // the prompt right after the confirm is safe.
          const ok = await window.CC.modal.confirm(
            'PERMANENTLY DELETE ALL DATA? This will remove all documents, career profiles, applications, settings, and cannot be undone. Consider exporting a backup first.',
            null,
            { title: 'Delete All Data', danger: true, confirmLabel: 'Continue' }
          ).catch(() => false);
          if (!ok) return;
          const value = await window.CC.modal.prompt(
            'Are you absolutely sure? Type DELETE to confirm.',
            '',
            { title: 'Final Confirmation' }
          ).catch(() => null);
          if (value !== 'DELETE') {
            window.CC.toast.show('Deletion cancelled — you must type DELETE exactly.', 'warning');
            return;
          }
          try {
            const stores = ['documents', 'masterProfile', 'jobDescriptions', 'applications', 'contentLibrary', 'snapshots', 'images', 'designPresets'];
            for (const store of stores) {
              try {
                await this.db.clear(store);
              } catch (e) { /* ignore */ }
            }
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key.startsWith('cc_')) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            window.CC.toast.show('All data cleared', 'info');
            window.location.hash = '#/dashboard';
            window.location.reload();
          } catch (err) {
            window.CC.toast.show('Failed to clear data', 'error');
          }
        }
      });
    }
  }

  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usedMB = (est.usage / (1024 * 1024)).toFixed(1);
        const quotaMB = (est.quota / (1024 * 1024)).toFixed(0);
        const pct = ((est.usage / est.quota) * 100).toFixed(1);
        return `Using ${usedMB} MB of ${quotaMB} MB (${pct}%)`;
      } catch (e) {
        return 'Storage estimation not available in this browser';
      }
    }
    return 'Storage estimation not available in this browser';
  }

  destroy() {
    this.el = null;
  }
}
