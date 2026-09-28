import { StateManager } from './core/state.js';
import { Database } from './core/db.js';
import { Router } from './core/router.js';
import eventBusSingleton, { EventBus } from './core/events.js';
import { createEmptyDocument } from './core/schema.js';
import { TemplateEngine } from './core/template-engine.js';
import { Toast } from './modules/toast.js';
import { Modal } from './modules/modal.js';
import { Dashboard } from './modules/dashboard.js';
import { ResumeEditor } from './modules/editor.js';
import { OnboardingWizard } from './modules/onboarding.js';
import { TemplateGallery } from './modules/template-gallery.js';
import { DesignPanel } from './modules/design-panel.js';
import { ATSChecker } from './modules/ats-checker.js';
import { ExportManager } from './modules/export-manager.js';
import { ImportManager } from './modules/import-manager.js';
import { MasterProfile } from './modules/master-profile.js';
import { SettingsPanel } from './modules/settings.js';
import { ApplicationTracker } from './modules/application-tracker.js';
import { registerAllTemplates } from './templates/index.js';
import { ExperienceCalculator } from './modules/experience-calculator.js';
import { ThemeEngine } from './core/theme-engine.js';
import { initializeAuth, continueAsGuest, signOut } from './auth/auth-service.js';
import authState, { AUTH_STATUS } from './auth/auth-state.js';
import { countGuestDocuments, filterDocumentsByOwner, GUEST_OWNER_ID } from './auth/user-store.js';

class CareerCanvasApp {
  constructor() {
    this.state = new StateManager();
    this.db = null;
    this.router = new Router();
    this.events = eventBusSingleton;
    this.toast = new Toast();
    this.modal = new Modal();
    this.templateEngine = new TemplateEngine();
    this.exportManager = new ExportManager();
    this.importManager = new ImportManager();
    this.atsChecker = new ATSChecker();
    this.themeEngine = new ThemeEngine();
    this.currentView = null;
    this.appEl = document.getElementById('app');
  }

  async init() {
    try {
      this.db = new Database();
      await this.db.open();

      registerAllTemplates(this.templateEngine);

      this.setupGlobalContext();
      this.setupRoutes();
      this.setupGlobalEvents();
      this.setupKeyboardShortcuts();
      this.renderShell();
      this.setupTheme();

      // Wait for the auth restore (bounded — app still boots as guest when
      // auth is slow or unconfigured) so a stored session isn't mistaken
      // for "logged out" and bounced to /welcome on reload.
      try {
        await Promise.race([
          initializeAuth(),
          new Promise(resolve => setTimeout(resolve, 4000))
        ]);
      } catch (e) {
        console.warn('Auth init:', e.message);
      }

      // First visit must land on signup — auth is required.
      // Note: clearing "Cache" in Chrome does NOT clear localStorage;
      // use "Clear site data" or Application > Storage > Clear.
      const hasAuth = localStorage.getItem('cc_auth_guest') === 'true' || authState.isAuthenticated();

      if (!hasAuth) {
        // No session — first visit lands on the welcome page
        // (guard also enforces this for deep links)
        this.router.start();
        this.router.navigate('/welcome');
      } else {
        const onboardingDone = localStorage.getItem('onboardingComplete');
        if (!onboardingDone) {
          // Check if user already has documents (e.g., from import) — skip wizard
          let hasDocuments = false;
          try {
            const docs = await this.db.getAll('documents');
            hasDocuments = docs && docs.length > 0;
          } catch (e) { /* ignore */ }

          if (hasDocuments) {
            localStorage.setItem('onboardingComplete', 'true');
          } else {
            this.showOnboarding();
          }
        }
        this.router.start();
      }

      this.setupStorageWarning();
    } catch (err) {
      console.error('Failed to initialize CareerCanvas:', err);
      this.appEl.innerHTML = `
        <div class="app-loading">
          <div class="app-loading-logo" style="background:#dc2626">!</div>
          <div class="app-loading-text">Failed to load CareerCanvas. Please refresh the page.</div>
          <div class="app-loading-text" style="font-size:0.75rem;color:#94a3b8">${this.escapeHtml(err.message)}</div>
        </div>
      `;
    }
  }

  setupGlobalContext() {
    window.CC = {
      state: this.state,
      db: this.db,
      events: this.events,
      toast: this.toast,
      modal: this.modal,
      templateEngine: this.templateEngine,
      exportManager: this.exportManager,
      importManager: this.importManager,
      atsChecker: this.atsChecker,
      router: this.router,
      themeEngine: this.themeEngine,
      app: this
    };
  }

  renderShell() {
    this.appEl.innerHTML = '';

    const skipLink = document.createElement('a');
    skipLink.href = '#app-main';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    this.appEl.appendChild(skipLink);

    const header = document.createElement('header');
    header.className = 'app-header';
    header.id = 'app-header';
    header.innerHTML = `
      <div class="app-header-inner">
        <a href="#/dashboard" class="app-logo" aria-label="CareerCanvas Home">
          <span class="app-logo-mark" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="8" fill="url(#logo-grad)"/>
              <text x="18" y="23.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="18" fill="white">C</text>
              <rect x="24" y="24" width="8" height="8" rx="2" fill="#60a5fa" opacity="0.9"/>
              <rect x="26" y="26" width="4" height="1" rx="0.5" fill="white"/>
              <rect x="26" y="28" width="3" height="1" rx="0.5" fill="white" opacity="0.7"/>
              <defs><linearGradient id="logo-grad" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs>
            </svg>
          </span>
          <span class="app-logo-text">CareerCanvas</span>
        </a>
        <nav class="app-nav" aria-label="Main navigation">
          <a href="#/dashboard" class="app-nav-link" data-route="dashboard">
            <span class="app-nav-icon" aria-hidden="true">&#9776;</span>
            <span>Dashboard</span>
          </a>
          <a href="#/master-profile" class="app-nav-link" data-route="master-profile">
            <span class="app-nav-icon" aria-hidden="true">&#9998;</span>
            <span>Profile</span>
          </a>
          <a href="#/applications" class="app-nav-link" data-route="applications">
            <span class="app-nav-icon" aria-hidden="true">&#9745;</span>
            <span>Applications</span>
          </a>
          <a href="#/templates" class="app-nav-link" data-route="templates">
            <span class="app-nav-icon" aria-hidden="true">&#9638;</span>
            <span>Templates</span>
          </a>
          <div class="app-nav-dropdown" id="nav-tools-dropdown">
            <button class="app-nav-link app-nav-dropdown-trigger" aria-expanded="false" aria-haspopup="true" aria-label="Career Tools menu">
              <span class="app-nav-icon" aria-hidden="true">&#9874;</span>
              <span>Tools</span>
              <span class="app-nav-chevron" aria-hidden="true">&#9662;</span>
            </button>
            <div class="app-nav-dropdown-menu" role="menu">
              <a href="#/job-matcher" class="app-nav-dropdown-item" data-route="job-matcher" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9906;</span>
                <span>JD Matcher</span>
              </a>
              <a href="#/skills-matrix" class="app-nav-dropdown-item" data-route="skills-matrix" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9878;</span>
                <span>Skills Matrix</span>
              </a>
              <a href="#/theme-studio" class="app-nav-dropdown-item" data-route="theme-studio" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9835;</span>
                <span>Theme Studio</span>
              </a>
              <a href="#/section-studio" class="app-nav-dropdown-item" data-route="section-studio" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9638;</span>
                <span>Section Studio</span>
              </a>
              <a href="#/pdf-studio" class="app-nav-dropdown-item" data-route="pdf-studio" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9112;</span>
                <span>PDF Studio</span>
              </a>
              <a href="#/packages" class="app-nav-dropdown-item" data-route="packages" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9993;</span>
                <span>Packages</span>
              </a>
              <a href="#/timeline" class="app-nav-dropdown-item" data-route="timeline" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#8942;</span>
                <span>Timeline</span>
              </a>
              <a href="#/consistency" class="app-nav-dropdown-item" data-route="consistency" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#10003;</span>
                <span>Consistency</span>
              </a>
              <a href="#/privacy-check" class="app-nav-dropdown-item" data-route="privacy-check" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128274;</span>
                <span>Privacy Check</span>
              </a>
              <a href="#/optimizer" class="app-nav-dropdown-item" data-route="optimizer" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9986;</span>
                <span>Optimizer</span>
              </a>
              <a href="#/a11y-inspector" class="app-nav-dropdown-item" data-route="a11y-inspector" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9855;</span>
                <span>Accessibility</span>
              </a>
              <a href="#/versions" class="app-nav-dropdown-item" data-route="versions" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128195;</span>
                <span>Versions</span>
              </a>
              <a href="#/portfolio" class="app-nav-dropdown-item" data-route="portfolio" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#127912;</span>
                <span>Portfolio</span>
              </a>
              <a href="#/links-qr" class="app-nav-dropdown-item" data-route="links-qr" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128279;</span>
                <span>Links & QR</span>
              </a>
              <a href="#/localization" class="app-nav-dropdown-item" data-route="localization" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#127760;</span>
                <span>Localization</span>
              </a>
              <a href="#/data-backup" class="app-nav-dropdown-item" data-route="data-backup" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128451;</span>
                <span>Data & Backup</span>
              </a>
              <a href="#/import" class="app-nav-dropdown-item" data-route="import" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128229;</span>
                <span>Import</span>
              </a>
              <a href="#/stress-lab" class="app-nav-dropdown-item" data-route="stress-lab" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#129514;</span>
                <span>Stress Lab</span>
              </a>
              <div class="app-nav-dropdown-divider" role="separator"></div>
              <button class="app-nav-dropdown-item" id="btn-exp-calc-dropdown" role="menuitem" type="button">
                <span class="app-nav-icon" aria-hidden="true">&#9202;</span>
                <span>Exp Calculator</span>
              </button>
              <div class="app-nav-dropdown-divider" role="separator"></div>
              <a href="#/features" class="app-nav-dropdown-item" data-route="features" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#9733;</span>
                <span>Features</span>
              </a>
              <a href="#/about" class="app-nav-dropdown-item" data-route="about" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#8505;</span>
                <span>About</span>
              </a>
              <a href="#/faq" class="app-nav-dropdown-item" data-route="faq" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#10068;</span>
                <span>FAQ</span>
              </a>
              <a href="#/privacy" class="app-nav-dropdown-item" data-route="privacy" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128274;</span>
                <span>Privacy Policy</span>
              </a>
              <a href="#/terms" class="app-nav-dropdown-item" data-route="terms" role="menuitem">
                <span class="app-nav-icon" aria-hidden="true">&#128220;</span>
                <span>Terms of Service</span>
              </a>
            </div>
          </div>
          <a href="#/settings" class="app-nav-link" data-route="settings">
            <span class="app-nav-icon" aria-hidden="true">&#9881;</span>
            <span>Settings</span>
          </a>
        </nav>
        <div class="app-header-actions">
          <button class="btn btn-sm btn-ghost" id="btn-theme-toggle" aria-label="Toggle theme" title="Toggle dark mode">
            <span id="theme-icon" aria-hidden="true">🌙</span>
          </button>
          <div class="app-account-btn-wrap" id="app-account-wrap">
            <button class="btn btn-sm btn-outline" id="btn-account" aria-label="Account" title="Account">
              <span id="account-icon" aria-hidden="true">👤</span>
              <span id="account-label">Sign In</span>
            </button>
          </div>
          <button class="mobile-menu-btn" id="btn-mobile-menu" aria-label="Open navigation menu" aria-expanded="false">
            <span aria-hidden="true">&#9776;</span>
          </button>
        </div>
      </div>
    `;

    const main = document.createElement('main');
    main.className = 'app-main';
    main.id = 'app-main';
    main.setAttribute('role', 'main');
    main.tabIndex = -1;

    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');

    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';

    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-nav-overlay';
    mobileOverlay.id = 'mobile-nav-overlay';

    const mobileDrawer = document.createElement('nav');
    mobileDrawer.className = 'mobile-nav-drawer';
    mobileDrawer.id = 'mobile-nav-drawer';
    mobileDrawer.setAttribute('aria-label', 'Mobile navigation');
    mobileDrawer.innerHTML = `
      <a href="#/dashboard" class="app-nav-link" data-route="dashboard">
        <span class="app-nav-icon" aria-hidden="true">&#9776;</span>
        <span>Dashboard</span>
      </a>
      <a href="#/master-profile" class="app-nav-link" data-route="master-profile">
        <span class="app-nav-icon" aria-hidden="true">&#9998;</span>
        <span>Profile</span>
      </a>
      <a href="#/applications" class="app-nav-link" data-route="applications">
        <span class="app-nav-icon" aria-hidden="true">&#9745;</span>
        <span>Applications</span>
      </a>
      <a href="#/templates" class="app-nav-link" data-route="templates">
        <span class="app-nav-icon" aria-hidden="true">&#9638;</span>
        <span>Templates</span>
      </a>
      <a href="#/job-matcher" class="app-nav-link" data-route="job-matcher">
        <span class="app-nav-icon" aria-hidden="true">&#9906;</span>
        <span>JD Matcher</span>
      </a>
      <a href="#/skills-matrix" class="app-nav-link" data-route="skills-matrix">
        <span class="app-nav-icon" aria-hidden="true">&#9878;</span>
        <span>Skills Matrix</span>
      </a>
      <a href="#/theme-studio" class="app-nav-link" data-route="theme-studio">
        <span class="app-nav-icon" aria-hidden="true">&#9835;</span>
        <span>Theme Studio</span>
      </a>
      <a href="#/section-studio" class="app-nav-link" data-route="section-studio">
        <span class="app-nav-icon" aria-hidden="true">&#9638;</span>
        <span>Section Studio</span>
      </a>
      <a href="#/pdf-studio" class="app-nav-link" data-route="pdf-studio">
        <span class="app-nav-icon" aria-hidden="true">&#9112;</span>
        <span>PDF Studio</span>
      </a>
      <a href="#/packages" class="app-nav-link" data-route="packages">
        <span class="app-nav-icon" aria-hidden="true">&#9993;</span>
        <span>Packages</span>
      </a>
      <a href="#/timeline" class="app-nav-link" data-route="timeline">
        <span class="app-nav-icon" aria-hidden="true">&#8942;</span>
        <span>Timeline</span>
      </a>
      <a href="#/consistency" class="app-nav-link" data-route="consistency">
        <span class="app-nav-icon" aria-hidden="true">&#10003;</span>
        <span>Consistency</span>
      </a>
      <a href="#/privacy-check" class="app-nav-link" data-route="privacy-check">
        <span class="app-nav-icon" aria-hidden="true">&#128274;</span>
        <span>Privacy Check</span>
      </a>
      <a href="#/portfolio" class="app-nav-link" data-route="portfolio">
        <span class="app-nav-icon" aria-hidden="true">&#127912;</span>
        <span>Portfolio</span>
      </a>
      <a href="#/links-qr" class="app-nav-link" data-route="links-qr">
        <span class="app-nav-icon" aria-hidden="true">&#128279;</span>
        <span>Links & QR</span>
      </a>
      <a href="#/localization" class="app-nav-link" data-route="localization">
        <span class="app-nav-icon" aria-hidden="true">&#127760;</span>
        <span>Localization</span>
      </a>
      <a href="#/optimizer" class="app-nav-link" data-route="optimizer">
        <span class="app-nav-icon" aria-hidden="true">&#9986;</span>
        <span>Optimizer</span>
      </a>
      <a href="#/a11y-inspector" class="app-nav-link" data-route="a11y-inspector">
        <span class="app-nav-icon" aria-hidden="true">&#9855;</span>
        <span>Accessibility</span>
      </a>
      <a href="#/versions" class="app-nav-link" data-route="versions">
        <span class="app-nav-icon" aria-hidden="true">&#128195;</span>
        <span>Versions</span>
      </a>
      <a href="#/data-backup" class="app-nav-link" data-route="data-backup">
        <span class="app-nav-icon" aria-hidden="true">&#128451;</span>
        <span>Data & Backup</span>
      </a>
      <a href="#/import" class="app-nav-link" data-route="import">
        <span class="app-nav-icon" aria-hidden="true">&#128229;</span>
        <span>Import</span>
      </a>
      <a href="#/stress-lab" class="app-nav-link" data-route="stress-lab">
        <span class="app-nav-icon" aria-hidden="true">&#129514;</span>
        <span>Stress Lab</span>
      </a>
      <a href="#/settings" class="app-nav-link" data-route="settings">
        <span class="app-nav-icon" aria-hidden="true">&#9881;</span>
        <span>Settings</span>
      </a>
    `;

    const watermark = document.createElement('div');
    watermark.className = 'app-watermark';
    watermark.setAttribute('aria-hidden', 'true');
    watermark.innerHTML = '<span class="app-watermark-logo"><svg width="14" height="14" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="8" fill="url(#wm-g)"/><text x="18" y="24" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="20" fill="white">C</text><defs><linearGradient id="wm-g" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs></svg></span><span class="app-watermark-text">Crafted with <span class="app-watermark-heart">&#10084;</span> by <strong>Shubham Bundele</strong></span>';

    this.appEl.appendChild(header);
    this.appEl.appendChild(mobileOverlay);
    this.appEl.appendChild(mobileDrawer);
    this.appEl.appendChild(main);
    this.appEl.appendChild(watermark);
    this.appEl.appendChild(toastContainer);
    this.appEl.appendChild(modalContainer);

    this.setupToolsDropdown();
    this.setupMobileMenu();

    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    const accountBtn = document.getElementById('btn-account');
    if (accountBtn) {
      accountBtn.addEventListener('click', async () => {
        const state = authState.get();

        if (state.status === 'initializing') {
          const resolved = await authState.waitForInit();
          this.handleAccountClick(accountBtn, resolved);
        } else {
          this.handleAccountClick(accountBtn, state);
        }
      });
    }

    this._authUnsub = authState.subscribe((state) => {
      this.updateAccountButton(state);
    });
    this.updateAccountButton(authState.get());
  }

  handleAccountClick(anchor, state) {
    if (state.status === 'authenticated') {
      this.showAccountMenu(anchor);
    } else if (state.status === 'guest') {
      this.showGuestMenu(anchor);
    } else {
      const current = this.router.getCurrentRoute()?.path;
      if (current && current !== '/welcome' && current !== '/login' && current !== '/signup') {
        authState.setIntendedRoute(current);
      }
      this.router.navigate('/login');
    }
  }

  updateAccountButton(state) {
    const icon = document.getElementById('account-icon');
    const label = document.getElementById('account-label');
    const btn = document.getElementById('btn-account');
    if (!icon || !label || !btn) return;

    switch (state.status) {
      case 'initializing':
        icon.textContent = '';
        icon.style.cssText = 'width:20px;height:20px;border-radius:50%;background:var(--border-primary);display:inline-block;animation:authPulse 1.5s ease-in-out infinite;';
        label.textContent = '';
        btn.setAttribute('aria-label', 'Loading account...');
        break;

      case 'authenticated': {
        const name = state.user?.user_metadata?.display_name || state.user?.email || '';
        const initial = (name[0] || '?').toUpperCase();
        icon.textContent = initial;
        icon.style.cssText = 'width:24px;height:24px;border-radius:50%;background:var(--color-primary);color:white;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;';
        label.textContent = name.split('@')[0].split(' ')[0] || 'Account';
        btn.setAttribute('aria-label', 'Account menu');
        btn.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))';
        break;
      }

      case 'guest':
        icon.textContent = '👤';
        icon.style.cssText = '';
        label.textContent = 'Guest';
        btn.setAttribute('aria-label', 'Guest menu');
        btn.style.background = '';
        break;

      default:
        icon.textContent = '👤';
        icon.style.cssText = '';
        label.textContent = 'Sign In';
        btn.setAttribute('aria-label', 'Sign in');
        btn.style.background = '';
        break;
    }
  }

  showGuestMenu(anchor) {
    const existing = document.querySelector('.app-account-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.className = 'app-account-menu';
    menu.setAttribute('role', 'menu');

    menu.innerHTML = '<div class="app-account-menu-header"><strong>Guest Mode</strong><span>Using CareerCanvas locally</span></div><div class="app-account-menu-divider"></div>';

    const goSignIn = async () => {
      // Guest work is wiped on sign-in — offer a backup first (same guard
      // as the dashboard guest banner).
      try {
        const n = await countGuestDocuments(this.db);
        if (n > 0) {
          const saveFirst = confirm(
            `You have ${n} unsaved guest resume${n === 1 ? '' : 's'}. Guest work is temporary and will be cleared when you sign in.\n\nPress OK to download a backup first, or Cancel to continue to sign in.`
          );
          if (saveFirst) {
            menu.remove();
            this.events.emit('dashboard:exportAll');
            if (this.toast) this.toast.show('Backup downloading — sign in when ready, then re-import it.', 'info', 6000);
            return;
          }
        }
      } catch (e) { /* proceed to sign in */ }
      menu.remove();
      const c = this.router.getCurrentRoute()?.path;
      if (c && c !== '/welcome') authState.setIntendedRoute(c);
      this.router.navigate('/login');
    };

    const items = [
      { label: 'Sign In', action: () => { goSignIn(); } },
      { label: 'Create Account', action: () => { menu.remove(); this.router.navigate('/signup'); } },
      { label: 'Settings', action: () => { menu.remove(); this.router.navigate('/settings'); } }
    ];

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'app-account-menu-item';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      btn.addEventListener('click', item.action);
      menu.appendChild(btn);
    });

    const info = document.createElement('div');
    info.className = 'app-account-menu-info';
    info.textContent = 'Documents are stored locally on this device.';
    menu.appendChild(info);

    const rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    document.body.appendChild(menu);

    const close = (e) => { if (!menu.contains(e.target) && !anchor.contains(e.target)) { menu.remove(); document.removeEventListener('click', close, true); } };
    setTimeout(() => document.addEventListener('click', close, true), 0);
    const escClose = (e) => { if (e.key === 'Escape') { menu.remove(); document.removeEventListener('keydown', escClose); anchor.focus(); } };
    document.addEventListener('keydown', escClose);
  }

  showAccountMenu(anchor) {
    const existing = document.querySelector('.app-account-menu');
    if (existing) { existing.remove(); return; }

    const user = authState.getUser();
    const menu = document.createElement('div');
    menu.className = 'app-account-menu';

    const name = user?.user_metadata?.display_name || user?.email || 'User';
    const email = user?.email || '';

    menu.innerHTML = `
      <div class="app-account-menu-header">
        <strong>${this.escapeHtml(name)}</strong>
        <span>${this.escapeHtml(email)}</span>
      </div>
      <div class="app-account-menu-divider"></div>
    `;

    const items = [
      { label: 'Account Profile', route: '/account/profile' },
      { label: 'Account Security', route: '/account/security' },
      { label: 'Settings', route: '/settings' }
    ];

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'app-account-menu-item';
      btn.textContent = item.label;
      btn.addEventListener('click', () => { menu.remove(); this.router.navigate(item.route); });
      menu.appendChild(btn);
    });

    const divider = document.createElement('div');
    divider.className = 'app-account-menu-divider';
    menu.appendChild(divider);

    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'app-account-menu-item app-account-menu-item--danger';
    signOutBtn.textContent = 'Sign Out';
    signOutBtn.addEventListener('click', async () => {
      menu.remove();
      await signOut();
      if (window.CC?.toast) window.CC.toast.show('Signed out. See you soon!', 'info');
      this.router.navigate('/welcome');
    });
    menu.appendChild(signOutBtn);

    const rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    document.body.appendChild(menu);

    const close = (e) => {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) {
        menu.remove(); document.removeEventListener('click', close, true);
      }
    };
    setTimeout(() => document.addEventListener('click', close, true), 0);
    const escClose = (e) => {
      if (e.key === 'Escape') { menu.remove(); document.removeEventListener('keydown', escClose); anchor.focus(); }
    };
    document.addEventListener('keydown', escClose);
  }

  setupRoutes() {
    this.router.on('/dashboard', () => this.showView('dashboard'));
    this.router.on('/editor/:id', (params) => this.showView('editor', params));
    this.router.on('/templates', () => this.showView('templates'));
    this.router.on('/master-profile', () => this.showView('master-profile'));
    this.router.on('/applications', () => this.showView('applications'));
    this.router.on('/settings', () => this.showView('settings'));
    this.router.on('/job-matcher', () => this.showView('job-matcher'));
    this.router.on('/skills-matrix', () => this.showView('skills-matrix'));
    this.router.on('/theme-studio', () => this.showView('theme-studio'));
    this.router.on('/section-studio', () => this.showView('section-studio'));
    this.router.on('/pdf-studio', () => this.showView('pdf-studio'));
    this.router.on('/packages', () => this.showView('packages'));
    this.router.on('/timeline', () => this.showView('timeline'));
    this.router.on('/consistency', () => this.showView('consistency'));
    this.router.on('/privacy-check', () => this.showView('privacy-check'));
    this.router.on('/localization', () => this.showView('localization'));
    this.router.on('/portfolio', () => this.showView('portfolio'));
    this.router.on('/links-qr', () => this.showView('links-qr'));
    this.router.on('/optimizer', () => this.showView('optimizer'));
    this.router.on('/a11y-inspector', () => this.showView('a11y-inspector'));
    this.router.on('/versions', () => this.showView('versions'));
    this.router.on('/data-backup', () => this.showView('data-backup'));
    this.router.on('/stress-lab', () => this.showView('stress-lab'));
    this.router.on('/import', () => this.showView('import'));
    this.router.on('/privacy', () => this.showView('static-page', { page: 'privacy' }));
    this.router.on('/terms', () => this.showView('static-page', { page: 'terms' }));
    this.router.on('/features', () => this.showView('static-page', { page: 'features' }));
    this.router.on('/about', () => this.showView('static-page', { page: 'about' }));
    this.router.on('/faq', () => this.showView('static-page', { page: 'faq' }));
    this.router.on('/roadmap', () => this.showView('static-page', { page: 'roadmap' }));
    this.router.on('/contact', () => this.showView('static-page', { page: 'contact' }));
    this.router.on('/accessibility', () => this.showView('static-page', { page: 'accessibility' }));
    this.router.on('/changelog', () => this.showView('static-page', { page: 'changelog' }));
    this.router.on('/welcome', () => this.showView('welcome'));
    this.router.on('/login', () => this.showView('login'));
    this.router.on('/signup', () => this.showView('signup'));
    this.router.on('/verify-email', () => this.showView('verify-email'));
    this.router.on('/forgot-password', () => this.showView('forgot-password'));
    this.router.on('/reset-password', () => this.showView('reset-password'));
    this.router.on('/auth/callback', () => this.showView('auth-callback'));
    this.router.on('/account/profile', () => this.showView('account-profile'));
    this.router.on('/account/security', () => this.showView('account-security'));
    this.router.setDefault('/dashboard');

    this.router.setGuard(async (toPath, fromPath) => {
      if (this.currentView && this.currentView.hasUnsavedChanges && this.currentView.hasUnsavedChanges()) {
        // Prefer the app modal (native dialogs auto-dismiss in automation).
        // Exception: with the setup wizard overlay open the modal would stack
        // under it (same --z-modal) — native confirm stays visible there.
        const modalApi = window.CC && window.CC.modal;
        const wizardOpen = !!document.querySelector('.onboarding-overlay');
        if (modalApi && typeof modalApi.confirm === 'function' && !wizardOpen) {
          const res = await modalApi.confirm(
            'You have unsaved changes. Are you sure you want to leave?',
            null,
            { title: 'Unsaved Changes', confirmLabel: 'Leave', cancelLabel: 'Stay' }
          ).catch(() => false);
          return res === true;
        }
        return confirm('You have unsaved changes. Are you sure you want to leave?');
      }

      // Auth gate: every app route requires an auth session or explicit guest.
      // "onboardingComplete" alone no longer grants access — first visit must see signup.
      const publicRoutes = ['/welcome', '/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/auth/callback', '/import', '/privacy', '/terms', '/features', '/about', '/faq', '/roadmap', '/contact', '/accessibility', '/changelog'];
      // Wait for the auth restore (bounded) so a reload with a stored session
      // isn't mistaken for "logged out". initializeAuth is awaited at boot too.
      if (!authState.isInitialized()) {
        try {
          await Promise.race([
            authState.waitForInit(),
            new Promise(resolve => setTimeout(resolve, 4000))
          ]);
        } catch (e) { /* fall through with whatever state we have */ }
      }
      const hasAccess = localStorage.getItem('cc_auth_guest') === 'true' || authState.isAuthenticated();

      if (!hasAccess && !publicRoutes.includes(toPath)) {
        // Remember where the user wanted to go for the post-login/guest return.
        try { authState.setIntendedRoute(toPath); } catch (e) { /* ignore */ }
        this.router.navigate('/welcome');
        return false;
      }

      return true;
    });
  }

  async showView(viewName, params = {}) {
    const main = document.getElementById('app-main');
    if (!main) return;

    if (this._navigating) return;
    this._navigating = true;

    try {
      await this._doShowView(viewName, params, main);
    } finally {
      this._navigating = false;
    }
  }

  async _doShowView(viewName, params, main) {
    if (this.currentView && this.currentView.destroy) {
      this.currentView.destroy();
    }

    if (this.experienceCalculator) {
      this.experienceCalculator.close();
      this.experienceCalculator = null;
    }

    this.updateActiveNav(viewName);
    this.updateDocumentTitle(viewName, params);

    main.innerHTML = '<div class="app-loading-placeholder" role="status" style="display:flex;align-items:center;justify-content:center;padding:3rem;color:var(--text-muted)">Loading...</div>';
    main.scrollTop = 0;

    try {
      switch (viewName) {
        case 'dashboard': {
          this.currentView = new Dashboard(this.db, this.events, this.templateEngine);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'editor': {
          if (!params.id) {
            this.toast.show('Document not found', 'error');
            this.router.navigate('/dashboard');
            return;
          }
          main.className = 'app-main app-main--editor';
          this.currentView = new ResumeEditor(params.id, this.db, this.state, this.events, this.templateEngine, this.atsChecker);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'templates': {
          this.currentView = new TemplateGallery(this.templateEngine, this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'master-profile': {
          this.currentView = new MasterProfile(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'applications': {
          this.currentView = new ApplicationTracker(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'settings': {
          this.currentView = new SettingsPanel(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'job-matcher': {
          const { JobMatcher } = await import('./modules/job-matcher.js');
          this.currentView = new JobMatcher(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'skills-matrix': {
          const { SkillsMatrix } = await import('./modules/skills-matrix.js');
          this.currentView = new SkillsMatrix(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'theme-studio': {
          const { ThemeStudio } = await import('./modules/theme-studio.js');
          this.currentView = new ThemeStudio(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'section-studio': {
          const { SectionStudio } = await import('./modules/section-studio.js');
          this.currentView = new SectionStudio(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'pdf-studio': {
          const { PdfStudio } = await import('./modules/pdf-studio.js');
          this.currentView = new PdfStudio(this.db, this.events);
          const el = await this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'packages': {
          const { PackageStudio } = await import('./modules/package-studio.js');
          this.currentView = new PackageStudio(this.db, this.events);
          const el12 = await this.currentView.render();
          main.appendChild(el12);
          break;
        }
        case 'timeline': {
          const { TimelineStudio } = await import('./modules/timeline-studio.js');
          this.currentView = new TimelineStudio(this.db, this.events);
          const el13 = await this.currentView.render();
          main.appendChild(el13);
          break;
        }
        case 'consistency': {
          const { ConsistencyStudio } = await import('./modules/consistency-studio.js');
          this.currentView = new ConsistencyStudio(this.db, this.events);
          const el14 = await this.currentView.render();
          main.appendChild(el14);
          break;
        }
        case 'privacy-check': {
          const { PrivacyStudio } = await import('./modules/privacy-studio.js');
          this.currentView = new PrivacyStudio(this.db, this.events);
          const el15 = await this.currentView.render();
          main.appendChild(el15);
          break;
        }
        case 'localization': {
          const { LocalizationStudio } = await import('./modules/localization-studio.js');
          this.currentView = new LocalizationStudio(this.db, this.events);
          const el16 = await this.currentView.render();
          main.appendChild(el16);
          break;
        }
        case 'portfolio': {
          const { PortfolioStudio } = await import('./modules/portfolio-studio.js');
          this.currentView = new PortfolioStudio(this.db, this.events);
          const el17 = await this.currentView.render();
          main.appendChild(el17);
          break;
        }
        case 'links-qr': {
          const { LinkQrStudio } = await import('./modules/link-qr-studio.js');
          this.currentView = new LinkQrStudio(this.db, this.events);
          const el18 = await this.currentView.render();
          main.appendChild(el18);
          break;
        }
        case 'optimizer': {
          const { SpaceOptimizer } = await import('./modules/space-optimizer.js');
          this.currentView = new SpaceOptimizer(this.db, this.events);
          const el19 = await this.currentView.render();
          main.appendChild(el19);
          break;
        }
        case 'a11y-inspector': {
          const { A11yInspector } = await import('./modules/a11y-inspector.js');
          this.currentView = new A11yInspector(this.db, this.events);
          const el20 = await this.currentView.render();
          main.appendChild(el20);
          break;
        }
        case 'versions': {
          const { VersionStudio } = await import('./modules/version-studio.js');
          this.currentView = new VersionStudio(this.db, this.events);
          const el21 = await this.currentView.render();
          main.appendChild(el21);
          break;
        }
        case 'data-backup': {
          const { DataStudio } = await import('./modules/data-studio.js');
          this.currentView = new DataStudio(this.db, this.events);
          const el22 = await this.currentView.render();
          main.appendChild(el22);
          break;
        }
        case 'stress-lab': {
          const { StressLab } = await import('./modules/stress-lab.js');
          this.currentView = new StressLab(this.db, this.events);
          const el23 = await this.currentView.render();
          main.appendChild(el23);
          break;
        }
        case 'import': {
          this.currentView = this.importManager;
          const el = await this.importManager.renderImportView(this.db);
          main.appendChild(el);
          break;
        }
        case 'static-page': {
          const { StaticPages } = await import('./pages/static-pages.js');
          this.currentView = new StaticPages(params.page);
          const el = this.currentView.render();
          main.appendChild(el);
          break;
        }
        case 'welcome':
        case 'login':
        case 'signup':
        case 'verify-email':
        case 'forgot-password':
        case 'reset-password':
        case 'auth-callback':
        case 'account-profile':
        case 'account-security': {
          const { AuthUI } = await import('./auth/auth-ui.js');
          this.currentView = new AuthUI();
          let el;
          switch (viewName) {
            case 'welcome': {
              if (authState.isAuthenticated()) {
                const intended = authState.clearIntendedRoute();
                this.router.navigate(intended || '/dashboard');
                return;
              }
              el = await this.currentView.renderLanding();
              break;
            }
            case 'login': {
              if (!authState.isInitialized()) await authState.waitForInit();
              if (authState.isAuthenticated()) {
                const intended = authState.clearIntendedRoute();
                this.router.navigate(intended || '/dashboard');
                return;
              }
              el = await this.currentView.renderLogin();
              break;
            }
            case 'signup': {
              if (!authState.isInitialized()) await authState.waitForInit();
              if (authState.isAuthenticated()) {
                this.router.navigate('/dashboard');
                return;
              }
              el = await this.currentView.renderSignup();
              break;
            }
            case 'verify-email': el = await this.currentView.renderVerifyEmail(); break;
            case 'forgot-password': el = await this.currentView.renderForgotPassword(); break;
            case 'reset-password': el = await this.currentView.renderResetPassword(); break;
            case 'auth-callback': el = await this.currentView.renderAuthCallback(); break;
            case 'account-profile': {
              if (!authState.isAuthenticated()) { authState.setIntendedRoute('/account/profile'); this.router.navigate('/login'); return; }
              el = await this.currentView.renderAccountProfile(); break;
            }
            case 'account-security': {
              if (!authState.isAuthenticated()) { authState.setIntendedRoute('/account/security'); this.router.navigate('/login'); return; }
              el = await this.currentView.renderAccountSecurity(); break;
            }
          }
          if (el) main.appendChild(el);
          break;
        }
        default:
          main.innerHTML = `<div class="container p-6" style="text-align:center;max-width:520px;margin:0 auto;padding-top:4rem">
            <div style="font-size:2.5rem" aria-hidden="true">🧭</div>
            <h1>Page not found</h1>
            <p style="color:var(--text-secondary)">The page you're looking for doesn't exist or was moved.</p>
            <p><a href="#/dashboard" class="btn btn-sm btn-primary">Return to Dashboard</a>
            <button class="btn btn-sm btn-ghost" type="button" onclick="history.back()">Go Back</button></p></div>`;
      }
      const loadingEl = main.querySelector('.app-loading-placeholder');
      if (loadingEl) loadingEl.remove();
    } catch (err) {
      console.error(`Error loading view ${viewName}:`, err);
      main.className = 'app-main';
      main.innerHTML = `<div class="container p-6"><h1>Error loading page</h1><p>${this.escapeHtml(err.message)}</p><p><a href="#/dashboard">Return to Dashboard</a></p></div>`;
    }

    if (viewName !== 'editor') {
      main.className = 'app-main';
      this.showFooter(main);
    } else {
      this.showSlimFooter(main);
    }

    // Move focus to main for screen-reader route announcements (skip-link target).
    try { main.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  updateActiveNav(viewName) {
    document.querySelectorAll('.app-nav-link[data-route]').forEach(link => {
      link.classList.toggle('active', link.dataset.route === viewName);
    });
    document.querySelectorAll('.app-nav-dropdown-item[data-route]').forEach(link => {
      link.classList.toggle('active', link.dataset.route === viewName);
    });
    const toolsTrigger = document.querySelector('.app-nav-dropdown-trigger');
    if (toolsTrigger) {
      const isToolActive = ['job-matcher', 'skills-matrix', 'theme-studio', 'section-studio', 'pdf-studio', 'packages', 'timeline', 'consistency', 'privacy-check', 'localization', 'portfolio', 'links-qr', 'optimizer', 'a11y-inspector', 'versions', 'data-backup', 'stress-lab', 'import'].includes(viewName);
      toolsTrigger.classList.toggle('active', isToolActive);
    }
  }

  updateDocumentTitle(viewName, params = {}) {
    const titles = {
      'dashboard': 'Dashboard',
      'editor': 'Editor',
      'templates': 'Templates',
      'master-profile': 'Master Profile',
      'applications': 'Applications',
      'settings': 'Settings',
      'job-matcher': 'JD Matcher',
      'skills-matrix': 'Skills Matrix',
      'theme-studio': 'Theme Studio',
      'section-studio': 'Section Studio',
      'pdf-studio': 'PDF Studio',
      'packages': 'Packages',
      'timeline': 'Timeline',
      'consistency': 'Consistency',
      'privacy-check': 'Privacy Check',
      'localization': 'Localization',
      'portfolio': 'Portfolio',
      'links-qr': 'Links & QR',
      'optimizer': 'Optimizer',
      'a11y-inspector': 'Accessibility',
      'versions': 'Versions',
      'data-backup': 'Data & Backup',
      'stress-lab': 'Stress Lab',
      'import': 'Import',
      'welcome': 'Welcome',
      'login': 'Sign In',
      'signup': 'Create Account',
      'verify-email': 'Verify Email',
      'forgot-password': 'Forgot Password',
      'reset-password': 'Reset Password',
      'auth-callback': 'Signing In',
      'account-profile': 'Account Profile',
      'account-security': 'Account Security'
    };
    let title = titles[viewName] || 'CareerCanvas';
    if (viewName === 'static-page' && params.page) {
      title = params.page.charAt(0).toUpperCase() + params.page.slice(1);
    }
    document.title = `${title} – CareerCanvas`;
  }

  setupToolsDropdown() {
    const dropdown = document.getElementById('nav-tools-dropdown');
    if (!dropdown) return;
    const trigger = dropdown.querySelector('.app-nav-dropdown-trigger');
    const menu = dropdown.querySelector('.app-nav-dropdown-menu');
    if (!trigger || !menu) return;

    const toggle = (show) => {
      const isOpen = show !== undefined ? show : !menu.classList.contains('open');
      if (isOpen) {
        const rect = trigger.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.left = `${Math.max(8, rect.left + rect.width / 2 - 90)}px`;
      }
      menu.classList.toggle('open', isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));
    };

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) toggle(false);
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggle(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        toggle(true);
        const first = menu.querySelector('.app-nav-dropdown-item');
        if (first) first.focus();
      }
    });

    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { toggle(false); trigger.focus(); }
    });

    menu.querySelectorAll('a.app-nav-dropdown-item').forEach(item => {
      item.addEventListener('click', () => toggle(false));
    });

    const expCalcBtn = document.getElementById('btn-exp-calc-dropdown');
    if (expCalcBtn) {
      expCalcBtn.addEventListener('click', () => {
        toggle(false);
        if (this.experienceCalculator) {
          this.experienceCalculator.close();
        }
        this.experienceCalculator = new ExperienceCalculator();
        const doc = this.currentView instanceof ResumeEditor ? this.currentView.document : null;
        this.experienceCalculator.show(undefined, doc);
      });
    }
  }

  setupMobileMenu() {
    const btn = document.getElementById('btn-mobile-menu');
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (!btn || !drawer || !overlay) return;

    const toggle = (open) => {
      const isOpen = open !== undefined ? open : !drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', isOpen);
      overlay.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        btn.innerHTML = '<span aria-hidden="true">&#10005;</span>';
      } else {
        btn.innerHTML = '<span aria-hidden="true">&#9776;</span>';
      }
    };

    btn.addEventListener('click', () => toggle());
    overlay.addEventListener('click', () => toggle(false));

    drawer.querySelectorAll('.app-nav-link').forEach(link => {
      link.addEventListener('click', () => toggle(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        toggle(false);
        btn.focus();
      }
    });
  }

  /**
   * Post-auth entry point: new users (no documents, wizard not done) get the
   * setup wizard first, everyone else goes to the intended page / dashboard.
   * This is the welcome → wizard → dashboard chain.
   */
  async enterAfterAuth(intended) {
    let hasDocuments = false;
    try {
      const docs = await this.db.getAll('documents');
      hasDocuments = docs && docs.length > 0;
    } catch (e) { /* ignore */ }

    if (hasDocuments) {
      localStorage.setItem('onboardingComplete', 'true');
      this.router.navigate(intended || '/dashboard');
      return;
    }
    if (!localStorage.getItem('onboardingComplete')) {
      // Dashboard underneath, setup wizard overlays on top.
      this.router.navigate('/dashboard');
      this.showOnboarding();
      return;
    }
    this.router.navigate(intended || '/dashboard');
  }

  /**
   * Guest entry point: "Continue as Guest" always starts with the setup
   * wizard when the guest has no documents yet (fresh guest), otherwise it
   * lands straight on the dashboard (returning guest). Guest work is
   * temporary and never saved — see user-store.js.
   */
  async enterAsGuest() {
    continueAsGuest();
    let guestDocs = [];
    try {
      const all = await this.db.getAll('documents');
      guestDocs = filterDocumentsByOwner(all, GUEST_OWNER_ID);
    } catch (e) { /* ignore — treat as fresh guest */ }

    if (guestDocs.length === 0) {
      // Dashboard underneath, setup wizard overlays on top.
      this.router.navigate('/dashboard');
      this.showOnboarding(true);
      return;
    }
    localStorage.setItem('onboardingComplete', 'true');
    // Return to the pre-gate deep link when there is one (set by the guard).
    let intended = null;
    try { intended = authState.clearIntendedRoute(); } catch (e) { /* ignore */ }
    this.router.navigate(intended || '/dashboard');
  }

  showOnboarding(force = false) {
    // Don't show if the user already completed onboarding (unless forced,
    // e.g. a fresh guest who explicitly chose "Continue as Guest").
    if (!force && localStorage.getItem('onboardingComplete')) return;

    // Remove any existing wizard overlay
    const existing = document.querySelector('.onboarding-overlay');
    if (existing) existing.remove();

    const wizard = new OnboardingWizard();
    wizard.onComplete = async (doc) => {
      try {
        localStorage.setItem('onboardingComplete', 'true');
        await this.db.put('documents', doc);
        this.toast.show(`Created "${doc.name}"`, 'success');
        this.router.navigate(`/editor/${doc.id}`);
      } catch (e) {
        this.router.navigate('/dashboard');
      }
    };
    wizard.onSkip = () => {
      localStorage.setItem('onboardingComplete', 'true');
      this.router.navigate('/dashboard');
    };
    const el = wizard.render();
    document.body.appendChild(el);
    wizard.renderStep(0);
  }

  showNewDocumentDialog() {
    this._launchDocumentWizard();
  }

  _launchDocumentWizard(preselectedType) {
    // Remove any existing wizard overlay
    const existing = document.querySelector('.onboarding-overlay');
    if (existing) existing.remove();

    const returnRoute = window.location.hash || '#/dashboard';

    const wizard = new OnboardingWizard();
    if (preselectedType) {
      wizard.selections.documentType = preselectedType;
      wizard.currentStep = 1;
    }
    wizard.onComplete = async (doc) => {
      try {
        localStorage.setItem('onboardingComplete', 'true');
        await this.db.put('documents', doc);
        this.toast.show(`Created "${doc.name}"`, 'success');
        this.router.navigate(`/editor/${doc.id}`);
      } catch (e) {
        this.router.navigate('/dashboard');
      }
    };
    wizard.onSkip = () => {
      localStorage.setItem('onboardingComplete', 'true');
      if (returnRoute && returnRoute !== '#/' && returnRoute !== '#/welcome') {
        window.location.hash = returnRoute;
      } else {
        this.router.navigate('/dashboard');
      }
    };
    const el = wizard.render();
    document.body.appendChild(el);
    wizard.renderStep(preselectedType ? 1 : 0);
  }

  setupGlobalEvents() {
    this.events.on('document:create', async (payload) => {
      // If payload has a document already (from import), don't open wizard
      if (payload && payload.document) return;

      const type = payload && payload.type ? payload.type : 'resume';
      this._launchDocumentWizard(type);
    });

    this.events.on('document:open', (payload) => {
      const id = payload && payload.id ? payload.id : payload;
      this.router.navigate(`/editor/${id}`);
    });

    this.events.on('document:delete', async (payload) => {
      const id = payload && payload.id ? payload.id : payload;
      try {
        const { deleteDocumentAndRelated } = await import('./modules/dashboard.js');
        await deleteDocumentAndRelated(this.db, id);
        try {
          const { deleteCloudDocument } = await import('./auth/cloud-store.js');
          // Awaited: a later cloud sync must not see the row still present
          // and re-insert it locally (resurrected document).
          await deleteCloudDocument(id); // best-effort (no-op for guests/offline)
        } catch (e) { /* cloud mirror optional */ }
        this.toast.show('Document deleted', 'info');
      } catch (e) {
        this.toast.show('Failed to delete document', 'error');
      }
    });

    this.events.on('document:duplicate', async (payload) => {
      const id = payload && payload.id ? payload.id : payload;
      try {
        const doc = await this.db.get('documents', id);
        if (doc) {
          const { generateId } = await import('./utils/id.js');
          const copy = { ...doc, id: generateId(), name: doc.name + ' (Copy)', createdAt: new Date().toISOString(), lastModified: new Date().toISOString() };
          // Keep metadata.title in sync — the editor overwrites name from it on save.
          copy.metadata = { ...(copy.metadata || {}), title: copy.name };
          await this.db.put('documents', copy);
          this.toast.show(`Duplicated "${doc.name}"`, 'success');
        }
      } catch (e) {
        this.toast.show('Failed to duplicate document', 'error');
      }
    });

    this.events.on('document:rename', async (payload) => {
      if (payload && payload.id && payload.name) {
        try {
          const doc = await this.db.get('documents', payload.id);
          if (doc) {
            doc.name = payload.name;
            // Keep metadata.title in sync — the editor overwrites name from it on save.
            doc.metadata = { ...(doc.metadata || {}), title: doc.name };
            doc.lastModified = new Date().toISOString();
            await this.db.put('documents', doc);
            this.toast.show(`Renamed to "${payload.name}"`, 'success');
          }
        } catch (e) {
          this.toast.show('Failed to rename document', 'error');
        }
      }
    });

    this.events.on('document:export', async (payload) => {
      const id = payload && payload.id ? payload.id : payload;
      try {
        const doc = await this.db.get('documents', id);
        if (doc) {
          await this.showExportFormatMenu(doc);
        }
      } catch (e) {
        this.toast.show('Failed to export document', 'error');
      }
    });

    this.events.on('navigate', (path) => {
      this.router.navigate(path);
    });

    this.events.on('import:complete', () => {
      this.toast.show('Import complete', 'success');
    });

    this.events.on('export:complete', (payload) => {
      const label = typeof payload === 'string'
        ? payload
        : (payload && (payload.filename || payload.format)) || 'document';
      this.toast.show(`Exported: ${label}`, 'success');
    });

    this.events.on('dashboard:import', () => {
      this.router.navigate('/import');
    });

    this.events.on('dashboard:exportAll', async () => {
      try {
        const allData = {};
        const stores = ['documents', 'masterProfile', 'jobDescriptions', 'applications', 'contentLibrary', 'snapshots', 'designPresets', 'matchAnalyses'];
        for (const store of stores) {
          try { allData[store] = await this.db.getAll(store); } catch (e) { allData[store] = []; }
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
        this.toast.show('Full backup exported', 'success');
      } catch (e) {
        this.toast.show('Failed to export backup', 'error');
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            if (e.shiftKey) {
              e.preventDefault();
              this.showNewDocumentDialog();
            }
            break;
        }
      }
      if (e.key === 'Escape') {
        this.modal.close();
      }
    });
  }

  setupTheme() {
    this.themeEngine.init();
    this.updateThemeIcon();
  }

  toggleTheme() {
    const mode = this.themeEngine.getResolvedMode();
    if (mode === 'dark') {
      this.themeEngine.applyTheme('careercanvas-light');
    } else {
      this.themeEngine.applyTheme('midnight-professional');
    }
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      const mode = this.themeEngine.getResolvedMode();
      icon.textContent = mode === 'dark' ? '☀️' : '🌙';
    }
  }

  async setupStorageWarning() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usedMB = (est.usage / (1024 * 1024)).toFixed(1);
        const quotaMB = (est.quota / (1024 * 1024)).toFixed(0);
        const pct = ((est.usage / est.quota) * 100).toFixed(1);
        if (pct > 80) {
          this.toast.show(`Storage usage is at ${pct}% (${usedMB}MB / ${quotaMB}MB). Consider exporting backups.`, 'warning', 8000);
        }
      } catch (e) {
        // Storage estimation not available
      }
    }
  }

  async showExportFormatMenu(doc) {
    const existing = document.querySelector('.export-format-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'export-format-overlay';

    const panel = document.createElement('div');
    panel.className = 'export-format-panel';

    panel.innerHTML = `<div class="export-format-header"><h2>Export "${this.escapeHtml(doc.name)}"</h2><button class="ew-close" aria-label="Close">×</button></div>`;
    panel.querySelector('.ew-close').addEventListener('click', () => overlay.remove());

    const grid = document.createElement('div');
    grid.className = 'export-format-grid';

    const formats = [
      { id: 'pdf', icon: '📄', title: 'PDF', desc: 'Print-ready with Export Wizard optimization', wizard: true },
      { id: 'json', icon: '💾', title: 'JSON', desc: 'CareerCanvas format — reimport later' },
      { id: 'html', icon: '🌐', title: 'HTML', desc: 'Web page with Export Wizard optimization', wizard: true },
      { id: 'text', icon: '📝', title: 'Plain Text', desc: 'Simple text for pasting anywhere' },
      { id: 'markdown', icon: '📋', title: 'Markdown', desc: 'For GitHub, blogs, or documentation' }
    ];

    for (const fmt of formats) {
      const card = document.createElement('button');
      card.className = 'export-format-card';
      card.innerHTML = `<span class="export-format-card-icon">${fmt.icon}</span><strong>${fmt.title}</strong><span class="export-format-card-desc">${fmt.desc}</span>${fmt.wizard ? '<span class="export-format-card-badge">✨ Wizard</span>' : ''}`;
      card.addEventListener('click', async () => {
        overlay.remove();
        if (fmt.wizard) {
          // Open in editor with wizard
          this.router.navigate(`/editor/${doc.id}`);
          // Wait for editor to load, then trigger export
          setTimeout(() => {
            if (this.currentView?.handleExport) this.currentView.handleExport(fmt.id);
          }, 500);
        } else {
          this._directExport(doc, fmt.id);
        }
      });
      grid.appendChild(card);
    }

    panel.appendChild(grid);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
  }

  _directExport(doc, format) {
    const safeName = (doc.name || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${safeName}.json`; a.click();
      URL.revokeObjectURL(url);
      this.toast.show(`Exported "${doc.name}" as JSON`, 'success');
    } else if (format === 'text') {
      const text = this._docToText(doc);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${safeName}.txt`; a.click();
      URL.revokeObjectURL(url);
      this.toast.show(`Exported "${doc.name}" as text`, 'success');
    } else if (format === 'markdown') {
      const md = this._docToMarkdown(doc);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${safeName}.md`; a.click();
      URL.revokeObjectURL(url);
      this.toast.show(`Exported "${doc.name}" as Markdown`, 'success');
    }
  }

  _docToText(doc) {
    let text = '';
    const pi = doc.personalInfo || {};
    if (pi.fullName) text += pi.fullName + '\n';
    if (pi.professionalTitle) text += pi.professionalTitle + '\n';
    const contact = [pi.email, pi.phone, pi.city].filter(Boolean).join(' | ');
    if (contact) text += contact + '\n';
    text += '\n';

    for (const sec of (doc.sections || [])) {
      if (!sec || sec.visible === false) continue;
      text += (sec.title || '').toUpperCase() + '\n' + '-'.repeat(40) + '\n';
      if (sec.content) text += sec.content + '\n';
      if (Array.isArray(sec.items)) {
        for (const item of sec.items) {
          if (!item || item.included === false) continue;
          const line = item.jobTitle || item.text || item.skills || item.name || item.degree || '';
          if (line) text += line + '\n';
          if (item.company) text += item.company + '\n';
          if (item.description) text += item.description + '\n';
          if (Array.isArray(item.achievements)) {
            for (const a of item.achievements) {
              if (a?.text) text += '• ' + a.text + '\n';
            }
          }
        }
      }
      text += '\n';
    }
    return text;
  }

  _docToMarkdown(doc) {
    let md = '';
    const pi = doc.personalInfo || {};
    if (pi.fullName) md += `# ${pi.fullName}\n\n`;
    if (pi.professionalTitle) md += `**${pi.professionalTitle}**\n\n`;
    const contact = [pi.email, pi.phone, pi.city].filter(Boolean).join(' | ');
    if (contact) md += contact + '\n\n';

    for (const sec of (doc.sections || [])) {
      if (!sec || sec.visible === false) continue;
      md += `## ${sec.title || 'Section'}\n\n`;
      if (sec.content) md += sec.content + '\n\n';
      if (Array.isArray(sec.items)) {
        for (const item of sec.items) {
          if (!item || item.included === false) continue;
          const title = item.jobTitle || item.text || item.skills || item.name || item.degree || '';
          if (title) md += `### ${title}\n`;
          if (item.company) md += `*${item.company}*\n`;
          if (item.description) md += item.description + '\n';
          if (Array.isArray(item.achievements)) {
            for (const a of item.achievements) {
              if (a?.text) md += `- ${a.text}\n`;
            }
          }
          md += '\n';
        }
      }
    }
    return md;
  }

  showFooter(container) {
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML = `
      <div class="app-footer-inner">
        <div class="app-footer-brand">
          <span class="app-footer-brand-name">CareerCanvas</span>
          <p>Free, privacy-first career document builder. No paywall, no watermarks, no tracking. Your data stays on your device.</p>
        </div>
        <div class="app-footer-col">
          <h4>Product</h4>
          <a href="#/features">Features</a>
          <a href="#/templates">Templates</a>
          <a href="#/roadmap">Roadmap</a>
          <a href="#/changelog">Changelog</a>
        </div>
        <div class="app-footer-col">
          <h4>Resources</h4>
          <a href="#/faq">FAQ</a>
          <a href="#/about">About</a>
          <a href="#/contact">Contact</a>
          <a href="#/accessibility">Accessibility</a>
        </div>
        <div class="app-footer-col">
          <h4>App</h4>
          <a href="#/dashboard">Dashboard</a>
          <a href="#/import">Import</a>
          <a href="#/data-backup">Data & Backup</a>
          <a href="#/settings">Settings</a>
        </div>
        <div class="app-footer-col">
          <h4>Legal</h4>
          <a href="#/privacy">Privacy Policy</a>
          <a href="#/terms">Terms of Service</a>
        </div>
      </div>
      <div class="app-footer-bottom">
        <span>Crafted by Shubham Bundele</span>
        <span><a href="#/privacy">Privacy</a> &middot; <a href="#/terms">Terms</a></span>
      </div>
    `;
    container.appendChild(footer);
  }

  showSlimFooter(container) {
    const footer = document.createElement('footer');
    footer.className = 'app-footer app-footer--slim';
    footer.innerHTML = `
      <div class="app-footer-bottom">
        <span>CareerCanvas</span>
        <span><a href="#/privacy">Privacy</a> &middot; <a href="#/terms">Terms</a> &middot; <a href="#/contact">Contact</a></span>
      </div>
    `;
    container.appendChild(footer);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

const app = new CareerCanvasApp();
app.init();
