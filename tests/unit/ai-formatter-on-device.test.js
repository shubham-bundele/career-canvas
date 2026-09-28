import { describe, it, expect, beforeEach } from 'vitest';
import { AiFormatter } from '../../src/js/modules/ai-formatter.js';
import { centralAI } from '../../src/js/core/central-ai.js';
import { NLPExtractor } from '../../src/js/utils/nlp-extractor.js';

function stubStorage(values = {}) {
  const store = { ...values };
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  return store;
}

describe('AiFormatter on-device zero-key processing', () => {
  beforeEach(() => {
    stubStorage({});
  });

  it('reports isConfigured as true due to built-in zero-key processing engine', () => {
    expect(AiFormatter.isConfigured()).toBe(true);
  });

  it('improves bullet point offline without throwing API key errors', async () => {
    const ai = new AiFormatter();
    const result = await ai.improveBulletPoint('worked on react application and updated components');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan('worked on react application and updated components'.length);
    expect(/Spearheaded|Architected|Engineered|Validated|Optimized/.test(result)).toBe(true);
  });

  it('generates role-specific bullets on-device without API keys', async () => {
    const ai = new AiFormatter();
    const bullets = await ai.generateRoleBullets('Frontend Developer');
    expect(Array.isArray(bullets)).toBe(true);
    expect(bullets.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts skills on-device without API keys', async () => {
    const ai = new AiFormatter();
    const skills = await ai.extractSkills('Experienced with React, Node.js, TypeScript, PostgreSQL, Docker, Kafka, Snowflake, and OAuth 2.0.');
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThanOrEqual(4);
    expect(skills.some(s => /React|TypeScript|Docker|PostgreSQL|Kafka|Snowflake/i.test(s))).toBe(true);
  });

  it('generates domain bullets for QA, Security, and UX roles on-device', async () => {
    const ai = new AiFormatter();
    const qaBullets = await ai.generateRoleBullets('QA Automation Engineer');
    const secBullets = await ai.generateRoleBullets('Cybersecurity Analyst');
    const uxBullets = await ai.generateRoleBullets('Product Designer UI/UX');

    expect(qaBullets.some(b => /Playwright|test|coverage/i.test(b))).toBe(true);
    expect(secBullets.some(b => /vulnerability|zero-trust|SOC 2|security/i.test(b))).toBe(true);
    expect(uxBullets.some(b => /Figma|prototypes|design system|usability/i.test(b))).toBe(true);
  });

  it('generates professional summary on-device without API keys', async () => {
    const ai = new AiFormatter();
    const summary = await ai.generateSummary({
      personalInfo: { fullName: 'Alex Mercer', professionalTitle: 'Senior Backend Engineer' },
      sections: [{ type: 'experience', items: [{ title: 'Software Engineer', company: 'Acme', achievements: [{ text: 'Built Node microservices' }] }] }]
    });
    expect(typeof summary).toBe('string');
    expect(summary).toContain('Senior Backend Engineer');
  });

  it('generates cover letter on-device without API keys', async () => {
    const ai = new AiFormatter();
    const coverLetter = await ai.generateCoverLetter({
      personalInfo: { fullName: 'Jane Smith', professionalTitle: 'Full Stack Engineer' },
      sections: []
    }, 'We are looking for a Full Stack Engineer at Stripe with React and Node skills');

    expect(typeof coverLetter).toBe('string');
    expect(coverLetter).toContain('Dear Hiring Manager');
    expect(coverLetter).toContain('Jane Smith');
  });

  it('generates interview prep on-device without API keys', async () => {
    const ai = new AiFormatter();
    const prep = await ai.generateInterviewPrep({
      personalInfo: { professionalTitle: 'DevOps Engineer' },
      sections: []
    }, 'Kubernetes and AWS role');

    expect(typeof prep).toBe('string');
    const parsed = JSON.parse(prep);
    expect(parsed.behavioralQuestions.length).toBeGreaterThanOrEqual(3);
  });

  it('proofreads and checks grammar on-device without API keys', async () => {
    const ai = new AiFormatter();
    const issues = await ai.checkGrammar('I recieved alot of errors and would of fixed them.');
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('adjusts tone on-device without API keys', async () => {
    const ai = new AiFormatter();
    const adjusted = await ai.adjustTone('I worked on the database and made it faster due to the fact that users grew.', 'executive');
    expect(typeof adjusted).toBe('string');
    expect(adjusted).toContain('spearheaded');
  });

  it('condenses bullets on-device without API keys', async () => {
    const ai = new AiFormatter();
    const condensed = await ai.condenseBullets(['• Responsible for managing and maintaining the database in order to achieve high uptime']);
    expect(Array.isArray(condensed)).toBe(true);
    expect(condensed[0]).not.toContain('in order to');
  });

  it('translates resume sections on-device without API keys', async () => {
    const ai = new AiFormatter();
    const doc = {
      personalInfo: { fullName: 'Alex Rivera', professionalTitle: 'Senior Software Engineer' },
      sections: [
        { title: 'Professional Experience', items: [{ title: 'Tech Lead', achievements: [{ text: 'Built systems' }] }] },
        { title: 'Skills', items: [{ skills: ['React', 'Node.js'] }] }
      ]
    };

    const es = await ai.translateResume(doc, 'spanish');
    expect(es).toContain('Experiencia Profesional');
    expect(es).toContain('Habilidades y Competencias');

    const de = await ai.translateResume(doc, 'de');
    expect(de).toContain('Berufserfahrung');

    const zh = await ai.translateResume(doc, 'chinese');
    expect(zh).toContain('工作经历');
  });
});
