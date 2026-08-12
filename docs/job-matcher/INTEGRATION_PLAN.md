# Job Description Matcher — Integration Plan

## Files to Create
1. `src/js/modules/job-matcher.js` — Main module (~2000-3000 lines estimated)
2. `src/css/job-matcher.css` — Module styles
3. `src/js/data/matcher-dictionaries.js` — Stop words, phrases, abbreviations, skills
4. `tests/job-matcher.test.html` — Automated test suite

## Files to Modify
1. `src/js/app.js` — Add route, import, view case, nav link, export backup store
2. `src/js/core/db.js` — Bump DB_VERSION to 2, add matchAnalyses store in createStores
3. `index.html` — Add CSS link for job-matcher.css
4. `src/css/dashboard.css` — Minor additions for matcher card styling (if needed)

## Database Migration
```js
// In db.js createStores(), add:
if (!db.objectStoreNames.contains('matchAnalyses')) {
  const store = db.createObjectStore('matchAnalyses', { keyPath: 'id' });
  store.createIndex('resumeId', 'resumeId', { unique: false });
  store.createIndex('jobDescriptionId', 'jobDescriptionId', { unique: false });
  store.createIndex('createdAt', 'createdAt', { unique: false });
  store.createIndex('lastModified', 'lastModified', { unique: false });
}
```
- DB_VERSION changes from 1 to 2
- Existing stores and data are preserved
- Only the new store is created during upgrade

## Route Registration
```js
// In app.js setupRoutes():
this.router.on('/job-matcher', () => this.showView('job-matcher'));
```

## View Integration
```js
// In app.js showView() switch:
case 'job-matcher': {
  const { JobMatcher } = await import('./modules/job-matcher.js');
  this.currentView = new JobMatcher(this.db, this.events);
  const el = await this.currentView.render();
  main.appendChild(el);
  break;
}
```

## Navigation Entry
- Add link in header nav alongside existing items
- Add entry on dashboard as career tool card

## Export All Integration
- Add 'matchAnalyses' to the stores list in dashboard:exportAll handler

## Backward Compatibility
- All existing documents remain unchanged
- All existing stores and indexes preserved
- New store only created on DB upgrade
- No schema changes to existing document types
- Import handler already skips unknown stores
