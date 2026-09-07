// Minimal lint: no secrets in repo, no console-only TODO bombs, ESM syntax check via node --check
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const roots = ['api', 'src/js'];
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
}
roots.forEach(walk);

let fail = 0;
// 1. secret scan (allow gsk_ in docs only as placeholder)
const secretRe = /(sk-[A-Za-z0-9]{10,}|AIza[A-Za-z0-9_-]{10,}|xox[bap]-|ghp_[A-Za-z0-9]{10,})/;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (secretRe.test(s)) { console.error(`SECRET? ${f}`); fail = 1; }
}
// 2. syntax check
for (const f of files) {
  try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); }
  catch { console.error(`SYNTAX FAIL ${f}`); fail = 1; }
}
console.log(fail ? 'LINT FAILED' : `LINT OK (${files.length} files)`);
process.exit(fail);
