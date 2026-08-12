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
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
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
    if (key.startsWith('AIza')) return 'gemini';
    // Default: try as Groq (OpenAI-compatible format)
    return 'groq';
  }

  // ==================== Key management ====================

  static isConfigured() {
    if (localStorage.getItem('cc_ai_api_key')) return true;
    if (typeof window !== 'undefined' && window.__CC_AUTH_CONFIG__) return true;
    return false;
  }

  static async checkServerAvailable() {
    try {
      const r = await fetch('/api/ai-analyze', { method: 'OPTIONS' });
      return r.status !== 404;
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
      return r.status !== 404 && r.status !== 405 && r.status !== 503;
    } catch {
      return false;
    }
  }

  static hasOwnKey() {
    return !!localStorage.getItem('cc_ai_api_key');
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
    if (key.startsWith('AIza')) return 'Gemini';
    return 'AI';
  }

  static _getFallbackKey(currentKey) {
    if (currentKey.startsWith('gsk_')) {
      return localStorage.getItem('cc_ai_gemini_key') || '';
    }
    if (currentKey.startsWith('AIza')) {
      return localStorage.getItem('cc_ai_groq_key') || '';
    }
    return '';
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
            const fallbackProvider = fallbackKey.startsWith('AIza') ? 'Gemini' : 'Groq';
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
      return await this._callServer(resumeText, mode, context);
    } catch (serverErr) {
      throw new Error('AI features require a free API key. Get one from: Gemini (https://aistudio.google.com/apikey) or Groq (https://console.groq.com). Paste it in Smart Format or the AI Format dialog.');
    }
  }

  async _callDirectWithMode(resumeText, mode, context) {
    let system, user;
    if (mode === 'summary') {
      system = 'You are a resume writing expert. Return ONLY the summary text, nothing else.';
      user = `Write a professional summary (40-60 words). Be specific about experience level, key skills, and achievements.\n\nResume:\n${resumeText}`;
    } else if (mode === 'improve') {
      system = 'You are a resume writing expert. Return ONLY the improved text, nothing else.';
      user = resumeText;
    } else {
      system = 'You are a professional resume reviewer. Return ONLY a valid JSON array. No markdown, no explanation.';
      user = `Analyze this resume and suggest improvements.

RULES:
1. Return a JSON array of objects
2. Each object has: category, severity, message, field, original, suggestion
3. "field" = which resume field (e.g. "jobTitle", "company", "achievements", "name", "summary", "skills")
4. "original" = the SHORT exact value of ONE field (NOT multiple fields). Under 100 characters.
5. "suggestion" = improved version of that ONE field
6. Do NOT combine multiple fields
7. Maximum 12 suggestions, most critical first

Resume:
${resumeText}`;
    }
    return await this._callDirect(system, user);
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
    const parts = [];
    if (document.personalInfo) {
      const pi = document.personalInfo;
      if (pi.fullName) parts.push(`Name: ${pi.fullName}`);
      if (pi.professionalTitle) parts.push(`Title: ${pi.professionalTitle}`);
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
            for (const key of ['jobTitle', 'company', 'degree', 'institution', 'projectName', 'name', 'category', 'text', 'responsibilities', 'description', 'summary']) {
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
    try {
      const suggestions = this._parseJSON(raw);
      if (!Array.isArray(suggestions)) return [];
      return suggestions.slice(0, 12).map(s => ({
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
  }

  async improveText(text, context) {
    if (!text || text.trim().length < 5) return text;
    const result = await this._callAI(text, 'improve', context);
    return result.trim().replace(/^["']|["']$/g, '') || text;
  }

  async generateSummary(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) throw new Error('Add more content first.');
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

  async extractSkills(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) return [];
    const raw = await this._callAI(resumeText, 'extract-skills');
    try {
      const skills = this._parseJSON(raw);
      return Array.isArray(skills) ? skills.filter(s => typeof s === 'string').slice(0, 20) : [];
    } catch {
      return raw.split('\n').filter(l => l.trim().length > 2).slice(0, 20).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim());
    }
  }

  async generateCoverLetter(document, jobDescription) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) throw new Error('Add more resume content first.');
    const result = await this._callAI(resumeText, 'cover-letter', jobDescription);
    return result.trim();
  }

  async checkGrammar(document) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) return [];
    const raw = await this._callAI(resumeText, 'grammar');
    try {
      const issues = this._parseJSON(raw);
      return Array.isArray(issues) ? issues.slice(0, 15).map(i => ({
        original: String(i.original || ''),
        suggestion: String(i.suggestion || ''),
        message: String(i.message || '')
      })) : [];
    } catch { return []; }
  }

  async enhanceForJD(document, jobDescription) {
    const resumeText = this._extractResumeText(document);
    if (resumeText.trim().length < 30) return [];
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
    if (resumeText.trim().length < 30) throw new Error('Add more resume content first.');
    const raw = await this._callAI(resumeText, 'interview-prep', jobDescription);
    return raw.trim();
  }

  async parseLinkedIn(linkedInText) {
    if (!linkedInText || linkedInText.trim().length < 20) throw new Error('Paste more LinkedIn content.');
    const raw = await this._callAI(linkedInText, 'parse-linkedin');
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
