const mongoose = require('mongoose');

/**
 * AuditLog Schema
 * Tracks all important actions performed in the system
 */
const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'performedBy.userModel',
        required: [true, 'User ID is required'],
        index: true,
      },
      userModel: {
        type: String,
        required: true,
        enum: ['User', 'Trainer', 'SuperAdmin'],
        default: 'User',
      },
      userName: {
        type: String,
        required: true,
        trim: true,
      },
      userEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      userRole: {
        type: String,
        required: true,
        enum: ['member', 'trainer', 'admin', 'superadmin'],
      },
    },
    actionType: {
      type: String,
      required: [true, 'Action type is required'],
      enum: {
        values: [
          'create',
          'read',
          'update',
          'delete',
          'login',
          'logout',
          'password-change',
          'password-reset',
          'permission-change',
          'settings-update',
          'export',
          'import',
          'backup',
          'restore',
          'other',
        ],
        message: 'Invalid action type',
      },
      index: true,
    },
    moduleName: {
      type: String,
      required: [true, 'Module name is required'],
      enum: {
        values: [
          'authentication',
          'users',
          'trainers',
          'branches',
          'memberships',
          'attendance',
          'schedules',
          'workouts',
          'diets',
          'financial',
          'analytics',
          'communication',
          'support',
          'settings',
          'security',
          'system',
        ],
        message: 'Invalid module name',
      },
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    targetModel: {
      type: String,
      default: null,
      enum: [
        'User',
        'Trainer',
        'SuperAdmin',
        'Branch',
        'Membership',
        'Attendance',
        'Schedule',
        'WorkoutPlan',
        'DietPlan',
        'Transaction',
        'Announcement',
        'Message',
        'Notification',
        'SupportTicket',
        'SystemSettings',
        null,
      ],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    changes: {
      before: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      after: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    ipAddress: {
      type: String,
      required: [true, 'IP address is required'],
      trim: true,
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
    deviceInfo: {
      browser: {
        type: String,
        trim: true,
      },
      os: {
        type: String,
        trim: true,
      },
      device: {
        type: String,
        trim: true,
      },
    },
    requestMethod: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      default: null,
    },
    requestUrl: {
      type: String,
      trim: true,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
auditLogSchema.index({ 'performedBy.userId': 1, createdAt: -1 });
auditLogSchema.index({ actionType: 1, moduleName: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, createdAt: -1 });

/**
 * Static method to create audit log
 */
auditLogSchema.statics.createLog = async function (logData) {
  return await this.create(logData);
};

/**
 * Static method to get logs by user
 */
auditLogSchema.statics.getByUser = function (userId, options = {}) {
  const { limit = 100, skip = 0, actionType, moduleName, startDate, endDate } = options;

  const query = { 'performedBy.userId': userId };

  if (actionType) query.actionType = actionType;
  if (moduleName) query.moduleName = moduleName;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get logs by IP address
 */
auditLogSchema.statics.getByIP = function (ipAddress, options = {}) {
  const { limit = 100, skip = 0 } = options;

  return this.find({ ipAddress })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get failed actions
 */
auditLogSchema.statics.getFailedActions = function (options = {}) {
  const { limit = 100, skip = 0, startDate, endDate } = options;

  const query = { success: false };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get login activities
 */
auditLogSchema.statics.getLoginActivities = function (options = {}) {
  const { limit = 100, skip = 0, startDate, endDate } = options;

  const query = { actionType: { $in: ['login', 'logout'] } };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get statistics
 */
auditLogSchema.statics.getStatistics = async function (startDate, endDate) {
  const query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [
    totalLogs,
    successfulActions,
    failedActions,
    byActionType,
    byModule,
    uniqueUsers,
    uniqueIPs,
  ] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, success: true }),
    this.countDocuments({ ...query, success: false }),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$actionType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$moduleName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    this.distinct('performedBy.userId', query),
    this.distinct('ipAddress', query),
  ]);

  return {
    totalLogs,
    successfulActions,
    failedActions,
    byActionType: byActionType.map(item => ({ actionType: item._id, count: item.count })),
    byModule: byModule.map(item => ({ module: item._id, count: item.count })),
    uniqueUsers: uniqueUsers.length,
    uniqueIPs: uniqueIPs.length,
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
