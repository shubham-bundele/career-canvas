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
    this.viewMode = 'list'; // 'list' | 'kanban'
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
        <button class="btn btn-outline btn-sm" id="btn-job-link">+ From Job Link</button>
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
      <button class="btn btn-sm btn-outline" id="btn-view-list" aria-pressed="true">☰ List</button>
      <button class="btn btn-sm btn-ghost" id="btn-view-kanban" aria-pressed="false">▦ Board</button>
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

    const btnJobLink = this.el.querySelector('#btn-job-link');
    if (btnJobLink) {
      btnJobLink.addEventListener('click', () => this.showJobLinkImport());
    }

    const btnList = this.el.querySelector('#btn-view-list');
    const btnKanban = this.el.querySelector('#btn-view-kanban');
    const syncViewBtns = () => {
      if (btnList) {
        btnList.className = `btn btn-sm ${this.viewMode === 'list' ? 'btn-outline' : 'btn-ghost'}`;
        btnList.setAttribute('aria-pressed', String(this.viewMode === 'list'));
      }
      if (btnKanban) {
        btnKanban.className = `btn btn-sm ${this.viewMode === 'kanban' ? 'btn-outline' : 'btn-ghost'}`;
        btnKanban.setAttribute('aria-pressed', String(this.viewMode === 'kanban'));
      }
    };
    if (btnList) btnList.addEventListener('click', () => { this.viewMode = 'list'; syncViewBtns(); this.renderApplicationList(); });
    if (btnKanban) btnKanban.addEventListener('click', () => { this.viewMode = 'kanban'; syncViewBtns(); this.renderApplicationList(); });
    syncViewBtns();
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
    if (this.viewMode === 'kanban') {
      this.renderKanbanBoard(list, filtered);
      return;
    }
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
            <button class="btn btn-sm btn-ghost btn-draft-cover" data-id="${app.id}" title="Draft Cover Letter">📝</button>
            <button class="btn btn-sm btn-ghost btn-edit-app" data-id="${app.id}" title="Edit">&#9998;</button>
            <button class="btn btn-sm btn-ghost btn-delete-app" data-id="${app.id}" title="Delete">&#128465;</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  /** Kanban board grouped by status (same action buttons/delegation as list). */
  renderKanbanBoard(list, apps) {
    const columns = ['saved', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'];
    const board = document.createElement('div');
    board.className = 'kanban-board';
    for (const status of columns) {
      const colApps = apps.filter((a) => (a.status || 'saved') === status);
      const col = document.createElement('div');
      col.className = 'kanban-column';
      col.dataset.status = status;
      const head = document.createElement('div');
      head.className = 'kanban-column-header';
      const label = document.createElement('span');
      label.textContent = this.getStatusLabel(status);
      head.appendChild(label);
      const count = document.createElement('span');
      count.className = 'kanban-count';
      count.textContent = String(colApps.length);
      head.appendChild(count);
      col.appendChild(head);
      if (!colApps.length) {
        const empty = document.createElement('div');
        empty.className = 'kanban-empty';
        empty.textContent = '—';
        col.appendChild(empty);
      }
      for (const app of colApps) {
        const card = document.createElement('div');
        card.className = 'application-card card kanban-card';
        card.dataset.id = app.id;
        card.innerHTML = `
          <div class="card-body">
            <div class="mb-1"><strong>${escapeHtml(app.position || 'Untitled Position')}</strong></div>
            <div class="text-muted text-sm mb-1">${escapeHtml(app.company || '')}${app.location ? ' · ' + escapeHtml(app.location) : ''}</div>
            <div class="app-card-actions d-flex gap-1 flex-wrap">
              <select class="form-select form-select--sm status-select" data-id="${app.id}" style="width:auto;font-size:0.75rem">
                ${columns.map((s) => `<option value="${s}" ${app.status === s ? 'selected' : ''}>${this.getStatusLabel(s)}</option>`).join('')}
              </select>
              <button class="btn btn-sm btn-ghost btn-interview-prep" data-id="${app.id}" title="AI Interview Prep">🎯</button>
              <button class="btn btn-sm btn-ghost btn-draft-email" data-id="${app.id}" title="Draft Follow-Up Email">✉️</button>
              <button class="btn btn-sm btn-ghost btn-draft-cover" data-id="${app.id}" title="Draft Cover Letter">📝</button>
              <button class="btn btn-sm btn-ghost btn-edit-app" data-id="${app.id}" title="Edit">✎</button>
            </div>
          </div>
        `;
        col.appendChild(card);
      }
      board.appendChild(col);
    }
    list.appendChild(board);
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
          const wasStatus = app.status;
          app.status = newStatus;
          app.lastModified = new Date().toISOString();
          await this.db.put('applications', app);
          // Snapshot the resume the moment a user applies — the exact
          // version sent stays recoverable even after later edits.
          if (newStatus === 'applied' && wasStatus !== 'applied' && app.resumeId) {
            this._snapshotOnApply(app).catch(() => {});
          }
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

      // Draft Cover Letter (AI first, offline draft fallback)
      const coverBtn = e.target.closest('.btn-draft-cover');
      if (coverBtn) {
        const id = coverBtn.dataset.id;
        const app = this.applications.find(a => a.id === id);
        if (app) this._draftCoverLetterFor(app);
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

    // Load linked resume up-front so the offline fallback can use it too.
    let resumeDoc = { personalInfo: {}, sections: [] };
    if (app.resumeId) {
      try {
        const doc = await this.db.get('documents', app.resumeId);
        if (doc) resumeDoc = doc;
      } catch { /* use empty doc */ }
    }

    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());

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
      // Offline fallback: local question bank + pitch (never a dead end).
      try {
        const { buildInterviewPack } = await import('../utils/interview-pack.js');
        const pack = buildInterviewPack(resumeDoc, { position: app.position, company: app.company });
        const offlineText = [
          'INTERVIEW QUESTIONS (offline pack)',
          ...pack.questions.map((q, i) => `${i + 1}. ${q}`),
          '',
          'YOUR ELEVATOR PITCH',
          pack.pitch,
          '',
          'QUESTIONS TO ASK THEM',
          ...pack.questionsToAsk.map((q) => `- ${q}`),
        ].join('\n');
        const contentEl = document.createElement('div');
        contentEl.className = 'interview-prep-content';
        contentEl.style.whiteSpace = 'pre-wrap';
        contentEl.style.lineHeight = '1.6';
        contentEl.style.maxHeight = '60vh';
        contentEl.style.overflowY = 'auto';
        contentEl.textContent = offlineText;
        window.CC.modal.show({
          title: '🎯 Interview Prep (offline): ' + escapeHtml(app.position),
          body: contentEl,
          size: 'large',
          actions: [
            {
              label: 'Copy All', type: 'primary',
              handler: () => {
                navigator.clipboard.writeText(offlineText).then(() => {
                  if (window.CC.toast) window.CC.toast.show('Copied to clipboard', 'success');
                }).catch(() => {
                  if (window.CC.toast) window.CC.toast.show('Failed to copy', 'error');
                });
                return false;
              },
            },
            { label: 'Close', type: 'secondary', handler: () => window.CC.modal.close() },
          ],
        });
        if (window.CC.toast) window.CC.toast.show('AI unavailable — showing offline prep pack', 'info');
        return;
      } catch { /* fall through to the error card */ }
      const errorEl = document.createElement('div');
      errorEl.innerHTML = '<p class="text-danger">' + escapeHtml(err.message || 'Failed to generate interview prep.') + '</p>';
      window.CC.modal.show({
        title: '🎯 Interview Prep',
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
      // Offline fallback: local email template with the application details.
      try {
        const { buildInterviewPack } = await import('../utils/interview-pack.js');
        let resumeDoc = { personalInfo: {}, sections: [] };
        if (app.resumeId) {
          try {
            const doc = await this.db.get('documents', app.resumeId);
            if (doc) resumeDoc = doc;
          } catch { /* use empty doc */ }
        }
        const { followUpEmail } = buildInterviewPack(resumeDoc, {
          position: app.position, company: app.company,
        });
        const contentEl = document.createElement('div');
        contentEl.className = 'follow-up-email-content';
        contentEl.style.whiteSpace = 'pre-wrap';
        contentEl.style.lineHeight = '1.6';
        contentEl.style.maxHeight = '60vh';
        contentEl.style.overflowY = 'auto';
        contentEl.textContent = followUpEmail;
        window.CC.modal.show({
          title: '✉️ Follow-Up Email (offline): ' + escapeHtml(app.company),
          body: contentEl,
          size: 'large',
          actions: [
            {
              label: 'Copy', type: 'primary',
              handler: () => {
                navigator.clipboard.writeText(followUpEmail).then(() => {
                  if (window.CC.toast) window.CC.toast.show('Copied to clipboard', 'success');
                }).catch(() => {
                  if (window.CC.toast) window.CC.toast.show('Failed to copy', 'error');
                });
                return false;
              },
            },
            { label: 'Close', type: 'secondary', handler: () => window.CC.modal.close() },
          ],
        });
        if (window.CC.toast) window.CC.toast.show('AI unavailable — showing offline template', 'info');
        return;
      } catch { /* fall through to the error card */ }
      const errorEl = document.createElement('div');
      errorEl.innerHTML = '<p class="text-danger">' + escapeHtml(err.message || 'Failed to generate email.') + '</p>';
      window.CC.modal.show({
        title: '✉️ Follow-Up Email',
        body: errorEl,
        size: 'small',
        actions: [
          { label: 'Close', type: 'secondary', handler: () => window.CC.modal.close() }
        ]
      });
    }
  }

  /** Snapshot the resume version at apply-time (same shape as Version Studio). */
  async _snapshotOnApply(app) {
    try {
      const doc = await this.db.get('documents', app.resumeId);
      if (!doc) return;
      const snapshot = {
        id: generateId(),
        documentId: doc.id,
        name: `Sent: ${app.company || ''} — ${app.position || ''}`.slice(0, 120),
        data: JSON.parse(JSON.stringify(doc)),
        createdAt: new Date().toISOString(),
      };
      await this.db.create('snapshots', snapshot);
      // Retention: same 20-per-document cap as Version Studio.
      try {
        const all = await this.db.getByIndex('snapshots', 'documentId', doc.id);
        if (Array.isArray(all) && all.length > 20) {
          const ordered = [...all].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          for (const old of ordered.slice(0, all.length - 20).filter((s) => s.id !== snapshot.id)) {
            try { await this.db.delete('snapshots', old.id); } catch { /* keep going */ }
          }
        }
      } catch { /* prune is advisory */ }
      if (window.CC?.toast) window.CC.toast.show('Resume version snapshotted (exact copy sent)', 'success');
    } catch { /* never block the status change */ }
  }

  /** Import a job posting from a URL (fetch + graceful paste fallback). */
  showJobLinkImport() {
    if (!window.CC?.modal) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="form-group mb-3">
        <label class="form-label" for="job-link-url">Job posting URL</label>
        <input type="url" id="job-link-url" class="form-input" placeholder="https://…">
      </div>
      <p class="text-muted text-sm mb-3">Many job boards block direct fetching — if that happens you can paste the description instead.</p>
      <div class="form-group mb-3" id="job-link-paste-group" style="display:none">
        <label class="form-label" for="job-link-paste">Job description (paste)</label>
        <textarea id="job-link-paste" class="form-input" rows="8"></textarea>
      </div>
    `;
    const urlInput = wrap.querySelector('#job-link-url');
    window.CC.modal.show({
      title: 'Import from Job Link',
      body: wrap,
      size: 'medium',
      actions: [
        { label: 'Cancel', type: 'secondary', handler: () => window.CC.modal.close() },
        {
          label: 'Fetch & Save',
          type: 'primary',
          handler: async () => {
            const url = (urlInput.value || '').trim();
            const pasteGroup = wrap.querySelector('#job-link-paste-group');
            const pasteText = (wrap.querySelector('#job-link-paste').value || '').trim();
            if (pasteText) {
              await this.db.put('jobDescriptions', {
                id: generateId(), title: '', company: '', description: pasteText.slice(0, 10000),
                requirements: '', url, tags: [], createdAt: new Date().toISOString(),
              });
              window.CC.modal.close();
              await this.loadData();
              window.CC.toast.show('Job description saved', 'success');
              return;
            }
            if (!url) { window.CC.toast.show('Enter a URL or paste the description', 'warning'); return false; }
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const html = await res.text();
              const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
                || html.match(/<title[^>]*>([^<]{1,200})</i);
              const text = html
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ').trim()
                .slice(0, 10000);
              if (text.length < 50) throw new Error('Page had no readable text');
              window.CC.modal.close();
              this.showJobDescriptionForm({
                id: generateId(),
                title: (titleMatch?.[1] || '').trim().slice(0, 200),
                company: '', description: text, requirements: '', url,
                tags: [], createdAt: new Date().toISOString(),
              });
            } catch (err) {
              console.warn('Job link fetch failed:', err);
              pasteGroup.style.display = 'block';
              window.CC.toast.show('Could not fetch that page (site blocks it) — paste the description instead', 'warning');
              return false; // keep open for pasting
            }
          },
        },
      ],
    });
  }

  /** Draft a cover letter for an application (AI first, offline fallback). */
  async _draftCoverLetterFor(app) {
    if (!window.CC?.modal) return;
    let resumeDoc = null;
    try {
      if (app.resumeId) resumeDoc = await this.db.get('documents', app.resumeId);
      if (!resumeDoc) {
        const docs = await this.db.getAll('documents');
        resumeDoc = (docs || []).find((d) => d && !d.archived) || null;
      }
    } catch { /* proceed without */ }
    if (!resumeDoc) {
      window.CC.toast.show('Save a resume first to draft from', 'warning');
      return;
    }
    window.CC.toast.show('Drafting cover letter…', 'info');
    let salutation = 'Dear Hiring Manager,';
    let bodyText = '';
    let closing = 'Sincerely,';
    let offline = false;
    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());
      const jdHint = `${app.position || ''} at ${app.company || ''}${app.url ? ` (${app.url})` : ''}`;
      bodyText = await ai.generateCoverLetter(resumeDoc, jdHint);
      closing = `Sincerely,\n${resumeDoc.personalInfo?.fullName || ''}`;
    } catch (err) {
      console.warn('AI cover letter failed, using offline draft:', err);
      try {
        const { draftCoverLetter } = await import('../utils/cover-draft.js');
        const d = draftCoverLetter(resumeDoc, { company: app.company, position: app.position });
        salutation = d.salutation; bodyText = d.body; closing = d.closing;
        offline = true;
      } catch {
        window.CC.toast.show('Could not draft a cover letter', 'error');
        return;
      }
    }
    try {
      const { createEmptyDocument } = await import('../core/schema.js');
      const doc = createEmptyDocument('coverLetter');
      doc.name = `Cover Letter — ${app.company || 'Company'} (${app.position || 'Role'})`;
      doc.personalInfo = { ...(doc.personalInfo || {}), ...(resumeDoc.personalInfo || {}) };
      doc.coverLetter = {
        ...(doc.coverLetter || {}),
        date: new Date().toLocaleDateString(),
        company: app.company || '',
        salutation, body: bodyText, closing,
      };
      await this.db.put('documents', doc);
      app.coverLetterId = doc.id;
      app.lastModified = new Date().toISOString();
      await this.db.put('applications', app);
      await this.loadData();
      window.CC.toast.show(offline ? 'Offline draft created — review and polish' : 'Cover letter drafted', 'success');
      if (window.CC?.router) window.CC.router.navigate(`/editor/${doc.id}`);
    } catch (err) {
      console.error('Cover letter save failed:', err);
      window.CC.toast.show('Could not save the cover letter', 'error');
    }
  }

  destroy() {
    this.el = null;
  }
}
