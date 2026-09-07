const fs = require('fs');
const path = './src/js/modules/job-matcher.js';
let content = fs.readFileSync(path, 'utf8');

// The second one starts near line 1014: \const aiBtn = createElement('button', 'dY - AI Enhancement'\
// Let's replace ONLY that block.

let lines = content.split('\n');
let replacedSecond = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("const aiBtn = createElement('button', 'dY - AI Enhancement'")) {
        lines[i] = lines[i].replace('const aiBtn', 'const aiEnhanceBtn');
        replacedSecond = true;
    } else if (replacedSecond) {
        // Stop replacing once we hit the end of the aiSec
        if (lines[i].includes("aiSec.appendChild(aiResultsContainer);")) {
            break;
        }
        lines[i] = lines[i].replace(/\baiBtn\b/g, 'aiEnhanceBtn');
    }
}

// But wait, the FIRST button had its listener mangled by my powershell command earlier:
// \	his.addListener(aiEnhanceBtn, 'click', async () => {\
// Let's just fix the first one by replacing back to aiBtn where it says 'o" AI Deep Optimize'
let inFirstBtn = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("const aiBtn = createElement('button', 'o\" AI Deep Optimize'")) {
        inFirstBtn = true;
    } else if (inFirstBtn) {
        if (lines[i].includes("acts.appendChild(aiBtn);")) {
            inFirstBtn = false;
            break;
        }
        lines[i] = lines[i].replace(/\baiEnhanceBtn\b/g, 'aiBtn');
    }
}

fs.writeFileSync(path, lines.join('\n'));
