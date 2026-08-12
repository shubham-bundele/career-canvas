/**
 * Autocomplete Module
 * Local-first with optional internet enhancement
 * Falls back to built-in data when offline
 */

import { getSuggestions } from '../data/autocomplete-data.js';
import { escapeHtml } from '../utils/sanitize.js';

const DEBOUNCE_MS = 200;
const ONLINE_TIMEOUT_MS = 2000;
const MAX_RESULTS = 8;

const ONLINE_ENDPOINTS = {
  company: { url: 'https://autocomplete.clearbit.com/v1/companies/suggest?query=', parser: 'clearbit' },
  institution: { url: 'http://universities.hipolabs.com/search?name=', parser: 'universities' },
};

export function isOnlineSuggestionsEnabled() {
  return localStorage.getItem('cc_online_suggestions') !== 'false';
}

export function setOnlineSuggestions(enabled) {
  localStorage.setItem('cc_online_suggestions', String(enabled));
}

let activeDropdown = null;

export class Autocomplete {
  static attach(input, fieldType, options = {}) {
    const instance = new Autocomplete(input, fieldType, options);
    return instance;
  }

  constructor(input, fieldType, options = {}) {
    this.input = input;
    this.fieldType = fieldType;
    this.onSelect = options.onSelect || null;
    this.dropdown = null;
    this.items = [];
    this.selectedIndex = -1;
    this.debounceTimer = null;
    this.abortController = null;

    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-expanded', 'false');

    this.handleInput = this.handleInput.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleKeydown);
    this.input.addEventListener('blur', this.handleBlur);
  }

  handleInput() {
    if (this._justSelected) {
      this._justSelected = false;
      return;
    }
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.fetchSuggestions(), DEBOUNCE_MS);
  }

  async fetchSuggestions() {
    const query = this.input.value.trim();
    if (query.length < 1) {
      this.close();
      return;
    }

    let localResults = getSuggestions(this.fieldType, query);

    let onlineResults = [];
    if (navigator.onLine && isOnlineSuggestionsEnabled() && ONLINE_ENDPOINTS[this.fieldType]) {
      try {
        onlineResults = await this.fetchOnline(query);
      } catch (e) {
        // Silently fall back to local
      }
    }

    // Merge: online first (deduplicated), then local
    const seen = new Set();
    const merged = [];

    for (const item of onlineResults) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ text: item.name, subtitle: item.domain || '', source: 'online', logo: item.logo || '' });
      }
    }

    for (const item of localResults) {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ text: item, subtitle: '', source: 'local', logo: '' });
      }
    }

    this.items = merged.slice(0, MAX_RESULTS);
    this.selectedIndex = -1;

    if (this.items.length > 0) {
      this.renderDropdown();
    } else {
      this.close();
    }
  }

  async fetchOnline(query) {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    const config = ONLINE_ENDPOINTS[this.fieldType];
    if (!config) return [];

    try {
      const response = await Promise.race([
        fetch(config.url + encodeURIComponent(query), {
          signal: this.abortController.signal,
          mode: 'cors'
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ONLINE_TIMEOUT_MS))
      ]);

      if (!response.ok) return [];
      const data = await response.json();

      if (!Array.isArray(data)) return [];

      switch (config.parser) {
        case 'clearbit':
          return data.map(item => ({
            name: item.name || '',
            domain: item.domain || '',
            logo: item.logo || ''
          })).filter(i => i.name);

        case 'universities':
          return data.slice(0, 10).map(item => ({
            name: item.name || '',
            domain: item.web_pages?.[0] || item.domains?.[0] || '',
            logo: ''
          })).filter(i => i.name);

        case 'datamuse':
          return data.slice(0, 10).map(item => ({
            name: item.word || item,
            domain: '',
            logo: ''
          })).filter(i => i.name);

        default:
          return data.slice(0, 10).map(item => ({
            name: typeof item === 'string' ? item : (item.name || item.word || item.title || ''),
            domain: '',
            logo: ''
          })).filter(i => i.name);
      }
    } catch (e) {
      return [];
    }
  }

  renderDropdown() {
    this.close();

    if (activeDropdown && activeDropdown !== this) {
      activeDropdown.close();
    }
    activeDropdown = this;

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';
    this.dropdown.setAttribute('role', 'listbox');

    this.items.forEach((item, index) => {
      const option = document.createElement('div');
      option.className = 'autocomplete-item';
      option.setAttribute('role', 'option');
      option.dataset.index = index;

      if (item.logo) {
        const logo = document.createElement('img');
        logo.className = 'autocomplete-logo';
        logo.src = item.logo;
        logo.width = 20;
        logo.height = 20;
        logo.alt = '';
        logo.onerror = () => logo.style.display = 'none';
        option.appendChild(logo);
      }

      const textWrap = document.createElement('div');
      textWrap.className = 'autocomplete-text';

      const mainText = document.createElement('span');
      mainText.className = 'autocomplete-main';
      mainText.innerHTML = this.highlightMatch(item.text, this.input.value);
      textWrap.appendChild(mainText);

      if (item.subtitle) {
        const sub = document.createElement('span');
        sub.className = 'autocomplete-sub';
        sub.textContent = item.subtitle;
        textWrap.appendChild(sub);
      }

      option.appendChild(textWrap);

      option.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectItem(index);
      });

      option.addEventListener('mouseover', () => {
        this.selectedIndex = index;
        this.updateSelection();
      });

      this.dropdown.appendChild(option);
    });

    // Position dropdown below input
    const rect = this.input.getBoundingClientRect();
    this.dropdown.style.position = 'fixed';
    this.dropdown.style.top = `${rect.bottom + 4}px`;
    this.dropdown.style.left = `${Math.max(8, rect.left)}px`;
    this.dropdown.style.width = `${Math.min(rect.width, window.innerWidth - 16)}px`;
    this.dropdown.style.maxWidth = 'calc(100vw - 16px)';
    this.dropdown.style.zIndex = '600';

    document.body.appendChild(this.dropdown);
    this.input.setAttribute('aria-expanded', 'true');
  }

  highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>');
  }

  updateSelection() {
    if (!this.dropdown) return;
    const items = this.dropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  selectItem(index) {
    const item = this.items[index];
    if (!item) return;

    this._justSelected = true;
    this.input.value = item.text;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));

    if (this.onSelect) {
      this.onSelect(item.text, item);
    }

    this.close();
  }

  handleKeydown(e) {
    if (!this.dropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
        this.updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          this.selectItem(this.selectedIndex);
        }
        break;
      case 'Escape':
        this.close();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  handleBlur() {
    setTimeout(() => this.close(), 150);
  }

  close() {
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
    this.selectedIndex = -1;
    this.input.setAttribute('aria-expanded', 'false');
    if (activeDropdown === this) activeDropdown = null;
  }

  destroy() {
    this.close();
    clearTimeout(this.debounceTimer);
    if (this.abortController) this.abortController.abort();
    this.input.removeEventListener('input', this.handleInput);
    this.input.removeEventListener('keydown', this.handleKeydown);
    this.input.removeEventListener('blur', this.handleBlur);
  }
}
