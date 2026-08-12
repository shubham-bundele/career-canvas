/**
 * Smart Formatter Engine
 * Rule-based document formatting analyzer and fixer.
 * 100% local, no AI API needed.
 */

const SEVERITY = { ERROR: 'error', WARNING: 'warning', INFO: 'info' };

const WEAK_STARTS = [
  'responsible for','helped with','assisted in','worked on','was involved',
  'participated in','duties included','tasked with','in charge of','handled'
];

const STRONG_VERBS = [
  'achieved','architected','automated','built','championed','created','decreased',
  'delivered','designed','developed','directed','drove','engineered','established',
  'executed','expanded','generated','grew','implemented','improved','increased',
  'initiated','launched','led','managed','mentored','migrated','optimized',
  'orchestrated','pioneered','reduced','scaled','spearheaded','streamlined','transformed'
];

export class SmartFormatter {

  analyze(doc) {
    if (!doc) return { issues: [], score: 100, summary: {} };
    const issues = [];

    issues.push(...this._checkContact(doc.personalInfo));
    issues.push(...this._checkStructure(doc.sections));
    issues.push(...this._checkContent(doc.sections));
    issues.push(...this._checkDocLength(doc));

    const score = this._calcScore(issues);
    const summary = {
      total: issues.length,
      errors: issues.filter(i => i.severity === SEVERITY.ERROR).length,
      warnings: issues.filter(i => i.severity === SEVERITY.WARNING).length,
      info: issues.filter(i => i.severity === SEVERITY.INFO).length
    };

    return { issues, score, summary };
  }

  // ==================== CONTACT ====================

  _checkContact(pi) {
    const issues = [];
    if (!pi) return issues;

    if (!pi.fullName?.trim())
      issues.push({ severity: SEVERITY.ERROR, category: 'contact', message: 'Full name is missing' });
    if (!pi.email?.trim())
      issues.push({ severity: SEVERITY.WARNING, category: 'contact', message: 'Email address is missing' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pi.email.trim()))
      issues.push({ severity: SEVERITY.ERROR, category: 'contact', message: 'Email format appears invalid' });
    if (!pi.phone?.trim())
      issues.push({ severity: SEVERITY.INFO, category: 'contact', message: 'Phone number is missing' });
    if (pi.linkedinUrl && !pi.linkedinUrl.includes('linkedin.com'))
      issues.push({ severity: SEVERITY.INFO, category: 'contact', message: 'LinkedIn URL may be incorrect' });

    return issues;
  }

  // ==================== STRUCTURE ====================

  _checkStructure(sections) {
    const issues = [];
    if (!Array.isArray(sections)) return issues;

    const visible = sections.filter(s => s && s.visible !== false);
    if (visible.length === 0) {
      issues.push({ severity: SEVERITY.ERROR, category: 'structure', message: 'No visible sections found' });
      return issues;
    }

    const types = visible.map(s => s.sectionType || s.type || '');

    if (!types.some(t => ['experience', 'professionalExperience'].includes(t)))
      issues.push({ severity: SEVERITY.WARNING, category: 'structure', message: 'No Experience section found' });
    if (!types.includes('education'))
      issues.push({ severity: SEVERITY.INFO, category: 'structure', message: 'No Education section found' });
    if (!types.some(t => ['skills', 'technicalSkills', 'coreCompetencies'].includes(t)))
      issues.push({ severity: SEVERITY.INFO, category: 'structure', message: 'No Skills section — add one for ATS optimization' });

    // Empty sections
    for (const s of visible) {
      const hasContent = s.content?.trim() || (Array.isArray(s.items) && s.items.some(i => i.included !== false));
      if (!hasContent)
        issues.push({ severity: SEVERITY.WARNING, category: 'structure', message: `"${this._trunc(s.title, 30)}" section is empty` });
    }

    return issues;
  }

  // ==================== CONTENT ====================

  _checkContent(sections) {
    const issues = [];
    if (!Array.isArray(sections)) return issues;

    for (const section of sections) {
      if (!section || section.visible === false) continue;
      const type = section.sectionType || section.type || 'custom';
      const title = this._trunc(section.title, 25);

      // Summary length check
      if (['summary', 'professionalSummary', 'objective'].includes(type) && section.content) {
        const words = section.content.trim().split(/\s+/).length;
        if (words > 80)
          issues.push({ severity: SEVERITY.WARNING, category: 'content', message: `${title}: Summary is ${words} words — aim for 30-60` });
        if (words < 10 && words > 0)
          issues.push({ severity: SEVERITY.INFO, category: 'content', message: `${title}: Summary is very short (${words} words)` });
        if (/\b(I am|I'm|I have|I was)\b/i.test(section.content))
          issues.push({ severity: SEVERITY.INFO, category: 'content', message: `${title}: Consider removing first-person pronouns ("I")` });
      }

      if (!Array.isArray(section.items)) continue;
      const items = section.items.filter(i => i && i.included !== false);

      // Experience section — only check well-structured items
      if (['experience', 'professionalExperience'].includes(type)) {
        const wellStructured = items.filter(i => i.jobTitle && this._looksLikeJobTitle(i.jobTitle));
        const poorly = items.filter(i => i.jobTitle && !this._looksLikeJobTitle(i.jobTitle));
        const unstructured = items.filter(i => !i.jobTitle);

        for (const item of wellStructured) {
          const job = this._trunc(item.jobTitle, 35);
          if (!item.company?.trim())
            issues.push({ severity: SEVERITY.WARNING, category: 'experience', message: `No company for "${job}"` });
          if (!item.startYear && !item.startMonth)
            issues.push({ severity: SEVERITY.INFO, category: 'experience', message: `No start date for "${job}"` });

          const achvs = Array.isArray(item.achievements) ? item.achievements.filter(a => a.included !== false && a.text?.trim()) : [];
          if (achvs.length === 0)
            issues.push({ severity: SEVERITY.INFO, category: 'experience', message: `No achievement bullets for "${job}"` });
          else
            issues.push(...this._checkBullets(achvs, job));
        }

        const badCount = poorly.length + unstructured.length;
        if (badCount > 0)
          issues.push({ severity: SEVERITY.INFO, category: 'experience', message: `${title}: ${badCount} items may need restructuring — edit to add proper job title, company, and dates` });
      }

      // Skills checks — limit to one issue per section
      if (['skills', 'technicalSkills', 'coreCompetencies'].includes(type)) {
        const emptyCount = items.filter(i => { const v = i.skills || i.name || ''; return !(Array.isArray(v) ? v.length > 0 : String(v).trim()); }).length;
        if (emptyCount > 0)
          issues.push({ severity: SEVERITY.INFO, category: 'skills', message: `${title}: ${emptyCount} empty skill entries` });
      }

      // Education checks — only structured items
      if (type === 'education') {
        for (const item of items) {
          if (!item.degree && !item.qualification && !item.text)
            issues.push({ severity: SEVERITY.WARNING, category: 'education', message: `${title}: Degree/qualification missing` });
          if (!item.institution && !item.text)
            issues.push({ severity: SEVERITY.WARNING, category: 'education', message: `${title}: Institution name missing` });
        }
      }
    }

    return issues;
  }

  // ==================== BULLET ANALYSIS ====================

  _checkBullets(bullets, context) {
    const issues = [];
    const ctx = this._trunc(context, 30);
    let hasMetricCount = 0;
    let endsWithPeriod = 0;

    for (const b of bullets) {
      const text = b.text.trim();
      const lower = text.toLowerCase();

      // Weak starts
      for (const weak of WEAK_STARTS) {
        if (lower.startsWith(weak)) {
          issues.push({
            severity: SEVERITY.WARNING, category: 'bullets',
            message: `"${ctx}": Weak opening — "${this._trunc(text, 50)}" — start with a strong action verb`,
            fix: { suggestion: `Try: "${STRONG_VERBS[Math.floor(Math.random() * 15)].charAt(0).toUpperCase() + STRONG_VERBS[Math.floor(Math.random() * 15)].slice(1)}..."` }
          });
          break;
        }
      }

      // Metrics check
      if (/\d+[%$xX×]|\$\d|\d+\+|\d+k\b|million|billion/i.test(text)) hasMetricCount++;

      // Length
      if (text.length > 200)
        issues.push({ severity: SEVERITY.WARNING, category: 'bullets', message: `"${ctx}": Bullet too long (${text.length} chars) — aim for under 150` });

      // Punctuation tracking
      if (text.endsWith('.')) endsWithPeriod++;
    }

    // Metrics summary (one issue per job, not per bullet)
    if (bullets.length >= 3 && hasMetricCount === 0)
      issues.push({ severity: SEVERITY.INFO, category: 'bullets', message: `"${ctx}": No bullets contain metrics — quantify your impact where possible` });

    // Punctuation consistency (one issue per job)
    if (bullets.length >= 2 && endsWithPeriod > 0 && endsWithPeriod < bullets.length)
      issues.push({ severity: SEVERITY.INFO, category: 'consistency', message: `"${ctx}": Inconsistent punctuation — ${endsWithPeriod}/${bullets.length} bullets end with a period` });

    return issues;
  }

  // ==================== DOCUMENT LENGTH ====================

  _checkDocLength(doc) {
    const issues = [];
    const sections = (doc.sections || []).filter(s => s && s.visible !== false);
    let totalChars = 0;

    for (const s of sections) {
      if (s.content) totalChars += s.content.length;
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          if (item?.included === false) continue;
          const fields = [item?.text, item?.description, item?.skills, item?.name, item?.summary, item?.roleSummary];
          for (const f of fields) if (f) totalChars += String(f).length;
          if (Array.isArray(item?.achievements)) {
            for (const a of item.achievements) if (a?.text) totalChars += a.text.length;
          }
        }
      }
    }

    const estPages = Math.ceil(totalChars / 3000);
    if (doc.type === 'resume' && estPages > 2)
      issues.push({ severity: SEVERITY.WARNING, category: 'length', message: `Resume appears ~${estPages} pages — most should be 1-2 pages` });
    if (totalChars < 200 && sections.length > 0)
      issues.push({ severity: SEVERITY.INFO, category: 'length', message: 'Very little content — add more detail to your sections' });

    return issues;
  }

  // ==================== SCORING ====================

  _calcScore(issues) {
    let score = 100;
    const errors = issues.filter(i => i.severity === SEVERITY.ERROR).length;
    const warnings = issues.filter(i => i.severity === SEVERITY.WARNING).length;
    const infos = issues.filter(i => i.severity === SEVERITY.INFO).length;

    score -= errors * 15;
    score -= Math.min(warnings, 10) * 4;
    score -= Math.min(infos, 10) * 1;

    return Math.max(0, Math.min(100, score));
  }

  // ==================== AUTO-FIX ====================

  applyAutoFixes(doc) {
    let fixed = 0;

    const fixText = (text) => {
      if (!text || typeof text !== 'string') return text;
      let t = text;
      if (/  /.test(t)) { t = t.replace(/  +/g, ' '); fixed++; }
      if (t !== t.trim()) { t = t.trim(); fixed++; }
      // Fix common OCR/import artifacts
      t = t.replace(/\s+([.,;:!?])/g, '$1');
      if (t !== text) fixed++;
      return t;
    };

    // Fix personalInfo
    if (doc.personalInfo) {
      for (const key of ['fullName', 'email', 'phone', 'professionalTitle', 'resumeHeadline', 'city', 'state', 'country']) {
        if (doc.personalInfo[key]) doc.personalInfo[key] = fixText(doc.personalInfo[key]);
      }
      // Fix phone that looks like a year
      if (doc.personalInfo.phone && /^\(\d{4}\)$/.test(doc.personalInfo.phone.trim())) {
        doc.personalInfo.phone = '';
        fixed++;
      }
    }

    // Fix sections
    for (const section of (doc.sections || [])) {
      if (!section) continue;
      if (section.content) section.content = fixText(section.content);

      if (!Array.isArray(section.items)) continue;
      const type = section.sectionType || section.type || '';

      for (const item of section.items) {
        if (!item) continue;

        // Clean all text fields
        for (const f of ['text', 'description', 'summary', 'roleSummary', 'jobTitle', 'company', 'institution', 'degree', 'skills', 'name', 'responsibilities']) {
          if (item[f] && typeof item[f] === 'string') item[f] = fixText(item[f]);
        }

        // Fix achievement bullets
        if (Array.isArray(item.achievements)) {
          for (const a of item.achievements) {
            if (!a?.text) continue;
            a.text = fixText(a.text);
            // Remove leading bullet characters
            if (/^[-•*▪▸►⦁◦‣·]\s*/.test(a.text)) {
              a.text = a.text.replace(/^[-•*▪▸►⦁◦‣·]\s*/, '');
              fixed++;
            }
          }
          // Remove empty achievements
          const before = item.achievements.length;
          item.achievements = item.achievements.filter(a => a.text?.trim());
          if (item.achievements.length < before) fixed++;
        }

        // Fix skills that have bullet artifacts
        if (item.skills && typeof item.skills === 'string') {
          const cleaned = item.skills.replace(/^[:\-•*▪▸►⦁◦‣·,;\s]+/, '').trim();
          if (cleaned !== item.skills) { item.skills = cleaned; fixed++; }
        }
      }

      // Remove completely empty items
      const before = section.items.length;
      section.items = section.items.filter(item => {
        if (!item) return false;
        const hasAny = item.text || item.name || item.skills || item.jobTitle || item.degree || item.description;
        return !!hasAny;
      });
      if (section.items.length < before) fixed += (before - section.items.length);
    }

    return fixed;
  }

  // ==================== HELPERS ====================

  _looksLikeJobTitle(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.trim();
    if (t.length > 80) return false;
    if (t.length < 3) return false;
    // Date-like strings are not job titles
    if (/^(since|from|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(t)) return false;
    // Sentences ending in period are not job titles
    if (t.endsWith('.') && t.split(' ').length > 5) return false;
    // All lowercase long text is not a job title
    if (t === t.toLowerCase() && t.split(' ').length > 4) return false;
    return true;
  }

  _trunc(text, max) {
    if (!text) return 'Untitled';
    const s = String(text).trim();
    return s.length > max ? s.substring(0, max) + '...' : s;
  }
}

export default SmartFormatter;
