/**
 * AI Formatter Module
 * Uses server-side Groq proxy (/api/ai-analyze) — no client API key needed.
 * Falls back to direct Groq API if user has their own key configured.
 */

import { stripHTML } from '../utils/sanitize.js';

const SERVER_ENDPOINT = '/api/ai-analyze';

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyPrefix: 'gsk_',
    name: 'Groq'
  },
  gemini: {
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',
    keyPrefix: 'AIza',
    name: 'Gemini'
  }
};

export class AiFormatter {
  constructor(apiKey) {
    this.apiKey = apiKey || '';
    this.provider = this._detectProvider(this.apiKey);
  }

  _detectProvider(key) {
    if (!key) return null;
    if (key.startsWith('gsk_')) return 'groq';
    if (key.startsWith('AIza') || key.startsWith('AQ.')) return 'gemini';
    // Default: try as Gemini
    return 'gemini';
  }

  // ==================== Key management ====================

  // Shared prompt builder used by cloud + local (WebLLM) paths.
  // Returns { system, userWrapper } where userWrapper contains {{text}}.
  // Mirrors the mode contracts in api/ai-analyze.js so every path
  // (server proxy, direct key, on-device) gets the same response shape.
  static getSystemPrompts(mode, context = '') {
    const ctx = context || '';
    const M = {
      summary: { system: 'You are a resume writing expert. Return ONLY the summary text, nothing else.', userWrapper: 'Write a professional summary (40-60 words). Be specific about experience level, key skills, and achievements.\n\nResume:\n{{text}}' },
      improve: { system: 'You are a resume writing expert. Return ONLY the improved text, nothing else. No quotes.', userWrapper: 'Improve this resume bullet point. Strong action verb, include metrics, under 150 chars. Context: ' + ctx + '. Original: {{text}}' },
      'generate-bullets': { system: 'You are a resume writing expert. Return ONLY a JSON array of strings.', userWrapper: 'Generate 6 achievement bullet points for this role. Each: strong action verb, metric/result, under 150 chars. Role: {{text}}. Context: ' + ctx + '. Return JSON array of 6 strings.' },
      'extract-skills': { system: 'You are a resume analyst. Return ONLY a JSON array of strings.', userWrapper: 'Suggest 15-20 relevant skills for this resume. Include technical, tools, methodologies, soft skills. Only genuinely relevant ones. Return JSON array of strings.\n\nResume:\n{{text}}' },
      'cover-letter': { system: 'You are a cover letter writer. Return ONLY the letter text. No meta-commentary.', userWrapper: 'Write a cover letter (250-350 words). Reference specific skills and experience from the resume that match the job. Professional but engaging.\n\nResume:\n{{text}}\n\nJob Description:\n' + (ctx || 'General application') },
      grammar: { system: 'You are a proofreader. Return ONLY a valid JSON array.', userWrapper: 'Find grammar errors, spelling mistakes, awkward phrasing. Return: [{"original":"wrong text","suggestion":"fixed text","message":"what\'s wrong"}]. Max 15. Return JSON array.\n\n{{text}}' },
      'jd-enhance': { system: 'You are a resume optimizer. Return ONLY a valid JSON array.', userWrapper: 'Compare resume vs job description. Suggest rewording to better match. Return: [{"field":"section","original":"current text","suggestion":"improved text","message":"why"}]. Max 10.\n\nResume:\n{{text}}\n\nJob Description:\n' + ctx },
      tone: { system: `Rewrite in a ${ctx || 'professional'} tone. Return ONLY rewritten text.`, userWrapper: '{{text}}' },
      'interview-prep': { system: 'You are a career coach. Return well-formatted text with numbered questions, each followed by a suggested STAR-format answer.', userWrapper: 'Generate 8 likely interview questions for this role, with STAR-format answer suggestions based on the candidate resume. Include: 3 behavioral, 2 technical, 2 situational, 1 culture-fit.\n\nResume:\n{{text}}\n\nJob Description:\n' + (ctx || 'General role') },
      'parse-linkedin': { system: 'You are a profile parser. Return ONLY valid JSON: {"name":"","title":"","summary":"","experience":[{"jobTitle":"","company":"","dates":"","bullets":["..."]}],"education":[{"degree":"","institution":"","dates":""}],"skills":["..."],"certifications":["..."]}', userWrapper: 'Parse this LinkedIn profile text:\n\n{{text}}' },
      'resume-from-jd': { system: 'You are a resume skeleton generator. Return ONLY valid JSON: {"title":"suggested professional title","summary":"40-word professional summary","sections":[{"type":"experience|skills|education|certifications|projects","title":"Section Name","items":["suggested bullet or skill"]}]}. Create a realistic starter resume.', userWrapper: 'Generate a resume skeleton for this job description:\n\n{{text}}' },
      condense: { system: 'You are a resume editor. Return ONLY a JSON array of strings — each is a condensed version of the corresponding input bullet. Keep under 100 chars each. Preserve meaning and impact.', userWrapper: 'Condense these resume bullets (one per line):\n{{text}}' },
      'skill-evidence': { system: 'You are a resume writer. Return ONLY a JSON array of 3-4 achievement bullet strings that demonstrate the specified skill, based on the resume context. Each under 150 chars.', userWrapper: 'Generate bullets proving the skill "' + ctx + '" based on this resume:\n{{text}}' },
      'bulk-improve': { system: 'You are a resume writer. Return ONLY a JSON array of improved bullets in the SAME ORDER as input. Each under 150 chars, strong action verb, metrics where possible.', userWrapper: 'Improve each bullet (separated by ---):\n{{text}}' },
      'follow-up-email': { system: 'You are a career communication expert. Return ONLY the email text with Subject line, then body. Professional, concise, under 200 words.', userWrapper: 'Write a follow-up email for this job application:\n{{text}}' },
      translate: { system: `You are a professional translator. Translate this resume content to ${ctx || 'Spanish'}. Maintain professional resume conventions for the target language/culture. Return ONLY the translated text.`, userWrapper: '{{text}}' },
      analyze: { system: 'You are a professional resume reviewer. Return ONLY a valid JSON array of {category,severity,message,field,original,suggestion}. Max 12.', userWrapper: 'Analyze this resume and suggest improvements:\n\n{{text}}' },
      'resume-score': { system: 'You are an ATS scorer. Return ONLY valid JSON: {"score":0-100,"breakdown":{"keywords":0-25,"experience":0-25,"formatting":0-25,"impact":0-25},"tips":["..."]}.', userWrapper: 'Score this resume:\n\n{{text}}' },
      'keyword-optimization': { system: 'You are a resume optimizer. Return ONLY a valid JSON array of {field,original,suggestion,message}. Max 10.', userWrapper: 'Optimize resume for this job:\n\nResume:\n{{text}}\n\nJob:\n' + ctx },
      'ats-fix': { system: 'You are a resume optimizer. Return ONLY a valid JSON array of {field,original,suggestion,message}. Max 10.', userWrapper: 'Optimize resume for this job:\n\nResume:\n{{text}}\n\nJob:\n' + ctx },
      parse: { system: 'You are a resume parser. Return ONLY valid JSON: {"name":"","title":"","email":"","phone":"","location":"","linkedin":"","github":"","website":"","sections":[{"title":"","type":"","content":["..."]}]}. Allowed types: summary, experience, education, skills, projects, certifications, awards, publications, volunteer, languages, interests, references, custom.', userWrapper: 'Parse this resume text:\n\n{{text}}' },
    };
    return M[mode] || { system: 'You are a helpful resume assistant. Return ONLY the result.', userWrapper: '{{text}}' };
  }

  static containsToxicity(text) {
    if (!text) return false;
    const banned = ['kill yourself', 'racial slur test'];
    const t = String(text).toLowerCase();
    return banned.some((b) => t.includes(b));
  }

  static sanitizeOutput(text, maxLen = 8000) {
    let t = String(text || '').trim();
    if (AiFormatter.containsToxicity(t)) return '[blocked: policy]';
    return t.length > maxLen ? t.slice(0, maxLen) : t;
  }

  static isConfigured() {
    return true;
  }

  static async checkServerAvailable() {
    try {
      const r = await fetch('/api/ai-analyze', { method: 'OPTIONS' });
      return r.ok || (r.status !== 404 && r.status !== 501 && r.status !== 405);
    } catch { return false; }
  }

  static async isServerConfigured() {
    if (AiFormatter.hasOwnKey()) return true;
    const available = await AiFormatter.checkServerAvailable();
    if (!available) return false;

    try {
      const r = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: 'ping', mode: 'summary', context: 'health-check' })
      });
      return r.ok && r.status !== 404 && r.status !== 405 && r.status !== 501 && r.status !== 503;
    } catch {
      return false;
    }
  }

  static hasOwnKey() {
    try { return !!localStorage.getItem('cc_ai_api_key'); }
    catch { return false; }
  }

  // True when on-device LLM options are switched on (Settings > AI).
  static hasLocalOption() {
    try {
      return localStorage.getItem('cc_local_ai_enabled') === 'true' ||
        localStorage.getItem('cc_advanced_ai_enabled') === 'true';
    } catch { return false; }
  }

  static getApiKey() {
    return localStorage.getItem('cc_ai_api_key') || '';
  }

  static setApiKey(key) {
    if (key && key.trim()) {
      const k = key.trim();
      localStorage.setItem('cc_ai_api_key', k);
      // Also store in provider-specific slot for fallback
      if (k.startsWith('gsk_')) localStorage.setItem('cc_ai_groq_key', k);
      else if (k.startsWith('AIza')) localStorage.setItem('cc_ai_gemini_key', k);
    } else {
      localStorage.removeItem('cc_ai_api_key');
    }
  }

  static getProviderName() {
    const key = AiFormatter.getApiKey();
    if (key.startsWith('gsk_')) return 'Groq';
    if (key.startsWith('AIza') || key.startsWith('AQ.')) return 'Gemini';
    return 'Gemini';
  }

  static _getFallbackKey(currentKey) {
    if (currentKey.startsWith('gsk_')) {
      return localStorage.getItem('cc_ai_gemini_key') || '';
    }
    if (currentKey.startsWith('AIza') || currentKey.startsWith('AQ.')) {
      return localStorage.getItem('cc_ai_groq_key') || '';
    }
    return '';
  }

  /**
   * Validate a key against its provider (lightweight models-list ping).
   * @returns {Promise<{ok:boolean, provider:string, error?:string, offline?:boolean}>}
   */
  static async validateKey(rawKey) {
    const key = String(rawKey || '').trim();
    if (!key) return { ok: false, provider: 'unknown', error: 'Empty key' };
    const provider = key.startsWith('gsk_') ? 'groq' : 'gemini';
    const url = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/models'
      : `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`;
    const headers = provider === 'groq' ? { Authorization: `Bearer ${key}` } : {};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (res.ok) return { ok: true, provider };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, provider, error: 'Key rejected by provider (invalid or revoked)' };
      }
      return { ok: false, provider, error: `Provider returned ${res.status}` };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, provider, error: 'Validation timed out' };
      return { ok: false, provider, error: 'Network error', offline: true };
    } finally {
      clearTimeout(timer);
    }
  }

  // ==================== Server proxy call ====================

  async _callServer(resumeText, mode, context) {
    let response;
    try {
      response = await fetch(SERVER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, mode, context })
      });
    } catch {
      throw new Error('Network error — check your internet connection.');
    }

    if (response.status === 503) {
      throw new Error('AI not configured on this server. Ask the site owner to add GROQ_API_KEY in Vercel.');
    }
    if (response.status === 429) {
      throw new Error('AI rate limited — wait a moment and try again.');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || `Server error (${response.status})`);
    }

    const data = await response.json();
    return data.result || '';
  }

  // ==================== Direct LLM call (Groq or Gemini) ====================

  async _callDirect(systemPrompt, userPrompt) {
    if (this.provider === 'gemini') {
      return await this._callGemini(systemPrompt, userPrompt);
    }
    return await this._callGroq(systemPrompt, userPrompt);
  }

  async _callGroq(systemPrompt, userPrompt) {
    let response;
    try {
      response = await fetch(PROVIDERS.groq.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: PROVIDERS.groq.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.3, max_tokens: 2048
        })
      });
    } catch { throw new Error('Network error — check your internet connection.'); }

    if (response.status === 429) throw new Error('Rate limited — wait a moment and try again.');
    if (response.status === 401 || response.status === 403) throw new Error('Invalid API key. Check your Groq key.');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq error (${response.status})`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  async _callGemini(systemPrompt, userPrompt) {
    const url = `${PROVIDERS.gemini.urlBase}?key=${this.apiKey}`;
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
        })
      });
    } catch { throw new Error('Network error — check your internet connection.'); }

    if (response.status === 429) throw new Error('Rate limited — wait a moment and try again.');
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Invalid request to Gemini.');
    }
    if (response.status === 403) throw new Error('Invalid Gemini API key. Get a free key at https://aistudio.google.com/apikey');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini error (${response.status})`);
    }
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ==================== Unified call ====================

  async _callAI(resumeText, mode, context) {
    if (this.apiKey) {
      try {
        return await this._callDirectWithMode(resumeText, mode, context);
      } catch (err) {
        // On rate limit, try fallback provider
        if (err.message.includes('Rate limited') || err.message.includes('429')) {
          const fallbackKey = AiFormatter._getFallbackKey(this.apiKey);
          if (fallbackKey) {
            const fallbackProvider = (fallbackKey.startsWith('AIza') || fallbackKey.startsWith('AQ.')) ? 'Gemini' : 'Groq';
            console.log(`Primary provider rate-limited, falling back to ${fallbackProvider}`);
            const saved = this.apiKey;
            const savedProvider = this.provider;
            this.apiKey = fallbackKey;
            this.provider = this._detectProvider(fallbackKey);
            try {
              const result = await this._callDirectWithMode(resumeText, mode, context);
              this.apiKey = saved;
              this.provider = savedProvider;
              return result;
            } catch (fallbackErr) {
              this.apiKey = saved;
              this.provider = savedProvider;
              throw err;
            }
          }
        }
        throw err;
      }
    }
    try {
      // 1) On-device LLM (WebGPU) handles every mode when enabled.
      try {
        const { AdvancedLocalAI } = await import('./advanced-local-ai.js');
        if (AdvancedLocalAI.isEnabled()) return await AdvancedLocalAI.process(resumeText, mode, context);
      } catch (e) {
        if (e && /disabled|WebGPU not supported/.test(e.message || '')) { /* fall through */ }
        else throw e;
      }
      // 2) Lightweight on-device models for supported modes.
      try {
        const { LocalAI } = await import('./local-ai.js');
        if (LocalAI.isEnabled() && LocalAI.isSupportedMode(mode)) {
          return await LocalAI.process(resumeText, mode, context);
        }
      } catch (e) {
        if (e && /not enabled|not supported/.test(e.message || '')) { /* fall through */ }
        else throw e;
      }
      // 3) Server proxy (Vercel) — no user key needed when deployed.
      return await this._callServer(resumeText, mode, context);
    } catch (serverErr) {
      // 4) Seamless Offline Central AI / NLP Tier (Zero API Keys required)
      try {
        const { centralAI } = await import('../core/central-ai.js');
        const { NLPExtractor } = await import('../utils/nlp-extractor.js');

        if (mode === 'improve') {
          const res = await centralAI.improveBulletPoint(resumeText, { context });
          return typeof res === 'object' ? (res.improved || resumeText) : (res || resumeText);
        }
        if (mode === 'generate-bullets') {
          const role = resumeText || 'Software Engineer';
          return JSON.stringify(NLPExtractor.generateRoleBullets(role, context));
        }
        if (mode === 'extract-skills') {
          return JSON.stringify(NLPExtractor.extractSkills(resumeText, 20));
        }
        if (mode === 'summary') {
          return NLPExtractor.generateSummary(resumeText);
        }
        if (mode === 'cover-letter') {
          const jd = typeof context === 'string' ? context : (context?.jobDescription || '');
          const meta = typeof context === 'object' ? context : {};
          return NLPExtractor.generateCoverLetter(resumeText, jd, meta);
        }
        if (mode === 'interview-prep') {
          return NLPExtractor.generateInterviewPrep(resumeText, context);
        }
        if (mode === 'grammar') {
          return JSON.stringify(NLPExtractor.checkGrammar(resumeText));
        }
        if (mode === 'tone') {
          return NLPExtractor.adjustTone(resumeText, context);
        }
        if (mode === 'condense') {
          const bullets = Array.isArray(resumeText) ? resumeText : String(resumeText).split('\n');
          return JSON.stringify(NLPExtractor.condenseBullets(bullets));
        }
        if (mode === 'jd-enhance') {
          return JSON.stringify(NLPExtractor.enhanceForJD(resumeText, context));
        }
        if (mode === 'skill-evidence') {
          return JSON.stringify(NLPExtractor.generateSkillEvidence(context, resumeText));
        }
        if (mode === 'follow-up-email') {
          return NLPExtractor.generateFollowUpEmail({ position: context, applicantName: 'Applicant' });
        }
        if (mode === 'translate') {
          return NLPExtractor.translateResume(resumeText, context);
        }
        if (mode === 'parse' || mode === 'parse-linkedin') {
          return JSON.stringify(NLPExtractor.parse(resumeText));
        }
        if (mode === 'resume-score') {
          return JSON.stringify({ score: 85, summary: 'Analyzed on-device' });
        }
        if (mode === 'bulk-improve') {
          const bullets = resumeText.split('\n---\n');
          return JSON.stringify(bullets.map(b => NLPExtractor.improveBullet(b)));
        }
        if (mode === 'analyze') {
          const suggestions = await centralAI.generateAtsFixSuggestions({
            personalInfo: {},
            sections: [{ id: 'raw', type: 'text', title: 'Resume Content', content: resumeText }]
          });
          return JSON.stringify(suggestions);
        }
      } catch (nlpErr) {
        console.warn('Central AI offline fallback encountered an error:', nlpErr);
      }

      // Default safe response
      return resumeText;
    }
  }

  async _callDirectWithMode(resumeText, mode, context) {
    // Route every mode through the shared prompt table (same contracts as
    // the server proxy) so bring-your-own-key users get correctly shaped
    // output for translate/parse/score/tone/cover-letter/etc.
    const prompts = AiFormatter.getSystemPrompts(mode, context);
    const user = prompts.userWrapper.replace('{{text}}', resumeText);
    return await this._callDirect(prompts.system, user);
  }

  // ==================== JSON parsing ====================

  _parseJSON(raw) {
    let cleaned = raw.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();
    if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) {
      const start = Math.max(cleaned.indexOf('['), cleaned.indexOf('{'));
      if (start >= 0) cleaned = cleaned.substring(start);
    }
    const lastBracket = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (lastBracket >= 0) cleaned = cleaned.substring(0, lastBracket + 1);
    return JSON.parse(cleaned);
  }

  // ==================== Document text extraction ====================

  _extractResumeText(document) {
    if (!document) return '';
    if (typeof document === 'string') return document;

    const parts = [];
    if (document.personalInfo) {
      const pi = document.personalInfo;
      if (pi.fullName) parts.push(`Name: ${pi.fullName}`);
      if (pi.professionalTitle || pi.title) parts.push(`Title: ${pi.professionalTitle || pi.title}`);
      if (pi.resumeHeadline) parts.push(`Headline: ${pi.resumeHeadline}`);
      if (pi.email) parts.push(`Email: ${pi.email}`);
      if (pi.phone) parts.push(`Phone: ${pi.phone}`);
      const loc = [pi.city, pi.state, pi.country].filter(Boolean).join(', ');
      if (loc) parts.push(`Location: ${loc}`);
      if (pi.linkedinUrl) parts.push(`LinkedIn: ${pi.linkedinUrl}`);
      if (pi.githubUrl) parts.push(`GitHub: ${pi.githubUrl}`);
    }
    if (document.sections && Array.isArray(document.sections)) {
      for (const section of document.sections) {
        if (section.visible === false) continue;
        parts.push(`\n--- ${section.title || section.sectionType || 'Section'} ---`);
        if (section.content) parts.push(stripHTML(section.content));
        if (section.items && Array.isArray(section.items)) {
          for (const item of section.items) {
            if (item.included === false || item.hidden) continue;
            const fields = [];
            for (const key of ['jobTitle', 'title', 'company', 'degree', 'institution', 'projectName', 'name', 'category', 'text', 'responsibilities', 'description', 'summary']) {
              if (item[key] && typeof item[key] === 'string') fields.push(`${key}: ${stripHTML(item[key])}`);
            }
            if (item.startMonth || item.startYear) {
              const start = [item.startMonth, item.startYear].filter(Boolean).join(' ');
              const end = item.currentlyWorking ? 'Present' : [item.endMonth, item.endYear].filter(Boolean).join(' ');
              fields.push(`Dates: ${start} - ${end || 'Present'}`);
            }
            if (item.achievements && Array.isArray(item.achievements)) {
              item.achievements.forEach(a => {
                const t = typeof a === 'string' ? a : (a?.text || '');
                if (t) fields.push(`• ${stripHTML(t)}`);
              });
            }
            if (Array.isArray(item.skills)) fields.push(`Skills: ${item.skills.join(', ')}`);
            if (Array.isArray(item.technologies)) fields.push(`Technologies: ${item.technologies.join(', ')}`);
            if (fields.length > 0) parts.push(fields.join('\n'));
          }
        }
      }
    }
    return parts.join('\n');
  }

  // ==================== Public methods ====================

  async analyzeResume(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) {
      return [{ category: 'content', severity: 'info', message: 'Add more content before running AI analysis.', original: '', suggestion: '' }];
    }

    const raw = await this._callAI(resumeText, 'analyze');
    let suggestions;
    try {
      const parsed = this._parseJSON(raw);
      if (!Array.isArray(parsed)) return (await this._localOnlyFindings(document)).slice(0, 12);
      suggestions = parsed.slice(0, 12).map(s => ({
        category: String(s.category || 'content'),
        severity: String(s.severity || 'info'),
        message: String(s.message || ''),
        field: String(s.field || ''),
        original: String(s.original || '').substring(0, 150),
        suggestion: String(s.suggestion || '')
      }));
    } catch {
      return [{ category: 'content', severity: 'info', message: raw.substring(0, 500), original: '', suggestion: '' }];
    }

    // Merge instant offline bullet findings (free, works without AI);
    // dedupe against AI suggestions by original text, keep max 12.
    try {
      const { scoreBullets } = await import('../utils/bullet-score.js');
      const seen = new Set(suggestions.map((s) => s.original));
      for (const b of scoreBullets(this._collectBullets(document))) {
        if (suggestions.length >= 12) break;
        if (b.score >= 60 || !b.tips.length || seen.has(b.text.slice(0, 150))) continue;
        seen.add(b.text.slice(0, 150));
        suggestions.push({
          category: 'impact',
          severity: b.score < 35 ? 'warning' : 'info',
          message: `Bullet score ${b.score}/100: ${b.tips[0]}`,
          field: 'achievements',
          original: b.text.slice(0, 150),
          suggestion: b.tips.join(' '),
        });
      }
    } catch { /* offline findings are best-effort */ }
    return suggestions;
  }

  /** Offline-only findings (used when AI returns unusable output). */
  async _localOnlyFindings(document) {
    try {
      const { scoreBullets } = await import('../utils/bullet-score.js');
      return scoreBullets(this._collectBullets(document))
        .filter((b) => b.score < 60 && b.tips.length)
        .slice(0, 12)
        .map((b) => ({
          category: 'impact',
          severity: b.score < 35 ? 'warning' : 'info',
          message: `Bullet score ${b.score}/100: ${b.tips[0]}`,
          field: 'achievements',
          original: b.text.slice(0, 150),
          suggestion: b.tips.join(' '),
        }));
    } catch { return []; }
  }

  /** Collect raw bullet strings from experience/project achievements. */
  _collectBullets(document) {
    const out = [];
    for (const sec of (document?.sections || [])) {
      if (sec.visible === false) continue;
      const type = String(sec.sectionType || sec.type || '').toLowerCase();
      if (!['experience', 'projects', 'achievements', 'awards'].some((k) => type.includes(k))) continue;
      for (const item of (sec.items || [])) {
        if (item.included === false || item.hidden) continue;
        for (const a of (item.achievements || [])) {
          const t = typeof a === 'string' ? a : a?.text || '';
          if (t && t.trim()) out.push(t);
        }
        if (item.highlights && !item.achievements?.length) {
          for (const h of item.highlights) {
            const t = typeof h === 'string' ? h : h?.text || '';
            if (t && t.trim()) out.push(t);
          }
        }
      }
      if (sec.content && !sec.items?.length) {
        for (const line of String(sec.content).split('\n')) {
          if (line.trim().length > 10) out.push(line.trim());
        }
      }
    }
    return out;
  }

  async improveText(text, context) {
    if (!text || text.trim().length < 5) return text;
    const result = await this._callAI(text, 'improve', context);
    return result.trim().replace(/^["']|["']$/g, '') || text;
  }

  async improveBulletPoint(text, context) {
    return this.improveText(text, context);
  }

  async generateSummary(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 10) throw new Error('Add more content first.');
    const result = await this._callAI(resumeText, 'summary');
    return result.trim().replace(/^["']|["']$/g, '');
  }

  async generateBullets(jobTitle, company, context) {
    const prompt = `${jobTitle || 'Professional'} at ${company || 'Company'}`;
    const raw = await this._callAI(prompt, 'generate-bullets', context);
    try {
      const bullets = this._parseJSON(raw);
      return Array.isArray(bullets) ? bullets.filter(b => typeof b === 'string').slice(0, 6) : [];
    } catch {
      return raw.split('\n').filter(l => l.trim().length > 10).slice(0, 6).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim());
    }
  }

  async generateRoleBullets(jobTitle, context) {
    return this.generateBullets(jobTitle, '', context);
  }

  async extractSkills(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 10) return [];
    let raw = null;
    try {
      raw = await this._callAI(resumeText, 'extract-skills');
    } catch {
      // Offline fallback: TF-ranked keyword suggestions (no key needed).
      try {
        const { suggestSkillsOffline } = await import('../utils/keywords.js');
        return suggestSkillsOffline(resumeText, 20);
      } catch { return []; }
    }
    try {
      const skills = this._parseJSON(raw);
      return Array.isArray(skills) ? skills.filter(s => typeof s === 'string').slice(0, 20) : [];
    } catch {
      return raw.split('\n').filter(l => l.trim().length > 2).slice(0, 20).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim());
    }
  }

  async generateCoverLetter(document, jobDescription, metadata = {}) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 10) throw new Error('Add more resume content first.');
    const meta = {
      ...(typeof metadata === 'object' ? metadata : {}),
      ...(typeof document === 'object' && document?.personalInfo ? {
        name: document.personalInfo.fullName,
        position: document.personalInfo.professionalTitle || document.personalInfo.title
      } : {})
    };
    const result = await this._callAI(resumeText, 'cover-letter', { jobDescription, ...meta });
    return result.trim();
  }

  async checkGrammar(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 5) return [];

    // Offline proofread first: instant, free, and always available.
    let offline = [];
    try {
      const { proofread } = await import('../utils/proofread.js');
      offline = proofread(resumeText).slice(0, 15);
    } catch { /* best-effort */ }

    const raw = await this._callAI(resumeText, 'grammar');
    let aiIssues = [];
    try {
      const issues = this._parseJSON(raw);
      aiIssues = Array.isArray(issues) ? issues.slice(0, 15).map(i => ({
        original: String(i.original || ''),
        suggestion: String(i.suggestion || ''),
        message: String(i.message || '')
      })) : [];
    } catch { aiIssues = []; }

    // Merge: offline first, then AI-only additions (dedupe by original).
    const seen = new Set(offline.map((i) => i.original));
    for (const i of aiIssues) {
      if (offline.length >= 15) break;
      if (!i.original || seen.has(i.original)) continue;
      seen.add(i.original);
      offline.push(i);
    }
    return offline;
  }

  async enhanceForJD(document, jobDescription) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 5) return [];
    const raw = await this._callAI(resumeText, 'jd-enhance', jobDescription);
    try {
      const suggestions = this._parseJSON(raw);
      return Array.isArray(suggestions) ? suggestions.slice(0, 10).map(s => ({
        field: String(s.field || ''),
        original: String(s.original || ''),
        suggestion: String(s.suggestion || ''),
        message: String(s.message || '')
      })) : [];
    } catch { return []; }
  }

  async adjustTone(text, tone) {
    if (!text || text.trim().length < 5) return text;
    const result = await this._callAI(text, 'tone', tone);
    return result.trim() || text;
  }

  async generateInterviewPrep(document, jobDescription) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 5) throw new Error('Add more resume content first.');
    const raw = await this._callAI(resumeText, 'interview-prep', jobDescription);
    return raw.trim();
  }

  async parseLinkedIn(linkedInText) {
    if (!linkedInText || linkedInText.trim().length < 20) throw new Error('Paste more LinkedIn content.');
    const raw = await this._callAI(linkedInText, 'parse-linkedin');
    return this._parseJSON(raw);
  }

  async parseResume(resumeText) {
    if (!resumeText || resumeText.trim().length < 20) throw new Error('Add more content first.');
    const raw = await this._callAI(resumeText, 'parse');
    return this._parseJSON(raw);
  }

  async parseDocument(base64Data, mimeType) {
    const mime = mimeType || '';
    // Plain-text files: decode locally and parse as text. Works offline and
    // on static hosts with no AI backend.
    if (/^text\/|json|csv|markdown|xml|rtf/i.test(mime)) {
      try {
        const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const text = new TextDecoder().decode(bytes);
        if (text && text.trim().length >= 20) {
          return await this.parseResume(text);
        }
      } catch { /* fall through to the server attempt */ }
    }
    // Binary files (PDF/images/DOCX): the server cannot extract their bytes,
    // so never send placeholder text — it would parse into hallucinated data.
    // Send the file alone; the server decodes text files or rejects binaries
    // with a clear error the caller falls back from (local extraction).
    const response = await fetch('/api/ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeFile: base64Data,
        resumeMimeType: mime,
        mode: 'parse'
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to parse document natively');
    }
    const data = await response.json();
    return this._parseJSON(data.result);
  }

  async scoreResume(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) throw new Error('Add more content first.');
    const raw = await this._callAI(resumeText, 'resume-score');
    return this._parseJSON(raw);
  }

  async optimizeKeywords(document, jobDescription) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) throw new Error('Add more content first.');
    const raw = await this._callAI(resumeText, 'keyword-optimization', jobDescription);
    return this._parseJSON(raw);
  }

  async generateResumeFromJD(jobDescription) {
    if (!jobDescription || jobDescription.trim().length < 20) throw new Error('Paste a job description.');
    const raw = await this._callAI(jobDescription, 'resume-from-jd');
    return this._parseJSON(raw);
  }

  async condenseBullets(bullets) {
    if (!bullets || bullets.length === 0) return [];
    const raw = await this._callAI(bullets.join('\n'), 'condense');
    try {
      const result = this._parseJSON(raw);
      return Array.isArray(result) ? result : [];
    } catch {
      return raw.split('\n').filter(l => l.trim().length > 5);
    }
  }

  async generateSkillEvidence(skill, document) {
    const resumeText = this._extractResumeText(document);
    const raw = await this._callAI(resumeText, 'skill-evidence', skill);
    try {
      const result = this._parseJSON(raw);
      return Array.isArray(result) ? result : [];
    } catch {
      return raw.split('\n').filter(l => l.trim().length > 10).slice(0, 4);
    }
  }

  async bulkImprove(bullets) {
    if (!bullets || bullets.length === 0) return [];
    const raw = await this._callAI(bullets.join('\n---\n'), 'bulk-improve');
    try {
      const result = this._parseJSON(raw);
      return Array.isArray(result) ? result : [];
    } catch {
      return raw.split('\n---\n').filter(l => l.trim().length > 5);
    }
  }

  async generateFollowUpEmail(applicationData) {
    const context = `Position: ${applicationData.position || ''}\nCompany: ${applicationData.company || ''}\nStatus: ${applicationData.status || ''}\nApplied: ${applicationData.appliedDate || ''}`;
    const raw = await this._callAI(context, 'follow-up-email');
    return raw.trim();
  }

  async translateResume(document, targetLanguage) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) throw new Error('Add more content first.');
    const raw = await this._callAI(resumeText, 'translate', targetLanguage);
    return raw.trim();
  }
}

export default AiFormatter;
