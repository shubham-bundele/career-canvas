import { ImportManager } from './src/js/modules/import-manager.js';
const mgr = new ImportManager({});
const text = \
Pranjali Bundele
QA Automation Engineer
pranjali@example.com
(555) 123-4567

WORK EXPERIENCE
Software Engineer
Google
- Did things
- Did more things

EDUCATION
B.S. Computer Science
MIT
\;
console.log(JSON.stringify(mgr.parsePlainText(text), null, 2));
