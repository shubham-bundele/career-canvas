// Route/view contract audit: every router view must resolve to an existing
// module exporting the expected class with a render() method, plus core API checks.
// Usage: node scripts/audit-contracts.mjs
import fs from 'node:fs';

const errors = [];
const warnings = [];
let checked = 0;

function hasClassWithRender(file, cls) {
  const src = fs.readFileSync(file, 'utf8');
  const okCls = new RegExp(`(export\\s+class\\s+${cls}\\b|class\\s+${cls}\\b)`).test(src);
  const okRender = /(^|\s)(async\s+)?render\s*\(/.test(src);
  return { okCls, okRender };
}

// route view -> [module file, class]
const VIEWS = {
  dashboard: ['src/js/modules/dashboard.js', 'Dashboard'],
  editor: ['src/js/modules/editor.js', 'ResumeEditor'],
  templates: ['src/js/modules/template-gallery.js', 'TemplateGallery'],
  'master-profile': ['src/js/modules/master-profile.js', 'MasterProfile'],
  applications: ['src/js/modules/application-tracker.js', 'ApplicationTracker'],
  settings: ['src/js/modules/settings.js', 'SettingsPanel'],
  'job-matcher': ['src/js/modules/job-matcher.js', 'JobMatcher'],
  'skills-matrix': ['src/js/modules/skills-matrix.js', 'SkillsMatrix'],
  'theme-studio': ['src/js/modules/theme-studio.js', 'ThemeStudio'],
  'section-studio': ['src/js/modules/section-studio.js', 'SectionStudio'],
  'pdf-studio': ['src/js/modules/pdf-studio.js', 'PdfStudio'],
  packages: ['src/js/modules/package-studio.js', 'PackageStudio'],
  timeline: ['src/js/modules/timeline-studio.js', 'TimelineStudio'],
  consistency: ['src/js/modules/consistency-studio.js', 'ConsistencyStudio'],
  'privacy-check': ['src/js/modules/privacy-studio.js', 'PrivacyStudio'],
  localization: ['src/js/modules/localization-studio.js', 'LocalizationStudio'],
  portfolio: ['src/js/modules/portfolio-studio.js', 'PortfolioStudio'],
  'links-qr': ['src/js/modules/link-qr-studio.js', 'LinkQrStudio'],
  optimizer: ['src/js/modules/space-optimizer.js', 'SpaceOptimizer'],
  'a11y-inspector': ['src/js/modules/a11y-inspector.js', 'A11yInspector'],
  versions: ['src/js/modules/version-studio.js', 'VersionStudio'],
  'data-backup': ['src/js/modules/data-studio.js', 'DataStudio'],
  'stress-lab': ['src/js/modules/stress-lab.js', 'StressLab'],
  import: ['src/js/modules/import-manager.js', 'ImportManager'],
  'static-page': ['src/js/pages/static-pages.js', 'StaticPages'],
};

// every route registered in app.js must have a contract entry
const appSrc = fs.readFileSync('src/js/app.js', 'utf8');
const routes = [...appSrc.matchAll(/this\.router\.on\('([^']+)'/g)].map((m) => m[1]);
const viewOf = (r) => {
  const esc = r.replace(/[./:]/g, (c) => '\\' + c);
  const m = appSrc.match(new RegExp(`router\\.on\\('${esc}'[\\s\\S]{0,160}?showView\\('([^']+)'`));
  return m ? m[1] : null;
};
for (const r of routes) {
  if (r.includes(':id')) continue;
  const v = viewOf(r);
  if (!v) { warnings.push(`Route '${r}' has no showView mapping found`); continue; }
  if (['welcome', 'login', 'signup', 'verify-email', 'forgot-password', 'reset-password', 'auth-callback', 'account-profile', 'account-security'].includes(v)) continue; // AuthUI (checked below)
  if (!VIEWS[v]) errors.push(`Route '${r}' -> view '${v}' has NO contract entry`);
}

for (const [view, [file, cls]] of Object.entries(VIEWS)) {
  checked++;
  if (!fs.existsSync(file)) { errors.push(`View '${view}': MISSING file ${file}`); continue; }
  const { okCls, okRender } = hasClassWithRender(file, cls);
  if (!okCls) errors.push(`View '${view}': class ${cls} NOT FOUND in ${file}`);
  // import view renders via renderImportView(db), not render()
  if (!okRender && view !== 'import') errors.push(`View '${view}': no render() in ${file}`);
}

// AuthUI views
{
  const f = 'src/js/auth/auth-ui.js';
  const src = fs.readFileSync(f, 'utf8');
  for (const m of ['renderLanding', 'renderLogin', 'renderSignup', 'renderVerifyEmail', 'renderForgotPassword', 'renderResetPassword', 'renderAuthCallback', 'renderAccountProfile', 'renderAccountSecurity']) {
    checked++;
    if (!src.includes(m)) errors.push(`AuthUI: MISSING method ${m}`);
  }
}

// Core API contracts used across the app
const CORE = [
  ['src/js/core/db.js', ['open', 'put', 'get', 'delete', 'getAll']],
  ['src/js/core/router.js', ['on', 'start', 'navigate', 'getCurrentRoute', 'setDefault', 'setGuard']],
  ['src/js/core/state.js', ['StateManager']],
  ['src/js/core/events.js', ['EventBus']],
  ['src/js/core/schema.js', ['createEmptyDocument', 'validateDocument']],
  ['src/js/core/template-engine.js', ['TemplateEngine']],
  ['src/js/core/theme-engine.js', ['ThemeEngine']],
  ['src/js/modules/toast.js', ['Toast']],
  ['src/js/modules/modal.js', ['Modal']],
  ['src/js/modules/export-manager.js', ['ExportManager']],
  ['src/js/modules/import-manager.js', ['ImportManager', 'parsePlainText', 'renderImportView']],
  ['src/js/modules/ats-checker.js', ['ATSChecker']],
  ['src/js/modules/ai-formatter.js', ['AiFormatter', 'getSystemPrompts', 'hasLocalOption']],
  ['src/js/modules/local-ai.js', ['LocalAI', 'process', 'getEmbeddings', 'cosineSimilarity']],
  ['src/js/modules/advanced-local-ai.js', ['AdvancedLocalAI', 'process', 'isWebGPUSupported']],
  ['src/js/modules/editor.js', ['handleExport']],
  ['src/js/utils/text-parse.js', ['levenshtein', 'matchHeaderFuzzy', 'correctWord', 'correctLine', 'extractContact', 'splitSkills', 'looksLikeDateRange', 'stripMarkup', 'HEADER_CANONICAL']],
  ['src/js/modules/local-resume-parser.js', ['parseResumeLocal']],
  ['src/js/utils/proofread.js', ['proofread']],
  ['src/js/utils/bullet-score.js', ['scoreBullet', 'scoreBullets']],
  ['src/js/data/action-verbs.js', ['ACTION_VERBS', 'WEAK_STARTS', 'MATCH_VERBS', 'firstWord', 'startsWithActionVerb', 'startsWeak', 'isMatchVerb']],
  ['src/js/auth/auth-service.js', ['initializeAuth', 'continueAsGuest', 'signOut']],
  ['src/js/templates/index.js', ['registerAllTemplates']],
];
for (const [file, names] of CORE) {
  for (const n of names) {
    checked++;
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes(n)) errors.push(`Contract: '${n}' NOT FOUND in ${file}`);
  }
}

// Smart Format panel must offer a key entry (fallback when no server/local)
{
  const src = fs.readFileSync('src/js/modules/editor.js', 'utf8');
  checked++;
  if (!src.includes('smart-format-ai-key')) warnings.push('Editor Smart Format has no API key input row');
}

console.log(`Checked ${checked} contracts.`);
console.log(`ERRORS (${errors.length}):`);
errors.forEach((e) => console.log('  E: ' + e));
console.log(`WARNINGS (${warnings.length}):`);
warnings.forEach((w) => console.log('  W: ' + w));
process.exit(errors.length ? 1 : 0);
