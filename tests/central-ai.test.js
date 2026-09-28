import { describe, it, expect } from 'vitest';
import { NLPExtractor } from '../src/js/utils/nlp-extractor.js';
import { CentralAIService, centralAI } from '../src/js/core/central-ai.js';
import { ATSChecker } from '../src/js/modules/ats-checker.js';

describe('Central AI & NLP Engine', () => {
  const sampleResume = `
Johnathan Doe
Senior Full-Stack Engineer | Cloud Architect
john.doe@example.com | +1 (555) 234-5678 | San Francisco, CA
https://linkedin.com/in/johndoe | https://github.com/johndoe | https://johndoe.dev

PROFESSIONAL SUMMARY
Results-driven Senior Full-Stack Engineer with 8+ years of experience architecting distributed cloud systems, high-throughput microservices, and modern responsive web applications. Proven track record of reducing latency by 45% and leading engineering teams to deliver mission-critical SaaS platforms.

WORK EXPERIENCE
Staff Software Engineer | Acme Cloud Systems | San Francisco, CA
March 2021 - Present
- Architected and deployed microservices handling 50M+ daily API requests using Node.js, Go, and Kubernetes.
- Spearheaded database migration to PostgreSQL, reducing query latency by 42% and saving $120,000 in annual infrastructure costs.
- Mentored a team of 12 junior and mid-level engineers in TDD, CI/CD, and agile best practices.

Senior Software Engineer | Globex Corporation | Mountain View, CA
June 2018 - February 2021
- Developed real-time analytics dashboard with React, TypeScript, and WebSocket, increasing user engagement by 35%.
- Implemented Redis caching layer that reduced database load by 60% during peak traffic.
- Authored 25+ automated end-to-end test suites using Playwright and Jest.

EDUCATION
Master of Science in Computer Science
Stanford University | Stanford, CA
September 2016 - June 2018 | GPA: 3.9 / 4.0

Bachelor of Science in Software Engineering
University of California, Berkeley | Berkeley, CA
September 2012 - May 2016

SKILLS
Frontend: React, Next.js, TypeScript, Vue.js, Tailwind CSS, Redux, HTML5, CSS3
Backend: Node.js, Go, Python, FastAPI, Express, GraphQL, REST APIs
Cloud & DevOps: AWS, Docker, Kubernetes, Terraform, CI/CD, GitHub Actions, Linux
Databases: PostgreSQL, MongoDB, Redis, MySQL, DynamoDB
Testing & Tools: Jest, Playwright, Git, Vite, Webpack, Postman

CERTIFICATIONS
- AWS Certified Solutions Architect - Associate (Amazon Web Services, 2022)
- Certified Kubernetes Administrator (CKA) (Cloud Native Computing Foundation, 2021)

PROJECTS
CloudPulse - Open-Source Kubernetes Monitoring Agent
https://github.com/johndoe/cloudpulse
- Built lightweight Go daemon collecting Prometheus metrics from 100+ cluster nodes with sub-5ms overhead.
- Acquired 1,200+ GitHub stars and 45 active open-source contributors.
`;

  it('correctly parses contact info, summary, experience, education, skills, and projects offline with 0 API keys', () => {
    const parsed = NLPExtractor.parseResume(sampleResume);

    expect(parsed.personalInfo.fullName).toBe('Johnathan Doe');
    expect(parsed.personalInfo.professionalTitle).toContain('Senior Full-Stack Engineer');
    expect(parsed.personalInfo.email).toBe('john.doe@example.com');
    expect(parsed.personalInfo.phone).toBe('+1 (555) 234-5678');
    expect(parsed.personalInfo.city).toBe('San Francisco');
    expect(parsed.personalInfo.linkedinUrl).toContain('linkedin.com/in/johndoe');
    expect(parsed.personalInfo.githubUrl).toContain('github.com/johndoe');
    expect(parsed.personalInfo.personalWebsite).toContain('johndoe.dev');

    expect(parsed.experience.length).toBeGreaterThanOrEqual(2);
    expect(parsed.experience[0].title).toContain('Software Engineer');
    expect(parsed.experience[0].company).toContain('Acme Cloud Systems');
    expect(parsed.experience[0].achievements.length).toBeGreaterThanOrEqual(2);

    expect(parsed.education.length).toBeGreaterThanOrEqual(1);
    expect(parsed.education[0].institution).toContain('Stanford University');
    expect(parsed.education[0].degree).toContain('Master of Science');

    expect(parsed.skills.length).toBeGreaterThanOrEqual(10);
    expect(parsed.projects.length).toBeGreaterThanOrEqual(1);
    expect(parsed.certifications.length).toBeGreaterThanOrEqual(1);
  });

  it('aligns parsed resume into a fully valid CareerCanvas document schema', () => {
    const aligned = NLPExtractor.alignToCareerCanvasSchema(NLPExtractor.parseResume(sampleResume));

    expect(aligned.schemaVersion).toBe(1);
    expect(aligned.personalInfo.fullName).toBe('Johnathan Doe');
    expect(Array.isArray(aligned.sections)).toBe(true);

    const expSection = aligned.sections.find(s => s.type === 'experience' || s.sectionType === 'experience');
    expect(expSection).toBeDefined();
    expect(expSection.items.length).toBeGreaterThanOrEqual(2);
    expect(expSection.items[0].achievements.length).toBeGreaterThanOrEqual(2);

    const skillsSection = aligned.sections.find(s => s.type === 'skills' || s.sectionType === 'skills');
    expect(skillsSection).toBeDefined();
    expect(skillsSection.items.length).toBeGreaterThanOrEqual(5);
  });

  it('centralAI facade works offline without API keys', async () => {
    expect(centralAI.isZeroKeyReady()).toBe(true);

    const result = await centralAI.parseAndAlignResume(sampleResume);
    expect(result.document).toBeDefined();
    expect(result.document.personalInfo.fullName).toBe('Johnathan Doe');
    expect(result.tier).toBe('localNLP');

    const improved = await centralAI.improveBulletPoint('worked on website and fixed bugs');
    expect(improved.improved).not.toBe('worked on website and fixed bugs');
    expect(improved.improved.length).toBeGreaterThan(15);

    const fixes = await centralAI.generateAtsFixSuggestions(result.document);
    expect(Array.isArray(fixes)).toBe(true);
  });

  it('ATSChecker generates actionable quick fixes and updates document', () => {
    const checker = new ATSChecker();
    const docWithIssues = {
      schemaVersion: 1,
      personalInfo: {
        fullName: 'JOHN DOE',
        professionalTitle: 'SOFTWARE ENGINEER',
        email: 'john@example.com',
        phone: '1234567890'
      },
      design: {
        fontFamily: 'Comic Sans MS',
        columnCount: 2
      },
      sections: [
        {
          id: 'sec-1',
          type: 'custom',
          title: 'Work History',
          visible: true,
          items: [
            {
              id: 'item-1',
              title: 'Developer',
              company: 'Tech Corp',
              startMonth: '05',
              startYear: '2020',
              endMonth: '08',
              endYear: '2022',
              achievements: [
                { id: 'ach-1', text: 'managed the backend service' }
              ]
            }
          ]
        }
      ]
    };

    const analysis = checker.analyze(docWithIssues, docWithIssues.design);
    expect(analysis.score).toBeLessThan(100);

    // Apply quick fixes
    const capsFix = checker.applyQuickFix('fix-capitalization', docWithIssues);
    expect(capsFix).toBe(true);
    expect(docWithIssues.personalInfo.fullName).toBe('John Doe');

    const headingFix = checker.applyQuickFix('standardize-headings', docWithIssues);
    expect(headingFix).toBe(true);
    expect(docWithIssues.sections[0].title).toBe('Professional Experience');

    const summaryFix = checker.applyQuickFix('add-summary', docWithIssues);
    expect(summaryFix).toBe(true);
    expect(docWithIssues.sections.some(s => /summary/i.test(s.title))).toBe(true);

    const skillsFix = checker.applyQuickFix('add-skills', docWithIssues);
    expect(skillsFix).toBe(true);
    expect(docWithIssues.sections.some(s => /skills/i.test(s.title))).toBe(true);

    const dateFix = checker.applyQuickFix('standardize-dates', docWithIssues);
    expect(dateFix).toBe(true);
    expect(docWithIssues.sections[1].items[0].startMonth).toBe('May');
    expect(docWithIssues.sections[1].items[0].endMonth).toBe('Aug');

    const atsModeFix = checker.applyQuickFix('enable-ats-mode', docWithIssues);
    expect(atsModeFix).toBe(true);
    expect(docWithIssues.settings.atsMode).toBe(true);

    // Re-analyze after fixes
    const updatedAnalysis = checker.analyze(docWithIssues, docWithIssues.design);
    expect(updatedAnalysis.score).toBeGreaterThan(analysis.score);
  });

  it('performs on-device STAR bullet improvements, role bullets, and summary generation with 0 API keys', async () => {
    // 1. STAR Bullet Improvement
    const rawBullet = 'helped with website and fixed bugs';
    const improved = NLPExtractor.improveBullet(rawBullet);
    expect(improved).not.toContain('helped with');
    expect(improved.length).toBeGreaterThan(rawBullet.length);
    expect(/Spearheaded|Engineered|Validated|Optimized|Architected/.test(improved)).toBe(true);

    // 2. Role Bullets
    const devopsBullets = NLPExtractor.generateRoleBullets('DevOps Engineer', { skills: 'Kubernetes, Terraform, AWS' });
    expect(Array.isArray(devopsBullets)).toBe(true);
    expect(devopsBullets.length).toBeGreaterThanOrEqual(4);
    expect(devopsBullets[0]).toContain('Kubernetes');

    // 3. Summary
    const summary = NLPExtractor.generateSummary(sampleResume, 'Senior Cloud Engineer');
    expect(summary).toContain('Senior Cloud Engineer');
    expect(summary).toContain('years of experience');

    // 4. Skills extraction
    const skills = NLPExtractor.extractSkills(sampleResume, 10);
    expect(skills.length).toBeGreaterThanOrEqual(5);
    expect(skills.some(s => /React|Node|Kubernetes|Python|AWS|TypeScript/i.test(s))).toBe(true);
  });

  it('generates cover letters, interview prep, and follow-ups on-device', async () => {
    const jd = 'Looking for a Senior Software Engineer with experience in React, Node.js, and AWS.';
    
    // Cover Letter
    const coverLetter = NLPExtractor.generateCoverLetter(sampleResume, jd, { company: 'Google', position: 'Senior Engineer', name: 'Johnathan Doe' });
    expect(coverLetter).toContain('Dear Hiring Manager at Google');
    expect(coverLetter).toContain('Senior Engineer');
    expect(coverLetter).toContain('Johnathan Doe');

    // Interview Prep
    const prepJson = NLPExtractor.generateInterviewPrep(sampleResume, jd);
    const parsedPrep = JSON.parse(prepJson);
    expect(parsedPrep.behavioralQuestions.length).toBeGreaterThanOrEqual(3);
    expect(parsedPrep.technicalQuestions.length).toBeGreaterThanOrEqual(3);
    expect(parsedPrep.questionsForInterviewer.length).toBeGreaterThanOrEqual(3);
    expect(parsedPrep.elevatorPitch.length).toBeGreaterThan(20);

    // Follow Up Email
    const email = NLPExtractor.generateFollowUpEmail({ position: 'Staff Engineer', company: 'Acme', applicantName: 'Johnathan' });
    expect(email).toContain('Staff Engineer');
    expect(email).toContain('Acme');
    expect(email).toContain('Johnathan');
  });

  it('runs offline grammar proofing, tone adjustments, bullet condensing, and JD enhancement', () => {
    // Grammar check
    const badText = 'I recieved alot of maintainance requests and occured problems.';
    const issues = NLPExtractor.checkGrammar(badText);
    expect(issues.length).toBeGreaterThanOrEqual(3);
    expect(issues.some(i => i.suggestion.includes('receive'))).toBe(true);
    expect(issues.some(i => i.suggestion.includes('a lot'))).toBe(true);

    // Tone adjustment
    const toneText = 'I worked on the app and fixed the slow parts due to the fact that traffic was high.';
    const execTone = NLPExtractor.adjustTone(toneText, 'executive');
    expect(execTone).toContain('spearheaded');

    const conciseTone = NLPExtractor.adjustTone(toneText, 'concise');
    expect(conciseTone).toContain('because');

    // Bullet condensing
    const condensed = NLPExtractor.condenseBullets(['• Was responsible for developing and successfully maintaining the API in order to improve speed']);
    expect(condensed[0]).not.toContain('in order to');
    expect(condensed[0]).not.toContain('Was responsible for developing');

    // JD Enhancement suggestions
    const jd = 'Must know Rust, Elixir, and Kubernetes.';
    const suggestions = NLPExtractor.enhanceForJD('Experience in JavaScript and HTML.', jd);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions[0].suggestion).toContain('Rust');
  });

  it('executes all tasks via centralAI.executeTask() on-device without errors', async () => {
    const bulletRes = await centralAI.executeTask('improve-bullet', { bullet: 'responsible for building frontend' });
    expect(bulletRes.improved).toBeDefined();

    const summaryRes = await centralAI.executeTask('summary', { doc: sampleResume, targetRole: 'Full Stack Engineer' });
    expect(typeof summaryRes).toBe('string');
    expect(summaryRes.length).toBeGreaterThan(20);

    const skillsRes = await centralAI.executeTask('extract-skills', { text: sampleResume });
    expect(Array.isArray(skillsRes)).toBe(true);

    const coverRes = await centralAI.executeTask('cover-letter', { doc: sampleResume, jobDescription: 'React dev role', metadata: { company: 'Meta' } });
    expect(coverRes).toContain('Meta');
  });
});
