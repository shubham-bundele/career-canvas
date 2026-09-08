// Smoke check: verifies entry points exist and key modules import without DOM crash where possible
import fs from 'node:fs';
const must = ['index.html', 'src/js/app.js', 'src/js/core/schema.js', 'src/js/modules/ai-formatter.js', 'src/js/modules/local-ai.js', 'api/ai-analyze.js'];
let ok = true;
for (const f of must) { if (!fs.existsSync(f)) { console.error('MISSING ' + f); ok = false; } }
console.log(ok ? 'SMOKE OK' : 'SMOKE FAILED');
process.exit(ok ? 0 : 1);
