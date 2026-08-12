const CACHE_NAME = 'careercanvas-v14';
const STATIC_ASSETS = [
  './',
  './index.html',
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
  './src/js/app.js',
  './src/js/core/state.js',
  './src/js/core/db.js',
  './src/js/core/router.js',
  './src/js/core/events.js',
  './src/js/core/schema.js',
  './src/js/core/migration.js',
  './src/js/core/template-engine.js',
  './src/js/utils/sanitize.js',
  './src/js/utils/format.js',
  './src/js/utils/id.js',
  './src/js/modules/onboarding.js',
  './src/js/modules/dashboard.js',
  './src/js/modules/editor.js',
  './src/js/modules/template-gallery.js',
  './src/js/modules/design-panel.js',
  './src/js/modules/ats-checker.js',
  './src/js/modules/export-manager.js',
  './src/js/modules/import-manager.js',
  './src/js/modules/toast.js',
  './src/js/modules/modal.js',
  './src/js/modules/master-profile.js',
  './src/js/modules/settings.js',
  './src/js/modules/application-tracker.js',
  './src/js/templates/index.js',
  './src/js/templates/ats-templates.js',
  './src/js/templates/professional-templates.js',
  './src/js/templates/technical-templates.js',
  './src/js/templates/creative-templates.js',
  './src/js/templates/cover-letter-templates.js',
  './src/js/templates/reference-templates.js',
  './src/js/data/sample-data.js',
  './src/js/data/writing-tips.js',
  './src/js/modules/experience-calculator.js',
  './src/css/pages.css',
  './src/js/pages/static-pages.js'
];

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
