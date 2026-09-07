import { generateId } from '../utils/id.js';
import { escapeHtml } from '../utils/sanitize.js';
import { timeAgo, formatDate } from '../utils/format.js';

export class ApplicationTracker {
  constructor(db, events) {
    this.db = db;
    this.events = events;
    this.el = null;
    this.applications = [];
    this.jobDescriptions = [];
    this.filter = 'all';
    this.searchQuery = '';
  }

  async render() {
    this.el = document.createElement('div');
    this.el.className = 'container p-4';
    await this.loadData();
    this.renderContent();
    return this.el;
  }

  async loadData() {
    try {
      this.applications = await this.db.getAll('applications') || [];
      this.jobDescriptions = await this.db.getAll('jobDescriptions') || [];
    } catch (e) {
      this.applications = [];
      this.jobDescriptions = [];
    }
    this.applications.sort((a, b) => new Date(b.lastModified || b.createdAt) - new Date(a.lastModified || a.createdAt));
  }

  renderContent() {
    const statuses = ['applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn', 'saved'];
    const statusCounts = {};
    statuses.forEach(s => statusCounts[s] = 0);
    this.applications.forEach(a => {
      if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
    });

    this.el.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'd-flex justify-between items-center mb-4 flex-wrap gap-2';
    header.innerHTML = `
      <div>
        <h1 class="text-2xl mb-1">Job Applications</h1>
        <p class="text-muted">Track your job applications and saved positions</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline btn-sm" id="btn-add-jd">+ Save Job Description</button>
        <button class="btn btn-primary btn-sm" id="btn-add-app">+ New Application</button>
      </div>
    `;
    this.el.appendChild(header);

    const stats = document.createElement('div');
    stats.className = 'stats-bar mb-4';
    stats.innerHTML = `
      <div class="stat-card stat-card--total"><span class="stat-number">${this.applications.length}</span><span class="stat-label">Total</span></div>
      <div class="stat-card stat-card--applied"><span class="stat-number">${statusCounts.applied}</span><span class="stat-label">Applied</span></div>
      <div class="stat-card stat-card--interview"><span class="stat-number">${statusCounts.interview + statusCounts.screening}</span><span class="stat-label">In Progress</span></div>
      <div class="stat-card stat-card--offer"><span class="stat-number">${statusCounts.offer + statusCounts.accepted}</span><span class="stat-label">Offers</span></div>
      <div class="stat-card stat-card--rejected"><span class="stat-number">${statusCounts.rejected}</span><span class="stat-label">Rejected</span></div>
    `;
    this.el.appendChild(stats);

    const toolbar = document.createElement('div');
    toolbar.className = 'd-flex gap-2 mb-4 flex-wrap';
    toolbar.innerHTML = `
      <input type="search" class="form-input" id="app-search" placeholder="Search applications..." style="max-width:300px">
      <select class="form-select" id="app-filter" style="width:auto">
        <option value="all">All Status</option>
        <option value="saved">Saved</option>
        <option value="applied">Applied</option>
        <option value="screening">Screening</option>
        <option value="interview">Interview</option>
        <option value="offer">Offer</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
        <option value="withdrawn">Withdrawn</option>
      </select>
    `;
    this.el.appendChild(toolbar);

    const list = document.createElement('div');
    list.className = 'application-list';
    list.id = 'application-list';
    this.el.appendChild(list);

    this.renderApplicationList();
    if (!this._eventsBound) {
      this.bindEvents();
      this._eventsBound = true;
    } else {
      this.bindHeaderEvents();
    }
  }

  bindHeaderEvents() {
    const btnAddApp = this.el.querySelector('#btn-add-app');
    if (btnAddApp) {
      btnAddApp.addEventListener('click', () => this.showApplicationForm());
    }

    const btnAddJD = this.el.querySelector('#btn-add-jd');
    if (btnAddJD) {
      btnAddJD.addEventListener('click', () => this.showJobDescriptionForm());
    }
  }

  renderApplicationList() {
    const list = this.el.querySelector('#application-list');
    if (!list) return;
    let filtered = this.applications;
    if (this.filter !== 'all') {
      filtered = filtered.filter(a => a.status === this.filter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        (a.company || '').toLowerCase().includes(q) ||
        (a.position || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No applications found</h3>
          <p class="text-muted">${this.filter !== 'all' || this.searchQuery ? 'Try adjusting your filters.' : 'Start tracking your job applications by clicking "+ New Application".'}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    filtered.forEach(app => {
      const card = document.createElement('div');
      card.className = 'application-card card mb-2';
      card.dataset.id = app.id;

      const statusClass = this.getStatusClass(app.status);
      const statusLabel = this.getStatusLabel(app.status);

      card.innerHTML = `
        <div class="card-body d-flex justify-between items-center flex-wrap gap-2">
          <div class="app-card-main">
            <div class="d-flex items-center gap-2 mb-1">
              <strong>${escapeHtml(app.position || 'Untitled Position')}</strong>
              <span class="badge badge--${statusClass}">${statusLabel}</span>
              ${this.followUpBadge(app)}
            </div>
            <div class="text-muted text-sm">
              ${escapeHtml(app.company || '')}${app.location ? ' · ' + escapeHtml(app.location) : ''}
            </div>
            ${app.appliedDate ? `<div class="text-muted text-sm mt-1">Applied: ${escapeHtml(app.appliedDate)}</div>` : ''}
            ${app.notes ? `<div class="text-sm mt-1">${escapeHtml(app.notes).substring(0, 100)}${app.notes.length > 100 ? '...' : ''}</div>` : ''}
          </div>
          <div class="app-card-actions d-flex gap-1">
            <select class="form-select form-select--sm status-select" data-id="${app.id}" style="width:auto;font-size:0.75rem">
              <option value="saved" ${app.status === 'saved' ? 'selected' : ''}>Saved</option>
              <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
              <option value="screening" ${app.status === 'screening' ? 'selected' : ''}>Screening</option>
              <option value="interview" ${app.status === 'interview' ? 'selected' : ''}>Interview</option>
              <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>Offer</option>
              <option value="accepted" ${app.status === 'accepted' ? 'selected' : ''}>Accepted</option>
              <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              <option value="withdrawn" ${app.status === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
            </select>
            <button class="btn btn-sm btn-ghost btn-interview-prep" data-id="${app.id}" title="AI Interview Prep">\u{1F3AF}</button>
            <button class="btn btn-sm btn-ghost btn-draft-email" data-id="${app.id}" title="Draft Follow-Up Email">\u{2709}\u{FE0F}</button>
            <button class="btn btn-sm btn-ghost btn-edit-app" data-id="${app.id}" title="Edit">&#9998;</button>
            <button class="btn btn-sm btn-ghost btn-delete-app" data-id="${app.id}" title="Delete">&#128465;</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  /** Days since application with no status change (0 when not applicable). */
  followUpDays(app) {
    if (!app || app.status !== 'applied' || !app.appliedDate) return 0;
    const t = new Date(app.appliedDate).getTime();
    if (Number.isNaN(t)) return 0;
    return Math.floor((Date.now() - t) / 86400000);
  }

  /** Nudge badge for stale applications (pure HTML string, unit-tested). */
  followUpBadge(app) {
    const days = this.followUpDays(app);
    if (days < 7) return '';
    return `<span class="badge badge--warning" title="Applied ${days} days ago with no update — consider following up">⏰ Follow up (${days}d)</span>`;
  }

  getStatusClass(status) {    const map = {
      saved: 'info', applied: 'primary', screening: 'warning',
      interview: 'warning', offer: 'success', accepted: 'success',
      rejected: 'danger', withdrawn: 'muted'
    };
    return map[status] || 'muted';
  }

  getStatusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  bindEvents() {
    this.bindHeaderEvents();

    const search = this.el.querySelector('#app-search');
    if (search) {
      search.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderApplicationList();
      });
    }

    const filter = this.el.querySelector('#app-filter');
    if (filter) {
      filter.addEventListener('change', (e) => {
        this.filter = e.target.value;
        this.renderApplicationList();
      });
    }

    this.el.addEventListener('change', async (e) => {
      if (e.target.classList.contains('status-select')) {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        const app = this.applications.find(a => a.id === id);
        if (app) {
          app.status = newStatus;
          app.lastModified = new Date().toISOString();
          await this.db.put('applications', app);
          await this.loadData();
          this.renderApplicationList();
        }
      }
    });

    this.el.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.btn-edit-app');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const app = this.applications.find(a => a.id === id);
        if (app) this.showApplicationForm(app);
      }

      const deleteBtn = e.target.closest('.btn-delete-app');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (window.CC && window.CC.modal) {
          window.CC.modal.confirm('Delete this application?', async () => {
            await this.db.delete('applications', id);
            await this.loadData();
            this.renderApplicationList();
            if (window.CC.toast) window.CC.toast.show('Application deleted', 'info');
          });
        }
      }

      // AI Interview Prep
      const prepBtn = e.target.closest('.btn-interview-prep');
      if (prepBtn) {
        const id = prepBtn.dataset.id;
        const app = this.applications.find(a => a.id === id);
        if (app) this._showInterviewPrep(app);
      }

      // AI Follow-Up Email
      const emailBtn = e.target.closest('.btn-draft-email');
      if (emailBtn) {
        const id = emailBtn.dataset.id;
        const app = this.applications.find(a => a.id === id);
        if (app) this._showFollowUpEmail(app);
      }
    });
  }

  showApplicationForm(existing = null) {
    const isEdit = !!existing;
    const app = existing || {
      id: generateId(),
      position: '',
      company: '',
      location: '',
      url: '',
      status: 'saved',
      appliedDate: '',
      salary: '',
      resumeId: '',
      coverLetterId: '',
      contactName: '',
      contactEmail: '',
      notes: '',
      tags: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const form = document.createElement('div');
    form.className = 'application-form';
    form.innerHTML = `
      <div class="form-group mb-3">
        <label class="form-label" for="app-position">Position *</label>
        <input type="text" id="app-position" class="form-input" value="${escapeHtml(app.position)}" maxlength="200" required>
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="app-company">Company *</label>
        <input type="text" id="app-company" class="form-input" value="${escapeHtml(app.company)}" maxlength="200" required>
      </div>
      <div class="d-flex gap-3 mb-3">
        <div class="form-group" style="flex:1">
          <label class="form-label" for="app-location">Location</label>
          <input type="text" id="app-location" class="form-input" value="${escapeHtml(app.location || '')}" maxlength="200">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" for="app-salary">Salary Range</label>
          <input type="text" id="app-salary" class="form-input" value="${escapeHtml(app.salary || '')}" maxlength="100">
        </div>
      </div>
      <div class="d-flex gap-3 mb-3">
        <div class="form-group" style="flex:1">
          <label class="form-label" for="app-status">Status</label>
          <select id="app-status" class="form-select">
            <option value="saved" ${app.status === 'saved' ? 'selected' : ''}>Saved</option>
            <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
            <option value="screening" ${app.status === 'screening' ? 'selected' : ''}>Screening</option>
            <option value="interview" ${app.status === 'interview' ? 'selected' : ''}>Interview</option>
            <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>Offer</option>
            <option value="accepted" ${app.status === 'accepted' ? 'selected' : ''}>Accepted</option>
            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            <option value="withdrawn" ${app.status === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" for="app-date">Applied Date</label>
          <input type="date" id="app-date" class="form-input" value="${app.appliedDate || ''}">
        </div>
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="app-url">Job Posting URL</label>
        <input type="url" id="app-url" class="form-input" value="${escapeHtml(app.url || '')}" maxlength="500" placeholder="https://...">
      </div>
      <div class="d-flex gap-3 mb-3">
        <div class="form-group" style="flex:1">
          <label class="form-label" for="app-contact">Contact Name</label>
          <input type="text" id="app-contact" class="form-input" value="${escapeHtml(app.contactName || '')}" maxlength="200">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" for="app-contact-email">Contact Email</label>
          <input type="email" id="app-contact-email" class="form-input" value="${escapeHtml(app.contactEmail || '')}" maxlength="200">
        </div>
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="app-notes">Notes</label>
        <textarea id="app-notes" class="form-input" rows="4" maxlength="2000">${escapeHtml(app.notes || '')}</textarea>
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="app-tags">Tags (comma separated)</label>
        <input type="text" id="app-tags" class="form-input" value="${escapeHtml((app.tags || []).join(', '))}" maxlength="500" placeholder="e.g., remote, startup, frontend">
      </div>
    `;

    // Attach autocomplete to fields
    import('./autocomplete.js').then(({ Autocomplete }) => {
      const posInput = form.querySelector('#app-position');
      const compInput = form.querySelector('#app-company');
      const locInput = form.querySelector('#app-location');
      if (posInput) Autocomplete.attach(posInput, 'jobTitle');
      if (compInput) Autocomplete.attach(compInput, 'company');
      if (locInput) Autocomplete.attach(locInput, 'location');
    }).catch(() => {});

    if (window.CC && window.CC.modal) {
      window.CC.modal.show({
        title: isEdit ? 'Edit Application' : 'New Application',
        body: form,
        size: 'medium',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => window.CC.modal.close() },
          {
            label: isEdit ? 'Save Changes' : 'Add Application',
            type: 'primary',
            handler: async () => {
              const position = form.querySelector('#app-position').value.trim();
              const company = form.querySelector('#app-company').value.trim();
              if (!position || !company) {
                window.CC.toast.show('Position and Company are required', 'error');
                return false;
              }
              const updated = {
                ...app,
                position,
                company,
                location: form.querySelector('#app-location').value.trim(),
                salary: form.querySelector('#app-salary').value.trim(),
                status: form.querySelector('#app-status').value,
                appliedDate: form.querySelector('#app-date').value,
                url: form.querySelector('#app-url').value.trim(),
                contactName: form.querySelector('#app-contact').value.trim(),
                contactEmail: form.querySelector('#app-contact-email').value.trim(),
                notes: form.querySelector('#app-notes').value.trim(),
                tags: form.querySelector('#app-tags').value.split(',').map(t => t.trim()).filter(Boolean),
                lastModified: new Date().toISOString()
              };
              await this.db.put('applications', updated);
              window.CC.modal.close();
              await this.loadData();
              this.renderContent();
              window.CC.toast.show(isEdit ? 'Application updated' : 'Application added', 'success');
            }
          }
        ]
      });
    }
  }

  showJobDescriptionForm(existing = null) {
    const isEdit = !!existing;
    const jd = existing || {
      id: generateId(),
      title: '',
      company: '',
      description: '',
      requirements: '',
      url: '',
      tags: [],
      createdAt: new Date().toISOString()
    };

    const form = document.createElement('div');
    form.innerHTML = `
      <div class="form-group mb-3">
        <label class="form-label" for="jd-title">Job Title</label>
        <input type="text" id="jd-title" class="form-input" value="${escapeHtml(jd.title)}" maxlength="200">
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="jd-company">Company</label>
        <input type="text" id="jd-company" class="form-input" value="${escapeHtml(jd.company)}" maxlength="200">
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="jd-url">Job Posting URL</label>
        <input type="url" id="jd-url" class="form-input" value="${escapeHtml(jd.url || '')}" maxlength="500">
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="jd-description">Job Description</label>
        <textarea id="jd-description" class="form-input" rows="8" maxlength="10000" placeholder="Paste the full job description here...">${escapeHtml(jd.description)}</textarea>
      </div>
      <div class="form-group mb-3">
        <label class="form-label" for="jd-requirements">Key Requirements</label>
        <textarea id="jd-requirements" class="form-input" rows="4" maxlength="5000" placeholder="List key requirements...">${escapeHtml(jd.requirements || '')}</textarea>
      </div>
    `;

    // Attach autocomplete
    import('./autocomplete.js').then(({ Autocomplete }) => {
      const titleInput = form.querySelector('#jd-title');
      const compInput = form.querySelector('#jd-company');
      if (titleInput) Autocomplete.attach(titleInput, 'jobTitle');
      if (compInput) Autocomplete.attach(compInput, 'company');
    }).catch(() => {});

    if (window.CC && window.CC.modal) {
      window.CC.modal.show({
        title: isEdit ? 'Edit Job Description' : 'Save Job Description',
        body: form,
        size: 'medium',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => window.CC.modal.close() },
          {
            label: 'Save',
            type: 'primary',
            handler: async () => {
              const updated = {
                ...jd,
                title: form.querySelector('#jd-title').value.trim(),
                company: form.querySelector('#jd-company').value.trim(),
                url: form.querySelector('#jd-url').value.trim(),
                description: form.querySelector('#jd-description').value.trim(),
                requirements: form.querySelector('#jd-requirements').value.trim(),
              };
              await this.db.put('jobDescriptions', updated);
              window.CC.modal.close();
              await this.loadData();
              window.CC.toast.show('Job description saved', 'success');
            }
          }
        ]
      });
    }
  }

  async _showInterviewPrep(app) {
    if (!window.CC || !window.CC.modal) return;

    // Show loading state
    const loadingEl = document.createElement('div');
    loadingEl.style.textAlign = 'center';
    loadingEl.style.padding = '2rem';
    loadingEl.innerHTML = '<p>Generating interview prep questions...</p><p class="text-muted text-sm">This may take a moment.</p>';
    window.CC.modal.show({
      title: '\u{1F3AF} Interview Prep: ' + escapeHtml(app.position),
      body: loadingEl,
      size: 'large'
    });

    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());

      // Load linked resume if available
      let resumeDoc = { personalInfo: {}, sections: [] };
      if (app.resumeId) {
        try {
          const doc = await this.db.get('documents', app.resumeId);
          if (doc) resumeDoc = doc;
        } catch { /* use empty doc */ }
      }

      const result = await ai.generateInterviewPrep(resumeDoc, app.position + ' at ' + app.company);

      const contentEl = document.createElement('div');
      contentEl.className = 'interview-prep-content';
      contentEl.style.whiteSpace = 'pre-wrap';
      contentEl.style.lineHeight = '1.6';
      contentEl.style.maxHeight = '60vh';
      contentEl.style.overflowY = 'auto';
      contentEl.textContent = result;

      window.CC.modal.show({
        title: '\u{1F3AF} Interview Prep: ' + escapeHtml(app.position),
        body: contentEl,
        size: 'large',
        actions: [
          {
            label: 'Copy All',
            type: 'primary',
            handler: () => {
              navigator.clipboard.writeText(result).then(() => {
                if (window.CC.toast) window.CC.toast.show('Copied to clipboard', 'success');
              }).catch(() => {
                if (window.CC.toast) window.CC.toast.show('Failed to copy', 'error');
              });
              return false; // keep modal open
            }
          },
          {
            label: '🔊 Read Aloud',
            type: 'secondary',
            handler: () => {
              try {
                if (!('speechSynthesis' in window)) {
                  if (window.CC.toast) window.CC.toast.show('Read-aloud is not supported in this browser.', 'warning');
                  return false;
                }
                if (window.speechSynthesis.speaking) {
                  window.speechSynthesis.cancel();
                  if (window.CC.toast) window.CC.toast.show('Stopped reading.', 'info');
                } else {
                  const utterance = new SpeechSynthesisUtterance(result.slice(0, 4000));
                  utterance.lang = 'en-US';
                  utterance.rate = 1;
                  window.speechSynthesis.speak(utterance);
                  if (window.CC.toast) window.CC.toast.show('Reading aloud — press again to stop.', 'info');
                }
              } catch {
                if (window.CC.toast) window.CC.toast.show('Could not start read-aloud.', 'error');
              }
              return false; // keep modal open
            }
          },
          { label: 'Close', type: 'secondary', handler: () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } window.CC.modal.close(); } }
        ]
      });
    } catch (err) {
      const errorEl = document.createElement('div');
      errorEl.innerHTML = '<p class="text-danger">' + escapeHtml(err.message || 'Failed to generate interview prep.') + '</p>';
      window.CC.modal.show({
        title: '\u{1F3AF} Interview Prep',
        body: errorEl,
        size: 'small',
        actions: [
          { label: 'Close', type: 'secondary', handler: () => window.CC.modal.close() }
        ]
      });
    }
  }

  async _showFollowUpEmail(app) {
    if (!window.CC || !window.CC.modal) return;

    // Show loading state
    const loadingEl = document.createElement('div');
    loadingEl.style.textAlign = 'center';
    loadingEl.style.padding = '2rem';
    loadingEl.innerHTML = '<p>Drafting follow-up email...</p><p class="text-muted text-sm">This may take a moment.</p>';
    window.CC.modal.show({
      title: '\u{2709}\u{FE0F} Follow-Up Email: ' + escapeHtml(app.company),
      body: loadingEl,
      size: 'large'
    });

    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());

      const result = await ai.generateFollowUpEmail({
        position: app.position,
        company: app.company,
        status: app.status,
        appliedDate: app.appliedDate
      });

      const contentEl = document.createElement('div');
      contentEl.className = 'follow-up-email-content';
      contentEl.style.whiteSpace = 'pre-wrap';
      contentEl.style.lineHeight = '1.6';
      contentEl.style.maxHeight = '60vh';
      contentEl.style.overflowY = 'auto';
      contentEl.textContent = result;

      window.CC.modal.show({
        title: '\u{2709}\u{FE0F} Follow-Up Email: ' + escapeHtml(app.company),
        body: contentEl,
        size: 'large',
        actions: [
          {
            label: 'Copy',
            type: 'primary',
            handler: () => {
              navigator.clipboard.writeText(result).then(() => {
                if (window.CC.toast) window.CC.toast.show('Copied to clipboard', 'success');
              }).catch(() => {
                if (window.CC.toast) window.CC.toast.show('Failed to copy', 'error');
              });
              return false; // keep modal open
            }
          },
          { label: 'Close', type: 'secondary', handler: () => window.CC.modal.close() }
        ]
      });
    } catch (err) {
      const errorEl = document.createElement('div');
      errorEl.innerHTML = '<p class="text-danger">' + escapeHtml(err.message || 'Failed to generate email.') + '</p>';
      window.CC.modal.show({
        title: '\u{2709}\u{FE0F} Follow-Up Email',
        body: errorEl,
        size: 'small',
        actions: [
          { label: 'Close', type: 'secondary', handler: () => window.CC.modal.close() }
        ]
      });
    }
  }

  destroy() {
    this.el = null;
  }
}
