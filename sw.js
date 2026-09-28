const CACHE_NAME = 'careercanvas-v18';
const STATIC_ASSETS = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './icon.svg',
  './src/css/variables.css',
  './src/css/reset.css',
  './src/css/base.css',
  './src/css/layout.css',
  './src/css/components.css',
  './src/css/dashboard.css',
  './src/css/editor.css',
  './src/css/templates.css',
  './src/css/print.css',
  './src/css/onboarding.css',
  './src/css/utilities.css',
  './src/css/experience-calculator.css',
  './src/css/design-panel.css',
  './src/css/font-manager.css',
  './src/css/auth.css',
  './src/css/skills-matrix.css',
  './src/css/job-matcher.css',
  './src/css/theme-studio.css',
  './src/css/section-studio.css',
  './src/css/pdf-studio.css',
  './src/css/package-studio.css',
  './src/css/timeline-studio.css',
  './src/css/consistency-studio.css',
  './src/css/privacy-studio.css',
  './src/css/localization-studio.css',
  './src/css/portfolio-studio.css',
  './src/css/link-qr-studio.css',
  './src/css/space-optimizer.css',
  './src/css/a11y-inspector.css',
  './src/css/version-studio.css',
  './src/css/data-studio.css',
  './src/css/stress-lab.css',
  './src/css/pages.css',
  './src/js/app.js',
  './src/js/core/state.js',
  './src/js/core/db.js',
  './src/js/core/router.js',
  './src/js/core/events.js',
  './src/js/core/schema.js',
  './src/js/core/migration.js',
  './src/js/core/template-engine.js',
  './src/js/core/theme-engine.js',
  './src/js/auth/auth-config.js',
  './src/js/auth/auth-service.js',
  './src/js/auth/auth-state.js',
  './src/js/auth/auth-ui.js',
  './src/js/auth/cloud-store.js',
  './src/js/auth/user-store.js',
  './src/js/utils/sanitize.js',
  './src/js/utils/rich-text-sanitizer.js',
  './src/js/utils/format.js',
  './src/js/utils/id.js',
  './src/js/utils/text-parse.js',
  './src/js/utils/skill-links.js',
  './src/js/utils/resume-score.js',
  './src/js/utils/proofread.js',
  './src/js/utils/linkedin-score.js',
  './src/js/utils/keywords.js',
  './src/js/utils/jd-parse.js',
  './src/js/utils/interview-pack.js',
  './src/js/utils/import-pipeline.js',
  './src/js/utils/find-replace.js',
  './src/js/utils/docx-export.js',
  './src/js/utils/cover-draft.js',
  './src/js/utils/bullet-score.js',
  './src/js/utils/ats-audit.js',
  './src/js/templates/index.js',
  './src/js/templates/ats-templates.js',
  './src/js/templates/professional-templates.js',
  './src/js/templates/technical-templates.js',
  './src/js/templates/creative-templates.js',
  './src/js/templates/cover-letter-templates.js',
  './src/js/templates/reference-templates.js',
  './src/js/templates/student-templates.js',
  './src/js/templates/executive-templates.js',
  './src/js/templates/academic-templates.js',
  './src/js/data/sample-data.js',
  './src/js/data/writing-tips.js',
  './src/js/data/action-verbs.js',
  './src/js/data/autocomplete-data.js',
  './src/js/data/typography-presets.js',
  './src/js/pages/static-pages.js',
  './src/js/modules/ai-formatter.js',
  './src/js/modules/local-ai.js',
  './src/js/modules/advanced-local-ai.js',
  './src/js/modules/local-resume-parser.js',
  './src/js/modules/onboarding.js',
  './src/js/modules/dashboard.js',
  './src/js/modules/editor.js',
  './src/js/modules/template-gallery.js',
  './src/js/modules/design-panel.js',
  './src/js/modules/ats-checker.js',
  './src/js/modules/export-manager.js',
  './src/js/modules/export-wizard.js',
  './src/js/modules/import-manager.js',
  './src/js/modules/toast.js',
  './src/js/modules/modal.js',
  './src/js/modules/master-profile.js',
  './src/js/modules/settings.js',
  './src/js/modules/application-tracker.js',
  './src/js/modules/experience-calculator.js',
  './src/js/modules/font-manager.js',
  './src/js/modules/floating-toolbar.js',
  './src/js/modules/autocomplete.js',
  './src/js/modules/job-matcher.js',
  './src/js/modules/skills-matrix.js',
  './src/js/modules/skills-matrix-data.js',
  './src/js/modules/skills-matrix-analyzer.js',
  './src/js/modules/theme-studio.js',
  './src/js/modules/section-studio.js',
  './src/js/modules/pdf-studio.js',
  './src/js/modules/package-studio.js',
  './src/js/modules/timeline-studio.js',
  './src/js/modules/consistency-studio.js',
  './src/js/modules/privacy-studio.js',
  './src/js/modules/localization-studio.js',
  './src/js/modules/portfolio-studio.js',
  './src/js/modules/link-qr-studio.js',
  './src/js/modules/space-optimizer.js',
  './src/js/modules/smart-formatter.js',
  './src/js/modules/a11y-inspector.js',
  './src/js/modules/version-studio.js',
  './src/js/modules/data-studio.js',
  './src/js/modules/stress-lab.js',
  './src/js/modules/print-manager.js'
];
// NOTE: src/js/auth/local-config.js is intentionally NOT cached — it is a
// gitignored localhost-only dev file that may contain real Supabase keys.
// tools/* pages are dev-only and never cached either.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some assets failed to cache:', err);
        return cache.addAll(STATIC_ASSETS.filter(url => url.endsWith('.html') || url === './'));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
