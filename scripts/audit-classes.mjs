// Audit: functional CSS contracts — classes the JS depends on for
// visibility/animation/feedback must exist in CSS. Template-emitted and
// dynamically-suffixed classes are intentionally excluded (inline styles /
// runtime suffixes).
// Usage: node scripts/audit-classes.mjs
import fs from 'node:fs';
import path from 'node:path';

const cssAll = fs.readdirSync('src/css').filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join('src/css', f), 'utf8')).join('\n');

function cssHas(cls) {
  return new RegExp(`\\.${cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?![\\w-])`).test(cssAll);
}

// class -> why it matters
const CONTRACTS = {
  // toast lifecycle (toast.js toggles show/hide)
  'toast-container': 'toast root (aria-live)',
  'toast': 'toast base',
  'toast-show': 'toast enter state',
  'toast-hide': 'toast exit state',
  'toast-success': 'toast variant',
  'toast-error': 'toast variant',
  'toast-warning': 'toast variant',
  'toast-info': 'toast variant',
  // modal lifecycle (modal.js toggles show/hide)
  'modal-overlay': 'modal backdrop',
  'modal-show': 'modal enter state',
  'modal-hide': 'modal exit state',
  'modal': 'modal dialog',
  'modal-content': 'modal content',
  // keyboard a11y (app.js + base.css)
  'skip-link': 'skip to content',
  // feedback utilities
  'text-danger': 'error text (application-tracker)',
  'text-error': 'error text',
  'text-muted': 'muted text',
  // settings AI section (settings.js reuses these)
  'toggle-switch': 'settings toggles',
  'toggle-slider': 'settings toggles',
  'settings-row': 'settings layout',
  'settings-label': 'settings layout',
  'settings-desc': 'settings layout',
  'form-input': 'settings key input',
  'card': 'settings sections',
  'card-header': 'settings sections',
  'card-body': 'settings sections',
  'alert-warning': 'settings backup warning',
  // AI section containers
  'smart-format-ai-section': 'editor AI section',
  'jm-ai-section': 'job-matcher AI section',
  'jm-ai-results': 'job-matcher AI results',
  'jm-ai-desc': 'job-matcher AI description',
  // import confidence dots (import-manager.js)
  'import-confidence-dot': 'field confidence indicator',
  // skeleton loading + empty states
  'cc-skeleton': 'AI loading shimmer',
  'cc-skeleton-block': 'AI loading container',
  'jm-empty-hint': 'matcher first-run hint',
  'dashboard-btn-secondary': 'dashboard import CTA',
};

let bad = 0;
for (const [cls, why] of Object.entries(CONTRACTS)) {
  if (!cssHas(cls)) { console.log(`MISSING .${cls} — ${why}`); bad++; }
}
console.log(bad ? `FAIL (${bad} broken UI contracts)` : `OK (${Object.keys(CONTRACTS).length} UI contracts)`);
process.exit(bad ? 1 : 0);
