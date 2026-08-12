/**
 * Floating Selection Toolbar
 * Appears near selected text in contenteditable areas.
 * Provides quick formatting actions.
 */

export class FloatingToolbar {
  constructor() {
    this.toolbar = null;
    this.activeEditor = null;
    this._selectionCheckTimer = null;
    this._hideTimeout = null;
    this._boundCheck = this._checkSelection.bind(this);
    this._boundKeydown = this._handleKeydown.bind(this);
    this._boundDocMousedown = this._handleDocMousedown.bind(this);
  }

  /**
   * Attaches the floating toolbar to a contenteditable element.
   * @param {HTMLElement} editorEl — the contenteditable div
   */
  attach(editorEl) {
    this.activeEditor = editorEl;

    editorEl.addEventListener('mouseup', this._boundCheck);
    editorEl.addEventListener('keyup', this._boundCheck);
    document.addEventListener('keydown', this._boundKeydown);
    document.addEventListener('mousedown', this._boundDocMousedown);
  }

  /**
   * Detaches from current editor and removes toolbar.
   */
  detach() {
    if (this.activeEditor) {
      this.activeEditor.removeEventListener('mouseup', this._boundCheck);
      this.activeEditor.removeEventListener('keyup', this._boundCheck);
    }
    document.removeEventListener('keydown', this._boundKeydown);
    document.removeEventListener('mousedown', this._boundDocMousedown);
    this.hide();
    this.activeEditor = null;
  }

  _checkSelection() {
    // Small delay to let selection settle
    clearTimeout(this._selectionCheckTimer);
    this._selectionCheckTimer = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        this.hide();
        return;
      }

      // Only show if selection is inside our editor
      const range = sel.getRangeAt(0);
      if (!this.activeEditor || !this.activeEditor.contains(range.commonAncestorContainer)) {
        this.hide();
        return;
      }

      const selectedText = sel.toString().trim();
      if (!selectedText) {
        this.hide();
        return;
      }

      this.show(range);
    }, 200);
  }

  _handleDocMousedown(e) {
    if (this.toolbar && !this.toolbar.contains(e.target) &&
        this.activeEditor && !this.activeEditor.contains(e.target)) {
      this.hide();
    }
  }

  _handleKeydown(e) {
    if (e.key === 'Escape' && this.toolbar) {
      e.preventDefault();
      this.hide();
    }
  }

  show(range) {
    if (!this.toolbar) {
      this._createToolbar();
    }

    // Position near selection
    const rect = range.getBoundingClientRect();
    const toolbarWidth = 280;
    const toolbarHeight = 36;
    const gap = 8;

    let top = rect.top - toolbarHeight - gap;
    let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);

    // Flip below if not enough room above
    if (top < 8) {
      top = rect.bottom + gap;
    }

    // Keep within viewport horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));

    this.toolbar.style.top = top + 'px';
    this.toolbar.style.left = left + 'px';
    this.toolbar.style.display = 'flex';
  }

  hide() {
    if (this.toolbar) {
      this.toolbar.style.display = 'none';
    }
  }

  _createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'floating-format-toolbar';
    this.toolbar.style.display = 'none';
    this.toolbar.setAttribute('role', 'toolbar');
    this.toolbar.setAttribute('aria-label', 'Text formatting');

    const buttons = [
      { cmd: 'bold', label: 'B', title: 'Bold', style: 'font-weight:700' },
      { cmd: 'italic', label: 'I', title: 'Italic', style: 'font-style:italic' },
      { cmd: 'underline', label: 'U', title: 'Underline', style: 'text-decoration:underline' },
      { cmd: '|' },
      { cmd: 'insertUnorderedList', label: '•', title: 'Bullet List' },
      { cmd: 'insertOrderedList', label: '1.', title: 'Numbered List' },
      { cmd: '|' },
      { cmd: 'createLink', label: '🔗', title: 'Link' },
      { cmd: 'removeFormat', label: '⊘', title: 'Clear Formatting' },
    ];

    buttons.forEach(btn => {
      if (btn.cmd === '|') {
        const sep = document.createElement('span');
        sep.className = 'floating-separator';
        this.toolbar.appendChild(sep);
        return;
      }

      const button = document.createElement('button');
      button.className = 'floating-btn';
      button.type = 'button';
      button.innerHTML = `<span style="${btn.style || ''}">${btn.label}</span>`;
      button.title = btn.title;
      button.setAttribute('aria-label', btn.title);
      button.tabIndex = -1; // don't steal focus from editor

      button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep selection
        e.stopPropagation();

        if (btn.cmd === 'createLink') {
          const url = prompt('Enter URL:', 'https://');
          if (url && url.trim() && !url.trim().toLowerCase().startsWith('javascript:')) {
            document.execCommand('createLink', false, url.trim());
          }
        } else {
          document.execCommand(btn.cmd, false, null);
        }
      });

      this.toolbar.appendChild(button);
    });

    // --- AI Rewrite button + dropdown ---
    const sep2 = document.createElement('span');
    sep2.className = 'floating-separator';
    this.toolbar.appendChild(sep2);

    const aiWrap = document.createElement('div');
    aiWrap.style.cssText = 'position:relative;display:inline-flex;';

    const aiBtn = document.createElement('button');
    aiBtn.className = 'floating-btn floating-btn--ai';
    aiBtn.type = 'button';
    aiBtn.innerHTML = '<span>✨ AI</span>';
    aiBtn.title = 'AI Rewrite';
    aiBtn.setAttribute('aria-label', 'AI Rewrite');
    aiBtn.setAttribute('aria-haspopup', 'true');
    aiBtn.setAttribute('aria-expanded', 'false');
    aiBtn.tabIndex = -1;
    aiBtn.style.cssText =
      'background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);' +
      'color:#fff;border-radius:6px;padding:2px 8px;font-weight:600;' +
      'border:none;cursor:pointer;font-size:12px;';

    const dropdown = document.createElement('div');
    dropdown.className = 'floating-ai-dropdown';
    dropdown.style.cssText =
      'display:none;position:absolute;top:100%;left:50%;' +
      'transform:translateX(-50%);margin-top:6px;' +
      'background:#1e1e2e;border:1px solid rgba(139,92,246,.4);' +
      'border-radius:8px;padding:4px 0;min-width:160px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:100001;';

    const options = [
      { label: 'Make Concise', tone: 'concise' },
      { label: 'More Impactful', tone: 'impactful' },
      { label: 'More Formal', tone: 'formal' },
      { label: 'Fix Grammar', tone: 'grammar-fix' },
    ];

    options.forEach(opt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.textContent = opt.label;
      item.style.cssText =
        'display:block;width:100%;text-align:left;padding:6px 14px;' +
        'background:none;border:none;color:#e2e8f0;font-size:13px;' +
        'cursor:pointer;white-space:nowrap;';

      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(139,92,246,.25)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'none';
      });

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._handleAiRewrite(opt.tone);
        dropdown.style.display = 'none';
        aiBtn.setAttribute('aria-expanded', 'false');
      });

      dropdown.appendChild(item);
    });

    aiBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = dropdown.style.display !== 'none';
      dropdown.style.display = isOpen ? 'none' : 'block';
      aiBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });

    aiWrap.appendChild(aiBtn);
    aiWrap.appendChild(dropdown);
    this.toolbar.appendChild(aiWrap);

    document.body.appendChild(this.toolbar);
  }

  async _handleAiRewrite(tone) {
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString() : '';
    if (!selectedText.trim()) return;

    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());
      const result = await ai.adjustTone(selectedText, tone);
      if (result) {
        document.execCommand('insertText', false, result);
      }
    } catch (err) {
      console.error('[FloatingToolbar] AI rewrite failed:', err);
    }
  }

  destroy() {
    this.detach();
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
    clearTimeout(this._selectionCheckTimer);
    clearTimeout(this._hideTimeout);
  }
}
