// Audit: every src/css/*.css must be linked from index.html (or reported).
// Usage: node scripts/audit-css.mjs
import fs from 'node:fs';
const html = fs.readFileSync('index.html', 'utf8');
const linked = new Set([...html.matchAll(/href="(src\/css\/[^"]+)"/g)].map((m) => m[1]));
const files = fs.readdirSync('src/css').filter((f) => f.endsWith('.css'));
console.log(`css files: ${files.length}, linked: ${linked.size}`);
let missing = 0;
for (const f of files) {
  if (!linked.has(`src/css/${f}`)) { console.log(`UNLINKED: ${f}`); missing++; }
}
// also: linked files that do not exist
for (const l of linked) {
  if (!fs.existsSync(l)) { console.log(`LINKED-BUT-MISSING: ${l}`); missing++; }
}
process.exit(missing ? 1 : 0);
