/**
 * Theme Engine
 * Centralized application theme system.
 * Manages theme tokens, application, persistence, and system-theme detection.
 * Does NOT affect resume/document print templates.
 */

const THEME_STORAGE_KEY = 'cc_app_theme';
const THEME_CUSTOM_STORAGE_KEY = 'cc_custom_themes';
const THEME_SCHEMA_VERSION = 1;

// Required semantic tokens every theme must provide
const REQUIRED_TOKENS = [
  'bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-elevated',
  'bg-hover', 'bg-active', 'bg-overlay',
  'text-primary', 'text-secondary', 'text-muted', 'text-inverse',
  'border-primary', 'border-secondary',
  'color-primary', 'color-primary-light', 'color-primary-dark',
  'color-primary-50', 'color-primary-100',
  'color-success', 'color-warning', 'color-error', 'color-info',
  'shadow-focus'
];

// ===================== BUILT-IN THEMES =====================

const builtInThemes = [
  {
    id: 'careercanvas-light',
    name: 'CareerCanvas Light',
    description: 'Clean neutral surfaces with blue accent',
    category: 'Light',
    mode: 'light',
    builtIn: true,
    previewColors: ['#ffffff', '#f8fafc', '#1a56db', '#0f172a'],
    tokens: {
      'color-primary': '#1a56db', 'color-primary-light': '#3b82f6', 'color-primary-dark': '#1e40af',
      'color-primary-50': '#eff6ff', 'color-primary-100': '#dbeafe',
      'bg-primary': '#ffffff', 'bg-secondary': '#f8fafc', 'bg-tertiary': '#f1f5f9',
      'bg-elevated': '#ffffff', 'bg-hover': '#f1f5f9', 'bg-active': '#e2e8f0',
      'bg-overlay': 'rgba(15, 23, 42, 0.75)', 'bg-disabled': '#f1f5f9',
      'text-primary': '#0f172a', 'text-secondary': '#475569', 'text-muted': '#94a3b8',
      'text-disabled': '#cbd5e1', 'text-inverse': '#ffffff',
      'border-primary': '#e2e8f0', 'border-secondary': '#cbd5e1',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(26, 86, 219, 0.15)',
      'scrollbar-thumb': '#cbd5e1', 'scrollbar-thumb-hover': '#94a3b8',
    }
  },
  {
    id: 'midnight-professional',
    name: 'Midnight Professional',
    description: 'Dark navy surfaces with cyan accent',
    category: 'Dark',
    mode: 'dark',
    builtIn: true,
    previewColors: ['#0f172a', '#1e293b', '#38bdf8', '#f1f5f9'],
    tokens: {
      'color-primary': '#38bdf8', 'color-primary-light': '#7dd3fc', 'color-primary-dark': '#0ea5e9',
      'color-primary-50': 'rgba(56, 189, 248, 0.08)', 'color-primary-100': 'rgba(56, 189, 248, 0.15)',
      'bg-primary': '#0f172a', 'bg-secondary': '#1e293b', 'bg-tertiary': '#334155',
      'bg-elevated': '#1e293b', 'bg-hover': '#334155', 'bg-active': '#475569',
      'bg-overlay': 'rgba(0, 0, 0, 0.8)', 'bg-disabled': '#1e293b',
      'text-primary': '#f1f5f9', 'text-secondary': '#cbd5e1', 'text-muted': '#64748b',
      'text-disabled': '#475569', 'text-inverse': '#0f172a',
      'border-primary': '#334155', 'border-secondary': '#475569',
      'color-success': '#34d399', 'color-success-bg': 'rgba(5, 150, 105, 0.15)',
      'color-warning': '#fbbf24', 'color-warning-bg': 'rgba(217, 119, 6, 0.15)',
      'color-error': '#f87171', 'color-error-bg': 'rgba(220, 38, 38, 0.15)',
      'color-info': '#38bdf8', 'color-info-bg': 'rgba(2, 132, 199, 0.15)',
      'shadow-focus': '0 0 0 3px rgba(56, 189, 248, 0.25)',
      'scrollbar-thumb': '#475569', 'scrollbar-thumb-hover': '#64748b',
    }
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Cool blue-teal palette, calm appearance',
    category: 'Colorful',
    mode: 'light',
    builtIn: true,
    previewColors: ['#f0fdfa', '#ecfeff', '#0d9488', '#134e4a'],
    tokens: {
      'color-primary': '#0d9488', 'color-primary-light': '#14b8a6', 'color-primary-dark': '#0f766e',
      'color-primary-50': '#f0fdfa', 'color-primary-100': '#ccfbf1',
      'bg-primary': '#f0fdfa', 'bg-secondary': '#ecfeff', 'bg-tertiary': '#e0f2fe',
      'bg-elevated': '#ffffff', 'bg-hover': '#ccfbf1', 'bg-active': '#99f6e4',
      'bg-overlay': 'rgba(15, 23, 42, 0.6)', 'bg-disabled': '#f0fdfa',
      'text-primary': '#134e4a', 'text-secondary': '#1e3a5f', 'text-muted': '#64748b',
      'text-disabled': '#94a3b8', 'text-inverse': '#ffffff',
      'border-primary': '#99f6e4', 'border-secondary': '#5eead4',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(13, 148, 136, 0.2)',
      'scrollbar-thumb': '#5eead4', 'scrollbar-thumb-hover': '#2dd4bf',
    }
  },
  {
    id: 'emerald-focus',
    name: 'Emerald Focus',
    description: 'Green accents with professional neutrals',
    category: 'Professional',
    mode: 'light',
    builtIn: true,
    previewColors: ['#ffffff', '#f0fdf4', '#059669', '#14532d'],
    tokens: {
      'color-primary': '#059669', 'color-primary-light': '#10b981', 'color-primary-dark': '#047857',
      'color-primary-50': '#f0fdf4', 'color-primary-100': '#dcfce7',
      'bg-primary': '#ffffff', 'bg-secondary': '#f0fdf4', 'bg-tertiary': '#f1f5f9',
      'bg-elevated': '#ffffff', 'bg-hover': '#dcfce7', 'bg-active': '#bbf7d0',
      'bg-overlay': 'rgba(15, 23, 42, 0.7)', 'bg-disabled': '#f1f5f9',
      'text-primary': '#14532d', 'text-secondary': '#475569', 'text-muted': '#94a3b8',
      'text-disabled': '#cbd5e1', 'text-inverse': '#ffffff',
      'border-primary': '#d1fae5', 'border-secondary': '#a7f3d0',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(5, 150, 105, 0.2)',
      'scrollbar-thumb': '#a7f3d0', 'scrollbar-thumb-hover': '#6ee7b7',
    }
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Purple and indigo, modern professional',
    category: 'Colorful',
    mode: 'dark',
    builtIn: true,
    previewColors: ['#1e1b4b', '#312e81', '#a78bfa', '#e0e7ff'],
    tokens: {
      'color-primary': '#a78bfa', 'color-primary-light': '#c4b5fd', 'color-primary-dark': '#8b5cf6',
      'color-primary-50': 'rgba(167, 139, 250, 0.08)', 'color-primary-100': 'rgba(167, 139, 250, 0.15)',
      'bg-primary': '#1e1b4b', 'bg-secondary': '#312e81', 'bg-tertiary': '#3730a3',
      'bg-elevated': '#312e81', 'bg-hover': '#3730a3', 'bg-active': '#4338ca',
      'bg-overlay': 'rgba(0, 0, 0, 0.8)', 'bg-disabled': '#312e81',
      'text-primary': '#e0e7ff', 'text-secondary': '#c7d2fe', 'text-muted': '#818cf8',
      'text-disabled': '#4f46e5', 'text-inverse': '#1e1b4b',
      'border-primary': '#3730a3', 'border-secondary': '#4338ca',
      'color-success': '#34d399', 'color-success-bg': 'rgba(5, 150, 105, 0.15)',
      'color-warning': '#fbbf24', 'color-warning-bg': 'rgba(217, 119, 6, 0.15)',
      'color-error': '#fb7185', 'color-error-bg': 'rgba(220, 38, 38, 0.15)',
      'color-info': '#67e8f9', 'color-info-bg': 'rgba(2, 132, 199, 0.15)',
      'shadow-focus': '0 0 0 3px rgba(167, 139, 250, 0.3)',
      'scrollbar-thumb': '#4338ca', 'scrollbar-thumb-hover': '#6366f1',
    }
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    description: 'Warm coral and orange accents',
    category: 'Colorful',
    mode: 'light',
    builtIn: true,
    previewColors: ['#fff7ed', '#fff1e6', '#ea580c', '#431407'],
    tokens: {
      'color-primary': '#ea580c', 'color-primary-light': '#f97316', 'color-primary-dark': '#c2410c',
      'color-primary-50': '#fff7ed', 'color-primary-100': '#ffedd5',
      'bg-primary': '#fffbf5', 'bg-secondary': '#fff7ed', 'bg-tertiary': '#fed7aa',
      'bg-elevated': '#ffffff', 'bg-hover': '#ffedd5', 'bg-active': '#fdba74',
      'bg-overlay': 'rgba(67, 20, 7, 0.6)', 'bg-disabled': '#fff7ed',
      'text-primary': '#431407', 'text-secondary': '#78350f', 'text-muted': '#92400e',
      'text-disabled': '#c2410c', 'text-inverse': '#ffffff',
      'border-primary': '#fdba74', 'border-secondary': '#fb923c',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(234, 88, 12, 0.2)',
      'scrollbar-thumb': '#fb923c', 'scrollbar-thumb-hover': '#f97316',
    }
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    description: 'Muted rose and plum, soft and readable',
    category: 'Calm',
    mode: 'light',
    builtIn: true,
    previewColors: ['#fdf2f8', '#fce7f3', '#be185d', '#500724'],
    tokens: {
      'color-primary': '#be185d', 'color-primary-light': '#db2777', 'color-primary-dark': '#9d174d',
      'color-primary-50': '#fdf2f8', 'color-primary-100': '#fce7f3',
      'bg-primary': '#fdf2f8', 'bg-secondary': '#fce7f3', 'bg-tertiary': '#fbcfe8',
      'bg-elevated': '#ffffff', 'bg-hover': '#fce7f3', 'bg-active': '#fbcfe8',
      'bg-overlay': 'rgba(80, 7, 36, 0.6)', 'bg-disabled': '#fdf2f8',
      'text-primary': '#500724', 'text-secondary': '#831843', 'text-muted': '#9d174d',
      'text-disabled': '#f472b6', 'text-inverse': '#ffffff',
      'border-primary': '#fbcfe8', 'border-secondary': '#f9a8d4',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(190, 24, 93, 0.2)',
      'scrollbar-thumb': '#f9a8d4', 'scrollbar-thumb-hover': '#f472b6',
    }
  },
  {
    id: 'golden-sand',
    name: 'Golden Sand',
    description: 'Warm cream and amber, low-glare',
    category: 'Calm',
    mode: 'light',
    builtIn: true,
    previewColors: ['#fffbeb', '#fef3c7', '#b45309', '#451a03'],
    tokens: {
      'color-primary': '#b45309', 'color-primary-light': '#d97706', 'color-primary-dark': '#92400e',
      'color-primary-50': '#fffbeb', 'color-primary-100': '#fef3c7',
      'bg-primary': '#fffbeb', 'bg-secondary': '#fef3c7', 'bg-tertiary': '#fde68a',
      'bg-elevated': '#ffffff', 'bg-hover': '#fef3c7', 'bg-active': '#fde68a',
      'bg-overlay': 'rgba(69, 26, 3, 0.6)', 'bg-disabled': '#fffbeb',
      'text-primary': '#451a03', 'text-secondary': '#78350f', 'text-muted': '#92400e',
      'text-disabled': '#d97706', 'text-inverse': '#ffffff',
      'border-primary': '#fde68a', 'border-secondary': '#fcd34d',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(180, 83, 9, 0.2)',
      'scrollbar-thumb': '#fcd34d', 'scrollbar-thumb-hover': '#fbbf24',
    }
  },
  {
    id: 'slate-minimal',
    name: 'Slate Minimal',
    description: 'Gray and blue-gray, minimal distraction',
    category: 'Professional',
    mode: 'light',
    builtIn: true,
    previewColors: ['#f8fafc', '#f1f5f9', '#475569', '#0f172a'],
    tokens: {
      'color-primary': '#475569', 'color-primary-light': '#64748b', 'color-primary-dark': '#334155',
      'color-primary-50': '#f8fafc', 'color-primary-100': '#f1f5f9',
      'bg-primary': '#f8fafc', 'bg-secondary': '#f1f5f9', 'bg-tertiary': '#e2e8f0',
      'bg-elevated': '#ffffff', 'bg-hover': '#e2e8f0', 'bg-active': '#cbd5e1',
      'bg-overlay': 'rgba(15, 23, 42, 0.6)', 'bg-disabled': '#f1f5f9',
      'text-primary': '#0f172a', 'text-secondary': '#334155', 'text-muted': '#64748b',
      'text-disabled': '#94a3b8', 'text-inverse': '#ffffff',
      'border-primary': '#e2e8f0', 'border-secondary': '#cbd5e1',
      'color-success': '#059669', 'color-success-bg': '#d1fae5',
      'color-warning': '#d97706', 'color-warning-bg': '#fef3c7',
      'color-error': '#dc2626', 'color-error-bg': '#fee2e2',
      'color-info': '#0284c7', 'color-info-bg': '#cff4fc',
      'shadow-focus': '0 0 0 3px rgba(71, 85, 105, 0.15)',
      'scrollbar-thumb': '#cbd5e1', 'scrollbar-thumb-hover': '#94a3b8',
    }
  },
  {
    id: 'high-contrast-light',
    name: 'High Contrast Light',
    description: 'Strong contrast, clear borders, visible focus',
    category: 'High Contrast',
    mode: 'light',
    builtIn: true,
    previewColors: ['#ffffff', '#f5f5f5', '#000000', '#0000ee'],
    tokens: {
      'color-primary': '#0000ee', 'color-primary-light': '#0000ff', 'color-primary-dark': '#0000aa',
      'color-primary-50': '#eef2ff', 'color-primary-100': '#e0e7ff',
      'bg-primary': '#ffffff', 'bg-secondary': '#f5f5f5', 'bg-tertiary': '#ebebeb',
      'bg-elevated': '#ffffff', 'bg-hover': '#e0e0e0', 'bg-active': '#cccccc',
      'bg-overlay': 'rgba(0, 0, 0, 0.85)', 'bg-disabled': '#f5f5f5',
      'text-primary': '#000000', 'text-secondary': '#1a1a1a', 'text-muted': '#333333',
      'text-disabled': '#767676', 'text-inverse': '#ffffff',
      'border-primary': '#000000', 'border-secondary': '#333333',
      'color-success': '#006600', 'color-success-bg': '#e6ffe6',
      'color-warning': '#cc6600', 'color-warning-bg': '#fff5e6',
      'color-error': '#cc0000', 'color-error-bg': '#ffe6e6',
      'color-info': '#0000cc', 'color-info-bg': '#e6e6ff',
      'shadow-focus': '0 0 0 3px #0000ee',
      'scrollbar-thumb': '#666666', 'scrollbar-thumb-hover': '#333333',
    }
  },
  {
    id: 'high-contrast-dark',
    name: 'High Contrast Dark',
    description: 'Deep dark, strong light text, highly visible',
    category: 'High Contrast',
    mode: 'dark',
    builtIn: true,
    previewColors: ['#000000', '#111111', '#ffff00', '#ffffff'],
    tokens: {
      'color-primary': '#ffff00', 'color-primary-light': '#ffff66', 'color-primary-dark': '#cccc00',
      'color-primary-50': 'rgba(255, 255, 0, 0.08)', 'color-primary-100': 'rgba(255, 255, 0, 0.15)',
      'bg-primary': '#000000', 'bg-secondary': '#111111', 'bg-tertiary': '#222222',
      'bg-elevated': '#1a1a1a', 'bg-hover': '#333333', 'bg-active': '#444444',
      'bg-overlay': 'rgba(0, 0, 0, 0.95)', 'bg-disabled': '#111111',
      'text-primary': '#ffffff', 'text-secondary': '#eeeeee', 'text-muted': '#aaaaaa',
      'text-disabled': '#666666', 'text-inverse': '#000000',
      'border-primary': '#ffffff', 'border-secondary': '#cccccc',
      'color-success': '#00ff00', 'color-success-bg': 'rgba(0, 255, 0, 0.1)',
      'color-warning': '#ffff00', 'color-warning-bg': 'rgba(255, 255, 0, 0.1)',
      'color-error': '#ff4444', 'color-error-bg': 'rgba(255, 0, 0, 0.1)',
      'color-info': '#00ffff', 'color-info-bg': 'rgba(0, 255, 255, 0.1)',
      'shadow-focus': '0 0 0 3px #ffff00',
      'scrollbar-thumb': '#666666', 'scrollbar-thumb-hover': '#999999',
    }
  }
];

// ===================== THEME ENGINE =====================

export class ThemeEngine {
  constructor() {
    this.currentThemeId = null;
    this.previewThemeId = null;
    this.systemThemeListener = null;
    this.customThemes = [];
  }

  init() {
    this.loadCustomThemes();
    const savedId = localStorage.getItem(THEME_STORAGE_KEY) || 'midnight-professional';
    this.applyTheme(savedId, false);

    // System theme listener
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemThemeListener = (e) => {
        if (this.currentThemeId === 'system') {
          this.applySystemTheme();
        }
      };
      mq.addEventListener('change', this.systemThemeListener);
    }
  }

  getAllThemes() {
    return [...builtInThemes, ...this.customThemes];
  }

  getThemeById(id) {
    if (id === 'system') return { id: 'system', name: 'System', description: 'Follow operating system', category: 'System', mode: 'system', builtIn: true, previewColors: ['#fff', '#0f172a', '#3b82f6', '#f1f5f9'] };
    return this.getAllThemes().find(t => t.id === id) || null;
  }

  getBuiltInThemes() {
    return [...builtInThemes, { id: 'system', name: 'Follow System', description: 'Match your OS color scheme', category: 'System', mode: 'system', builtIn: true, previewColors: ['#fff', '#0f172a', '#3b82f6', '#f1f5f9'] }];
  }

  getCustomThemes() {
    return [...this.customThemes];
  }

  getCurrentThemeId() {
    return this.currentThemeId;
  }

  getResolvedMode() {
    if (this.currentThemeId === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const theme = this.getThemeById(this.currentThemeId);
    return theme ? theme.mode : 'light';
  }

  // Apply a theme by ID
  applyTheme(themeId, persist = true) {
    if (themeId === 'system') {
      this.currentThemeId = 'system';
      this.applySystemTheme();
      if (persist) localStorage.setItem(THEME_STORAGE_KEY, 'system');
      return true;
    }

    const theme = this.getThemeById(themeId);
    if (!theme) {
      console.warn(`Theme "${themeId}" not found, falling back to default`);
      return this.applyTheme('careercanvas-light', persist);
    }

    if (!this.validateTheme(theme)) {
      console.warn(`Theme "${themeId}" invalid, falling back to default`);
      return this.applyTheme('careercanvas-light', persist);
    }

    this.currentThemeId = themeId;
    this.applyTokens(theme);
    document.documentElement.setAttribute('data-theme', theme.mode);
    document.documentElement.setAttribute('data-theme-id', themeId);

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }

    return true;
  }

  // Preview a theme without persisting
  previewTheme(themeId) {
    if (!this.previewThemeId) {
      this.previewThemeId = this.currentThemeId;
    }
    this.applyTheme(themeId, false);
  }

  // Cancel preview, restore saved theme
  cancelPreview() {
    if (this.previewThemeId) {
      this.applyTheme(this.previewThemeId, false);
      this.previewThemeId = null;
    }
  }

  // Confirm preview as the saved theme
  confirmPreview() {
    if (this.previewThemeId) {
      localStorage.setItem(THEME_STORAGE_KEY, this.currentThemeId);
      this.previewThemeId = null;
    }
  }

  applySystemTheme() {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const fallback = isDark
      ? this.getThemeById('midnight-professional')
      : this.getThemeById('careercanvas-light');

    if (fallback) {
      this.applyTokens(fallback);
      document.documentElement.setAttribute('data-theme', fallback.mode);
      document.documentElement.setAttribute('data-theme-id', 'system');
    }
  }

  applyTokens(theme) {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(`--${key}`, value);
    }
  }

  validateTheme(theme) {
    if (!theme || !theme.tokens) return false;
    for (const token of REQUIRED_TOKENS) {
      if (!theme.tokens[token]) return false;
    }
    return true;
  }

  // Custom theme CRUD
  loadCustomThemes() {
    try {
      const data = localStorage.getItem(THEME_CUSTOM_STORAGE_KEY);
      this.customThemes = data ? JSON.parse(data) : [];
    } catch (e) {
      this.customThemes = [];
    }
  }

  saveCustomThemes() {
    try {
      localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, JSON.stringify(this.customThemes));
    } catch (e) {
      console.error('Failed to save custom themes:', e);
    }
  }

  createCustomTheme(name, baseThemeId, customTokens = {}) {
    const base = this.getThemeById(baseThemeId) || builtInThemes[0];
    const newTheme = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      schemaVersion: THEME_SCHEMA_VERSION,
      name: name || 'Custom Theme',
      description: 'Custom theme',
      category: 'Custom',
      mode: base.mode,
      builtIn: false,
      userCreated: true,
      previewColors: [
        customTokens['bg-primary'] || base.tokens['bg-primary'],
        customTokens['bg-secondary'] || base.tokens['bg-secondary'],
        customTokens['color-primary'] || base.tokens['color-primary'],
        customTokens['text-primary'] || base.tokens['text-primary'],
      ],
      tokens: { ...base.tokens, ...customTokens },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      sourceThemeId: baseThemeId
    };

    this.customThemes.push(newTheme);
    this.saveCustomThemes();
    return newTheme;
  }

  updateCustomTheme(themeId, updates) {
    const idx = this.customThemes.findIndex(t => t.id === themeId);
    if (idx === -1) return null;
    this.customThemes[idx] = { ...this.customThemes[idx], ...updates, modifiedAt: new Date().toISOString() };
    this.saveCustomThemes();
    return this.customThemes[idx];
  }

  deleteCustomTheme(themeId) {
    const idx = this.customThemes.findIndex(t => t.id === themeId);
    if (idx === -1) return false;
    this.customThemes.splice(idx, 1);
    this.saveCustomThemes();
    if (this.currentThemeId === themeId) {
      this.applyTheme('careercanvas-light');
    }
    return true;
  }

  duplicateCustomTheme(themeId) {
    const source = this.getThemeById(themeId);
    if (!source) return null;
    return this.createCustomTheme(source.name + ' (Copy)', source.id, { ...source.tokens });
  }

  // Export/Import
  exportTheme(themeId) {
    const theme = this.getThemeById(themeId);
    if (!theme) return null;
    return {
      app: 'CareerCanvas',
      schemaVersion: THEME_SCHEMA_VERSION,
      theme: { ...theme, id: theme.id }
    };
  }

  importTheme(jsonData) {
    if (!jsonData || !jsonData.theme) throw new Error('Invalid theme file');
    if (jsonData.schemaVersion !== THEME_SCHEMA_VERSION) throw new Error('Unsupported schema version');

    const theme = jsonData.theme;
    if (!theme.tokens || !theme.name) throw new Error('Missing required fields');
    if (!this.validateTheme(theme)) throw new Error('Theme missing required tokens');

    // Sanitize
    for (const [key, val] of Object.entries(theme.tokens)) {
      if (typeof val !== 'string') throw new Error(`Invalid token value for ${key}`);
      if (val.includes('url(') || val.includes('expression(') || val.includes('javascript:')) {
        throw new Error(`Unsafe value in ${key}`);
      }
      if (key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) {
        throw new Error('Unsafe property name');
      }
    }

    // Generate new ID to avoid conflicts
    theme.id = 'imported-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    theme.builtIn = false;
    theme.userCreated = true;
    theme.category = 'Custom';
    theme.createdAt = new Date().toISOString();
    theme.modifiedAt = new Date().toISOString();

    this.customThemes.push(theme);
    this.saveCustomThemes();
    return theme;
  }

  // Reset to default
  resetToDefault() {
    this.applyTheme('careercanvas-light');
  }

  destroy() {
    if (this.systemThemeListener && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.systemThemeListener);
    }
  }
}

// Flash prevention: apply theme before main JS loads
(function() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'system') {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else if (saved) {
      const darkIds = ['midnight-professional', 'royal-purple', 'high-contrast-dark'];
      document.documentElement.setAttribute('data-theme', darkIds.includes(saved) || saved.includes('dark') ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
})();
