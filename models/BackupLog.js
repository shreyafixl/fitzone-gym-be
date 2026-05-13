const mongoose = require('mongoose');

/**
 * BackupLog Schema
 * Tracks database backups and data exports
 */
const backupLogSchema = new mongoose.Schema(
  {
    backupType: {
      type: String,
      enum: {
        values: ['full', 'incremental', 'manual'],
        message: 'Backup type must be full, incremental, or manual',
      },
      required: [true, 'Backup type is required'],
      index: true,
    },
    backupFileName: {
      type: String,
      required: [true, 'Backup file name is required'],
      trim: true,
    },
    backupFilePath: {
      type: String,
      required: [true, 'Backup file path is required'],
      trim: true,
    },
    backupSize: {
      type: Number, // Size in bytes
      default: 0,
      min: [0, 'Backup size cannot be negative'],
    },
    backupStatus: {
      type: String,
      enum: {
        values: ['completed', 'failed', 'processing'],
        message: 'Backup status must be completed, failed, or processing',
      },
      default: 'processing',
      index: true,
    },
    collections: [
      {
        name: {
          type: String,
          required: true,
        },
        documentCount: {
          type: Number,
          default: 0,
        },
        size: {
          type: Number,
          default: 0,
        },
      },
    ],
    metadata: {
      databaseName: {
        type: String,
        default: null,
      },
      mongoVersion: {
        type: String,
        default: null,
      },
      nodeVersion: {
        type: String,
        default: process.version,
      },
      environment: {
        type: String,
        default: process.env.NODE_ENV || 'development',
      },
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // Duration in seconds
      default: null,
    },
    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuperAdmin',
        required: [true, 'Created by user is required'],
      },
      userName: {
        type: String,
        required: true,
      },
    },
    isAutomatic: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
backupLogSchema.index({ backupType: 1, backupStatus: 1 });
backupLogSchema.index({ createdAt: -1 });
backupLogSchema.index({ 'createdBy.userId': 1 });
backupLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

/**
 * Method to mark backup as completed
 */
backupLogSchema.methods.markCompleted = function (fileSize, collections) {
  this.backupStatus = 'completed';
  this.backupSize = fileSize;
  this.endTime = new Date();
  this.duration = Math.round((this.endTime - this.startTime) / 1000); // in seconds
  if (collections) {
    this.collections = collections;
  }
  return this.save();
};

/**
 * Method to mark backup as failed
 */
backupLogSchema.methods.markFailed = function (errorMessage) {
  this.backupStatus = 'failed';
  this.errorMessage = errorMessage;
  this.endTime = new Date();
  this.duration = Math.round((this.endTime - this.startTime) / 1000); // in seconds
  return this.save();
};

/**
 * Static method to get recent backups
 */
backupLogSchema.statics.getRecentBackups = function (limit = 10) {
  return this.find({ backupStatus: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy.userId', 'fullName email');
};

/**
 * Static method to get backup statistics
 */
backupLogSchema.statics.getBackupStats = async function () {
  const [totalBackups, completedBackups, failedBackups, totalSize] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ backupStatus: 'completed' }),
    this.countDocuments({ backupStatus: 'failed' }),
    this.aggregate([
      { $match: { backupStatus: 'completed' } },
      { $group: { _id: null, totalSize: { $sum: '$backupSize' } } },
    ]),
  ]);

  return {
    totalBackups,
    completedBackups,
    failedBackups,
    processingBackups: await this.countDocuments({ backupStatus: 'processing' }),
    totalSize: totalSize[0]?.totalSize || 0,
  };
};

/**
 * Static method to cleanup old backups
 */
backupLogSchema.statics.cleanupOldBackups = async function (retentionDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = await this.find({
    createdAt: { $lt: cutoffDate },
    backupStatus: 'completed',
  });

  // Delete old backup files and records
  // Note: Actual file deletion should be handled by the service
  return oldBackups;
};

const BackupLog = mongoose.model('BackupLog', backupLogSchema);

module.exports = BackupLog;
