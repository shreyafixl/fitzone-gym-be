/**
 * Backup Service
 * Handles database backup and restore operations
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupService {
  /**
   * Create database backup
   * @param {String} backupType - Type of backup (full, incremental, manual)
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} - Backup result
   */
  static async createBackup(backupType = 'manual', options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups');
      const backupFileName = `backup-${backupType}-${timestamp}`;
      const backupPath = path.join(backupDir, backupFileName);

      // Create backups directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Get MongoDB connection URI from environment
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitzone';
      
      // Extract database name from URI
      const dbName = this.extractDatabaseName(mongoUri);

      // Create backup using mongodump
      const command = `mongodump --uri="${mongoUri}" --out="${backupPath}" --gzip`;

      await execPromise(command);

      // Get backup size
      const backupSize = this.getDirectorySize(backupPath);

      // Get collection information
      const collections = await this.getCollectionInfo(backupPath, dbName);

      return {
        success: true,
        backupFileName,
        backupFilePath: backupPath,
        backupSize,
        collections,
        message: 'Backup created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Backup failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Restore database from backup
   * @param {String} backupPath - Path to backup directory
   * @returns {Promise<Object>} - Restore result
   */
  static async restoreBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitzone';

      // Restore using mongorestore
      const command = `mongorestore --uri="${mongoUri}" --gzip --drop "${backupPath}"`;

      await execPromise(command);

      return {
        success: true,
        message: 'Database restored successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Restore failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Delete backup file
   * @param {String} backupPath - Path to backup directory
   * @returns {Promise<Object>} - Delete result
   */
  static async deleteBackup(backupPath) {
    try {
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }

      return {
        success: true,
        message: 'Backup deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Delete failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Get directory size in bytes
   * @param {String} dirPath - Directory path
   * @returns {Number} - Size in bytes
   */
  static getDirectorySize(dirPath) {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    });

    return totalSize;
  }

  /**
   * Get collection information from backup
   * @param {String} backupPath - Backup directory path
   * @param {String} dbName - Database name
   * @returns {Array} - Collection information
   */
  static getCollectionInfo(backupPath, dbName) {
    try {
      const dbPath = path.join(backupPath, dbName);
      
      if (!fs.existsSync(dbPath)) {
        return [];
      }

      const files = fs.readdirSync(dbPath);
      const collections = [];

      files.forEach((file) => {
        if (file.endsWith('.bson.gz') || file.endsWith('.bson')) {
          const collectionName = file.replace('.bson.gz', '').replace('.bson', '');
          const filePath = path.join(dbPath, file);
          const stats = fs.statSync(filePath);

          collections.push({
            name: collectionName,
            size: stats.size,
            documentCount: 0, // Would need to parse BSON to get actual count
          });
        }
      });

      return collections;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract database name from MongoDB URI
   * @param {String} uri - MongoDB connection URI
   * @returns {String} - Database name
   */
  static extractDatabaseName(uri) {
    try {
      const match = uri.match(/\/([^/?]+)(\?|$)/);
      return match ? match[1] : 'fitzone';
    } catch (error) {
      return 'fitzone';
    }
  }

  /**
   * Format file size to human-readable format
   * @param {Number} bytes - Size in bytes
   * @returns {String} - Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate backup file
   * @param {String} backupPath - Path to backup
   * @returns {Boolean} - Is valid
   */
  static validateBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        return false;
      }

      const stats = fs.statSync(backupPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backup metadata
   * @param {String} backupPath - Path to backup
   * @returns {Object} - Backup metadata
   */
  static getBackupMetadata(backupPath) {
    try {
      const stats = fs.statSync(backupPath);
      const size = this.getDirectorySize(backupPath);

      return {
        size,
        formattedSize: this.formatFileSize(size),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isValid: this.validateBackup(backupPath),
      };
    } catch (error) {
      return null;
    }
  }
}

module.exports = BackupService;
