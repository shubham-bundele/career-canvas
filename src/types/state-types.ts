// Type definitions for CareerCanvas state management

export interface StateManager {
  getState(): any
  get(path: string): any
  setState(path: string, value: any, addToHistory?: boolean): void
  setMultiple(updates: { path: string, value: any }, addToHistory?: boolean): void
  subscribe(pathOrCallback: string | Function, callback?: Function): Function
  unsubscribe(path: string, callback: Function): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  clearHistory(): void
  createSnapshot(name: string): void
  restoreSnapshot(name: string): boolean
  deleteSnapshot(name: string): boolean
  getSnapshotNames(): string[]
  beginBatch(): void
  commitBatch(): void
  cancelBatch(): void
  createSelector(selector: Function): Function
}

/**
 * Event Bus Types
 */
export interface EventBus {
  on(event: string, handler: Function): Function
  off(event: string, handler: Function): void
  emit(event: string, data?: any): void
  once(event: string, handler: Function): Function
  clear(event?: string): void
  listenerCount(event: string): number
  eventNames(): string[]
  listeners(event: string): Function[]
}

/**
 * Database Store Names
 */
export const STORES = {
  DOCUMENTS: 'documents',
  MASTER_PROFILE: 'masterProfile',
  JOB_DESCRIPTIONS: 'jobDescriptions',
  APPLICATIONS: 'applications',
  CONTENT_LIBRARY: 'contentLibrary',
  SNAPSHOTS: 'snapshots',
  IMAGES: 'images',
  DESIGN_PRESETS: 'designPresets',
  MATCH_ANALYSES: 'matchAnalyses',
  SKILLS_MATRICES: 'skillsMatrices',
  CUSTOM_SECTIONS: 'customSections'
}

/** Database Methods - convenience exports */
export const dbInit: () => Promise<IDBDatabase> = () => Promise.resolve({} as IDBDatabase)
export const dbOpen: () => Promise<void> = () => Promise.resolve()
export const dbCreate: (storeName: string, data: any) => Promise<string> = (storeName, data) => Promise.resolve('id')
export const dbRead: (storeName: string, id: string) => Promise<any | null> = (storeName, id) => Promise.resolve(null)
export const dbUpdate: (storeName: string, data: any) => Promise<string> = (storeName, data) => Promise.resolve('id')
export const dbDelete: (storeName: string, id: string) => Promise<void> = (storeName, id) => Promise.resolve()
export const dbGetAll: (storeName: string) => Promise<any[]> = (storeName) => Promise.resolve([])
export const dbGetByIndex: (storeName: string, indexName: string, value: any) => Promise<any[]> = (storeName, indexName, value) => Promise.resolve([])
export const dbQuery: (storeName: string, filterFn: (record: any) => boolean) => Promise<any[]> = (storeName, filterFn) => Promise.resolve([])
export const dbCount: (storeName: string) => Promise<number> = (storeName) => Promise.resolve(0)
export const dbClear: (storeName: string) => Promise<void> = (storeName) => Promise.resolve()
export const dbExportAll: () => Promise<{ [key: string]: any[] }> = () => Promise.resolve({})
export const dbImportAll: (data: { [key: string]: any[] }, clearFirst?: boolean) => Promise<void> = (data, clearFirst) => Promise.resolve()
export const dbClose: () => void = () => {}
export const dbDeleteDatabase: () => Promise<void> = () => Promise.resolve()
export const dbEstimateStorage: () => Promise<{ usage: number, quota: number, percentage: number, available: boolean }> = () => Promise.resolve({ usage: 0, quota: 0, percentage: 0, available: true })

/** ID Generation */
export const generateUUID: () => string = () => '00000000-0000-0000-0000-000000000000'

/** Format Utilities */
export const timeAgo: (date: Date) => string = (date) => ''
export const wordCount: (text: string) => number = (text) => text.split(' ').length
export const charCount: (text: string) => number = (text) => text.length

/** Sanitize */
export const stripHTML: (html: string) => string = (html) => html.replace(/<[^>]*>/g, '')
export const escapeHtml: (str: string) => string = (str) => { const div = document.createElement('div'); div.textContent = str; return div.innerHTML }