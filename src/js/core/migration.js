/**
 * Data Migration System
 * Handles schema version upgrades and data migrations
 */

import { SCHEMA_VERSION } from './schema.js';
import eventBus from './events.js';

/**
 * Migration tracking store key
 */
const MIGRATION_KEY = 'careercanvas_migration_version';

/**
 * Migration history store key
 */
const MIGRATION_HISTORY_KEY = 'careercanvas_migration_history';

/**
 * Migration functions array
 * Each migration transforms data from version N to N+1
 */
const migrations = [
  // Version 0 -> 1: Initial schema (no migration needed)
  // Add future migrations here as schema evolves
];

/**
 * Gets the current migration version from localStorage
 * @returns {number} Current version
 */
export function getCurrentVersion() {
  const stored = localStorage.getItem(MIGRATION_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Sets the current migration version in localStorage
 * @param {number} version - Version to set
 */
export function setCurrentVersion(version) {
  localStorage.setItem(MIGRATION_KEY, version.toString());
}

/**
 * Gets migration history
 * @returns {Array} Array of migration history entries
 */
export function getMigrationHistory() {
  const stored = localStorage.getItem(MIGRATION_HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Adds an entry to migration history
 * @param {Object} entry - History entry
 */
export function addMigrationHistory(entry) {
  const history = getMigrationHistory();
  history.push({
    ...entry,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(MIGRATION_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Checks if migration is needed
 * @returns {boolean} True if migration is needed
 */
export function needsMigration() {
  const currentVersion = getCurrentVersion();
  return currentVersion < SCHEMA_VERSION;
}

/**
 * Runs all necessary migrations
 * @param {Object} data - Data to migrate
 * @returns {Promise<Object>} Migrated data
 */
export async function runMigrations(data) {
  const startVersion = getCurrentVersion();
  const targetVersion = SCHEMA_VERSION;

  if (startVersion >= targetVersion) {
    return data;
  }

  console.log(`Migrating data from version ${startVersion} to ${targetVersion}`);

  let migratedData = data;
  const appliedMigrations = [];

  // Run each migration in sequence
  for (let version = startVersion; version < targetVersion; version++) {
    const migrationIndex = version;

    if (migrationIndex < migrations.length && migrations[migrationIndex]) {
      try {
        console.log(`Applying migration: ${version} -> ${version + 1}`);

        migratedData = await migrations[migrationIndex](migratedData);

        appliedMigrations.push({
          from: version,
          to: version + 1,
          success: true
        });

        // Update version after each successful migration
        setCurrentVersion(version + 1);
      } catch (error) {
        console.error(`Migration failed: ${version} -> ${version + 1}`, error);

        appliedMigrations.push({
          from: version,
          to: version + 1,
          success: false,
          error: error.message
        });

        // Add to history and throw error
        addMigrationHistory({
          startVersion,
          targetVersion,
          appliedMigrations,
          success: false,
          error: error.message
        });

        throw new Error(`Migration failed at version ${version}: ${error.message}`);
      }
    } else {
      // No migration function defined for this version - just increment
      setCurrentVersion(version + 1);
    }
  }

  // Record successful migration
  addMigrationHistory({
    startVersion,
    targetVersion,
    appliedMigrations,
    success: true
  });

  console.log('Migration completed successfully');

  return migratedData;
}

/**
 * Migrates a single document
 * @param {Object} document - Document to migrate
 * @returns {Object} Migrated document
 */
export function migrateDocument(document) {
  if (!document) {
    return null;
  }

  const docVersion = document.schemaVersion || 0;

  if (docVersion >= SCHEMA_VERSION) {
    return document;
  }

  let migrated = { ...document };

  // Apply document-specific migrations
  if (docVersion < 1) {
    migrated = migrateDocumentV0ToV1(migrated);
  }

  // Add future version migrations here
  // if (docVersion < 2) {
  //   migrated = migrateDocumentV1ToV2(migrated);
  // }

  migrated.schemaVersion = SCHEMA_VERSION;
  migrated.lastModified = new Date().toISOString();

  return migrated;
}

/**
 * Migrates document from version 0 to 1
 * @private
 */
function migrateDocumentV0ToV1(document) {
  // This is the initial version, so just ensure all required fields exist
  return {
    ...document,
    schemaVersion: 1,
    // Ensure metadata fields exist
    tags: document.tags || [],
    pinned: document.pinned || false,
    archived: document.archived || false,
    // Ensure personalInfo has all fields
    personalInfo: {
      fullName: '',
      preferredName: '',
      professionalTitle: '',
      resumeHeadline: '',
      pronunciation: '',
      email: '',
      secondaryEmail: '',
      phone: '',
      secondaryPhone: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      fullAddress: '',
      personalWebsite: '',
      portfolioUrl: '',
      linkedinUrl: '',
      githubUrl: '',
      gitlabUrl: '',
      stackOverflowUrl: '',
      orcid: '',
      googleScholar: '',
      behance: '',
      dribbble: '',
      otherProfiles: [],
      workAuthorization: '',
      willingToRelocate: false,
      remotePreference: '',
      photograph: null,
      signature: null,
      ...document.personalInfo
    },
    // Ensure sections object exists
    sections: document.sections || {}
  };
}

/**
 * Validates backward compatibility
 * @param {Object} oldData - Data before migration
 * @param {Object} newData - Data after migration
 * @returns {boolean} True if backward compatible
 */
export function validateBackwardCompatibility(oldData, newData) {
  // Check that no data was lost during migration
  // This is a basic check - can be expanded based on requirements

  if (!oldData || !newData) {
    return false;
  }

  // Ensure document count is preserved
  if (oldData.documents && newData.documents) {
    if (oldData.documents.length !== newData.documents.length) {
      console.warn('Document count mismatch after migration');
      return false;
    }
  }

  return true;
}

/**
 * Creates a backup before migration
 * @param {Object} data - Data to backup
 * @returns {string} Backup key
 */
export function createBackup(data) {
  const backupKey = `careercanvas_backup_${Date.now()}`;
  const backup = {
    version: getCurrentVersion(),
    timestamp: new Date().toISOString(),
    data
  };

  try {
    localStorage.setItem(backupKey, JSON.stringify(backup));
    return backupKey;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return null;
  }
}

/**
 * Restores from a backup
 * @param {string} backupKey - Backup key
 * @returns {Object|null} Restored data
 */
export function restoreBackup(backupKey) {
  try {
    const stored = localStorage.getItem(backupKey);
    if (!stored) {
      return null;
    }

    const backup = JSON.parse(stored);
    return backup.data;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return null;
  }
}

/**
 * Lists available backups
 * @returns {Array} Array of backup info
 */
export function listBackups() {
  const backups = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key && key.startsWith('careercanvas_backup_')) {
      try {
        const stored = localStorage.getItem(key);
        const backup = JSON.parse(stored);

        backups.push({
          key,
          version: backup.version,
          timestamp: backup.timestamp,
          size: stored.length
        });
      } catch (error) {
        console.error(`Failed to parse backup ${key}:`, error);
      }
    }
  }

  // Sort by timestamp descending
  backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return backups;
}

/**
 * Deletes a backup
 * @param {string} backupKey - Backup key
 * @returns {boolean} True if deleted
 */
export function deleteBackup(backupKey) {
  try {
    localStorage.removeItem(backupKey);
    return true;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return false;
  }
}

/**
 * Deletes old backups (keeps most recent N)
 * @param {number} keepCount - Number of backups to keep
 */
export function pruneBackups(keepCount = 5) {
  const backups = listBackups();

  if (backups.length <= keepCount) {
    return;
  }

  const toDelete = backups.slice(keepCount);

  for (const backup of toDelete) {
    deleteBackup(backup.key);
  }
}

/**
 * Initializes migration system
 * Checks version and runs migrations if needed
 */
export async function initMigrations() {
  const currentVersion = getCurrentVersion();

  console.log(`Current migration version: ${currentVersion}`);
  console.log(`Target schema version: ${SCHEMA_VERSION}`);

  if (currentVersion === 0) {
    // First time setup
    setCurrentVersion(SCHEMA_VERSION);
    console.log('First time setup - migration version set to', SCHEMA_VERSION);
  } else if (needsMigration()) {
    console.log('Migration needed');
    eventBus.emit('migration:needed', { currentVersion, targetVersion: SCHEMA_VERSION });
  } else {
    console.log('No migration needed');
  }
}

/**
 * Resets migration system (for testing/development)
 */
export function resetMigrations() {
  localStorage.removeItem(MIGRATION_KEY);
  localStorage.removeItem(MIGRATION_HISTORY_KEY);
}
