/**
 * Master Profile Module
 * Centralized storage for all career content
 */

import { createElement } from '../utils/sanitize.js';
import { generateId } from '../utils/id.js';
import { STORES } from '../core/db.js';
import toast from './toast.js';

/**
 * Profile item types
 */
const PROFILE_TYPES = {
  EMPLOYMENT: 'employment',
  EDUCATION: 'education',
  PROJECTS: 'projects',
  SKILLS: 'skills',
  CERTIFICATIONS: 'certifications',
  PUBLICATIONS: 'publications',
  VOLUNTEER: 'volunteer',
  MEMBERSHIPS: 'memberships',
  BULLETS: 'bullets',
  LINKS: 'links'
};

/**
 * MasterProfile class
 */
export class MasterProfile {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];
    this.currentTab = PROFILE_TYPES.EMPLOYMENT;
    this.data = {};
    this.selectedItems = new Set();
  }

  /**
   * Renders the master profile interface
   * @returns {HTMLElement} Profile container
   */
  async render() {
    await this.loadData();

    this.container = createElement('div', '', { class: 'master-profile-container' });

    // Header
    const header = this.renderHeader();
    this.container.appendChild(header);

    // Description
    const description = createElement('p', 'Store all your career content here. When creating a resume, select which items to include.', {
      class: 'master-profile-description'
    });
    this.container.appendChild(description);

    // Tab navigation
    const tabs = this.renderTabs();
    this.container.appendChild(tabs);

    // Tab content
    const content = createElement('div', '', {
      class: 'master-profile-content',
      id: 'master-profile-content'
    });
    this.container.appendChild(content);

    // Render initial tab
    this.renderTabContent();

    return this.container;
  }

  /**
   * Renders header
   */
  renderHeader() {
    const header = createElement('div', '', { class: 'master-profile-header' });

    const title = createElement('h2', 'Master Career Profile', {
      class: 'master-profile-title'
    });
    header.appendChild(title);

    // Action buttons
    const actions = createElement('div', '', { class: 'master-profile-actions' });

    const exportBtn = createElement('button', 'Export Profile', {
      class: 'master-profile-btn master-profile-btn-secondary'
    });
    const exportHandler = () => this.exportProfile();
    exportBtn.addEventListener('click', exportHandler);
    this.listeners.push({ element: exportBtn, event: 'click', handler: exportHandler });
    actions.appendChild(exportBtn);

    const importBtn = createElement('button', 'Import Profile', {
      class: 'master-profile-btn master-profile-btn-secondary'
    });
    const importHandler = () => this.importProfile();
    importBtn.addEventListener('click', importHandler);
    this.listeners.push({ element: importBtn, event: 'click', handler: importHandler });
    actions.appendChild(importBtn);

    const linkedInBtn = createElement('button', '\u{1F4E5} Import from LinkedIn', {
      class: 'master-profile-btn master-profile-btn-secondary'
    });
    const linkedInHandler = () => this.importFromLinkedIn();
    linkedInBtn.addEventListener('click', linkedInHandler);
    this.listeners.push({ element: linkedInBtn, event: 'click', handler: linkedInHandler });
    actions.appendChild(linkedInBtn);

    header.appendChild(actions);

    return header;
  }

  /**
   * Renders tab navigation
   */
  renderTabs() {
    const tabsContainer = createElement('div', '', { class: 'master-profile-tabs' });

    const tabs = [
      { id: PROFILE_TYPES.EMPLOYMENT, label: 'Employment' },
      { id: PROFILE_TYPES.EDUCATION, label: 'Education' },
      { id: PROFILE_TYPES.PROJECTS, label: 'Projects' },
      { id: PROFILE_TYPES.SKILLS, label: 'Skills' },
      { id: PROFILE_TYPES.CERTIFICATIONS, label: 'Certifications' },
      { id: PROFILE_TYPES.PUBLICATIONS, label: 'Publications' },
      { id: PROFILE_TYPES.VOLUNTEER, label: 'Volunteer' },
      { id: PROFILE_TYPES.MEMBERSHIPS, label: 'Memberships' },
      { id: PROFILE_TYPES.BULLETS, label: 'Bullets' },
      { id: PROFILE_TYPES.LINKS, label: 'Links' }
    ];

    tabs.forEach(tab => {
      const tabBtn = createElement('button', tab.label, {
        class: `master-profile-tab ${this.currentTab === tab.id ? 'active' : ''}`,
        'data-tab': tab.id
      });

      const clickHandler = () => {
        this.currentTab = tab.id;
        this.updateTabs();
        this.renderTabContent();
      };
      tabBtn.addEventListener('click', clickHandler);
      this.listeners.push({ element: tabBtn, event: 'click', handler: clickHandler });

      tabsContainer.appendChild(tabBtn);
    });

    return tabsContainer;
  }

  /**
   * Updates tab active states
   */
  updateTabs() {
    const tabs = this.container.querySelectorAll('.master-profile-tab');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === this.currentTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  /**
   * Renders tab content
   */
  renderTabContent() {
    const content = this.container.querySelector('#master-profile-content');
    if (!content) return;

    content.innerHTML = '';

    // Tab controls
    const controls = createElement('div', '', { class: 'master-profile-tab-controls' });

    // Search/filter
    const searchInput = createElement('input', '', {
      class: 'master-profile-search',
      type: 'text',
      placeholder: 'Search...',
      id: 'profile-search'
    });
    const searchHandler = (e) => this.filterItems(e.target.value);
    searchInput.addEventListener('input', searchHandler);
    this.listeners.push({ element: searchInput, event: 'input', handler: searchHandler });
    controls.appendChild(searchInput);

    // Add button
    const addBtn = createElement('button', '+ Add New', {
      class: 'master-profile-btn master-profile-btn-primary'
    });
    const addHandler = () => this.addItem();
    addBtn.addEventListener('click', addHandler);
    this.listeners.push({ element: addBtn, event: 'click', handler: addHandler });
    controls.appendChild(addBtn);

    // Improve All Bullets button (Employment tab only)
    if (this.currentTab === PROFILE_TYPES.EMPLOYMENT) {
      const improveBtn = createElement('button', '✨ Improve All Bullets', {
        class: 'master-profile-btn master-profile-btn-secondary'
      });
      const improveHandler = () => this.improveAllBullets();
      improveBtn.addEventListener('click', improveHandler);
      this.listeners.push({ element: improveBtn, event: 'click', handler: improveHandler });
      controls.appendChild(improveBtn);
    }

    content.appendChild(controls);

    // Items list
    const itemsList = createElement('div', '', {
      class: 'master-profile-items-list',
      id: 'profile-items-list'
    });
    content.appendChild(itemsList);

    this.renderItems();
  }

  /**
   * Renders items for current tab
   */
  renderItems(filter = '') {
    const itemsList = this.container.querySelector('#profile-items-list');
    if (!itemsList) return;

    itemsList.innerHTML = '';

    const items = this.data[this.currentTab] || [];
    const filteredItems = filter
      ? items.filter(item => this.matchesFilter(item, filter))
      : items;

    if (filteredItems.length === 0) {
      const empty = createElement('div', 'No items yet. Click "Add New" to get started.', {
        class: 'master-profile-empty'
      });
      itemsList.appendChild(empty);
      return;
    }

    filteredItems.forEach(item => {
      const itemCard = this.renderItemCard(item);
      itemsList.appendChild(itemCard);
    });
  }

  /**
   * Renders an item card
   */
  renderItemCard(item) {
    const card = createElement('div', '', {
      class: 'master-profile-item-card',
      'data-item-id': item.id
    });

    // Header
    const header = createElement('div', '', { class: 'master-profile-item-header' });

    const title = createElement('h4', this.getItemTitle(item), {
      class: 'master-profile-item-title'
    });
    header.appendChild(title);

    // Actions
    const actions = createElement('div', '', { class: 'master-profile-item-actions' });

    const editBtn = createElement('button', 'Edit', {
      class: 'master-profile-item-btn'
    });
    const editHandler = () => this.editItem(item);
    editBtn.addEventListener('click', editHandler);
    this.listeners.push({ element: editBtn, event: 'click', handler: editHandler });
    actions.appendChild(editBtn);

    const duplicateBtn = createElement('button', 'Duplicate', {
      class: 'master-profile-item-btn'
    });
    const duplicateHandler = () => this.duplicateItem(item);
    duplicateBtn.addEventListener('click', duplicateHandler);
    this.listeners.push({ element: duplicateBtn, event: 'click', handler: duplicateHandler });
    actions.appendChild(duplicateBtn);

    const deleteBtn = createElement('button', 'Delete', {
      class: 'master-profile-item-btn master-profile-item-btn-danger'
    });
    const deleteHandler = () => this.deleteItem(item);
    deleteBtn.addEventListener('click', deleteHandler);
    this.listeners.push({ element: deleteBtn, event: 'click', handler: deleteHandler });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    card.appendChild(header);

    // Content
    const content = createElement('div', '', { class: 'master-profile-item-content' });
    const contentText = this.getItemSummary(item);
    const summary = createElement('p', contentText, {
      class: 'master-profile-item-summary'
    });
    content.appendChild(summary);
    card.appendChild(content);

    // Footer
    const footer = createElement('div', '', { class: 'master-profile-item-footer' });

    // Tags
    if (item.tags && item.tags.length > 0) {
      const tagsContainer = createElement('div', '', { class: 'master-profile-item-tags' });
      item.tags.forEach(tag => {
        const tagEl = createElement('span', tag, { class: 'master-profile-tag' });
        tagsContainer.appendChild(tagEl);
      });
      footer.appendChild(tagsContainer);
    }

    // Used in documents
    if (item.usedIn && item.usedIn.length > 0) {
      const usedIn = createElement('span', `Used in ${item.usedIn.length} document(s)`, {
        class: 'master-profile-item-used'
      });
      footer.appendChild(usedIn);
    }

    card.appendChild(footer);

    return card;
  }

  /**
   * Gets item title based on type
   */
  getItemTitle(item) {
    switch (this.currentTab) {
      case PROFILE_TYPES.EMPLOYMENT:
        return `${item.jobTitle || 'Untitled'} at ${item.company || 'Company'}`;
      case PROFILE_TYPES.EDUCATION:
        return `${item.degree || 'Degree'} in ${item.qualification || 'Field'}`;
      case PROFILE_TYPES.PROJECTS:
        return item.projectName || 'Untitled Project';
      case PROFILE_TYPES.SKILLS:
        return item.category || 'Skill Category';
      case PROFILE_TYPES.CERTIFICATIONS:
        return item.name || 'Certification';
      case PROFILE_TYPES.PUBLICATIONS:
        return item.title || 'Publication';
      case PROFILE_TYPES.VOLUNTEER:
        return `${item.role || 'Role'} at ${item.organization || 'Organization'}`;
      case PROFILE_TYPES.MEMBERSHIPS:
        return item.organization || 'Organization';
      case PROFILE_TYPES.BULLETS:
        return item.text ? item.text.substring(0, 50) + '...' : 'Bullet point';
      case PROFILE_TYPES.LINKS:
        return item.label || item.url || 'Link';
      default:
        return 'Item';
    }
  }

  /**
   * Gets item summary
   */
  getItemSummary(item) {
    switch (this.currentTab) {
      case PROFILE_TYPES.EMPLOYMENT:
        return `${item.startYear || ''} - ${item.currentlyWorking ? 'Present' : item.endYear || ''} | ${item.location || ''}`;
      case PROFILE_TYPES.EDUCATION:
        return `${item.institution || ''} | ${item.startDate || ''} - ${item.endDate || ''}`;
      case PROFILE_TYPES.PROJECTS:
        return item.summary || '';
      case PROFILE_TYPES.SKILLS:
        return item.skills || '';
      case PROFILE_TYPES.CERTIFICATIONS:
        return `${item.issuer || ''} | ${item.date || ''}`;
      case PROFILE_TYPES.PUBLICATIONS:
        return `${item.journal || ''} | ${item.date || ''}`;
      case PROFILE_TYPES.VOLUNTEER:
        return `${item.startDate || ''} - ${item.current ? 'Present' : item.endDate || ''}`;
      case PROFILE_TYPES.MEMBERSHIPS:
        return `${item.role || ''} | Since ${item.since || ''}`;
      case PROFILE_TYPES.BULLETS:
        return item.text || '';
      case PROFILE_TYPES.LINKS:
        return item.url || '';
      default:
        return '';
    }
  }

  /**
   * Filters items based on search query
   */
  matchesFilter(item, query) {
    const searchText = query.toLowerCase();
    const itemText = JSON.stringify(item).toLowerCase();
    return itemText.includes(searchText);
  }

  /**
   * Filters and re-renders items
   */
  filterItems(query) {
    this.renderItems(query);
  }

  /**
   * Adds a new item
   */
  addItem() {
    const item = this.createEmptyItem();
    this.showItemEditor(item, true);
  }

  /**
   * Edits an existing item
   */
  editItem(item) {
    this.showItemEditor(item, false);
  }

  /**
   * Duplicates an item
   */
  async duplicateItem(item) {
    const duplicate = {
      ...item,
      id: generateId(),
      usedIn: []
    };

    if (!this.data[this.currentTab]) {
      this.data[this.currentTab] = [];
    }

    this.data[this.currentTab].push(duplicate);
    await this.saveData();
    this.renderItems();
  }

  /**
   * Deletes an item
   */
  async deleteItem(item) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    if (!this.data[this.currentTab]) return;

    const index = this.data[this.currentTab].findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.data[this.currentTab].splice(index, 1);
      await this.saveData();
      this.renderItems();
    }
  }

  /**
   * Creates an empty item based on current tab
   */
  createEmptyItem() {
    const base = {
      id: generateId(),
      tags: [],
      usedIn: [],
      included: true
    };

    switch (this.currentTab) {
      case PROFILE_TYPES.EMPLOYMENT:
        return {
          ...base,
          jobTitle: '',
          company: '',
          location: '',
          startMonth: '',
          startYear: '',
          endMonth: '',
          endYear: '',
          currentlyWorking: false,
          achievements: []
        };
      case PROFILE_TYPES.EDUCATION:
        return {
          ...base,
          degree: '',
          qualification: '',
          institution: '',
          location: '',
          startDate: '',
          endDate: '',
          gpa: ''
        };
      case PROFILE_TYPES.PROJECTS:
        return {
          ...base,
          projectName: '',
          summary: '',
          technologies: [],
          demoUrl: '',
          repositoryUrl: ''
        };
      case PROFILE_TYPES.SKILLS:
        return {
          ...base,
          category: '',
          skills: ''
        };
      case PROFILE_TYPES.CERTIFICATIONS:
        return {
          ...base,
          name: '',
          issuer: '',
          date: '',
          credentialId: ''
        };
      case PROFILE_TYPES.PUBLICATIONS:
        return {
          ...base,
          title: '',
          journal: '',
          date: '',
          authors: ''
        };
      case PROFILE_TYPES.VOLUNTEER:
        return {
          ...base,
          role: '',
          organization: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false
        };
      case PROFILE_TYPES.MEMBERSHIPS:
        return {
          ...base,
          organization: '',
          role: '',
          since: ''
        };
      case PROFILE_TYPES.BULLETS:
        return {
          ...base,
          text: '',
          actionVerb: '',
          skillTags: [],
          jobFamily: '',
          seniority: ''
        };
      case PROFILE_TYPES.LINKS:
        return {
          ...base,
          label: '',
          url: '',
          icon: ''
        };
      default:
        return base;
    }
  }

  /**
   * Shows item editor modal
   */
  showItemEditor(item, isNew) {
    const fields = this.getFieldsForType(this.currentTab);
    const editCopy = { ...item };

    const form = createElement('div', '', { class: 'master-profile-editor-form' });

    fields.forEach(field => {
      const group = createElement('div', '', { class: 'form-group' });
      const label = createElement('label', field.label, { class: 'form-label' });
      group.appendChild(label);

      if (field.type === 'textarea') {
        const input = createElement('textarea', '', {
          class: 'form-input',
          rows: '3',
          placeholder: field.placeholder || ''
        });
        input.value = editCopy[field.key] || '';
        input.addEventListener('input', (e) => { editCopy[field.key] = e.target.value; });
        group.appendChild(input);
      } else if (field.type === 'checkbox') {
        const checkRow = createElement('div', '', { class: 'd-flex items-center gap-2' });
        const input = createElement('input', '', { type: 'checkbox' });
        input.checked = !!editCopy[field.key];
        input.addEventListener('change', (e) => { editCopy[field.key] = e.target.checked; });
        checkRow.appendChild(input);
        const checkLabel = createElement('span', field.label, { class: 'text-sm' });
        checkRow.appendChild(checkLabel);
        group.innerHTML = '';
        group.appendChild(checkRow);
      } else {
        const input = createElement('input', '', {
          class: 'form-input',
          type: field.type || 'text',
          placeholder: field.placeholder || ''
        });
        input.value = editCopy[field.key] || '';
        input.addEventListener('input', (e) => { editCopy[field.key] = e.target.value; });
        group.appendChild(input);

        if (field.ac) {
          import('./autocomplete.js').then(({ Autocomplete }) => {
            Autocomplete.attach(input, field.ac, {
              onSelect: (val) => { editCopy[field.key] = val; }
            });
          }).catch(() => {});
        }
      }

      form.appendChild(group);
    });

    if (window.CC && window.CC.modal) {
      window.CC.modal.show({
        title: isNew ? `Add ${this.currentTab}` : `Edit ${this.currentTab}`,
        body: form,
        size: 'medium',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => { window.CC.modal.close(); return null; } },
          {
            label: isNew ? 'Add' : 'Save',
            type: 'primary',
            handler: async () => {
              if (isNew) {
                if (!this.data[this.currentTab]) {
                  this.data[this.currentTab] = [];
                }
                this.data[this.currentTab].push(editCopy);
              } else {
                const index = this.data[this.currentTab].findIndex(i => i.id === item.id);
                if (index !== -1) {
                  this.data[this.currentTab][index] = editCopy;
                }
              }
              await this.saveData();
              this.renderItems();
              return true;
            }
          }
        ]
      });
    }
  }

  getFieldsForType(type) {
    switch (type) {
      case PROFILE_TYPES.EMPLOYMENT:
        return [
          { key: 'jobTitle', label: 'Job Title', placeholder: 'e.g., Software Engineer', ac: 'jobTitle' },
          { key: 'company', label: 'Company', placeholder: 'e.g., Acme Corp', ac: 'company' },
          { key: 'location', label: 'Location', placeholder: 'e.g., San Francisco, CA', ac: 'location' },
          { key: 'startYear', label: 'Start Year', type: 'number', placeholder: '2020' },
          { key: 'endYear', label: 'End Year', type: 'number', placeholder: '2024' },
          { key: 'currentlyWorking', label: 'Currently working here', type: 'checkbox' },
          { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Key responsibilities and achievements...' },
        ];
      case PROFILE_TYPES.EDUCATION:
        return [
          { key: 'degree', label: 'Degree', placeholder: 'e.g., Bachelor of Science', ac: 'degree' },
          { key: 'qualification', label: 'Field of Study', placeholder: 'e.g., Computer Science', ac: 'specialization' },
          { key: 'institution', label: 'Institution', placeholder: 'e.g., MIT', ac: 'institution' },
          { key: 'startDate', label: 'Start Year', placeholder: '2016' },
          { key: 'endDate', label: 'End Year', placeholder: '2020' },
          { key: 'gpa', label: 'GPA', placeholder: '3.8' },
        ];
      case PROFILE_TYPES.PROJECTS:
        return [
          { key: 'projectName', label: 'Project Name', placeholder: 'e.g., Portfolio Website' },
          { key: 'role', label: 'Your Role', placeholder: 'e.g., Lead Developer', ac: 'jobTitle' },
          { key: 'summary', label: 'Description', type: 'textarea', placeholder: 'What the project does...' },
          { key: 'technologies', label: 'Technologies', placeholder: 'React, Node.js, PostgreSQL', ac: 'skill' },
          { key: 'demoUrl', label: 'Demo URL', placeholder: 'https://...' },
        ];
      case PROFILE_TYPES.SKILLS:
        return [
          { key: 'category', label: 'Category', placeholder: 'e.g., Programming Languages' },
          { key: 'skills', label: 'Skills (comma separated)', placeholder: 'JavaScript, Python, Go', ac: 'skill' },
        ];
      case PROFILE_TYPES.CERTIFICATIONS:
        return [
          { key: 'name', label: 'Certification Name', placeholder: 'e.g., AWS Solutions Architect', ac: 'certification' },
          { key: 'issuer', label: 'Issuing Organization', placeholder: 'e.g., Amazon Web Services', ac: 'company' },
          { key: 'date', label: 'Date', placeholder: '2023' },
          { key: 'credentialId', label: 'Credential ID', placeholder: 'ABC-123' },
        ];
      case PROFILE_TYPES.PUBLICATIONS:
        return [
          { key: 'title', label: 'Title', placeholder: 'Publication title...' },
          { key: 'journal', label: 'Journal/Publisher', placeholder: 'e.g., IEEE, Nature' },
          { key: 'date', label: 'Year', placeholder: '2023' },
          { key: 'url', label: 'DOI / URL', placeholder: 'https://doi.org/...' },
          { key: 'description', label: 'Abstract', type: 'textarea' },
        ];
      case PROFILE_TYPES.VOLUNTEER:
        return [
          { key: 'role', label: 'Role', placeholder: 'e.g., Volunteer Tutor', ac: 'jobTitle' },
          { key: 'organization', label: 'Organization', placeholder: 'e.g., Code for Change', ac: 'company' },
          { key: 'startDate', label: 'Start Date', placeholder: '2021' },
          { key: 'endDate', label: 'End Date', placeholder: '2023' },
          { key: 'current', label: 'Currently active', type: 'checkbox' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ];
      case PROFILE_TYPES.MEMBERSHIPS:
        return [
          { key: 'organization', label: 'Organization', placeholder: 'e.g., ACM, IEEE', ac: 'company' },
          { key: 'role', label: 'Role/Level', placeholder: 'e.g., Professional Member' },
          { key: 'since', label: 'Since', placeholder: '2020' },
        ];
      case PROFILE_TYPES.BULLETS:
        return [
          { key: 'text', label: 'Achievement Bullet', type: 'textarea', placeholder: 'Increased revenue by 25% through...' },
          { key: 'category', label: 'Category', placeholder: 'e.g., Leadership, Technical' },
        ];
      case PROFILE_TYPES.LINKS:
        return [
          { key: 'label', label: 'Label', placeholder: 'e.g., Portfolio, GitHub' },
          { key: 'url', label: 'URL', placeholder: 'https://...' },
        ];
      default:
        return [
          { key: 'name', label: 'Name' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ];
    }
  }

  /**
   * Imports career data from pasted LinkedIn profile text using AI parsing
   */
  importFromLinkedIn() {
    const form = createElement('div', '', { class: 'master-profile-editor-form' });

    const instructions = createElement('p', 'Paste your LinkedIn profile text (copy from linkedin.com/in/your-profile)', {
      class: 'master-profile-description'
    });
    form.appendChild(instructions);

    const textarea = createElement('textarea', '', {
      class: 'form-input',
      rows: '12',
      placeholder: 'Paste your full LinkedIn profile text here...\n\nTip: Go to your LinkedIn profile, select all text (Ctrl+A), copy (Ctrl+C), and paste here.'
    });
    form.appendChild(textarea);

    if (window.CC && window.CC.modal) {
      window.CC.modal.show({
        title: '\u{1F4E5} Import from LinkedIn',
        body: form,
        size: 'large',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => { window.CC.modal.close(); return null; } },
          {
            label: 'Import',
            type: 'primary',
            handler: async () => {
              const pastedText = textarea.value.trim();
              if (!pastedText || pastedText.length < 20) {
                toast.warning('Please paste more LinkedIn profile content.');
                return false;
              }

              try {
                toast.info('Parsing LinkedIn profile with AI...');

                const { AiFormatter } = await import('./ai-formatter.js');
                const ai = new AiFormatter(localStorage.getItem('cc_ai_api_key') || '');
                const result = await ai.parseLinkedIn(pastedText);

                let importedCount = 0;

                // Import experience entries as employment
                if (result.experience && Array.isArray(result.experience)) {
                  if (!this.data[PROFILE_TYPES.EMPLOYMENT]) {
                    this.data[PROFILE_TYPES.EMPLOYMENT] = [];
                  }
                  for (const exp of result.experience) {
                    this.data[PROFILE_TYPES.EMPLOYMENT].push({
                      id: generateId(),
                      tags: [],
                      usedIn: [],
                      included: true,
                      jobTitle: exp.title || exp.jobTitle || '',
                      company: exp.company || '',
                      location: exp.location || '',
                      startYear: exp.startYear || exp.start || '',
                      endYear: exp.endYear || exp.end || '',
                      startMonth: exp.startMonth || '',
                      endMonth: exp.endMonth || '',
                      currentlyWorking: !!exp.current || !!exp.currentlyWorking,
                      description: exp.description || '',
                      achievements: Array.isArray(exp.achievements) ? exp.achievements : []
                    });
                    importedCount++;
                  }
                }

                // Import education entries
                if (result.education && Array.isArray(result.education)) {
                  if (!this.data[PROFILE_TYPES.EDUCATION]) {
                    this.data[PROFILE_TYPES.EDUCATION] = [];
                  }
                  for (const edu of result.education) {
                    this.data[PROFILE_TYPES.EDUCATION].push({
                      id: generateId(),
                      tags: [],
                      usedIn: [],
                      included: true,
                      degree: edu.degree || '',
                      qualification: edu.field || edu.qualification || '',
                      institution: edu.school || edu.institution || '',
                      location: edu.location || '',
                      startDate: edu.startDate || edu.start || '',
                      endDate: edu.endDate || edu.end || '',
                      gpa: edu.gpa || ''
                    });
                    importedCount++;
                  }
                }

                // Import skills
                if (result.skills && Array.isArray(result.skills)) {
                  if (!this.data[PROFILE_TYPES.SKILLS]) {
                    this.data[PROFILE_TYPES.SKILLS] = [];
                  }
                  // Group skills into a single entry
                  if (result.skills.length > 0) {
                    this.data[PROFILE_TYPES.SKILLS].push({
                      id: generateId(),
                      tags: [],
                      usedIn: [],
                      included: true,
                      category: 'LinkedIn Skills',
                      skills: result.skills.join(', ')
                    });
                    importedCount += result.skills.length;
                  }
                }

                // Update personal info name/title if available
                if (result.name || result.title) {
                  // Store as a note in the data for reference
                  const nameInfo = [result.name, result.title].filter(Boolean).join(' - ');
                  toast.info(`Profile: ${nameInfo}`);
                }

                await this.saveData();
                this.renderTabContent();

                const parts = [];
                if (result.experience && result.experience.length) parts.push(`${result.experience.length} role(s)`);
                if (result.education && result.education.length) parts.push(`${result.education.length} education item(s)`);
                if (result.skills && result.skills.length) parts.push(`${result.skills.length} skill(s)`);
                toast.success(`LinkedIn import complete: ${parts.join(', ') || importedCount + ' item(s)'}`);

                return true;
              } catch (error) {
                console.error('LinkedIn import failed:', error);
                toast.error(`LinkedIn import failed: ${error.message}`);
                return false;
              }
            }
          }
        ]
      });
    }
  }

  /**
   * Improves all achievement bullets across employment entries using AI
   */
  async improveAllBullets() {
    const employmentItems = this.data[PROFILE_TYPES.EMPLOYMENT] || [];
    if (employmentItems.length === 0) {
      toast.warning('No employment entries found. Add roles first.');
      return;
    }

    // Collect all bullets with their source mapping
    const bulletMap = []; // { entryIndex, bulletIndex, text }
    employmentItems.forEach((entry, entryIndex) => {
      if (entry.achievements && Array.isArray(entry.achievements)) {
        entry.achievements.forEach((bullet, bulletIndex) => {
          const text = typeof bullet === 'string' ? bullet : (bullet && bullet.text ? bullet.text : '');
          if (text.trim()) {
            bulletMap.push({ entryIndex, bulletIndex, text: text.trim() });
          }
        });
      }
      // Also check description field for bullet-like content
      if (entry.description && typeof entry.description === 'string' && entry.description.trim()) {
        // Only if no achievements exist, treat description as a single bullet
        if (!entry.achievements || entry.achievements.length === 0) {
          bulletMap.push({ entryIndex, bulletIndex: -1, text: entry.description.trim(), isDescription: true });
        }
      }
    });

    if (bulletMap.length === 0) {
      toast.warning('No achievement bullets found in employment entries.');
      return;
    }

    try {
      toast.info(`Improving ${bulletMap.length} bullet(s) with AI...`);

      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(localStorage.getItem('cc_ai_api_key') || '');
      const allBulletTexts = bulletMap.map(b => b.text);
      const improved = await ai.bulkImprove(allBulletTexts);

      if (!improved || improved.length === 0) {
        toast.warning('AI returned no improvements.');
        return;
      }

      // Count unique roles affected
      const rolesAffected = new Set(bulletMap.map(b => b.entryIndex)).size;
      const bulletsImproved = Math.min(improved.length, bulletMap.length);

      // Build preview of changes
      const previewForm = createElement('div', '', { class: 'master-profile-editor-form' });
      const summaryText = createElement('p', `Improved ${bulletsImproved} bullet(s) across ${rolesAffected} role(s). Apply changes?`, {
        class: 'master-profile-description'
      });
      previewForm.appendChild(summaryText);

      // Show a few sample changes
      const maxPreview = Math.min(3, bulletsImproved);
      for (let i = 0; i < maxPreview; i++) {
        const changeGroup = createElement('div', '', { class: 'form-group' });

        const originalLabel = createElement('label', 'Before:', { class: 'form-label', style: 'color: var(--danger, #e74c3c);' });
        changeGroup.appendChild(originalLabel);
        const originalText = createElement('p', bulletMap[i].text, { class: 'text-sm', style: 'margin: 0 0 4px 0; opacity: 0.7;' });
        changeGroup.appendChild(originalText);

        const improvedLabel = createElement('label', 'After:', { class: 'form-label', style: 'color: var(--success, #27ae60);' });
        changeGroup.appendChild(improvedLabel);
        const improvedText = createElement('p', typeof improved[i] === 'string' ? improved[i] : (improved[i] && improved[i].text ? improved[i].text : String(improved[i])), {
          class: 'text-sm', style: 'margin: 0;'
        });
        changeGroup.appendChild(improvedText);

        previewForm.appendChild(changeGroup);
      }

      if (bulletsImproved > maxPreview) {
        const moreText = createElement('p', `...and ${bulletsImproved - maxPreview} more improvement(s).`, {
          class: 'text-sm', style: 'opacity: 0.6; margin-top: 8px;'
        });
        previewForm.appendChild(moreText);
      }

      if (window.CC && window.CC.modal) {
        window.CC.modal.show({
          title: '✨ Bulk Bullet Improvements',
          body: previewForm,
          size: 'large',
          actions: [
            { label: 'Cancel', type: 'secondary', handler: () => { window.CC.modal.close(); return null; } },
            {
              label: 'Apply All',
              type: 'primary',
              handler: async () => {
                // Map improved bullets back to their original entries
                for (let i = 0; i < bulletsImproved; i++) {
                  const mapping = bulletMap[i];
                  const improvedText = typeof improved[i] === 'string' ? improved[i] : (improved[i] && improved[i].text ? improved[i].text : String(improved[i]));

                  if (mapping.isDescription) {
                    // Update description field
                    employmentItems[mapping.entryIndex].description = improvedText;
                  } else {
                    // Update achievement bullet
                    const entry = employmentItems[mapping.entryIndex];
                    if (entry.achievements && entry.achievements[mapping.bulletIndex] !== undefined) {
                      if (typeof entry.achievements[mapping.bulletIndex] === 'string') {
                        entry.achievements[mapping.bulletIndex] = improvedText;
                      } else if (entry.achievements[mapping.bulletIndex] && typeof entry.achievements[mapping.bulletIndex] === 'object') {
                        entry.achievements[mapping.bulletIndex].text = improvedText;
                      }
                    }
                  }
                }

                await this.saveData();
                this.renderTabContent();

                toast.success(`Applied ${bulletsImproved} improved bullet(s) across ${rolesAffected} role(s).`);
                return true;
              }
            }
          ]
        });
      }
    } catch (error) {
      console.error('Bulk bullet improvement failed:', error);
      toast.error(`Bullet improvement failed: ${error.message}`);
    }
  }

  /**
   * Exports profile as JSON
   */
  exportProfile() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `master-profile-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports profile from JSON
   */
  importProfile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (confirm('This will replace your current profile. Continue?')) {
          this.data = imported;
          await this.saveData();
          this.renderItems();
        }
      } catch (error) {
        console.error('Failed to import profile:', error);
        alert('Failed to import profile. Please check the file format.');
      }
    });

    input.click();
  }

  /**
   * Loads data from database
   */
  async loadData() {
    try {
      const items = await this.db.getAll(STORES.MASTER_PROFILE);

      // Organize by type
      this.data = {};
      items.forEach(item => {
        if (!this.data[item.type]) {
          this.data[item.type] = [];
        }
        this.data[item.type].push(item);
      });
    } catch (error) {
      console.error('Failed to load master profile:', error);
      this.data = {};
    }
  }

  /**
   * Saves data to database
   */
  async saveData() {
    try {
      // Clear existing data
      const existing = await this.db.getAll(STORES.MASTER_PROFILE);
      for (const item of existing) {
        await this.db.delete(STORES.MASTER_PROFILE, item.id);
      }

      // Save all items
      for (const [type, items] of Object.entries(this.data)) {
        for (const item of items) {
          await this.db.put(STORES.MASTER_PROFILE, {
            ...item,
            type,
            lastModified: new Date().toISOString()
          });
        }
      }

      this.events.emit('master-profile:saved');
    } catch (error) {
      console.error('Failed to save master profile:', error);
      this.events.emit('master-profile:error', { error });
    }
  }

  /**
   * Gets all items of a specific type
   */
  getItemsByType(type) {
    return this.data[type] || [];
  }

  /**
   * Gets a specific item by ID
   */
  getItemById(id) {
    for (const items of Object.values(this.data)) {
      const item = items.find(i => i.id === id);
      if (item) return item;
    }
    return null;
  }

  /**
   * Cleans up event listeners
   */
  destroy() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
  }
}

export default MasterProfile;
