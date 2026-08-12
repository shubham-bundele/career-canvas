import { atsTemplates } from './ats-templates.js';
import { professionalTemplates } from './professional-templates.js';
import { technicalTemplates } from './technical-templates.js';
import { creativeTemplates } from './creative-templates.js';
import { coverLetterTemplates } from './cover-letter-templates.js';
import { referenceTemplates } from './reference-templates.js';
import { studentTemplates } from './student-templates.js';
import { executiveTemplates } from './executive-templates.js';
import { academicTemplates } from './academic-templates.js';

export const allTemplates = [
  ...atsTemplates,
  ...professionalTemplates,
  ...technicalTemplates,
  ...creativeTemplates,
  ...coverLetterTemplates,
  ...referenceTemplates,
  ...studentTemplates,
  ...executiveTemplates,
  ...academicTemplates
];

export function registerAllTemplates(engine) {
  allTemplates.forEach(template => {
    engine.register(template.id, template);
  });
  return allTemplates;
}

export {
  atsTemplates,
  professionalTemplates,
  technicalTemplates,
  creativeTemplates,
  coverLetterTemplates,
  referenceTemplates,
  studentTemplates,
  executiveTemplates,
  academicTemplates
};

export const templateStats = {
  ats: atsTemplates.length,
  professional: professionalTemplates.length,
  technical: technicalTemplates.length,
  creative: creativeTemplates.length,
  coverLetter: coverLetterTemplates.length,
  references: referenceTemplates.length,
  student: studentTemplates.length,
  executive: executiveTemplates.length,
  academic: academicTemplates.length,
  total: allTemplates.length
};
