/**
 * Portfolio Studio Module
 * Build a static portfolio page from existing resume documents.
 * Select sections, reorder them, add contact/social links,
 * toggle light/dark theme, preview live, and export as self-contained HTML.
 */

import { createElement, encodeHTML, sanitizeURL } from '../utils/sanitize.js';
import { generateUUID } from '../utils/id.js';
import { STORES } from '../core/db.js';

const STORAGE_KEY = 'cc_portfolio_config';

const DEFAULT_SECTIONS = [
  { id: 'projects',    label: 'Projects',            enabled: true },
  { id: 'skills',      label: 'Skills',              enabled: true },
  { id: 'certs',       label: 'Certifications',      enabled: true },
  { id: 'experience',  label: 'Experience Summary',  enabled: true },
  { id: 'education',   label: 'Education',           enabled: true },
  { id: 'contact',     label: 'Contact',             enabled: true }
];

export class PortfolioStudio {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.container = null;
    this.listeners = [];

    this.documents = [];
    this.selectedDocId = null;
    this.selectedDoc = null;
    this.sections = DEFAULT_SECTIONS.map(s => ({ ...s }));
    this.contactLinks = [];
    this.theme = 'light';
  }

  // --------------- lifecycle ---------------

  async render() {
    this.container = createElement('div', '', { class: 'port-container' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Portfolio Studio');

    this.container.appendChild(this.renderHeader());

    const content = createElement('div', '', { class: 'port-content', id: 'port-content' });
    this.container.appendChild(content);

    await this.loadDocuments();
    this.loadConfig();
    this.renderBody();

    return this.container;
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
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  gc() {
    return this.container ? this.container.querySelector('#port-content') : null;
  }

  hasUnsavedChanges() {
    return false;
  }

  // --------------- data helpers ---------------

  async loadDocuments() {
    try {
      this.documents = await this.db.getAll(STORES.DOCUMENTS);
    } catch (e) {
      this.documents = [];
    }
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (cfg.selectedDocId) this.selectedDocId = cfg.selectedDocId;
      if (Array.isArray(cfg.sections)) this.sections = cfg.sections;
      if (Array.isArray(cfg.contactLinks)) this.contactLinks = cfg.contactLinks;
      if (cfg.theme === 'light' || cfg.theme === 'dark') this.theme = cfg.theme;
      if (this.selectedDocId) {
        this.selectedDoc = this.documents.find(d => d.id === this.selectedDocId) || null;
      }
    } catch (e) {
      /* ignore corrupt data */
    }
  }

  saveConfig() {
    try {
      const cfg = {
        selectedDocId: this.selectedDocId,
        sections: this.sections,
        contactLinks: this.contactLinks,
        theme: this.theme
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      if (window.CC?.toast) window.CC.toast.show('Configuration saved', 'success');
    } catch (e) {
      if (window.CC?.toast) window.CC.toast.show('Failed to save configuration', 'error');
    }
  }

  // --------------- header ---------------

  renderHeader() {
    const header = createElement('div', '', { class: 'port-header' });

    // breadcrumb
    const breadcrumb = createElement('nav', '', { class: 'port-breadcrumb', 'aria-label': 'Breadcrumb' });
    const bcList = createElement('ol', '', { class: 'breadcrumb-list' });

    const bcHome = createElement('li', '', { class: 'breadcrumb-item' });
    const bcHomeLink = createElement('a', 'Dashboard', { class: 'breadcrumb-link' });
    bcHomeLink.setAttribute('href', '#/dashboard');
    bcHome.appendChild(bcHomeLink);
    bcList.appendChild(bcHome);

    const bcSep = createElement('li', '/', { class: 'breadcrumb-separator', 'aria-hidden': 'true' });
    bcList.appendChild(bcSep);

    const bcCurrent = createElement('li', 'Portfolio Studio', { class: 'breadcrumb-item breadcrumb-current', 'aria-current': 'page' });
    bcList.appendChild(bcCurrent);

    breadcrumb.appendChild(bcList);
    header.appendChild(breadcrumb);

    // title row
    const titleRow = createElement('div', '', { class: 'port-title-row' });
    const titleGroup = createElement('div', '', { class: 'port-title-group' });

    const title = createElement('h1', 'Portfolio Studio', { class: 'port-title' });
    titleGroup.appendChild(title);

    const subtitle = createElement('p', 'Build a shareable portfolio page from your resume content. Select sections, add links, choose a theme, and export as a standalone HTML file.', { class: 'port-subtitle' });
    titleGroup.appendChild(subtitle);

    titleRow.appendChild(titleGroup);

    const backBtn = createElement('button', '', { class: 'btn btn-sm btn-outline port-back-btn' });
    backBtn.innerHTML = '&#8592; Dashboard';
    backBtn.setAttribute('aria-label', 'Back to Dashboard');
    this.addListener(backBtn, 'click', () => {
      if (window.CC?.router) window.CC.router.navigate('/dashboard');
      else window.location.hash = '#/dashboard';
    });
    titleRow.appendChild(backBtn);

    header.appendChild(titleRow);
    return header;
  }

  // --------------- body (two-column) ---------------

  renderBody() {
    const content = this.gc();
    if (!content) return;
    content.innerHTML = '';

    const layout = createElement('div', '', { class: 'port-layout' });

    // left: config panel
    const configPanel = createElement('div', '', { class: 'port-config-panel' });
    configPanel.appendChild(this.renderDocumentSelector());
    configPanel.appendChild(this.renderSectionSelector());
    configPanel.appendChild(this.renderContactLinksEditor());
    configPanel.appendChild(this.renderThemeToggle());
    configPanel.appendChild(this.renderActionButtons());
    layout.appendChild(configPanel);

    // right: preview panel
    const previewPanel = createElement('div', '', { class: 'port-preview-panel' });
    const previewLabel = createElement('h2', 'Live Preview', { class: 'port-section-title' });
    previewPanel.appendChild(previewLabel);

    const previewFrame = createElement('div', '', { class: 'port-preview-frame', id: 'port-preview-frame' });
    previewPanel.appendChild(previewFrame);
    layout.appendChild(previewPanel);

    content.appendChild(layout);
    this.updatePreview();
  }

  // --------------- document selector ---------------

  renderDocumentSelector() {
    const wrap = createElement('fieldset', '', { class: 'port-fieldset' });
    const legend = createElement('legend', 'Source Document', { class: 'port-legend' });
    wrap.appendChild(legend);

    const select = createElement('select', '', { class: 'port-select', id: 'port-doc-select', 'aria-label': 'Select source document' });

    const placeholder = createElement('option', '-- Choose a document --', { value: '' });
    select.appendChild(placeholder);

    const nonArchived = this.documents.filter(d => !d.archived);
    nonArchived.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    nonArchived.forEach(doc => {
      const opt = createElement('option', doc.name || 'Untitled', { value: doc.id });
      if (doc.id === this.selectedDocId) opt.selected = true;
      select.appendChild(opt);
    });

    this.addListener(select, 'change', (e) => {
      this.selectedDocId = e.target.value || null;
      this.selectedDoc = this.documents.find(d => d.id === this.selectedDocId) || null;
      this.updatePreview();
    });

    wrap.appendChild(select);

    if (nonArchived.length === 0) {
      const hint = createElement('p', 'No documents found. Create a resume first.', { class: 'port-hint' });
      wrap.appendChild(hint);
    }

    return wrap;
  }

  // --------------- section selector ---------------

  renderSectionSelector() {
    const wrap = createElement('fieldset', '', { class: 'port-fieldset' });
    const legend = createElement('legend', 'Portfolio Sections', { class: 'port-legend' });
    wrap.appendChild(legend);

    const list = createElement('ul', '', { class: 'port-section-list', id: 'port-section-list' });

    this.sections.forEach((sec, idx) => {
      const li = createElement('li', '', { class: 'port-section-item', 'data-section-id': sec.id });

      const cb = createElement('input', '', { type: 'checkbox', id: `port-sec-${sec.id}`, 'aria-label': sec.label });
      cb.checked = sec.enabled;
      this.addListener(cb, 'change', () => {
        sec.enabled = cb.checked;
        this.updatePreview();
      });
      li.appendChild(cb);

      const label = createElement('label', sec.label, { for: `port-sec-${sec.id}`, class: 'port-section-label' });
      li.appendChild(label);

      const btnGroup = createElement('span', '', { class: 'port-reorder-btns' });

      const upBtn = createElement('button', '', { class: 'btn btn-sm btn-ghost port-reorder-btn', 'aria-label': `Move ${sec.label} up` });
      upBtn.innerHTML = '&#9650;';
      upBtn.disabled = idx === 0;
      this.addListener(upBtn, 'click', () => this.moveSection(idx, -1));
      btnGroup.appendChild(upBtn);

      const downBtn = createElement('button', '', { class: 'btn btn-sm btn-ghost port-reorder-btn', 'aria-label': `Move ${sec.label} down` });
      downBtn.innerHTML = '&#9660;';
      downBtn.disabled = idx === this.sections.length - 1;
      this.addListener(downBtn, 'click', () => this.moveSection(idx, 1));
      btnGroup.appendChild(downBtn);

      li.appendChild(btnGroup);
      list.appendChild(li);
    });

    wrap.appendChild(list);
    return wrap;
  }

  moveSection(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= this.sections.length) return;
    const tmp = this.sections[idx];
    this.sections[idx] = this.sections[target];
    this.sections[target] = tmp;
    this.renderBody();
  }

  // --------------- contact links editor ---------------

  renderContactLinksEditor() {
    const wrap = createElement('fieldset', '', { class: 'port-fieldset' });
    const legend = createElement('legend', 'Contact / Social Links', { class: 'port-legend' });
    wrap.appendChild(legend);

    const linksList = createElement('div', '', { class: 'port-links-list', id: 'port-links-list' });

    this.contactLinks.forEach((link, idx) => {
      linksList.appendChild(this.renderLinkRow(link, idx));
    });

    wrap.appendChild(linksList);

    const addBtn = createElement('button', '+ Add Link', { class: 'btn btn-sm btn-outline port-add-link-btn' });
    this.addListener(addBtn, 'click', () => {
      this.contactLinks.push({ id: generateUUID(), name: '', url: '' });
      this.renderBody();
    });
    wrap.appendChild(addBtn);

    return wrap;
  }

  renderLinkRow(link, idx) {
    const row = createElement('div', '', { class: 'port-link-row' });

    const nameInput = createElement('input', '', {
      type: 'text',
      class: 'port-input port-link-name',
      placeholder: 'Label (e.g. GitHub)',
      'aria-label': 'Link label',
      value: link.name
    });
    this.addListener(nameInput, 'input', (e) => {
      link.name = e.target.value;
      this.updatePreview();
    });
    row.appendChild(nameInput);

    const urlInput = createElement('input', '', {
      type: 'url',
      class: 'port-input port-link-url',
      placeholder: 'https://...',
      'aria-label': 'Link URL',
      value: link.url
    });
    this.addListener(urlInput, 'input', (e) => {
      link.url = e.target.value;
      this.updatePreview();
    });
    row.appendChild(urlInput);

    const removeBtn = createElement('button', '', { class: 'btn btn-sm btn-ghost port-remove-link-btn', 'aria-label': 'Remove link' });
    removeBtn.innerHTML = '&#10005;';
    this.addListener(removeBtn, 'click', () => {
      this.contactLinks.splice(idx, 1);
      this.renderBody();
    });
    row.appendChild(removeBtn);

    return row;
  }

  // --------------- theme toggle ---------------

  renderThemeToggle() {
    const wrap = createElement('fieldset', '', { class: 'port-fieldset' });
    const legend = createElement('legend', 'Portfolio Theme', { class: 'port-legend' });
    wrap.appendChild(legend);

    const toggleWrap = createElement('div', '', { class: 'port-theme-toggle' });

    const lightLabel = createElement('span', 'Light', {
      class: this.theme === 'light' ? 'port-theme-option port-theme-active' : 'port-theme-option'
    });
    toggleWrap.appendChild(lightLabel);

    const toggle = createElement('button', '', {
      class: 'port-toggle-track',
      role: 'switch',
      'aria-checked': this.theme === 'dark' ? 'true' : 'false',
      'aria-label': 'Toggle portfolio theme'
    });
    const thumb = createElement('span', '', { class: 'port-toggle-thumb' });
    if (this.theme === 'dark') thumb.classList.add('port-toggle-thumb--on');
    toggle.appendChild(thumb);
    this.addListener(toggle, 'click', () => {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      this.renderBody();
    });
    toggleWrap.appendChild(toggle);

    const darkLabel = createElement('span', 'Dark', {
      class: this.theme === 'dark' ? 'port-theme-option port-theme-active' : 'port-theme-option'
    });
    toggleWrap.appendChild(darkLabel);

    wrap.appendChild(toggleWrap);
    return wrap;
  }

  // --------------- action buttons ---------------

  renderActionButtons() {
    const bar = createElement('div', '', { class: 'port-action-bar' });

    const saveBtn = createElement('button', 'Save Config', { class: 'btn btn-sm btn-secondary' });
    this.addListener(saveBtn, 'click', () => this.saveConfig());
    bar.appendChild(saveBtn);

    const exportBtn = createElement('button', 'Export HTML', { class: 'btn btn-sm btn-primary' });
    this.addListener(exportBtn, 'click', () => this.exportHTML());
    bar.appendChild(exportBtn);

    return bar;
  }

  // --------------- preview ---------------

  updatePreview() {
    const frame = this.container ? this.container.querySelector('#port-preview-frame') : null;
    if (!frame) return;
    frame.innerHTML = '';

    const html = this.buildPortfolioHTML();
    const iframe = document.createElement('iframe');
    iframe.className = 'port-preview-iframe';
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.setAttribute('title', 'Portfolio preview');
    iframe.setAttribute('aria-label', 'Portfolio live preview');
    frame.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
      }
    } catch (e) {
      const fallback = createElement('div', 'Preview unavailable — export the HTML to view your portfolio.', { class: 'port-preview-fallback' });
      frame.innerHTML = '';
      frame.appendChild(fallback);
    }
  }

  // --------------- portfolio HTML generation ---------------

  buildPortfolioHTML() {
    const doc = this.selectedDoc;
    const name = doc?.personalInfo?.fullName || doc?.name || 'My Portfolio';
    const headline = doc?.personalInfo?.headline || '';

    const enabledSections = this.sections.filter(s => s.enabled);
    let sectionsHTML = '';

    enabledSections.forEach(sec => {
      const html = this.buildSectionHTML(sec.id, doc);
      if (html) sectionsHTML += html;
    });

    const linksHTML = this.contactLinks
      .filter(l => l.name && l.url)
      .map(l => {
        const safeUrl = sanitizeURL(l.url);
        if (!safeUrl) return '';
        return `<a href="${encodeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer" class="pf-link">${encodeHTML(l.name)}</a>`;
      })
      .filter(Boolean)
      .join('\n        ');

    const isDark = this.theme === 'dark';
    const bg = isDark ? '#0f172a' : '#ffffff';
    const text = isDark ? '#f1f5f9' : '#0f172a';
    const secondary = isDark ? '#cbd5e1' : '#475569';
    const border = isDark ? '#334155' : '#e2e8f0';
    const cardBg = isDark ? '#1e293b' : '#f8fafc';
    const accent = isDark ? '#3b82f6' : '#1a56db';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${encodeHTML(name)} — Portfolio</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  background:${bg};color:${text};line-height:1.6;padding:2rem 1rem}
.pf-wrap{max-width:800px;margin:0 auto}
.pf-header{text-align:center;margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:2px solid ${border}}
.pf-name{font-size:2rem;font-weight:700;margin-bottom:0.25rem}
.pf-headline{font-size:1.1rem;color:${secondary};margin-bottom:1rem}
.pf-links{display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center}
.pf-link{color:${accent};text-decoration:none;font-size:0.9rem;padding:0.25rem 0.75rem;
  border:1px solid ${accent};border-radius:4px;transition:background 0.15s,color 0.15s}
.pf-link:hover{background:${accent};color:#fff}
.pf-section{margin-bottom:2rem}
.pf-section-title{font-size:1.25rem;font-weight:600;margin-bottom:0.75rem;padding-bottom:0.5rem;
  border-bottom:1px solid ${border};color:${text}}
.pf-card{background:${cardBg};border:1px solid ${border};border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.pf-card-title{font-weight:600;margin-bottom:0.25rem}
.pf-card-meta{font-size:0.85rem;color:${secondary};margin-bottom:0.5rem}
.pf-card-body{font-size:0.95rem;color:${secondary}}
.pf-list{list-style:none;display:flex;flex-wrap:wrap;gap:0.5rem}
.pf-chip{font-size:0.85rem;padding:0.2rem 0.6rem;border-radius:9999px;
  background:${isDark ? '#334155' : '#e2e8f0'};color:${text}}
.pf-footer{text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid ${border};
  font-size:0.8rem;color:${secondary}}
@media(max-width:600px){body{padding:1rem 0.5rem}.pf-name{font-size:1.5rem}}
</style>
</head>
<body>
<div class="pf-wrap">
  <header class="pf-header">
    <h1 class="pf-name">${encodeHTML(name)}</h1>
    ${headline ? `<p class="pf-headline">${encodeHTML(headline)}</p>` : ''}
    ${linksHTML ? `<div class="pf-links">${linksHTML}</div>` : ''}
  </header>
  ${sectionsHTML}
  <footer class="pf-footer">Built with CareerCanvas</footer>
</div>
</body>
</html>`;
  }

  buildSectionHTML(sectionId, doc) {
    if (!doc) return this.emptySection(sectionId);

    switch (sectionId) {
      case 'projects':    return this.buildProjectsSection(doc);
      case 'skills':      return this.buildSkillsSection(doc);
      case 'certs':       return this.buildCertsSection(doc);
      case 'experience':  return this.buildExperienceSection(doc);
      case 'education':   return this.buildEducationSection(doc);
      case 'contact':     return this.buildContactSection(doc);
      default:            return '';
    }
  }

  emptySection(sectionId) {
    const labels = { projects: 'Projects', skills: 'Skills', certs: 'Certifications', experience: 'Experience Summary', education: 'Education', contact: 'Contact' };
    return `<section class="pf-section"><h2 class="pf-section-title">${encodeHTML(labels[sectionId] || sectionId)}</h2><p style="color:inherit;opacity:0.6">Select a document to populate this section.</p></section>`;
  }

  findSections(doc, types) {
    if (!doc.sections || !Array.isArray(doc.sections)) return [];
    return doc.sections.filter(s => types.includes(s.sectionType || s.type));
  }

  buildProjectsSection(doc) {
    const sections = this.findSections(doc, ['projects', 'portfolio']);
    if (sections.length === 0) return '';

    let cards = '';
    sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        const title = item.name || item.title || '';
        const desc = item.description || '';
        const meta = [item.role, item.date].filter(Boolean).join(' | ');
        cards += `<div class="pf-card"><div class="pf-card-title">${encodeHTML(title)}</div>${meta ? `<div class="pf-card-meta">${encodeHTML(meta)}</div>` : ''}${desc ? `<div class="pf-card-body">${encodeHTML(desc)}</div>` : ''}</div>`;
      });
    });

    if (!cards) return '';
    return `<section class="pf-section"><h2 class="pf-section-title">Projects</h2>${cards}</section>`;
  }

  buildSkillsSection(doc) {
    const sections = this.findSections(doc, ['skills', 'technicalSkills', 'toolsAndTechnologies', 'coreCompetencies']);
    if (sections.length === 0) return '';

    const skills = [];
    sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        if (item.skills) {
          item.skills.split(/[,;|]/).map(s => s.trim()).filter(Boolean).forEach(s => skills.push(s));
        } else if (item.name) {
          skills.push(item.name);
        }
      });
    });

    if (skills.length === 0) return '';
    const chips = skills.map(s => `<li class="pf-chip">${encodeHTML(s)}</li>`).join('');
    return `<section class="pf-section"><h2 class="pf-section-title">Skills</h2><ul class="pf-list">${chips}</ul></section>`;
  }

  buildCertsSection(doc) {
    const sections = this.findSections(doc, ['certifications', 'licenses', 'licensesAndCertifications']);
    if (sections.length === 0) return '';

    let cards = '';
    sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        const name = item.name || item.title || '';
        const issuer = item.issuer || item.organization || '';
        const date = item.date || item.issueDate || '';
        cards += `<div class="pf-card"><div class="pf-card-title">${encodeHTML(name)}</div>${issuer || date ? `<div class="pf-card-meta">${encodeHTML([issuer, date].filter(Boolean).join(' - '))}</div>` : ''}</div>`;
      });
    });

    if (!cards) return '';
    return `<section class="pf-section"><h2 class="pf-section-title">Certifications</h2>${cards}</section>`;
  }

  buildExperienceSection(doc) {
    const sections = this.findSections(doc, ['experience', 'workExperience', 'professionalExperience']);
    if (sections.length === 0) return '';

    let cards = '';
    sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        const title = item.title || item.position || '';
        const company = item.company || item.organization || '';
        const dateStr = [item.startDate, item.endDate || (item.current ? 'Present' : '')].filter(Boolean).join(' - ');
        const desc = item.description || '';
        cards += `<div class="pf-card"><div class="pf-card-title">${encodeHTML(title)}</div><div class="pf-card-meta">${encodeHTML([company, dateStr].filter(Boolean).join(' | '))}</div>${desc ? `<div class="pf-card-body">${encodeHTML(desc)}</div>` : ''}</div>`;
      });
    });

    if (!cards) return '';
    return `<section class="pf-section"><h2 class="pf-section-title">Experience</h2>${cards}</section>`;
  }

  buildEducationSection(doc) {
    const sections = this.findSections(doc, ['education']);
    if (sections.length === 0) return '';

    let cards = '';
    sections.forEach(sec => {
      (sec.items || []).forEach(item => {
        const degree = item.degree || item.title || '';
        const school = item.institution || item.school || item.organization || '';
        const date = item.graduationDate || item.date || '';
        cards += `<div class="pf-card"><div class="pf-card-title">${encodeHTML(degree)}</div>${school || date ? `<div class="pf-card-meta">${encodeHTML([school, date].filter(Boolean).join(' | '))}</div>` : ''}</div>`;
      });
    });

    if (!cards) return '';
    return `<section class="pf-section"><h2 class="pf-section-title">Education</h2>${cards}</section>`;
  }

  buildContactSection(doc) {
    const info = doc.personalInfo || {};
    const entries = [];
    if (info.email) entries.push(`Email: ${encodeHTML(info.email)}`);
    if (info.phone) entries.push(`Phone: ${encodeHTML(info.phone)}`);
    if (info.location || info.city) entries.push(`Location: ${encodeHTML(info.location || info.city || '')}`);
    if (info.website) {
      const safeUrl = sanitizeURL(info.website);
      if (safeUrl) entries.push(`Website: <a href="${encodeHTML(safeUrl)}" class="pf-link" target="_blank" rel="noopener noreferrer">${encodeHTML(info.website)}</a>`);
    }
    if (info.linkedin) {
      const safeUrl = sanitizeURL(info.linkedin);
      if (safeUrl) entries.push(`LinkedIn: <a href="${encodeHTML(safeUrl)}" class="pf-link" target="_blank" rel="noopener noreferrer">${encodeHTML(info.linkedin)}</a>`);
    }

    if (entries.length === 0) return '';
    const list = entries.map(e => `<div class="pf-card-body" style="margin-bottom:0.4rem">${e}</div>`).join('');
    return `<section class="pf-section"><h2 class="pf-section-title">Contact</h2><div class="pf-card">${list}</div></section>`;
  }

  // --------------- export ---------------

  exportHTML() {
    if (!this.selectedDoc) {
      if (window.CC?.toast) window.CC.toast.show('Select a document first', 'warning');
      return;
    }

    const html = this.buildPortfolioHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (this.selectedDoc.name || 'portfolio').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
    a.download = `${safeName}-portfolio.html`;
    a.click();
    URL.revokeObjectURL(url);

    if (window.CC?.toast) window.CC.toast.show('Portfolio exported', 'success');
  }
}


