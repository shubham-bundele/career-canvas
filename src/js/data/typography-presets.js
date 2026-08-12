/**
 * Typography Presets
 * Pre-configured design settings for common resume styles.
 */

export const typographyPresets = [
  {
    id: 'ats-clean',
    name: 'ATS Clean',
    description: 'Maximum ATS compatibility. Simple, scannable.',
    preview: { font: 'Arial', color: '#000000' },
    settings: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 11,
      nameSize: 22,
      headingSize: 13,
      lineHeight: 1.4,
      sectionSpacing: 14,
      paragraphSpacing: 6,
      accentColor: '#000000',
      textColor: '#1a1a1a',
    }
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean modern look with blue accents.',
    preview: { font: 'Calibri', color: '#2563eb' },
    settings: {
      fontFamily: 'Calibri, Arial, sans-serif',
      fontSize: 11,
      nameSize: 26,
      headingSize: 14,
      lineHeight: 1.5,
      sectionSpacing: 16,
      paragraphSpacing: 8,
      accentColor: '#2563eb',
      textColor: '#1f2937',
    }
  },
  {
    id: 'executive-serif',
    name: 'Executive Serif',
    description: 'Elegant serif typography for senior roles.',
    preview: { font: 'Georgia', color: '#1e3a5f' },
    settings: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 11.5,
      nameSize: 28,
      headingSize: 14,
      lineHeight: 1.55,
      sectionSpacing: 18,
      paragraphSpacing: 8,
      accentColor: '#1e3a5f',
      textColor: '#111827',
    }
  },
  {
    id: 'technical-compact',
    name: 'Technical Compact',
    description: 'Dense layout for technical resumes. Fits more content.',
    preview: { font: 'Verdana', color: '#334155' },
    settings: {
      fontFamily: 'Verdana, Geneva, sans-serif',
      fontSize: 10,
      nameSize: 20,
      headingSize: 12,
      lineHeight: 1.35,
      sectionSpacing: 10,
      paragraphSpacing: 4,
      accentColor: '#334155',
      textColor: '#1e293b',
    }
  },
  {
    id: 'elegant-minimal',
    name: 'Elegant Minimal',
    description: 'Minimalist with generous whitespace.',
    preview: { font: 'Helvetica', color: '#6b7280' },
    settings: {
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: 11,
      nameSize: 30,
      headingSize: 12,
      lineHeight: 1.6,
      sectionSpacing: 22,
      paragraphSpacing: 10,
      accentColor: '#6b7280',
      textColor: '#374151',
    }
  },
  {
    id: 'graduate-friendly',
    name: 'Graduate Friendly',
    description: 'Warm and approachable for new graduates.',
    preview: { font: 'Trebuchet MS', color: '#059669' },
    settings: {
      fontFamily: '"Trebuchet MS", Arial, sans-serif',
      fontSize: 11,
      nameSize: 24,
      headingSize: 13,
      lineHeight: 1.5,
      sectionSpacing: 16,
      paragraphSpacing: 8,
      accentColor: '#059669',
      textColor: '#1f2937',
    }
  },
  {
    id: 'academic-formal',
    name: 'Academic Formal',
    description: 'Traditional academic style for CVs and research.',
    preview: { font: 'Times New Roman', color: '#1e293b' },
    settings: {
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: 12,
      nameSize: 24,
      headingSize: 13,
      lineHeight: 1.5,
      sectionSpacing: 14,
      paragraphSpacing: 6,
      accentColor: '#1e293b',
      textColor: '#0f172a',
    }
  }
];

export function getPresetById(id) {
  return typographyPresets.find(p => p.id === id) || null;
}
