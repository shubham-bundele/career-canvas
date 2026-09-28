import { describe, it, expect, beforeEach } from 'vitest';
import { NLPExtractor } from '../../src/js/utils/nlp-extractor.js';
import { ImportManager } from '../../src/js/modules/import-manager.js';

describe('On-Device Resume Parser & Section Extraction', () => {
  const fullResumeText = `
Alex Morgan
Senior Cloud Solutions Architect
alex.morgan@example.com | +1 (555) 234-5678 | San Francisco, CA
https://linkedin.com/in/alexmorgan | https://github.com/alexmorgan | https://alexmorgan.dev

SUMMARY
Seasoned Solutions Architect with 10+ years of experience designing resilient distributed systems, enterprise cloud architectures, and scalable microservices.

EXPERIENCE
Principal Architect - CloudScale Systems | San Francisco, CA | 2021 - Present
• Spearheaded migration of legacy monolith to Kubernetes microservices, cutting cloud infrastructure costs by 38%.
• Directed a cross-functional team of 14 cloud engineers across multiple availability zones.
• Technologies: AWS, Kubernetes, Terraform, Go, Python

Lead DevOps Engineer - Nexus Technologies (2018 - 2021)
• Automated CI/CD deployment pipelines using GitHub Actions and ArgoCD, reducing release cycle time by 65%.
• Architected disaster recovery topology achieving 99.999% system availability.

EDUCATION
Master of Science in Computer Science, Stanford University (2016 - 2018)
• Specialization in Distributed Systems, GPA: 3.9/4.0
Bachelor of Science in Information Technology - UC Berkeley, 2012 - 2016

SKILLS
Cloud & Infrastructure: AWS, GCP, Terraform, Docker, Kubernetes
Languages: Go, Python, TypeScript, SQL, Rust
Databases: PostgreSQL, Redis, DynamoDB, MongoDB
Tools & CI/CD: Git, GitHub Actions, ArgoCD, Prometheus, Grafana

PROJECTS
CloudCost Optimizer (Go, React, AWS) | 2023 | https://github.com/alexmorgan/cloudcost-optimizer
• Built open-source CLI and dashboard for real-time AWS cost monitoring and anomaly detection.
• Technologies: Go, React, AWS Lambda, DynamoDB

Distributed Key-Value Store
• Implemented Raft consensus algorithm from scratch with automated leader election.
• Tech Stack: Rust, gRPC, Tokio
• Link: https://github.com/alexmorgan/raft-kv

CERTIFICATIONS
AWS Certified Solutions Architect - Professional | Amazon Web Services (2023) | Credential ID: AWS-PRO-987654
Certified Kubernetes Administrator (CKA) - Cloud Native Computing Foundation (2022)
HashiCorp Certified: Terraform Associate - HashiCorp (2021)

HONORS & AWARDS
Cloud Architect of the Year - TechCorp Global Summit (2023) - Awarded for leading multi-region disaster recovery
1st Place Winner - Open Cloud Hackathon (2022)

PUBLICATIONS & RESEARCH
Resilient Microservice Topologies in Kubernetes - IEEE Cloud Computing Journal (2023)
Authors: Alex Morgan, Jane Doe | DOI: 10.1109/CLOUD.2023.12345

VOLUNTEER EXPERIENCE
Open Source Mentor - Cloud Native Foundation (2021 - Present)
• Mentored 25+ aspiring cloud engineers from underrepresented backgrounds in container technologies.

LANGUAGES
English (Native), Spanish (Fluent), German (Conversational / B2)

INTERESTS
Open Source Contributing, Marathon Running, Alpine Skiing, Technical Blogging

REFERENCES
Dr. Robert Vance - VP of Cloud Engineering at CloudScale Systems | rvance@cloudscale.com | (555) 987-6543
Available upon request
`;

  it('parses all 10+ resume sections properly without external API keys', () => {
    const result = NLPExtractor.parse(fullResumeText, {});
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    
    const doc = result.document;
    const pi = doc.personalInfo;
    expect(pi.fullName).toContain('Alex Morgan');
    expect(pi.email).toBe('alex.morgan@example.com');
    expect(pi.phone).toContain('555');
    expect(pi.linkedinUrl).toContain('linkedin.com/in/alexmorgan');
    expect(pi.githubUrl).toContain('github.com/alexmorgan');

    const secTypes = doc.sections.map(s => s.sectionType);
    expect(secTypes).toContain('summary');
    expect(secTypes).toContain('experience');
    expect(secTypes).toContain('education');
    expect(secTypes).toContain('skills');
    expect(secTypes).toContain('projects');
    expect(secTypes).toContain('certifications');
    expect(secTypes).toContain('awards');
    expect(secTypes).toContain('publications');
    expect(secTypes).toContain('volunteer');
    expect(secTypes).toContain('languages');
    expect(secTypes).toContain('interests');
    expect(secTypes).toContain('references');
  });

  it('extracts structured items for experience, projects, certs, awards, volunteer, publications, and languages', () => {
    const result = NLPExtractor.parse(fullResumeText, {});
    const doc = result.document;

    // Experience
    const expSec = doc.sections.find(s => s.sectionType === 'experience');
    expect(expSec.items.length).toBeGreaterThanOrEqual(2);
    expect(expSec.items[0].jobTitle || expSec.items[0].title).toBeDefined();
    expect(expSec.items[0].highlights.length).toBeGreaterThan(0);

    // Projects
    const projSec = doc.sections.find(s => s.sectionType === 'projects');
    expect(projSec.items.length).toBeGreaterThanOrEqual(2);
    expect(projSec.items[0].projectName).toContain('CloudCost Optimizer');
    expect(projSec.items[0].url).toContain('github.com/alexmorgan/cloudcost-optimizer');

    // Certifications
    const certSec = doc.sections.find(s => s.sectionType === 'certifications');
    expect(certSec.items.length).toBeGreaterThanOrEqual(3);
    expect(certSec.items[0].name).toContain('AWS Certified');

    // Awards
    const awardSec = doc.sections.find(s => s.sectionType === 'awards');
    expect(awardSec.items.length).toBeGreaterThanOrEqual(2);
    expect(awardSec.items[0].title).toContain('Cloud Architect of the Year');

    // Publications
    const pubSec = doc.sections.find(s => s.sectionType === 'publications');
    expect(pubSec.items.length).toBeGreaterThanOrEqual(1);
    expect(pubSec.items[0].title).toContain('Resilient Microservice');

    // Volunteer
    const volSec = doc.sections.find(s => s.sectionType === 'volunteer');
    expect(volSec.items.length).toBeGreaterThanOrEqual(1);
    expect(volSec.items[0].role).toContain('Open Source Mentor');

    // Languages
    const langSec = doc.sections.find(s => s.sectionType === 'languages');
    expect(langSec.items.length).toBeGreaterThanOrEqual(3);
    expect(langSec.items.some(l => l.language.toLowerCase().includes('english'))).toBe(true);
    expect(langSec.items.some(l => l.language.toLowerCase().includes('spanish'))).toBe(true);

    // References
    const refSec = doc.sections.find(s => s.sectionType === 'references');
    expect(refSec.items.length).toBeGreaterThanOrEqual(1);
  });

  it('ImportManager.createDocumentFromParsed constructs complete document from raw section lines', () => {
    const mgr = new ImportManager();
    const rawParsed = {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1 234-567-8900',
      professionalTitle: 'Lead Product Designer',
      location: 'New York, NY',
      sections: [
        {
          title: 'Summary',
          type: 'summary',
          content: 'Creative UI/UX leader with 8+ years crafting enterprise applications.'
        },
        {
          title: 'Experience',
          type: 'experience',
          content: 'Senior Product Designer - Acme Design Studio (2020 - Present)\n• Designed design system used across 5 flagship web applications.\n• Mentored 6 product designers.'
        },
        {
          title: 'Education',
          type: 'education',
          content: 'Bachelor of Fine Arts in Interaction Design, RISD (2016 - 2020)'
        },
        {
          title: 'Skills',
          type: 'skills',
          content: 'Design: Figma, Adobe XD, Design Systems\nPrototyping: Framer, Principle, ProtoPie'
        },
        {
          title: 'Projects',
          type: 'projects',
          content: 'DesignSystem UI | https://github.com/janesmith/designsystem\n• Modular design tokens and React component library'
        },
        {
          title: 'Certifications',
          type: 'certifications',
          content: 'Nielsen Norman Group UX Master Certified (2022)'
        },
        {
          title: 'Honors & Awards',
          type: 'awards',
          content: 'Red Dot Design Award Winner - Red Dot (2023)'
        },
        {
          title: 'Publications',
          type: 'publications',
          content: 'Design Systems for Scalable SaaS - UX Collective (2023)'
        },
        {
          title: 'Volunteer',
          type: 'volunteer',
          content: 'Design Mentor - ADPList (2021 - Present)\n• Conducted 100+ 1:1 portfolio reviews for junior designers'
        },
        {
          title: 'Languages',
          type: 'languages',
          content: 'English (Native), French (Fluent)'
        },
        {
          title: 'Interests',
          type: 'interests',
          content: 'Typography, Architecture Photography, Ceramic Arts'
        },
        {
          title: 'References',
          type: 'references',
          content: 'Available upon request'
        }
      ]
    };

    const doc = mgr.createDocumentFromParsed(rawParsed, 'resume');
    expect(doc).toBeDefined();
    expect(doc.personalInfo.fullName).toBe('Jane Smith');
    expect(doc.personalInfo.email).toBe('jane@example.com');
    expect(doc.sections.length).toBe(12);

    const types = doc.sections.map(s => s.sectionType);
    expect(types).toContain('summary');
    expect(types).toContain('experience');
    expect(types).toContain('education');
    expect(types).toContain('skills');
    expect(types).toContain('projects');
    expect(types).toContain('certifications');
    expect(types).toContain('awards');
    expect(types).toContain('publications');
    expect(types).toContain('volunteer');
    expect(types).toContain('languages');
    expect(types).toContain('interests');
    expect(types).toContain('references');

    const certSec = doc.sections.find(s => s.sectionType === 'certifications');
    expect(certSec.items.length).toBeGreaterThan(0);
    expect(certSec.items[0].name).toContain('Nielsen Norman');

    const awardSec = doc.sections.find(s => s.sectionType === 'awards');
    expect(awardSec.items.length).toBeGreaterThan(0);
    expect(awardSec.items[0].title).toContain('Red Dot');

    const volSec = doc.sections.find(s => s.sectionType === 'volunteer');
    expect(volSec.items.length).toBeGreaterThan(0);
    expect(volSec.items[0].role).toContain('Design Mentor');

    const langSec = doc.sections.find(s => s.sectionType === 'languages');
    expect(langSec.items.length).toBe(2);
    expect(langSec.items[0].language).toBe('English');
    expect(langSec.items[1].language).toBe('French');
  });
});
