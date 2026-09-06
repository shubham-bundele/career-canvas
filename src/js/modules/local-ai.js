/**
 * Local AI Module
 * Loads Transformers.js dynamically from CDN to provide fully offline 
 * fallback inference for summarization and sentiment analysis.
 */

// Transformers.js is loaded dynamically to prevent blocking initial app load
let pipeline = null;
let env = null;
let _transformersLoaded = false;

// Cached instances
const instances = {
  summarization: null,
  classification: null,
  featureExtraction: null
};

// Model names
const MODELS = {
  summarization: 'Xenova/distilbart-cnn-12-6',
  'text-classification': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  'feature-extraction': 'Xenova/all-MiniLM-L6-v2'
};

export class LocalAI {
  static isEnabled() {
    return localStorage.getItem('cc_local_ai_enabled') === 'true';
  }

  static async initTransformers() {
    if (_transformersLoaded) return true;
    try {
      const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
      pipeline = transformers.pipeline;
      env = transformers.env;
      
      // Configure for browser execution
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      _transformersLoaded = true;
      return true;
    } catch (e) {
      console.error('Failed to load Transformers.js', e);
      return false;
    }
  }

  static async getPipeline(task) {
    await this.initTransformers();
    if (!instances[task]) {
      if (window.CC?.toast) {
        window.CC.toast.show(`Downloading offline model for ${task} (this may take a moment)...`, 'info');
      }
            let globalWidget = document.getElementById('transformers-download-widget');
      if (!globalWidget) {
        globalWidget = document.createElement('div');
        globalWidget.id = 'transformers-download-widget';
        globalWidget.style.cssText = 'position:fixed;bottom:20px;left:20px;background:var(--bg-primary,#fff);border:1px solid var(--border-primary,#e2e8f0);padding:16px;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);z-index:999999;width:300px;font-family:inherit;';
        globalWidget.innerHTML = `<div style="font-weight:600;margin-bottom:8px;font-size:14px;color:var(--text-primary,#1a202c);">Downloading Local AI...</div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;color:var(--text-secondary,#4a5568);"><span id="transformers-ai-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">Initializing...</span><span id="transformers-ai-pct" style="font-weight:bold;">0%</span></div><div style="width:100%;height:6px;background:var(--bg-tertiary,#e2e8f0);border-radius:3px;overflow:hidden;"><div id="transformers-ai-bar" style="height:100%;width:0%;background:var(--color-primary,#3b82f6);transition:width 0.2s;"></div></div>`;
        document.body.appendChild(globalWidget);
      }
      globalWidget.style.display = 'block';

      instances[task] = await pipeline(task, MODELS[task], {
        progress_callback: (info) => {
          if (info.status === 'progress' || info.status === 'downloading') {
            const textEl = document.getElementById('transformers-ai-text');
            const pctEl = document.getElementById('transformers-ai-pct');
            const barEl = document.getElementById('transformers-ai-bar');
            if (textEl) textEl.textContent = 'Downloading ' + (info.file || '');
            const pct = Math.round(info.progress || 0);
            if (pctEl) pctEl.textContent = pct + '%';
            if (barEl) barEl.style.width = pct + '%';
          }
        }
      });
      setTimeout(() => { if (globalWidget) globalWidget.style.display = 'none'; }, 1000);
    }
    return instances[task];
  }

  static isSupportedMode(mode) {
    return ['summary', 'condense', 'tone', 'semantic-match'].includes(mode);
  }

  /**
   * Main entrypoint for processing text offline
   */
  static async process(resumeText, mode, context) {
    if (!this.isEnabled()) {
      throw new Error("Local AI is not enabled by user.");
    }

    if (!this.isSupportedMode(mode)) {
      throw new Error(`Mode '${mode}' is not supported by Local AI.`);
    }

    if (mode === 'summary') {
      const summarizer = await this.getPipeline('summarization');
      const out = await summarizer(resumeText, {
        max_length: 60,
        min_length: 30,
      });
      return out[0].summary_text;
    }

    if (mode === 'condense') {
      const summarizer = await this.getPipeline('summarization');
      const out = await summarizer(resumeText, {
        max_length: 25,
        min_length: 10,
      });
      return out[0].summary_text;
    }

    if (mode === 'tone') {
      const classifier = await this.getPipeline('text-classification');
      const out = await classifier(resumeText);
      // It returns [{ label: "POSITIVE", score: 0.99 }]
      // Just return a message indicating the sentiment.
      return `The sentiment of this text is ${out[0].label} (Confidence: ${Math.round(out[0].score * 100)}%).`;
    }

    throw new Error('Local AI failed to process the request.');
  }

  /**
   * Generates vector embeddings for a given text
   * Used primarily by Job Matcher for semantic similarity
   */
  static async getEmbeddings(text) {
    if (!this.isEnabled()) return null;
    const extractor = await this.getPipeline('feature-extraction');
    // We use pooling:'mean' and normalize:true to get dense normalized vectors
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    return out.data; // Float32Array
  }

  /**
   * Computes Cosine Similarity between two Float32Array embeddings
   */
  static cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
