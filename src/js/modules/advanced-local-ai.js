/**
 * Advanced Local AI Module (WebLLM / WebGPU)
 * Runs a full LLM (Llama-3 8B) entirely inside the browser using WebGPU.
 * This is the "Central AI" replacement - smart enough for complex tasks
 * like cover letters, resume parsing, and grammar checks.
 */

let engine = null;
let _initPromise = null;
let _ready = false;

// Use a smaller quantized model that fits in ~4GB VRAM
const MODEL_ID = 'Llama-3.1-8B-Instruct-q4f32_1-MLC';

export class AdvancedLocalAI {

  static isWebGPUSupported() {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
  }

  static requirements() {
    return { minRAM_GB: 8, minVRAM_GB: 4, download_GB: 4.5, webgpu: true };
  }

  static isEnabled() {
    return localStorage.getItem('cc_advanced_ai_enabled') === 'true' && !!navigator.gpu;
  }

  static isReady() {
    return _ready;
  }

  static async init() {
    if (_ready && engine) return engine;
    if (_initPromise) return _initPromise;
    if (!this.isWebGPUSupported()) {
      throw new Error('WebGPU not supported in this browser. Use Chrome/Edge 113+ with WebGPU enabled, or fall back to Transformers.js summarizer / cloud AI.');
    }

    _initPromise = (async () => {
      try {
        const webllm = await import('https://esm.run/@mlc-ai/web-llm');

        const progressContainer = document.getElementById('webgpu-progress-container');
        const progressBar = document.getElementById('webgpu-progress-bar');
        const progressText = document.getElementById('webgpu-progress-text');
        const progressPct = document.getElementById('webgpu-progress-pct');

        if (progressContainer) progressContainer.style.display = 'block';

        let globalWidget = document.getElementById('ai-download-widget');
        if (!globalWidget) {
          globalWidget = document.createElement('div');
          globalWidget.id = 'ai-download-widget';
          globalWidget.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--bg-primary,#fff);border:1px solid var(--border-primary,#e2e8f0);padding:16px;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);z-index:999999;width:300px;font-family:inherit;';
          globalWidget.innerHTML = `
            <div style="font-weight:600;margin-bottom:8px;font-size:14px;color:var(--text-primary,#1a202c);">Downloading Advanced AI...</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;color:var(--text-secondary,#4a5568);">
              <span id="global-ai-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">Starting...</span>
              <span id="global-ai-pct" style="font-weight:bold;">0%</span>
            </div>
            <div style="width:100%;height:6px;background:var(--bg-tertiary,#e2e8f0);border-radius:3px;overflow:hidden;">
              <div id="global-ai-bar" style="height:100%;width:0%;background:var(--color-primary,#3b82f6);transition:width 0.2s;"></div>
            </div>`;
          document.body.appendChild(globalWidget);
        }
        globalWidget.style.display = 'block';

        const initProgressCallback = (report) => {
          const gText = document.getElementById('global-ai-text');
          const gPct = document.getElementById('global-ai-pct');
          const gBar = document.getElementById('global-ai-bar');

          if (report.progress !== undefined) {
            const pct = Math.round(report.progress * 100);
            if (progressBar) progressBar.style.width = pct + '%';
            if (progressPct) progressPct.textContent = pct + '%';
            if (gBar) gBar.style.width = pct + '%';
            if (gPct) gPct.textContent = pct + '%';
          }
          if (report.text) {
            if (progressText) progressText.textContent = report.text;
            if (gText) gText.textContent = report.text;
          }
          console.log('[WebLLM]', report.text || '', report.progress || '');
        };

        engine = await webllm.CreateMLCEngine(MODEL_ID, {
          initProgressCallback,
        });

        _ready = true;

        if (progressText) progressText.textContent = 'Model loaded and ready!';
        if (progressPct) progressPct.textContent = '100%';
        if (progressBar) progressBar.style.width = '100%';
        if (globalWidget) {
          setTimeout(() => {
            globalWidget.style.opacity = '0';
            setTimeout(() => globalWidget.style.display = 'none', 300);
          }, 2000);
        }

        const statusEl = document.getElementById('webgpu-status');
        if (statusEl) {
          statusEl.style.color = 'var(--success-color)';
          statusEl.textContent = 'WebGPU AI is loaded and ready to use offline!';
        }

        if (window.CC?.toast) {
          window.CC.toast.show('Advanced WebGPU AI (Llama-3) is ready!', 'success');
        }

        return engine;
      } catch (err) {
        _initPromise = null;
        throw err;
      }
    })();
    return _initPromise;
  }

  static async generate(systemPrompt, userPrompt, temperature = 0.7) {
    if (!this.isEnabled()) throw new Error('Advanced AI is disabled');
    const model = await this.init();
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const reply = await model.chat.completions.create({
      messages,
      temperature,
      max_tokens: 2000,
    });
    return reply.choices[0].message.content;
  }

  /**
   * Accumulate an OpenAI-style async token stream into full text.
   * Pure w.r.t. iteration (works with any async iterable of chunks) —
   * unit-tested with fake chunks so CI needs no model download.
   */
  static async collectStream(asyncChunks, onToken) {
    let full = '';
    for await (const chunk of asyncChunks) {
      const delta = chunk?.choices?.[0]?.delta?.content || '';
      if (delta) {
        full += delta;
        if (typeof onToken === 'function') {
          try { onToken(delta, full); } catch { /* never break generation */ }
        }
      }
    }
    return full;
  }

  /**
   * Streaming generation: tokens are delivered to onToken(delta, full)
   * as they arrive instead of one blocking wait. Falls back to
   * non-streaming when the engine does not support `stream: true`.
   */
  static async generateStream(systemPrompt, userPrompt, onToken, temperature = 0.7) {
    if (!this.isEnabled()) throw new Error('Advanced AI is disabled');
    const model = await this.init();
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const stream = await model.chat.completions.create({
        messages,
        temperature,
        max_tokens: 2000,
        stream: true,
      });
      // Non-streaming engines may return a plain reply object here.
      if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        return await this.collectStream(stream, onToken);
      }
      if (stream?.choices?.[0]?.message?.content) {
        const text = stream.choices[0].message.content;
        if (typeof onToken === 'function') { try { onToken(text, text); } catch { /* ignore */ } }
        return text;
      }
    } catch (err) {
      if (err && /stream/i.test(err.message || '')) {
        return await this.generate(systemPrompt, userPrompt, temperature);
      }
      throw err;
    }
    return await this.generate(systemPrompt, userPrompt, temperature);
  }

  static async process(resumeText, mode, context = '', onToken = null) {
    const aiFormatter = await import('./ai-formatter.js');
    const prompts = aiFormatter.AiFormatter.getSystemPrompts(mode, context);

    let sys = prompts.system;
    let user = resumeText;
    if (prompts.userWrapper) {
      user = prompts.userWrapper.replace('{{text}}', resumeText);
    }
    if (typeof onToken === 'function') return await this.generateStream(sys, user, onToken, 0.5);
    return await this.generate(sys, user, 0.5);
  }
}
