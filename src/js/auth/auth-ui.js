import { createElement } from '../utils/sanitize.js';
import authState, { AUTH_STATUS } from './auth-state.js';
import { getAuthConfig, isAuthConfigured } from './auth-config.js';
import * as authService from './auth-service.js';

export class AuthUI {
  constructor() {
    this.container = null;
    this.listeners = [];
    this._submitting = false;
  }

  addListener(el, event, handler) {
    el.addEventListener(event, handler);
    this.listeners.push({ element: el, event, handler });
  }

  destroy() {
    if (this._welcomeCanvasCleanup) { this._welcomeCanvasCleanup(); this._welcomeCanvasCleanup = null; }
    this.listeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.listeners = [];
    if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }

  hasUnsavedChanges() { return false; }

  _wrap() {
    this.container = createElement('div', '', { class: 'auth-page' });
    this.container.setAttribute('role', 'main');
    return this.container;
  }

  _card(title, subtitle) {
    const card = createElement('div', '', { class: 'auth-card' });
    if (title) {
      const h = createElement('h1', title, { class: 'auth-card-title' });
      card.appendChild(h);
    }
    if (subtitle) {
      const p = createElement('p', subtitle, { class: 'auth-card-subtitle' });
      card.appendChild(p);
    }
    return card;
  }

  _input(id, label, type, opts = {}) {
    const group = createElement('div', '', { class: 'auth-field' });
    const lbl = createElement('label', label, { class: 'auth-label', for: id });
    group.appendChild(lbl);

    const inputWrap = createElement('div', '', { class: 'auth-input-wrap' });
    const input = createElement('input', '', {
      class: 'auth-input',
      id, type,
      autocomplete: opts.autocomplete || 'off',
      ...(opts.placeholder ? { placeholder: opts.placeholder } : {}),
      ...(opts.maxlength ? { maxlength: opts.maxlength } : {}),
      ...(opts.required ? { required: 'true' } : {})
    });
    inputWrap.appendChild(input);

    if (type === 'password') {
      const toggle = createElement('button', '', { class: 'auth-password-toggle', type: 'button', 'aria-label': 'Show password' });
      toggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      this.addListener(toggle, 'click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        toggle.innerHTML = isPassword
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
      inputWrap.appendChild(toggle);
    }
    group.appendChild(inputWrap);

    if (opts.hint) {
      const hint = createElement('div', opts.hint, { class: 'auth-hint', id: id + '-hint' });
      input.setAttribute('aria-describedby', id + '-hint');
      group.appendChild(hint);
    }

    const errEl = createElement('div', '', { class: 'auth-field-error', id: id + '-error', role: 'alert' });
    group.appendChild(errEl);

    return { group, input, errEl };
  }

  _button(text, opts = {}) {
    const btn = createElement('button', text, {
      class: `auth-btn ${opts.variant === 'outline' ? 'auth-btn--outline' : opts.variant === 'ghost' ? 'auth-btn--ghost' : 'auth-btn--primary'}`,
      type: opts.type || 'button',
      ...(opts.disabled ? { disabled: 'true' } : {})
    });
    return btn;
  }

  _link(text, route) {
    const a = createElement('a', text, { class: 'auth-link' });
    a.setAttribute('href', `#${route}`);
    return a;
  }

  _error(msg) {
    const el = createElement('div', '', { class: 'auth-error', role: 'alert' });
    el.textContent = msg;
    return el;
  }

  _success(msg) {
    const el = createElement('div', '', { class: 'auth-success', role: 'status' });
    el.textContent = msg;
    return el;
  }

  _divider(text) {
    const d = createElement('div', '', { class: 'auth-divider' });
    d.innerHTML = `<span>${text || 'or'}</span>`;
    return d;
  }

  _setFieldError(errEl, msg) {
    errEl.textContent = msg || '';
    errEl.style.display = msg ? 'block' : 'none';
  }

  _setLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Please wait...';
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  // ==================== LANDING PAGE (redirects to consolidated login) ====================

  async renderLanding() {
    // Consolidated: /welcome now renders the same split-screen as /login
    return this.renderLogin();
    /* Original landing page code preserved below for reference but no longer executed */
    /* eslint-disable no-unreachable */
    this.container = createElement('div', '', { class: 'welcome-page' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Welcome to CareerCanvas');

    // Animated background particles — init after return so DOM is ready
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const canvas = document.createElement('canvas');
      canvas.className = 'welcome-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      this.container.appendChild(canvas);
      requestAnimationFrame(() => this._initWelcomeCanvas(canvas));
    }

    // Floating gradient orbs (CSS)
    const orbs = createElement('div', '', { class: 'welcome-orbs', 'aria-hidden': 'true' });
    orbs.innerHTML = '<div class="welcome-orb welcome-orb--1"></div><div class="welcome-orb welcome-orb--2"></div><div class="welcome-orb welcome-orb--3"></div><div class="welcome-orb welcome-orb--4"></div>';
    this.container.appendChild(orbs);

    const config = getAuthConfig();
    const authAvailable = config.configured;

    // Hero section
    const hero = createElement('div', '', { class: 'welcome-hero' });

    const logoWrap = createElement('div', '', { class: 'welcome-logo-wrap' });
    logoWrap.innerHTML = `
      <div class="welcome-logo-glow"></div>
      <div class="welcome-logo-ring"></div>
      <svg class="welcome-logo-svg" width="80" height="80" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="url(#wlg)"/>
        <text x="18" y="23.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="18" fill="white">C</text>
        <rect x="24" y="24" width="8" height="8" rx="2" fill="#60a5fa" opacity="0.9"/>
        <rect x="26" y="26" width="4" height="1" rx="0.5" fill="white"/>
        <rect x="26" y="28" width="3" height="1" rx="0.5" fill="white" opacity="0.7"/>
        <defs><linearGradient id="wlg" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
      </svg>`;
    hero.appendChild(logoWrap);

    const title = createElement('h1', '', { class: 'welcome-title' });
    title.innerHTML = 'Welcome to <span class="welcome-title-accent">CareerCanvas</span>';
    hero.appendChild(title);

    const subtitle = createElement('p', 'Build professional resumes, CVs, and cover letters — entirely in your browser. No sign-up required.', { class: 'welcome-subtitle' });
    hero.appendChild(subtitle);

    // CTA buttons
    const cta = createElement('div', '', { class: 'welcome-cta' });

    const guestBtn = createElement('button', '', { class: 'welcome-btn welcome-btn--primary', type: 'button' });
    guestBtn.innerHTML = '<span class="welcome-btn-icon">&#10132;</span> Get Started Free';
    this.addListener(guestBtn, 'click', async () => {
      authService.continueAsGuest();
      const onboardingDone = localStorage.getItem('onboardingComplete');

      // Check if user already has documents — skip wizard
      let hasDocuments = false;
      try {
        if (window.CC?.db) {
          const docs = await window.CC.db.getAll('documents');
          hasDocuments = docs && docs.length > 0;
        }
      } catch (e) { /* ignore */ }

      if (hasDocuments) {
        localStorage.setItem('onboardingComplete', 'true');
        if (window.CC?.router) window.CC.router.navigate('/dashboard');
      } else if (!onboardingDone && window.CC?.app?.showOnboarding) {
        window.CC.app.showOnboarding();
      } else {
        if (window.CC?.router) window.CC.router.navigate('/dashboard');
      }
    });
    cta.appendChild(guestBtn);

    if (authAvailable) {
      const signInBtn = createElement('button', 'Sign In to Your Account', { class: 'welcome-btn welcome-btn--outline', type: 'button' });
      this.addListener(signInBtn, 'click', () => { if (window.CC?.router) window.CC.router.navigate('/login'); });
      cta.appendChild(signInBtn);
    }

    hero.appendChild(cta);

    // Guest & Online mode notice
    const modeNotice = createElement('div', '', { class: 'welcome-mode-notice' });
    modeNotice.innerHTML = `
      <div class="welcome-mode-card welcome-mode-card--guest">
        <div class="welcome-mode-icon">💻</div>
        <div class="welcome-mode-content">
          <strong>Guest Mode (Local Only)</strong>
          <p>All documents are saved in your browser on this device. Clearing browser data will remove them. Export regularly to keep backups.</p>
        </div>
      </div>
      <div class="welcome-mode-card welcome-mode-card--online">
        <div class="welcome-mode-icon">☁️</div>
        <div class="welcome-mode-content">
          <strong>Sign In (Coming Soon)</strong>
          <p>Create an account to access your profile across sessions. Cloud sync for documents will be available in a future update.</p>
        </div>
      </div>
    `;
    hero.appendChild(modeNotice);

    this.container.appendChild(hero);

    // Features grid
    const features = createElement('div', '', { class: 'welcome-features' });
    const featureData = [
      { icon: '🔒', title: 'Private by Design', desc: 'Your data never leaves your browser. No uploads, no tracking.' },
      { icon: '📄', title: '68+ Templates', desc: 'ATS-optimized, professional, creative, and academic templates.' },
      { icon: '⚡', title: 'Instant & Free', desc: 'No sign-up needed. Start building your resume in seconds.' },
      { icon: '🎨', title: 'Full Customization', desc: 'Themes, fonts, colors, spacing — complete design control.' },
      { icon: '🤖', title: 'JD Matcher', desc: 'Compare your resume against job descriptions locally.' },
      { icon: '📊', title: 'Skills Matrix', desc: 'Map your skills to evidence across your experience.' }
    ];

    featureData.forEach((f, i) => {
      const card = createElement('div', '', { class: 'welcome-feature-card' });
      card.style.animationDelay = `${i * 0.08}s`;
      const icon = createElement('div', f.icon, { class: 'welcome-feature-icon' });
      card.appendChild(icon);
      const t = createElement('h3', f.title, { class: 'welcome-feature-title' });
      card.appendChild(t);
      const d = createElement('p', f.desc, { class: 'welcome-feature-desc' });
      card.appendChild(d);
      this.addListener(card, 'mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2, cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -8;
        const ry = ((x - cx) / cx) * 8;
        card.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) scale(1.02)`;
        card.style.setProperty('--spot-x', x + 'px');
        card.style.setProperty('--spot-y', y + 'px');
      });
      this.addListener(card, 'mouseleave', () => {
        card.style.transform = '';
      });
      features.appendChild(card);
    });

    this.container.appendChild(features);

    // Privacy footer
    const footer = createElement('div', '', { class: 'welcome-footer' });
    footer.innerHTML = `
      <div class="welcome-privacy-badges">
        <span class="welcome-badge">&#128274; 100% Local</span>
        <span class="welcome-badge">&#10003; No Watermarks</span>
        <span class="welcome-badge">&#10003; No Paywalls</span>
        <span class="welcome-badge">&#10003; Works Offline</span>
      </div>
      <p class="welcome-footer-text">CareerCanvas documents are stored in your browser and are never uploaded unless a separate cloud-sync feature is enabled.</p>
    `;
    this.container.appendChild(footer);

    return this.container;
  }

  // ==================== LOGIN (Consolidated Split-Screen) ====================

  async renderLogin() {
    this.container = createElement('div', '', { class: 'welcome-page auth-immersive' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Sign in to CareerCanvas');

    // Canvas starfield
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const canvas = document.createElement('canvas');
      canvas.className = 'welcome-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      this.container.appendChild(canvas);
      requestAnimationFrame(() => this._initWelcomeCanvas?.(canvas));
    }

    // Floating orbs
    const orbs = createElement('div', '', { class: 'welcome-orbs', 'aria-hidden': 'true' });
    orbs.innerHTML = '<div class="welcome-orb welcome-orb--1"></div><div class="welcome-orb welcome-orb--2"></div><div class="welcome-orb welcome-orb--3"></div><div class="welcome-orb welcome-orb--4"></div>';
    this.container.appendChild(orbs);

    // ===== SPLIT SCREEN LAYOUT =====
    const splitScreen = createElement('div', '', { class: 'auth-split' });

    // ===== LEFT SIDE: Product Showcase =====
    const leftPanel = createElement('div', '', { class: 'auth-split-left' });

    // Logo + headline
    const logoWrap = createElement('div', '', { class: 'welcome-logo-wrap' });
    logoWrap.innerHTML = `
      <div class="welcome-logo-glow"></div>
      <div class="welcome-logo-ring"></div>
      <svg class="welcome-logo-svg" width="56" height="56" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="url(#wlg3)"/>
        <text x="18" y="23.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="18" fill="white">C</text>
        <rect x="24" y="24" width="8" height="8" rx="2" fill="#60a5fa" opacity="0.9"/>
        <rect x="26" y="26" width="4" height="1" rx="0.5" fill="white"/>
        <rect x="26" y="28" width="3" height="1" rx="0.5" fill="white" opacity="0.7"/>
        <defs><linearGradient id="wlg3" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
      </svg>`;
    leftPanel.appendChild(logoWrap);

    const headline = createElement('h1', '', { class: 'auth-split-headline' });
    headline.innerHTML = 'Build Resumes Smarter with <span class="welcome-title-accent">CareerCanvas</span>';
    leftPanel.appendChild(headline);

    const tagline = createElement('p', 'AI-powered resume builder with 68+ templates. Free, private, no sign-up required.', { class: 'auth-split-tagline' });
    leftPanel.appendChild(tagline);

    // Feature highlights — compact cards
    const featureData = [
      { icon: '🔒', title: 'Private by Design', desc: 'Your data never leaves your browser' },
      { icon: '📄', title: '68+ Templates', desc: 'ATS-optimized, professional, creative' },
      { icon: '🤖', title: 'AI-Powered', desc: 'Smart formatting, JD matching, skills analysis' },
      { icon: '⚡', title: 'Instant & Free', desc: 'No sign-up needed, works offline' }
    ];

    const featureGrid = createElement('div', '', { class: 'auth-split-features' });
    featureData.forEach((f, i) => {
      const card = createElement('div', '', { class: 'auth-split-feature' });
      card.style.animationDelay = `${0.3 + i * 0.1}s`;
      card.innerHTML = `<span class="auth-split-feature-icon">${f.icon}</span><div><strong>${f.title}</strong><span>${f.desc}</span></div>`;
      featureGrid.appendChild(card);
    });
    leftPanel.appendChild(featureGrid);

    // Stats bar
    const stats = createElement('div', '', { class: 'auth-split-stats' });
    stats.innerHTML = `
      <div class="auth-split-stat"><strong>68+</strong><span>Templates</span></div>
      <div class="auth-split-stat-divider"></div>
      <div class="auth-split-stat"><strong>100%</strong><span>Free</span></div>
      <div class="auth-split-stat-divider"></div>
      <div class="auth-split-stat"><strong>0</strong><span>Data Uploaded</span></div>
    `;
    leftPanel.appendChild(stats);

    // Privacy badges
    const badges = createElement('div', '', { class: 'auth-split-badges' });
    badges.innerHTML = '<span>&#128274; 100% Local</span><span>&#10003; No Watermarks</span><span>&#10003; No Paywalls</span><span>&#10003; Works Offline</span>';
    leftPanel.appendChild(badges);

    splitScreen.appendChild(leftPanel);

    // ===== RIGHT SIDE: Auth Panel =====
    const rightPanel = createElement('div', '', { class: 'auth-split-right' });

    const authCard = createElement('div', '', { class: 'auth-glass-card' });

    // Card header
    const cardHeader = createElement('div', '', { class: 'auth-card-header' });
    cardHeader.innerHTML = '<h2 class="auth-card-title">Welcome Back</h2><p class="auth-card-subtitle">Sign in to your CareerCanvas account</p>';
    authCard.appendChild(cardHeader);

    // Form
    const form = createElement('form', '', { class: 'auth-form', novalidate: 'true' });

    const { group: emailGroup, input: emailInput, errEl: emailErr } = this._input('login-email', 'Email', 'email', { autocomplete: 'email', required: true, placeholder: 'you@example.com' });
    form.appendChild(emailGroup);

    const { group: passGroup, input: passInput, errEl: passErr } = this._input('login-password', 'Password', 'password', { autocomplete: 'current-password', required: true, placeholder: '••••••••' });
    form.appendChild(passGroup);

    const formError = this._error('');
    formError.style.display = 'none';
    form.appendChild(formError);

    const submitBtn = createElement('button', '', { class: 'welcome-btn welcome-btn--primary', type: 'submit' });
    submitBtn.innerHTML = 'Sign In';
    form.appendChild(submitBtn);

    this.addListener(form, 'submit', async (e) => {
      e.preventDefault();
      if (this._submitting) return;
      this._setFieldError(emailErr, ''); this._setFieldError(passErr, ''); formError.style.display = 'none';

      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!email) { this._setFieldError(emailErr, 'Email is required'); emailInput.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this._setFieldError(emailErr, 'Enter a valid email'); emailInput.focus(); return; }
      if (!password) { this._setFieldError(passErr, 'Password is required'); passInput.focus(); return; }

      this._submitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      const result = await authService.signInWithPassword({ email, password });

      this._submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';

      if (result.error) {
        formError.textContent = result.error.message;
        formError.style.display = 'block';
        return;
      }

      const intended = authState.clearIntendedRoute();
      if (window.CC?.router) window.CC.router.navigate(intended || '/dashboard');
    });

    authCard.appendChild(form);
    authCard.appendChild(this._divider('or'));

    // Links
    const linkRow = createElement('div', '', { class: 'auth-glass-links' });
    const forgotLink = createElement('a', 'Forgot password?', { class: 'auth-glass-link' });
    forgotLink.setAttribute('href', '#/forgot-password');
    linkRow.appendChild(forgotLink);
    const createLink = createElement('a', 'Create account', { class: 'auth-glass-link' });
    createLink.setAttribute('href', '#/signup');
    linkRow.appendChild(createLink);
    authCard.appendChild(linkRow);

    // Guest button — with the smart onboarding flow from the landing page
    const guestBtn = createElement('button', '', { class: 'welcome-btn welcome-btn--outline auth-guest-btn', type: 'button' });
    guestBtn.innerHTML = '<span class="welcome-btn-icon">&#10132;</span> Continue as Guest';
    this.addListener(guestBtn, 'click', async () => {
      authService.continueAsGuest();
      const onboardingDone = localStorage.getItem('onboardingComplete');
      let hasDocuments = false;
      try {
        if (window.CC?.db) { const docs = await window.CC.db.getAll('documents'); hasDocuments = docs && docs.length > 0; }
      } catch (e) { /* ignore */ }
      if (hasDocuments) {
        localStorage.setItem('onboardingComplete', 'true');
        if (window.CC?.router) window.CC.router.navigate('/dashboard');
      } else if (!onboardingDone && window.CC?.app?.showOnboarding) {
        window.CC.app.showOnboarding();
      } else {
        if (window.CC?.router) window.CC.router.navigate('/dashboard');
      }
    });
    authCard.appendChild(guestBtn);

    const guestHint = createElement('div', '', { class: 'auth-guest-hint' });
    guestHint.innerHTML = '<span class="auth-guest-hint-badge">No account needed</span> <span class="auth-guest-hint-text">Free forever &bull; 68+ templates &bull; Works offline &bull; 100% private</span>';
    authCard.appendChild(guestHint);

    // Google OAuth
    const config = getAuthConfig();
    if (config.googleEnabled) {
      authCard.appendChild(this._divider());
      const gBtn = createElement('button', '', { class: 'welcome-btn welcome-btn--outline auth-google-btn', type: 'button' });
      gBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google';
      this.addListener(gBtn, 'click', () => authService.signInWithOAuth('google'));
      authCard.appendChild(gBtn);
    }

    rightPanel.appendChild(authCard);

    // Privacy note
    const privacy = createElement('div', '', { class: 'auth-glass-privacy' });
    privacy.innerHTML = '&#128274; Your data stays on this device. CareerCanvas never uploads your documents.';
    rightPanel.appendChild(privacy);

    splitScreen.appendChild(rightPanel);
    this.container.appendChild(splitScreen);

    return this.container;
  }

  // ==================== SIGNUP ====================

  async renderSignup() {
    this.container = createElement('div', '', { class: 'welcome-page auth-immersive' });
    this.container.setAttribute('role', 'main');
    this.container.setAttribute('aria-label', 'Create your CareerCanvas account');

    // Canvas starfield
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const canvas = document.createElement('canvas');
      canvas.className = 'welcome-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      this.container.appendChild(canvas);
      requestAnimationFrame(() => this._initWelcomeCanvas?.(canvas));
    }

    // Floating orbs
    const orbs = createElement('div', '', { class: 'welcome-orbs', 'aria-hidden': 'true' });
    orbs.innerHTML = '<div class="welcome-orb welcome-orb--1"></div><div class="welcome-orb welcome-orb--2"></div><div class="welcome-orb welcome-orb--3"></div>';
    this.container.appendChild(orbs);

    const hero = createElement('div', '', { class: 'welcome-hero' });

    // Logo
    const logoWrap = createElement('div', '', { class: 'welcome-logo-wrap' });
    logoWrap.innerHTML = `<div class="welcome-logo-glow"></div><div class="welcome-logo-ring"></div>
      <svg class="welcome-logo-svg" width="56" height="56" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="url(#wlgs)"/><text x="18" y="23.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="18" fill="white">C</text>
        <rect x="24" y="24" width="8" height="8" rx="2" fill="#60a5fa" opacity="0.9"/>
        <defs><linearGradient id="wlgs" x1="0" y1="0" x2="36" y2="36"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
      </svg>`;
    hero.appendChild(logoWrap);

    const title = createElement('h1', '', { class: 'welcome-title' });
    title.innerHTML = 'Create Your <span class="welcome-title-accent">Account</span>';
    title.style.fontSize = '2rem';
    hero.appendChild(title);

    const subtitle = createElement('p', 'Join CareerCanvas to manage your career profile', { class: 'welcome-subtitle' });
    subtitle.style.marginBottom = 'var(--space-5)';
    hero.appendChild(subtitle);

    // Glass card
    const card = createElement('div', '', { class: 'auth-glass-card' });
    const form = createElement('form', '', { class: 'auth-form', novalidate: 'true' });

    const { group: nameGroup, input: nameInput } = this._input('signup-name', 'Display Name', 'text', { autocomplete: 'name', maxlength: '100', placeholder: 'Your name' });
    form.appendChild(nameGroup);

    const { group: emailGroup, input: emailInput, errEl: emailErr } = this._input('signup-email', 'Email', 'email', { autocomplete: 'email', required: true, placeholder: 'you@example.com' });
    form.appendChild(emailGroup);

    const { group: passGroup, input: passInput, errEl: passErr } = this._input('signup-password', 'Password', 'password', { autocomplete: 'new-password', required: true, hint: 'At least 8 characters', placeholder: '••••••••' });
    form.appendChild(passGroup);

    const { group: confirmGroup, input: confirmInput, errEl: confirmErr } = this._input('signup-confirm', 'Confirm Password', 'password', { autocomplete: 'new-password', required: true, placeholder: '••••••••' });
    form.appendChild(confirmGroup);

    const termsGroup = createElement('div', '', { class: 'auth-checkbox-group' });
    termsGroup.style.color = '#94a3b8';
    const termsCheck = createElement('input', '', { type: 'checkbox', id: 'signup-terms', required: 'true' });
    const termsLabel = createElement('label', '', { for: 'signup-terms' });
    termsLabel.innerHTML = 'I agree to the <a href="#/terms" style="color:#818cf8">Terms</a> and <a href="#/privacy" style="color:#818cf8">Privacy Policy</a>';
    termsGroup.appendChild(termsCheck);
    termsGroup.appendChild(termsLabel);
    const termsErr = createElement('div', '', { class: 'auth-field-error', role: 'alert' });
    termsGroup.appendChild(termsErr);
    form.appendChild(termsGroup);

    const formError = this._error('');
    formError.style.display = 'none';
    form.appendChild(formError);

    const submitBtn = createElement('button', 'Create Account', { class: 'welcome-btn welcome-btn--primary', type: 'submit' });
    form.appendChild(submitBtn);

    this.addListener(form, 'submit', async (e) => {
      e.preventDefault();
      if (this._submitting) return;
      this._setFieldError(emailErr, ''); this._setFieldError(passErr, ''); this._setFieldError(confirmErr, ''); this._setFieldError(termsErr, '');
      formError.style.display = 'none';

      const email = emailInput.value.trim();
      const password = passInput.value;
      const confirm = confirmInput.value;
      const displayName = nameInput.value.trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this._setFieldError(emailErr, 'Enter a valid email'); emailInput.focus(); return; }
      if (password.length < 8) { this._setFieldError(passErr, 'At least 8 characters'); passInput.focus(); return; }
      if (password !== confirm) { this._setFieldError(confirmErr, 'Passwords do not match'); confirmInput.focus(); return; }
      if (!termsCheck.checked) { this._setFieldError(termsErr, 'Required'); return; }

      this._submitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const result = await authService.signUp({ email, password, displayName });

      this._submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';

      if (result.error) {
        formError.textContent = result.error.message;
        formError.style.display = 'block';
        return;
      }

      if (result.needsVerification) {
        localStorage.setItem('cc_verify_email', email);
        if (window.CC?.router) window.CC.router.navigate('/verify-email');
      } else {
        const intended = authState.clearIntendedRoute();
        if (window.CC?.router) window.CC.router.navigate(intended || '/dashboard');
      }
    });

    card.appendChild(form);
    card.appendChild(this._divider('or'));

    const linkRow = createElement('div', '', { class: 'auth-glass-links' });
    const loginLink = createElement('a', 'Already have an account? Sign in', { class: 'auth-glass-link' });
    loginLink.setAttribute('href', '#/login');
    linkRow.appendChild(loginLink);
    card.appendChild(linkRow);

    const guestBtn = createElement('button', 'Continue as Guest', { class: 'welcome-btn welcome-btn--outline', type: 'button', style: 'margin-top: var(--space-3)' });
    this.addListener(guestBtn, 'click', () => {
      authService.continueAsGuest();
      if (window.CC?.router) window.CC.router.navigate('/dashboard');
    });
    card.appendChild(guestBtn);

    hero.appendChild(card);

    const privacy = createElement('div', '', { class: 'auth-glass-privacy' });
    privacy.innerHTML = '🔒 Your data stays on this device. No documents are uploaded.';
    hero.appendChild(privacy);

    this.container.appendChild(hero);
    return this.container;
  }

  // ==================== VERIFY EMAIL ====================

  async renderVerifyEmail() {
    this._wrap();
    const email = localStorage.getItem('cc_verify_email') || 'your email';
    const masked = email.includes('@') ? email[0] + '***@' + email.split('@')[1] : email;

    const card = this._card('Check Your Email', `We sent a verification link to ${masked}`);

    const info = createElement('p', 'Click the link in your email to verify your account. Check your spam folder if you don\'t see it.', { class: 'auth-card-body' });
    card.appendChild(info);

    const resendBtn = this._button('Resend Verification Email', { variant: 'outline' });
    let cooldown = false;
    this.addListener(resendBtn, 'click', async () => {
      if (cooldown || this._submitting) return;
      this._submitting = true;
      this._setLoading(resendBtn, true);

      const storedEmail = localStorage.getItem('cc_verify_email');
      if (storedEmail) {
        await authService.resendVerification({ email: storedEmail });
      }

      this._submitting = false;
      resendBtn.textContent = 'Email sent! Check your inbox';
      cooldown = true;
      setTimeout(() => { resendBtn.textContent = 'Resend Verification Email'; cooldown = false; }, 30000);
    });
    card.appendChild(resendBtn);

    const links = createElement('div', '', { class: 'auth-links' });
    links.appendChild(this._link('Return to Sign In', '/login'));
    links.appendChild(this._link('Continue as Guest', '/dashboard'));
    card.appendChild(links);

    this.container.appendChild(card);
    return this.container;
  }

  // ==================== FORGOT PASSWORD ====================

  async renderForgotPassword() {
    this._wrap();
    const card = this._card('Forgot Password', 'Enter your email and we\'ll send you a reset link.');
    const form = createElement('form', '', { class: 'auth-form', novalidate: 'true' });

    const { group: emailGroup, input: emailInput, errEl: emailErr } = this._input('forgot-email', 'Email', 'email', { autocomplete: 'email', required: true });
    form.appendChild(emailGroup);

    const formSuccess = this._success('');
    formSuccess.style.display = 'none';
    form.appendChild(formSuccess);

    const submitBtn = this._button('Send Reset Link', { type: 'submit' });
    form.appendChild(submitBtn);

    this.addListener(form, 'submit', async (e) => {
      e.preventDefault();
      if (this._submitting) return;
      this._setFieldError(emailErr, '');

      const email = emailInput.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this._setFieldError(emailErr, 'Enter a valid email'); emailInput.focus(); return; }

      this._submitting = true;
      this._setLoading(submitBtn, true);

      await authService.requestPasswordReset({ email });

      this._submitting = false;
      this._setLoading(submitBtn, false);
      formSuccess.textContent = 'If an account is associated with that email, password-reset instructions will be sent.';
      formSuccess.style.display = 'block';
    });

    card.appendChild(form);

    const links = createElement('div', '', { class: 'auth-links' });
    links.appendChild(this._link('Return to Sign In', '/login'));
    card.appendChild(links);

    this.container.appendChild(card);
    return this.container;
  }

  // ==================== RESET PASSWORD ====================

  async renderResetPassword() {
    this._wrap();
    const card = this._card('Reset Password', 'Enter your new password.');
    const form = createElement('form', '', { class: 'auth-form', novalidate: 'true' });

    const { group: passGroup, input: passInput, errEl: passErr } = this._input('reset-password', 'New Password', 'password', { autocomplete: 'new-password', required: true, hint: 'At least 8 characters' });
    form.appendChild(passGroup);

    const { group: confirmGroup, input: confirmInput, errEl: confirmErr } = this._input('reset-confirm', 'Confirm New Password', 'password', { autocomplete: 'new-password', required: true });
    form.appendChild(confirmGroup);

    const formError = this._error('');
    formError.style.display = 'none';
    form.appendChild(formError);

    const submitBtn = this._button('Save New Password', { type: 'submit' });
    form.appendChild(submitBtn);

    this.addListener(form, 'submit', async (e) => {
      e.preventDefault();
      if (this._submitting) return;
      this._setFieldError(passErr, ''); this._setFieldError(confirmErr, ''); formError.style.display = 'none';

      const password = passInput.value;
      const confirm = confirmInput.value;

      if (password.length < 8) { this._setFieldError(passErr, 'Password must be at least 8 characters'); passInput.focus(); return; }
      if (password !== confirm) { this._setFieldError(confirmErr, 'Passwords do not match'); confirmInput.focus(); return; }

      this._submitting = true;
      this._setLoading(submitBtn, true);

      const result = await authService.updatePassword(password);

      this._submitting = false;
      this._setLoading(submitBtn, false);

      if (result.error) {
        formError.textContent = result.error.message;
        formError.style.display = 'block';
        return;
      }

      if (window.CC?.toast) window.CC.toast.show('Password updated successfully', 'success');
      if (window.CC?.router) window.CC.router.navigate('/dashboard');
    });

    card.appendChild(form);

    const links = createElement('div', '', { class: 'auth-links' });
    links.appendChild(this._link('Return to Sign In', '/login'));
    card.appendChild(links);

    this.container.appendChild(card);
    return this.container;
  }

  // ==================== ACCOUNT PROFILE ====================

  async renderAccountProfile() {
    this._wrap();
    this.container.setAttribute('aria-label', 'Account Profile');

    const user = authState.getUser();
    if (!user) {
      if (window.CC?.router) window.CC.router.navigate('/login');
      return this.container;
    }

    const card = this._card('Account Profile');
    const form = createElement('form', '', { class: 'auth-form', novalidate: 'true' });

    const { group: nameGroup, input: nameInput } = this._input('profile-name', 'Display Name', 'text', { autocomplete: 'name', maxlength: '100' });
    nameInput.value = user.user_metadata?.display_name || '';
    form.appendChild(nameGroup);

    const emailInfo = createElement('div', '', { class: 'auth-field' });
    emailInfo.innerHTML = `<label class="auth-label">Email</label><div class="auth-input auth-input--readonly">${user.email || ''}</div>`;
    form.appendChild(emailInfo);

    const formError = this._error('');
    formError.style.display = 'none';
    form.appendChild(formError);

    const actions = createElement('div', '', { class: 'auth-actions' });
    const saveBtn = this._button('Save Changes', { type: 'submit' });
    const cancelBtn = this._button('Cancel', { variant: 'ghost' });
    this.addListener(cancelBtn, 'click', () => { if (window.CC?.router) window.CC.router.navigate('/dashboard'); });
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    this.addListener(form, 'submit', async (e) => {
      e.preventDefault();
      if (this._submitting) return;
      formError.style.display = 'none';
      this._submitting = true;
      this._setLoading(saveBtn, true);

      const result = await authService.updateProfile({ displayName: nameInput.value });

      this._submitting = false;
      this._setLoading(saveBtn, false);

      if (result.error) {
        formError.textContent = result.error.message;
        formError.style.display = 'block';
        return;
      }
      if (window.CC?.toast) window.CC.toast.show('Profile updated', 'success');
    });

    card.appendChild(form);

    const securityLink = this._link('Account Security', '/account/security');
    securityLink.className = 'auth-link auth-link--block';
    card.appendChild(securityLink);

    this.container.appendChild(card);
    return this.container;
  }

  // ==================== ACCOUNT SECURITY ====================

  async renderAccountSecurity() {
    this._wrap();
    this.container.setAttribute('aria-label', 'Account Security');

    const user = authState.getUser();
    if (!user) {
      if (window.CC?.router) window.CC.router.navigate('/login');
      return this.container;
    }

    const card = this._card('Account Security');

    // Change password section
    const passSection = createElement('div', '', { class: 'auth-section' });
    const passTitle = createElement('h2', 'Change Password', { class: 'auth-section-title' });
    passSection.appendChild(passTitle);

    const passForm = createElement('form', '', { class: 'auth-form', novalidate: 'true' });
    const { group: newPassGroup, input: newPassInput, errEl: newPassErr } = this._input('sec-new-pass', 'New Password', 'password', { autocomplete: 'new-password', required: true, hint: 'At least 8 characters' });
    passForm.appendChild(newPassGroup);
    const { group: confirmGroup, input: confirmInput, errEl: confirmErr } = this._input('sec-confirm', 'Confirm New Password', 'password', { autocomplete: 'new-password', required: true });
    passForm.appendChild(confirmGroup);

    const passError = this._error('');
    passError.style.display = 'none';
    passForm.appendChild(passError);

    const changeBtn = this._button('Update Password', { type: 'submit' });
    passForm.appendChild(changeBtn);

    this.addListener(passForm, 'submit', async (e) => {
      e.preventDefault();
      if (this._submitting) return;
      this._setFieldError(newPassErr, ''); this._setFieldError(confirmErr, ''); passError.style.display = 'none';

      const password = newPassInput.value;
      const confirm = confirmInput.value;
      if (password.length < 8) { this._setFieldError(newPassErr, 'At least 8 characters'); return; }
      if (password !== confirm) { this._setFieldError(confirmErr, 'Passwords do not match'); return; }

      this._submitting = true;
      this._setLoading(changeBtn, true);
      const result = await authService.updatePassword(password);
      this._submitting = false;
      this._setLoading(changeBtn, false);

      if (result.error) { passError.textContent = result.error.message; passError.style.display = 'block'; return; }
      if (window.CC?.toast) window.CC.toast.show('Password updated', 'success');
      newPassInput.value = ''; confirmInput.value = '';
    });

    passSection.appendChild(passForm);
    card.appendChild(passSection);

    // Delete account section
    const deleteSection = createElement('div', '', { class: 'auth-section auth-section--danger' });
    const deleteTitle = createElement('h2', 'Delete Account', { class: 'auth-section-title' });
    deleteSection.appendChild(deleteTitle);
    const deleteInfo = createElement('p', 'This permanently deletes your account. Your local documents on this device will not be deleted unless you choose to remove them separately.', { class: 'auth-card-body' });
    deleteSection.appendChild(deleteInfo);

    const deleteBtn = this._button('Delete My Account', { variant: 'outline' });
    deleteBtn.classList.add('auth-btn--danger');

    this.addListener(deleteBtn, 'click', async () => {
      const typed = prompt('Type DELETE to confirm account deletion:');
      if (typed !== 'DELETE') return;

      this._setLoading(deleteBtn, true);
      const result = await authService.requestAccountDeletion();
      this._setLoading(deleteBtn, false);

      if (result.error) {
        if (window.CC?.toast) window.CC.toast.show(result.error.message, 'error');
        return;
      }
      if (window.CC?.toast) window.CC.toast.show('Account deleted', 'info');
      if (window.CC?.router) window.CC.router.navigate('/welcome');
    });

    deleteSection.appendChild(deleteBtn);
    card.appendChild(deleteSection);

    const links = createElement('div', '', { class: 'auth-links' });
    links.appendChild(this._link('Back to Profile', '/account/profile'));
    links.appendChild(this._link('Back to Dashboard', '/dashboard'));
    card.appendChild(links);

    this.container.appendChild(card);
    return this.container;
  }

  // ==================== AUTH CALLBACK ====================

  async renderAuthCallback() {
    this._wrap();
    const card = this._card('Processing...', 'Please wait while we complete your authentication.');

    const spinner = createElement('div', '', { class: 'auth-spinner' });
    card.appendChild(spinner);

    this.container.appendChild(card);

    const result = await authService.handleAuthCallback();

    if (result.type === 'recovery') {
      if (window.CC?.router) window.CC.router.navigate('/reset-password');
    } else if (result.session) {
      const intended = authState.clearIntendedRoute();
      if (window.CC?.toast) window.CC.toast.show('Signed in successfully', 'success');
      if (window.CC?.router) window.CC.router.navigate(intended || '/dashboard');
    } else {
      if (window.CC?.router) window.CC.router.navigate('/login');
    }

    return this.container;
  }

  // ==================== WELCOME PAGE CANVAS ====================

  _initWelcomeCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, animId, stars, comets;
    const trail = [];
    let mx = -200, my = -200, mActive = false;
    const PI2 = Math.PI * 2;

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = Math.max(window.innerHeight, canvas.parentElement?.scrollHeight || window.innerHeight); };
    const init = () => {
      const count = Math.min(300, Math.floor(w * h / 5000));
      stars = [];
      for (let i = 0; i < count; i++) {
        const d = Math.random();
        stars.push({ x: Math.random() * w, y: Math.random() * h,
          r: d < 0.85 ? 0.3 + Math.random() * 0.5 : 0.8 + Math.random() * 1.5,
          p: Math.random() * PI2, sp: 0.005 + Math.random() * 0.015,
          dy: 0.02 + d * 0.08,
          hue: d > 0.92 ? [220,260,340,200][Math.floor(Math.random()*4)] : 0,
          glow: d > 0.88 });
      }
      comets = [];
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left; my = e.clientY - rect.top; mActive = true;
      const hue = (performance.now() * 0.04) % 360;
      for (let i = 0; i < 2; i++) {
        trail.push({ x: mx + (Math.random()-0.5)*4, y: my + (Math.random()-0.5)*4,
          vx: (Math.random()-0.5)*1.2, vy: (Math.random()-0.5)*1.2 - 0.3,
          r: 1 + Math.random()*2, life: 1, decay: 0.018 + Math.random()*0.01,
          hue: hue + Math.random()*30 });
      }
    };
    const onLeave = () => { mActive = false; };
    canvas.parentElement.addEventListener('mousemove', onMove);
    canvas.parentElement.addEventListener('mouseleave', onLeave);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.016;

      // Stars
      for (const s of stars) {
        s.p += s.sp; s.y += s.dy;
        if (s.y > h + 4) { s.y = -4; s.x = Math.random() * w; }
        const a = s.glow ? 0.4 + Math.sin(s.p)*0.5 : 0.1 + Math.sin(s.p)*0.15;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, PI2);
        if (s.glow) {
          ctx.fillStyle = `hsla(${s.hue},70%,80%,${a})`;
          ctx.shadowColor = `hsla(${s.hue},80%,70%,0.4)`; ctx.shadowBlur = 6;
          ctx.fill(); ctx.shadowBlur = 0;
        } else { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill(); }
      }

      // Comets
      if (Math.random() < 0.008 && comets.length < 3) {
        const fl = Math.random() > 0.5;
        comets.push({ x: fl?-10:w+10, y: Math.random()*h*0.6,
          dx: (fl?1:-1)*(3+Math.random()*5), dy: 0.5+Math.random()*2,
          life: 1, len: 40+Math.random()*70, hue: [210,270,40][Math.floor(Math.random()*3)] });
      }
      for (let i = comets.length-1; i >= 0; i--) {
        const c = comets[i]; c.x += c.dx; c.y += c.dy; c.life -= 0.008;
        if (c.life<=0||c.x<-80||c.x>w+80||c.y>h+40) { comets.splice(i,1); continue; }
        const tx = c.x-(c.dx/Math.abs(c.dx))*c.len;
        const ty = c.y-(c.dy/Math.abs(c.dy))*c.len*0.3;
        const g = ctx.createLinearGradient(tx,ty,c.x,c.y);
        g.addColorStop(0,'transparent'); g.addColorStop(1,`hsla(${c.hue},80%,85%,${c.life*0.6})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(c.x,c.y); ctx.stroke();
        ctx.shadowColor = `hsla(${c.hue},80%,80%,0.5)`; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(c.x,c.y,2,0,PI2); ctx.fillStyle=`hsla(${c.hue},90%,92%,${c.life})`; ctx.fill(); ctx.shadowBlur=0;
      }

      // Mouse trail
      for (let i = trail.length-1; i >= 0; i--) {
        const p = trail[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.015; p.vx *= 0.98; p.life -= p.decay;
        if (p.life <= 0) { trail.splice(i,1); continue; }
        ctx.shadowColor = `hsla(${p.hue},80%,70%,${p.life*0.5})`; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, PI2);
        ctx.fillStyle = `hsla(${p.hue},75%,70%,${p.life*0.6})`; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life*0.35, 0, PI2);
        ctx.fillStyle = `hsla(${p.hue},60%,92%,${p.life*0.7})`; ctx.fill();
      }

      // Cursor glow
      if (mActive) {
        const hue = (t*40)%360;
        const g = ctx.createRadialGradient(mx,my,0,mx,my,60);
        g.addColorStop(0,`hsla(${hue},70%,65%,0.05)`); g.addColorStop(1,'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx,my,60,0,PI2); ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize(); init(); draw();
    this._welcomeCanvasCleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      canvas.parentElement?.removeEventListener('mousemove', onMove);
      canvas.parentElement?.removeEventListener('mouseleave', onLeave);
    };
    const onResize = () => { resize(); init(); };
    window.addEventListener('resize', onResize);
  }
}
