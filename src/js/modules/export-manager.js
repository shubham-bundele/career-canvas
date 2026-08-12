/**
 * Export Manager Module
 * Handles document export in various formats
 */

import { sanitizeFilename, encodeHTML } from '../utils/sanitize.js';
import { formatDate } from '../utils/format.js';
import eventBus, { EVENTS } from '../core/events.js';
import { STORES } from '../core/db.js';
import toast from './toast.js';

/**
 * Export formats
 */
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  PLAIN_TEXT: 'txt',
  JSON: 'json',
  MARKDOWN: 'md',
  HTML: 'html'
};

/**
 * ExportManager class
 */
export class ExportManager {
  constructor(dbManager) {
    this.db = dbManager;
    this._currentExportId = {};
  }

  /**
   * Exports document as PDF (triggers print dialog)
   * @param {HTMLElement} documentEl - Document element to print
   * @param {Object} document - Document data
   */
  exportPDF(documentEl, docData) {
    if (!documentEl) {
      toast.error('Cannot export: no document element provided');
      return;
    }

    try {
      eventBus.emit(EVENTS.EXPORT_START, { format: EXPORT_FORMATS.PDF });

      // Store current title
      const originalTitle = window.document.title;

      // Set document title for PDF filename
      const filename = this.generateFilename(docData, 'pdf');
      window.document.title = filename;

      // Add print styles
      const printStylesApplied = this.applyPrintStyles(documentEl);

      // Trigger print dialog
      window.print();

      // Restore title
      window.document.title = originalTitle;

      // Remove print styles
      if (printStylesApplied) {
        this.removePrintStyles();
      }

      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: EXPORT_FORMATS.PDF });
      toast.success('Print dialog opened');

    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export as PDF');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: EXPORT_FORMATS.PDF, error });
    }
  }

  /**
   * Applies print styles to document
   * @param {HTMLElement} documentEl - Document element
   * @returns {boolean} True if styles were applied
   */
  applyPrintStyles(documentEl) {
    if (!documentEl) return false;

    // Add print-ready class
    documentEl.classList.add('print-ready');

    return true;
  }

  /**
   * Removes print styles
   */
  removePrintStyles() {
    const elements = document.querySelectorAll('.print-ready');
    elements.forEach(el => el.classList.remove('print-ready'));
  }

  /**
   * Exports document as plain text
   * @param {Object} document - Document data
   */
  exportPlainText(document) {
    try {
      eventBus.emit(EVENTS.EXPORT_START, { format: EXPORT_FORMATS.PLAIN_TEXT });

      const text = this.convertToPlainText(document);
      const filename = this.generateFilename(document, 'txt');

      this.downloadFile(text, filename, 'text/plain');

      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: EXPORT_FORMATS.PLAIN_TEXT });
      toast.success('Exported as plain text');

    } catch (error) {
      console.error('Plain text export failed:', error);
      toast.error('Failed to export as plain text');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: EXPORT_FORMATS.PLAIN_TEXT, error });
    }
  }

  /**
   * Exports document as JSON
   * @param {Object} document - Document data
   */
  exportJSON(document) {
    try {
      eventBus.emit(EVENTS.EXPORT_START, { format: EXPORT_FORMATS.JSON });

      const envelope = {
        application: 'CareerCanvas',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        document
      };
      const json = JSON.stringify(envelope, null, 2);
      const filename = this.generateFilename(document, 'json');

      this.downloadFile(json, filename, 'application/json');

      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: EXPORT_FORMATS.JSON });
      toast.success('Exported as JSON');

    } catch (error) {
      console.error('JSON export failed:', error);
      toast.error('Failed to export as JSON');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: EXPORT_FORMATS.JSON, error });
    }
  }

  /**
   * Exports document as Markdown
   * @param {Object} document - Document data
   */
  exportMarkdown(document) {
    try {
      eventBus.emit(EVENTS.EXPORT_START, { format: EXPORT_FORMATS.MARKDOWN });

      const markdown = this.convertToMarkdown(document);
      const filename = this.generateFilename(document, 'md');

      this.downloadFile(markdown, filename, 'text/markdown');

      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: EXPORT_FORMATS.MARKDOWN });
      toast.success('Exported as Markdown');

    } catch (error) {
      console.error('Markdown export failed:', error);
      toast.error('Failed to export as Markdown');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: EXPORT_FORMATS.MARKDOWN, error });
    }
  }

  /**
   * Exports document as HTML
   * @param {Object} document - Document data
   * @param {string} renderedHTML - Rendered HTML content
   */
  exportHTML(document, renderedHTML) {
    try {
      eventBus.emit(EVENTS.EXPORT_START, { format: EXPORT_FORMATS.HTML });

      const html = this.wrapHTMLDocument(renderedHTML, document);
      const filename = this.generateFilename(document, 'html');

      this.downloadFile(html, filename, 'text/html');

      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: EXPORT_FORMATS.HTML });
      toast.success('Exported as HTML');

    } catch (error) {
      console.error('HTML export failed:', error);
      toast.error('Failed to export as HTML');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: EXPORT_FORMATS.HTML, error });
    }
  }

  /**
   * Exports all documents and settings as one JSON file
   */
  async exportAllData() {
    try {
      eventBus.emit(EVENTS.EXPORT_START, { format: 'all-data' });

      const allStoreNames = Object.values(STORES);
      const storeData = {};
      const recordCounts = {};
      const errors = {};

      for (const storeName of allStoreNames) {
        try {
          const records = await this.db.getAll(storeName);
          storeData[storeName] = records;
          recordCounts[storeName] = records.length;
        } catch (err) {
          console.error(`Failed to export store "${storeName}":`, err);
          storeData[storeName] = [];
          recordCounts[storeName] = 0;
          errors[storeName] = err.message || String(err);
        }
      }

      const settings = this.getSettings();

      const exportData = {
        application: 'CareerCanvas',
        version: 1,
        exportDate: new Date().toISOString(),
        recordCounts,
        settings,
        ...storeData
      };

      if (Object.keys(errors).length > 0) {
        exportData.exportErrors = errors;
      }

      const json = JSON.stringify(exportData, null, 2);
      const filename = `CareerCanvas_Backup_${formatDate(new Date(), 'iso')}.json`;

      this.downloadFile(json, filename, 'application/json');

      const totalRecords = Object.values(recordCounts).reduce((sum, c) => sum + c, 0);
      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: 'all-data' });
      toast.success(`Exported ${totalRecords} records from ${allStoreNames.length} stores`);

    } catch (error) {
      console.error('Export all data failed:', error);
      toast.error('Failed to export all data');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: 'all-data', error });
    }
  }

  /**
   * Copies text to clipboard
   * @param {string} text - Text to copy
   * @param {string} format - Format description
   */
  async copyToClipboard(text, format = 'text') {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${format} to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  }

  /**
   * Generates a professional filename
   * @param {Object} document - Document data
   * @param {string} extension - File extension
   * @returns {string} Sanitized filename
   */
  generateFilename(document, extension) {
    const parts = [];

    // Add name if available
    if (document.personalInfo && document.personalInfo.fullName) {
      const nameParts = document.personalInfo.fullName.split(' ');
      parts.push(...nameParts);
    }

    // Add target role if available
    if (document.targetRole) {
      parts.push(document.targetRole);
    }

    // Add document type
    if (document.type) {
      parts.push(document.type.charAt(0).toUpperCase() + document.type.slice(1));
    } else {
      parts.push('Resume');
    }

    // Fallback to document name
    if (parts.length === 0 && document.name) {
      parts.push(document.name);
    }

    // Create filename
    const filename = parts.join('_');
    const sanitized = sanitizeFilename(filename);

    return `${sanitized}.${extension}`;
  }

  /**
   * Triggers browser download of file
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  downloadFile(content, filename, mimeType) {
    // Check for duplicate concurrent export of same format
    if (this._currentExportId[mimeType]) {
      console.warn(`Export already in progress for format: ${mimeType}`);
      toast.error('An export of this format is already in progress');
      return;
    }

    // Generate export operation ID
    const exportId = Math.random().toString(36).substring(2, 10);
    this._currentExportId[mimeType] = exportId;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup and reset export ID
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (this._currentExportId[mimeType] === exportId) {
        delete this._currentExportId[mimeType];
      }
    }, 100);
  }

  /**
   * Validates document before export
   * @param {Object} document - Document data
   * @returns {Object} Validation result
   */
  validateExport(document) {
    const warnings = [];
    const errors = [];

    const pi = document.personalInfo || {};
    if (!pi.fullName) {
      warnings.push('Name is missing');
    }

    if (!pi.email && !pi.phone) {
      warnings.push('No contact information provided');
    }

    // Count sections with content
    let contentSections = 0;
    const valSections = Array.isArray(document.sections) ? document.sections : [];
    valSections.forEach(section => {
      if (section && section.items && section.items.length > 0) {
        contentSections++;
      }
    });

    if (contentSections === 0) {
      warnings.push('No content sections found');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Converts document to plain text
   * @param {Object} document - Document data
   * @returns {string} Plain text content
   */
  convertToPlainText(document) {
    const lines = [];

    // Personal info
    if (document.personalInfo) {
      const pi = document.personalInfo;

      if (pi.fullName) {
        lines.push(pi.fullName.toUpperCase());
        lines.push('='.repeat(pi.fullName.length));
        lines.push('');
      }

      if (pi.professionalTitle) {
        lines.push(pi.professionalTitle);
        lines.push('');
      }

      const contactInfo = [];
      if (pi.email) contactInfo.push(`Email: ${pi.email}`);
      if (pi.phone) contactInfo.push(`Phone: ${pi.phone}`);
      if (pi.city || pi.state) {
        const location = [pi.city, pi.state].filter(Boolean).join(', ');
        contactInfo.push(`Location: ${location}`);
      }
      if (pi.linkedinUrl) contactInfo.push(`LinkedIn: ${pi.linkedinUrl}`);

      lines.push(...contactInfo);
      lines.push('');
    }

    // Sections
    const sections = Array.isArray(document.sections) ? document.sections : [];
    sections.forEach(section => {
      if (!section || section.visible === false) return;

      lines.push('');
      lines.push(section.title.toUpperCase());
      lines.push('-'.repeat(section.title.length));
      lines.push('');

      // Section-level content for text-type sections
      if (section.content) {
        lines.push(section.content);
        lines.push('');
      }

      if (section.items && section.items.length > 0) {
        section.items.forEach(item => {
          if (item.hidden) return;

          // Handle different item types
          if (item.jobTitle && item.company) {
            // Work experience
            lines.push(`${item.jobTitle} - ${item.company}`);
            if (item.startYear) {
              const start = `${item.startMonth || ''}${item.startMonth ? '/' : ''}${item.startYear}`;
              const end = item.currentlyWorking ? 'Present' : `${item.endMonth || ''}${item.endMonth ? '/' : ''}${item.endYear || ''}`;
              lines.push(`${start} - ${end}`);
            }
            if (item.achievements && item.achievements.length > 0) {
              item.achievements.forEach(achievement => {
                if (achievement.text) {
                  lines.push(`  • ${achievement.text}`);
                }
              });
            }
            lines.push('');
          } else if (item.degree && item.institution) {
            // Education
            lines.push(`${item.degree} - ${item.institution}`);
            if (item.endDate) {
              lines.push(formatDate(item.endDate, 'short'));
            }
            lines.push('');
          } else if (item.projectName) {
            // Projects
            lines.push(item.projectName);
            if (item.summary) {
              lines.push(item.summary);
            }
            if (item.technologies) {
              lines.push(`Technologies: ${item.technologies}`);
            }
            lines.push('');
          } else if (item.language) {
            // Languages
            let langLine = item.language;
            if (item.proficiency) {
              langLine += ` (${item.proficiency})`;
            }
            lines.push(langLine);
            lines.push('');
          } else if (item.name && item.issuingOrganization) {
            // Certifications
            lines.push(item.name);
            lines.push(`Issued by: ${item.issuingOrganization}`);
            if (item.issueDate) {
              lines.push(`Date: ${item.issueDate}`);
            }
            lines.push('');
          } else if (item.name && (item.category || item.proficiency)) {
            // Skills
            let skillLine = item.name;
            if (item.category) {
              skillLine += ` [${item.category}]`;
            }
            if (item.proficiency) {
              skillLine += ` - ${item.proficiency}`;
            }
            lines.push(`  • ${skillLine}`);
          } else if (item.text) {
            // Custom section items
            lines.push(item.text);
            lines.push('');
          } else if (item.name) {
            // Generic item with name
            lines.push(item.name);
            if (item.description) {
              lines.push(item.description);
            }
            lines.push('');
          }
        });
      }
    });

    // Cover letter
    if (document.coverLetter) {
      const cl = document.coverLetter;
      lines.push('');
      lines.push('COVER LETTER');
      lines.push('-'.repeat(12));
      lines.push('');
      if (cl.salutation) {
        lines.push(cl.salutation);
        lines.push('');
      }
      if (cl.body) {
        lines.push(cl.body);
        lines.push('');
      }
      if (cl.closing) {
        lines.push(cl.closing);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Converts document to Markdown
   * @param {Object} document - Document data
   * @returns {string} Markdown content
   */
  convertToMarkdown(document) {
    const lines = [];

    // Personal info
    if (document.personalInfo) {
      const pi = document.personalInfo;

      if (pi.fullName) {
        lines.push(`# ${pi.fullName}`);
        lines.push('');
      }

      if (pi.professionalTitle) {
        lines.push(`**${pi.professionalTitle}**`);
        lines.push('');
      }

      const contactInfo = [];
      if (pi.email) contactInfo.push(`📧 ${pi.email}`);
      if (pi.phone) contactInfo.push(`📱 ${pi.phone}`);
      if (pi.city || pi.state) {
        const location = [pi.city, pi.state].filter(Boolean).join(', ');
        contactInfo.push(`📍 ${location}`);
      }
      if (pi.linkedinUrl) contactInfo.push(`[LinkedIn](${pi.linkedinUrl})`);

      if (contactInfo.length > 0) {
        lines.push(contactInfo.join(' | '));
        lines.push('');
      }
    }

    // Sections
    const mdSections = Array.isArray(document.sections) ? document.sections : [];
    mdSections.forEach(section => {
      if (!section || section.visible === false) return;

      lines.push('---');
      lines.push('');
      lines.push(`## ${section.title}`);
      lines.push('');

      // Section-level content for text-type sections
      if (section.content) {
        lines.push(section.content);
        lines.push('');
      }

      if (section.items && section.items.length > 0) {
        section.items.forEach(item => {
          if (item.hidden) return;

          if (item.jobTitle && item.company) {
            lines.push(`### ${item.jobTitle} - ${item.company}`);
            if (item.startYear) {
              const start = `${item.startMonth || ''}${item.startMonth ? '/' : ''}${item.startYear}`;
              const end = item.currentlyWorking ? 'Present' : `${item.endMonth || ''}${item.endMonth ? '/' : ''}${item.endYear || ''}`;
              lines.push(`*${start} - ${end}*`);
            }
            lines.push('');
            if (item.achievements && item.achievements.length > 0) {
              item.achievements.forEach(achievement => {
                if (achievement.text) {
                  lines.push(`- ${achievement.text}`);
                }
              });
              lines.push('');
            }
          } else if (item.degree && item.institution) {
            lines.push(`### ${item.degree}`);
            lines.push(`**${item.institution}**`);
            if (item.endDate) {
              lines.push(`*${formatDate(item.endDate, 'short')}*`);
            }
            lines.push('');
          } else if (item.projectName) {
            // Projects
            if (item.url) {
              lines.push(`### [${item.projectName}](${item.url})`);
            } else {
              lines.push(`### ${item.projectName}`);
            }
            if (item.summary) {
              lines.push(item.summary);
            }
            if (item.technologies) {
              lines.push('');
              lines.push(`**Technologies:** ${item.technologies}`);
            }
            lines.push('');
          } else if (item.language) {
            // Languages
            let langLine = `- **${item.language}**`;
            if (item.proficiency) {
              langLine += ` - ${item.proficiency}`;
            }
            lines.push(langLine);
          } else if (item.name && item.issuingOrganization) {
            // Certifications
            lines.push(`- **${item.name}** - ${item.issuingOrganization}`);
            if (item.issueDate) {
              lines.push(`  *${item.issueDate}*`);
            }
          } else if (item.name && (item.category || item.proficiency)) {
            // Skills
            let skillLine = `- ${item.name}`;
            if (item.category) {
              skillLine += ` *(${item.category})*`;
            }
            if (item.proficiency) {
              skillLine += ` - ${item.proficiency}`;
            }
            lines.push(skillLine);
          } else if (item.text) {
            // Custom section items
            lines.push(item.text);
            lines.push('');
          } else if (item.name) {
            // Generic item with name
            lines.push(`- ${item.name}`);
            if (item.description) {
              lines.push(`  ${item.description}`);
            }
          }
        });
        lines.push('');
      }
    });

    // Cover letter
    if (document.coverLetter) {
      const cl = document.coverLetter;
      lines.push('---');
      lines.push('');
      lines.push('## Cover Letter');
      lines.push('');
      if (cl.salutation) {
        lines.push(cl.salutation);
        lines.push('');
      }
      if (cl.body) {
        lines.push(cl.body);
        lines.push('');
      }
      if (cl.closing) {
        lines.push(cl.closing);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Wraps HTML content in a complete HTML document
   * @param {string} content - HTML content
   * @param {Object} document - Document data
   * @returns {string} Complete HTML document
   */
  wrapHTMLDocument(content, document) {
    const title = document.personalInfo?.fullName || document.name || 'Resume';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${encodeHTML(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    @media print {
      body {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Exports only selected IndexedDB stores
   * @param {string[]} storeNames - Array of store names to export
   * @returns {Promise<void>}
   */
  async exportSelectedStores(storeNames) {
    try {
      if (!Array.isArray(storeNames) || storeNames.length === 0) {
        toast.error('No stores selected for export');
        return;
      }

      const validStoreNames = Object.values(STORES);
      const invalid = storeNames.filter(name => !validStoreNames.includes(name));
      if (invalid.length > 0) {
        toast.error(`Invalid store names: ${invalid.join(', ')}`);
        return;
      }

      eventBus.emit(EVENTS.EXPORT_START, { format: 'selected-stores' });

      const storeData = {};
      const recordCounts = {};
      const errors = {};

      for (const storeName of storeNames) {
        try {
          const records = await this.db.getAll(storeName);
          storeData[storeName] = records;
          recordCounts[storeName] = records.length;
        } catch (err) {
          console.error(`Failed to export store "${storeName}":`, err);
          storeData[storeName] = [];
          recordCounts[storeName] = 0;
          errors[storeName] = err.message || String(err);
        }
      }

      const exportData = {
        application: 'CareerCanvas',
        version: 1,
        exportDate: new Date().toISOString(),
        exportedStores: storeNames,
        recordCounts,
        ...storeData
      };

      if (Object.keys(errors).length > 0) {
        exportData.exportErrors = errors;
      }

      const json = JSON.stringify(exportData, null, 2);
      const filename = `CareerCanvas_Partial_${formatDate(new Date(), 'iso')}.json`;

      this.downloadFile(json, filename, 'application/json');

      const totalRecords = Object.values(recordCounts).reduce((sum, c) => sum + c, 0);
      eventBus.emit(EVENTS.EXPORT_COMPLETE, { format: 'selected-stores' });
      toast.success(`Exported ${totalRecords} records from ${storeNames.length} stores`);

    } catch (error) {
      console.error('Selective export failed:', error);
      toast.error('Failed to export selected stores');
      eventBus.emit(EVENTS.EXPORT_ERROR, { format: 'selected-stores', error });
    }
  }

  /**
   * Gets settings from localStorage
   * @returns {Object} Settings object
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
}

export default ExportManager;
