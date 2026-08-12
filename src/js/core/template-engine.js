/**
 * Template Engine
 * Manages template registration, rendering, and filtering
 */

import { encodeHTML } from '../utils/sanitize.js';

/**
 * Template Engine Class
 * Handles template registration and rendering
 */
export class TemplateEngine {
  constructor() {
    this.templates = new Map();
  }

  /**
   * Register a template
   * @param {string} templateId - Unique template identifier
   * @param {Object} templateDef - Template definition object
   */
  register(templateId, templateDef) {
    if (!templateId || !templateDef) {
      throw new Error('Template ID and definition are required');
    }

    if (!templateDef.render || typeof templateDef.render !== 'function') {
      throw new Error('Template definition must include a render function');
    }

    const template = {
      id: templateId,
      name: templateDef.name || templateId,
      description: templateDef.description || '',
      category: templateDef.category || 'general',
      docTypes: templateDef.docTypes || ['resume'],
      atsLevel: templateDef.atsLevel || 'medium',
      columnCount: templateDef.columnCount || 1,
      photoSupport: templateDef.photoSupport !== false,
      supportedPageSizes: templateDef.supportedPageSizes || ['letter', 'a4'],
      recommendedIndustries: templateDef.recommendedIndustries || [],
      recommendedLevels: templateDef.recommendedLevels || [],
      colorPresets: templateDef.colorPresets || [],
      fontPresets: templateDef.fontPresets || [],
      spacingPresets: templateDef.spacingPresets || [],
      render: templateDef.render
    };

    this.templates.set(templateId, template);
  }

  /**
   * Register multiple templates at once
   * @param {Array} templateArray - Array of template definitions
   */
  registerMultiple(templateArray) {
    if (!Array.isArray(templateArray)) {
      throw new Error('Templates must be provided as an array');
    }

    templateArray.forEach(template => {
      this.register(template.id, template);
    });
  }

  /**
   * Render a template
   * @param {string} templateId - Template identifier
   * @param {Object} documentData - Document data (personal info, sections, etc.)
   * @param {Object} designSettings - Design settings (fonts, colors, spacing, etc.)
   * @returns {string} Rendered HTML string
   */
  render(templateId, documentData, designSettings = {}) {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    if (!documentData) {
      throw new Error('Document data is required');
    }

    try {
      return template.render(documentData, designSettings);
    } catch (error) {
      console.error(`Error rendering template '${templateId}':`, error);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Get all registered templates
   * @returns {Array} Array of template definitions
   */
  getAll() {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template identifier
   * @returns {Object|null} Template definition or null if not found
   */
  getById(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get templates by category
   * @param {string} category - Category name (ats, professional, creative, technical)
   * @returns {Array} Array of matching templates
   */
  getByCategory(category) {
    return this.getAll().filter(template => template.category === category);
  }

  /**
   * Get templates by document type
   * @param {string} docType - Document type (resume, cover-letter, references)
   * @returns {Array} Array of matching templates
   */
  getByDocType(docType) {
    return this.getAll().filter(template =>
      template.docTypes.includes(docType)
    );
  }

  /**
   * Get templates by ATS level
   * @param {string} atsLevel - ATS optimization level (high, medium, low, none)
   * @returns {Array} Array of matching templates
   */
  getByAtsLevel(atsLevel) {
    return this.getAll().filter(template => template.atsLevel === atsLevel);
  }

  /**
   * Get templates by industry
   * @param {string} industry - Industry name
   * @returns {Array} Array of matching templates
   */
  getByIndustry(industry) {
    return this.getAll().filter(template =>
      template.recommendedIndustries.length === 0 ||
      template.recommendedIndustries.includes(industry)
    );
  }

  /**
   * Get templates by experience level
   * @param {string} level - Experience level (entry, mid, senior, executive)
   * @returns {Array} Array of matching templates
   */
  getByLevel(level) {
    return this.getAll().filter(template =>
      template.recommendedLevels.length === 0 ||
      template.recommendedLevels.includes(level)
    );
  }

  /**
   * Search templates by multiple criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Array of matching templates
   */
  search(criteria = {}) {
    let results = this.getAll();

    if (criteria.category) {
      results = results.filter(t => t.category === criteria.category);
    }

    if (criteria.docType) {
      results = results.filter(t => t.docTypes.includes(criteria.docType));
    }

    if (criteria.atsLevel) {
      results = results.filter(t => t.atsLevel === criteria.atsLevel);
    }

    if (criteria.industry) {
      results = results.filter(t =>
        t.recommendedIndustries.length === 0 ||
        t.recommendedIndustries.includes(criteria.industry)
      );
    }

    if (criteria.level) {
      results = results.filter(t =>
        t.recommendedLevels.length === 0 ||
        t.recommendedLevels.includes(criteria.level)
      );
    }

    if (criteria.columnCount) {
      results = results.filter(t => t.columnCount === criteria.columnCount);
    }

    if (criteria.photoSupport !== undefined) {
      results = results.filter(t => t.photoSupport === criteria.photoSupport);
    }

    return results;
  }

  /**
   * Get template count
   * @returns {number} Number of registered templates
   */
  count() {
    return this.templates.size;
  }

  /**
   * Clear all templates
   */
  clear() {
    this.templates.clear();
  }

  /**
   * Unregister a template
   * @param {string} templateId - Template identifier
   * @returns {boolean} True if template was removed
   */
  unregister(templateId) {
    return this.templates.delete(templateId);
  }
}

// Create singleton instance
export const templateEngine = new TemplateEngine();

// Export for testing
export default templateEngine;
