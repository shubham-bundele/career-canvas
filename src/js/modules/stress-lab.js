/**
 * Template Stress Lab — Developer Tool
 * Tests registered templates against extreme/edge-case data fixtures
 * to surface overflow, render errors, and layout breakage.
 */

import { createElement } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import eventBus from '../core/events.js';

// ==================== TEST FIXTURES ====================

function baseDocument(overrides = {}) {
  const now = new Date().toISOString();
  const base = {
    id: generateUUID(), schemaVersion: 1, name: 'Stress Test Doc', type: 'resume',
    format: 'a4', templateId: 'ats-essential', pageSize: 'A4',
    createdAt: now, lastModified: now, targetRole: '', targetCompany: '',
    tags: [], pinned: false, archived: false, atsMode: false,
    designPreset: 'professional', sectionOrder: [],
    personalInfo: {
      fullName: 'Jane Doe', preferredName: '', professionalTitle: 'Software Engineer',
      resumeHeadline: '', pronunciation: '', email: 'jane@example.com',
      secondaryEmail: '', phone: '+1 (555) 000-0000', secondaryPhone: '',
      city: 'New York', state: 'NY', country: 'United States', postalCode: '10001',
      fullAddress: '', personalWebsite: 'https://janedoe.dev', portfolioUrl: '',
      linkedinUrl: 'https://linkedin.com/in/janedoe', githubUrl: 'https://github.com/janedoe',
      gitlabUrl: '', stackOverflowUrl: '', orcid: '', googleScholar: '',
      behance: '', dribbble: '', otherProfiles: [], workAuthorization: '',
      willingToRelocate: false, remotePreference: '', photograph: null, signature: null
    },
    sections: [
      { id: generateUUID(), sectionType: 'summary', type: 'text', title: 'Professional Summary', visible: true, content: 'Experienced software engineer with 5 years of experience.', items: [] },
      { id: generateUUID(), sectionType: 'experience', type: 'list', title: 'Work Experience', visible: true, content: '', items: [
        { id: generateUUID(), jobTitle: 'Software Engineer', company: 'Acme Corp', companyDescription: '', employmentType: 'Full-time', department: 'Engineering', location: 'New York, NY', remoteType: '', startMonth: 'Jan', startYear: '2020', endMonth: '', endYear: '', currentlyWorking: true, roleSummary: '', responsibilities: '', achievements: [{ id: generateUUID(), text: 'Built scalable APIs serving 1M requests per day', actionVerb: 'Built', skillTags: [], metricTags: [], relevance: 'high', alternateVersions: [], included: true, order: 0 }], technologies: ['JavaScript', 'Node.js', 'PostgreSQL'], methods: ['Agile'], teamSize: '8', reportingScope: '', companyUrl: '', industryTags: [], skillTags: [], relevanceTags: [], included: true, hidden: false, order: 0 }
      ] },
      { id: generateUUID(), sectionType: 'education', type: 'list', title: 'Education', visible: true, content: '', items: [
        { id: generateUUID(), degree: 'B.S. Computer Science', qualification: '', specialization: '', institution: 'State University', department: '', location: 'New York, NY', startDate: null, endDate: null, currentlyStudying: false, grade: '', gpa: '3.8', percentage: '', honors: 'Cum Laude', relevantCoursework: [], thesis: '', dissertation: '', academicProjects: [], activities: [], societies: [], description: '', institutionUrl: '', hideGrade: false, included: true, hidden: false, order: 0 }
      ] },
      { id: generateUUID(), sectionType: 'skills', type: 'list', title: 'Skills', visible: true, content: '', items: [
        { id: generateUUID(), name: 'JavaScript', category: 'Programming', proficiencyLevel: 'Expert', yearsOfExperience: 5, lastUsed: null, endorsements: 0, relatedSkills: [], included: true, order: 0 },
        { id: generateUUID(), name: 'Python', category: 'Programming', proficiencyLevel: 'Advanced', yearsOfExperience: 3, lastUsed: null, endorsements: 0, relatedSkills: [], included: true, order: 1 },
        { id: generateUUID(), name: 'React', category: 'Frontend', proficiencyLevel: 'Expert', yearsOfExperience: 4, lastUsed: null, endorsements: 0, relatedSkills: [], included: true, order: 2 }
      ] }
    ],
    design: { templateId: 'ats-essential', accentColor: '#2563eb', fontSize: 11, fontFamily: 'Inter', lineHeight: 1.5, margins: { top: 20, right: 20, bottom: 20, left: 20 } }
  };

  const merged = JSON.parse(JSON.stringify(base));
  for (const key of Object.keys(overrides)) {
    if (key === 'personalInfo' && typeof overrides.personalInfo === 'object') {
      Object.assign(merged.personalInfo, overrides.personalInfo);
    } else if (key === 'sections' && Array.isArray(overrides.sections)) {
      merged.sections = overrides.sections;
    } else if (key === 'design' && typeof overrides.design === 'object') {
      Object.assign(merged.design, overrides.design);
    } else {
      merged[key] = overrides[key];
    }
  }
  return merged;
}

function makeAchievement(text, idx) {
  return { id: generateUUID(), text, actionVerb: text.split(' ')[0] || 'Did', skillTags: [], metricTags: [], relevance: 'high', alternateVersions: [], included: true, order: idx };
}

function makeExperienceItem(overrides = {}) {
  return Object.assign({
    id: generateUUID(), jobTitle: 'Software Engineer', company: 'Company Inc',
    companyDescription: '', employmentType: 'Full-time', department: 'Eng',
    location: 'City, ST', remoteType: '', startMonth: 'Jan', startYear: '2019',
    endMonth: 'Dec', endYear: '2020', currentlyWorking: false,
    roleSummary: '', responsibilities: '',
    achievements: [makeAchievement('Delivered key feature on time.', 0)],
    technologies: ['JavaScript'], methods: ['Agile'], teamSize: '5',
    reportingScope: '', companyUrl: '', industryTags: [], skillTags: [],
    relevanceTags: [], included: true, hidden: false, order: 0
  }, overrides);
}

function makeSkill(name, idx) {
  return { id: generateUUID(), name, category: 'General', proficiencyLevel: 'Intermediate', yearsOfExperience: 2, lastUsed: null, endorsements: 0, relatedSkills: [], included: true, order: idx };
}

function emptyPI() {
  return { fullName: '', professionalTitle: '', email: '', phone: '', city: '', state: '', country: '', personalWebsite: '', linkedinUrl: '', githubUrl: '' };
}

function emptySection(sectionType, title) {
  return { id: generateUUID(), sectionType, type: 'list', title, visible: true, content: '', items: [] };
}

function getTestFixtures() {
  return [
    {
      name: 'Long Name (100 chars)',
      description: 'Full name is 100 characters of repeated text',
      data: baseDocument({ personalInfo: { fullName: 'A'.repeat(100) } })
    },
    {
      name: 'Long Job Title (150 chars)',
      description: 'Professional title is 150 characters long',
      data: baseDocument({ personalInfo: { professionalTitle: 'B'.repeat(150) } })
    },
    {
      name: 'Long Company Name (120 chars)',
      description: 'Company name in experience section is 120 characters',
      data: (() => {
        const doc = baseDocument();
        if (doc.sections[1]?.items?.[0]) doc.sections[1].items[0].company = 'C'.repeat(120);
        return doc;
      })()
    },
    {
      name: 'Many Skills (50 items)',
      description: '50 skill items in the skills section',
      data: (() => {
        const doc = baseDocument();
        const sec = doc.sections.find(s => s.sectionType === 'skills');
        if (sec) sec.items = Array.from({ length: 50 }, (_, i) => makeSkill(`Skill_${String(i + 1).padStart(2, '0')}`, i));
        return doc;
      })()
    },
    {
      name: '10 Experience Entries',
      description: '10 fully detailed work experience items',
      data: (() => {
        const companies = ['Alpha Inc', 'Beta LLC', 'Gamma Corp', 'Delta Ltd', 'Epsilon Co', 'Zeta Group', 'Eta Systems', 'Theta Labs', 'Iota Ventures', 'Kappa Digital'];
        const titles = ['Software Engineer', 'Senior Developer', 'Tech Lead', 'Full Stack Dev', 'Backend Engineer', 'Frontend Engineer', 'DevOps Engineer', 'Data Engineer', 'Platform Engineer', 'Staff Engineer'];
        const items = companies.map((co, i) => makeExperienceItem({
          jobTitle: titles[i], company: co, startYear: String(2014 + i), endYear: String(2015 + i), order: i,
          achievements: [
            makeAchievement(`Led initiative ${i + 1} resulting in 20% efficiency gains across the platform.`, 0),
            makeAchievement(`Implemented feature ${i + 1} used by 50K+ daily active users.`, 1),
            makeAchievement(`Mentored ${i + 2} junior engineers on best practices and code reviews.`, 2)
          ],
          technologies: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL']
        }));
        const doc = baseDocument();
        const sec = doc.sections.find(s => s.sectionType === 'experience');
        if (sec) sec.items = items;
        return doc;
      })()
    },
    {
      name: 'Unicode Characters',
      description: 'Names with accents, CJK, emoji, and RTL text in all fields',
      data: baseDocument({
        personalInfo: {
          fullName: 'Emilie Muller-田中 🚀 محمد',
          professionalTitle: 'Ingénieur Logiciel / ソフトウェアエンジニア — مهندس',
          email: 'emilie@example.com', phone: '+49 170 1234567',
          city: 'München / 東京', state: 'Bayern', country: 'Deutschland / المانيا'
        },
        sections: [
          { id: generateUUID(), sectionType: 'summary', type: 'text', title: 'Résumé / 履歴書', visible: true, content: 'Experienced エンジニア with expertise in البرمجة. Built products for global markets. Skills: C++, Rust, 人工知能, Машинное обучение.', items: [] },
          { id: generateUUID(), sectionType: 'experience', type: 'list', title: '経験 / Erfahrung', visible: true, content: '', items: [
            makeExperienceItem({ jobTitle: 'リードエンジニア (Lead Engineer)', company: '株式会社テクノロジー / Technologie GmbH', location: '東京 / München', achievements: [makeAchievement('Developed system serving 2M+ users across global markets', 0)] })
          ] },
          { id: generateUUID(), sectionType: 'skills', type: 'list', title: 'スキル / Kompetenzen', visible: true, content: '', items: [makeSkill('人工知能 (AI)', 0), makeSkill('Машинное обучение', 1), makeSkill('Rust', 2), makeSkill('برمجة', 3)] }
        ]
      })
    },
    {
      name: 'Empty Sections',
      description: 'All sections present but with empty content and no items',
      data: baseDocument({
        personalInfo: Object.assign(emptyPI(), { fullName: 'Empty Test' }),
        sections: [
          emptySection('summary', 'Professional Summary'),
          emptySection('experience', 'Work Experience'),
          emptySection('education', 'Education'),
          emptySection('skills', 'Skills'),
          emptySection('projects', 'Projects'),
          emptySection('certifications', 'Certifications')
        ]
      })
    },
    {
      name: 'Very Long Bullets (500 chars)',
      description: 'Experience bullet points each 500 characters long',
      data: (() => {
        const longText = 'Spearheaded the end-to-end design, development, and deployment of a highly distributed real-time data pipeline that ingested, transformed, and routed over two million events per second across multiple geographic regions, achieving sub-millisecond latency while maintaining five-nines availability and full compliance with SOC-2, GDPR, and HIPAA regulatory requirements, resulting in a measurable forty-three percent reduction in operational costs and a thirty percent improvement in downstream analytics accuracy.';
        const bullet = longText.substring(0, 500);
        const doc = baseDocument();
        const sec = doc.sections.find(s => s.sectionType === 'experience');
        if (sec?.items?.[0]) {
          sec.items[0].achievements = Array.from({ length: 5 }, (_, i) => makeAchievement(bullet, i));
        }
        return doc;
      })()
    },
    {
      name: 'Minimal Data',
      description: 'Only fullName set, everything else empty or missing',
      data: baseDocument({
        personalInfo: Object.assign(emptyPI(), { fullName: 'Minimal Person' }),
        sections: []
      })
    }
  ];
}

// ==================== CONSTANTS ====================

const LETTER_WIDTH_PX = 816;
const STATUS_PASS = 'pass';
const STATUS_FAIL = 'fail';
const STATUS_ERROR = 'error';

// ==================== MODULE ====================

export class StressLab {
  constructor(db, events) {
    this.db = db;
    this.events = events || eventBus;
    this.container = null;
    this.listeners = [];

    this.templates = [];
    this.selectedIds = new Set();
    this.results = [];
    this.running = false;
    this.progress = { current: 0, total: 0 };
    this.showFailuresOnly = false;
    this.sortField = 'template';
    this.sortDirection = 'asc';
    this.cancelled = false;
  }

  // ==================== RENDER / LIFECYCLE ====================

  async render() {
    this.container = createElement('div', '', { class: 'sl-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Template Stress Lab');
    this.container.appendChild(this.renderHeader());
    const content = createElement('div', '', { class: 'sl-content', id: 'sl-content' });
    this.container.appendChild(content);
    await this.showMain();
    return this.container;
  }

  renderHeader() {
    const header = createElement('div', '', { class: 'sl-header' });

    const breadcrumb = createElement('nav', '', { class: 'sl-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });
    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcLink);
    bcList.appendChild(bcHome);
    bcList.appendChild(createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' }));
    bcList.appendChild(createElement('li', 'Template Stress Lab', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' }));
    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    const row = createElement('div', '', { class: 'sl-title-row' });
    const group = createElement('div', '', { class: 'sl-title-group' });
    group.appendChild(createElement('h1', 'Template Stress Lab', { class: 'sl-title' }));
    group.appendChild(createElement('span', 'Developer Tool', { class: 'sl-dev-badge' }));
    group.appendChild(createElement('p', 'Test your templates against edge-case data fixtures to catch overflow, render errors, and layout breakage before they reach users. Everything runs locally in your browser.', { class: 'sl-description' }));
    row.appendChild(group);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline sl-back-btn' });
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

  destroy() {
    this.cancelled = true;
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  gc() { return this.container?.querySelector('#sl-content') || this.container; }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  // ==================== TEMPLATE DISCOVERY ====================

  discoverTemplates() {
    let templates = [];
    const engine = window.CC?.templateEngine;
    if (engine) {
      if (typeof engine.getRegisteredTemplates === 'function') {
        templates = engine.getRegisteredTemplates();
      } else if (engine.templates instanceof Map) {
        templates = Array.from(engine.templates.values());
      } else if (engine.templates && typeof engine.templates === 'object') {
        templates = Object.values(engine.templates);
      }
    }
    return templates.filter(t => t && typeof t.render === 'function' && t.id);
  }

  // ==================== MAIN VIEW ====================

  async showMain() {
    const content = this.gc();
    if (!content) return;
    content.textContent = '';
    this.results = [];
    this.selectedIds.clear();
    this.templates = this.discoverTemplates();

    const main = createElement('div', '', { class: 'sl-main' });

    // Developer banner
    const banner = createElement('div', '', { class: 'sl-dev-banner' });
    const bannerIcon = createElement('span', '', { class: 'sl-dev-banner-icon' });
    bannerIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
    banner.appendChild(bannerIcon);
    banner.appendChild(createElement('span', 'This is a developer tool for testing template robustness. It does not modify any saved documents.', { class: 'sl-dev-banner-text' }));
    main.appendChild(banner);

    if (this.templates.length === 0) {
      const empty = createElement('div', '', { class: 'sl-empty-msg' });
      empty.appendChild(createElement('p', 'No templates found.'));
      empty.appendChild(createElement('p', 'Templates are loaded from window.CC.templateEngine. Ensure the template engine is initialized and templates are registered before using the Stress Lab.'));
      main.appendChild(empty);
      content.appendChild(main);
      return;
    }

    const fixtureCount = getTestFixtures().length;
    main.appendChild(createElement('p', `${this.templates.length} template${this.templates.length !== 1 ? 's' : ''} registered. Select templates to test against ${fixtureCount} data fixtures.`, { class: 'sl-info-text' }));

    // Controls
    const controls = createElement('div', '', { class: 'sl-controls' });

    const selectAllBtn = createElement('button', 'Select All', { class: 'btn btn-sm btn-outline sl-select-btn' });
    this.addListener(selectAllBtn, 'click', () => {
      this.templates.forEach(t => this.selectedIds.add(t.id));
      this.updateCheckboxes();
      this.updateRunBtnState();
    });
    controls.appendChild(selectAllBtn);

    const deselectAllBtn = createElement('button', 'Deselect All', { class: 'btn btn-sm btn-outline sl-select-btn' });
    this.addListener(deselectAllBtn, 'click', () => {
      this.selectedIds.clear();
      this.updateCheckboxes();
      this.updateRunBtnState();
    });
    controls.appendChild(deselectAllBtn);
    controls.appendChild(createElement('div', '', { class: 'sl-spacer' }));

    const runAllBtn = createElement('button', 'Run All', { class: 'btn btn-sm btn-primary sl-run-all-btn' });
    this.addListener(runAllBtn, 'click', async () => {
      this.templates.forEach(t => this.selectedIds.add(t.id));
      this.updateCheckboxes();
      await this.runTests();
    });
    controls.appendChild(runAllBtn);

    const runBtn = createElement('button', 'Run Stress Test', { class: 'btn btn-sm btn-primary sl-run-btn', id: 'sl-run-btn' });
    runBtn.disabled = true;
    this.addListener(runBtn, 'click', () => this.runTests());
    controls.appendChild(runBtn);
    main.appendChild(controls);

    // Template list
    const list = createElement('div', '', { class: 'sl-template-list', id: 'sl-template-list' });
    for (const tmpl of this.templates) {
      const item = createElement('label', '', { class: 'sl-template-item' });
      item.setAttribute('data-template-id', tmpl.id);

      const checkbox = createElement('input', '', { type: 'checkbox', class: 'sl-template-checkbox' });
      checkbox.setAttribute('data-id', tmpl.id);
      this.addListener(checkbox, 'change', () => {
        if (checkbox.checked) this.selectedIds.add(tmpl.id);
        else this.selectedIds.delete(tmpl.id);
        this.updateRunBtnState();
      });
      item.appendChild(checkbox);

      const details = createElement('div', '', { class: 'sl-template-details' });
      details.appendChild(createElement('span', tmpl.name || tmpl.id, { class: 'sl-template-name' }));
      const parts = [];
      if (tmpl.category) parts.push(tmpl.category);
      parts.push('ID: ' + tmpl.id);
      details.appendChild(createElement('span', parts.join(' • '), { class: 'sl-template-meta' }));
      item.appendChild(details);
      list.appendChild(item);
    }
    main.appendChild(list);
    content.appendChild(main);
  }

  updateCheckboxes() {
    if (!this.container) return;
    this.container.querySelectorAll('.sl-template-checkbox').forEach(cb => {
      cb.checked = this.selectedIds.has(cb.getAttribute('data-id'));
    });
  }

  updateRunBtnState() {
    const btn = this.container?.querySelector('#sl-run-btn');
    if (btn) btn.disabled = this.selectedIds.size === 0;
  }

  // ==================== TEST RUNNER ====================

  async runTests() {
    if (this.running) return;
    this.running = true;
    this.cancelled = false;
    this.results = [];

    const selectedTemplates = this.templates.filter(t => this.selectedIds.has(t.id));
    const fixtures = getTestFixtures();
    this.progress = { current: 0, total: selectedTemplates.length * fixtures.length };
    this.showProgress();

    const testBed = document.createElement('div');
    testBed.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:' + LETTER_WIDTH_PX + 'px;overflow:visible;visibility:hidden;z-index:-1;';
    document.body.appendChild(testBed);

    try {
      for (const tmpl of selectedTemplates) {
        if (this.cancelled) break;
        for (const fixture of fixtures) {
          if (this.cancelled) break;
          this.results.push(await this.runSingleTest(tmpl, fixture, testBed));
          this.progress.current++;
          this.updateProgressUI();
          await new Promise(r => setTimeout(r, 0));
        }
      }
    } finally {
      if (testBed.parentNode) document.body.removeChild(testBed);
      this.running = false;
    }

    if (!this.cancelled) this.showResults();
  }

  async runSingleTest(template, fixture, testBed) {
    const result = {
      templateName: template.name || template.id,
      templateId: template.id,
      testName: fixture.name,
      testDescription: fixture.description,
      passed: false, status: STATUS_ERROR, error: null,
      renderTime: 0, overflowDetected: false, emptyOutput: false
    };

    const testData = JSON.parse(JSON.stringify(fixture.data));
    if (testData.design) testData.design.templateId = template.id;
    testData.templateId = template.id;

    const t0 = performance.now();
    let html = '';
    try {
      html = template.render(testData);
      result.renderTime = Math.round((performance.now() - t0) * 100) / 100;
    } catch (err) {
      result.renderTime = Math.round((performance.now() - t0) * 100) / 100;
      result.error = 'Render error: ' + (err.message || String(err));
      result.status = STATUS_ERROR;
      return result;
    }

    if (!html || (typeof html === 'string' && html.trim().length === 0)) {
      result.emptyOutput = true;
      result.error = 'Template returned empty output';
      result.status = STATUS_FAIL;
      return result;
    }

    try {
      testBed.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width:' + LETTER_WIDTH_PX + 'px;overflow:visible;position:relative;';
      wrapper.innerHTML = html;
      testBed.appendChild(wrapper);
      result.overflowDetected = this.detectOverflow(wrapper);
      testBed.innerHTML = '';
    } catch (err) {
      result.error = 'Overflow check error: ' + (err.message || String(err));
      result.status = STATUS_ERROR;
      return result;
    }

    if (result.overflowDetected) {
      result.status = STATUS_FAIL;
      result.error = 'Horizontal overflow detected (content exceeds ' + LETTER_WIDTH_PX + 'px page width)';
    } else {
      result.status = STATUS_PASS;
      result.passed = true;
    }
    return result;
  }

  detectOverflow(container) {
    if (container.scrollWidth > container.offsetWidth + 2) return true;
    return this.checkChildOverflow(container, 0, 3);
  }

  checkChildOverflow(el, depth, maxDepth) {
    if (depth >= maxDepth) return false;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      if (child.scrollWidth > child.clientWidth + 2) return true;
      if (this.checkChildOverflow(child, depth + 1, maxDepth)) return true;
    }
    return false;
  }

  // ==================== PROGRESS VIEW ====================

  showProgress() {
    const content = this.gc();
    if (!content) return;
    content.textContent = '';

    const wrap = createElement('div', '', { class: 'sl-progress' });
    wrap.appendChild(createElement('div', '', { class: 'sl-spinner' }));
    wrap.appendChild(createElement('p', 'Running stress tests...', { class: 'sl-progress-title' }));

    const bar = createElement('div', '', { class: 'sl-progress-bar-track' });
    const fill = createElement('div', '', { class: 'sl-progress-bar-fill', id: 'sl-progress-fill' });
    fill.style.width = '0%';
    bar.appendChild(fill);
    wrap.appendChild(bar);
    wrap.appendChild(createElement('p', '0 / 0', { class: 'sl-progress-text', id: 'sl-progress-text' }));

    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-sm btn-outline sl-cancel-btn' });
    this.addListener(cancelBtn, 'click', () => {
      this.cancelled = true;
      this.results.length > 0 ? this.showResults() : this.showMain();
    });
    wrap.appendChild(cancelBtn);
    content.appendChild(wrap);
  }

  updateProgressUI() {
    const fill = this.container?.querySelector('#sl-progress-fill');
    const text = this.container?.querySelector('#sl-progress-text');
    if (!fill || !text) return;
    const pct = this.progress.total > 0 ? Math.round((this.progress.current / this.progress.total) * 100) : 0;
    fill.style.width = pct + '%';
    text.textContent = `${this.progress.current} / ${this.progress.total} tests (${pct}%)`;
  }

  // ==================== RESULTS VIEW ====================

  showResults() {
    const content = this.gc();
    if (!content) return;
    content.textContent = '';

    const wrap = createElement('div', '', { class: 'sl-results' });
    wrap.appendChild(this.buildSummary());

    // Toolbar
    const toolbar = createElement('div', '', { class: 'sl-results-toolbar' });

    const filterLabel = createElement('label', '', { class: 'sl-filter-label' });
    const filterCb = createElement('input', '', { type: 'checkbox', class: 'sl-filter-checkbox' });
    filterCb.checked = this.showFailuresOnly;
    this.addListener(filterCb, 'change', () => { this.showFailuresOnly = filterCb.checked; this.renderResultsTable(); });
    filterLabel.appendChild(filterCb);
    filterLabel.appendChild(createElement('span', ' Show failures only'));
    toolbar.appendChild(filterLabel);

    const sortGroup = createElement('div', '', { class: 'sl-sort-group' });
    sortGroup.appendChild(createElement('span', 'Sort by: ', { class: 'sl-sort-label' }));

    const sortSelect = createElement('select', '', { class: 'sl-sort-select' });
    [['template', 'Template Name'], ['test', 'Test Name'], ['status', 'Status'], ['time', 'Render Time']].forEach(([val, label]) => {
      const opt = createElement('option', label, { value: val });
      if (val === this.sortField) opt.selected = true;
      sortSelect.appendChild(opt);
    });
    this.addListener(sortSelect, 'change', () => { this.sortField = sortSelect.value; this.renderResultsTable(); });
    sortGroup.appendChild(sortSelect);

    const dirBtn = createElement('button', this.sortDirection === 'asc' ? '↑ Asc' : '↓ Desc', { class: 'btn btn-sm btn-outline sl-sort-dir-btn', id: 'sl-sort-dir-btn' });
    this.addListener(dirBtn, 'click', () => {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      dirBtn.textContent = this.sortDirection === 'asc' ? '↑ Asc' : '↓ Desc';
      this.renderResultsTable();
    });
    sortGroup.appendChild(dirBtn);
    toolbar.appendChild(sortGroup);

    const actions = createElement('div', '', { class: 'sl-results-actions' });
    const exportBtn = createElement('button', 'Export Report', { class: 'btn btn-sm btn-outline sl-export-btn' });
    this.addListener(exportBtn, 'click', () => this.exportReport());
    actions.appendChild(exportBtn);

    const rerunBtn = createElement('button', 'Re-run Tests', { class: 'btn btn-sm btn-outline sl-rerun-btn' });
    this.addListener(rerunBtn, 'click', () => this.runTests());
    actions.appendChild(rerunBtn);

    const backBtn = createElement('button', 'Back to Templates', { class: 'btn btn-sm btn-outline sl-back-main-btn' });
    this.addListener(backBtn, 'click', () => this.showMain());
    actions.appendChild(backBtn);
    toolbar.appendChild(actions);
    wrap.appendChild(toolbar);

    wrap.appendChild(createElement('div', '', { class: 'sl-results-table-wrap', id: 'sl-results-table-wrap' }));
    content.appendChild(wrap);
    this.renderResultsTable();
  }

  buildSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === STATUS_PASS).length;
    const failed = this.results.filter(r => r.status === STATUS_FAIL).length;
    const errors = this.results.filter(r => r.status === STATUS_ERROR).length;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const summary = createElement('div', '', { class: 'sl-summary' });
    const makeStat = (label, value, cls) => {
      const s = createElement('div', '', { class: 'sl-summary-stat ' + cls });
      s.appendChild(createElement('span', String(value), { class: 'sl-summary-value' }));
      s.appendChild(createElement('span', label, { class: 'sl-summary-label' }));
      return s;
    };
    summary.appendChild(makeStat('Total', total, 'sl-stat-total'));
    summary.appendChild(makeStat('Passed', passed, 'sl-stat-passed'));
    summary.appendChild(makeStat('Failed', failed, 'sl-stat-failed'));
    summary.appendChild(makeStat('Errors', errors, 'sl-stat-errors'));

    const rateEl = createElement('div', '', { class: 'sl-summary-rate' });
    rateEl.appendChild(createElement('span', rate + '%', { class: 'sl-summary-rate-value' }));
    rateEl.appendChild(createElement('span', 'Pass Rate', { class: 'sl-summary-label' }));
    summary.appendChild(rateEl);
    return summary;
  }

  getSortedResults() {
    let filtered = this.showFailuresOnly
      ? this.results.filter(r => r.status !== STATUS_PASS)
      : [...this.results];
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (this.sortField) {
        case 'template': return dir * a.templateName.localeCompare(b.templateName);
        case 'test': return dir * a.testName.localeCompare(b.testName);
        case 'status': return dir * (({ error: 0, fail: 1, pass: 2 }[a.status] || 0) - ({ error: 0, fail: 1, pass: 2 }[b.status] || 0));
        case 'time': return dir * (a.renderTime - b.renderTime);
        default: return 0;
      }
    });
    return filtered;
  }

  renderResultsTable() {
    const wrap = this.container?.querySelector('#sl-results-table-wrap');
    if (!wrap) return;
    wrap.textContent = '';

    const sorted = this.getSortedResults();
    if (sorted.length === 0) {
      wrap.appendChild(createElement('p', this.showFailuresOnly ? 'All tests passed!' : 'No results to display.', { class: 'sl-empty-results' }));
      return;
    }

    const table = createElement('table', '', { class: 'sl-table' });
    table.setAttribute('role', 'table');

    const thead = createElement('thead', '');
    const hr = createElement('tr', '');
    ['Template', 'Test', 'Status', 'Render Time', 'Error'].forEach(h => hr.appendChild(createElement('th', h, { class: 'sl-th', scope: 'col' })));
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = createElement('tbody', '');
    for (const r of sorted) {
      const row = createElement('tr', '', { class: 'sl-tr sl-tr--' + r.status });
      row.appendChild(createElement('td', r.templateName, { class: 'sl-td sl-td-template' }));

      const testCell = createElement('td', '', { class: 'sl-td sl-td-test' });
      testCell.appendChild(createElement('span', r.testName, { class: 'sl-test-name' }));
      if (r.testDescription) testCell.appendChild(createElement('span', r.testDescription, { class: 'sl-test-desc' }));
      row.appendChild(testCell);

      const statusCell = createElement('td', '', { class: 'sl-td sl-td-status' });
      const badge = createElement('span', r.status === STATUS_PASS ? 'PASS' : r.status === STATUS_FAIL ? 'FAIL' : 'ERROR', { class: 'sl-status-badge sl-status--' + r.status });
      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      row.appendChild(createElement('td', r.renderTime + ' ms', { class: 'sl-td sl-td-time' }));

      const errorCell = createElement('td', '', { class: 'sl-td sl-td-error' });
      errorCell.appendChild(createElement('span', r.error || '—', { class: r.error ? 'sl-error-text' : 'sl-no-error' }));
      row.appendChild(errorCell);

      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    const scrollWrap = createElement('div', '', { class: 'sl-table-scroll' });
    scrollWrap.appendChild(table);
    wrap.appendChild(scrollWrap);
  }

  // ==================== EXPORT ====================

  exportReport() {
    const passed = this.results.filter(r => r.status === STATUS_PASS).length;
    const failed = this.results.filter(r => r.status !== STATUS_PASS).length;
    const report = {
      exportedAt: new Date().toISOString(),
      totalTests: this.results.length,
      passed, failed,
      results: this.results.map(r => ({
        templateName: r.templateName, templateId: r.templateId,
        testName: r.testName, testDescription: r.testDescription,
        status: r.status, passed: r.passed, error: r.error,
        renderTime: r.renderTime, overflowDetected: r.overflowDetected,
        emptyOutput: r.emptyOutput
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateStr = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

    const a = document.createElement('a');
    a.href = url;
    a.download = `stress-test-report-${dateStr}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.CC?.toast) window.CC.toast('Report exported as stress-test-report-' + dateStr + '.json', 'success');
  }
}

export { StressLab as default };
