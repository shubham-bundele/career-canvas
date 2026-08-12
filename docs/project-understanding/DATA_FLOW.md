# CareerCanvas Data Flow

## Application Initialization
1. `index.html` loads, shows loading spinner
2. `src/js/app.js` instantiates `CareerCanvasApp`
3. `app.init()`:
   - Creates `Database` instance, calls `db.open()` (IndexedDB init)
   - Registers all templates via `registerAllTemplates(templateEngine)`
   - Sets up `window.CC` global context
   - Registers routes
   - Sets up global event listeners
   - Sets up keyboard shortcuts
   - Renders shell (header, main, toast container, modal container)
   - Sets up theme from localStorage
   - Checks onboarding status
   - Calls `router.start()` -> immediately calls `handleHashChange()`

## Document Lifecycle
1. **Create**: `createEmptyDocument(type)` -> `db.put('documents', doc)` -> navigate to editor
2. **Open**: `eventBus.emit('document:open', {id})` -> `router.navigate('/editor/{id}')`
3. **Edit**: Editor loads doc from DB -> user edits -> autosave (1s debounce) -> `db.put()`
4. **Duplicate**: Deep clone with new UUID -> `db.put()`
5. **Rename**: Update name field + lastModified -> `db.put()`
6. **Archive**: Toggle archived flag -> `db.put()`
7. **Delete**: Confirm dialog -> `db.delete('documents', id)`
8. **Export**: Read from DB -> JSON blob -> download

## Event Flow
- Dashboard actions emit events on `eventBus` (singleton)
- `app.js` `setupGlobalEvents()` listens for document:create/open/delete/duplicate/rename/export
- Global handlers perform DB operations and show toasts
- Router emits `ROUTE_BEFORE_CHANGE` and `ROUTE_CHANGE`
- State changes emit `STATE_CHANGE`
- DB operations emit `DB_READY`, `DB_ERROR`, `DB_STORAGE_WARNING`

## View Lifecycle
1. `router.handleHashChange()` calls `app.showView(viewName, params)`
2. `showView()`:
   - Calls `currentView.destroy()` if exists
   - Updates active nav
   - Clears main container
   - Instantiates new view class
   - Calls `view.render()` -> returns DOM element
   - Appends to main container

## Global Context (`window.CC`)
```js
window.CC = {
  state,           // StateManager singleton
  db,              // Database instance
  events,          // EventBus singleton
  toast,           // Toast singleton
  modal,           // Modal singleton
  templateEngine,  // TemplateEngine instance
  exportManager,   // ExportManager instance
  importManager,   // ImportManager instance
  atsChecker,      // ATSChecker instance
  router,          // Router instance
  app              // CareerCanvasApp instance
}
```
