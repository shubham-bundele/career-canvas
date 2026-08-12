export const sampleResumeData = {
  personalInfo: {
    fullName: 'Alex Morgan Chen',
    preferredName: 'Alex',
    professionalTitle: 'Senior Software Engineer',
    resumeHeadline: 'Full-Stack Engineer with 8+ Years Building Scalable Web Applications',
    pronunciation: '',
    email: 'alex.chen@example.com',
    secondaryEmail: '',
    phone: '+1 (555) 123-4567',
    secondaryPhone: '',
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    postalCode: '94102',
    fullAddress: '',
    personalWebsite: 'https://alexchen.dev',
    portfolioUrl: '',
    linkedinUrl: 'https://linkedin.com/in/alexchen',
    githubUrl: 'https://github.com/alexchen',
    gitlabUrl: '',
    stackOverflowUrl: '',
    orcid: '',
    googleScholar: '',
    behance: '',
    dribbble: '',
    otherProfiles: [],
    workAuthorization: 'US Citizen',
    willingToRelocate: 'Yes',
    remotePreference: 'Remote or Hybrid',
    photograph: '',
    signature: ''
  },
  sections: [
    {
      id: 'summary-1',
      type: 'professionalSummary',
      title: 'Professional Summary',
      visible: true,
      order: 0,
      content: 'Results-driven Senior Software Engineer with 8+ years of experience designing, developing, and deploying scalable web applications. Proficient in JavaScript, TypeScript, Python, and cloud infrastructure. Proven track record of leading cross-functional teams, reducing system latency by 40%, and delivering products used by over 2 million users. Passionate about clean architecture, mentoring junior developers, and building inclusive engineering cultures.'
    },
    {
      id: 'exp-1',
      type: 'professionalExperience',
      title: 'Professional Experience',
      visible: true,
      order: 1,
      items: [
        {
          id: 'job-1',
          jobTitle: 'Senior Software Engineer',
          company: 'Horizon Technologies',
          companyDescription: 'Enterprise SaaS platform for supply chain management',
          employmentType: 'Full-time',
          department: 'Platform Engineering',
          location: 'San Francisco, CA',
          remoteType: 'Hybrid',
          startMonth: 'March',
          startYear: '2021',
          endMonth: '',
          endYear: '',
          currentlyWorking: true,
          roleSummary: 'Lead engineer on the core platform team, responsible for API architecture, performance optimization, and developer experience.',
          responsibilities: '',
          achievements: [
            { id: 'ach-1', text: 'Architected and implemented a microservices migration that reduced API response times by 40% and improved system reliability to 99.95% uptime', actionVerb: 'Architected', skillTags: ['Microservices', 'API Design'], metricTags: ['40% faster', '99.95% uptime'], relevance: 'high', alternateVersions: [], included: true, order: 0 },
            { id: 'ach-2', text: 'Led a team of 6 engineers to deliver a real-time data processing pipeline handling 500K+ events per second using Kafka and Redis', actionVerb: 'Led', skillTags: ['Kafka', 'Redis', 'Leadership'], metricTags: ['500K events/sec', '6 engineers'], relevance: 'high', alternateVersions: [], included: true, order: 1 },
            { id: 'ach-3', text: 'Designed and implemented a comprehensive CI/CD pipeline that reduced deployment time from 45 minutes to 8 minutes, enabling 15+ daily deployments', actionVerb: 'Designed', skillTags: ['CI/CD', 'DevOps'], metricTags: ['45 to 8 minutes', '15+ daily deployments'], relevance: 'medium', alternateVersions: [], included: true, order: 2 },
            { id: 'ach-4', text: 'Mentored 4 junior engineers through structured code reviews and pair programming, resulting in 2 promotions within 18 months', actionVerb: 'Mentored', skillTags: ['Mentoring', 'Leadership'], metricTags: ['4 engineers', '2 promotions'], relevance: 'medium', alternateVersions: [], included: true, order: 3 }
          ],
          technologies: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS'],
          methods: ['Agile', 'TDD', 'Microservices'],
          teamSize: '12',
          reportingScope: '',
          companyUrl: 'https://horizontech.example.com',
          industryTags: ['SaaS', 'Supply Chain'],
          skillTags: ['Full-Stack', 'Backend', 'Cloud'],
          relevanceTags: ['senior-engineering', 'leadership'],
          included: true,
          hidden: false,
          order: 0
        },
        {
          id: 'job-2',
          jobTitle: 'Software Engineer II',
          company: 'DataFlow Inc.',
          companyDescription: 'Business intelligence and analytics platform',
          employmentType: 'Full-time',
          department: 'Product Engineering',
          location: 'Seattle, WA',
          remoteType: 'Onsite',
          startMonth: 'June',
          startYear: '2018',
          endMonth: 'February',
          endYear: '2021',
          currentlyWorking: false,
          roleSummary: 'Full-stack engineer building data visualization and reporting features for enterprise customers.',
          responsibilities: '',
          achievements: [
            { id: 'ach-5', text: 'Built an interactive dashboard builder used by 50,000+ enterprise users, contributing to a 25% increase in user engagement metrics', actionVerb: 'Built', skillTags: ['React', 'D3.js', 'Frontend'], metricTags: ['50,000+ users', '25% engagement increase'], relevance: 'high', alternateVersions: [], included: true, order: 0 },
            { id: 'ach-6', text: 'Optimized database query performance for complex analytical reports, reducing average query time from 12 seconds to 800 milliseconds', actionVerb: 'Optimized', skillTags: ['SQL', 'PostgreSQL', 'Performance'], metricTags: ['12s to 800ms'], relevance: 'high', alternateVersions: [], included: true, order: 1 },
            { id: 'ach-7', text: 'Developed a reusable component library with 40+ components, adopted by 3 product teams and reducing frontend development time by 30%', actionVerb: 'Developed', skillTags: ['React', 'Component Library'], metricTags: ['40+ components', '30% faster development'], relevance: 'medium', alternateVersions: [], included: true, order: 2 }
          ],
          technologies: ['JavaScript', 'React', 'Python', 'Django', 'PostgreSQL', 'D3.js', 'AWS'],
          methods: ['Scrum', 'Code Reviews'],
          teamSize: '8',
          reportingScope: '',
          companyUrl: '',
          industryTags: ['Analytics', 'BI'],
          skillTags: ['Full-Stack', 'Frontend'],
          relevanceTags: ['mid-level-engineering'],
          included: true,
          hidden: false,
          order: 1
        },
        {
          id: 'job-3',
          jobTitle: 'Junior Software Developer',
          company: 'WebCraft Solutions',
          companyDescription: 'Digital agency specializing in e-commerce',
          employmentType: 'Full-time',
          department: 'Development',
          location: 'Portland, OR',
          remoteType: 'Onsite',
          startMonth: 'August',
          startYear: '2016',
          endMonth: 'May',
          endYear: '2018',
          currentlyWorking: false,
          roleSummary: 'Developed custom e-commerce solutions for small and medium businesses.',
          responsibilities: '',
          achievements: [
            { id: 'ach-8', text: 'Developed 15+ responsive e-commerce websites generating over $2M in combined annual revenue for clients', actionVerb: 'Developed', skillTags: ['HTML', 'CSS', 'JavaScript', 'E-commerce'], metricTags: ['15+ websites', '$2M revenue'], relevance: 'medium', alternateVersions: [], included: true, order: 0 },
            { id: 'ach-9', text: 'Implemented automated testing suite that caught 95% of regression bugs before production deployment', actionVerb: 'Implemented', skillTags: ['Testing', 'QA'], metricTags: ['95% bug detection'], relevance: 'medium', alternateVersions: [], included: true, order: 1 }
          ],
          technologies: ['HTML', 'CSS', 'JavaScript', 'PHP', 'WordPress', 'Shopify', 'MySQL'],
          methods: ['Kanban'],
          teamSize: '5',
          reportingScope: '',
          companyUrl: '',
          industryTags: ['E-commerce', 'Agency'],
          skillTags: ['Frontend', 'E-commerce'],
          relevanceTags: ['early-career'],
          included: true,
          hidden: false,
          order: 2
        }
      ]
    },
    {
      id: 'edu-1',
      type: 'education',
      title: 'Education',
      visible: true,
      order: 2,
      items: [
        {
          id: 'edu-item-1',
          degree: 'Bachelor of Science',
          qualification: 'Computer Science',
          specialization: 'Software Engineering',
          institution: 'University of Washington',
          department: 'Paul G. Allen School of Computer Science & Engineering',
          location: 'Seattle, WA',
          startDate: '2012',
          endDate: '2016',
          currentlyStudying: false,
          grade: '',
          gpa: '3.7',
          percentage: '',
          honors: 'Magna Cum Laude',
          relevantCoursework: 'Data Structures, Algorithms, Operating Systems, Database Systems, Computer Networks, Software Engineering, Machine Learning',
          thesis: '',
          dissertation: '',
          academicProjects: '',
          activities: 'ACM Student Chapter President, Hackathon Organizer',
          societies: 'Tau Beta Pi Engineering Honor Society',
          description: '',
          institutionUrl: 'https://www.washington.edu',
          hideGrade: false,
          included: true,
          order: 0
        }
      ]
    },
    {
      id: 'skills-1',
      type: 'technicalSkills',
      title: 'Technical Skills',
      visible: true,
      order: 3,
      items: [
        { id: 'sk-1', category: 'Languages', skills: 'JavaScript, TypeScript, Python, Go, SQL, HTML, CSS', included: true, order: 0 },
        { id: 'sk-2', category: 'Frontend', skills: 'React, Next.js, Vue.js, D3.js, Tailwind CSS, Webpack', included: true, order: 1 },
        { id: 'sk-3', category: 'Backend', skills: 'Node.js, Express, Django, FastAPI, GraphQL, REST APIs', included: true, order: 2 },
        { id: 'sk-4', category: 'Databases', skills: 'PostgreSQL, MongoDB, Redis, Elasticsearch, DynamoDB', included: true, order: 3 },
        { id: 'sk-5', category: 'Cloud & DevOps', skills: 'AWS, Docker, Kubernetes, Terraform, GitHub Actions, Jenkins', included: true, order: 4 },
        { id: 'sk-6', category: 'Tools', skills: 'Git, Jira, Figma, Datadog, PagerDuty, Confluence', included: true, order: 5 }
      ]
    },
    {
      id: 'proj-1',
      type: 'projects',
      title: 'Projects',
      visible: true,
      order: 4,
      items: [
        {
          id: 'proj-item-1',
          projectName: 'OpenMetrics Dashboard',
          projectType: 'Open Source',
          role: 'Creator & Maintainer',
          teamSize: '3',
          startDate: '2022',
          endDate: '',
          currentProject: true,
          summary: 'Open-source real-time metrics visualization platform',
          problem: 'Existing monitoring dashboards required expensive licenses for custom visualizations',
          solution: 'Built a flexible, plugin-based dashboard system with real-time data streaming',
          personalContribution: 'Architecture, core engine, and plugin API',
          technologies: ['React', 'TypeScript', 'WebSocket', 'D3.js'],
          methods: [],
          results: '2,500+ GitHub stars, adopted by 50+ companies',
          achievements: [
            { id: 'pach-1', text: 'Created an extensible plugin system supporting 20+ data source integrations', included: true, order: 0 }
          ],
          demoUrl: 'https://openmetrics.example.dev',
          repositoryUrl: 'https://github.com/alexchen/openmetrics',
          documentationUrl: '',
          publicationUrl: '',
          mediaThumbnail: '',
          skillTags: ['React', 'TypeScript', 'Open Source'],
          jobRelevanceTags: ['engineering-leadership'],
          included: true,
          order: 0
        }
      ]
    },
    {
      id: 'cert-1',
      type: 'certifications',
      title: 'Certifications',
      visible: true,
      order: 5,
      items: [
        { id: 'cert-item-1', name: 'AWS Solutions Architect - Associate', issuer: 'Amazon Web Services', date: '2023', expiryDate: '2026', credentialId: 'AWS-SAA-123456', credentialUrl: '', included: true, order: 0 },
        { id: 'cert-item-2', name: 'Certified Kubernetes Administrator (CKA)', issuer: 'Cloud Native Computing Foundation', date: '2022', expiryDate: '2025', credentialId: '', credentialUrl: '', included: true, order: 1 }
      ]
    },
    {
      id: 'lang-1',
      type: 'languages',
      title: 'Languages',
      visible: true,
      order: 6,
      items: [
        { id: 'lang-item-1', language: 'English', proficiency: 'Native', included: true, order: 0 },
        { id: 'lang-item-2', language: 'Mandarin Chinese', proficiency: 'Professional Working', included: true, order: 1 },
        { id: 'lang-item-3', language: 'Spanish', proficiency: 'Conversational', included: true, order: 2 }
      ]
    },
    {
      id: 'vol-1',
      type: 'volunteerExperience',
      title: 'Volunteer Experience',
      visible: false,
      order: 7,
      items: [
        {
          id: 'vol-item-1',
          role: 'Lead Instructor',
          organization: 'Code for Change',
          location: 'San Francisco, CA',
          startDate: '2020',
          endDate: '',
          current: true,
          description: 'Teach web development fundamentals to underrepresented high school students. Developed a 12-week curriculum covering HTML, CSS, and JavaScript basics. Mentored 60+ students, with 15 successfully completing internship placements.',
          included: true,
          order: 0
        }
      ]
    }
  ]
};

export const sampleCoverLetterData = {
  personalInfo: {
    fullName: 'Alex Morgan Chen',
    email: 'alex.chen@example.com',
    phone: '+1 (555) 123-4567',
    city: 'San Francisco',
    state: 'California',
    country: 'United States'
  },
  coverLetter: {
    date: 'January 15, 2025',
    recipientName: 'Sarah Johnson',
    recipientTitle: 'Engineering Director',
    company: 'Innovate Corp',
    companyAddress: '123 Tech Street, San Francisco, CA 94105',
    salutation: 'Dear Ms. Johnson',
    body: 'I am writing to express my strong interest in the Senior Software Engineer position at Innovate Corp. With over 8 years of experience in full-stack development and a proven track record of building scalable applications, I am confident in my ability to make a meaningful contribution to your engineering team.\n\nIn my current role at Horizon Technologies, I have led the architecture and implementation of a microservices migration that reduced API response times by 40% and improved system reliability to 99.95% uptime. I also led a team of 6 engineers to deliver a real-time data processing pipeline handling 500K+ events per second.\n\nWhat particularly excites me about Innovate Corp is your commitment to building developer tools that empower engineering teams. Your recent open-source initiatives align perfectly with my passion for community-driven development.\n\nI would welcome the opportunity to discuss how my technical expertise and leadership experience can contribute to Innovate Corp\'s continued growth. Thank you for considering my application.',
    closing: 'Sincerely'
  }
};

export const sampleReferenceData = {
  personalInfo: {
    fullName: 'Alex Morgan Chen',
    professionalTitle: 'Senior Software Engineer',
    email: 'alex.chen@example.com',
    phone: '+1 (555) 123-4567'
  },
  sections: [
    {
      id: 'ref-section-1',
      type: 'references',
      title: 'Professional References',
      visible: true,
      order: 0,
      items: [
        {
          id: 'ref-1',
          name: 'Dr. James Mitchell',
          title: 'VP of Engineering',
          company: 'Horizon Technologies',
          relationship: 'Direct Manager',
          email: 'j.mitchell@horizontech.example.com',
          phone: '+1 (555) 234-5678',
          yearsKnown: '3',
          included: true,
          order: 0
        },
        {
          id: 'ref-2',
          name: 'Priya Patel',
          title: 'Senior Staff Engineer',
          company: 'DataFlow Inc.',
          relationship: 'Technical Lead / Mentor',
          email: 'priya.patel@dataflow.example.com',
          phone: '+1 (555) 345-6789',
          yearsKnown: '5',
          included: true,
          order: 1
        },
        {
          id: 'ref-3',
          name: 'Prof. Robert Kim',
          title: 'Associate Professor of Computer Science',
          company: 'University of Washington',
          relationship: 'Academic Advisor',
          email: 'rkim@uw.example.edu',
          phone: '+1 (555) 456-7890',
          yearsKnown: '10',
          included: true,
          order: 2
        }
      ]
    }
  ]
};

export function getSampleDataForType(docType) {
  switch (docType) {
    case 'resume':
    case 'cv':
    case 'academicCV':
      return sampleResumeData;
    case 'coverLetter':
      return sampleCoverLetterData;
    case 'referenceSheet':
      return sampleReferenceData;
    default:
      return sampleResumeData;
  }
}
