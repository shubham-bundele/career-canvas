export const SKILL_ALIASES = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'es2023'],
  'typescript': ['ts'],
  'python': ['py', 'python3', 'python2'],
  'c++': ['cpp', 'cplusplus', 'c plus plus'],
  'c#': ['csharp', 'c sharp'],
  'c': [],
  '.net': ['dotnet', 'dot net'],
  'node.js': ['nodejs', 'node'],
  'react': ['reactjs', 'react.js'],
  'react native': ['react-native'],
  'vue.js': ['vue', 'vuejs'],
  'angular': ['angularjs', 'angular.js'],
  'next.js': ['nextjs', 'next'],
  'nuxt.js': ['nuxtjs', 'nuxt'],
  'express': ['expressjs', 'express.js'],
  'django': [],
  'flask': [],
  'fastapi': ['fast api'],
  'ruby on rails': ['rails', 'ror'],
  'spring boot': ['springboot', 'spring'],
  'asp.net': ['aspnet'],
  'graphql': ['graph ql'],
  'rest api': ['rest apis', 'restful', 'restful api', 'restful apis', 'rest'],
  'sql': ['structured query language'],
  'nosql': ['no sql', 'no-sql'],
  'postgresql': ['postgres', 'pg'],
  'mysql': ['my sql'],
  'mongodb': ['mongo'],
  'redis': [],
  'elasticsearch': ['elastic search', 'elastic'],
  'dynamodb': ['dynamo db', 'dynamo'],
  'sqlite': ['sq lite'],
  'amazon web services': ['aws'],
  'microsoft azure': ['azure'],
  'google cloud platform': ['gcp', 'google cloud'],
  'docker': [],
  'kubernetes': ['k8s'],
  'terraform': [],
  'jenkins': [],
  'github actions': ['gh actions'],
  'gitlab ci': ['gitlab ci/cd'],
  'ci/cd': ['ci cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  'continuous integration': ['ci'],
  'continuous delivery': ['cd'],
  'git': [],
  'svn': ['subversion'],
  'html': ['html5'],
  'css': ['css3'],
  'sass': ['scss'],
  'tailwind css': ['tailwindcss', 'tailwind'],
  'bootstrap': [],
  'webpack': [],
  'vite': [],
  'babel': [],
  'jest': [],
  'mocha': [],
  'cypress': [],
  'playwright': [],
  'selenium': [],
  'jira': [],
  'confluence': [],
  'figma': [],
  'sketch': [],
  'adobe xd': ['xd'],
  'photoshop': ['adobe photoshop'],
  'illustrator': ['adobe illustrator'],
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv'],
  'tensorflow': ['tf'],
  'pytorch': ['torch'],
  'pandas': [],
  'numpy': [],
  'scikit-learn': ['sklearn'],
  'data science': [],
  'data analysis': ['data analytics'],
  'data engineering': [],
  'data visualization': ['data viz'],
  'business intelligence': ['bi'],
  'power bi': ['powerbi'],
  'tableau': [],
  'd3.js': ['d3', 'd3js'],
  'agile': ['agile methodology'],
  'scrum': [],
  'kanban': [],
  'waterfall': [],
  'test-driven development': ['tdd'],
  'behavior-driven development': ['bdd'],
  'devops': ['dev ops'],
  'site reliability engineering': ['sre'],
  'microservices': ['micro services', 'microservice architecture'],
  'monolith': ['monolithic'],
  'serverless': [],
  'api design': ['api development'],
  'user interface': ['ui'],
  'user experience': ['ux'],
  'ui/ux': ['ui ux', 'ux/ui', 'ux ui'],
  'quality assurance': ['qa'],
  'project management': ['pm'],
  'product management': ['product mgmt'],
  'linux': [],
  'windows': [],
  'macos': ['mac os', 'macintosh'],
  'ios': [],
  'android': [],
  'swift': [],
  'kotlin': [],
  'java': [],
  'go': ['golang'],
  'rust': [],
  'php': [],
  'perl': [],
  'r': [],
  'matlab': [],
  'scala': [],
  'elixir': [],
  'haskell': [],
  'clojure': [],
  'apache kafka': ['kafka'],
  'rabbitmq': ['rabbit mq'],
  'apache spark': ['spark'],
  'apache airflow': ['airflow'],
  'snowflake': [],
  'databricks': [],
  'dbt': [],
  'langchain': [],
  'llamaindex': ['llama-index', 'llama index'],
  'hugging face': ['huggingface', 'hf'],
  'zustand': [],
  'redux': ['redux toolkit', 'rtk'],
  'svelte': ['sveltekit', 'svelte.js'],
  'astro': [],
  'prisma': ['prisma orm'],
  'drizzle': ['drizzle orm'],
  'supabase': [],
  'vitest': [],
  'hadoop': [],
  'aws lambda': ['lambda'],
  'amazon s3': ['s3'],
  'amazon ec2': ['ec2'],
  'amazon rds': ['rds'],
  'amazon sqs': ['sqs'],
  'amazon sns': ['sns'],
  'leadership': [],
  'mentoring': ['mentorship'],
  'communication': [],
  'teamwork': ['team collaboration', 'collaboration'],
  'problem solving': ['problem-solving'],
  'critical thinking': [],
  'time management': [],
  'presentation': ['presentations', 'public speaking']
};

export const SKILL_CATEGORIES = {
  'Programming Language': [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'go', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'elixir',
    'haskell', 'clojure', 'dart', 'lua', 'shell', 'bash', 'powershell',
    'html', 'css', 'sql'
  ],
  'Framework': [
    'react', 'angular', 'vue.js', 'next.js', 'nuxt.js', 'svelte', 'django',
    'flask', 'fastapi', 'express', 'ruby on rails', 'spring boot', 'asp.net',
    '.net', 'laravel', 'symfony', 'react native', 'flutter', 'electron',
    'bootstrap', 'tailwind css'
  ],
  'Library': [
    'jquery', 'lodash', 'axios', 'redux', 'zustand', 'mobx', 'rxjs', 'd3.js',
    'three.js', 'socket.io', 'pandas', 'numpy', 'scikit-learn',
    'tensorflow', 'pytorch', 'keras', 'langchain', 'llamaindex', 'hugging face',
    'prisma', 'drizzle'
  ],
  'Database': [
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
    'sqlite', 'oracle', 'sql server', 'cassandra', 'couchdb', 'neo4j',
    'firebase', 'supabase', 'snowflake'
  ],
  'Cloud Platform': [
    'amazon web services', 'microsoft azure', 'google cloud platform',
    'heroku', 'vercel', 'netlify', 'digitalocean', 'linode',
    'cloudflare', 'aws lambda', 'amazon s3', 'amazon ec2', 'amazon rds', 'databricks'
  ],
  'DevOps Tool': [
    'docker', 'kubernetes', 'terraform', 'ansible', 'puppet', 'chef',
    'jenkins', 'github actions', 'gitlab ci', 'circleci', 'travis ci',
    'ci/cd', 'nginx', 'apache', 'prometheus', 'grafana', 'datadog',
    'apache airflow', 'dbt'
  ],
  'Testing Tool': [
    'jest', 'vitest', 'mocha', 'cypress', 'playwright', 'selenium', 'junit',
    'pytest', 'rspec', 'jasmine', 'karma', 'enzyme', 'testing library',
    'postman', 'swagger'
  ],
  'Design Tool': [
    'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
    'invision', 'zeplin', 'canva', 'after effects', 'premiere pro'
  ],
  'Project Management': [
    'jira', 'confluence', 'trello', 'asana', 'monday.com', 'notion',
    'linear', 'clickup', 'basecamp', 'microsoft project'
  ],
  'Methodology': [
    'agile', 'scrum', 'kanban', 'waterfall', 'test-driven development',
    'behavior-driven development', 'devops', 'lean', 'six sigma',
    'design thinking', 'pair programming', 'code review'
  ],
  'Domain Knowledge': [
    'machine learning', 'deep learning', 'artificial intelligence',
    'natural language processing', 'computer vision', 'data science',
    'data analysis', 'data engineering', 'data visualization',
    'business intelligence', 'cybersecurity', 'blockchain',
    'internet of things', 'cloud computing', 'site reliability engineering',
    'microservices', 'api design', 'graphql', 'rest api', 'serverless'
  ],
  'Business Skill': [
    'project management', 'product management', 'business analysis',
    'stakeholder management', 'requirements gathering', 'strategic planning',
    'budgeting', 'vendor management', 'client relations', 'negotiation'
  ],
  'Leadership Skill': [
    'leadership', 'mentoring', 'team management', 'people management',
    'coaching', 'conflict resolution', 'decision making', 'delegation',
    'performance management', 'talent development'
  ],
  'Communication Skill': [
    'communication', 'teamwork', 'presentation', 'technical writing',
    'documentation', 'stakeholder communication', 'cross-functional collaboration',
    'public speaking', 'facilitation'
  ],
  'Version Control': [
    'git', 'svn', 'mercurial', 'github', 'gitlab', 'bitbucket'
  ],
  'Build Tool': [
    'webpack', 'vite', 'babel', 'rollup', 'parcel', 'esbuild',
    'gradle', 'maven', 'make', 'cmake', 'npm', 'yarn', 'pnpm'
  ],
  'Operating System': [
    'linux', 'windows', 'macos', 'ubuntu', 'centos', 'debian',
    'red hat', 'unix'
  ],
  'Mobile': [
    'ios', 'android', 'react native', 'flutter', 'xamarin',
    'swift', 'kotlin', 'objective-c'
  ]
};

export const EVIDENCE_TYPES = {
  SKILL_LISTING: 'skill_listing',
  EXPERIENCE_USAGE: 'experience_usage',
  ACHIEVEMENT_EVIDENCE: 'achievement_evidence',
  PROJECT_EVIDENCE: 'project_evidence',
  EDUCATION_EVIDENCE: 'education_evidence',
  CERTIFICATION_EVIDENCE: 'certification_evidence',
  TRAINING_EVIDENCE: 'training_evidence',
  PUBLICATION_EVIDENCE: 'publication_evidence',
  VOLUNTEER_EVIDENCE: 'volunteer_evidence',
  LEADERSHIP_EVIDENCE: 'leadership_evidence',
  CUSTOM_EVIDENCE: 'custom_evidence',
  SUMMARY_MENTION: 'summary_mention'
};

export const MATCH_TYPES = {
  EXACT: 'exact',
  ALIAS: 'alias',
  ABBREVIATION: 'abbreviation',
  PHRASE: 'phrase',
  POSSIBLE: 'possible'
};

export const STRENGTH_LEVELS = {
  STRONG: 'strong',
  MODERATE: 'moderate',
  LIMITED: 'limited',
  LISTED_ONLY: 'listed_only',
  SUGGESTED: 'suggested',
  NO_EVIDENCE: 'no_evidence'
};

export const SKILL_STATUSES = {
  MENTIONED: 'mentioned',
  EVIDENCED: 'evidenced',
  STRONGLY_EVIDENCED: 'strongly_evidenced',
  WEAKLY_EVIDENCED: 'weakly_evidenced',
  LISTED_WITHOUT_EVIDENCE: 'listed_without_evidence',
  EVIDENCE_WITHOUT_LISTING: 'evidence_without_listing',
  JOB_REQUIRED_EVIDENCED: 'job_required_evidenced',
  JOB_REQUIRED_NOT_EVIDENCED: 'job_required_not_evidenced',
  SUGGESTED_UNVERIFIED: 'suggested_unverified',
  REJECTED: 'rejected',
  USER_CONFIRMED: 'user_confirmed'
};
