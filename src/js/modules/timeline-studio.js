/**
 * Career Timeline Studio
 * Visualizes career events chronologically, detects gaps and overlaps,
 * supports custom events, filtering, and JSON export.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';

/** Section types that map to Employment events */
const EMPLOYMENT_SECTIONS = [
  'professionalExperience', 'otherExperience', 'internships',
  'apprenticeships', 'experience'
];

/** Section types that map to Education events */
const EDUCATION_SECTIONS = ['education'];

/** Section types that map to Project events */
const PROJECT_SECTIONS = ['projects', 'openSourceContributions'];

/** Section types that map to Certification events */
const CERTIFICATION_SECTIONS = ['certifications', 'licenses', 'courses', 'training'];

/** Section types that map to Volunteer events */
const VOLUNTEER_SECTIONS = [
  'volunteerExperience', 'communityActivities',
  'leadershipExperience', 'volunteer'
];

/** All event types */
const EVENT_TYPES = ['Employment', 'Education', 'Project', 'Certification', 'Volunteer', 'Gap'];

/** Human-readable labels for event types */
const EVENT_TYPE_LABELS = {
  Employment: 'Employment',
  Education: 'Education',
  Project: 'Project',
  Certification: 'Certification',
  Volunteer: 'Volunteer',
  Gap: 'Gap'
};

/** Month name map for parsing */
const MONTH_NAMES = {
  january: 0, february: 1, march: 2, april: 3,
  may: 4, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3,
  jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const STORAGE_KEY = 'cc_timeline_events';

// ---------------------------------------------------------------------------
// Date parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parses a flexible date value into a Date object.
 * Supports: YYYY-MM, YYYY-MM-DD, "Month YYYY", "Mon YYYY", YYYY,
 * startMonth+startYear combo, and the literal "present".
 * Returns null when unparseable.
 */
function parseFlexDate(value, fallbackMonth) {
  if (!value && value !== 0) return null;

  const str = String(value).trim().toLowerCase();
  if (!str || str === 'present' || str === 'current') return null;

  // YYYY-MM-DD
  const isoFull = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoFull) return new Date(+isoFull[1], +isoFull[2] - 1, +isoFull[3]);

  // YYYY-MM
  const isoMonth = str.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMonth) return new Date(+isoMonth[1], +isoMonth[2] - 1, 1);

  // "Month YYYY" or "Mon YYYY"
  const monthYear = str.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const m = MONTH_NAMES[monthYear[1]];
    if (m !== undefined) return new Date(+monthYear[2], m, 1);
  }

  // Bare year
  const bareYear = str.match(/^(\d{4})$/);
  if (bareYear) {
    const month = (typeof fallbackMonth === 'number') ? fallbackMonth : 0;
    return new Date(+bareYear[1], month, 1);
  }

  return null;
}

/**
 * Resolves a month name (e.g. "March") to a 0-based month index.
 */
function monthNameToIndex(name) {
  if (!name) return null;
  const idx = MONTH_NAMES[String(name).trim().toLowerCase()];
  return idx !== undefined ? idx : null;
}

/**
 * Builds a Date from separate month-name and year fields used
 * by work-experience items in the schema.
 */
function dateFromMonthYear(monthName, year) {
  if (!year) return null;
  const y = parseInt(year, 10);
  if (isNaN(y)) return null;
  const m = monthNameToIndex(monthName);
  return new Date(y, m !== null ? m : 0, 1);
}

/**
 * Formats a Date as "Mon YYYY".
 */
function formatDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Computes a human-readable duration between two dates.
 */
function durationBetween(start, end) {
  if (!start || !end) return '';
  const ms = end - start;
  if (ms < 0) return '';
  const totalMonths = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  return parts.join(' ') || '< 1 mo';
}

// ---------------------------------------------------------------------------
// TimelineStudio class
// ---------------------------------------------------------------------------

export class TimelineStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];

    // State
    this.allEvents = [];       // unified event list
    this.filteredEvents = [];  // after filter applied
    this.customEvents = [];    // user-created custom events
    this.gaps = [];
    this.overlaps = [];
    this.currentView = 'timeline'; // 'timeline' | 'list'
    this.filterType = 'all';
    this.searchQuery = '';
    this.addFormOpen = false;
    this.selectedEventId = null;
    this.exportMenuOpen = false;
  }

  // ==================== Listener helpers ====================

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  destroy() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.allEvents = [];
    this.filteredEvents = [];
    this.gaps = [];
    this.overlaps = [];
  }

  hasUnsavedChanges() {
    return false;
  }

  // ==================== Main render ====================

  async render() {
    this.container = createElement('div', '', { class: 'timeline-studio-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Career Timeline Studio');

    const header = this.renderHeader();
    this.container.appendChild(header);

    const content = createElement('div', '', { class: 'timeline-studio-content' });
    content.setAttribute('id', 'ts-content');
    this.container.appendChild(content);

    await this.loadData();
    this.applyFilter();
    this.renderContent();

    return this.container;
  }

  // ==================== Header ====================

  renderHeader() {
    const header = createElement('div', '', { class: 'timeline-studio-header' });

    // Breadcrumb
    const breadcrumb = createElement('nav', '', {
      class: 'timeline-studio-breadcrumb',
      'aria-label': 'Breadcrumb'
    });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });

    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcHomeLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcHomeLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcHomeLink);
    bcList.appendChild(bcHome);

    const bcSep = createElement('li', '/', {
      class: 'breadcrumb-separator',
      'aria-hidden': 'true'
    });
    bcList.appendChild(bcSep);

    const bcCurrent = createElement('li', 'Career Timeline', {
      class: 'breadcrumb-item breadcrumb-current',
      'aria-current': 'page'
    });
    bcList.appendChild(bcCurrent);

    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // Title row
    const titleRow = createElement('div', '', { class: 'timeline-studio-title-row' });

    const titleGroup = createElement('div', '', { class: 'timeline-studio-title-group' });
    const title = createElement('h1', 'Career Timeline Studio', {
      class: 'timeline-studio-title'
    });
    titleGroup.appendChild(title);

    const subtitle = createElement('p',
      'Visualize your career journey across all documents. See employment, education, projects, and certifications on a single timeline. Detect gaps and overlaps at a glance.',
      { class: 'timeline-studio-subtitle' }
    );
    titleGroup.appendChild(subtitle);
    titleRow.appendChild(titleGroup);

    // Back button
    const backBtn = createElement('button', '', {
      class: 'btn btn-sm btn-outline timeline-studio-back-btn',
      'aria-label': 'Back to Dashboard'
    });
    backBtn.innerHTML = '&#8592; Dashboard';
    this.addListener(backBtn, 'click', () => {
      if (window.CC && window.CC.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    titleRow.appendChild(backBtn);

    header.appendChild(titleRow);
    return header;
  }

  // ==================== Data loading ====================

  async loadData() {
    this.loadCustomEvents();

    let documents = [];
    try {
      documents = await this.db.getAll('documents');
    } catch (e) {
      // db unavailable -- continue with custom events only
    }

    const docEvents = [];
    if (documents && documents.length) {
      for (const doc of documents) {
        if (!doc.sections || !Array.isArray(doc.sections)) continue;
        for (const section of doc.sections) {
          const sType = section.type || section.sectionType || '';
          const eventType = this.sectionTypeToEventType(sType);
          if (!eventType) continue;
          if (!section.items || !Array.isArray(section.items)) continue;
          for (const item of section.items) {
            const evt = this.itemToEvent(item, eventType, doc.name);
            if (evt) docEvents.push(evt);
          }
        }
      }
    }

    this.allEvents = [...docEvents, ...this.customEvents];
    this.detectGapsAndOverlaps();
  }

  sectionTypeToEventType(sType) {
    if (EMPLOYMENT_SECTIONS.includes(sType)) return 'Employment';
    if (EDUCATION_SECTIONS.includes(sType)) return 'Education';
    if (PROJECT_SECTIONS.includes(sType)) return 'Project';
    if (CERTIFICATION_SECTIONS.includes(sType)) return 'Certification';
    if (VOLUNTEER_SECTIONS.includes(sType)) return 'Volunteer';
    return null;
  }

  /**
   * Converts a document section item to a unified timeline event.
   */
  itemToEvent(item, type, documentName) {
    let start = null;
    let end = null;
    let title = '';
    let organization = '';
    let description = '';
    let isPresent = false;

    switch (type) {
      case 'Employment':
        title = item.jobTitle || item.title || '';
        organization = item.company || '';
        description = item.roleSummary || item.responsibilities || '';
        start = dateFromMonthYear(item.startMonth, item.startYear);
        if (!start) start = parseFlexDate(item.startDate);
        isPresent = !!item.currentlyWorking;
        if (!isPresent) {
          end = dateFromMonthYear(item.endMonth, item.endYear);
          if (!end) end = parseFlexDate(item.endDate);
        }
        break;

      case 'Education':
        title = [item.degree, item.qualification, item.specialization]
          .filter(Boolean).join(' - ') || item.degree || '';
        organization = item.institution || '';
        description = item.description || '';
        start = parseFlexDate(item.startDate);
        isPresent = !!item.currentlyStudying;
        if (!isPresent) end = parseFlexDate(item.endDate);
        break;

      case 'Project':
        title = item.projectName || item.title || '';
        organization = item.role || '';
        description = item.summary || item.description || '';
        start = parseFlexDate(item.startDate);
        isPresent = !!item.currentProject;
        if (!isPresent) end = parseFlexDate(item.endDate);
        break;

      case 'Certification':
        title = item.name || '';
        organization = item.issuer || item.issuingOrganization || '';
        description = item.description || '';
        start = parseFlexDate(item.date || item.issueDate || item.dateObtained);
        end = parseFlexDate(item.expiryDate || item.expirationDate);
        break;

      case 'Volunteer':
        title = item.role || item.title || '';
        organization = item.organization || '';
        description = item.description || '';
        start = parseFlexDate(item.startDate);
        isPresent = !!(item.current || item.currentlyVolunteering);
        if (!isPresent) end = parseFlexDate(item.endDate);
        break;

      default:
        return null;
    }

    if (!start) return null; // need at least a start date

    if (isPresent || !end) {
      end = new Date();
    }

    return {
      id: item.id || generateUUID(),
      title: title || '(Untitled)',
      type,
      startDate: start,
      endDate: end,
      isPresent,
      organization,
      description,
      documentName: documentName || '',
      isCustom: false
    };
  }

  // ==================== Custom events (localStorage) ====================

  loadCustomEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.customEvents = parsed.map(e => ({
            ...e,
            startDate: new Date(e.startDate),
            endDate: e.endDate ? new Date(e.endDate) : new Date(),
            isCustom: true
          }));
          return;
        }
      }
    } catch (e) { /* ignore */ }
    this.customEvents = [];
  }

  saveCustomEvents() {
    try {
      const serializable = this.customEvents.map(e => ({
        id: e.id,
        title: e.title,
        type: e.type,
        startDate: e.startDate.toISOString(),
        endDate: e.isPresent ? 'present' : e.endDate.toISOString(),
        description: e.description || '',
        organization: e.organization || '',
        isCustom: true,
        createdAt: e.createdAt || new Date().toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) { /* ignore */ }
  }

  addCustomEvent(data) {
    const start = parseFlexDate(data.startDate);
    if (!start) return false;

    const isPresent = (data.endDate || '').toLowerCase() === 'present' || !data.endDate;
    const end = isPresent ? new Date() : parseFlexDate(data.endDate);
    if (!end) return false;

    const evt = {
      id: generateUUID(),
      title: data.title || '(Untitled)',
      type: data.type || 'Employment',
      startDate: start,
      endDate: end,
      isPresent,
      organization: data.organization || '',
      description: data.description || '',
      documentName: '',
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    this.customEvents.push(evt);
    this.saveCustomEvents();
    this.allEvents.push(evt);
    this.detectGapsAndOverlaps();
    this.applyFilter();
    this.renderContent();
    return true;
  }

  removeCustomEvent(id) {
    this.customEvents = this.customEvents.filter(e => e.id !== id);
    this.saveCustomEvents();
    this.allEvents = this.allEvents.filter(e => e.id !== id);
    this.detectGapsAndOverlaps();
    this.applyFilter();
    this.renderContent();
  }

  // ==================== Gap & overlap detection ====================

  detectGapsAndOverlaps() {
    this.gaps = [];
    this.overlaps = [];

    // Only consider Employment events for gap/overlap detection
    const empEvents = this.allEvents
      .filter(e => e.type === 'Employment')
      .sort((a, b) => a.startDate - b.startDate);

    if (empEvents.length < 2) return;

    for (let i = 0; i < empEvents.length - 1; i++) {
      const current = empEvents[i];
      const next = empEvents[i + 1];

      const currentEnd = current.endDate;
      const nextStart = next.startDate;

      // Gap: more than 30 days between current end and next start
      if (nextStart > currentEnd) {
        const diffMs = nextStart - currentEnd;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 30) {
          this.gaps.push({
            id: generateUUID(),
            startDate: currentEnd,
            endDate: nextStart,
            duration: durationBetween(currentEnd, nextStart),
            beforeEvent: current.title,
            afterEvent: next.title
          });
        }
      }

      // Overlap: current end is after next start
      if (currentEnd > nextStart) {
        const overlapEnd = currentEnd < next.endDate ? currentEnd : next.endDate;
        this.overlaps.push({
          id: generateUUID(),
          startDate: nextStart,
          endDate: overlapEnd,
          duration: durationBetween(nextStart, overlapEnd),
          events: [current.title, next.title]
        });
      }
    }
  }

  // ==================== Filtering ====================

  applyFilter() {
    let events = [...this.allEvents];

    if (this.filterType !== 'all') {
      events = events.filter(e => e.type === this.filterType);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      events = events.filter(e => {
        const searchable = [e.title, e.organization, e.description, e.type, e.documentName]
          .join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }

    // Sort by start date descending (most recent first)
    events.sort((a, b) => b.startDate - a.startDate);

    this.filteredEvents = events;
  }

  // ==================== Content rendering ====================

  renderContent() {
    const content = this.container.querySelector('#ts-content');
    if (!content) return;
    content.innerHTML = '';

    // Toolbar
    const toolbar = this.renderToolbar();
    content.appendChild(toolbar);

    // Add event panel
    const addPanel = this.renderAddEventPanel();
    content.appendChild(addPanel);

    // Summary stats
    if (this.allEvents.length > 0) {
      const summary = this.renderSummary();
      content.appendChild(summary);

      // Legend
      const legend = this.renderLegend();
      content.appendChild(legend);
    }

    // Main view
    if (this.filteredEvents.length === 0 && this.allEvents.length === 0) {
      content.appendChild(this.renderEmptyState());
    } else if (this.filteredEvents.length === 0) {
      content.appendChild(this.renderNoResults());
    } else if (this.currentView === 'timeline') {
      content.appendChild(this.renderTimelineView());
    } else {
      content.appendChild(this.renderListView());
    }

    // Warnings (gaps/overlaps)
    if ((this.gaps.length > 0 || this.overlaps.length > 0) && this.filterType === 'all') {
      content.appendChild(this.renderWarnings());
    }

    // Privacy note
    content.appendChild(this.renderPrivacyNote());
  }

  // ==================== Toolbar ====================

  renderToolbar() {
    const toolbar = createElement('div', '', { class: 'ts-toolbar' });

    const left = createElement('div', '', { class: 'ts-toolbar-left' });

    // View toggle
    const viewToggle = createElement('div', '', {
      class: 'ts-view-toggle',
      role: 'tablist',
      'aria-label': 'View mode'
    });

    const timelineBtn = createElement('button', 'Timeline', {
      class: `ts-view-toggle-btn${this.currentView === 'timeline' ? ' active' : ''}`,
      role: 'tab',
      'aria-selected': this.currentView === 'timeline' ? 'true' : 'false',
      'aria-controls': 'ts-main-view'
    });
    this.addListener(timelineBtn, 'click', () => {
      this.currentView = 'timeline';
      this.renderContent();
    });
    viewToggle.appendChild(timelineBtn);

    const listBtn = createElement('button', 'List', {
      class: `ts-view-toggle-btn${this.currentView === 'list' ? ' active' : ''}`,
      role: 'tab',
      'aria-selected': this.currentView === 'list' ? 'true' : 'false',
      'aria-controls': 'ts-main-view'
    });
    this.addListener(listBtn, 'click', () => {
      this.currentView = 'list';
      this.renderContent();
    });
    viewToggle.appendChild(listBtn);
    left.appendChild(viewToggle);

    toolbar.appendChild(left);

    const right = createElement('div', '', { class: 'ts-toolbar-right' });

    // Filter bar
    const filterBar = this.renderFilterBar();
    right.appendChild(filterBar);

    // Export button
    const exportWrapper = createElement('div', '', { class: 'ts-export-wrapper' });
    const exportBtn = createElement('button', 'Export', {
      class: 'btn btn-sm btn-outline',
      'aria-label': 'Export timeline',
      'aria-expanded': 'false',
      'aria-haspopup': 'true'
    });
    this.addListener(exportBtn, 'click', () => {
      this.exportMenuOpen = !this.exportMenuOpen;
      exportBtn.setAttribute('aria-expanded', String(this.exportMenuOpen));
      const menu = exportWrapper.querySelector('.ts-export-menu');
      if (menu) {
        menu.style.display = this.exportMenuOpen ? 'block' : 'none';
      }
    });
    exportWrapper.appendChild(exportBtn);

    const exportMenu = createElement('div', '', { class: 'ts-export-menu' });
    exportMenu.style.display = 'none';

    const exportJsonBtn = createElement('button', 'Export as JSON', {
      class: 'ts-export-menu-item'
    });
    this.addListener(exportJsonBtn, 'click', () => {
      this.exportJSON();
      this.exportMenuOpen = false;
      exportMenu.style.display = 'none';
      exportBtn.setAttribute('aria-expanded', 'false');
    });
    exportMenu.appendChild(exportJsonBtn);

    exportWrapper.appendChild(exportMenu);
    right.appendChild(exportWrapper);

    // Close export menu when clicking outside
    this.addListener(document, 'click', (e) => {
      if (this.exportMenuOpen && !exportWrapper.contains(e.target)) {
        this.exportMenuOpen = false;
        exportMenu.style.display = 'none';
        exportBtn.setAttribute('aria-expanded', 'false');
      }
    });

    toolbar.appendChild(right);
    return toolbar;
  }

  // ==================== Filter bar ====================

  renderFilterBar() {
    const bar = createElement('div', '', { class: 'ts-filter-bar' });

    // Type filter
    const typeLabel = createElement('label', 'Type:', {
      class: 'ts-form-label',
      for: 'ts-filter-type'
    });
    bar.appendChild(typeLabel);

    const typeSelect = createElement('select', '', {
      class: 'ts-filter-select',
      id: 'ts-filter-type',
      'aria-label': 'Filter by event type'
    });
    const typeOptions = [
      { value: 'all', label: 'All Types' },
      ...EVENT_TYPES.filter(t => t !== 'Gap').map(t => ({ value: t, label: EVENT_TYPE_LABELS[t] }))
    ];
    typeOptions.forEach(opt => {
      const o = createElement('option', opt.label, { value: opt.value });
      if (opt.value === this.filterType) o.selected = true;
      typeSelect.appendChild(o);
    });
    this.addListener(typeSelect, 'change', (e) => {
      this.filterType = e.target.value;
      this.applyFilter();
      this.renderContent();
    });
    bar.appendChild(typeSelect);

    // Search
    const searchInput = createElement('input', '', {
      class: 'ts-search-input',
      type: 'search',
      placeholder: 'Search events...',
      'aria-label': 'Search events'
    });
    if (this.searchQuery) searchInput.value = this.searchQuery;
    this.addListener(searchInput, 'input', (e) => {
      this.searchQuery = e.target.value;
      this.applyFilter();
      this.renderContent();
    });
    bar.appendChild(searchInput);

    return bar;
  }

  // ==================== Add event panel ====================

  renderAddEventPanel() {
    const panel = createElement('div', '', {
      class: `ts-add-event-panel${this.addFormOpen ? ' expanded' : ''}`
    });

    // Toggle button
    const toggle = createElement('button', '', {
      class: 'ts-add-event-toggle',
      'aria-expanded': String(this.addFormOpen),
      'aria-controls': 'ts-add-event-form'
    });

    const toggleText = createElement('span', '+ Add Custom Event');
    toggle.appendChild(toggleText);

    const toggleIcon = createElement('span', '', { class: 'ts-add-event-toggle-icon' });
    toggleIcon.innerHTML = '&#9660;';
    toggle.appendChild(toggleIcon);

    this.addListener(toggle, 'click', () => {
      this.addFormOpen = !this.addFormOpen;
      panel.classList.toggle('expanded', this.addFormOpen);
      toggle.setAttribute('aria-expanded', String(this.addFormOpen));
    });
    panel.appendChild(toggle);

    // Form
    const form = createElement('div', '', {
      class: 'ts-add-event-form',
      id: 'ts-add-event-form'
    });

    const grid = createElement('div', '', { class: 'ts-form-grid' });

    // Title
    const titleGroup = this.createFormGroup('Title', 'ts-new-title', 'input', {
      type: 'text',
      placeholder: 'e.g. Software Engineer',
      required: 'true'
    });
    grid.appendChild(titleGroup);

    // Organization
    const orgGroup = this.createFormGroup('Organization', 'ts-new-org', 'input', {
      type: 'text',
      placeholder: 'e.g. Acme Corp'
    });
    grid.appendChild(orgGroup);

    // Type
    const typeGroup = createElement('div', '', { class: 'ts-form-group' });
    const typeLabel = createElement('label', 'Type', {
      class: 'ts-form-label',
      for: 'ts-new-type'
    });
    typeGroup.appendChild(typeLabel);
    const typeSelect = createElement('select', '', {
      class: 'ts-form-select',
      id: 'ts-new-type'
    });
    EVENT_TYPES.filter(t => t !== 'Gap').forEach(t => {
      typeSelect.appendChild(createElement('option', EVENT_TYPE_LABELS[t], { value: t }));
    });
    typeGroup.appendChild(typeSelect);
    grid.appendChild(typeGroup);

    // Start date
    const startGroup = this.createFormGroup('Start Date', 'ts-new-start', 'input', {
      type: 'month',
      required: 'true'
    });
    grid.appendChild(startGroup);

    // End date
    const endGroup = this.createFormGroup('End Date', 'ts-new-end', 'input', {
      type: 'month',
      placeholder: 'Leave blank for present'
    });
    grid.appendChild(endGroup);

    form.appendChild(grid);

    // Description (full width)
    const descGroup = this.createFormGroup('Description', 'ts-new-desc', 'textarea', {
      placeholder: 'Brief description (optional)',
      rows: '3'
    });
    form.appendChild(descGroup);

    // Actions
    const actions = createElement('div', '', { class: 'ts-form-actions' });

    const cancelBtn = createElement('button', 'Cancel', {
      class: 'btn btn-sm btn-outline',
      type: 'button'
    });
    this.addListener(cancelBtn, 'click', () => {
      this.addFormOpen = false;
      this.renderContent();
    });
    actions.appendChild(cancelBtn);

    const saveBtn = createElement('button', 'Add Event', {
      class: 'btn btn-sm btn-primary',
      type: 'button'
    });
    this.addListener(saveBtn, 'click', () => {
      const titleEl = form.querySelector('#ts-new-title');
      const orgEl = form.querySelector('#ts-new-org');
      const typeEl = form.querySelector('#ts-new-type');
      const startEl = form.querySelector('#ts-new-start');
      const endEl = form.querySelector('#ts-new-end');
      const descEl = form.querySelector('#ts-new-desc');

      const titleVal = (titleEl && titleEl.value) ? titleEl.value.trim() : '';
      const startVal = (startEl && startEl.value) ? startEl.value.trim() : '';

      if (!titleVal) {
        this.showToast('Please enter a title.', 'error');
        if (titleEl) titleEl.focus();
        return;
      }
      if (!startVal) {
        this.showToast('Please enter a start date.', 'error');
        if (startEl) startEl.focus();
        return;
      }

      const success = this.addCustomEvent({
        title: titleVal,
        organization: orgEl ? orgEl.value.trim() : '',
        type: typeEl ? typeEl.value : 'Employment',
        startDate: startVal,
        endDate: endEl ? endEl.value.trim() : '',
        description: descEl ? descEl.value.trim() : ''
      });

      if (success) {
        this.addFormOpen = false;
        this.showToast('Event added to timeline.', 'success');
      } else {
        this.showToast('Invalid dates. Please check your input.', 'error');
      }
    });
    actions.appendChild(saveBtn);

    form.appendChild(actions);
    panel.appendChild(form);

    return panel;
  }

  createFormGroup(labelText, id, tag, attrs) {
    const group = createElement('div', '', { class: 'ts-form-group' });

    const label = createElement('label', labelText, {
      class: 'ts-form-label',
      for: id
    });
    if (attrs && attrs.required) {
      const req = createElement('span', ' *', { class: 'ts-required' });
      label.appendChild(req);
    }
    group.appendChild(label);

    const inputClass = tag === 'textarea' ? 'ts-form-textarea'
      : tag === 'select' ? 'ts-form-select'
      : 'ts-form-input';

    const inputAttrs = { class: inputClass, id, ...attrs };
    delete inputAttrs.required; // handle via aria
    if (attrs && attrs.required) inputAttrs['aria-required'] = 'true';

    const input = createElement(tag, '', inputAttrs);
    group.appendChild(input);
    return group;
  }

  // ==================== Summary stats ====================

  renderSummary() {
    const section = createElement('div', '', { class: 'ts-summary-cards' });

    const totalCard = this.createSummaryCard(
      String(this.allEvents.length), 'Total Events', 'ts-summary-total'
    );
    section.appendChild(totalCard);

    const empCount = this.allEvents.filter(e => e.type === 'Employment').length;
    const empCard = this.createSummaryCard(
      String(empCount), 'Employment', 'ts-summary-employment'
    );
    section.appendChild(empCard);

    const eduCount = this.allEvents.filter(e => e.type === 'Education').length;
    const eduCard = this.createSummaryCard(
      String(eduCount), 'Education', 'ts-summary-education'
    );
    section.appendChild(eduCard);

    const gapCard = this.createSummaryCard(
      String(this.gaps.length), 'Gaps', 'ts-summary-gaps'
    );
    section.appendChild(gapCard);

    const overlapCard = this.createSummaryCard(
      String(this.overlaps.length), 'Overlaps', 'ts-summary-overlaps'
    );
    section.appendChild(overlapCard);

    // Career span
    if (this.allEvents.length > 0) {
      const sorted = [...this.allEvents].sort((a, b) => a.startDate - b.startDate);
      const earliest = sorted[0].startDate;
      const latest = sorted.reduce((max, e) => e.endDate > max ? e.endDate : max, sorted[0].endDate);
      const span = durationBetween(earliest, latest);
      const spanCard = this.createSummaryCard(span || '--', 'Career Span', 'ts-summary-span');
      section.appendChild(spanCard);
    }

    return section;
  }

  createSummaryCard(value, label, cls) {
    const card = createElement('div', '', { class: `ts-summary-card ${cls}` });
    const valEl = createElement('div', value, { class: 'ts-summary-value' });
    card.appendChild(valEl);
    const labelEl = createElement('div', label, { class: 'ts-summary-label' });
    card.appendChild(labelEl);
    return card;
  }

  // ==================== Legend ====================

  renderLegend() {
    const legend = createElement('div', '', {
      class: 'ts-legend',
      'aria-label': 'Event type legend'
    });

    const types = [
      { key: 'employment', label: 'Employment' },
      { key: 'education', label: 'Education' },
      { key: 'project', label: 'Project' },
      { key: 'certification', label: 'Certification' },
      { key: 'volunteer', label: 'Volunteer' },
      { key: 'gap', label: 'Gap' }
    ];

    types.forEach(t => {
      const item = createElement('div', '', { class: 'ts-legend-item' });
      const color = createElement('span', '', { class: `ts-legend-color ts-legend-color--${t.key}` });
      item.appendChild(color);
      const label = createElement('span', t.label);
      item.appendChild(label);
      legend.appendChild(item);
    });

    return legend;
  }

  // ==================== Timeline view ====================

  renderTimelineView() {
    const view = createElement('div', '', {
      class: 'ts-timeline-view',
      id: 'ts-main-view',
      role: 'tabpanel'
    });

    const wrapper = createElement('div', '', { class: 'ts-timeline-wrapper' });

    // Axis line
    const axis = createElement('div', '', {
      class: 'ts-timeline-axis',
      'aria-hidden': 'true'
    });
    wrapper.appendChild(axis);

    // Compute date range
    const sorted = [...this.filteredEvents].sort((a, b) => a.startDate - b.startDate);
    const earliest = sorted[0].startDate;
    const latest = sorted.reduce((max, e) => e.endDate > max ? e.endDate : max, sorted[0].endDate);

    // Date labels (year markers)
    const startYear = earliest.getFullYear();
    const endYear = latest.getFullYear();
    const dateLabels = createElement('div', '', { class: 'ts-timeline-date-labels' });

    for (let y = endYear; y >= startYear; y--) {
      const label = createElement('div', String(y), {
        class: 'ts-date-label ts-date-label-year'
      });
      dateLabels.appendChild(label);
    }
    wrapper.appendChild(dateLabels);

    // Year markers on axis
    const totalRange = latest - earliest || 1;
    for (let y = startYear; y <= endYear; y++) {
      const yearDate = new Date(y, 0, 1);
      const pct = ((latest - yearDate) / totalRange) * 100;
      if (pct >= 0 && pct <= 100) {
        const marker = createElement('div', '', { class: 'ts-year-marker' });
        marker.style.top = `${pct}%`;
        wrapper.appendChild(marker);
      }
    }

    // Events container
    const eventsContainer = createElement('div', '', {
      class: 'ts-timeline-events',
      role: 'list',
      'aria-label': 'Timeline events'
    });

    // Sort events by start date descending for the timeline (most recent at top)
    const timelineSorted = [...this.filteredEvents].sort((a, b) => b.startDate - a.startDate);

    timelineSorted.forEach(evt => {
      const bar = this.renderEventBar(evt);
      eventsContainer.appendChild(bar);
    });

    wrapper.appendChild(eventsContainer);
    view.appendChild(wrapper);

    return view;
  }

  renderEventBar(evt) {
    const typeClass = `ts-type-${evt.type.toLowerCase()}`;

    const bar = createElement('div', '', {
      class: `ts-event-bar`,
      role: 'listitem',
      tabindex: '0',
      'aria-label': `${evt.type}: ${evt.title} at ${evt.organization}, ${formatDate(evt.startDate)} to ${evt.isPresent ? 'Present' : formatDate(evt.endDate)}`
    });

    const outerWrap = createElement('div', '', { class: typeClass });
    outerWrap.style.display = 'contents';

    // Color stripe
    const stripe = createElement('div', '', { class: 'ts-event-stripe' });

    // Content
    const content = createElement('div', '', { class: 'ts-event-content' });

    // Info
    const info = createElement('div', '', { class: 'ts-event-info' });

    const titleRow = createElement('div', '', {
      style: { display: 'flex', alignItems: 'center', gap: '8px' }
    });

    const badge = this.createTypeBadge(evt.type);
    titleRow.appendChild(badge);

    const titleEl = createElement('p', evt.title, { class: 'ts-event-title' });
    titleRow.appendChild(titleEl);

    info.appendChild(titleRow);

    if (evt.organization) {
      const orgEl = createElement('p', evt.organization, { class: 'ts-event-org' });
      info.appendChild(orgEl);
    }

    content.appendChild(info);

    // Meta
    const meta = createElement('div', '', { class: 'ts-event-meta' });

    const dates = createElement('span', '', { class: 'ts-event-dates' });
    dates.textContent = `${formatDate(evt.startDate)} - ${evt.isPresent ? 'Present' : formatDate(evt.endDate)}`;
    meta.appendChild(dates);

    const dur = durationBetween(evt.startDate, evt.endDate);
    if (dur) {
      const durEl = createElement('span', dur, { class: 'ts-event-duration' });
      meta.appendChild(durEl);
    }

    // Actions (only for custom events)
    if (evt.isCustom) {
      const actions = createElement('div', '', { class: 'ts-event-actions' });
      const deleteBtn = createElement('button', '', {
        class: 'ts-event-action-btn',
        'aria-label': `Delete ${evt.title}`
      });
      deleteBtn.innerHTML = '&#10005;';
      this.addListener(deleteBtn, 'click', (e) => {
        e.stopPropagation();
        this.removeCustomEvent(evt.id);
      });
      actions.appendChild(deleteBtn);
      meta.appendChild(actions);
    }

    content.appendChild(meta);

    // We wrap stripe+content inside the type-class wrapper to get color styling
    // Since display:contents, the parent bar gets styles via CSS classes
    bar.classList.add(typeClass);
    bar.appendChild(stripe);
    bar.appendChild(content);

    // Click to show detail
    this.addListener(bar, 'click', () => {
      this.selectedEventId = (this.selectedEventId === evt.id) ? null : evt.id;
      this.renderContent();
    });

    this.addListener(bar, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectedEventId = (this.selectedEventId === evt.id) ? null : evt.id;
        this.renderContent();
      }
    });

    // If this event is selected, append detail panel
    if (this.selectedEventId === evt.id) {
      const wrapper = createElement('div', '');
      wrapper.appendChild(bar);
      wrapper.appendChild(this.renderDetailPanel(evt));
      return wrapper;
    }

    return bar;
  }

  // ==================== Detail panel ====================

  renderDetailPanel(evt) {
    const panel = createElement('div', '', { class: 'ts-detail-panel' });

    const header = createElement('div', '', { class: 'ts-detail-header' });
    const title = createElement('h3', evt.title, { class: 'ts-detail-title' });
    header.appendChild(title);

    const closeBtn = createElement('button', '', {
      class: 'ts-detail-close',
      'aria-label': 'Close details'
    });
    closeBtn.innerHTML = '&#10005;';
    this.addListener(closeBtn, 'click', () => {
      this.selectedEventId = null;
      this.renderContent();
    });
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = createElement('div', '', { class: 'ts-detail-body' });

    const rows = [
      { label: 'Type', value: EVENT_TYPE_LABELS[evt.type] || evt.type },
      { label: 'Organization', value: evt.organization },
      { label: 'Dates', value: `${formatDate(evt.startDate)} - ${evt.isPresent ? 'Present' : formatDate(evt.endDate)}` },
      { label: 'Duration', value: durationBetween(evt.startDate, evt.endDate) },
      { label: 'Description', value: evt.description },
      { label: 'Source', value: evt.isCustom ? 'Custom event' : (evt.documentName || 'Document') }
    ];

    rows.forEach(r => {
      if (!r.value) return;
      const row = createElement('div', '', { class: 'ts-detail-row' });
      const label = createElement('span', r.label, { class: 'ts-detail-label' });
      row.appendChild(label);
      const value = createElement('span', r.value, { class: 'ts-detail-value' });
      row.appendChild(value);
      body.appendChild(row);
    });

    panel.appendChild(body);

    // Actions
    if (evt.isCustom) {
      const actions = createElement('div', '', { class: 'ts-detail-actions' });
      const deleteBtn = createElement('button', 'Delete Event', {
        class: 'btn btn-sm btn-outline',
        'aria-label': `Delete ${evt.title}`
      });
      this.addListener(deleteBtn, 'click', () => {
        this.removeCustomEvent(evt.id);
      });
      actions.appendChild(deleteBtn);
      panel.appendChild(actions);
    }

    return panel;
  }

  // ==================== List view ====================

  renderListView() {
    const view = createElement('div', '', {
      class: 'ts-list-view',
      id: 'ts-main-view',
      role: 'tabpanel'
    });

    const grid = createElement('div', '', {
      class: 'ts-list-grid',
      role: 'list',
      'aria-label': 'Timeline events list'
    });

    this.filteredEvents.forEach(evt => {
      const card = this.renderListCard(evt);
      grid.appendChild(card);
    });

    view.appendChild(grid);
    return view;
  }

  renderListCard(evt) {
    const typeKey = evt.type.toLowerCase();
    const card = createElement('div', '', {
      class: `ts-list-card ts-list-card--${typeKey}`,
      role: 'listitem',
      tabindex: '0',
      'aria-label': `${evt.type}: ${evt.title}`
    });

    // Header
    const header = createElement('div', '', { class: 'ts-list-card-header' });

    const titleGroup = createElement('div', '', { class: 'ts-list-card-title-group' });
    const title = createElement('h3', evt.title, { class: 'ts-list-card-title' });
    titleGroup.appendChild(title);
    if (evt.organization) {
      const org = createElement('p', evt.organization, { class: 'ts-list-card-org' });
      titleGroup.appendChild(org);
    }
    header.appendChild(titleGroup);

    const badge = this.createTypeBadge(evt.type);
    header.appendChild(badge);
    card.appendChild(header);

    // Dates
    const dates = createElement('div', '', { class: 'ts-list-card-dates' });
    const dateIcon = createElement('span', '', { class: 'ts-list-card-date-icon' });
    dateIcon.innerHTML = '&#128197;';
    dates.appendChild(dateIcon);

    const dateText = createElement('span',
      `${formatDate(evt.startDate)} - ${evt.isPresent ? 'Present' : formatDate(evt.endDate)}`
    );
    dates.appendChild(dateText);

    const dur = durationBetween(evt.startDate, evt.endDate);
    if (dur) {
      const durEl = createElement('span', dur, { class: 'ts-list-card-duration' });
      dates.appendChild(durEl);
    }
    card.appendChild(dates);

    // Description
    if (evt.description) {
      const desc = createElement('p', evt.description, { class: 'ts-list-card-description' });
      card.appendChild(desc);
    }

    // Tags
    if (evt.documentName) {
      const tags = createElement('div', '', { class: 'ts-list-card-tags' });
      const tag = createElement('span', evt.documentName, { class: 'ts-filter-chip' });
      tags.appendChild(tag);
      card.appendChild(tags);
    }

    // Footer (custom events get delete)
    if (evt.isCustom) {
      const footer = createElement('div', '', { class: 'ts-list-card-footer' });
      const deleteBtn = createElement('button', 'Delete', {
        class: 'btn btn-sm btn-outline',
        'aria-label': `Delete ${evt.title}`
      });
      this.addListener(deleteBtn, 'click', (e) => {
        e.stopPropagation();
        this.removeCustomEvent(evt.id);
      });
      footer.appendChild(deleteBtn);
      card.appendChild(footer);
    }

    // Keyboard navigation
    this.addListener(card, 'click', () => {
      this.selectedEventId = (this.selectedEventId === evt.id) ? null : evt.id;
      this.renderContent();
    });
    this.addListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectedEventId = (this.selectedEventId === evt.id) ? null : evt.id;
        this.renderContent();
      }
    });

    // If selected, wrap with detail panel
    if (this.selectedEventId === evt.id) {
      const wrapper = createElement('div', '');
      wrapper.appendChild(card);
      wrapper.appendChild(this.renderDetailPanel(evt));
      return wrapper;
    }

    return card;
  }

  // ==================== Type badge ====================

  createTypeBadge(type) {
    const typeKey = type.toLowerCase();
    const badge = createElement('span', '', {
      class: `ts-type-badge ts-type-badge--${typeKey}`
    });
    const dot = createElement('span', '', { class: 'ts-type-badge-dot' });
    badge.appendChild(dot);
    const label = createElement('span', EVENT_TYPE_LABELS[type] || type);
    badge.appendChild(label);
    return badge;
  }

  // ==================== Warnings (gaps/overlaps) ====================

  renderWarnings() {
    const section = createElement('div', '', { class: 'ts-warnings-section' });

    if (this.gaps.length > 0 || this.overlaps.length > 0) {
      const title = createElement('h2', 'Gaps & Overlaps', { class: 'ts-warnings-title' });
      section.appendChild(title);
    }

    // Gaps
    this.gaps.forEach(gap => {
      const card = createElement('div', '', { class: 'ts-warning-card ts-warning-card--gap' });

      const icon = createElement('span', '', { class: 'ts-warning-icon' });
      icon.innerHTML = '&#9723;'; // empty square
      card.appendChild(icon);

      const content = createElement('div', '', { class: 'ts-warning-content' });

      const headline = createElement('p', `${gap.duration} gap detected`, {
        class: 'ts-warning-headline'
      });
      content.appendChild(headline);

      const detail = createElement('p',
        `Between "${gap.beforeEvent}" and "${gap.afterEvent}"`,
        { class: 'ts-warning-detail' }
      );
      content.appendChild(detail);

      const dates = createElement('p',
        `${formatDate(gap.startDate)} - ${formatDate(gap.endDate)}`,
        { class: 'ts-warning-dates' }
      );
      content.appendChild(dates);

      card.appendChild(content);

      // Action: add custom event to fill gap
      const action = createElement('button', 'Fill Gap', {
        class: 'btn btn-sm btn-outline ts-warning-action',
        'aria-label': `Add event to fill gap from ${formatDate(gap.startDate)} to ${formatDate(gap.endDate)}`
      });
      this.addListener(action, 'click', () => {
        this.addFormOpen = true;
        this.renderContent();
        // Pre-fill dates in the form
        const content = this.container.querySelector('#ts-content');
        if (content) {
          const startInput = content.querySelector('#ts-new-start');
          const endInput = content.querySelector('#ts-new-end');
          if (startInput) {
            const y = gap.startDate.getFullYear();
            const m = String(gap.startDate.getMonth() + 1).padStart(2, '0');
            startInput.value = `${y}-${m}`;
          }
          if (endInput) {
            const y = gap.endDate.getFullYear();
            const m = String(gap.endDate.getMonth() + 1).padStart(2, '0');
            endInput.value = `${y}-${m}`;
          }
          const typeSelect = content.querySelector('#ts-new-type');
          if (typeSelect) typeSelect.value = 'Gap';
          const titleInput = content.querySelector('#ts-new-title');
          if (titleInput) titleInput.focus();
        }
      });
      card.appendChild(action);

      section.appendChild(card);
    });

    // Overlaps
    this.overlaps.forEach(overlap => {
      const card = createElement('div', '', {
        class: 'ts-warning-card ts-warning-card--overlap'
      });

      const icon = createElement('span', '', { class: 'ts-warning-icon' });
      icon.innerHTML = '&#9888;'; // warning triangle
      card.appendChild(icon);

      const content = createElement('div', '', { class: 'ts-warning-content' });

      const headline = createElement('p', `${overlap.duration} overlap detected`, {
        class: 'ts-warning-headline'
      });
      content.appendChild(headline);

      const detail = createElement('p',
        `"${overlap.events[0]}" and "${overlap.events[1]}" overlap`,
        { class: 'ts-warning-detail' }
      );
      content.appendChild(detail);

      const dates = createElement('p',
        `${formatDate(overlap.startDate)} - ${formatDate(overlap.endDate)}`,
        { class: 'ts-warning-dates' }
      );
      content.appendChild(dates);

      card.appendChild(content);
      section.appendChild(card);
    });

    return section;
  }

  // ==================== Empty / No-results states ====================

  renderEmptyState() {
    const empty = createElement('div', '', { class: 'ts-empty-state' });

    const icon = createElement('div', '', { class: 'ts-empty-icon' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '64');
    svg.setAttribute('height', '64');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    icon.appendChild(svg);
    empty.appendChild(icon);

    const title = createElement('h2', 'No Timeline Events Yet', { class: 'ts-empty-title' });
    empty.appendChild(title);

    const message = createElement('p',
      'Create a resume or CV with dated experience and education sections, or add custom events using the form above to start building your career timeline.',
      { class: 'ts-empty-message' }
    );
    empty.appendChild(message);

    const createBtn = createElement('button', '+ Add Your First Event', {
      class: 'btn btn-primary'
    });
    this.addListener(createBtn, 'click', () => {
      this.addFormOpen = true;
      this.renderContent();
      setTimeout(() => {
        const titleInput = this.container.querySelector('#ts-new-title');
        if (titleInput) titleInput.focus();
      }, 100);
    });
    empty.appendChild(createBtn);

    return empty;
  }

  renderNoResults() {
    const noResults = createElement('div', '', { class: 'ts-no-results' });
    const text = createElement('p', 'No events match your current filters.');
    noResults.appendChild(text);

    const clearBtn = createElement('button', 'Clear Filters', {
      class: 'btn btn-sm btn-outline'
    });
    this.addListener(clearBtn, 'click', () => {
      this.filterType = 'all';
      this.searchQuery = '';
      this.applyFilter();
      this.renderContent();
    });
    noResults.appendChild(clearBtn);

    return noResults;
  }

  renderError(message) {
    const errorEl = createElement('div', '', { class: 'ts-error' });
    const icon = createElement('span', '', { class: 'ts-error-icon' });
    icon.innerHTML = '&#9888;';
    errorEl.appendChild(icon);
    const text = createElement('p', message, { class: 'ts-error-text' });
    errorEl.appendChild(text);
    return errorEl;
  }

  // ==================== Privacy note ====================

  renderPrivacyNote() {
    const note = createElement('div', '', { class: 'ts-privacy-note' });
    const lockIcon = createElement('span', '');
    lockIcon.innerHTML = '&#128274;';
    note.appendChild(lockIcon);
    note.appendChild(
      document.createTextNode(' Your career data is analyzed locally in this browser. Custom events are stored in localStorage and never uploaded.')
    );
    return note;
  }

  // ==================== Export ====================

  exportJSON() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalEvents: this.allEvents.length,
        gapCount: this.gaps.length,
        overlapCount: this.overlaps.length
      },
      events: this.allEvents.map(e => ({
        id: e.id,
        title: e.title,
        type: e.type,
        organization: e.organization,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        isPresent: e.isPresent,
        description: e.description,
        isCustom: e.isCustom,
        documentName: e.documentName || ''
      })),
      gaps: this.gaps.map(g => ({
        startDate: g.startDate.toISOString(),
        endDate: g.endDate.toISOString(),
        duration: g.duration,
        beforeEvent: g.beforeEvent,
        afterEvent: g.afterEvent
      })),
      overlaps: this.overlaps.map(o => ({
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        duration: o.duration,
        events: o.events
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `career-timeline-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Timeline exported as JSON.', 'success');
  }

  // ==================== Toast helper ====================

  showToast(message, type) {
    if (window.CC && window.CC.toast) {
      if (type === 'error') {
        window.CC.toast.error(message);
      } else {
        window.CC.toast.success(message);
      }
    }
  }
}


