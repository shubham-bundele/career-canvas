export class PrintManager {
  constructor() {
    this.pageSizes = {
      a4: { width: 210, height: 297, unit: 'mm', label: 'A4 (210 × 297 mm)' },
      letter: { width: 215.9, height: 279.4, unit: 'mm', label: 'US Letter (8.5 × 11 in)' },
      legal: { width: 215.9, height: 355.6, unit: 'mm', label: 'US Legal (8.5 × 14 in)' },
      a5: { width: 148, height: 210, unit: 'mm', label: 'A5 (148 × 210 mm)' }
    };
  }

  getPageSize(sizeId) {
    return this.pageSizes[sizeId] || this.pageSizes.a4;
  }

  validateBeforePrint(documentEl, document) {
    const issues = [];

    if (!document.personalInfo || !document.personalInfo.fullName) {
      issues.push({ type: 'warning', message: 'No name set — the document header will be empty' });
    }
    if (!document.personalInfo || !document.personalInfo.email) {
      issues.push({ type: 'info', message: 'No email address provided' });
    }
    if (!document.personalInfo || !document.personalInfo.phone) {
      issues.push({ type: 'info', message: 'No phone number provided' });
    }

    const sectionsList = Array.isArray(document.sections)
      ? document.sections
      : Object.values(document.sections || {});
    const visibleSections = sectionsList.filter(s => s && s.visible !== false);
    if (visibleSections.length === 0) {
      issues.push({ type: 'error', message: 'No visible sections — the document will be nearly empty' });
    }

    visibleSections.forEach(section => {
      if (section.items && section.items.length === 0) {
        issues.push({ type: 'info', message: `Section "${section.title}" is empty` });
      }
    });

    if (documentEl) {
      const imgs = documentEl.querySelectorAll('img');
      imgs.forEach(img => {
        if (img.naturalWidth > 2000 || img.naturalHeight > 2000) {
          issues.push({ type: 'warning', message: 'Large image detected — may cause slow printing' });
        }
      });

      const allText = documentEl.textContent || '';
      const longWords = allText.match(/\S{50,}/g);
      if (longWords && longWords.length > 0) {
        issues.push({ type: 'warning', message: 'Very long unbroken strings detected — may overflow page margins' });
      }

      const links = documentEl.querySelectorAll('a[href]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
          issues.push({ type: 'info', message: `Possible broken link: ${href}` });
        }
      });
    }

    const pageSize = this.getPageSize(document.pageSize || 'a4');
    const estPages = this.estimatePageCount(documentEl, pageSize);
    issues.push({ type: 'info', message: `Estimated ${estPages} page(s) on ${pageSize.label}` });

    if (document.atsMode) {
      const design = document.designPreset || {};
      if (design.sidebarPosition && design.sidebarPosition !== 'none') {
        issues.push({ type: 'warning', message: 'ATS mode is on but a sidebar layout is active — may affect parsing' });
      }
    }

    return issues;
  }

  estimatePageCount(el, pageSize) {
    if (!el) return 1;
    const contentHeight = el.scrollHeight;
    const pageSizePx = pageSize.height * 3.7795;
    const marginPx = 40;
    const usableHeight = pageSizePx - (marginPx * 2);
    return Math.max(1, Math.ceil(contentHeight / usableHeight));
  }

  preparePrintStyles(pageSize) {
    let styleEl = document.getElementById('cc-print-page-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'cc-print-page-style';
      document.head.appendChild(styleEl);
    }

    const size = this.getPageSize(pageSize);
    styleEl.textContent = `
      @page {
        size: ${size.width}mm ${size.height}mm;
        margin: 12mm 15mm;
      }
      @media print {
        html, body {
          width: ${size.width}mm;
          margin: 0;
          padding: 0;
        }
      }
    `;
  }

  async print(documentEl, resumeDoc, options = {}) {
    const pageSize = options.pageSize || (resumeDoc && resumeDoc.pageSize) || 'a4';
    this.preparePrintStyles(pageSize);

    window.document.documentElement.classList.add('cc-printing');

    await new Promise(resolve => setTimeout(resolve, 100));

    window.print();

    await new Promise(resolve => setTimeout(resolve, 500));

    window.document.documentElement.classList.remove('cc-printing');
  }

  triggerBrowserPrint(previewEl, pageSize) {
    this.preparePrintStyles(pageSize || 'a4');
    document.documentElement.classList.add('cc-printing');

    window.print();

    setTimeout(() => {
      document.documentElement.classList.remove('cc-printing');
    }, 1000);
  }

  renderPrePrintPanel(issues) {
    const panel = document.createElement('div');
    panel.className = 'pre-print-panel';

    const title = document.createElement('h3');
    title.textContent = 'Pre-Print Check';
    title.className = 'mb-3';
    panel.appendChild(title);

    if (issues.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = 'No issues found. Ready to print.';
      msg.className = 'text-success';
      panel.appendChild(msg);
    } else {
      const list = document.createElement('ul');
      list.className = 'pre-print-issues';

      issues.forEach(issue => {
        const li = document.createElement('li');
        li.className = `pre-print-issue pre-print-issue--${issue.type}`;

        const icon = document.createElement('span');
        icon.className = 'pre-print-icon';
        icon.textContent = issue.type === 'error' ? '✗' : issue.type === 'warning' ? '!' : '✓';
        icon.setAttribute('aria-hidden', 'true');

        const msg = document.createElement('span');
        msg.textContent = issue.message;

        li.appendChild(icon);
        li.appendChild(msg);
        list.appendChild(li);
      });

      panel.appendChild(list);
    }

    const hasErrors = issues.some(i => i.type === 'error');
    const hasWarnings = issues.some(i => i.type === 'warning');

    if (hasErrors) {
      const warn = document.createElement('p');
      warn.className = 'text-error mt-3';
      warn.textContent = 'There are errors that should be fixed before printing.';
      panel.appendChild(warn);
    } else if (hasWarnings) {
      const warn = document.createElement('p');
      warn.className = 'text-warning mt-3';
      warn.textContent = 'There are warnings. You may still print, but consider reviewing them.';
      panel.appendChild(warn);
    }

    return panel;
  }

  renderPrintInstructions() {
    const div = document.createElement('div');
    div.className = 'print-instructions';
    div.innerHTML = `
      <h3 class="mb-2">Print Settings for Best Results</h3>
      <div class="print-instruction-group">
        <h4>Chrome / Edge</h4>
        <ol>
          <li>Set Margins to <strong>None</strong> or <strong>Minimum</strong></li>
          <li>Match Paper Size to your document format</li>
          <li>Enable <strong>Background graphics</strong></li>
          <li>Select <strong>Save as PDF</strong> for a digital copy</li>
        </ol>
      </div>
      <div class="print-instruction-group">
        <h4>Firefox</h4>
        <ol>
          <li>Set Margins to <strong>None</strong></li>
          <li>Check <strong>Print backgrounds</strong></li>
          <li>Match Paper Size to your document</li>
        </ol>
      </div>
      <div class="print-instruction-group">
        <h4>Safari</h4>
        <ol>
          <li>Go to File → Page Setup for paper size</li>
          <li>Enable <strong>Print backgrounds</strong></li>
          <li>Use PDF dropdown → Save as PDF</li>
        </ol>
      </div>
    `;
    return div;
  }

  destroy() {
    const styleEl = document.getElementById('cc-print-page-style');
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
  }
}
