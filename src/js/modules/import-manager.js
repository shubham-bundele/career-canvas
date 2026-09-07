/**
 * Import Manager Module
 * Handles document import from various sources
 */

import { validateDocument, migrateDocument, SCHEMA_VERSION, createEmptyDocument } from '../core/schema.js';
import { generateUUID } from '../utils/id.js';
import { createElement } from '../utils/sanitize.js';
import { extractContact } from '../utils/text-parse.js';
import eventBus, { EVENTS } from '../core/events.js';
import toast from './toast.js';
import modal from './modal.js';

/**
 * ImportManager class
 */
const DRAFT_STORAGE_KEY = 'cc_import_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DRAFT_SAVE_INTERVAL_MS = 5000;

export class ImportManager {
  constructor(dbManager) {
    this.db = dbManager;
    this.currentFile = null;
    this.parsedData = null;
    this._draftTimer = null;
  }

  /**
   * Imports a CareerCanvas JSON file
   * @param {File} file - File to import
   * @returns {Promise<Object>} Imported document
   */
  async importJSON(file) {
    try {
      const content = await this.readFileAsText(file);
      const data = JSON.parse(content);

      // Validate
      const validation = validateDocument(data);
      if (!validation.valid) {
        throw new Error(`Invalid document: ${validation.errors.join(', ')}`);
      }

      // Migrate if necessary
      const migrated = migrateDocument(data);

      // Duplicate check before asking to import
      {
        const gate = await this._duplicateGate(this.computeFileFingerprint(content), file.name);
        if (!gate) return null;
        if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
      }

      // Generate new ID and timestamps
      migrated.id = generateUUID();
      migrated.createdAt = new Date().toISOString();
      migrated.lastModified = migrated.createdAt;

      // Ask user about importing
      const shouldImport = await modal.confirm(
        `Import document "${migrated.name}"? This will create a new document.`,
        null,
        { confirmLabel: 'Import', title: 'Import Document' }
      );

      if (!shouldImport) {
        return null;
      }

      // Save to database
      await this.db.put('documents', migrated);

      // Ensure app access — importing means user is past onboarding
      try {
        if (!localStorage.getItem('onboardingComplete')) localStorage.setItem('onboardingComplete', 'true');
        if (!localStorage.getItem('cc_auth_guest')) localStorage.setItem('cc_auth_guest', 'true');
      } catch (e) { /* ignore */ }

      toast.success('Document imported successfully');
      eventBus.emit(EVENTS.DOCUMENT_CREATE, { document: migrated });

      return migrated;

    } catch (error) {
      console.error('Failed to import JSON:', error);
      toast.error(`Failed to import: ${error.message}`);
      throw error;
    }
  }

  /**
   * Imports plain text and attempts to parse it
   * @param {string|File} input - Text string or file
   * @returns {Promise<Object>} Parsed data
   */
  async importPlainText(input) {
    try {
      let text;
      if (input instanceof File) {
        text = await this.readFileAsText(input);
      } else {
        text = input;
      }

      // Parse text
      const parsed = await this._parseTextWithFallback(text);
      parsed._rawText = text;
      parsed.fingerprint = this.computeFileFingerprint(text);
      if (input instanceof File && input.name) parsed.sourceFile = input.name;

      // Duplicate check before review
      const gate = await this._duplicateGate(parsed.fingerprint, parsed.sourceFile || 'pasted text');
      if (!gate) return null;
      if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }

      // Show field mapping UI
      const confirmed = await this.showFieldMapping(parsed);

      if (!confirmed) {
        return null;
      }

      // Finalize via unified method
      const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'plaintext' });
      if (result.verified && window.CC?.router) {
        this._go(result.route);
      }
      return result.document;

    } catch (error) {
      console.error('Failed to import plain text:', error);
      toast.error(`Failed to import text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Imports complete backup file (all documents and settings)
   * @param {File} file - Backup file
   */
  async importAllData(file) {
    try {
      const content = await this.readFileAsText(file);
      const data = JSON.parse(content);

      // Validate backup structure
      if (!data.version || !data.documents) {
        throw new Error('Invalid backup file format');
      }

      // Confirm import
      const docCount = data.documents.length;
      const confirmed = await modal.confirm(
        `This backup contains ${docCount} document(s). Import all? Existing documents will not be overwritten.`,
        null,
        {
          title: 'Import Backup',
          confirmLabel: 'Import All'
        }
      );

      if (!confirmed) {
        return;
      }

      // Import documents
      let imported = 0;
      for (const doc of data.documents) {
        try {
          // Validate and migrate
          const validation = validateDocument(doc);
          if (!validation.valid) {
            console.warn(`Skipping invalid document ${doc.name}:`, validation.errors);
            continue;
          }

          const migrated = migrateDocument(doc);

          // Generate new ID and timestamps
          migrated.id = generateUUID();
          migrated.createdAt = new Date().toISOString();
          migrated.lastModified = migrated.createdAt;

          await this.db.put('documents', migrated);
          imported++;

        } catch (error) {
          console.error(`Failed to import document ${doc.name}:`, error);
        }
      }

      // Import master profile if present
      if (data.masterProfile) {
        try {
          await this.db.put('masterProfile', data.masterProfile);
        } catch (error) {
          console.error('Failed to import master profile:', error);
        }
      }

      // Import settings if present
      if (data.settings) {
        try {
          const currentSettings = this.getSettings();
          const mergedSettings = { ...currentSettings, ...data.settings };
          localStorage.setItem('userSettings', JSON.stringify(mergedSettings));
        } catch (error) {
          console.error('Failed to import settings:', error);
        }
      }

      toast.success(`Imported ${imported} of ${docCount} documents`);
      eventBus.emit('import:complete', { imported, total: docCount });

    } catch (error) {
      console.error('Failed to import backup:', error);
      toast.error(`Failed to import backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parses plain text into structured data
   * @param {string} text - Plain text content
   * @returns {Object} Parsed data
   */
  parsePlainText(text) {
    // Strip HTML tags, style blocks, script blocks, and comments before parsing
    let cleaned = text;
    // Remove <style>...</style> blocks entirely
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
    // Remove <script>...</script> blocks
    cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Remove HTML comments <!-- ... -->
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    // Remove all HTML tags but keep text content
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    // Remove CSS comment blocks /* ... */
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove CSS-like lines (property: value; patterns)
    cleaned = cleaned.replace(/^[\s]*[a-z-]+\s*\{[^}]*\}/gm, '');
    cleaned = cleaned.replace(/^[\s]*[.#@][a-z-]+[^{]*\{[^}]*\}/gm, '');
    // Remove remaining lines that look like CSS/code (contain { } ; patterns)
    cleaned = cleaned.split('\n').filter(line => {
      const t = line.trim();
      if (!t) return false;
      // Skip lines that are clearly CSS/code
      if (/^\s*[.#@]?[a-z-]+\s*[\{:]/.test(t) && t.includes('{')) return false;
      if (/^\s*[a-z-]+\s*:\s*[^;]+;\s*$/.test(t)) return false;
      if (t === '}' || t === '{') return false;
      if (/^\s*\}/.test(t) && t.length < 5) return false;
      return true;
    }).join('\n');
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Collapse multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);

    const parsed = {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
      sections: []
    };

    let currentSection = null;

    // Try to extract name (usually first line)
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (firstLine.length < 50 && !firstLine.includes('@') && !firstLine.includes('http')) {
        parsed.name = firstLine;
      }
    }

    // Shared contact extraction (email, phone, LinkedIn, GitHub, website, location)
    try {
      const contact = extractContact(text);
      if (contact.email) parsed.email = contact.email;
      if (contact.phone) parsed.phone = contact.phone;
      if (contact.location) parsed.location = contact.location;
      if (contact.linkedin) parsed.linkedin = contact.linkedin;
      if (contact.github) parsed.github = contact.github;
      if (contact.website) parsed.website = contact.website;
    } catch {
      // Fallback to inline regexes if shared extraction fails
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) parsed.email = emailMatch[0];
    }

    const typeMap = {
      // Experience
      'experience': 'experience', 'work experience': 'experience', 'professional experience': 'experience',
      'employment': 'experience', 'employment history': 'experience', 'work history': 'experience',
      'career history': 'experience', 'relevant experience': 'experience', 'work background': 'experience',
      // Education
      'education': 'education', 'academic background': 'education', 'academic history': 'education',
      'education & details': 'education', 'education details': 'education', 'academic qualifications': 'education',
      'educational background': 'education', 'academic credentials': 'education', 'qualification': 'education',
      'qualifications': 'education', 'academic details': 'education',
      // Skills
      'skills': 'skills', 'technical skills': 'skills', 'core competencies': 'skills', 'competencies': 'skills',
      'key skills': 'skills', 'tools & technologies': 'skills', 'tools and technologies': 'skills',
      'ai tools & platforms': 'skills', 'ai tools and platforms': 'skills', 'technical proficiencies': 'skills',
      'professional skills': 'skills', 'skill set': 'skills', 'areas of expertise': 'skills',
      'technology stack': 'skills', 'tech stack': 'skills', 'soft skills': 'skills',
      'personal soft skills': 'skills', 'personal softskills': 'skills', 'key competencies': 'skills',
      'it skills': 'skills', 'computer skills': 'skills', 'programming languages': 'skills',
      // Projects
      'projects': 'projects', 'portfolio': 'projects', 'selected projects': 'projects',
      'key projects': 'projects', 'key project portfolio': 'projects', 'recent projects': 'projects',
      'personal projects': 'projects', 'featured projects': 'projects', 'project portfolio': 'projects',
      'case study': 'projects', 'case studies': 'projects', 'featured case study': 'projects',
      // Certifications
      'certifications': 'certifications', 'certificates': 'certifications', 'licenses': 'certifications',
      'licenses & certifications': 'certifications', 'certifications & licenses': 'certifications',
      'professional certifications': 'certifications', 'training & certifications': 'certifications',
      'credentials': 'certifications',
      // Summary
      'summary': 'summary', 'professional summary': 'summary', 'objective': 'summary',
      'career objective': 'summary', 'profile': 'summary', 'about': 'summary', 'about me': 'summary',
      'profile summary': 'summary', 'career summary': 'summary', 'executive summary': 'summary',
      'personal statement': 'summary', 'overview': 'summary',
      // Awards
      'awards': 'awards', 'achievements': 'awards', 'honors': 'awards', 'honors & awards': 'awards',
      'key achievements': 'awards', 'accomplishments': 'awards', 'recognition': 'awards',
      // Publications
      'publications': 'publications', 'research': 'publications', 'research & publications': 'publications',
      'papers': 'publications', 'selected publications': 'publications',
      // Volunteer
      'volunteer': 'volunteer', 'volunteer experience': 'volunteer', 'community service': 'volunteer',
      'volunteering': 'volunteer', 'community involvement': 'volunteer',
      // Languages
      'languages': 'languages', 'language skills': 'languages', 'language proficiency': 'languages',
      // Interests
      'interests': 'interests', 'hobbies': 'interests', 'hobbies & interests': 'interests',
      'personal interests': 'interests', 'activities': 'interests', 'extracurricular activities': 'interests',
      // References
      'references': 'references', 'professional references': 'references',
      // Additional common headings
      'training': 'certifications', 'professional development': 'certifications',
      'continuing education': 'education', 'courses': 'education', 'coursework': 'education',
      'relevant coursework': 'education',
      'leadership': 'experience', 'leadership experience': 'experience',
      'internships': 'experience', 'internship experience': 'experience',
      'teaching experience': 'experience', 'teaching': 'experience',
      'board experience': 'experience', 'advisory roles': 'experience',
      'consulting': 'experience', 'consulting experience': 'experience',
      'freelance': 'experience', 'freelance experience': 'experience',
      'military experience': 'experience', 'military service': 'experience',
      'memberships': 'custom', 'professional memberships': 'custom', 'affiliations': 'custom',
      'professional affiliations': 'custom', 'associations': 'custom',
      'grants': 'awards', 'fellowships': 'awards', 'scholarships': 'awards',
      'presentations': 'publications', 'conferences': 'publications', 'speaking engagements': 'publications',
      'patents': 'publications',
      'personal information': 'custom', 'additional information': 'custom', 'other information': 'custom',
      'details': 'custom', 'academic details': 'education', 'education & details': 'education',
      'declaration': 'custom', 'contact': 'custom', 'contact information': 'custom',
      'professional experience': 'experience', 'work experience': 'experience',
      'softskills': 'skills', 'soft skills': 'skills',
    };

    const headerKeys = Object.keys(typeMap);

    // Sort headers by length descending so longer matches win (e.g., "professional experience" before "experience")
    const sortedHeaders = headerKeys.sort((a, b) => b.length - a.length);

    const matchHeader = (line) => {
      const cleaned = line.replace(/[:]+$/, '').toLowerCase().trim();
      // Exact match
      if (headerKeys.includes(cleaned)) return { key: cleaned, rest: '' };
      const alphaOnly = cleaned.replace(/[^a-z\s&]/g, '').trim();
      if (alphaOnly && headerKeys.includes(alphaOnly)) return { key: alphaOnly, rest: '' };

      // Starts-with match: line begins with a known header followed by space + content
      // e.g., "Profile Summary Results-driven Quality Engineer..."
      for (const key of sortedHeaders) {
        if (cleaned.startsWith(key + ' ') && cleaned.length > key.length + 3) {
          return { key, rest: line.substring(line.toLowerCase().indexOf(key) + key.length).trim() };
        }
        if (alphaOnly.startsWith(key + ' ') && alphaOnly.length > key.length + 3) {
          return { key, rest: line.substring(line.toLowerCase().replace(/[^a-z\s&]/g, '').indexOf(key) + key.length).trim() };
        }
      }
      return null;
    };

    lines.forEach((line, lineIndex) => {
      // Skip the name line
      if (lineIndex === 0 && line === parsed.name) return;

      // Skip early contact-info lines before any section starts
      if (!currentSection && lineIndex < 8) {
        const isContactLine = line.includes('@') || /[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}/.test(line) ||
          line.includes('|') || line.includes('·');
        if (isContactLine) return;
      }

      // Check for known section headers
      const match = matchHeader(line);
      if (match) {
        // Determine the display title from the known key
        const displayTitle = match.key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        currentSection = {
          title: displayTitle,
          type: typeMap[match.key] || 'custom',
          _matchSource: 'typeMap',
          content: []
        };
        parsed.sections.push(currentSection);
        // If there was trailing content after the header, add it as the first content line
        if (match.rest) {
          currentSection.content.push(match.rest);
        }
        return;
      }

      // Add content to current section
      if (currentSection) {
        currentSection.content.push(line);
      } else {
        // Content before any recognized heading
        currentSection = {
          title: 'General',
          type: 'custom',
          _matchSource: 'fallback',
          content: [line]
        };
        parsed.sections.push(currentSection);
      }
    });

    // Remove empty sections
    parsed.sections = parsed.sections.filter(s => s.content.length > 0 || s.type === 'summary');

    return parsed;
  }

  /**
   * Shows field mapping review UI
   * @param {Object} parsedData - Parsed data
   * @returns {Promise<boolean>} True if user confirms
   */
  async showFieldMapping(parsedData) {
    this.parsedData = parsedData;

    // --- Duplicate Detection (Feature 1) ---
    let duplicateMatch = null;
    try {
      const parsedName = (parsedData.name || '').trim().toLowerCase();
      const parsedEmail = (parsedData.email || '').trim().toLowerCase();
      if (parsedName || parsedEmail) {
        const allDocs = await this.db.getAll('documents');
        if (allDocs && allDocs.length > 0) {
          for (const doc of allDocs) {
            const docName = (doc.personalInfo?.fullName || '').trim().toLowerCase();
            const docEmail = (doc.personalInfo?.email || '').trim().toLowerCase();
            if ((parsedName && docName && parsedName === docName) ||
                (parsedEmail && docEmail && parsedEmail === docEmail)) {
              duplicateMatch = doc;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Duplicate detection failed:', e);
    }

    return new Promise((resolve) => {
      // Start periodic draft saving
      if (this._draftTimer) clearInterval(this._draftTimer);
      this._draftTimer = setInterval(() => {
        this._syncParsedFromInputs();
        this.saveImportDraft(this.parsedData);
      }, DRAFT_SAVE_INTERVAL_MS);

      const cleanupAndResolve = (value) => {
        if (this._draftTimer) { clearInterval(this._draftTimer); this._draftTimer = null; }
        if (!value) { this._updateExistingDocId = null; this._updateExistingDoc = null; }
        resolve(value);
      };

      const overlay = createElement('div', '', { class: 'import-review-overlay' });
      const panel = createElement('div', '', { class: 'import-review-panel' });

      // Header
      const header = createElement('div', '', { class: 'import-review-header' });
      const titleEl = createElement('h2', 'Review Imported Content', { class: 'import-review-title' });
      header.appendChild(titleEl);
      if (parsedData.sourceFile) {
        const sourceEl = createElement('span', `Source: ${parsedData.sourceFile}`, { class: 'import-review-source' });
        header.appendChild(sourceEl);
      }

      const closeBtn = createElement('button', '×', { class: 'import-review-close', 'aria-label': 'Cancel import' });
      closeBtn.addEventListener('click', () => { overlay.remove(); cleanupAndResolve(false); });
      header.appendChild(closeBtn);
      panel.appendChild(header);

      // --- Parser badge + AI upgrade ---
      {
        const badge = createElement('div', '', { class: 'import-parser-badge' });
        const isAI = parsedData._parser === 'ai' || parsedData._parser === 'ai-linkedin';
        const label = createElement('span', isAI ? '🤖 Parsed with AI' : '📴 Parsed offline on your device', { class: 'import-parser-label' });
        badge.appendChild(label);
        if (!isAI && parsedData._rawText && parsedData._rawText.length > 20) {
          const upBtn = createElement('button', 'Re-parse with AI', { class: 'btn btn-sm btn-outline', type: 'button' });
          upBtn.addEventListener('click', async () => {
            upBtn.disabled = true;
            upBtn.textContent = 'Parsing…';
            try {
              const { AiFormatter } = await import('./ai-formatter.js');
              const fresh = await new AiFormatter().parseResume(parsedData._rawText);
              if (!fresh || typeof fresh !== 'object') throw new Error('AI returned nothing usable');
              fresh._parser = 'ai';
              for (const k of ['sourceFile', 'sourceType', '_rawText', 'images', 'fingerprint', '_docName', '_docType', '_templateId', '_mergeMode', '_mergeTargetId']) {
                if (parsedData[k] !== undefined && fresh[k] === undefined) fresh[k] = parsedData[k];
              }
              this._applyReparsedData(fresh, body, tabs, badge);
              if (window.CC?.toast) window.CC.toast.show('Review refreshed with the AI parse', 'success');
            } catch (err) {
              upBtn.disabled = false;
              upBtn.textContent = 'Re-parse with AI';
              if (window.CC?.toast) window.CC.toast.show('AI re-parse failed: ' + (err.message || err), 'error');
            }
          });
          badge.appendChild(upBtn);
        }
        panel.appendChild(badge);
      }

      // --- Duplicate Detection Banner (Feature 1) ---
      if (duplicateMatch) {
        this._updateExistingDocId = null;
        this._updateExistingDoc = null;

        const dupBanner = createElement('div', '', { class: 'import-duplicate-banner' });
        dupBanner.style.cssText = 'background:#fef3c7;border:1px solid #f59e0b;border-radius:var(--radius-md);padding:12px 16px;margin:0 16px 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;';

        const dupText = createElement('span', '', {});
        const dupDocName = duplicateMatch.name || duplicateMatch.personalInfo?.fullName || 'Untitled';
        dupText.textContent = '⚠️ Similar document found: “' + dupDocName + '”. This may be a duplicate.';
        dupText.style.cssText = 'flex:1;min-width:200px;font-size:13px;color:#92400e;font-weight:500;';
        dupBanner.appendChild(dupText);

        const dupBtnRow = createElement('div', '', {});
        dupBtnRow.style.cssText = 'display:flex;gap:8px;';

        const importAnywayBtn = createElement('button', 'Import Anyway', { class: 'btn btn-sm btn-outline', type: 'button' });
        importAnywayBtn.style.cssText = 'font-size:12px;';
        importAnywayBtn.addEventListener('click', () => {
          this._updateExistingDocId = null;
          this._updateExistingDoc = null;
          dupBanner.remove();
        });
        dupBtnRow.appendChild(importAnywayBtn);

        const updateExistingBtn = createElement('button', 'Update Existing', { class: 'btn btn-sm btn-primary', type: 'button' });
        updateExistingBtn.style.cssText = 'font-size:12px;';
        updateExistingBtn.addEventListener('click', () => {
          this._updateExistingDocId = duplicateMatch.id;
          this._updateExistingDoc = duplicateMatch;
          dupText.textContent = '✅ Will update existing document: “' + dupDocName + '”';
          dupBanner.style.background = '#d1fae5';
          dupBanner.style.borderColor = '#10b981';
          dupText.style.color = '#065f46';
          updateExistingBtn.style.display = 'none';
          importAnywayBtn.textContent = 'Import as New Instead';
        });
        dupBtnRow.appendChild(updateExistingBtn);

        dupBanner.appendChild(dupBtnRow);
        panel.appendChild(dupBanner);
      }

      // Tabs
      const tabs = createElement('div', '', { class: 'import-review-tabs', role: 'tablist' });
      const imgCount = parsedData.images?.length || 0;
      const tabData = [
        { id: 'contact', label: 'Contact Info' },
        { id: 'sections', label: `Sections (${parsedData.sections?.length || 0})` },
        ...(imgCount > 0 ? [{ id: 'images', label: `Images (${imgCount})` }] : []),
        { id: 'options', label: 'Options' },
        { id: 'preview', label: 'Preview' }
      ];
      tabData.forEach((t, i) => {
        const btn = createElement('button', t.label, { class: `import-review-tab ${i === 0 ? 'import-review-tab--active' : ''}`, role: 'tab', 'data-tab': t.id });
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.import-review-tab').forEach(b => b.classList.remove('import-review-tab--active'));
          btn.classList.add('import-review-tab--active');
          body.querySelectorAll('.import-review-tabpanel').forEach(p => p.style.display = 'none');
          const target = body.querySelector(`[data-tabpanel="${t.id}"]`);
          if (target) target.style.display = '';
          if (t.id === 'preview') this._renderImportPreview(body.querySelector('[data-tabpanel="preview"]'));
        });
        tabs.appendChild(btn);
      });
      panel.appendChild(tabs);

      // Body
      const body = createElement('div', '', { class: 'import-review-body' });

      // TAB: Contact Info
      const contactPanel = createElement('div', '', { class: 'import-review-tabpanel', 'data-tabpanel': 'contact' });
      const fields = [
        { key: 'name', label: 'Full Name', value: parsedData.name },
        { key: 'title', label: 'Professional Title', value: parsedData.title || parsedData.professionalTitle || '' },
        { key: 'email', label: 'Email', value: parsedData.email },
        { key: 'phone', label: 'Phone', value: parsedData.phone },
        { key: 'location', label: 'Location', value: parsedData.location || '' },
        { key: 'linkedin', label: 'LinkedIn', value: parsedData.linkedin || '' },
        { key: 'github', label: 'GitHub', value: parsedData.github || '' },
        { key: 'website', label: 'Website', value: parsedData.website || '' }
      ];
      this._reviewInputs = {};
      fields.forEach(f => {
        const group = this.createFieldGroup(f.label, f.value);
        this._reviewInputs[f.key] = group.querySelector('input');
        // Feature 3: confidence indicator for contact fields
        const confidence = this._getFieldConfidence(f.key, f.value);
        if (confidence) {
          const dot = this._createConfidenceDot(confidence);
          if (dot) {
            const lbl = group.querySelector('.import-field-label');
            if (lbl) lbl.appendChild(dot);
          }
        }
        // Update confidence dot dynamically on input change
        const fieldInput = this._reviewInputs[f.key];
        const fieldLabel = group.querySelector('.import-field-label');
        if (fieldInput && fieldLabel) {
          fieldInput.addEventListener('input', () => {
            const existing = fieldLabel.querySelector('.import-confidence-dot');
            if (existing) existing.remove();
            const c = this._getFieldConfidence(f.key, fieldInput.value);
            if (c) {
              const d = this._createConfidenceDot(c);
              if (d) fieldLabel.appendChild(d);
            }
          });
        }
        contactPanel.appendChild(group);
      });
      body.appendChild(contactPanel);

      // TAB: Sections
      const sectionsPanel = createElement('div', '', { class: 'import-review-tabpanel', 'data-tabpanel': 'sections' });
      sectionsPanel.style.display = 'none';
      this._rebuildSectionsTab(sectionsPanel, parsedData);
      body.appendChild(sectionsPanel);

      // TAB: Images (only if images exist)
      if (imgCount > 0) {
        const imagesPanel = createElement('div', '', { class: 'import-review-tabpanel', 'data-tabpanel': 'images' });
        imagesPanel.style.display = 'none';

        const imagesGrid = createElement('div', '', { class: 'import-images-grid' });
        imagesGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;';

        parsedData.images.forEach((img, idx) => {
          const sizeKB = Math.round(img.size * 3 / 4 / 1024);
          const isLarge = sizeKB > 20;
          const classification = isLarge ? 'Possible photo' : sizeKB > 5 ? 'Logo' : 'Unknown';

          img._included = isLarge;
          img._classification = classification;

          const card = createElement('div', '', { class: 'import-image-card' });
          card.style.cssText = 'border:2px solid var(--border-primary);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:8px;transition:border-color 0.15s;';

          const thumb = document.createElement('img');
          thumb.src = img.src;
          thumb.alt = `Image ${idx + 1}`;
          thumb.style.cssText = 'max-width:100%;max-height:160px;object-fit:contain;border-radius:var(--radius-md);background:var(--bg-secondary);';
          thumb.addEventListener('load', function() {
            const label = card.querySelector('.import-image-dims');
            if (label) label.textContent = `${this.naturalWidth} x ${this.naturalHeight}px`;
          });
          card.appendChild(thumb);

          const dims = createElement('span', 'Loading...', { class: 'import-image-dims' });
          dims.style.cssText = 'font-size:11px;color:var(--text-tertiary);';
          card.appendChild(dims);

          const meta = createElement('div', '', {});
          meta.style.cssText = 'font-size:12px;color:var(--text-secondary);display:flex;flex-direction:column;gap:2px;';
          meta.appendChild(createElement('span', `${sizeKB} KB · ${img.contentType.split('/')[1] || img.contentType}`));

          const badge = createElement('span', classification);
          badge.style.cssText = 'display:inline-block;font-size:11px;padding:1px 8px;border-radius:99px;width:fit-content;font-weight:600;' +
            (classification === 'Possible photo' ? 'background:rgba(59,130,246,0.12);color:#2563eb;' :
             classification === 'Logo' ? 'background:rgba(168,85,247,0.12);color:#7c3aed;' :
             'background:var(--bg-secondary);color:var(--text-tertiary);');
          meta.appendChild(badge);
          card.appendChild(meta);

          const checkRow = createElement('label', '', {});
          checkRow.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:500;color:var(--text-primary);';
          const checkbox = createElement('input', '', { type: 'checkbox' });
          checkbox.checked = img._included;
          checkbox.style.cssText = 'width:16px;height:16px;accent-color:var(--color-primary);';
          checkbox.addEventListener('change', () => {
            img._included = checkbox.checked;
            card.style.borderColor = checkbox.checked ? 'var(--color-primary)' : 'var(--border-primary)';
            card.style.opacity = checkbox.checked ? '1' : '0.55';
          });
          checkRow.appendChild(checkbox);
          checkRow.appendChild(document.createTextNode('Include'));
          card.appendChild(checkRow);

          if (img._included) {
            card.style.borderColor = 'var(--color-primary)';
          } else {
            card.style.opacity = '0.55';
          }

          imagesGrid.appendChild(card);
        });

        imagesPanel.appendChild(imagesGrid);
        body.appendChild(imagesPanel);
      }

      // TAB: Options
      const optionsPanel = createElement('div', '', { class: 'import-review-tabpanel', 'data-tabpanel': 'options' });
      optionsPanel.style.display = 'none';

      const docNameGroup = this.createFieldGroup('Document Name', parsedData.sourceFile?.replace(/\.(docx|pdf|txt|json)$/i, '') || 'Imported Resume');
      this._reviewInputs.docName = docNameGroup.querySelector('input');
      optionsPanel.appendChild(docNameGroup);

      const typeGroup = createElement('div', '', { class: 'import-field-group' });
      const typeLabel = createElement('label', 'Document Type:', { class: 'import-field-label' });
      typeGroup.appendChild(typeLabel);
      const docTypeSelect = createElement('select', '', { class: 'import-field-input' });
      [['resume', 'Resume'], ['cv', 'Curriculum Vitae'], ['academicCV', 'Academic CV']].forEach(([v, l]) => {
        const opt = createElement('option', l, { value: v });
        docTypeSelect.appendChild(opt);
      });
      this._reviewInputs.docType = docTypeSelect;
      typeGroup.appendChild(docTypeSelect);
      optionsPanel.appendChild(typeGroup);

      // Template selector
      const templateGroup = createElement('div', '', { class: 'import-field-group' });
      templateGroup.appendChild(createElement('label', 'Template:', { class: 'import-field-label' }));

      const templateGrid = createElement('div', '', {});
      templateGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;max-height:300px;overflow-y:auto;padding:4px;';

      const allTemplates = window.CC?.templateEngine?.templates;
      let selectedTemplateId = parsedData._templateId || 'ats-essential';

      if (allTemplates && allTemplates.size > 0) {
        const docTypeVal = docTypeSelect.value;
        const templateArr = [...allTemplates.values()].filter(t => {
          if (!t.docTypes) return true;
          if (docTypeVal === 'resume' || docTypeVal === 'cv' || docTypeVal === 'academicCV') return t.docTypes.includes('resume') || t.docTypes.includes('cv');
          return true;
        });

        templateArr.forEach(tmpl => {
          const card = createElement('button', '', { type: 'button' });
          card.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border:2px solid ${tmpl.id === selectedTemplateId ? 'var(--color-primary)' : 'var(--border-primary)'};border-radius:var(--radius-lg);background:${tmpl.id === selectedTemplateId ? 'var(--color-primary-50, rgba(59,130,246,0.08))' : 'var(--bg-primary)'};cursor:pointer;transition:all 0.15s;text-align:center;`;

          // Color preview bar
          const previewBar = createElement('div', '', {});
          const accent = tmpl.colorPresets?.[0]?.accentColor || '#3b82f6';
          previewBar.style.cssText = `width:100%;height:4px;border-radius:2px;background:${accent};`;
          card.appendChild(previewBar);

          const nameEl = createElement('span', tmpl.name || tmpl.id, {});
          nameEl.style.cssText = 'font-size:11px;font-weight:600;color:var(--text-primary);line-height:1.2;';
          card.appendChild(nameEl);

          const catEl = createElement('span', tmpl.category || '', {});
          catEl.style.cssText = 'font-size:9px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;';
          card.appendChild(catEl);

          if (tmpl.atsLevel === 'high') {
            const atsBadge = createElement('span', 'ATS', {});
            atsBadge.style.cssText = 'font-size:8px;padding:1px 5px;border-radius:8px;background:rgba(16,185,129,0.12);color:#059669;font-weight:700;';
            card.appendChild(atsBadge);
          }

          card.addEventListener('click', () => {
            selectedTemplateId = tmpl.id;
            parsedData._templateId = tmpl.id;
            templateGrid.querySelectorAll('button').forEach(b => {
              b.style.borderColor = 'var(--border-primary)';
              b.style.background = 'var(--bg-primary)';
            });
            card.style.borderColor = 'var(--color-primary)';
            card.style.background = 'var(--color-primary-50, rgba(59,130,246,0.08))';
            // Re-render preview if already visible so it reflects the new template
            const previewTarget = body.querySelector('[data-tabpanel="preview"]');
            if (previewTarget && previewTarget.style.display !== 'none') {
              this._renderImportPreview(previewTarget);
            }
          });

          card.addEventListener('mouseenter', () => {
            if (tmpl.id !== selectedTemplateId) card.style.borderColor = 'var(--color-primary-300, #93c5fd)';
          });
          card.addEventListener('mouseleave', () => {
            if (tmpl.id !== selectedTemplateId) card.style.borderColor = 'var(--border-primary)';
          });

          templateGrid.appendChild(card);
        });

        // Re-filter templates when doc type changes
        docTypeSelect.addEventListener('change', () => {
          parsedData._docType = docTypeSelect.value;
        });
      } else {
        templateGrid.appendChild(createElement('p', 'Templates loading...', { style: 'font-size:12px;color:var(--text-tertiary);padding:8px;' }));
      }

      templateGroup.appendChild(templateGrid);
      optionsPanel.appendChild(templateGroup);

      // --- Suggested Template (Feature 2: Template Auto-Match) ---
      const suggestion = this._suggestTemplate(parsedData);
      if (suggestion) {
        const suggestGroup = createElement('div', '', { class: 'import-suggested-template' });
        suggestGroup.style.cssText = 'background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:var(--radius-lg);padding:12px 16px;margin-bottom:4px;';

        const suggestLabel = createElement('div', 'Suggested Template', {});
        suggestLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--color-primary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;';
        suggestGroup.appendChild(suggestLabel);

        const suggestInfo = createElement('div', '', {});
        suggestInfo.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

        const suggestName = createElement('span', suggestion.template.name || suggestion.template.id, {});
        suggestName.style.cssText = 'font-size:14px;font-weight:600;color:var(--text-primary);';
        suggestInfo.appendChild(suggestName);

        const suggestReason = createElement('span', '— ' + suggestion.reason, {});
        suggestReason.style.cssText = 'font-size:12px;color:var(--text-secondary);';
        suggestInfo.appendChild(suggestReason);
        suggestGroup.appendChild(suggestInfo);

        const useBtn = createElement('button', 'Use Suggested Template', { class: 'btn btn-sm btn-outline', type: 'button' });
        useBtn.style.cssText = 'margin-top:8px;font-size:12px;';
        useBtn.addEventListener('click', () => {
          selectedTemplateId = suggestion.template.id;
          parsedData._templateId = suggestion.template.id;
          // Reset all template cards then highlight the matching one
          templateGrid.querySelectorAll('button').forEach(b => {
            b.style.borderColor = 'var(--border-primary)';
            b.style.background = 'var(--bg-primary)';
          });
          templateGrid.querySelectorAll('button').forEach(b => {
            const spans = b.querySelectorAll('span');
            if (spans.length > 0 && spans[0].textContent === (suggestion.template.name || suggestion.template.id)) {
              b.style.borderColor = 'var(--color-primary)';
              b.style.background = 'var(--color-primary-50, rgba(59,130,246,0.08))';
            }
          });
          useBtn.textContent = 'Selected!';
          useBtn.disabled = true;
          setTimeout(() => { useBtn.textContent = 'Use Suggested Template'; useBtn.disabled = false; }, 2000);
        });
        suggestGroup.appendChild(useBtn);

        // Insert before templateGroup so suggestion appears above the template grid
        optionsPanel.insertBefore(suggestGroup, templateGroup);
      }

      // Formatting mode selector
      const fmtGroup = createElement('div', '', { class: 'import-field-group' });
      fmtGroup.style.marginTop = '12px';
      fmtGroup.appendChild(createElement('label', 'Content Formatting:', { class: 'import-field-label' }));
      const fmtRow = createElement('div', '', {});
      fmtRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      [['normal', 'Normal', 'Keep content as-is from import'], ['ai', 'AI Enhanced', 'AI reformats content for the selected template']].forEach(([val, label, desc]) => {
        const btn = createElement('button', '', { type: 'button' });
        const currentFmt = parsedData._formatMode || 'normal';
        btn.style.cssText = `flex:1;min-width:120px;padding:10px 12px;border:2px solid ${currentFmt === val ? 'var(--color-primary)' : 'var(--border-primary)'};border-radius:var(--radius-lg);background:${currentFmt === val ? 'var(--color-primary-50, rgba(59,130,246,0.08))' : 'var(--bg-primary)'};cursor:pointer;text-align:left;transition:all 0.15s;`;
        const labelEl = createElement('div', label, {});
        labelEl.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:2px;';
        btn.appendChild(labelEl);
        const descEl = createElement('div', desc, {});
        descEl.style.cssText = 'font-size:10px;color:var(--text-tertiary);line-height:1.3;';
        btn.appendChild(descEl);
        btn.addEventListener('click', () => {
          parsedData._formatMode = val;
          fmtRow.querySelectorAll('button').forEach(b => {
            b.style.borderColor = 'var(--border-primary)';
            b.style.background = 'var(--bg-primary)';
          });
          btn.style.borderColor = 'var(--color-primary)';
          btn.style.background = 'var(--color-primary-50, rgba(59,130,246,0.08))';
        });
        fmtRow.appendChild(btn);
      });
      fmtGroup.appendChild(fmtRow);
      optionsPanel.appendChild(fmtGroup);

      // Merge import option
      const mergeGroup = createElement('div', '', { class: 'import-field-group' });
      mergeGroup.style.marginTop = '16px';

      const mergeCheckRow = createElement('label', '', {});
      mergeCheckRow.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-primary);';
      const mergeCheckbox = createElement('input', '', { type: 'checkbox' });
      mergeCheckbox.style.cssText = 'width:16px;height:16px;accent-color:var(--color-primary);';
      mergeCheckRow.appendChild(mergeCheckbox);
      mergeCheckRow.appendChild(document.createTextNode('Merge into existing document instead of creating new'));
      mergeGroup.appendChild(mergeCheckRow);

      const mergeDesc = createElement('p', 'Matching sections will have their items appended. Contact info only fills empty fields.', {});
      mergeDesc.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin:4px 0 0 24px;line-height:1.4;';
      mergeGroup.appendChild(mergeDesc);

      // Target document dropdown (hidden until merge is checked)
      const mergeTargetGroup = createElement('div', '', { class: 'import-merge-target-group' });
      mergeTargetGroup.style.cssText = 'display:none;margin-top:10px;padding-left:24px;';
      const mergeTargetLabel = createElement('label', 'Target document:', { class: 'import-field-label' });
      mergeTargetLabel.style.marginBottom = '4px';
      mergeTargetGroup.appendChild(mergeTargetLabel);
      const mergeTargetSelect = createElement('select', '', { class: 'import-field-input' });
      mergeTargetSelect.style.width = '100%';
      const mergeEmptyOpt = createElement('option', '-- Select a document --', { value: '' });
      mergeTargetSelect.appendChild(mergeEmptyOpt);
      mergeTargetGroup.appendChild(mergeTargetSelect);
      mergeGroup.appendChild(mergeTargetGroup);

      mergeCheckbox.addEventListener('change', async () => {
        const checked = mergeCheckbox.checked;
        parsedData._mergeMode = checked;
        mergeTargetGroup.style.display = checked ? 'block' : 'none';

        if (!checked) {
          parsedData._mergeTargetId = '';
          mergeTargetSelect.value = '';
          const confirmBtn = footer?.querySelector('.btn-primary:last-child');
          if (confirmBtn) confirmBtn.textContent = 'Confirm Import';
        }

        if (checked) {
          // Load existing documents into the dropdown
          try {
            const db = this.db || (window.CC && window.CC.db);
            const allDocs = db ? await db.getAll('documents') : [];
            // Clear previous options (keep the placeholder)
            while (mergeTargetSelect.options.length > 1) {
              mergeTargetSelect.remove(1);
            }
            if (allDocs && allDocs.length > 0) {
              allDocs.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
              allDocs.forEach(d => {
                const typeBadge = d.type === 'resume' ? '📄' : d.type === 'cv' ? '📋' : '📝';
                const date = new Date(d.lastModified || d.createdAt).toLocaleDateString();
                const secCount = Array.isArray(d.sections) ? d.sections.filter(s => s?.visible !== false).length : 0;
                const label = `${typeBadge} ${d.name || 'Untitled'} — ${secCount} sections — ${date}`;
                const opt = createElement('option', label, { value: d.id });
                mergeTargetSelect.appendChild(opt);
              });
            } else {
              const noOpt = createElement('option', 'No existing documents found', { value: '', disabled: 'true' });
              mergeTargetSelect.appendChild(noOpt);
            }
          } catch (err) {
            console.error('Failed to load documents for merge:', err);
            const errOpt = createElement('option', 'Failed to load documents', { value: '', disabled: 'true' });
            mergeTargetSelect.appendChild(errOpt);
          }
        }
      });

      mergeTargetSelect.addEventListener('change', () => {
        parsedData._mergeTargetId = mergeTargetSelect.value || '';
        if (mergeTargetSelect.value) {
          parsedData._mergeMode = true;
          mergeCheckbox.checked = true;
          // Update confirm button to show merge action
          const confirmBtn = footer?.querySelector('.btn-primary:last-child');
          if (confirmBtn) confirmBtn.textContent = 'Merge into Document';
        }
      });

      optionsPanel.appendChild(mergeGroup);

      body.appendChild(optionsPanel);

      // TAB: Preview
      const previewPanel = createElement('div', '', { class: 'import-review-tabpanel import-preview-panel', 'data-tabpanel': 'preview' });
      previewPanel.style.display = 'none';
      previewPanel.innerHTML = '<p class="import-mapping-info">Click to generate preview...</p>';
      body.appendChild(previewPanel);

      panel.appendChild(body);

      // Footer
      const footer = createElement('div', '', { class: 'import-review-footer' });
      const stats = createElement('div', '', { class: 'import-review-stats' });
      const secCount = parsedData.sections?.length || 0;
      const lineCount = parsedData.sections?.reduce((sum, s) => sum + (s.content?.length || 0), 0) || 0;
      stats.textContent = `${secCount} sections · ${lineCount} content items`;
      footer.appendChild(stats);

      // AI Format button
      const aiFormatBtn = createElement('button', '🤖 AI Format', { class: 'btn btn-outline' });
      aiFormatBtn.title = 'Use AI to intelligently detect sections, headings, and structure';
      aiFormatBtn.addEventListener('click', async () => {
        aiFormatBtn.disabled = true;
        aiFormatBtn.textContent = '⏳ AI enhancing...';
        try {
          const aiParsed = await this._aiFormatImport(parsedData);
          if (aiParsed) {
            // Merge AI results — AI fills empty contact fields, keeps existing values
            if (aiParsed.name && this._reviewInputs.name && !this._reviewInputs.name.value.trim()) this._reviewInputs.name.value = aiParsed.name;
            if (aiParsed.email && this._reviewInputs.email && !this._reviewInputs.email.value.trim()) this._reviewInputs.email.value = aiParsed.email;
            if (aiParsed.phone && this._reviewInputs.phone && !this._reviewInputs.phone.value.trim()) this._reviewInputs.phone.value = aiParsed.phone;
            if (aiParsed.location && this._reviewInputs.location && !this._reviewInputs.location.value.trim()) this._reviewInputs.location.value = aiParsed.location;
            if (aiParsed.title && this._reviewInputs.professionalTitle) this._reviewInputs.professionalTitle.value = aiParsed.title;
            // Refresh confidence dots after AI merge
            ['name', 'email', 'phone', 'location'].forEach(k => {
              if (this._reviewInputs[k]) this._reviewInputs[k].dispatchEvent(new Event('input'));
            });

            // Replace sections and sync all parsed fields
            if (aiParsed.sections && aiParsed.sections.length > 0) {
              parsedData.sections = aiParsed.sections;
              parsedData.name = aiParsed.name || parsedData.name;
              parsedData.email = aiParsed.email || parsedData.email;
              parsedData.phone = aiParsed.phone || parsedData.phone;
              parsedData.professionalTitle = aiParsed.title || parsedData.professionalTitle || '';
              if (aiParsed.linkedin) parsedData.linkedin = aiParsed.linkedin;
              if (aiParsed.github) parsedData.github = aiParsed.github;
              if (aiParsed.website) parsedData.website = aiParsed.website;
              parsedData.location = aiParsed.location || parsedData.location;
              parsedData.professionalTitle = aiParsed.title || parsedData.professionalTitle || '';

              // Refresh the sections tab
              const secTab = body.querySelector('[data-tabpanel="sections"]');
              if (secTab) this._rebuildSectionsTab(secTab, parsedData);

              // Update stats
              const secCount2 = parsedData.sections.length;
              const lineCount2 = parsedData.sections.reduce((sum, s) => sum + (s.content?.length || 0), 0);
              stats.textContent = `${secCount2} sections · ${lineCount2} content items · AI formatted`;

              // Update section tab label
              const secTabBtn = tabs.querySelector('[data-tab="sections"]');
              if (secTabBtn) secTabBtn.textContent = `Sections (${secCount2})`;
            }
            aiFormatBtn.textContent = '✅ AI Formatted';
            if (window.CC?.toast) window.CC.toast.show('AI formatting applied — review the sections', 'success');
          }
        } catch (err) {
          console.error('AI format failed:', err);
          if ((err.message.includes('API key') || err.message.includes('not configured')) && !(await AiFormatter.isServerConfigured())) {
            aiFormatBtn.textContent = '🤖 AI Format';
            aiFormatBtn.disabled = false;
            this._showAiKeyInputInline(footer, async () => {
              aiFormatBtn.click();
            });
          } else if (err.message.includes('Rate limited') || err.message.includes('429')) {
            aiFormatBtn.textContent = '⏳ Wait 30s...';
            if (window.CC?.toast) window.CC.toast.show('AI rate limited — please wait before trying again', 'warning');
            setTimeout(() => { aiFormatBtn.textContent = '🤖 AI Format'; aiFormatBtn.disabled = false; }, 30000);
          } else {
            aiFormatBtn.textContent = '🤖 Retry';
            aiFormatBtn.disabled = false;
            if (window.CC?.toast) window.CC.toast.show('AI format failed: ' + err.message, 'error');
          }
        }
      });
      footer.appendChild(aiFormatBtn);

      const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-ghost' });
      cancelBtn.addEventListener('click', () => { overlay.remove(); cleanupAndResolve(false); });
      footer.appendChild(cancelBtn);

      const importBtn = createElement('button', 'Confirm Import', { class: 'btn btn-primary' });
      let importing = false;
      importBtn.addEventListener('click', () => {
        if (importing) return;
        importing = true;
        if (this._reviewInputs.name) this.parsedData.name = this._reviewInputs.name.value;
        if (this._reviewInputs.email) this.parsedData.email = this._reviewInputs.email.value;
        if (this._reviewInputs.phone) this.parsedData.phone = this._reviewInputs.phone.value;
        if (this._reviewInputs.location) this.parsedData.location = this._reviewInputs.location.value;
        if (this._reviewInputs.docName) this.parsedData._docName = this._reviewInputs.docName.value;
        if (this._reviewInputs.docType) this.parsedData._docType = this._reviewInputs.docType.value;
        if (this.parsedData.sections) {
          this.parsedData.sections = this.parsedData.sections.filter(s => !s._excluded);
        }
        overlay.remove();
        cleanupAndResolve(true);
      });
      footer.appendChild(importBtn);

      panel.appendChild(footer);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // Escape to close
      const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); cleanupAndResolve(false); } };
      document.addEventListener('keydown', escHandler);
    });
  }

  /**
   * Refresh an open review UI with re-parsed data (AI upgrade path).
   * Updates contact inputs, rebuilds the sections tab, and flips the badge.
   */
  _applyReparsedData(fresh, body, tabs, badge) {
    this.parsedData = fresh;
    if (this._reviewInputs) {
      for (const key of ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'github', 'website']) {
        const input = this._reviewInputs[key];
        if (!input) continue;
        let v = fresh[key];
        if (key === 'title') v = fresh.title || fresh.professionalTitle || '';
        if (v !== undefined && v !== null) {
          input.value = v;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
    if (body) {
      const secPanel = body.querySelector('[data-tabpanel="sections"]');
      if (secPanel) this._rebuildSectionsTab(secPanel, fresh);
    }
    if (tabs) {
      const secTab = tabs.querySelector('[data-tab="sections"]');
      if (secTab) secTab.textContent = `Sections (${fresh.sections?.length || 0})`;
    }
    if (badge) {
      badge.innerHTML = '';
      badge.appendChild(createElement('span', '🤖 Parsed with AI', { class: 'import-parser-label' }));
    }
    this.saveImportDraft(fresh);
  }

  _syncParsedFromInputs() {
    if (!this.parsedData || !this._reviewInputs) return;
    if (this._reviewInputs.name) this.parsedData.name = this._reviewInputs.name.value;
    if (this._reviewInputs.title) {
      this.parsedData.title = this._reviewInputs.title.value;
      this.parsedData.professionalTitle = this._reviewInputs.title.value;
    }
    if (this._reviewInputs.email) this.parsedData.email = this._reviewInputs.email.value;
    if (this._reviewInputs.phone) this.parsedData.phone = this._reviewInputs.phone.value;
    if (this._reviewInputs.location) this.parsedData.location = this._reviewInputs.location.value;
    if (this._reviewInputs.linkedin) this.parsedData.linkedin = this._reviewInputs.linkedin.value;
    if (this._reviewInputs.github) this.parsedData.github = this._reviewInputs.github.value;
    if (this._reviewInputs.website) this.parsedData.website = this._reviewInputs.website.value;
    if (this._reviewInputs.docName) this.parsedData._docName = this._reviewInputs.docName.value;
    if (this._reviewInputs.docType) this.parsedData._docType = this._reviewInputs.docType.value;
  }

  _renderImportPreview(container) {
    if (!container || !this.parsedData) return;
    container.innerHTML = '';

    // Sync current form values
    this._syncParsedFromInputs();

    // Try template-rendered preview first using the same renderer the editor uses
    const templateId = this.parsedData._templateId || 'ats-essential';
    const templateEngine = window.CC?.templateEngine;

    if (templateEngine && typeof templateEngine.render === 'function') {
      try {
        // Build a temporary document from parsed data to feed the template
        const tempDoc = this.createDocumentFromParsed(this.parsedData, this.parsedData._docType);
        // Force the selected template onto the document
        tempDoc.templateId = templateId;
        if (!tempDoc.design) tempDoc.design = {};
        tempDoc.design.template = templateId;
        const rendered = templateEngine.render(templateId, tempDoc, tempDoc.design);
        if (rendered) {
          const wrapper = createElement('div', '', { class: 'import-preview-template-wrap' });
          wrapper.style.cssText = 'transform-origin:top center;overflow:auto;max-height:600px;border:1px solid var(--border-primary);border-radius:var(--radius-lg);background:white;';
          wrapper.innerHTML = rendered;
          container.appendChild(wrapper);

          const templateObj = templateEngine.getById?.(templateId) || templateEngine.templates?.get?.(templateId);
          const templateName = templateObj?.name || templateId;
          const note = createElement('p', `Preview using template: ${templateName}. Change template in the Options tab.`, {});
          note.style.cssText = 'font-size:10px;color:var(--text-tertiary);text-align:center;margin-top:8px;font-style:italic;';
          container.appendChild(note);
          return;
        }
      } catch (e) {
        console.warn('Template preview failed, falling back to text preview:', e);
      }
    }

    // Fallback: basic text preview
    const preview = createElement('div', '', { class: 'import-preview-content' });
    const name = this._reviewInputs?.name?.value || this.parsedData.name || 'Name';
    const email = this._reviewInputs?.email?.value || this.parsedData.email || '';
    const phone = this._reviewInputs?.phone?.value || this.parsedData.phone || '';

    const nameEl = createElement('h2', name, { class: 'import-preview-name' });
    preview.appendChild(nameEl);

    if (email || phone) {
      const contactEl = createElement('p', [email, phone].filter(Boolean).join(' · '), { class: 'import-preview-contact' });
      preview.appendChild(contactEl);
    }

    (this.parsedData.sections || []).filter(s => !s._excluded).forEach(sec => {
      const secDiv = createElement('div', '', { class: 'import-preview-section' });
      const secTitle = createElement('h3', sec.title, { class: 'import-preview-section-title' });
      secDiv.appendChild(secTitle);
      (sec.content || []).slice(0, 8).forEach(line => {
        const p = createElement('p', line, { class: 'import-preview-line' });
        secDiv.appendChild(p);
      });
      if (sec.content?.length > 8) {
        secDiv.appendChild(createElement('p', `... and ${sec.content.length - 8} more items`, { class: 'import-preview-more' }));
      }
      preview.appendChild(secDiv);
    });

    container.appendChild(preview);
  }

  // ==================== AI-POWERED IMPORT FORMATTING ====================

  async _aiFormatImport(parsedData) {
    const { AiFormatter } = await import('./ai-formatter.js');
    const ai = new AiFormatter();

    // Build raw text from existing parsed data
    const rawParts = [];
    if (parsedData.name) rawParts.push(parsedData.name);
    if (parsedData.email) rawParts.push(parsedData.email);
    if (parsedData.phone) rawParts.push(parsedData.phone);
    if (parsedData.location) rawParts.push(parsedData.location);
    (parsedData.sections || []).forEach(sec => {
      rawParts.push('\n' + (sec.title || 'Section'));
      (sec.content || []).forEach(line => rawParts.push(line));
    });
    // Also include _rawText if we stored it
    const resumeText = parsedData._rawText || rawParts.join('\n');

    try {
      const result = await ai.parseResume(resumeText);
      if (!result || !result.sections || !Array.isArray(result.sections)) {
        throw new Error('AI returned invalid structure');
      }
      return result;
    } catch (err) {
      throw new Error(err.message || 'AI not configured or parsing failed. Paste a free Gemini API key.');
    }
  }

  _rebuildSectionsTab(secPanel, parsedData) {
    secPanel.innerHTML = '';

    if (!parsedData.sections || parsedData.sections.length === 0) {
      secPanel.appendChild(createElement('p', 'No sections detected.', { class: 'import-mapping-info' }));
      return;
    }

    // Drag state held in a closure so all cards share it
    let dragFromIndex = -1;
    let dropIndicator = null;

    const createDropIndicator = () => {
      const el = createElement('div', '', { class: 'import-section-drop-indicator' });
      return el;
    };

    const removeDropIndicator = () => {
      if (dropIndicator && dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
      }
      dropIndicator = null;
    };

    parsedData.sections.forEach((sec, idx) => {
      const secCard = createElement('div', '', { class: 'import-section-card' });
      secCard.setAttribute('draggable', 'true');
      secCard.dataset.sectionIdx = idx;

      // -- Drag events --
      secCard.addEventListener('dragstart', (e) => {
        dragFromIndex = idx;
        secCard.classList.add('import-section-card--dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) { /* IE fallback */ }
      });

      secCard.addEventListener('dragend', () => {
        secCard.classList.remove('import-section-card--dragging');
        removeDropIndicator();
        dragFromIndex = -1;
      });

      secCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragFromIndex === idx) return;

        // Determine whether cursor is in the top or bottom half of the card
        const rect = secCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        removeDropIndicator();
        dropIndicator = createDropIndicator();

        if (insertBefore) {
          secCard.parentNode.insertBefore(dropIndicator, secCard);
        } else {
          secCard.parentNode.insertBefore(dropIndicator, secCard.nextSibling);
        }
      });

      secCard.addEventListener('dragleave', (e) => {
        // Only remove if we truly left this card (not entering a child)
        if (!secCard.contains(e.relatedTarget)) {
          removeDropIndicator();
        }
      });

      secCard.addEventListener('drop', (e) => {
        e.preventDefault();
        removeDropIndicator();

        if (dragFromIndex < 0 || dragFromIndex === idx) return;

        const rect = secCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let toIndex = idx;
        if (e.clientY >= midY) toIndex = idx + 1;
        // Adjust if dragging from before the drop target
        if (dragFromIndex < toIndex) toIndex--;

        // Reorder the sections array
        const [moved] = parsedData.sections.splice(dragFromIndex, 1);
        parsedData.sections.splice(toIndex, 0, moved);

        // Re-render
        this._rebuildSectionsTab(secPanel, parsedData);
      });

      // -- Card header with drag handle --
      const secHeader = createElement('div', '', { class: 'import-section-header' });

      const dragHandle = createElement('span', '⠿', { class: 'import-section-drag-handle', title: 'Drag to reorder', 'aria-label': 'Drag to reorder section' });
      dragHandle.addEventListener('mousedown', () => { secCard.setAttribute('draggable', 'true'); });
      secHeader.appendChild(dragHandle);

      const checkbox = createElement('input', '', { type: 'checkbox', id: `sec-check-${idx}` });
      checkbox.checked = !sec._excluded;
      checkbox.addEventListener('change', () => { sec._excluded = !checkbox.checked; });
      secHeader.appendChild(checkbox);

      const secTitle = createElement('input', '', { class: 'import-section-title-input', type: 'text', value: sec.title || '' });
      secTitle.addEventListener('input', (e) => { sec.title = e.target.value; });
      secHeader.appendChild(secTitle);

      const typeSelect = createElement('select', '', { class: 'import-section-type-select' });
      const types = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'publications', 'volunteer', 'languages', 'interests', 'references', 'custom'];
      types.forEach(t => {
        const opt = createElement('option', t.charAt(0).toUpperCase() + t.slice(1), { value: t });
        if (t === (sec.type || 'custom')) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener('change', (e) => { sec.type = e.target.value; });
      secHeader.appendChild(typeSelect);

      // Feature 3: confidence indicator for section type
      const secConf = this._getSectionConfidence(sec);
      const secDot = this._createConfidenceDot(secConf);
      if (secDot) secHeader.appendChild(secDot);

      secCard.appendChild(secHeader);

      const contentList = createElement('div', '', { class: 'import-section-content' });
      (sec.content || []).slice(0, 5).forEach(line => {
        const lineEl = createElement('div', '', { class: 'import-content-line' });
        lineEl.textContent = line.length > 120 ? line.substring(0, 120) + '...' : line;
        contentList.appendChild(lineEl);
      });
      if (sec.content?.length > 5) {
        contentList.appendChild(createElement('div', `+ ${sec.content.length - 5} more items`, { class: 'import-content-more' }));
      }
      secCard.appendChild(contentList);
      secPanel.appendChild(secCard);
    });
  }

  // ==================== TEMPLATE AUTO-MATCH (Feature 2) ====================

  /**
   * Analyzes imported content and suggests the best-fitting template.
   * @param {Object} parsedData - Parsed import data with sections, images, etc.
   * @returns {Object|null} { template, reason } or null if no suggestion available
   */
  _suggestTemplate(parsedData) {
    try {
      const templateEngine = window.CC?.templateEngine;
      const allTemplates = templateEngine?.getAll?.() || templateEngine?.templates;
      if (!allTemplates) return null;

      const templateArr = allTemplates instanceof Map
        ? [...allTemplates.values()]
        : (Array.isArray(allTemplates) ? allTemplates : []);
      if (templateArr.length === 0) return null;

      const sections = (parsedData.sections || []).filter(s => !s._excluded);
      const sectionCount = sections.length;
      const hasPhoto = !!(parsedData.images && parsedData.images.some(img => img._included));
      const totalItems = sections.reduce((sum, s) => sum + (s.content?.length || 0), 0);
      const hasSkills = sections.some(s => s.type === 'skills');
      const hasProjects = sections.some(s => s.type === 'projects');
      const projectsItemCount = sections.filter(s => s.type === 'projects')
        .reduce((sum, s) => sum + (s.content?.length || 0), 0);

      // Rule 1: Has many sections (6+) + photo -> 2-column with photo support
      if (sectionCount >= 6 && hasPhoto) {
        const match = templateArr.find(t => t.photoSupport && (t.columnCount === 2 || t.columns === 2));
        if (match) return { template: match, reason: 'Photo support with 2-column layout for your detailed resume' };
      }

      // Rule 2: Has projects section prominently -> technical template
      if (hasProjects && projectsItemCount >= 3) {
        const match = templateArr.find(t => t.category === 'technical');
        if (match) return { template: match, reason: 'Technical template highlights your projects' };
      }

      // Rule 3: Short content (few sections) -> compact template
      if (sectionCount <= 3 || totalItems <= 10) {
        const match = templateArr.find(t => t.id === 'ats-essential');
        if (match) return { template: match, reason: 'Clean compact format for concise content' };
      }

      // Rule 4: Many sections (6+) without photo -> ATS-friendly
      if (sectionCount >= 6) {
        const match = templateArr.find(t => t.id === 'ats-essential' || t.atsLevel === 'high');
        if (match) return { template: match, reason: 'ATS-friendly format for comprehensive resume' };
      }

      // Default: ats-essential
      const ats = templateArr.find(t => t.id === 'ats-essential');
      if (ats) return { template: ats, reason: 'ATS-friendly format works well for most resumes' };

      // Fallback to first available template
      return { template: templateArr[0], reason: 'Recommended starting template' };
    } catch (e) {
      console.warn('Template suggestion failed:', e);
      return null;
    }
  }

  _showAiKeyInputInline(parentEl, onSave) {
    const existing = parentEl.querySelector('.ai-key-inline');
    if (existing) return;

    const row = createElement('div', '', { class: 'ai-key-inline' });
    row.style.cssText = 'display:flex;gap:var(--space-2);align-items:center;width:100%;margin-top:var(--space-2);';

    const input = createElement('input', '', { type: 'password', placeholder: 'Paste Gemini or Gemini API key...' });
    input.style.cssText = 'flex:1;padding:var(--space-2);border:1px solid var(--border-primary);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-primary);font-size:var(--font-size-xs);';
    row.appendChild(input);

    const saveBtn = createElement('button', 'Save', { class: 'btn btn-sm btn-primary' });
    saveBtn.addEventListener('click', () => {
      const key = input.value.trim();
      if (!key) return;
      localStorage.setItem('cc_ai_api_key', key);
      row.remove();
      if (onSave) onSave();
    });
    row.appendChild(saveBtn);

    const geminiLink = createElement('a', 'Gemini ↗', {});
    geminiLink.href = 'https://aistudio.google.com/apikey';
    geminiLink.target = '_blank';
    geminiLink.rel = 'noopener';
    geminiLink.style.cssText = 'font-size:var(--font-size-xs);color:var(--color-primary);white-space:nowrap;';
    row.appendChild(geminiLink);



    parentEl.appendChild(row);
  }

  // ==================== FIELD CONFIDENCE INDICATORS ====================

  /**
   * Returns confidence assessment for a contact info field.
   * @param {string} key - Field key (name, email, phone, location)
   * @param {string} value - Field value
   * @returns {Object|null} { level, color, label } or null if empty
   */
  _getFieldConfidence(key, value) {
    if (!value || !value.trim()) return null;
    const v = value.trim();
    switch (key) {
      case 'email':
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)
          ? { level: 'high', color: '#22c55e', label: 'Valid email format' }
          : { level: 'low', color: '#ef4444', label: 'Invalid email format' };
      case 'phone': {
        const digits = v.replace(/\D/g, '').length;
        if (digits >= 7) return { level: 'high', color: '#22c55e', label: 'Valid phone number' };
        if (digits >= 5) return { level: 'medium', color: '#eab308', label: 'Uncertain phone format' };
        return { level: 'low', color: '#ef4444', label: 'Too few digits for phone' };
      }
      case 'name':
        return (v.length >= 2 && v.length <= 50 && /[a-zA-Z]/.test(v))
          ? { level: 'high', color: '#22c55e', label: 'Name looks valid' }
          : { level: 'medium', color: '#eab308', label: 'Uncertain name format' };
      case 'location':
        return v.length >= 2
          ? { level: 'high', color: '#22c55e', label: 'Location provided' }
          : { level: 'medium', color: '#eab308', label: 'Location unclear' };
      case 'title':
        return v.length >= 2
          ? { level: 'high', color: '#22c55e', label: 'Title detected' }
          : { level: 'medium', color: '#eab308', label: 'Title unclear' };
      case 'linkedin':
        return /linkedin\.com/i.test(v)
          ? { level: 'high', color: '#22c55e', label: 'Valid LinkedIn URL' }
          : { level: 'medium', color: '#eab308', label: 'Uncertain LinkedIn URL' };
      case 'github':
        return /github\.com/i.test(v)
          ? { level: 'high', color: '#22c55e', label: 'Valid GitHub URL' }
          : { level: 'medium', color: '#eab308', label: 'Uncertain GitHub URL' };
      case 'website':
        return /^https?:\/\//i.test(v) || /^[\w-]+\.[a-z]{2,}/i.test(v)
          ? { level: 'high', color: '#22c55e', label: 'Website provided' }
          : { level: 'medium', color: '#eab308', label: 'Uncertain URL' };
      default:
        return null;
    }
  }

  /**
   * Returns confidence assessment for a section's type classification.
   * Green if matched by header text in typeMap, yellow if inferred, red if custom.
   * @param {Object} section - Section with type and optional _matchSource
   * @returns {Object} { level, color, label }
   */
  _getSectionConfidence(section) {
    if (section.type === 'custom') {
      return { level: 'low', color: '#ef4444', label: 'Custom section type' };
    }
    if (section._matchSource === 'typeMap') {
      return { level: 'high', color: '#22c55e', label: 'Matched by header text' };
    }
    if (section._matchSource === 'fuzzy') {
      return section._correctedFrom
        ? { level: 'high', color: '#22c55e', label: `Header typo fixed: "${section._correctedFrom}"` }
        : { level: 'high', color: '#22c55e', label: 'Matched by header (typo-tolerant)' };
    }
    // Type is a known standard type but was assigned by AI or partial match
    return { level: 'medium', color: '#eab308', label: 'Type inferred' };
  }

  /**
   * Creates a small colored confidence dot element.
   * @param {Object} confidence - { level, color, label }
   * @returns {HTMLElement|null} Dot span element
   */
  _createConfidenceDot(confidence) {
    if (!confidence) return null;
    const dot = createElement('span', '●', {});
    dot.className = 'import-confidence-dot';
    dot.style.cssText = `color:${confidence.color};font-size:10px;margin-left:6px;cursor:help;vertical-align:middle;`;
    dot.title = confidence.label;
    return dot;
  }

  /**
   * Creates a field group for mapping UI
   * @param {string} label - Field label
   * @param {string} value - Field value
   * @returns {HTMLElement} Field group element
   */
  createFieldGroup(label, value) {
    const group = createElement('div', '', { class: 'import-field-group' });

    const labelEl = createElement('label', `${label}:`, { class: 'import-field-label' });
    group.appendChild(labelEl);

    const input = createElement('input', '', {
      class: 'import-field-input',
      type: 'text'
    });
    input.value = value || '';
    group.appendChild(input);

    return group;
  }

  /**
   * Detects the document type from parsed content
   * @param {Object} parsed - Parsed data with { name, email, phone, sections: [{ title, type, content }] }
   * @returns {Object} Detection result { type: 'resume'|'cv'|'academicCV', confidence: 'high'|'medium'|'low', reasons: string[] }
   */
  detectDocumentType(parsed) {
    const reasons = [];
    const sections = parsed.sections || [];
    const sectionCount = sections.length;

    // Count total content lines
    let totalContentLines = 0;
    for (const section of sections) {
      if (Array.isArray(section.content)) {
        totalContentLines += section.content.length;
      }
    }

    // Collect all section titles lowercased for matching
    const sectionTitles = sections.map(s => (s.title || '').toLowerCase());

    // Collect all content text lowercased for keyword scanning
    const allContentText = sections
      .map(s => (Array.isArray(s.content) ? s.content.join(' ') : ''))
      .join(' ')
      .toLowerCase();

    // Academic indicators
    const academicKeywords = ['publications', 'research', 'teaching', 'grants', 'conferences', 'fellowships', 'patents'];
    const academicTitleMatches = [];
    for (const keyword of academicKeywords) {
      if (sectionTitles.some(t => t.includes(keyword))) {
        academicTitleMatches.push(keyword);
      }
    }

    // Also check for academic keywords in content
    const academicContentKeywords = [
      'publication', 'peer-reviewed', 'journal', 'dissertation', 'thesis',
      'principal investigator', 'co-pi', 'research assistant', 'postdoctoral',
      'tenure', 'adjunct', 'lecturer', 'professor', 'faculty',
      'conference presentation', 'keynote', 'symposium',
      'grant', 'fellowship', 'nsf', 'nih',
      'patent', 'issued patent'
    ];
    let academicContentHits = 0;
    for (const keyword of academicContentKeywords) {
      if (allContentText.includes(keyword)) {
        academicContentHits++;
      }
    }

    // CV indicators
    const cvKeywords = ['references', 'memberships', 'professional memberships', 'affiliations', 'professional affiliations'];
    const cvTitleMatches = [];
    for (const keyword of cvKeywords) {
      if (sectionTitles.some(t => t.includes(keyword))) {
        cvTitleMatches.push(keyword);
      }
    }

    // Academic CV detection
    if (academicTitleMatches.length >= 3) {
      reasons.push(`Found ${academicTitleMatches.length} academic sections: ${academicTitleMatches.join(', ')}`);
      return { type: 'academicCV', confidence: 'high', reasons };
    }

    if (academicTitleMatches.length >= 2 && academicContentHits >= 3) {
      reasons.push(`Found ${academicTitleMatches.length} academic sections: ${academicTitleMatches.join(', ')}`);
      reasons.push(`Found ${academicContentHits} academic keywords in content`);
      return { type: 'academicCV', confidence: 'high', reasons };
    }

    if (academicTitleMatches.length >= 1 && academicContentHits >= 5) {
      reasons.push(`Found academic section: ${academicTitleMatches.join(', ')}`);
      reasons.push(`Found ${academicContentHits} academic keywords in content`);
      return { type: 'academicCV', confidence: 'medium', reasons };
    }

    if (academicTitleMatches.length >= 2) {
      reasons.push(`Found ${academicTitleMatches.length} academic sections: ${academicTitleMatches.join(', ')}`);
      return { type: 'academicCV', confidence: 'medium', reasons };
    }

    // CV detection
    const isManySection = sectionCount >= 8;
    const isLongContent = totalContentLines >= 50;
    const hasCVIndicators = cvTitleMatches.length > 0;

    if (isManySection && isLongContent && hasCVIndicators) {
      reasons.push(`${sectionCount} sections with ${totalContentLines} content lines`);
      reasons.push(`Found CV sections: ${cvTitleMatches.join(', ')}`);
      return { type: 'cv', confidence: 'high', reasons };
    }

    if (isManySection && isLongContent) {
      reasons.push(`${sectionCount} sections with ${totalContentLines} content lines suggests detailed document`);
      return { type: 'cv', confidence: 'medium', reasons };
    }

    if (hasCVIndicators && (isManySection || isLongContent)) {
      reasons.push(`Found CV sections: ${cvTitleMatches.join(', ')}`);
      if (isManySection) reasons.push(`${sectionCount} sections suggests detailed document`);
      if (isLongContent) reasons.push(`${totalContentLines} content lines suggests detailed document`);
      return { type: 'cv', confidence: 'medium', reasons };
    }

    if (hasCVIndicators && academicTitleMatches.length >= 1) {
      reasons.push(`Found CV sections: ${cvTitleMatches.join(', ')}`);
      reasons.push(`Found academic section: ${academicTitleMatches.join(', ')}`);
      return { type: 'cv', confidence: 'low', reasons };
    }

    if (isManySection || isLongContent) {
      reasons.push(`${sectionCount} sections with ${totalContentLines} content lines`);
      return { type: 'cv', confidence: 'low', reasons };
    }

    // Cover Letter detection
    const coverLetterSignals = [];
    const salutationPattern = /^(dear\s|to\s+whom|hello\s|hi\s|greetings)/i;
    const closingPattern = /(sincerely|regards|respectfully|best\s+regards|yours\s+(truly|faithfully)|thank\s+you)/i;

    // Check for salutation/greeting in early content
    const firstSectionContent = sections.length > 0 && Array.isArray(sections[0].content) ? sections[0].content : [];
    const earlyText = firstSectionContent.slice(0, 3).join(' ');
    if (salutationPattern.test(earlyText) || salutationPattern.test(allContentText.slice(0, 200))) {
      coverLetterSignals.push('salutation/greeting detected');
    }
    if (allContentText.includes('dear ')) {
      coverLetterSignals.push('"Dear" found in content');
    }

    // Check for closing
    const lastSectionContent = sections.length > 0 && Array.isArray(sections[sections.length - 1].content)
      ? sections[sections.length - 1].content : [];
    const lateText = lastSectionContent.slice(-3).join(' ');
    if (closingPattern.test(lateText) || closingPattern.test(allContentText.slice(-300))) {
      coverLetterSignals.push('closing phrase detected');
    }
    if (allContentText.includes('sincerely')) {
      coverLetterSignals.push('"Sincerely" found in content');
    }

    // Check for few sections with long paragraph-style content (typical of letters)
    const hasLongParagraphs = sections.some(s =>
      Array.isArray(s.content) && s.content.some(line => line.length > 200)
    );
    if (hasLongParagraphs && sectionCount <= 3) {
      coverLetterSignals.push('few sections with long paragraph content');
    }

    if (coverLetterSignals.length >= 3) {
      reasons.push(...coverLetterSignals);
      return { type: 'coverLetter', confidence: 'high', reasons };
    }
    if (coverLetterSignals.length >= 2) {
      reasons.push(...coverLetterSignals);
      return { type: 'coverLetter', confidence: 'medium', reasons };
    }

    // Reference Sheet detection
    const referenceFieldPattern = /\b(name|title|company|organization|phone|email|relationship)\b/i;
    let referenceItemCount = 0;
    for (const section of sections) {
      if (!Array.isArray(section.content)) continue;
      const contentBlock = section.content.join(' ').toLowerCase();
      const hasName = /\b(name|mr\.|ms\.|mrs\.|dr\.)\b/.test(contentBlock);
      const hasTitle = /\b(title|position|role|manager|director|supervisor|professor)\b/.test(contentBlock);
      const hasCompany = /\b(company|organization|university|department|firm|inc\.|llc|corp)\b/.test(contentBlock);
      const hasPhone = /\b(phone|tel|mobile|cell)\b/.test(contentBlock) || /[\+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3,}/.test(contentBlock);
      const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(contentBlock);

      // A reference entry typically has name + title + company + at least one contact method
      const fieldCount = [hasName, hasTitle, hasCompany, hasPhone, hasEmail].filter(Boolean).length;
      if (fieldCount >= 3) {
        referenceItemCount++;
      }
    }

    // Also check if section titles suggest references
    const hasReferenceTitles = sectionTitles.some(t =>
      t.includes('reference') || t.includes('referees') || t.includes('professional references')
    );

    if (referenceItemCount >= 3 || (referenceItemCount >= 2 && hasReferenceTitles)) {
      reasons.push(`${referenceItemCount} items with name+title+company+contact pattern`);
      if (hasReferenceTitles) reasons.push('Section title indicates references');
      return { type: 'referenceSheet', confidence: referenceItemCount >= 3 ? 'high' : 'medium', reasons };
    }
    if (referenceItemCount >= 1 && hasReferenceTitles && sectionCount <= 3) {
      reasons.push(`${referenceItemCount} reference-like items with reference section title`);
      return { type: 'referenceSheet', confidence: 'low', reasons };
    }

    // Default to resume
    reasons.push('Standard section count and content length');
    if (sectionCount > 0) {
      reasons.push(`${sectionCount} sections with ${totalContentLines} content lines`);
    }
    return { type: 'resume', confidence: sectionCount >= 3 ? 'medium' : 'low', reasons };
  }

  // ==================== DUPLICATE DETECTION ====================

  /**
   * Computes a simple hash fingerprint from file content
   * @param {string|ArrayBuffer} content - File content (string or binary)
   * @returns {string} Hash fingerprint as a string
   */
  computeFileFingerprint(content) {
    // cyrb53 over the FULL content + length suffix. Byte-wise for binary
    // (sampling very large files), char-wise for text. Much stronger than
    // the old 32-bit hash of the first 5000 chars.
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    const mix = (code) => {
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    };
    let len = 0;
    if (typeof content === 'string') {
      len = content.length;
      for (let i = 0; i < content.length; i++) mix(content.charCodeAt(i));
    } else if (content) {
      const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
      len = bytes.length;
      const step = bytes.length > 200000 ? Math.max(1, Math.floor(bytes.length / 200000)) : 1;
      for (let i = 0; i < bytes.length; i += step) mix(bytes[i]);
    }
    mix(len);
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return `${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}:${len.toString(36)}`;
  }

  /**
   * Duplicate gate: fingerprint/name check before review.
   * In batch mode the dialog is skipped (batch pre-check covers it).
   * @returns {Promise<{proceed:true}|{openDoc:Object}|null>} null = user cancelled
   */
  async _duplicateGate(fingerprint, fileName) {
    if (this._batchMode) return { proceed: true };
    let dup = { isDuplicate: false };
    try {
      dup = await this.checkForDuplicate(fingerprint, fileName);
    } catch { return { proceed: true }; }
    if (!dup.isDuplicate) return { proceed: true };
    const action = await this.showDuplicateDialog(dup.existingDoc, fileName);
    if (action === 'open') return { openDoc: dup.existingDoc };
    if (action === 'replace') {
      this._updateExistingDocId = dup.existingDoc.id;
      this._updateExistingDoc = dup.existingDoc;
      return { proceed: true };
    }
    if (action === 'new') return { proceed: true };
    // Cancelled (null) — reset any replace staging and abort
    this._updateExistingDocId = null;
    this._updateExistingDoc = null;
    return null;
  }

  /**
   * Checks if a document with the same fingerprint or name already exists
   * @param {string} fingerprint - File fingerprint from computeFileFingerprint
   * @param {string} fileName - Original file name (with extension)
   * @returns {Promise<Object>} Result with isDuplicate, existingDoc, and matchType
   */
  async checkForDuplicate(fingerprint, fileName) {
    try {
      const allDocs = await this.db.getAll('documents');
      if (!allDocs || allDocs.length === 0) {
        return { isDuplicate: false };
      }

      // Check for fingerprint match first (strongest signal)
      for (const doc of allDocs) {
        if (doc.importFingerprint && doc.importFingerprint === fingerprint) {
          return { isDuplicate: true, existingDoc: doc, matchType: 'fingerprint' };
        }
      }

      // Check for name match (file name without extension vs document name)
      const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
      for (const doc of allDocs) {
        if (doc.name && doc.name.toLowerCase() === nameWithoutExt.toLowerCase()) {
          return { isDuplicate: true, existingDoc: doc, matchType: 'name' };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Shows a dialog when a potential duplicate is detected
   * @param {Object} existingDoc - The existing document that matches
   * @param {string} newFileName - The name of the file being imported
   * @returns {Promise<string|null>} Action: 'open', 'new', 'replace', or null for cancel
   */
  async showDuplicateDialog(existingDoc, newFileName) {
    const container = createElement('div', '', { class: 'duplicate-dialog' });

    const message = createElement('p', '', { class: 'duplicate-dialog-message' });
    message.textContent = `A document named "${existingDoc.name}" already exists. It was last modified on ${new Date(existingDoc.lastModified).toLocaleDateString()}. What would you like to do?`;
    container.appendChild(message);

    // Replace confirmation input (hidden initially)
    const replaceSection = createElement('div', '', { class: 'duplicate-replace-section' });
    replaceSection.style.display = 'none';

    const replaceWarning = createElement('p', 'This will permanently delete the existing document. Type REPLACE to confirm.', {
      class: 'duplicate-replace-warning'
    });
    replaceWarning.style.color = 'var(--color-danger, #e53e3e)';
    replaceWarning.style.fontWeight = '600';
    replaceSection.appendChild(replaceWarning);

    const replaceInput = createElement('input', '', {
      class: 'form-input duplicate-replace-input',
      type: 'text',
      placeholder: 'Type REPLACE to confirm'
    });
    replaceSection.appendChild(replaceInput);

    container.appendChild(replaceSection);

    // Track the current state
    let awaitingReplaceConfirm = false;

    const result = await modal.show({
      title: 'Duplicate Detected',
      body: container,
      size: 'medium',
      actions: [
        {
          label: 'Cancel',
          type: 'secondary',
          handler: () => {
            return null;
          }
        },
        {
          label: 'Open Existing Document',
          type: 'primary',
          handler: () => {
            return 'open';
          }
        },
        {
          label: 'Import as New Copy',
          type: 'secondary',
          handler: () => {
            return 'new';
          }
        },
        {
          label: 'Replace Existing',
          type: 'danger',
          handler: () => {
            if (!awaitingReplaceConfirm) {
              // Show confirmation input
              awaitingReplaceConfirm = true;
              replaceSection.style.display = 'block';
              replaceInput.focus();
              return false; // Keep modal open
            }
            // Check confirmation text
            if (replaceInput.value.trim() === 'REPLACE') {
              return 'replace';
            } else {
              replaceWarning.textContent = 'You must type REPLACE exactly to confirm. Please try again.';
              replaceInput.value = '';
              replaceInput.focus();
              return false; // Keep modal open
            }
          }
        }
      ]
    });

    return result;
  }

  /**
   * Creates a document from parsed data
   * @param {Object} parsed - Parsed data
   * @param {string} [docType] - Optional document type override
   * @returns {Object} Document object
   */
  createDocumentFromParsed(parsed, docType) {
    const type = docType || this.detectDocumentType(parsed).type;
    const doc = createEmptyDocument(type, parsed.name || 'Imported Resume');

    // Set personal info
    doc.personalInfo.fullName = parsed.name || '';
    doc.personalInfo.email = parsed.email || '';
    doc.personalInfo.phone = parsed.phone || '';
    if (parsed.professionalTitle || parsed.title) {
      doc.personalInfo.professionalTitle = parsed.professionalTitle || parsed.title || '';
    }
    if (parsed.linkedin) doc.personalInfo.linkedinUrl = parsed.linkedin;
    if (parsed.github) doc.personalInfo.githubUrl = parsed.github;
    if (parsed.website) doc.personalInfo.personalWebsite = parsed.website;

    if (parsed.location) {
      const locParts = parsed.location.split(',').map(s => s.trim());
      doc.personalInfo.city = locParts[0] || '';
      if (locParts.length >= 2) doc.personalInfo.state = locParts[1] || '';
      if (locParts.length >= 3) doc.personalInfo.country = locParts[2] || '';
    }

    // Add sections — replace defaults with parsed content
    if (parsed.sections && parsed.sections.length > 0) {
      doc.sections = parsed.sections.map((section, index) => {
        const sectionId = generateUUID();
        const mappedType = section.type || 'custom';
        const contentLines = Array.isArray(section.content) ? section.content : [];

        // Text-type sections (summary, objective) use content field
        const isTextSection = ['summary', 'objective'].includes(mappedType);
        // List-type sections use items
        const isListSection = ['experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'publications', 'volunteer', 'languages', 'interests', 'references'].includes(mappedType);

        if (isTextSection) {
          const joinedContent = contentLines.join('\n');
          return {
            id: sectionId,
            sectionType: mappedType,
            type: 'text',
            title: section.title,
            content: joinedContent,
            items: joinedContent ? [{ id: generateUUID(), content: joinedContent, included: true, order: 0 }] : [],
            visible: true,
            column: 'main',
            order: index
          };
        }

        // For list sections, create structured items based on section type
        let items = [];
        const isBullet = (l) => /^[-•*▪▸►⦁◦‣·]\s/.test(l) || /^\d+[.)]\s/.test(l);
        const stripBullet = (l) => l.replace(/^[-•*▪▸►⦁◦‣·]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
        const hasDate = (l) => /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b.*\b\d{4}\b/i.test(l) || /\b(19|20)\d{2}\b/.test(l) || /\bpresent\b/i.test(l) || /\bsince\b/i.test(l);
        const hasSeparator = (l) => /[|,]/.test(l) || /\s[-–—]\s/.test(l);

        if (mappedType === 'experience') {
          let currentJob = null;
          contentLines.forEach(line => {
            if (isBullet(line)) {
              const bulletText = stripBullet(line);
              if (currentJob && bulletText) {
                currentJob.achievements.push({ id: generateUUID(), text: bulletText });
              }
            } else if (!isBullet(line) && line.length > 5 && (hasDate(line) || hasSeparator(line) || (!isBullet(line) && line.length < 120 && !currentJob))) {
              if (currentJob) items.push(currentJob);
              const parts = line.split(/\s*[|]\s*|\s+[-–—]\s+/);
              const dates = this._parseDateRange(line);
              currentJob = {
                id: generateUUID(),
                jobTitle: (parts[0] || line).trim(),
                company: (parts[1] || '').trim(),
                location: '',
                startMonth: dates.startMonth, startYear: dates.startYear,
                endMonth: dates.endMonth, endYear: dates.endYear,
                current: dates.current,
                currentlyWorking: dates.current,
                description: '',
                roleSummary: '',
                responsibilities: '',
                achievements: [],
                highlights: [],
                technologies: [],
                included: true,
                order: items.length
              };
              if (parts.length >= 3) {
                const candidate = parts[parts.length - 1].trim();
                if (!/\d{4}/.test(candidate) && !/present|current/i.test(candidate)) {
                  currentJob.location = candidate;
                } else if (parts.length >= 4) {
                  const mid = parts[2].trim();
                  if (!/\d{4}/.test(mid) && !/present|current/i.test(mid)) currentJob.location = mid;
                }
              }
            } else if (line.length > 5) {
              if (!currentJob) {
                currentJob = { id: generateUUID(), jobTitle: line, company: '', location: '', startMonth: '', startYear: '', endMonth: '', endYear: '', current: false, currentlyWorking: false, description: '', roleSummary: '', responsibilities: '', achievements: [], highlights: [], technologies: [], included: true, order: items.length };
              } else {
                if (!currentJob.company && line.length < 80) {
                  currentJob.company = line;
                } else {
                  currentJob.achievements.push({ id: generateUUID(), text: line });
                }
              }
            }
          });
          if (currentJob) items.push(currentJob);
          items.forEach(item => {
            item.highlights = (item.achievements || []).map(a => typeof a === 'string' ? a : (a && a.text ? a.text : '')).filter(Boolean);
          });
        } else if (mappedType === 'education') {
          let currentEdu = null;
          contentLines.forEach(line => {
            if (isBullet(line)) {
              if (currentEdu) currentEdu.description = ((currentEdu.description || '') + '\n' + stripBullet(line)).trim();
            } else if (line.length > 3) {
              if (currentEdu) items.push(currentEdu);
              const parts = line.split(/\s*[|,]\s*|\s+[-–—]\s+/);
              const degreeText = (parts[0] || line).trim();
              const inMatch = degreeText.match(/^(.+?)\s+in\s+(.+)$/i);
              const degree = inMatch ? inMatch[1].trim() : degreeText;
              const field = inMatch ? inMatch[2].trim() : '';
              const yearMatch = line.match(/\b((?:19|20)\d{2})\b/);
              const gradYear = yearMatch ? yearMatch[1] : '';
              const gpaMatch = line.match(/\bGPA[:\s]*(\d+\.?\d*(?:\s*\/\s*\d+\.?\d*)?)/i);
              currentEdu = {
                id: generateUUID(),
                degree,
                field,
                institution: (parts[1] || '').trim(),
                location: parts.length >= 3 ? parts[2].trim().replace(/\b\d{4}\b/, '').trim() : '',
                graduationYear: gradYear,
                startMonth: '', startYear: '', endMonth: '', endYear: gradYear,
                gpa: gpaMatch ? gpaMatch[1] : '',
                honors: '',
                relevantCoursework: '',
                description: '',
                included: true,
                order: items.length
              };
            }
          });
          if (currentEdu) items.push(currentEdu);
          items.forEach(item => {
            if (!item.gpa && item.description) {
              const m = item.description.match(/\bGPA[:\s]*(\d+\.?\d*(?:\s*\/\s*\d+\.?\d*)?)/i);
              if (m) item.gpa = m[1];
            }
            if (!item.honors && item.description) {
              const h = item.description.match(/\b(cum laude|magna cum laude|summa cum laude|with honors|with distinction)\b/i);
              if (h) item.honors = h[1];
            }
          });
        } else if (mappedType === 'skills') {
          contentLines.forEach((line, li) => {
            const cleaned = stripBullet(line);
            const colonIdx = cleaned.indexOf(':');
            let category = '';
            let skillsText = cleaned;
            if (colonIdx > 0 && colonIdx < 40) {
              category = cleaned.substring(0, colonIdx).trim();
              skillsText = cleaned.substring(colonIdx + 1).trim();
            }
            const skillsArray = skillsText.split(/\s*[,;|·•]\s*/).map(s => s.trim()).filter(Boolean);
            items.push({ id: generateUUID(), category, name: category || skillsText, skills: skillsArray, included: true, order: li });
          });
        } else if (mappedType === 'certifications') {
          contentLines.forEach((line, li) => {
            const cleaned = stripBullet(line);
            const parts = cleaned.split(/\s*[-–—]\s*/);
            const certName = (parts[0] || cleaned).trim();
            const org = (parts[1] || '').trim();
            const yearMatch = cleaned.match(/\b((?:19|20)\d{2})\b/);
            items.push({ id: generateUUID(), name: certName, issuingOrganization: org, issuer: org, organization: org, date: yearMatch ? yearMatch[1] : '', year: yearMatch ? yearMatch[1] : '', description: parts.length > 2 ? parts.slice(2).join(' - ').trim() : '', included: true, order: li });
          });
        } else if (mappedType === 'projects') {
          let currentProj = null;
          contentLines.forEach(line => {
            if (isBullet(line)) {
              if (currentProj) currentProj.summary = ((currentProj.summary || '') + '\n' + stripBullet(line)).trim();
            } else if (line.length > 3) {
              if (currentProj) items.push(currentProj);
              currentProj = { id: generateUUID(), projectName: line, name: line, title: line, text: line, summary: '', description: '', technologies: [], included: true, order: items.length };
            }
          });
          if (currentProj) items.push(currentProj);
        } else {
          items = contentLines.map((line, li) => {
            const cleaned = stripBullet(line);
            return { id: generateUUID(), text: cleaned, name: cleaned, description: '', included: true, order: li };
          });
        }

        return {
          id: sectionId,
          sectionType: mappedType,
          type: isListSection ? 'list' : 'text',
          title: section.title,
          content: isListSection ? '' : contentLines.join('\n'),
          items,
          visible: true,
          column: 'main',
          order: index
        };
      });
    }

    // Set photograph from included images
    if (parsed.images && parsed.images.length > 0) {
      const photo = parsed.images.find(img => img._included && img._classification === 'Possible photo');
      if (photo) {
        doc.personalInfo.photograph = photo.src;
      }
    }

    // Apply selected template
    if (parsed._templateId) {
      doc.templateId = parsed._templateId;
      if (!doc.design) doc.design = {};
      doc.design.template = parsed._templateId;
    }

    // Store import metadata for duplicate detection
    doc.importFingerprint = parsed.fingerprint || '';
    doc.importSource = parsed.sourceFile || '';

    return doc;
  }

  /**
   * Unified finalization for all import paths.
   * Creates a document from parsed data, stores it, verifies, and returns routing info.
   * @param {Object} parsed - Parsed/reviewed data (after showFieldMapping confirmation)
   * @param {Object} [options={}] - Options
   * @param {string} [options.sourceType] - Import source type (e.g. 'plaintext', 'docx', 'pdf', 'draft')
   * @param {string} [options.selectedDocumentType] - Override document type
   * @returns {Promise<Object>} Result with { document, route, verified } or { document: null, route, verified: false, error }
   */
  async finalizeImportedDocument(parsed, options = {}) {
    try {
      // ---- Merge mode: merge into an existing document ----
      if (parsed._mergeMode && parsed._mergeTargetId) {
        return await this._finalizeMergeImport(parsed, options);
      }

      const doc = this.createDocumentFromParsed(parsed, options.selectedDocumentType);

      // Handle updating existing document (from duplicate detection, Feature 1)
      let isUpdate = false;
      if (this._updateExistingDocId && this._updateExistingDoc) {
        doc.id = this._updateExistingDocId;
        doc.createdAt = this._updateExistingDoc.createdAt || doc.createdAt;
        doc.lastModified = new Date().toISOString();
        isUpdate = true;
        this._updateExistingDocId = null;
        this._updateExistingDoc = null;
      }

      // Set document name from parsed metadata
      doc.name = parsed._docName || parsed.sourceFile || 'Imported Document';

      // Set import metadata
      if (parsed.importSource || parsed.sourceFile) {
        doc.importSource = parsed.importSource || parsed.sourceFile || '';
      }
      if (parsed.importFingerprint || parsed.fingerprint) {
        doc.importFingerprint = parsed.importFingerprint || parsed.fingerprint || '';
      }

      // Store document
      await this.db.put('documents', doc);

      // Read back and verify
      const stored = await this.db.get('documents', doc.id);
      const verified = stored && stored.id === doc.id;

      // Clean up draft
      this.clearImportDraft();

      // Ensure app access — a user who imports a document is past onboarding
      try {
        if (!localStorage.getItem('onboardingComplete')) {
          localStorage.setItem('onboardingComplete', 'true');
        }
        if (!localStorage.getItem('cc_auth_guest')) {
          localStorage.setItem('cc_auth_guest', 'true');
        }
      } catch (e) { /* localStorage unavailable */ }

      if (verified) {
        toast.success(isUpdate ? `Updated "${doc.name}" successfully` : `Imported "${doc.name}" successfully`);
        eventBus.emit(EVENTS.DOCUMENT_CREATE, { document: stored });

        // Template Auto-Match toast (Feature 2)
        try {
          const tmplSuggestion = this._suggestTemplate(parsed);
          if (tmplSuggestion && parsed._templateId !== tmplSuggestion.template.id) {
            const tmplName = tmplSuggestion.template.name || tmplSuggestion.template.id;
            setTimeout(() => {
              toast.info(`Tip: The "${tmplName}" template might work well for this resume`);
            }, 1500);
          }
        } catch (e) { /* ignore template suggestion errors */ }
      } else {
        console.warn('Import verification: stored document id mismatch');
      }

      if (verified) {
        try {
          this._logImport({
            fileName: parsed.sourceFile || parsed._docName || doc.name || 'pasted text',
            sourceType: options.sourceType || parsed.sourceType || 'file',
            docId: (stored || doc).id,
            docName: doc.name || 'Imported Document',
            parser: parsed._parser || 'unknown',
          });
        } catch { /* history is best-effort */ }
      }

      return {
        document: stored || doc,
        route: '/editor/' + (stored || doc).id,
        verified
      };
    } catch (error) {
      console.error('finalizeImportedDocument failed:', error);
      return {
        document: null,
        route: '/dashboard',
        verified: false,
        error
      };
    }
  }

  /**
   * Handles merge import: loads the target document, merges parsed sections
   * and contact info into it, then saves.
   * @param {Object} parsed - Parsed/reviewed data
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result with { document, route, verified }
   */
  async _finalizeMergeImport(parsed, options = {}) {
    const targetId = parsed._mergeTargetId;
    const db = this.db || (window.CC && window.CC.db);
    if (!db) {
      toast.error('Database not available');
      return { document: null, route: '/dashboard', verified: false, error: new Error('No database') };
    }
    const targetDoc = await db.get('documents', targetId);

    if (!targetDoc) {
      toast.error('Target document not found. It may have been deleted.');
      return { document: null, route: '/dashboard', verified: false, error: new Error('Target document not found') };
    }

    // Build a temporary document from parsed data to get structured sections
    const incoming = this.createDocumentFromParsed(parsed, options.selectedDocumentType);

    // ---- Merge contact / personal info: only fill empty fields ----
    if (targetDoc.personalInfo && incoming.personalInfo) {
      const pi = targetDoc.personalInfo;
      const src = incoming.personalInfo;
      const contactFields = ['fullName', 'email', 'phone', 'professionalTitle', 'city', 'state', 'country', 'linkedinUrl', 'githubUrl', 'personalWebsite', 'photograph'];
      for (const field of contactFields) {
        if (!pi[field] && src[field]) {
          pi[field] = src[field];
        }
      }
    }

    // ---- Merge sections ----
    const targetSections = targetDoc.sections || [];
    const incomingSections = (incoming.sections || []).filter(s => !s._excluded);

    for (const incSec of incomingSections) {
      // Try to find a matching section in the target by sectionType
      const match = targetSections.find(ts => ts.sectionType === incSec.sectionType);

      if (match) {
        // Append items from the incoming section to the existing one
        if (Array.isArray(incSec.items) && incSec.items.length > 0) {
          if (!Array.isArray(match.items)) match.items = [];
          const startOrder = match.items.length;
          incSec.items.forEach((item, i) => {
            // Assign a new id and adjust order to avoid conflicts
            item.id = generateUUID();
            item.order = startOrder + i;
            match.items.push(item);
          });
        }
        // For text-type sections (summary), append content
        if (incSec.sectionType === 'summary' && incSec.content) {
          match.content = match.content
            ? match.content + '\n\n' + incSec.content
            : incSec.content;
        }
      } else {
        // No matching section in target -- add as a new section
        incSec.id = generateUUID();
        incSec.order = targetSections.length;
        targetSections.push(incSec);
      }
    }

    targetDoc.sections = targetSections;
    targetDoc.lastModified = new Date().toISOString();

    // Save merged document
    await db.put('documents', targetDoc);

    // Verify
    const stored = await db.get('documents', targetDoc.id);
    const verified = stored && stored.id === targetDoc.id;

    // Clean up draft
    this.clearImportDraft();

    // Ensure app access
    try {
      if (!localStorage.getItem('onboardingComplete')) localStorage.setItem('onboardingComplete', 'true');
      if (!localStorage.getItem('cc_auth_guest')) localStorage.setItem('cc_auth_guest', 'true');
    } catch (e) { /* ignore */ }

    if (verified) {
      toast.success(`Merged into "${targetDoc.name}" successfully`);
      eventBus.emit(EVENTS.DOCUMENT_SAVE, { document: stored });
    }

    return {
      document: stored || targetDoc,
      route: '/editor/' + targetDoc.id,
      verified
    };
  }

  /**
   * Validates import data
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  validateImport(data) {
    const errors = [];
    const warnings = [];

    if (!data) {
      errors.push('No data provided');
      return { valid: false, errors, warnings };
    }

    // Check schema version
    if (data.schemaVersion && data.schemaVersion > SCHEMA_VERSION) {
      warnings.push(`Document was created with a newer version (${data.schemaVersion}). Some features may not be supported.`);
    }

    // Validate structure
    const validation = validateDocument(data);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Shows file picker and handles import
   * @param {string} acceptedTypes - Accepted file types
   * @returns {Promise<void>}
   */
  async showFilePicker(acceptedTypes = '.json,.txt,.md,.pdf,.docx,.html,.png,.jpg,.jpeg,.webp') {
    return new Promise((resolve, reject) => {
      const input = createElement('input', '', {
        type: 'file',
        accept: acceptedTypes
      });
      input.multiple = true;

      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', async (e) => {
        const files = [...(e.target.files || [])];
        document.body.removeChild(input);
        if (!files.length) {
          resolve(null);
          return;
        }

        try {
          if (files.length === 1) {
            await this.importFile(files[0]);
          } else {
            await this.importFileBatch(files);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      input.click();
    });
  }

  /**
   * Creates drag and drop zone
   * @returns {HTMLElement} Drop zone element
   */
  createDropZone() {
    const dropZone = createElement('div', '', { class: 'import-drop-zone' });

    const icon = createElement('div', '📁', { class: 'import-drop-icon' });
    dropZone.appendChild(icon);

    const text = createElement('p', 'Drag and drop a file here or click to browse', {
      class: 'import-drop-text'
    });
    dropZone.appendChild(text);

    const hint = createElement('p', 'Supported: JSON, DOCX, PDF, TXT, images — drop several files at once for batch import', {
      class: 'import-drop-hint'
    });
    dropZone.appendChild(hint);

    // Handle drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const files = [...(e.dataTransfer.files || [])];
      if (!files.length) return;

      try {
        if (files.length === 1) {
          const doc = await this.importFile(files[0]);
          // importJSON does not navigate internally (others do) — take JSON drops to the editor
          if (doc && files[0].name.toLowerCase().endsWith('.json')) this._go(`/editor/${doc.id}`);
        } else {
          await this.importFileBatch(files);
        }
      } catch (error) {
        console.error('Drop import failed:', error);
      }
    });

    // Handle click to browse
    dropZone.addEventListener('click', () => {
      this.showFilePicker();
    });

    return dropZone;
  }

  // ==================== BATCH IMPORT + HISTORY ====================

  /**
   * Navigate unless a batch import is running (batch navigates once at end).
   */
  _go(route) {
    if (!route) return;
    if (this._batchMode) return;
    if (window.CC?.router) window.CC.router.navigate(route);
  }

  /** Route a single file to the right importer by extension. Returns doc|null. */
  async importFile(file) {
    if (!file || !file.name) {
      if (window.CC?.toast) window.CC.toast.show('No file selected', 'warning');
      return null;
    }
    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) return await this.importJSON(file);
    if (name.endsWith('.docx')) return await this.importDOCX(file);
    if (name.endsWith('.pdf')) return await this.importPDF(file);
    if (name.endsWith('.txt') || name.endsWith('.md')) return await this.importPlainText(file);
    if (name.endsWith('.html') || name.endsWith('.htm')) return await this.importHTML(file);
    if (/\.(png|jpe?g|webp|gif|bmp)$/.test(name)) return await this.importImage(file);
    if (name.endsWith('.doc')) {
      if (window.CC?.toast) window.CC.toast.show('Legacy .doc files are not supported. Save as .docx first.', 'warning');
      return null;
    }
    if (window.CC?.toast) window.CC.toast.show(`Unsupported file type: ${file.name}`, 'error');
    return null;
  }

  /**
   * Batch import: reviews files one at a time (single-file UX preserved),
   * navigates only once at the end. Returns { imported, failed, total, docs }.
   */
  async importFileBatch(fileList) {
    const files = [...(fileList || [])].filter((f) => f && f.name);
    if (files.length === 0) return { imported: 0, failed: 0, total: 0, docs: [] };
    if (files.length === 1) {
      const doc = await this.importFile(files[0]);
      return { imported: doc ? 1 : 0, failed: doc ? 0 : 1, total: 1, docs: doc ? [doc] : [] };
    }
    this._batchMode = true;
    const results = { imported: 0, failed: 0, total: files.length, docs: [] };
    try {
      // Pre-check: collapse exact duplicates inside the batch itself so the
      // same file dropped twice is reviewed only once.
      const unique = [];
      const seenFp = new Set();
      let skippedDup = 0;
      for (const file of files) {
        let fp = null;
        try {
          fp = this.computeFileFingerprint(new Uint8Array(await file.arrayBuffer()));
        } catch { /* fall through as unique */ }
        if (fp && seenFp.has(fp)) { skippedDup++; continue; }
        if (fp) seenFp.add(fp);
        unique.push(file);
      }
      if (skippedDup > 0 && window.CC?.toast) {
        window.CC.toast.show(`Skipped ${skippedDup} duplicate file${skippedDup === 1 ? '' : 's'} in this batch`, 'info');
      }
      results.total = unique.length;
      let i = 0;
      for (const file of unique) {
        i++;
        if (window.CC?.toast) window.CC.toast.show(`Importing ${i} of ${files.length}: ${file.name}`, 'info');
        try {
          const validation = this.validateFile(file, this._formatIdFor(file.name));
          if (!validation.valid) throw new Error(validation.error);
          const doc = await this.importFile(file);
          if (doc) { results.imported++; results.docs.push(doc); }
          else results.failed++;
        } catch (err) {
          results.failed++;
          console.warn(`Batch import failed for ${file.name}:`, err);
        }
      }
    } finally {
      this._batchMode = false;
    }
    if (window.CC?.toast) {
      window.CC.toast.show(
        results.failed === 0
          ? `Batch import complete: ${results.imported} of ${results.total} imported`
          : `Batch import: ${results.imported} imported, ${results.failed} failed`,
        results.failed === 0 ? 'success' : 'warning'
      );
    }
    this._go('/dashboard');
    return results;
  }

  /** Import a resume file from a URL (same-origin or CORS-enabled). */
  async importFromURL(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('That does not look like a valid link.');
    }
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('Only http(s) links are supported.');
    if (window.CC?.toast) window.CC.toast.show('Fetching file…', 'info');
    let res;
    try {
      res = await fetch(url);
    } catch {
      throw new Error('Could not reach that link (network error or blocked by CORS).');
    }
    if (!res.ok) throw new Error(`Server returned ${res.status}.`);
    const blob = await res.blob();
    const pathName = parsed.pathname.split('/').pop() || 'download';
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    let fileName = decodeURIComponent(pathName);
    if (!/\.[a-z0-9]+$/i.test(fileName)) {
      if (ct.includes('pdf')) fileName += '.pdf';
      else if (ct.includes('word') || ct.includes('officedocument')) fileName += '.docx';
      else if (ct.includes('json')) fileName += '.json';
      else if (ct.includes('html')) fileName += '.html';
      else if (ct.includes('image')) fileName += '.png';
      else fileName += '.txt';
    }
    const file = new File([blob], fileName, { type: blob.type || ct.split(';')[0] });
    // Plain-text responses parse directly without a File round-trip
    if (/\.(txt|md)$/i.test(fileName) || (ct.includes('text/plain') && !/\./.test(pathName))) {
      return await this.importPlainText(await blob.text());
    }
    return await this.importFile(file);
  }

  _formatIdFor(fileName) {
    const n = String(fileName || '').toLowerCase();
    if (n.endsWith('.json')) return 'json';
    if (n.endsWith('.docx')) return 'docx';
    if (n.endsWith('.pdf')) return 'pdf';
    if (/\.(png|jpe?g|webp|gif|bmp)$/.test(n)) return 'image';
    if (n.endsWith('.html') || n.endsWith('.htm')) return 'html';
    return 'txt';
  }

  // ---------- import history (localStorage, capped) ----------

  _logImport(entry) {
    try {
      const key = 'cc_import_history';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ at: new Date().toISOString(), ...entry });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
    } catch { /* ignore */ }
  }

  getImportHistory() {
    try {
      const list = JSON.parse(localStorage.getItem('cc_import_history') || '[]');
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  }

  _renderHistorySection(container) {
    const history = this.getImportHistory();
    if (!history.length) return;
    const sec = createElement('div', '', { class: 'import-history-section' });
    sec.appendChild(createElement('h2', 'Recent Imports', { class: 'import-history-title' }));
    const list = createElement('div', '', { class: 'import-history-list' });
    history.slice(0, 8).forEach((h) => {
      const row = createElement('div', '', { class: 'import-history-row' });
      const info = createElement('div', '', { class: 'import-history-info' });
      info.appendChild(createElement('strong', h.docName || h.fileName || 'Import', {}));
      const meta = createElement('span', '', { class: 'import-history-meta' });
      let when = h.at || '';
      try { when = new Date(h.at).toLocaleString(); } catch { /* keep raw */ }
      meta.textContent = `${h.fileName || ''} · ${h.sourceType || 'file'}${h.parser ? ` · ${h.parser}` : ''} · ${when}`;
      info.appendChild(meta);
      row.appendChild(info);
      if (h.docId) {
        const openBtn = createElement('button', 'Open', { class: 'btn btn-sm btn-outline', type: 'button' });
        openBtn.addEventListener('click', () => this._go(`/editor/${h.docId}`));
        row.appendChild(openBtn);
      }
      list.appendChild(row);
    });
    sec.appendChild(list);
    container.appendChild(sec);
  }

  // ---------- LinkedIn profile import ----------

  /** Adapt AI-parsed LinkedIn data to the app's parsed-document shape. */
  adaptLinkedInProfile(li) {
    const sections = [];
    if (li.summary) sections.push({ title: 'Professional Summary', type: 'summary', content: [li.summary] });
    if (Array.isArray(li.experience) && li.experience.length) {
      const content = [];
      for (const e of li.experience) {
        const head = [e.jobTitle, e.company].filter(Boolean).join(' at ') + (e.dates ? ` (${e.dates})` : '');
        if (head.trim()) content.push(head);
        for (const b of (e.bullets || [])) if (b && String(b).trim()) content.push('• ' + String(b).trim());
      }
      sections.push({ title: 'Work Experience', type: 'experience', content });
    }
    if (Array.isArray(li.education) && li.education.length) {
      sections.push({
        title: 'Education', type: 'education',
        content: li.education.map((e) => [e.degree, e.institution].filter(Boolean).join(', ') + (e.dates ? ` (${e.dates})` : '')),
      });
    }
    if (Array.isArray(li.skills) && li.skills.length) {
      sections.push({ title: 'Skills', type: 'skills', content: li.skills.filter(Boolean).map(String) });
    }
    if (Array.isArray(li.certifications) && li.certifications.length) {
      sections.push({ title: 'Certifications', type: 'certifications', content: li.certifications.filter(Boolean).map(String) });
    }
    return {
      name: li.name || '', title: li.title || '', email: '', phone: '', location: '',
      sections, sourceType: 'linkedin', _parser: 'ai-linkedin',
    };
  }

  /** LinkedIn paste flow: AI parse first, local smart parse as fallback. */
  async importLinkedInFlow() {
    const modalApi = window.CC?.modal;
    if (!modalApi || typeof modalApi.show !== 'function') {
      if (window.CC?.toast) window.CC.toast.show('Dialogs unavailable — paste profile text on the Plain Text card instead.', 'warning');
      return null;
    }
    const text = await new Promise((resolve) => {
      const body = document.createElement('div');
      body.innerHTML = `<p style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--space-2);">Copy your LinkedIn <strong>About + Experience + Education + Skills</strong> sections and paste below. Parsing runs AI-first, offline second — nothing is uploaded except to your chosen AI provider.</p>`;
      const ta = document.createElement('textarea');
      ta.className = 'form-input';
      ta.rows = 10;
      ta.placeholder = 'Paste LinkedIn profile text here...';
      ta.style.width = '100%';
      body.appendChild(ta);
      modalApi.show({
        title: 'Import from LinkedIn',
        body, size: 'large',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => { resolve(''); } },
          { label: 'Parse Profile', type: 'primary', handler: () => { resolve(ta.value.trim()); } },
        ],
      });
    });
    if (!text || text.length < 20) return null;

    let parsed = null;
    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      if (window.CC?.toast) window.CC.toast.show('Analyzing LinkedIn profile with AI...', 'info');
      const li = await new AiFormatter().parseLinkedIn(text);
      parsed = this.adaptLinkedInProfile(li || {});
    } catch (err) {
      console.warn('LinkedIn AI parse failed, using local parser:', err);
      try {
        const { parseResumeLocal } = await import('./local-resume-parser.js');
        parsed = parseResumeLocal(text);
        parsed.sourceType = 'linkedin';
        if (window.CC?.toast) window.CC.toast.show('AI unavailable — parsed locally on your device.', 'info');
      } catch { parsed = this.parsePlainText(text); }
    }
    parsed._rawText = text;
    parsed.sourceFile = 'LinkedIn profile';
    const confirmed = await this.showFieldMapping(parsed);
    if (!confirmed) return null;
    const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'linkedin' });
    this._go(result.route);
    return result.document;
  }

  async _parseTextWithFallback(text) {
    // 1) AI first: on-device (LocalAI/AdvancedLocalAI) when enabled,
    //    otherwise the server proxy, otherwise the user's own Gemini key.
    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter();
      if (window.CC?.toast) window.CC.toast.show('Analyzing document with AI...', 'info');
      const parsed = await ai.parseResume(text);
      if (parsed && typeof parsed === 'object') {
        // Ensure sections exist
        if (!parsed.sections) parsed.sections = [];
        parsed._parser = parsed._parser || 'ai';
        return parsed;
      }
    } catch (err) {
      console.warn('AI parsing failed, falling back to local smart parsing:', err);
    }
    // 2) Offline smart parser: fuzzy headers + spell correction + contacts.
    try {
      const { parseResumeLocal } = await import('./local-resume-parser.js');
      const parsed = parseResumeLocal(text);
      if (parsed && (parsed.sections?.length || parsed.name || parsed.email)) {
        if (window.CC?.toast) window.CC.toast.show('AI unavailable — parsed locally on your device.', 'info');
        return parsed;
      }
    } catch (err) {
      console.warn('Local smart parsing failed, falling back to legacy parsing:', err);
    }
    // 3) Legacy exact-match parser (last resort).
    return this.parsePlainText(text);
  }

  /**
   * Reads file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Gets settings from localStorage
   * @returns {Object} Settings
   */
  getSettings() {
    try {
      const settings = localStorage.getItem('userSettings');
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  // ==================== DRAFT RECOVERY ====================

  saveImportDraft(parsed) {
    try {
      const draft = {
        name: parsed.name || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        location: parsed.location || '',
        sections: (parsed.sections || []).map(s => ({
          title: s.title,
          type: s.type,
          content: s.content,
          _excluded: s._excluded
        })),
        sourceFile: parsed.sourceFile || '',
        sourceType: parsed.sourceType || '',
        _docName: parsed._docName || '',
        _docType: parsed._docType || '',
        savedAt: Date.now()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // localStorage full or unavailable — silently ignore
    }
  }

  loadImportDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || !draft.savedAt) return null;
      if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
        this.clearImportDraft();
        return null;
      }
      return draft;
    } catch (e) {
      return null;
    }
  }

  clearImportDraft() {
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (e) { /* ignore */ }
    if (this._draftTimer) { clearInterval(this._draftTimer); this._draftTimer = null; }
  }

  async renderImportView(db) {
    if (db) this.db = db;

    const container = createElement('div', '', { class: 'import-page' });

    // Header
    const header = createElement('div', '', { class: 'import-header' });
    const title = createElement('h1', 'Import Resume or CV', { class: 'import-title' });
    header.appendChild(title);
    const desc = createElement('p', 'Import an existing resume or CV from various file formats. All processing happens locally in your browser.', { class: 'import-desc' });
    header.appendChild(desc);
    container.appendChild(header);

    // Format cards
    const grid = createElement('div', '', { class: 'import-format-grid' });
    const formats = [
      { id: 'json', icon: '📋', title: 'CareerCanvas Backup', ext: '.json', desc: 'Restore a CareerCanvas JSON document or full backup.', accept: '.json' },
      { id: 'docx', icon: '📝', title: 'Word Document', ext: '.docx', desc: 'Import a resume or CV from a Microsoft Word DOCX file.', accept: '.docx', note: 'Layout may differ from original' },
      { id: 'pdf', icon: '📄', title: 'PDF Document', ext: '.pdf', desc: 'Extract resume or CV text from a PDF file.', accept: '.pdf', note: 'Scanned PDFs require OCR' },
      { id: 'txt', icon: '📃', title: 'Plain Text', ext: '.txt', desc: 'Paste or upload resume text for structured import.', accept: '.txt,.md' },
      { id: 'image', icon: '🖼️', title: 'Resume Image', ext: '.png/.jpg', desc: 'AI vision first, on-device OCR fallback. No key needed for OCR.', accept: '.png,.jpg,.jpeg,.webp,.gif,.bmp' },
      { id: 'html', icon: '🌐', title: 'Saved Webpage', ext: '.html', desc: 'Import a resume saved as a webpage (structure-aware).', accept: '.html,.htm' },
      { id: 'linkedin', icon: '💼', title: 'LinkedIn Profile', ext: 'paste', desc: 'Paste profile text — AI parses it, offline parser fills in on failure.', accept: '' },
    ];

    formats.forEach(fmt => {
      const card = createElement('div', '', { class: 'import-format-card', 'data-format': fmt.id });
      card.tabIndex = 0;

      const iconEl = createElement('div', fmt.icon, { class: 'import-format-icon' });
      card.appendChild(iconEl);
      const titleEl = createElement('h3', fmt.title, { class: 'import-format-title' });
      card.appendChild(titleEl);
      const extEl = createElement('span', fmt.ext, { class: 'import-format-ext' });
      card.appendChild(extEl);
      const descEl = createElement('p', fmt.desc, { class: 'import-format-desc' });
      card.appendChild(descEl);
      if (fmt.note) {
        const noteEl = createElement('p', fmt.note, { class: 'import-format-note' });
        card.appendChild(noteEl);
      }
      const btn = createElement('button', 'Select File', { class: 'btn btn-sm btn-outline import-format-btn', type: 'button' });
      card.appendChild(btn);

      const handler = () => this.handleFormatSelect(fmt, container);
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });

      grid.appendChild(card);
    });
    container.appendChild(grid);

    // Draft recovery banner
    const draft = this.loadImportDraft();
    if (draft) {
      const banner = createElement('div', '', { class: 'import-draft-banner' });
      const bannerText = createElement('span', '', {});
      bannerText.textContent = `You have an unfinished import from "${draft.sourceFile || 'pasted text'}".`;
      banner.appendChild(bannerText);
      const resumeBtn = createElement('button', 'Resume Import', { class: 'btn btn-sm btn-primary' });
      resumeBtn.addEventListener('click', async () => {
        banner.remove();
        const confirmed = await this.showFieldMapping(draft);
        if (confirmed) {
          const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: draft.sourceType || 'draft' });
          if (result.verified && window.CC?.router) {
            this._go(result.route);
          } else if (window.CC?.router) {
            this._go(result.route);
          }
        }
      });
      banner.appendChild(resumeBtn);
      const discardBtn = createElement('button', 'Discard', { class: 'btn btn-sm btn-ghost' });
      discardBtn.addEventListener('click', () => { this.clearImportDraft(); banner.remove(); });
      banner.appendChild(discardBtn);
      container.appendChild(banner);
    }

    // Recent imports (local history, works offline)
    this._renderHistorySection(container);

    // Drop zone
    const dropZone = this.createDropZone();
    container.appendChild(dropZone);

    // Plain text area
    const textSection = createElement('div', '', { class: 'import-text-section' });
    const orText = createElement('p', 'Or paste resume text:', { class: 'import-or-text' });
    textSection.appendChild(orText);

    const textArea = createElement('textarea', '', {
      class: 'form-input import-textarea',
      rows: '6',
      placeholder: 'Paste your resume or CV text here...'
    });
    textSection.appendChild(textArea);

    const textBtnRow = createElement('div', '', { class: 'import-btn-row' });
    const importTextBtn = createElement('button', 'Import Pasted Text', { class: 'btn btn-primary' });
    importTextBtn.addEventListener('click', async () => {
      const text = textArea.value.trim();
      if (!text) { if (window.CC?.toast) window.CC.toast.show('Please paste some text first', 'warning'); return; }
      try {
        const doc = await this.importPlainText(text);
        this._go(doc ? `/editor/${doc.id}` : '/dashboard');
      } catch (e) {
        if (window.CC?.toast) window.CC.toast.show('Import failed: ' + e.message, 'error');
      }
    });
    textBtnRow.appendChild(importTextBtn);
    textSection.appendChild(textBtnRow);
    container.appendChild(textSection);

    // URL import row
    const urlSection = createElement('div', '', { class: 'import-text-section' });
    urlSection.appendChild(createElement('p', 'Or import from a link (the server must allow it — CORS):', { class: 'import-or-text' }));
    const urlRow = createElement('div', '', { class: 'import-url-row' });
    urlRow.style.cssText = 'display:flex;gap:var(--space-2);';
    const urlInput = createElement('input', '', { class: 'form-input import-url-input', type: 'url', placeholder: 'https://example.com/resume.pdf' });
    urlInput.style.flex = '1';
    urlInput.setAttribute('aria-label', 'Resume file URL');
    urlRow.appendChild(urlInput);
    const urlBtn = createElement('button', 'Fetch & Import', { class: 'btn btn-outline', type: 'button' });
    urlBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) { if (window.CC?.toast) window.CC.toast.show('Paste a link first', 'warning'); return; }
      urlBtn.disabled = true;
      try {
        await this.importFromURL(url);
      } catch (e) {
        if (window.CC?.toast) window.CC.toast.show('URL import failed: ' + e.message, 'error');
      } finally {
        urlBtn.disabled = false;
      }
    });
    urlRow.appendChild(urlBtn);
    urlSection.appendChild(urlRow);
    container.appendChild(urlSection);

    // Back button
    const backRow = createElement('div', '', { class: 'import-back-row' });
    const backBtn = createElement('button', '← Back to Dashboard', { class: 'btn btn-ghost' });
    backBtn.addEventListener('click', () => { if (window.CC?.router) window.CC.router.navigate('/dashboard'); });
    backRow.appendChild(backBtn);
    container.appendChild(backRow);

    return container;
  }

  async handleFormatSelect(fmt, container) {
    // LinkedIn needs pasted text, not a file
    if (fmt.id === 'linkedin') {
      try {
        await this.importLinkedInFlow();
      } catch (err) {
        if (window.CC?.toast) window.CC.toast.show('LinkedIn import failed: ' + err.message, 'error');
      }
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fmt.accept;
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])];
      document.body.removeChild(input);
      if (!files.length) return;

      // Multi-select from any card runs the batch queue
      if (files.length > 1) {
        try {
          await this.importFileBatch(files);
        } catch (err) {
          if (window.CC?.toast) window.CC.toast.show('Batch import failed: ' + err.message, 'error');
        }
        return;
      }
      const file = files[0];

      // Validate
      const validation = this.validateFile(file, fmt.id);
      if (!validation.valid) {
        if (window.CC?.toast) window.CC.toast.show(validation.error, 'error');
        return;
      }

      try {
        switch (fmt.id) {
          case 'json': {
            const doc = await this.importJSON(file);
            this._go(doc ? `/editor/${doc.id}` : '/dashboard');
            break;
          }
          case 'docx': {
            const doc = await this.importDOCX(file);
            if (doc) this._go(`/editor/${doc.id}`);
            break;
          }
          case 'pdf': {
            const doc = await this.importPDF(file);
            if (doc) this._go(`/editor/${doc.id}`);
            break;
          }
          case 'txt': {
            const doc = await this.importPlainText(file);
            if (doc) this._go(`/editor/${doc.id}`);
            break;
          }
          case 'image': {
            const doc = await this.importImage(file);
            if (doc) this._go(`/editor/${doc.id}`);
            else this._go('/dashboard');
            break;
          }
          case 'html': {
            const doc = await this.importHTML(file);
            if (doc) this._go(`/editor/${doc.id}`);
            else this._go('/dashboard');
            break;
          }
        }
      } catch (err) {
        if (window.CC?.toast) window.CC.toast.show('Import failed: ' + err.message, 'error');
      }
    });

    input.click();
  }

  validateFile(file, formatId) {
    if (!file) return { valid: false, error: 'No file selected' };
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) return { valid: false, error: 'File is too large (max 50MB)' };
    if (file.size === 0) return { valid: false, error: 'File is empty' };

    const name = file.name.toLowerCase();
    if (formatId === 'json' && !name.endsWith('.json')) return { valid: false, error: 'Please select a .json file' };
    if (formatId === 'txt' && !(/\.(txt|md)$/.test(name))) return { valid: false, error: 'Please select a .txt or .md file' };
    if (formatId === 'docx') {
      if (name.endsWith('.doc') && !name.endsWith('.docx')) {
        return { valid: false, error: 'Legacy .doc files are not supported. Open the file in Microsoft Word or LibreOffice and save as .docx, then import the new file.' };
      }
      if (name.endsWith('.docm')) return { valid: false, error: 'Macro-enabled Word files (.docm) are not supported for security reasons.' };
      if (!name.endsWith('.docx')) return { valid: false, error: 'Please select a .docx file' };
    }
    if (formatId === 'pdf' && !name.endsWith('.pdf')) return { valid: false, error: 'Please select a .pdf file' };
    if (formatId === 'image' && !/\.(png|jpe?g|webp|gif|bmp)$/.test(name)) {
      return { valid: false, error: 'Please select an image file (PNG, JPG, WebP, GIF, BMP)' };
    }
    if (formatId === 'html' && !/\.(html?)$/.test(name)) {
      return { valid: false, error: 'Please select an .html file' };
    }

    return { valid: true };
  }

  // ==================== HTML IMPORT ====================

  /** Import a saved-webpage/HTML resume (DOM structure aware, no new deps). */
  async importHTML(file) {
    if (window.CC?.toast) window.CC.toast.show('Reading HTML document...', 'info');
    try {
      const raw = await this.readFileAsText(file);
      if (!raw || !raw.trim()) throw new Error('HTML file is empty');
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      doc.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach((el) => el.remove());
      doc.querySelectorAll('[onclick],[onerror],[onload]').forEach((el) => {
        Array.from(el.attributes).filter((a) => a.name.startsWith('on')).forEach((a) => el.removeAttribute(a.name));
      });
      const body = doc.body || doc;
      const cleanText = (body.textContent || '').trim();
      if (!cleanText) throw new Error('No readable text in HTML file');

      let parsed;
      try {
        const { AiFormatter } = await import('./ai-formatter.js');
        if (window.CC?.toast) window.CC.toast.show('Parsing HTML with AI...', 'info');
        const aiParsed = await new AiFormatter().parseResume(cleanText);
        if (aiParsed && typeof aiParsed === 'object') {
          if (!aiParsed.sections) aiParsed.sections = [];
          parsed = aiParsed;
        } else {
          throw new Error('Invalid AI parse result');
        }
      } catch (err) {
        console.warn('AI parsing failed, using structure-aware HTML parsing:', err);
        parsed = this.parseHTMLContent(body);
      }
      parsed.sourceFile = file.name;
      parsed.sourceType = 'html';
      parsed._rawText = cleanText;
      parsed.fingerprint = this.computeFileFingerprint(cleanText);

      // Duplicate check before review
      {
        const gate = await this._duplicateGate(parsed.fingerprint, file.name);
        if (!gate) return null;
        if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
      }

      const confirmed = await this.showFieldMapping(parsed);
      if (!confirmed) return null;
      const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'html' });
      if (result.verified) this._go(result.route);
      return result.document;
    } catch (err) {
      console.error('HTML import failed:', err);
      throw new Error(err.message || 'Failed to read HTML document.');
    }
  }

  // ==================== DOCX IMPORT ====================

  async importDOCX(file) {
    if (window.CC?.toast) window.CC.toast.show('Reading Word document...', 'info');

    try {
      const mammoth = await import('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/+esm');
      const arrayBuffer = await file.arrayBuffer();

      const images = [];
      const convertImage = mammoth.images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
          const src = "data:" + image.contentType + ";base64," + imageBuffer;
          images.push({ src, contentType: image.contentType, size: imageBuffer.length });
          return { src };
        });
      });

      const convResult = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh"
        ]
      });

      const html = convResult.value;
      if (convResult.messages.length > 0) {
        console.warn('DOCX import warnings:', convResult.messages);
      }

      // Tracked changes / comments are dropped by the converter — warn so
      // users accept changes in Word first instead of losing content silently.
      try {
        const probe = new TextDecoder().decode(arrayBuffer.slice(0, Math.min(arrayBuffer.byteLength, 2000000)));
        if (/w:(ins|del|commentRangeStart|commentRangeEnd|moveFrom|moveTo)\b/.test(probe)) {
          if (window.CC?.toast) window.CC.toast.show('This Word file has tracked changes or comments, which are not imported. Accept them in Word first if text looks missing.', 'warning', 8000);
        }
      } catch { /* probe is best-effort */ }

      // Sanitize: strip dangerous content
      const div = document.createElement('div');
      div.innerHTML = html;
      div.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach(el => el.remove());
      div.querySelectorAll('[onclick],[onerror],[onload]').forEach(el => {
        Array.from(el.attributes).filter(a => a.name.startsWith('on')).forEach(a => el.removeAttribute(a.name));
      });

      const cleanText = div.textContent || '';
      if (!cleanText.trim()) {
        if (window.CC?.toast) window.CC.toast.show('No text content found in DOCX', 'warning');
        return null;
      }

      let parsed;
      try {
        const { AiFormatter } = await import('./ai-formatter.js');
        const ai = new AiFormatter();
        if (window.CC?.toast) window.CC.toast.show('Parsing DOCX with AI...', 'info');
        parsed = await ai.parseResume(cleanText);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.sections) parsed.sections = [];
        } else {
          throw new Error('Invalid AI parse result');
        }
      } catch (err) {
        console.warn('AI parsing failed, trying local smart parsing:', err);
        try {
          const { parseResumeLocal } = await import('./local-resume-parser.js');
          const smart = parseResumeLocal(cleanText);
          if (smart && (smart.sections?.length || smart.name || smart.email)) {
            parsed = smart;
            if (window.CC?.toast) window.CC.toast.show('AI unavailable — parsed locally on your device.', 'info');
          } else {
            throw new Error('Local smart parse returned nothing usable');
          }
        } catch (err2) {
          console.warn('Local smart parsing failed, falling back to rule-based HTML parsing:', err2);
          parsed = this.parseHTMLContent(div);
        }
      }
      parsed.sourceFile = file.name;
      parsed.sourceType = 'docx';
      parsed.images = images;
      parsed._rawText = cleanText;
      parsed.fingerprint = this.computeFileFingerprint(cleanText);

      // Duplicate check before review
      {
        const gate = await this._duplicateGate(parsed.fingerprint, file.name);
        if (!gate) return null;
        if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
      }

      const confirmed = await this.showFieldMapping(parsed);
      if (!confirmed) return null;

      // Finalize via unified method
      const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'docx' });
      if (result.verified && window.CC?.router) {
        this._go(result.route);
      }
      return result.document;

    } catch (err) {
      console.error('DOCX import failed:', err);
      throw new Error('Failed to read Word document. The file may be corrupted or unsupported.');
    }
  }

  // ==================== PDF IMPORT ====================

  async importPDF(file) {
    if (window.CC?.toast) window.CC.toast.show('Reading PDF document...', 'info');
    let progressOverlay = null;

    try {
      // Feature: Native AI Multi-modal parsing bypasses messy local PDF.js extraction!
      try {
        const { AiFormatter } = await import('./ai-formatter.js');
        const ai = new AiFormatter();
        if (window.CC?.toast) window.CC.toast.show('Native AI Document Parsing...', 'info');
        
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Str = btoa(binary);
        
        const parsed = await ai.parseDocument(base64Str, 'application/pdf');
        
        if (parsed && typeof parsed === 'object') {
          if (!parsed.sections) parsed.sections = [];
          parsed.sourceFile = file.name;
          parsed.sourceType = 'pdf';
          parsed.fingerprint = this.computeFileFingerprint(bytes);

          // Duplicate check before review
          {
            const gate = await this._duplicateGate(parsed.fingerprint, file.name);
            if (!gate) return null;
            if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
          }

          const confirmed = await this.showFieldMapping(parsed);
          if (!confirmed) return null;
          
          const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'pdf' });
          if (result.verified) this._go(result.route);
          return result.document;
        }
      } catch (err) {
        console.warn('Native AI parse failed, falling back to local text extraction', err);
      }

  /** Prompt for a PDF password (returns string, or null when cancelled). */
  const _promptPDFPassword = (fileName) => {
    const modalApi = window.CC?.modal;
    if (!modalApi || typeof modalApi.show !== 'function') return Promise.resolve(null);
    return new Promise((resolve) => {
      const body = document.createElement('div');
      const msg = document.createElement('p');
      msg.style.cssText = 'font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--space-2);';
      msg.textContent = `"${fileName}" is password-protected. Enter the password to import it. The password never leaves your browser.`;
      body.appendChild(msg);
      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'form-input';
      input.placeholder = 'PDF password';
      input.style.width = '100%';
      input.autocomplete = 'off';
      body.appendChild(input);
      const submit = () => resolve(input.value);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); modalApi.close(); submit(); } });
      modalApi.show({
        title: 'Password Required',
        body, size: 'small',
        actions: [
          { label: 'Cancel', type: 'secondary', handler: () => { resolve(null); } },
          { label: 'Unlock & Import', type: 'primary', handler: () => { submit(); } },
        ],
      });
      setTimeout(() => input.focus(), 50);
    });
  };

      const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/+esm');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      let pdfDoc;
      try {
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      } catch (err) {
        if (err && (err.name === 'PasswordException' || /password/i.test(err.message || ''))) {
          const password = await _promptPDFPassword(file.name);
          if (!password) throw new Error('PDF is password-protected.');
          try {
            pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0), password }).promise;
          } catch (err2) {
            if (err2 && (err2.name === 'PasswordException' || /password|incorrect|invalid/i.test(err2.message || ''))) {
              throw new Error('Wrong PDF password.');
            }
            throw err2;
          }
        } else {
          throw err;
        }
      }

      // Feature 2: progress overlay
      progressOverlay = createElement('div', '', {});
      progressOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;';
      const progressContainer = createElement('div', '', {});
      progressContainer.style.cssText = 'background:var(--bg-primary,#fff);border-bottom:1px solid var(--border-primary,#e2e8f0);padding:12px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);';
      const progressStatus = createElement('span', `Reading PDF... Page 1 of ${pdfDoc.numPages}`, {});
      progressStatus.style.cssText = 'font-size:13px;font-weight:500;color:var(--text-primary,#1a202c);white-space:nowrap;min-width:200px;';
      progressContainer.appendChild(progressStatus);
      const progressBarWrap = createElement('div', '', {});
      progressBarWrap.style.cssText = 'flex:1;height:6px;background:var(--bg-tertiary,#e2e8f0);border-radius:3px;overflow:hidden;';
      const progressBarFill = createElement('div', '', {});
      progressBarFill.style.cssText = 'width:0%;height:100%;background:var(--color-primary,#3b82f6);border-radius:3px;transition:width 0.3s;';
      progressBarWrap.appendChild(progressBarFill);
      progressContainer.appendChild(progressBarWrap);
      progressOverlay.appendChild(progressContainer);
      document.body.appendChild(progressOverlay);

      let twoColumnDetected = false;
      const pages = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        progressStatus.textContent = `Extracting text... Page ${i} of ${pdfDoc.numPages}`;
        progressBarFill.style.width = `${Math.round((i / pdfDoc.numPages) * 80)}%`;
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const content = await page.getTextContent();

        const items = content.items
          .filter(item => item.str && item.str.trim())
          .map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width || 0
          }));

        if (items.length === 0) { pages.push(''); continue; }

        // Detect 2-column layout: check if items cluster into two x-position groups
        const midX = pageWidth / 2;
        const leftItems = items.filter(it => it.x < midX);
        const rightItems = items.filter(it => it.x >= midX);
        const leftRatio = leftItems.length / items.length;
        const isTwoColumn = leftRatio > 0.2 && leftRatio < 0.8 && rightItems.length > 5;

        if (isTwoColumn) twoColumnDetected = true;

        // Group items into lines by similar y-position (within 3px tolerance)
        const groupIntoLines = (itemList) => {
          if (itemList.length === 0) return [];
          const sorted = [...itemList].sort((a, b) => b.y - a.y || a.x - b.x);
          const lines = [];
          let currentLine = [sorted[0]];

          for (let j = 1; j < sorted.length; j++) {
            if (Math.abs(sorted[j].y - currentLine[0].y) <= 3) {
              currentLine.push(sorted[j]);
            } else {
              currentLine.sort((a, b) => a.x - b.x);
              lines.push(currentLine.map(it => it.str).join(' '));
              currentLine = [sorted[j]];
            }
          }
          if (currentLine.length > 0) {
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine.map(it => it.str).join(' '));
          }
          return lines;
        };

        let pageText;
        if (isTwoColumn) {
          const leftLines = groupIntoLines(leftItems);
          const rightLines = groupIntoLines(rightItems);
          pageText = leftLines.join('\n') + '\n\n' + rightLines.join('\n');
        } else {
          pageText = groupIntoLines(items).join('\n');
        }

        pages.push(pageText);
      }

      let fullText = pages.join('\n\n');
      let ocrUsed = false;

      if (!fullText.trim() || fullText.trim().length < 50) {
        // Remove progress bar before OCR dialog (it has its own progress)
        if (progressOverlay) { progressOverlay.remove(); progressOverlay = null; }
        const ocrResult = await this._showOCRDialog(pdfDoc);
        if (!ocrResult) return null;
        fullText = ocrResult;
        ocrUsed = true;
      }

      if (progressOverlay) {
        progressStatus.textContent = 'Parsing sections...';
        progressBarFill.style.width = '90%';
      }

      const parsed = await this._parseTextWithFallback(fullText);
      parsed.sourceFile = file.name;
      parsed.sourceType = 'pdf';
      parsed._rawText = fullText;
      parsed.fingerprint = this.computeFileFingerprint(fullText);
      parsed.twoColumnDetected = twoColumnDetected;
      if (ocrUsed) parsed.ocrUsed = true;

      // Duplicate check before review
      {
        const gate = await this._duplicateGate(parsed.fingerprint, file.name);
        if (!gate) return null;
        if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
      }

      // Remove progress overlay before showing field mapping
      if (progressOverlay) {
        progressBarFill.style.width = '100%';
        progressStatus.textContent = 'Opening review...';
        const overlayToRemove = progressOverlay;
        progressOverlay = null;
        setTimeout(() => { if (overlayToRemove.parentNode) overlayToRemove.remove(); }, 300);
      }

      const confirmed = await this.showFieldMapping(parsed);
      if (!confirmed) return null;

      // Finalize via unified method
      const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'pdf' });
      if (result.verified && window.CC?.router) {
        this._go(result.route);
      }
      return result.document;

    } catch (err) {
      if (progressOverlay && progressOverlay.parentNode) progressOverlay.remove();
      console.error('PDF import failed:', err);
      throw new Error('Failed to read PDF. The file may be corrupted, encrypted, or scanned without a text layer.');
    }
  }

  // ==================== IMAGE IMPORT (Multimodal) ====================
  async importImage(file) {
    if (window.CC?.toast) window.CC.toast.show('Parsing Image with AI...', 'info');
    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter();
      
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      const base64Str = btoa(binary);
      
      const parsed = await ai.parseDocument(base64Str, file.type);
      
      if (parsed && typeof parsed === 'object') {
        if (!parsed.sections) parsed.sections = [];
        parsed.sourceFile = file.name;
        parsed.sourceType = 'image';
        parsed.fingerprint = this.computeFileFingerprint(bytes);

        // Duplicate check before review
        {
          const gate = await this._duplicateGate(parsed.fingerprint, file.name);
          if (!gate) return null;
          if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
        }

        const confirmed = await this.showFieldMapping(parsed);
        if (!confirmed) return null;
        
        const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'image' });
        if (result.verified) this._go(result.route);
        return result.document;
      } else {
        throw new Error('Invalid AI parse result');
      }
    } catch (err) {
      console.warn('AI image parse failed, trying on-device OCR...', err);
      try {
        if (window.CC?.toast) window.CC.toast.show('AI unavailable — reading image with on-device OCR...', 'info');
        const ocrText = await this.runImageOCR(file);
        if (!ocrText || ocrText.trim().length < 10) throw new Error('OCR found no readable text');
        const parsed = await this._parseTextWithFallback(ocrText);
        parsed.sourceFile = file.name;
        parsed.sourceType = 'image';
        parsed._rawText = ocrText;
        parsed.ocrUsed = true;
        parsed.fingerprint = this.computeFileFingerprint(ocrText);

        // Duplicate check before review
        {
          const gate = await this._duplicateGate(parsed.fingerprint, file.name);
          if (!gate) return null;
          if (gate.openDoc) { this._go(`/editor/${gate.openDoc.id}`); return gate.openDoc; }
        }

        const confirmed = await this.showFieldMapping(parsed);
        if (!confirmed) return null;
        const result = await this.finalizeImportedDocument(this.parsedData, { sourceType: 'image' });
        if (result.verified) this._go(result.route);
        return result.document;
      } catch (err2) {
        console.error('Image import failed:', err2);
        if (window.CC?.toast) window.CC.toast.show('Could not read this image. Try a PDF or text version.', 'error');
        throw err2;
      }
    }
  }

  /**
   * OCR for image files (on-device via Tesseract.js CDN).
   * Used as the fallback when AI image parsing is unavailable.
   */
  async runImageOCR(file, language = 'eng') {
    const Tesseract = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm');
    const worker = await Tesseract.createWorker(language, 1);
    try {
      const url = URL.createObjectURL(file);
      try {
        const { data: { text } } = await worker.recognize(url);
        return text || '';
      } finally {
        URL.revokeObjectURL(url);
      }
    } finally {
      await worker.terminate();
    }
  }

  // ==================== DATE PARSING ====================

  _parseDateRange(text) {
    const MONTHS = {
      jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06',
      jul: '07', july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
      oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
    };
    const result = { startMonth: '', startYear: '', endMonth: '', endYear: '', current: false };
    if (!text) return result;
    const t = text.replace(/[–—]/g, '-').replace(/\bto\b/gi, '-');
    const toKey = (s) => MONTHS[(s || '').toLowerCase().replace(/\./g, '').slice(0, 3)] || '';

    const full = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.,]?\s*['']?(\d{4})\s*[-]+\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.,]?\s*['']?(\d{4})/i);
    if (full) { result.startMonth = toKey(full[1]); result.startYear = full[2]; result.endMonth = toKey(full[3]); result.endYear = full[4]; return result; }

    const pres = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.,]?\s*['']?(\d{4})\s*[-]+\s*(present|current|now|ongoing)/i);
    if (pres) { result.startMonth = toKey(pres[1]); result.startYear = pres[2]; result.current = true; return result; }

    const num = t.match(/\b(\d{1,2})\s*[/]\s*(\d{4})\s*[-]+\s*(\d{1,2})\s*[/]\s*(\d{4})/);
    if (num) { result.startMonth = num[1].padStart(2, '0'); result.startYear = num[2]; result.endMonth = num[3].padStart(2, '0'); result.endYear = num[4]; return result; }

    const numPres = t.match(/\b(\d{1,2})\s*[/]\s*(\d{4})\s*[-]+\s*(present|current|now|ongoing)/i);
    if (numPres) { result.startMonth = numPres[1].padStart(2, '0'); result.startYear = numPres[2]; result.current = true; return result; }

    const yr = t.match(/\b((?:19|20)\d{2})\s*[-]+\s*((?:19|20)\d{2}|present|current|now|ongoing)\b/i);
    if (yr) {
      result.startYear = yr[1];
      const end = yr[2].toLowerCase();
      if (['present', 'current', 'now', 'ongoing'].includes(end)) result.current = true;
      else result.endYear = yr[2];
      return result;
    }

    const since = t.match(/\bsince\s+(\d{4})/i);
    if (since) { result.startYear = since[1]; result.current = true; return result; }

    const single = t.match(/\b((?:19|20)\d{2})\b/);
    if (single) result.startYear = single[1];
    if (/\b(present|current|now|ongoing)\b/i.test(t)) result.current = true;
    return result;
  }

  // ==================== OCR SUPPORT ====================

  async _showOCRDialog(pdfDoc) {
    return new Promise((resolve) => {
      const overlay = createElement('div', '', { class: 'import-review-overlay' });
      const panel = createElement('div', '', { class: 'import-review-panel', style: 'max-width: 480px;' });

      const header = createElement('div', '', { class: 'import-review-header' });
      header.appendChild(createElement('h2', 'Scanned PDF Detected', { class: 'import-review-title' }));
      const closeBtn = createElement('button', '×', { class: 'import-review-close', 'aria-label': 'Cancel' });
      closeBtn.addEventListener('click', () => { overlay.remove(); resolve(null); });
      header.appendChild(closeBtn);
      panel.appendChild(header);

      const body = createElement('div', '', { class: 'import-review-body', style: 'padding: 1.5rem;' });
      body.appendChild(createElement('p', 'This PDF appears to be scanned. Run local OCR to extract text?', { style: 'margin-bottom: 1rem;' }));

      const langGroup = createElement('div', '', { class: 'import-field-group' });
      langGroup.appendChild(createElement('label', 'OCR Language:', { class: 'import-field-label' }));
      const langSelect = createElement('select', '', { class: 'import-field-input' });
      const languages = [
        ['eng', 'English'], ['fra', 'French'], ['deu', 'German'], ['spa', 'Spanish'],
        ['ita', 'Italian'], ['por', 'Portuguese'], ['nld', 'Dutch'], ['pol', 'Polish'],
        ['rus', 'Russian'], ['jpn', 'Japanese'], ['chi_sim', 'Chinese (Simplified)'],
        ['chi_tra', 'Chinese (Traditional)'], ['kor', 'Korean'], ['ara', 'Arabic'],
        ['hin', 'Hindi'], ['tur', 'Turkish']
      ];
      languages.forEach(([val, label]) => {
        const opt = createElement('option', label, { value: val });
        if (val === 'eng') opt.selected = true;
        langSelect.appendChild(opt);
      });
      langGroup.appendChild(langSelect);
      body.appendChild(langGroup);
      panel.appendChild(body);

      const footer = createElement('div', '', { class: 'import-review-footer' });
      const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-ghost' });
      cancelBtn.addEventListener('click', () => { overlay.remove(); resolve(null); });
      footer.appendChild(cancelBtn);

      const runBtn = createElement('button', 'Run OCR', { class: 'btn btn-primary' });
      runBtn.addEventListener('click', async () => {
        const language = langSelect.value;
        overlay.remove();
        try {
          const text = await this.runOCR(pdfDoc, language);
          if (!text || !text.trim()) {
            if (window.CC?.toast) window.CC.toast.show('OCR completed but no text was extracted.', 'warning');
            resolve(null);
          } else {
            resolve(text);
          }
        } catch (err) {
          if (err.message === 'OCR cancelled') {
            if (window.CC?.toast) window.CC.toast.show('OCR cancelled.', 'info');
          } else {
            console.error('OCR failed:', err);
            if (window.CC?.toast) window.CC.toast.show('OCR failed: ' + err.message, 'error');
          }
          resolve(null);
        }
      });
      footer.appendChild(runBtn);
      panel.appendChild(footer);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      const escHandler = (e) => {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); resolve(null); }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  async runOCR(pdfDoc, language = 'eng') {
    const Tesseract = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm');

    let cancelled = false;
    const overlay = createElement('div', '', { class: 'import-review-overlay' });
    const panel = createElement('div', '', { class: 'import-review-panel', style: 'max-width: 420px;' });

    const header = createElement('div', '', { class: 'import-review-header' });
    header.appendChild(createElement('h2', 'Running OCR', { class: 'import-review-title' }));
    panel.appendChild(header);

    const body = createElement('div', '', { class: 'import-review-body', style: 'padding: 1.5rem; text-align: center;' });
    const statusText = createElement('p', 'Initializing OCR engine...', { style: 'margin-bottom: 1rem; font-weight: 500;' });
    body.appendChild(statusText);

    const progressBar = createElement('div', '', { style: 'width: 100%; height: 8px; background: var(--color-border, #e2e8f0); border-radius: 4px; overflow: hidden; margin-bottom: 1rem;' });
    const progressFill = createElement('div', '', { style: 'width: 0%; height: 100%; background: var(--color-primary, #3b82f6); border-radius: 4px; transition: width 0.3s;' });
    progressBar.appendChild(progressFill);
    body.appendChild(progressBar);

    panel.appendChild(body);

    const footer = createElement('div', '', { class: 'import-review-footer', style: 'justify-content: center;' });
    const cancelBtn = createElement('button', 'Cancel', { class: 'btn btn-ghost' });
    cancelBtn.addEventListener('click', () => { cancelled = true; });
    footer.appendChild(cancelBtn);
    panel.appendChild(footer);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const DPI_SCALE = 300 / 72;
    const totalPages = pdfDoc.numPages;
    const pageTexts = [];

    try {
      const worker = await Tesseract.createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pageProgress = m.progress || 0;
            const overallProgress = ((pageTexts.length + pageProgress) / totalPages) * 100;
            progressFill.style.width = overallProgress + '%';
          }
        }
      });

      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) {
          await worker.terminate();
          overlay.remove();
          throw new Error('OCR cancelled');
        }

        statusText.textContent = `Processing page ${i} of ${totalPages}...`;
        progressFill.style.width = ((i - 1) / totalPages * 100) + '%';

        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: DPI_SCALE });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const { data: { text } } = await worker.recognize(canvas);
        pageTexts.push(text);

        canvas.width = 0;
        canvas.height = 0;
      }

      await worker.terminate();
      overlay.remove();

      if (window.CC?.toast) window.CC.toast.show(`OCR completed: ${totalPages} page(s) processed.`, 'success');
      return pageTexts.join('\n\n');

    } catch (err) {
      overlay.remove();
      throw err;
    }
  }

  // ==================== HTML CONTENT PARSER ====================

  parseHTMLContent(container) {
    const parsed = { name: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '', sections: [] };
    let currentSection = null;

    // Reuse the same comprehensive map as parsePlainText
    const sectionMap = {
      'experience': 'experience', 'work experience': 'experience', 'professional experience': 'experience',
      'employment': 'experience', 'employment history': 'experience', 'work history': 'experience',
      'career history': 'experience', 'relevant experience': 'experience',
      'education': 'education', 'academic background': 'education', 'academic history': 'education',
      'education  details': 'education', 'educational background': 'education', 'qualifications': 'education',
      'qualification': 'education', 'academic qualifications': 'education', 'academic details': 'education',
      'skills': 'skills', 'technical skills': 'skills', 'core competencies': 'skills', 'competencies': 'skills',
      'key skills': 'skills', 'tools  technologies': 'skills', 'technical proficiencies': 'skills',
      'professional skills': 'skills', 'areas of expertise': 'skills', 'soft skills': 'skills',
      'personal soft skills': 'skills', 'personal softskills': 'skills', 'it skills': 'skills',
      'projects': 'projects', 'portfolio': 'projects', 'selected projects': 'projects',
      'key projects': 'projects', 'key project portfolio': 'projects', 'project portfolio': 'projects',
      'certifications': 'certifications', 'certificates': 'certifications', 'licenses': 'certifications',
      'licenses  certifications': 'certifications', 'professional certifications': 'certifications',
      'training  certifications': 'certifications', 'credentials': 'certifications',
      'summary': 'summary', 'professional summary': 'summary', 'objective': 'summary',
      'career objective': 'summary', 'profile': 'summary', 'professional profile': 'summary',
      'profile summary': 'summary', 'career summary': 'summary', 'overview': 'summary',
      'awards': 'awards', 'achievements': 'awards', 'honors': 'awards', 'honors  awards': 'awards',
      'key achievements': 'awards', 'accomplishments': 'awards',
      'publications': 'publications', 'research': 'publications', 'papers': 'publications',
      'volunteer': 'volunteer', 'volunteer experience': 'volunteer', 'community service': 'volunteer',
      'languages': 'languages', 'language skills': 'languages',
      'interests': 'interests', 'hobbies': 'interests', 'hobbies  interests': 'interests',
      'personal interests': 'interests', 'activities': 'interests',
      'references': 'references', 'professional references': 'references',
      'training': 'certifications', 'professional development': 'certifications',
      'internships': 'experience', 'leadership': 'experience', 'leadership experience': 'experience',
      'memberships': 'custom', 'professional memberships': 'custom', 'affiliations': 'custom',
      'personal information': 'custom', 'additional information': 'custom', 'details': 'custom',
      'declaration': 'custom', 'contact': 'custom', 'contact information': 'custom',
    };

    const children = container.children;
    let firstHeadingFound = false;

    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      const tag = el.tagName?.toLowerCase();
      const text = (el.textContent || '').trim();

      if (!text) continue;

      // First non-heading text is likely the name
      if (!firstHeadingFound && !parsed.name && text.length < 60 && !text.includes('@')) {
        if (tag === 'h1' || tag === 'h2' || (tag === 'p' && i < 3)) {
          parsed.name = text;
          firstHeadingFound = true;
          continue;
        }
      }

      // Shared contact extraction from early paragraphs
      if (!parsed.email || !parsed.phone || !parsed.linkedin) {
        try {
          const contact = extractContact(text);
          if (!parsed.email && contact.email) parsed.email = contact.email;
          if (!parsed.phone && contact.phone) parsed.phone = contact.phone;
          if (!parsed.linkedin && contact.linkedin) parsed.linkedin = contact.linkedin;
          if (!parsed.github && contact.github) parsed.github = contact.github;
          if (!parsed.website && contact.website) parsed.website = contact.website;
          if (!parsed.location && contact.location) parsed.location = contact.location;
        } catch { /* keep inline fallback below */ }
      }
      if (!parsed.email) {
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) parsed.email = emailMatch[0];
      }

      // Detect section headings — real heading tags
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        const lower = text.toLowerCase().replace(/[^a-z\s&]/g, '').trim();
        const mappedType = sectionMap[lower] || 'custom';
        currentSection = { title: text, type: mappedType, content: [] };
        parsed.sections.push(currentSection);
        continue;
      }

      // Detect bold-only paragraphs as headings (common in DOCX without proper heading styles)
      if (tag === 'p' && text.length <= 50 && text.length >= 2) {
        const isBoldOnly = el.querySelector('strong, b') && el.textContent.trim() === (el.querySelector('strong, b')?.textContent || '').trim();
        const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text) && text.length <= 40;
        if (isBoldOnly || isAllCaps) {
          const lower = text.toLowerCase().replace(/[^a-z\s&]/g, '').trim();
          const mappedType = sectionMap[lower] || 'custom';
          currentSection = { title: text, type: mappedType, content: [] };
          parsed.sections.push(currentSection);
          continue;
        }
      }

      // Add content to current section
      if (currentSection) {
        if (tag === 'ul' || tag === 'ol') {
          const items = el.querySelectorAll('li');
          items.forEach(li => { if (li.textContent.trim()) currentSection.content.push(li.textContent.trim()); });
        } else {
          currentSection.content.push(text);
        }
      }
    }

    return parsed;
  }
}

export default ImportManager;

