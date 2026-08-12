/**
 * Local Autocomplete Data
 * Comprehensive suggestion lists for resume fields — no internet required
 */

export const jobTitles = [
  // Engineering & Software
  'Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer', 'Principal Software Engineer',
  'Junior Software Engineer', 'Software Developer', 'Senior Software Developer', 'Lead Software Engineer',
  'Frontend Developer', 'Senior Frontend Developer', 'Frontend Engineer', 'React Developer',
  'Angular Developer', 'Vue.js Developer', 'JavaScript Developer', 'TypeScript Developer',
  'Backend Developer', 'Senior Backend Developer', 'Backend Engineer', 'Node.js Developer',
  'Python Developer', 'Java Developer', 'Go Developer', 'Ruby Developer', '.NET Developer',
  'Full Stack Developer', 'Senior Full Stack Developer', 'Full Stack Engineer',
  'Mobile Developer', 'iOS Developer', 'Android Developer', 'React Native Developer', 'Flutter Developer',
  'DevOps Engineer', 'Senior DevOps Engineer', 'Site Reliability Engineer', 'SRE',
  'Cloud Engineer', 'Cloud Architect', 'AWS Solutions Architect', 'Azure Cloud Engineer',
  'Platform Engineer', 'Infrastructure Engineer', 'Build Engineer', 'Release Engineer',
  'Embedded Systems Engineer', 'Firmware Engineer', 'IoT Engineer', 'Robotics Engineer',
  // Data & AI
  'Data Engineer', 'Senior Data Engineer', 'Data Scientist', 'Senior Data Scientist',
  'Data Analyst', 'Senior Data Analyst', 'Business Intelligence Analyst', 'BI Developer',
  'Machine Learning Engineer', 'ML Engineer', 'AI Engineer', 'AI Researcher',
  'Deep Learning Engineer', 'NLP Engineer', 'Computer Vision Engineer',
  'Data Architect', 'Analytics Engineer', 'Research Scientist', 'Research Engineer',
  // Architecture & Leadership
  'Solutions Architect', 'Technical Architect', 'Enterprise Architect', 'System Architect',
  'Engineering Manager', 'Senior Engineering Manager', 'Director of Engineering',
  'VP of Engineering', 'SVP Engineering', 'CTO', 'Technical Lead', 'Tech Lead', 'Team Lead',
  'Head of Engineering', 'Head of Technology', 'Chief Architect',
  // Product & Design
  'Product Manager', 'Senior Product Manager', 'Director of Product', 'VP of Product',
  'Product Owner', 'Product Analyst', 'Product Marketing Manager',
  'Program Manager', 'Technical Program Manager', 'Senior Program Manager',
  'Project Manager', 'Senior Project Manager', 'IT Project Manager', 'Construction Project Manager',
  'Scrum Master', 'Agile Coach', 'Delivery Manager',
  'UX Designer', 'Senior UX Designer', 'UI Designer', 'Senior UI Designer',
  'UX Researcher', 'Senior UX Researcher', 'Product Designer', 'Senior Product Designer',
  'Graphic Designer', 'Senior Graphic Designer', 'Visual Designer', 'Motion Designer',
  'Interaction Designer', 'Design Lead', 'Head of Design', 'Creative Director',
  'Art Director', 'Brand Designer', 'Web Designer',
  // QA & Testing
  'QA Engineer', 'Senior QA Engineer', 'QA Analyst', 'QA Lead', 'QA Manager',
  'Quality Assurance Engineer', 'Quality Assurance Analyst', 'Quality Assurance Manager',
  'Test Engineer', 'Senior Test Engineer', 'Test Lead', 'Test Manager',
  'Automation Engineer', 'QA Automation Engineer', 'SDET', 'Software Development Engineer in Test',
  'Performance Engineer', 'Performance Test Engineer', 'Load Test Engineer',
  'Manual Tester', 'Test Analyst',
  // Security
  'Security Engineer', 'Senior Security Engineer', 'Application Security Engineer',
  'Cybersecurity Analyst', 'Cybersecurity Engineer', 'Security Architect',
  'Information Security Manager', 'CISO', 'Penetration Tester', 'Security Consultant',
  'SOC Analyst', 'Threat Intelligence Analyst', 'Cloud Security Engineer',
  // IT & Infrastructure
  'Database Administrator', 'DBA', 'Senior DBA', 'Systems Administrator', 'Linux Administrator',
  'Windows Administrator', 'Network Engineer', 'Senior Network Engineer', 'Network Architect',
  'IT Support Specialist', 'IT Support Engineer', 'Help Desk Technician',
  'IT Manager', 'IT Director', 'Chief Information Officer', 'CIO',
  'Systems Engineer', 'IT Operations Manager', 'IT Consultant',
  // Marketing
  'Marketing Manager', 'Senior Marketing Manager', 'Marketing Director', 'VP of Marketing', 'CMO',
  'Digital Marketing Manager', 'Digital Marketing Specialist', 'Performance Marketing Manager',
  'Content Strategist', 'Content Manager', 'Content Writer', 'Copywriter', 'Technical Writer',
  'SEO Specialist', 'SEO Manager', 'SEM Specialist', 'PPC Specialist',
  'Social Media Manager', 'Social Media Specialist', 'Community Manager',
  'Brand Manager', 'Brand Strategist', 'Email Marketing Manager',
  'Marketing Analyst', 'Growth Marketing Manager', 'Growth Hacker',
  'Public Relations Manager', 'PR Specialist', 'Communications Manager',
  // Sales & Business
  'Sales Representative', 'Sales Executive', 'Account Executive', 'Senior Account Executive',
  'Sales Manager', 'Senior Sales Manager', 'Regional Sales Manager',
  'Sales Director', 'VP of Sales', 'Chief Revenue Officer', 'CRO',
  'Business Development Manager', 'Business Development Representative', 'BDR', 'SDR',
  'Account Manager', 'Key Account Manager', 'Customer Success Manager',
  'Customer Support Specialist', 'Customer Service Representative', 'Technical Support Engineer',
  'Pre-Sales Engineer', 'Sales Engineer', 'Solution Consultant',
  // Finance & Accounting
  'Financial Analyst', 'Senior Financial Analyst', 'Finance Manager', 'Finance Director',
  'Accountant', 'Senior Accountant', 'Staff Accountant', 'Tax Accountant',
  'Controller', 'Assistant Controller', 'CFO', 'Chief Financial Officer',
  'Investment Banker', 'Investment Analyst', 'Portfolio Manager', 'Wealth Manager',
  'Risk Analyst', 'Risk Manager', 'Compliance Officer', 'Compliance Manager',
  'Actuary', 'Auditor', 'Internal Auditor', 'External Auditor',
  'Treasury Analyst', 'FP&A Analyst', 'Bookkeeper', 'Payroll Specialist',
  // HR & People
  'Human Resources Manager', 'HR Director', 'VP of HR', 'CHRO',
  'Recruiter', 'Senior Recruiter', 'Technical Recruiter', 'Talent Acquisition Specialist',
  'Talent Acquisition Manager', 'HR Business Partner', 'HR Generalist', 'HR Coordinator',
  'Compensation Analyst', 'Benefits Specialist', 'Learning & Development Manager',
  'People Operations Manager', 'HRIS Analyst', 'Diversity & Inclusion Manager',
  // Operations & Strategy
  'Operations Manager', 'Senior Operations Manager', 'Operations Director', 'VP of Operations', 'COO',
  'Supply Chain Manager', 'Supply Chain Analyst', 'Logistics Manager', 'Logistics Coordinator',
  'Procurement Manager', 'Procurement Specialist', 'Purchasing Manager',
  'Strategy Consultant', 'Management Consultant', 'Senior Consultant', 'Principal Consultant',
  'Business Analyst', 'Senior Business Analyst', 'Systems Analyst', 'Process Analyst',
  'Consultant', 'Technology Consultant', 'SAP Consultant', 'ERP Consultant',
  // Healthcare
  'Registered Nurse', 'RN', 'Nurse Practitioner', 'Licensed Practical Nurse',
  'Physician', 'Surgeon', 'Physician Assistant', 'Medical Assistant',
  'Pharmacist', 'Clinical Pharmacist', 'Pharmacy Technician',
  'Physical Therapist', 'Occupational Therapist', 'Speech Therapist',
  'Medical Laboratory Technician', 'Radiologist', 'Dentist', 'Optometrist',
  'Healthcare Administrator', 'Clinical Research Coordinator', 'Biostatistician',
  // Education & Research
  'Teacher', 'High School Teacher', 'Elementary School Teacher', 'Special Education Teacher',
  'Professor', 'Assistant Professor', 'Associate Professor', 'Adjunct Professor', 'Lecturer',
  'Research Assistant', 'Graduate Research Assistant', 'Postdoctoral Researcher', 'Postdoc',
  'Lab Manager', 'Lab Technician', 'Academic Advisor', 'Curriculum Developer',
  'Instructional Designer', 'Training Manager', 'Corporate Trainer',
  // Legal
  'Attorney', 'Lawyer', 'Associate Attorney', 'Senior Associate', 'Partner',
  'Paralegal', 'Legal Assistant', 'Legal Counsel', 'General Counsel',
  'Compliance Analyst', 'Contract Manager', 'IP Attorney', 'Corporate Lawyer',
  // Engineering (Non-Software)
  'Mechanical Engineer', 'Senior Mechanical Engineer', 'Electrical Engineer', 'Electronics Engineer',
  'Civil Engineer', 'Structural Engineer', 'Chemical Engineer', 'Process Engineer',
  'Biomedical Engineer', 'Environmental Engineer', 'Industrial Engineer', 'Manufacturing Engineer',
  'Quality Engineer', 'Reliability Engineer', 'Safety Engineer',
  'Aerospace Engineer', 'Materials Engineer', 'Petroleum Engineer',
  // Creative & Media
  'Video Editor', 'Videographer', 'Photographer', 'Animator', '3D Artist',
  'Sound Designer', 'Audio Engineer', 'Music Producer',
  'Film Director', 'Screenwriter', 'Journalist', 'Editor', 'News Reporter',
  // Administration
  'Executive Assistant', 'Personal Assistant', 'Administrative Assistant', 'Office Manager',
  'Receptionist', 'Office Administrator', 'Virtual Assistant',
  // Executive
  'CEO', 'President', 'Vice President', 'Senior Vice President', 'Executive Vice President',
  'Managing Director', 'General Manager', 'Director', 'Senior Director',
  'Manager', 'Senior Manager', 'Coordinator', 'Supervisor',
  'Analyst', 'Specialist', 'Associate', 'Senior Associate',
  'Intern', 'Trainee', 'Fellow', 'Apprentice', 'Co-op Student'
];

export const companies = [
  'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Netflix', 'Tesla',
  'IBM', 'Oracle', 'Salesforce', 'Adobe', 'SAP', 'Intel', 'Cisco',
  'NVIDIA', 'AMD', 'Qualcomm', 'Broadcom', 'Texas Instruments',
  'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Bank of America',
  'Wells Fargo', 'Citigroup', 'Barclays', 'HSBC', 'Deutsche Bank',
  'McKinsey', 'Bain', 'Boston Consulting Group', 'Deloitte', 'PwC',
  'Ernst & Young', 'KPMG', 'Accenture', 'Capgemini', 'Infosys', 'TCS', 'Wipro',
  'Uber', 'Airbnb', 'Stripe', 'Square', 'Shopify', 'Spotify', 'Twitter',
  'LinkedIn', 'Snap', 'Pinterest', 'Reddit', 'Discord', 'Slack',
  'Databricks', 'Snowflake', 'Palantir', 'Confluent', 'HashiCorp',
  'Docker', 'GitLab', 'GitHub', 'Atlassian', 'JetBrains',
  'Samsung', 'Sony', 'LG', 'Panasonic', 'Siemens', 'Bosch',
  'Boeing', 'Lockheed Martin', 'SpaceX', 'Blue Origin', 'Northrop Grumman',
  'Johnson & Johnson', 'Pfizer', 'Merck', 'AbbVie', 'Novartis',
  'Procter & Gamble', 'Unilever', 'Nestlé', 'Coca-Cola', 'PepsiCo',
  'Nike', 'Adidas', 'Under Armour', 'Lululemon',
  'Walmart', 'Target', 'Costco', 'Home Depot', 'Kroger',
  'Disney', 'Warner Bros', 'NBCUniversal', 'Paramount', 'Sony Pictures',
  'Toyota', 'Honda', 'Ford', 'General Motors', 'BMW', 'Mercedes-Benz', 'Volkswagen',
  'FedEx', 'UPS', 'DHL', 'Maersk',
  'Visa', 'Mastercard', 'PayPal', 'American Express',
  'General Electric', '3M', 'Honeywell', 'Caterpillar',
  'ExxonMobil', 'Chevron', 'Shell', 'BP',
  'AT&T', 'Verizon', 'T-Mobile', 'Comcast',
  'Startup', 'Freelance', 'Self-Employed', 'Contract'
];

export const skills = {
  programming: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB',
    'Perl', 'Lua', 'Haskell', 'Elixir', 'Clojure', 'F#', 'Julia',
    'Assembly', 'COBOL', 'Fortran', 'Groovy', 'Objective-C',
    'HTML', 'CSS', 'SQL', 'GraphQL', 'Bash', 'PowerShell'
  ],
  frontend: [
    'React', 'Angular', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby',
    'Redux', 'MobX', 'Zustand', 'React Query', 'SWR',
    'Tailwind CSS', 'Bootstrap', 'Material UI', 'Chakra UI', 'Ant Design',
    'Sass', 'LESS', 'Styled Components', 'CSS Modules', 'PostCSS',
    'Webpack', 'Vite', 'Parcel', 'Rollup', 'esbuild',
    'Jest', 'Cypress', 'Playwright', 'Testing Library', 'Storybook',
    'Three.js', 'D3.js', 'Chart.js', 'Framer Motion', 'GSAP',
    'PWA', 'Web Components', 'Service Workers', 'WebSocket', 'WebRTC'
  ],
  backend: [
    'Node.js', 'Express', 'NestJS', 'Fastify', 'Koa',
    'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring',
    'Ruby on Rails', 'Sinatra', 'Laravel', 'Symfony',
    'ASP.NET', '.NET Core', 'Gin', 'Fiber', 'Echo',
    'REST API', 'GraphQL', 'gRPC', 'WebSocket', 'SOAP',
    'Microservices', 'Serverless', 'Event-Driven Architecture',
    'OAuth', 'JWT', 'OpenID Connect', 'SAML'
  ],
  database: [
    'PostgreSQL', 'MySQL', 'MariaDB', 'SQL Server', 'Oracle DB',
    'MongoDB', 'Cassandra', 'DynamoDB', 'CouchDB', 'Firebase',
    'Redis', 'Memcached', 'Elasticsearch', 'Solr',
    'Neo4j', 'ArangoDB', 'InfluxDB', 'TimescaleDB',
    'SQLite', 'H2', 'Supabase', 'PlanetScale', 'CockroachDB'
  ],
  cloud: [
    'AWS', 'Azure', 'Google Cloud', 'DigitalOcean', 'Heroku', 'Vercel', 'Netlify',
    'EC2', 'S3', 'Lambda', 'CloudFront', 'RDS', 'ECS', 'EKS',
    'Azure Functions', 'Azure DevOps', 'App Service',
    'Cloud Functions', 'Cloud Run', 'BigQuery', 'Pub/Sub',
    'Terraform', 'Pulumi', 'CloudFormation', 'CDK',
    'Docker', 'Kubernetes', 'Helm', 'Istio', 'ArgoCD',
    'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI',
    'Ansible', 'Chef', 'Puppet', 'SaltStack'
  ],
  data: [
    'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn', 'Plotly',
    'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'XGBoost',
    'Spark', 'Hadoop', 'Hive', 'Kafka', 'Airflow', 'dbt',
    'Tableau', 'Power BI', 'Looker', 'Metabase', 'Grafana',
    'Snowflake', 'Databricks', 'Redshift', 'BigQuery',
    'NLP', 'Computer Vision', 'Deep Learning', 'Reinforcement Learning',
    'A/B Testing', 'Statistical Analysis', 'Data Modeling', 'ETL'
  ],
  tools: [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
    'Jira', 'Confluence', 'Trello', 'Asana', 'Monday.com', 'Linear', 'Notion',
    'VS Code', 'IntelliJ IDEA', 'PyCharm', 'WebStorm', 'Vim', 'Neovim',
    'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin',
    'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro',
    'Postman', 'Insomnia', 'Swagger', 'OpenAPI',
    'Datadog', 'New Relic', 'Splunk', 'PagerDuty', 'Sentry',
    'Slack', 'Teams', 'Zoom', 'Google Workspace', 'Microsoft 365',
    'Linux', 'macOS', 'Windows', 'WSL'
  ],
  soft: [
    'Leadership', 'Team Management', 'Mentoring', 'Coaching',
    'Communication', 'Presentation', 'Public Speaking', 'Technical Writing',
    'Problem Solving', 'Critical Thinking', 'Analytical Thinking',
    'Project Management', 'Time Management', 'Prioritization',
    'Agile', 'Scrum', 'Kanban', 'Lean', 'Six Sigma',
    'Collaboration', 'Cross-functional Teams', 'Stakeholder Management',
    'Strategic Planning', 'Decision Making', 'Negotiation',
    'Adaptability', 'Creativity', 'Innovation', 'Attention to Detail',
    'Customer Focus', 'Empathy', 'Conflict Resolution'
  ]
};

export const allSkills = Object.values(skills).flat();

export const degrees = [
  'High School Diploma', 'GED',
  'Associate of Arts (AA)', 'Associate of Science (AS)', 'Associate of Applied Science (AAS)',
  'Bachelor of Arts (BA)', 'Bachelor of Science (BS)', 'Bachelor of Engineering (BE)',
  'Bachelor of Technology (BTech)', 'Bachelor of Business Administration (BBA)',
  'Bachelor of Fine Arts (BFA)', 'Bachelor of Music (BM)',
  'Master of Arts (MA)', 'Master of Science (MS)', 'Master of Engineering (ME)',
  'Master of Business Administration (MBA)', 'Master of Fine Arts (MFA)',
  'Master of Public Health (MPH)', 'Master of Public Administration (MPA)',
  'Master of Education (MEd)', 'Master of Laws (LLM)',
  'Doctor of Philosophy (PhD)', 'Doctor of Education (EdD)',
  'Doctor of Medicine (MD)', 'Doctor of Dental Surgery (DDS)',
  'Juris Doctor (JD)', 'Doctor of Pharmacy (PharmD)',
  'Doctor of Engineering (DEng)', 'Doctor of Business Administration (DBA)',
  'Diploma', 'Certificate', 'Professional Certificate',
  'Postgraduate Diploma', 'Postgraduate Certificate'
];

export const fields = [
  'Computer Science', 'Software Engineering', 'Information Technology',
  'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Biomedical Engineering', 'Aerospace Engineering',
  'Industrial Engineering', 'Environmental Engineering',
  'Data Science', 'Artificial Intelligence', 'Machine Learning',
  'Cybersecurity', 'Information Systems', 'Computer Engineering',
  'Mathematics', 'Statistics', 'Applied Mathematics',
  'Physics', 'Chemistry', 'Biology', 'Biochemistry', 'Bioinformatics',
  'Business Administration', 'Finance', 'Accounting', 'Economics',
  'Marketing', 'Management', 'International Business',
  'Psychology', 'Sociology', 'Political Science', 'History',
  'English', 'Communications', 'Journalism', 'Media Studies',
  'Graphic Design', 'Industrial Design', 'Architecture',
  'Nursing', 'Medicine', 'Public Health', 'Pharmacy',
  'Law', 'Criminal Justice', 'Public Policy',
  'Education', 'Curriculum Design', 'Special Education',
  'Philosophy', 'Linguistics', 'Anthropology',
  'Music', 'Fine Arts', 'Theater', 'Film Studies'
];

export const institutions = [
  'MIT', 'Stanford University', 'Harvard University', 'Caltech',
  'University of California, Berkeley', 'University of Michigan',
  'Carnegie Mellon University', 'Georgia Institute of Technology',
  'University of Illinois Urbana-Champaign', 'University of Texas at Austin',
  'University of Washington', 'Columbia University', 'Yale University',
  'Princeton University', 'Cornell University', 'University of Pennsylvania',
  'University of Southern California', 'New York University',
  'University of California, Los Angeles', 'University of California, San Diego',
  'Duke University', 'Northwestern University', 'Brown University',
  'University of Wisconsin-Madison', 'University of Minnesota',
  'Purdue University', 'Penn State', 'Ohio State University',
  'University of Florida', 'University of North Carolina',
  'Virginia Tech', 'University of Virginia', 'Rice University',
  'University of Cambridge', 'University of Oxford', 'Imperial College London',
  'ETH Zurich', 'Technical University of Munich', 'University of Toronto',
  'University of British Columbia', 'McGill University',
  'National University of Singapore', 'University of Tokyo',
  'Tsinghua University', 'Peking University', 'IIT Bombay', 'IIT Delhi',
  'University of Melbourne', 'University of Sydney',
  'Community College', 'Online University', 'Bootcamp'
];

export const certifications = [
  'AWS Certified Solutions Architect', 'AWS Certified Developer',
  'AWS Certified Cloud Practitioner', 'AWS Certified DevOps Engineer',
  'Azure Administrator (AZ-104)', 'Azure Developer (AZ-204)',
  'Azure Solutions Architect (AZ-305)', 'Azure Fundamentals (AZ-900)',
  'Google Cloud Professional Cloud Architect', 'Google Cloud Associate Cloud Engineer',
  'Certified Kubernetes Administrator (CKA)', 'Certified Kubernetes Application Developer (CKAD)',
  'Docker Certified Associate', 'HashiCorp Terraform Associate',
  'CompTIA Security+', 'CompTIA Network+', 'CompTIA A+',
  'CISSP', 'CISM', 'CEH', 'OSCP',
  'PMP (Project Management Professional)', 'PRINCE2',
  'Certified Scrum Master (CSM)', 'Certified Scrum Product Owner (CSPO)',
  'SAFe Agilist', 'PMI-ACP',
  'Six Sigma Green Belt', 'Six Sigma Black Belt', 'Lean Six Sigma',
  'Google Analytics Certification', 'HubSpot Inbound Marketing',
  'Salesforce Administrator', 'Salesforce Developer',
  'Oracle Certified Professional', 'Microsoft Certified: Azure',
  'Cisco CCNA', 'Cisco CCNP', 'Cisco CCIE',
  'ITIL Foundation', 'ITIL Expert',
  'CPA (Certified Public Accountant)', 'CFA (Chartered Financial Analyst)',
  'FRM (Financial Risk Manager)', 'ACCA',
  'PHR', 'SPHR', 'SHRM-CP', 'SHRM-SCP',
  'Google UX Design Certificate', 'Meta Frontend Developer Certificate',
  'IBM Data Science Professional Certificate',
  'First Aid / CPR', 'OSHA Safety Certification'
];

export const languages = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean',
  'Arabic', 'Hindi', 'Bengali', 'Urdu', 'Punjabi', 'Tamil', 'Telugu',
  'Russian', 'Ukrainian', 'Polish', 'Czech', 'Romanian', 'Hungarian',
  'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Turkish', 'Persian (Farsi)', 'Hebrew', 'Greek',
  'Thai', 'Vietnamese', 'Indonesian', 'Malay', 'Filipino (Tagalog)',
  'Swahili', 'Yoruba', 'Amharic',
  'Sign Language (ASL)', 'Sign Language (BSL)'
];

export const proficiencyLevels = [
  'Native', 'Fluent', 'Advanced', 'Professional Working',
  'Intermediate', 'Conversational', 'Elementary', 'Basic'
];

export const industries = [
  'Technology', 'Software', 'SaaS', 'FinTech', 'HealthTech', 'EdTech',
  'E-commerce', 'Social Media', 'Gaming', 'Cybersecurity',
  'Finance', 'Banking', 'Insurance', 'Investment',
  'Healthcare', 'Pharmaceuticals', 'Biotechnology', 'Medical Devices',
  'Consulting', 'Professional Services', 'Legal',
  'Manufacturing', 'Automotive', 'Aerospace', 'Defense',
  'Energy', 'Oil & Gas', 'Renewable Energy', 'Utilities',
  'Retail', 'Consumer Goods', 'Food & Beverage',
  'Telecommunications', 'Media', 'Entertainment',
  'Real Estate', 'Construction', 'Architecture',
  'Transportation', 'Logistics', 'Supply Chain',
  'Education', 'Non-Profit', 'Government', 'Public Sector',
  'Agriculture', 'Mining', 'Hospitality', 'Travel'
];

// Structured location data: city → state → country
export const locationData = [
  // India — All major cities with states
  { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  { city: 'Delhi', state: 'Delhi', country: 'India' },
  { city: 'New Delhi', state: 'Delhi', country: 'India' },
  { city: 'Bangalore', state: 'Karnataka', country: 'India' },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India' },
  { city: 'Hyderabad', state: 'Telangana', country: 'India' },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  { city: 'Kolkata', state: 'West Bengal', country: 'India' },
  { city: 'Pune', state: 'Maharashtra', country: 'India' },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Surat', state: 'Gujarat', country: 'India' },
  { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Nagpur', state: 'Maharashtra', country: 'India' },
  { city: 'Indore', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India' },
  { city: 'Patna', state: 'Bihar', country: 'India' },
  { city: 'Vadodara', state: 'Gujarat', country: 'India' },
  { city: 'Gurgaon', state: 'Haryana', country: 'India' },
  { city: 'Gurugram', state: 'Haryana', country: 'India' },
  { city: 'Noida', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Greater Noida', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Faridabad', state: 'Haryana', country: 'India' },
  { city: 'Chandigarh', state: 'Chandigarh', country: 'India' },
  { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India' },
  { city: 'Kochi', state: 'Kerala', country: 'India' },
  { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India' },
  { city: 'Mysore', state: 'Karnataka', country: 'India' },
  { city: 'Mangalore', state: 'Karnataka', country: 'India' },
  { city: 'Nashik', state: 'Maharashtra', country: 'India' },
  { city: 'Rajkot', state: 'Gujarat', country: 'India' },
  { city: 'Agra', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India' },
  { city: 'Dehradun', state: 'Uttarakhand', country: 'India' },
  { city: 'Ranchi', state: 'Jharkhand', country: 'India' },
  { city: 'Bhubaneswar', state: 'Odisha', country: 'India' },
  { city: 'Raipur', state: 'Chhattisgarh', country: 'India' },
  { city: 'Guwahati', state: 'Assam', country: 'India' },
  { city: 'Amritsar', state: 'Punjab', country: 'India' },
  { city: 'Ludhiana', state: 'Punjab', country: 'India' },
  { city: 'Jodhpur', state: 'Rajasthan', country: 'India' },
  { city: 'Udaipur', state: 'Rajasthan', country: 'India' },
  { city: 'Madurai', state: 'Tamil Nadu', country: 'India' },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India' },
  { city: 'Hubli', state: 'Karnataka', country: 'India' },
  { city: 'Aurangabad', state: 'Maharashtra', country: 'India' },
  { city: 'Thane', state: 'Maharashtra', country: 'India' },
  { city: 'Navi Mumbai', state: 'Maharashtra', country: 'India' },
  // USA
  { city: 'San Francisco', state: 'California', country: 'United States' },
  { city: 'New York', state: 'New York', country: 'United States' },
  { city: 'Seattle', state: 'Washington', country: 'United States' },
  { city: 'Austin', state: 'Texas', country: 'United States' },
  { city: 'Boston', state: 'Massachusetts', country: 'United States' },
  { city: 'Los Angeles', state: 'California', country: 'United States' },
  { city: 'Chicago', state: 'Illinois', country: 'United States' },
  { city: 'Denver', state: 'Colorado', country: 'United States' },
  { city: 'Atlanta', state: 'Georgia', country: 'United States' },
  { city: 'Miami', state: 'Florida', country: 'United States' },
  { city: 'Dallas', state: 'Texas', country: 'United States' },
  { city: 'Houston', state: 'Texas', country: 'United States' },
  { city: 'San Jose', state: 'California', country: 'United States' },
  { city: 'San Diego', state: 'California', country: 'United States' },
  { city: 'Portland', state: 'Oregon', country: 'United States' },
  { city: 'Phoenix', state: 'Arizona', country: 'United States' },
  { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States' },
  { city: 'Washington', state: 'DC', country: 'United States' },
  { city: 'Minneapolis', state: 'Minnesota', country: 'United States' },
  { city: 'Nashville', state: 'Tennessee', country: 'United States' },
  { city: 'Raleigh', state: 'North Carolina', country: 'United States' },
  { city: 'Detroit', state: 'Michigan', country: 'United States' },
  { city: 'Pittsburgh', state: 'Pennsylvania', country: 'United States' },
  // Europe
  { city: 'London', state: 'England', country: 'United Kingdom' },
  { city: 'Manchester', state: 'England', country: 'United Kingdom' },
  { city: 'Edinburgh', state: 'Scotland', country: 'United Kingdom' },
  { city: 'Berlin', state: 'Berlin', country: 'Germany' },
  { city: 'Munich', state: 'Bavaria', country: 'Germany' },
  { city: 'Amsterdam', state: 'North Holland', country: 'Netherlands' },
  { city: 'Paris', state: 'Île-de-France', country: 'France' },
  { city: 'Dublin', state: 'Leinster', country: 'Ireland' },
  { city: 'Zurich', state: 'Zurich', country: 'Switzerland' },
  { city: 'Stockholm', state: 'Stockholm', country: 'Sweden' },
  // Canada
  { city: 'Toronto', state: 'Ontario', country: 'Canada' },
  { city: 'Vancouver', state: 'British Columbia', country: 'Canada' },
  { city: 'Montreal', state: 'Quebec', country: 'Canada' },
  // Asia Pacific
  { city: 'Singapore', state: 'Singapore', country: 'Singapore' },
  { city: 'Tokyo', state: 'Tokyo', country: 'Japan' },
  { city: 'Seoul', state: 'Seoul', country: 'South Korea' },
  { city: 'Sydney', state: 'New South Wales', country: 'Australia' },
  { city: 'Melbourne', state: 'Victoria', country: 'Australia' },
  { city: 'Dubai', state: 'Dubai', country: 'UAE' },
  { city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'UAE' },
  { city: 'Tel Aviv', state: 'Tel Aviv', country: 'Israel' },
  // Others
  { city: 'São Paulo', state: 'São Paulo', country: 'Brazil' },
  { city: 'Mexico City', state: 'CDMX', country: 'Mexico' },
];

// Flat locations list for backward compatibility
export const locations = [
  ...locationData.map(l => l.city),
  'Remote', 'Hybrid', 'Onsite'
];

// Get location details by city name
export function getLocationByCity(cityName) {
  if (!cityName) return null;
  const q = cityName.toLowerCase().trim();
  return locationData.find(l => l.city.toLowerCase() === q) || null;
}

// Get all states for a country
export function getStatesForCountry(country) {
  if (!country) return [];
  const q = country.toLowerCase();
  const states = [...new Set(locationData.filter(l => l.country.toLowerCase() === q).map(l => l.state))];
  return states.sort();
}

// Get all countries
export function getCountries() {
  return [...new Set(locationData.map(l => l.country))].sort();
}

// Indian states list
export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Chandigarh', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];

export function getSuggestions(field, query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  let list;

  switch (field) {
    case 'jobTitle': case 'professionalTitle': case 'position': case 'role':
      list = jobTitles; break;
    case 'company': case 'employer': case 'organization': case 'institution':
      list = [...companies, ...institutions]; break;
    case 'skills': case 'skill': case 'technology': case 'technologies':
      list = allSkills; break;
    case 'degree': case 'qualification':
      list = degrees; break;
    case 'specialization': case 'fieldOfStudy': case 'field': case 'major':
      list = fields; break;
    case 'institution': case 'school': case 'university': case 'college':
      list = institutions; break;
    case 'certification': case 'certificationName': case 'name':
      list = certifications; break;
    case 'language':
      list = languages; break;
    case 'proficiency': case 'proficiencyLevel':
      list = proficiencyLevels; break;
    case 'location': case 'city':
      return getLocationSuggestions(q);
    case 'state': case 'province':
      list = [...new Set([...locationData.map(l => l.state), ...indianStates])]; break;
    case 'country':
      list = getCountries(); break;
    case 'industry':
      list = industries; break;
    default:
      return [];
  }

  return list
    .filter(item => item.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStart = a.toLowerCase().startsWith(q);
      const bStart = b.toLowerCase().startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return a.localeCompare(b);
    })
    .slice(0, 8);
}

function getLocationSuggestions(q) {
  return locationData
    .filter(l => l.city.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStart = a.city.toLowerCase().startsWith(q);
      const bStart = b.city.toLowerCase().startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return a.city.localeCompare(b.city);
    })
    .slice(0, 8)
    .map(l => l.city);
}
