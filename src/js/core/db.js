/**
 * IndexedDB Abstraction Layer
 * Provides promise-based CRUD operations for all data stores
 */

import eventBus, { EVENTS } from './events.js';

const DB_NAME = 'careercanvas-db';
const DB_VERSION = 4;

/**
 * Object store names
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
};

export class Database {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = null;
  }

  /**
   * Initializes the database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        const error = new Error('Failed to open database');
        eventBus.emit(EVENTS.DB_ERROR, { error });
        reject(error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.ready = true;
        eventBus.emit(EVENTS.DB_READY);
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db, event.oldVersion, event.newVersion);
      };
    });

    return this.initPromise;
  }

  /**
   * Creates object stores and indexes
   * @private
   */
  createStores(db, oldVersion, newVersion) {
    // Documents store
    if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
      const documentsStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
      documentsStore.createIndex('type', 'type', { unique: false });
      documentsStore.createIndex('lastModified', 'lastModified', { unique: false });
      documentsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      documentsStore.createIndex('pinned', 'pinned', { unique: false });
      documentsStore.createIndex('archived', 'archived', { unique: false });
      documentsStore.createIndex('targetRole', 'targetRole', { unique: false });
    }

    // Master Profile store
    if (!db.objectStoreNames.contains(STORES.MASTER_PROFILE)) {
      const masterProfileStore = db.createObjectStore(STORES.MASTER_PROFILE, { keyPath: 'id' });
      masterProfileStore.createIndex('type', 'type', { unique: false });
      masterProfileStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Job Descriptions store
    if (!db.objectStoreNames.contains(STORES.JOB_DESCRIPTIONS)) {
      const jobDescStore = db.createObjectStore(STORES.JOB_DESCRIPTIONS, { keyPath: 'id' });
      jobDescStore.createIndex('company', 'company', { unique: false });
      jobDescStore.createIndex('role', 'role', { unique: false });
      jobDescStore.createIndex('lastModified', 'lastModified', { unique: false });
      jobDescStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
    }

    // Applications store
    if (!db.objectStoreNames.contains(STORES.APPLICATIONS)) {
      const applicationsStore = db.createObjectStore(STORES.APPLICATIONS, { keyPath: 'id' });
      applicationsStore.createIndex('company', 'company', { unique: false });
      applicationsStore.createIndex('role', 'role', { unique: false });
      applicationsStore.createIndex('status', 'status', { unique: false });
      applicationsStore.createIndex('appliedDate', 'appliedDate', { unique: false });
      applicationsStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Content Library store
    if (!db.objectStoreNames.contains(STORES.CONTENT_LIBRARY)) {
      const contentStore = db.createObjectStore(STORES.CONTENT_LIBRARY, { keyPath: 'id' });
      contentStore.createIndex('type', 'type', { unique: false });
      contentStore.createIndex('category', 'category', { unique: false });
      contentStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      contentStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Snapshots store
    if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
      const snapshotsStore = db.createObjectStore(STORES.SNAPSHOTS, { keyPath: 'id' });
      snapshotsStore.createIndex('documentId', 'documentId', { unique: false });
      snapshotsStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Images store
    if (!db.objectStoreNames.contains(STORES.IMAGES)) {
      const imagesStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
      imagesStore.createIndex('type', 'type', { unique: false });
      imagesStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Design Presets store
    if (!db.objectStoreNames.contains(STORES.DESIGN_PRESETS)) {
      const presetsStore = db.createObjectStore(STORES.DESIGN_PRESETS, { keyPath: 'id' });
      presetsStore.createIndex('name', 'name', { unique: false });
      presetsStore.createIndex('category', 'category', { unique: false });
    }

    // Match Analyses store (added in v2)
    if (!db.objectStoreNames.contains(STORES.MATCH_ANALYSES)) {
      const matchStore = db.createObjectStore(STORES.MATCH_ANALYSES, { keyPath: 'id' });
      matchStore.createIndex('resumeId', 'resumeId', { unique: false });
      matchStore.createIndex('jobDescriptionId', 'jobDescriptionId', { unique: false });
      matchStore.createIndex('createdAt', 'createdAt', { unique: false });
      matchStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Skills Matrices store (added in v3)
    if (!db.objectStoreNames.contains(STORES.SKILLS_MATRICES)) {
      const smStore = db.createObjectStore(STORES.SKILLS_MATRICES, { keyPath: 'id' });
      smStore.createIndex('documentId', 'documentId', { unique: false });
      smStore.createIndex('createdAt', 'createdAt', { unique: false });
      smStore.createIndex('lastModified', 'lastModified', { unique: false });
    }

    // Custom Section Definitions store (added in v4)
    if (!db.objectStoreNames.contains(STORES.CUSTOM_SECTIONS)) {
      const csStore = db.createObjectStore(STORES.CUSTOM_SECTIONS, { keyPath: 'id' });
      csStore.createIndex('name', 'name', { unique: false });
      csStore.createIndex('category', 'category', { unique: false });
      csStore.createIndex('createdAt', 'createdAt', { unique: false });
    }
  }

  /**
   * Ensures database is ready
   * @private
   */
  async ensureReady() {
    if (!this.ready) {
      await this.init();
    }
  }

  /**
   * Gets a transaction
   * @private
   */
  getTransaction(storeName, mode = 'readonly') {
    return this.db.transaction(storeName, mode);
  }

  /**
   * Gets an object store
   * @private
   */
  getStore(storeName, mode = 'readonly') {
    const transaction = this.getTransaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Creates a record
   * @param {string} storeName - Store name
   * @param {Object} data - Data to store
   * @returns {Promise<string>} ID of created record
   */
  async create(storeName, data) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Reads a record by ID
   * @param {string} storeName - Store name
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async read(storeName, id) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Updates a record
   * @param {string} storeName - Store name
   * @param {Object} data - Data to update (must include id)
   * @returns {Promise<string>} ID of updated record
   */
  async update(storeName, data) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes a record
   * @param {string} storeName - Store name
   * @param {string} id - Record ID
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets all records from a store
   * @param {string} storeName - Store name
   * @returns {Promise<Array>} Array of records
   */
  async getAll(storeName) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets records by index
   * @param {string} storeName - Store name
   * @param {string} indexName - Index name
   * @param {*} value - Index value to match
   * @returns {Promise<Array>} Array of matching records
   */
  async getByIndex(storeName, indexName, value) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queries records with a filter function
   * @param {string} storeName - Store name
   * @param {Function} filterFn - Filter function (record) => boolean
   * @returns {Promise<Array>} Array of matching records
   */
  async query(storeName, filterFn) {
    const all = await this.getAll(storeName);
    return all.filter(filterFn);
  }

  /**
   * Counts records in a store
   * @param {string} storeName - Store name
   * @returns {Promise<number>} Number of records
   */
  async count(storeName) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readonly');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clears all records from a store
   * @param {string} storeName - Store name
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Estimates storage usage
   * @returns {Promise<Object>} Storage estimate
   */
  async estimateStorage() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        available: true
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      // Warn if usage is over 80%
      if (percentage > 80) {
        eventBus.emit(EVENTS.DB_STORAGE_WARNING, { usage, quota, percentage });
      }

      return {
        usage,
        quota,
        percentage,
        available: percentage < 95
      };
    } catch (error) {
      console.error('Failed to estimate storage:', error);
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        available: true
      };
    }
  }

  /**
   * Exports all data from database
   * @returns {Promise<Object>} All data organized by store
   */
  async exportAll() {
    await this.ensureReady();

    const data = {};

    for (const storeName of Object.values(STORES)) {
      data[storeName] = await this.getAll(storeName);
    }

    return data;
  }

  /**
   * Imports data into database
   * @param {Object} data - Data organized by store
   * @param {boolean} clearFirst - Whether to clear stores before import
   * @returns {Promise<void>}
   */
  async importAll(data, clearFirst = false) {
    await this.ensureReady();

    for (const [storeName, records] of Object.entries(data)) {
      if (!Object.values(STORES).includes(storeName)) {
        continue;
      }

      if (clearFirst) {
        await this.clear(storeName);
      }

      for (const record of records) {
        try {
          await this.create(storeName, record);
        } catch (error) {
          // If record exists, update it
          await this.update(storeName, record);
        }
      }
    }
  }

  /**
   * Closes the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ready = false;
      this.initPromise = null;
    }
  }

  /**
   * Deletes the entire database
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async open() {
    return this.init();
  }

  async put(storeName, data) {
    return this.update(storeName, data);
  }

  async get(storeName, id) {
    return this.read(storeName, id);
  }
}

// Create and export singleton instance
const database = new Database();

export default database;

// Export convenience methods
export const {
  init,
  create,
  read,
  update,
  delete: remove,
  getAll,
  getByIndex,
  query,
  count,
  clear,
  estimateStorage,
  exportAll,
  importAll,
  close,
  deleteDatabase
} = database;
