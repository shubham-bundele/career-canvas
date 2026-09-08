/**
 * Skill → free learning resource map (pure, Node-safe).
 * Curated official docs / free courses for common skills; everything else
 * falls back to a web search URL so a "Learn" button never dead-ends.
 */

const SKILL_URLS = {
  'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'typescript': 'https://www.typescriptlang.org/docs/',
  'python': 'https://docs.python.org/3/tutorial/',
  'java': 'https://docs.oracle.com/en/java/',
  'react': 'https://react.dev/learn',
  'angular': 'https://angular.dev/overview',
  'vue': 'https://vuejs.org/guide/introduction.html',
  'node': 'https://nodejs.org/en/learn',
  'node.js': 'https://nodejs.org/en/learn',
  'sql': 'https://www.w3schools.com/sql/',
  'postgresql': 'https://www.postgresql.org/docs/current/tutorial.html',
  'mysql': 'https://dev.mysql.com/doc/mysql-getting-started/en/',
  'mongodb': 'https://learn.mongodb.com/',
  'redis': 'https://redis.io/learn/',
  'graphql': 'https://graphql.org/learn/',
  'aws': 'https://skillbuilder.aws/',
  'azure': 'https://learn.microsoft.com/en-us/training/azure/',
  'gcp': 'https://cloud.google.com/learn/training',
  'docker': 'https://docs.docker.com/get-started/',
  'kubernetes': 'https://kubernetes.io/docs/tutorials/',
  'terraform': 'https://developer.hashicorp.com/terraform/tutorials',
  'git': 'https://git-scm.com/doc',
  'linux': 'https://training.linuxfoundation.org/resources/free-courses/',
  'figma': 'https://help.figma.com/hc/en-us/categories/360002051613',
  'selenium': 'https://www.selenium.dev/documentation/',
  'playwright': 'https://playwright.dev/docs/intro',
  'cypress': 'https://docs.cypress.io/guides/overview/why-cypress',
  'agile': 'https://www.atlassian.com/agile',
  'scrum': 'https://www.scrum.org/learning-series',
  'pmp': 'https://www.pmi.org/certifications/project-management-pmp',
  'seo': 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
  'tableau': 'https://help.tableau.com/current/guides/get-started-tutorial/en-us/get_started_welcome.htm',
  'power bi': 'https://learn.microsoft.com/en-us/training/powerplatform/power-bi',
  'excel': 'https://support.microsoft.com/en-us/excel',
  'salesforce': 'https://trailhead.salesforce.com/',
  'machine learning': 'https://developers.google.com/machine-learning/crash-course',
  'data analysis': 'https://www.kaggle.com/learn',
  'data science': 'https://www.kaggle.com/learn',
  'ci/cd': 'https://about.gitlab.com/topics/ci-cd/',
  'rest': 'https://restfulapi.net/',
  'jira': 'https://www.atlassian.com/software/jira/guides/getting-started/basics',
};

/** Learn URL for any skill (curated link or honest search fallback). */
export function learnUrl(skill) {
  const key = String(skill || '').trim().toLowerCase();
  if (SKILL_URLS[key]) return { url: SKILL_URLS[key], curated: true };
  return { url: `https://www.google.com/search?q=${encodeURIComponent(`learn ${skill} free course`)}`, curated: false };
}

export default { learnUrl };
