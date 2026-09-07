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

// Simple LRU in-memory session cache (per requirement)
const _lru = new Map();
const LRU_MAX = 50;
function lruGet(key) {
  if (!_lru.has(key)) return null;
  const v = _lru.get(key);
  _lru.delete(key);
  _lru.set(key, v);
  return v;
}
function lruSet(key, value) {
  if (_lru.has(key)) _lru.delete(key);
  _lru.set(key, value);
  if (_lru.size > LRU_MAX) _lru.delete(_lru.keys().next().value);
}

// IndexedDB embedding cache (per requirement)
const EMB_DB = 'cc-local-ai';
const EMB_STORE = 'embeddings';
function idbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'));
    const r = indexedDB.open(EMB_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(EMB_STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((res) => {
      const tx = db.transaction(EMB_STORE, 'readonly');
      const q = tx.objectStore(EMB_STORE).get(key);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch { return null; }
}
async function idbSet(key, value) {
  try {
    const db = await idbOpen();
    await new Promise((res) => {
      const tx = db.transaction(EMB_STORE, 'readwrite');
      tx.objectStore(EMB_STORE).put(Array.from(value), key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* ignore */ }
}

function hashKey(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'emb_' + h.toString(36);
}

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

  static preprocess(text, maxChars = 4000) {
    if (!text) return '';
    return String(text).replace(/\s+/g, ' ').trim().slice(0, maxChars);
  }

  static postprocess(text, maxLen = 2000) {
    if (!text) return '';
    let t = String(text).trim().replace(/\s+/g, ' ');
    return t.length > maxLen ? t.slice(0, maxLen) : t;
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
      const key = 'sum:' + resumeText.slice(0, 200);
      const hit = lruGet(key);
      if (hit) return hit;
      const summarizer = await this.getPipeline('summarization');
      const out = await summarizer(this.preprocess(resumeText), {
        max_length: 60,
        min_length: 30,
      });
      const result = this.postprocess(out[0].summary_text);
      lruSet(key, result);
      return result;
    }

    if (mode === 'condense') {
      const key = 'con:' + resumeText.slice(0, 200);
      const hit = lruGet(key);
      if (hit) return hit;
      const summarizer = await this.getPipeline('summarization');
      const out = await summarizer(this.preprocess(resumeText), {
        max_length: 25,
        min_length: 10,
      });
      const result = this.postprocess(out[0].summary_text, 500);
      lruSet(key, result);
      return result;
    }

    if (mode === 'tone') {
      const classifier = await this.getPipeline('text-classification');
      const out = await classifier(this.preprocess(resumeText));
      // It returns [{ label: "POSITIVE", score: 0.99 }]
      // Just return a message indicating the sentiment.
      return `The sentiment of this text is ${out[0].label} (Confidence: ${Math.round(out[0].score * 100)}%).`;
    }

    if (mode === 'semantic-match') {
      if (!context || !String(context).trim()) {
        throw new Error("semantic-match needs a job description in 'context'.");
      }
      const [resumeVec, jdVec] = await Promise.all([
        this.getEmbeddings(resumeText),
        this.getEmbeddings(context),
      ]);
      const score = Math.round(this.cosineSimilarity(resumeVec, jdVec) * 100);
      const verdict = score >= 75 ? 'Strong match' : score >= 50 ? 'Moderate match' : 'Weak match';
      return `${verdict}: semantic similarity ${score}% (offline embeddings).`;
    }

    throw new Error('Local AI failed to process the request.');
  }

  /**
   * Generates vector embeddings for a given text
   * Used primarily by Job Matcher for semantic similarity
   */
  static async getEmbeddings(text) {
    if (!this.isEnabled()) return null;
    const clean = this.preprocess(text, 2000);
    const key = hashKey(clean);
    const mem = lruGet(key);
    if (mem) return mem;
    const cached = await idbGet(key);
    if (cached) {
      const arr = Float32Array.from(cached);
      lruSet(key, arr);
      return arr;
    }
    const extractor = await this.getPipeline('feature-extraction');
    // We use pooling:'mean' and normalize:true to get dense normalized vectors
    const out = await extractor(clean, { pooling: 'mean', normalize: true });
    lruSet(key, out.data);
    await idbSet(key, out.data);
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
