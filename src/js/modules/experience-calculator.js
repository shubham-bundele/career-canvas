import { escapeHtml } from '../utils/sanitize.js';
import { generateId } from '../utils/id.js';
import { jobTitles, companies } from '../data/autocomplete-data.js';

/** Section types whose items carry employment dates (pure, Node-safe). */
export const EXPERIENCE_SECTION_TYPES = new Set([
  'professionalExperience', 'otherExperience', 'internships', 'apprenticeships',
  'researchExperience', 'teachingExperience', 'volunteerExperience',
  'leadershipExperience', 'militaryExperience', 'experience', 'workExperience',
]);

const MONTH_NAME_TO_NUM = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Normalize a resume month value ('March', 'Mar', '3', '03', 3) to '1'-'12' or ''.
 * Pure (unit-tested).
 */
export function normalizeMonth(value) {
  if (value === undefined || value === null) return '';
  const s = String(value).trim().toLowerCase().replace(/\.$/, '');
  if (s === '') return '';
  if (/^(0?[1-9]|1[0-2])$/.test(s)) return String(parseInt(s, 10));
  if (MONTH_NAME_TO_NUM[s] !== undefined) return String(MONTH_NAME_TO_NUM[s]);
  return '';
}

/** Normalize a year value to a 4-digit string or ''. Pure. */
export function normalizeYear(value) {
  const s = String(value ?? '').trim();
  return /^\d{4}$/.test(s) ? s : '';
}

/**
 * Extract dated experience entries from a resume document.
 * Returns exp-calc-shaped rows (new ids). Skips items with no usable dates.
 * Pure (unit-tested).
 */
export function extractExperienceEntries(doc) {
  const rows = [];
  for (const sec of doc?.sections || []) {
    if (!sec || typeof sec !== 'object') continue;
    const t = sec.sectionType || sec.type;
    if (!EXPERIENCE_SECTION_TYPES.has(t)) continue;
    for (const item of sec.items || []) {
      if (!item || typeof item !== 'object') continue;
      const startYear = normalizeYear(item.startYear);
      const endYear = normalizeYear(item.endYear);
      const currentlyWorking = !!item.currentlyWorking;
      if (!startYear) continue; // duration math needs a start year
      if (!currentlyWorking && !endYear) continue;
      const title = [item.jobTitle, item.company].filter((s) => String(s || '').trim()).join(' — ');
      rows.push({
        id: generateId(),
        title,
        startMonth: normalizeMonth(item.startMonth),
        startYear,
        endMonth: currentlyWorking ? '' : normalizeMonth(item.endMonth),
        endYear: currentlyWorking ? '' : endYear,
        currentlyWorking,
      });
    }
  }
  return rows;
}

export class ExperienceCalculator {
  constructor() {
    this.entries = [];
    this.displayMode = 'years';
    this.overlay = null;
    this.onClose = null;
    this.sourceDoc = null;
  }

  show(parentEl = document.body, sourceDoc = null) {
    if (this.overlay) this.close();
    this.sourceDoc = sourceDoc || null;

    this.overlay = document.createElement('div');
    this.overlay.className = 'exp-calc-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Experience Calculator');

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    const popup = document.createElement('div');
    popup.className = 'exp-calc-popup';

    const header = document.createElement('div');
    header.className = 'exp-calc-header';

    const title = document.createElement('h2');
    title.className = 'exp-calc-title';
    title.textContent = 'Experience Calculator';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'exp-calc-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);
    popup.appendChild(header);

    const desc = document.createElement('p');
    desc.className = 'exp-calc-desc';
    desc.textContent = 'Add your work experiences below to calculate your total professional experience.';
    popup.appendChild(desc);

    if (sourceDoc) {
      const prefillBtn = document.createElement('button');
      prefillBtn.className = 'btn btn-ghost btn-sm exp-calc-prefill';
      prefillBtn.textContent = '⤓ Fill from current resume';
      prefillBtn.setAttribute('aria-label', 'Fill entries from the open resume');
      prefillBtn.addEventListener('click', () => this.prefillFromDocument(sourceDoc));
      popup.appendChild(prefillBtn);
    }

    const body = document.createElement('div');
    body.className = 'exp-calc-body';
    body.id = 'exp-calc-body';
    popup.appendChild(body);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-outline btn-sm exp-calc-add';
    addBtn.textContent = '+ Add Experience';
    addBtn.addEventListener('click', () => {
      this.entries.push({
        id: generateId(),
        title: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        currentlyWorking: false
      });
      this.renderEntries();
    });
    popup.appendChild(addBtn);

    const resultArea = document.createElement('div');
    resultArea.className = 'exp-calc-result-area';
    resultArea.id = 'exp-calc-result-area';
    popup.appendChild(resultArea);

    this.overlay.appendChild(popup);
    parentEl.appendChild(this.overlay);

    document.body.style.overflow = 'hidden';

    if (this.entries.length === 0) {
      const prefilled = sourceDoc ? extractExperienceEntries(sourceDoc) : [];
      if (prefilled.length > 0) {
        this.entries = prefilled;
      } else {
        this.entries.push({
          id: generateId(),
          title: '',
          startMonth: '',
          startYear: '',
          endMonth: '',
          endYear: '',
          currentlyWorking: false
        });
      }
    }

    this.renderEntries();
    this.renderResult();

    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this._keyHandler);

    setTimeout(() => {
      const firstInput = popup.querySelector('input[type="text"]');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * Merge resume entries into the current list (skips exact duplicates).
   * @returns {number} entries added
   */
  prefillFromDocument(doc) {
    const rows = extractExperienceEntries(doc);
    if (rows.length === 0) {
      if (typeof window !== 'undefined' && window.CC?.toast) {
        window.CC.toast.show('No dated experience found in this resume', 'info');
      }
      return 0;
    }
    const key = (e) => [e.title, e.startMonth, e.startYear, e.endMonth, e.endYear, !!e.currentlyWorking].join('|');
    const seen = new Set(this.entries.map(key));
    // Drop the single placeholder blank row when real data arrives
    if (this.entries.length === 1) {
      const only = this.entries[0];
      if (!only.title && !only.startYear && !only.endYear) this.entries = [];
    }
    let added = 0;
    for (const r of rows) {
      if (seen.has(key(r))) continue;
      seen.add(key(r));
      this.entries.push(r);
      added++;
    }
    this.renderEntries();
    this.renderResult();
    if (typeof window !== 'undefined' && window.CC?.toast) {
      window.CC.toast.show(
        added > 0 ? `Added ${added} entr${added === 1 ? 'y' : 'ies'} from resume` : 'Resume entries already listed',
        added > 0 ? 'success' : 'info'
      );
    }
    return added;
  }

  close() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.sourceDoc = null;
    document.body.style.overflow = '';
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this.onClose) this.onClose();
  }

  renderEntries() {
    const body = document.getElementById('exp-calc-body');
    if (!body) return;
    body.innerHTML = '';

    const months = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    this.entries.forEach((entry, idx) => {
      const card = document.createElement('div');
      card.className = 'exp-calc-entry';

      const topRow = document.createElement('div');
      topRow.className = 'exp-calc-entry-top';

      const numLabel = document.createElement('span');
      numLabel.className = 'exp-calc-entry-num';
      numLabel.textContent = `#${idx + 1}`;

      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'exp-calc-title-wrapper';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'form-input exp-calc-title-input';
      titleInput.placeholder = 'Role / Company (optional)';
      titleInput.value = entry.title;
      titleInput.maxLength = 100;
      titleInput.setAttribute('autocomplete', 'off');
      titleInput.addEventListener('input', (e) => {
        entry.title = e.target.value;
        this._showSuggestions(titleWrapper, titleInput, e.target.value, entry);
      });
      titleInput.addEventListener('focus', () => {
        if (titleInput.value.length >= 2) {
          this._showSuggestions(titleWrapper, titleInput, titleInput.value, entry);
        }
      });
      titleInput.addEventListener('keydown', (e) => {
        this._handleSuggestionKeys(e, titleWrapper, titleInput, entry);
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-ghost btn-sm exp-calc-remove';
      removeBtn.setAttribute('aria-label', 'Remove entry');
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => {
        this.entries.splice(idx, 1);
        if (this.entries.length === 0) {
          this.entries.push({
            id: generateId(),
            title: '',
            startMonth: '',
            startYear: '',
            endMonth: '',
            endYear: '',
            currentlyWorking: false
          });
        }
        this.renderEntries();
        this.renderResult();
      });

      titleWrapper.appendChild(titleInput);
      topRow.appendChild(numLabel);
      topRow.appendChild(titleWrapper);
      topRow.appendChild(removeBtn);
      card.appendChild(topRow);

      const dateRow = document.createElement('div');
      dateRow.className = 'exp-calc-dates';

      const startGroup = this.createDateGroup('Start', entry.startMonth, entry.startYear, months,
        (val) => { entry.startMonth = val; this.renderResult(); },
        (val) => { entry.startYear = val; this.renderResult(); }
      );

      const arrow = document.createElement('span');
      arrow.className = 'exp-calc-arrow';
      arrow.textContent = '→';

      const endGroup = this.createDateGroup('End', entry.endMonth, entry.endYear, months,
        (val) => { entry.endMonth = val; this.renderResult(); },
        (val) => { entry.endYear = val; this.renderResult(); },
        entry.currentlyWorking
      );

      dateRow.appendChild(startGroup);
      dateRow.appendChild(arrow);
      dateRow.appendChild(endGroup);
      card.appendChild(dateRow);

      const currentRow = document.createElement('div');
      currentRow.className = 'exp-calc-current-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `current-${entry.id}`;
      checkbox.checked = entry.currentlyWorking;
      checkbox.addEventListener('change', (e) => {
        entry.currentlyWorking = e.target.checked;
        this.renderEntries();
        this.renderResult();
      });

      const checkLabel = document.createElement('label');
      checkLabel.setAttribute('for', `current-${entry.id}`);
      checkLabel.textContent = 'I currently work here';

      currentRow.appendChild(checkbox);
      currentRow.appendChild(checkLabel);
      card.appendChild(currentRow);

      const durationLabel = document.createElement('div');
      durationLabel.className = 'exp-calc-entry-duration';
      const dur = this.calculateEntryDuration(entry);
      if (dur !== null) {
        durationLabel.textContent = this.formatDuration(dur);
        durationLabel.classList.add('exp-calc-entry-duration--active');
      } else {
        durationLabel.textContent = 'Enter start and end dates';
      }
      card.appendChild(durationLabel);

      body.appendChild(card);
    });
  }

  createDateGroup(label, monthVal, yearVal, months, onMonthChange, onYearChange, disabled = false) {
    const group = document.createElement('div');
    group.className = 'exp-calc-date-group';

    const lbl = document.createElement('span');
    lbl.className = 'exp-calc-date-label';
    lbl.textContent = label;
    group.appendChild(lbl);

    const fields = document.createElement('div');
    fields.className = 'exp-calc-date-fields';

    const monthSelect = document.createElement('select');
    monthSelect.className = 'form-select exp-calc-month';
    monthSelect.disabled = disabled;
    months.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i === 0 ? '' : String(i);
      opt.textContent = i === 0 ? 'Month' : m;
      if ((i === 0 && monthVal === '') || String(i) === String(monthVal)) {
        opt.selected = true;
      }
      monthSelect.appendChild(opt);
    });
    monthSelect.addEventListener('change', (e) => onMonthChange(e.target.value));

    const yearInput = document.createElement('input');
    yearInput.type = 'number';
    yearInput.className = 'form-input exp-calc-year';
    yearInput.placeholder = 'Year';
    yearInput.min = 1950;
    yearInput.max = 2100;
    yearInput.value = yearVal;
    yearInput.disabled = disabled;
    yearInput.addEventListener('input', (e) => {
      const v = e.target.value;
      if (v.length <= 4) onYearChange(v);
    });

    fields.appendChild(monthSelect);
    fields.appendChild(yearInput);
    group.appendChild(fields);

    if (disabled) {
      const now = document.createElement('span');
      now.className = 'exp-calc-present';
      now.textContent = 'Present';
      group.appendChild(now);
    }

    return group;
  }

  calculateEntryDuration(entry) {
    const startYear = parseInt(entry.startYear, 10);
    if (isNaN(startYear)) return null;

    const startMonth = parseInt(entry.startMonth, 10) || 1;

    let endYear, endMonth;
    if (entry.currentlyWorking) {
      const now = new Date();
      endYear = now.getFullYear();
      endMonth = now.getMonth() + 1;
    } else {
      endYear = parseInt(entry.endYear, 10);
      if (isNaN(endYear)) return null;
      endMonth = parseInt(entry.endMonth, 10) || 1;
    }

    let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
    if (totalMonths < 0) totalMonths = 0;

    return totalMonths;
  }

  calculateTotal() {
    let totalMonths = 0;
    let validEntries = 0;

    const ranges = [];
    for (const entry of this.entries) {
      const dur = this.calculateEntryDuration(entry);
      if (dur !== null && dur >= 0) {
        const startYear = parseInt(entry.startYear, 10);
        const startMonth = parseInt(entry.startMonth, 10) || 1;
        let endYear, endMonth;
        if (entry.currentlyWorking) {
          const now = new Date();
          endYear = now.getFullYear();
          endMonth = now.getMonth() + 1;
        } else {
          endYear = parseInt(entry.endYear, 10);
          endMonth = parseInt(entry.endMonth, 10) || 1;
        }
        const startVal = startYear * 12 + startMonth;
        const endVal = endYear * 12 + endMonth;
        if (endVal >= startVal) {
          ranges.push({ start: startVal, end: endVal });
          validEntries++;
        }
      }
    }

    if (ranges.length === 0) return { totalMonths: 0, validEntries: 0, overlapping: false };

    ranges.sort((a, b) => a.start - b.start);

    const merged = [{ ...ranges[0] }];
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      if (ranges[i].start < last.end) {
        last.end = Math.max(last.end, ranges[i].end);
      } else {
        merged.push({ ...ranges[i] });
      }
    }

    const overlapping = merged.length < ranges.length;
    totalMonths = merged.reduce((sum, r) => sum + (r.end - r.start), 0);

    return { totalMonths, validEntries, overlapping };
  }

  formatDuration(months) {
    if (months === 0) return '0 months';
    const years = Math.floor(months / 12);
    const rem = months % 12;

    if (this.displayMode === 'months') {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (rem > 0) parts.push(`${rem} month${rem !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  renderResult() {
    const area = document.getElementById('exp-calc-result-area');
    if (!area) return;
    area.innerHTML = '';

    const result = this.calculateTotal();

    const resultBox = document.createElement('div');
    resultBox.className = 'exp-calc-result';

    const totalLabel = document.createElement('div');
    totalLabel.className = 'exp-calc-result-label';
    totalLabel.textContent = 'Total Experience';

    const totalValue = document.createElement('div');
    totalValue.className = 'exp-calc-result-value';
    if (result.validEntries === 0) {
      totalValue.textContent = '—';
      totalValue.classList.add('exp-calc-result-value--empty');
    } else {
      totalValue.textContent = this.formatDuration(result.totalMonths);
    }

    const toggleRow = document.createElement('div');
    toggleRow.className = 'exp-calc-toggle-row';

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'exp-calc-toggle-label';
    toggleLabel.textContent = 'Display as:';

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'exp-calc-toggle-group';

    const yearsBtn = document.createElement('button');
    yearsBtn.className = 'exp-calc-toggle-btn' + (this.displayMode === 'years' ? ' exp-calc-toggle-btn--active' : '');
    yearsBtn.textContent = 'Years & Months';
    yearsBtn.addEventListener('click', () => {
      this.displayMode = 'years';
      this.renderEntries();
      this.renderResult();
    });

    const monthsBtn = document.createElement('button');
    monthsBtn.className = 'exp-calc-toggle-btn' + (this.displayMode === 'months' ? ' exp-calc-toggle-btn--active' : '');
    monthsBtn.textContent = 'Months Only';
    monthsBtn.addEventListener('click', () => {
      this.displayMode = 'months';
      this.renderEntries();
      this.renderResult();
    });

    toggleGroup.appendChild(yearsBtn);
    toggleGroup.appendChild(monthsBtn);
    toggleRow.appendChild(toggleLabel);
    toggleRow.appendChild(toggleGroup);

    resultBox.appendChild(totalLabel);
    resultBox.appendChild(totalValue);
    resultBox.appendChild(toggleRow);

    if (result.overlapping) {
      const note = document.createElement('div');
      note.className = 'exp-calc-note';
      note.textContent = 'Overlapping periods detected — merged automatically so experience is not double-counted.';
      resultBox.appendChild(note);
    }

    if (result.validEntries > 0) {
      const summary = document.createElement('div');
      summary.className = 'exp-calc-summary';
      summary.textContent = `Based on ${result.validEntries} experience${result.validEntries !== 1 ? 's' : ''}`;
      resultBox.appendChild(summary);
    }

    area.appendChild(resultBox);
  }

  _getSuggestions(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const combined = [...jobTitles, ...companies];
    const matches = combined.filter(item => item.toLowerCase().includes(q));
    const starts = matches.filter(m => m.toLowerCase().startsWith(q));
    const contains = matches.filter(m => !m.toLowerCase().startsWith(q));
    return [...starts, ...contains].slice(0, 6);
  }

  _showSuggestions(wrapper, input, query, entry) {
    this._closeSuggestions(wrapper);
    const items = this._getSuggestions(query);
    if (items.length === 0) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'exp-calc-suggestions';
    dropdown.setAttribute('role', 'listbox');
    dropdown.id = 'exp-calc-suggest-' + Date.now();
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', dropdown.id);

    items.forEach((text, i) => {
      const item = document.createElement('div');
      item.className = 'exp-calc-suggestion-item';
      item.setAttribute('role', 'option');
      item.setAttribute('data-index', i);
      item.textContent = text;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = text;
        if (entry) entry.title = text;
        this._closeSuggestions(wrapper);
      });
      dropdown.appendChild(item);
    });

    wrapper.appendChild(dropdown);

    const closeFn = (e) => {
      if (!wrapper.contains(e.target)) {
        this._closeSuggestions(wrapper);
        document.removeEventListener('click', closeFn);
      }
    };
    setTimeout(() => document.addEventListener('click', closeFn), 0);
    wrapper._closeFn = closeFn;
  }

  _closeSuggestions(wrapper) {
    const existing = wrapper.querySelector('.exp-calc-suggestions');
    if (existing) existing.remove();
    if (wrapper._closeFn) {
      document.removeEventListener('click', wrapper._closeFn);
      wrapper._closeFn = null;
    }
  }

  _handleSuggestionKeys(e, wrapper, input, entry) {
    const dropdown = wrapper.querySelector('.exp-calc-suggestions');
    if (!dropdown) return;

    const items = dropdown.querySelectorAll('.exp-calc-suggestion-item');
    if (items.length === 0) return;

    const active = dropdown.querySelector('.exp-calc-suggestion-item--active');
    let activeIdx = active ? parseInt(active.getAttribute('data-index')) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach(it => it.classList.remove('exp-calc-suggestion-item--active'));
      items[activeIdx].classList.add('exp-calc-suggestion-item--active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      items.forEach(it => it.classList.remove('exp-calc-suggestion-item--active'));
      items[activeIdx].classList.add('exp-calc-suggestion-item--active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      const text = items[activeIdx].textContent;
      input.value = text;
      entry.title = text;
      this._closeSuggestions(wrapper);
    } else if (e.key === 'Escape') {
      this._closeSuggestions(wrapper);
    }
  }

  destroy() {
    this.close();
    this.entries = [];
  }
}
