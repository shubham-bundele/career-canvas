const fs = require('fs');
let content = fs.readFileSync('src/js/modules/advanced-local-ai.js', 'utf8');
content = content.replace(/const initProgressCallback = \(report\) => \{[\s\S]*?\};/, \const initProgressCallback = (report) => {
          const gText = document.getElementById('global-ai-text');
          const gPct = document.getElementById('global-ai-pct');
          const gBar = document.getElementById('global-ai-bar');

          if (report.progress !== undefined) {
            const pct = Math.round(report.progress * 100);
            if (progressBar) progressBar.style.width = \\\\%\\\;
            if (progressPct) progressPct.textContent = \\\\%\\\;
            if (gBar) gBar.style.width = \\\\%\\\;
            if (gPct) gPct.textContent = \\\\%\\\;
          }
          if (report.text) {
            if (progressText) progressText.textContent = report.text;
            if (gText) gText.textContent = report.text;
          }
          console.log('[WebLLM]', report.text || '', report.progress || '');
        };\);
fs.writeFileSync('src/js/modules/advanced-local-ai.js', content);
