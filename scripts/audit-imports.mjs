// Full-functionality static audit: syntax + import/export resolution + asset links.
// Usage: node scripts/audit-imports.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const JS_ROOTS = ['src/js', 'api'];
const errors = [];
const warnings = [];
let checked = 0;

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
const files = [...walk('src/js'), ...walk('api')];

// 1. syntax
for (const f of files) {
  checked++;
  try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); }
  catch { errors.push(`SYNTAX FAIL: ${f}`); }
}

// 2. import/export resolution
function fileExports(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+function|function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const alias = t.match(/as\s+([A-Za-z_$][\w$]*)\s*$/);
      names.add(alias ? alias[1] : t.split(/\s+/)[0]);
    }
  }
  if (/export\s+default\b/.test(src)) names.add('default');
  return names;
}

const cache = new Map();
function getExports(f) {
  if (!cache.has(f)) cache.set(f, fileExports(fs.readFileSync(f, 'utf8')));
  return cache.get(f);
}

const staticRe = /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const dynRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const specs = new Set();
  for (const re of [staticRe, dynRe]) {
    let m; re.lastIndex = 0;
    while ((m = re.exec(src))) specs.add(m[1]);
  }
  for (const s of specs) {
    if (!s.startsWith('.')) continue; // skip CDN / bare imports
    const base = path.resolve(path.dirname(f), s);
    const candidates = [base, base + '.js', path.join(base, 'index.js')];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!hit) { errors.push(`MISSING IMPORT in ${f} -> '${s}'`); continue; }
  }
  // named import check (static only)
  staticRe.lastIndex = 0;
  let m;
  while ((m = staticRe.exec(src))) {
    const full = m[0];
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const brace = full.match(/import\s*\{([^}]+)\}/);
    if (!brace) continue;
    const base = path.resolve(path.dirname(f), spec);
    const candidates = [base, base + '.js', path.join(base, 'index.js')];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!hit) continue; // already reported
    const ex = getExports(hit);
    for (const part of brace[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const orig = t.split(/\s+as\s+/)[0].trim();
      if (!ex.has(orig)) errors.push(`MISSING EXPORT in ${f}: '${orig}' not exported by ${path.relative(process.cwd(), hit)}`);
    }
  }
}

// 3. index.html CSS/JS links
const html = fs.readFileSync('index.html', 'utf8');
for (const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const u = m[1];
  if (/^(https?:|data:|#)/.test(u)) continue;
  if (!fs.existsSync(u)) errors.push(`MISSING ASSET in index.html -> '${u}'`);
}

// 4. sw.js cached assets
const sw = fs.readFileSync('sw.js', 'utf8');
for (const m of sw.matchAll(/'(\.\/[^']+)'/g)) {
  const u = m[1].replace(/^\.\//, '');
  if (u === '' || u === './') continue;
  if (!fs.existsSync(u)) warnings.push(`SW lists missing file '${m[1]}'`);
}

console.log(`Checked ${checked} JS files.`);
console.log(`ERRORS (${errors.length}):`);
errors.forEach((e) => console.log('  E: ' + e));
console.log(`WARNINGS (${warnings.length}):`);
warnings.forEach((w) => console.log('  W: ' + w));
process.exit(errors.length ? 1 : 0);
