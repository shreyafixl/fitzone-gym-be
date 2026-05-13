const mongoose = require('mongoose');

/**
 * SecurityEvent Schema
 * Tracks security-related events and threats
 */
const securityEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: [
          'failed-login',
          'account-lockout',
          'suspicious-activity',
          'unauthorized-access',
          'brute-force-attempt',
          'sql-injection-attempt',
          'xss-attempt',
          'csrf-attempt',
          'rate-limit-exceeded',
          'invalid-token',
          'expired-token',
          'permission-violation',
          'data-breach-attempt',
          'malware-detected',
          'ddos-attempt',
          'unusual-location',
          'unusual-device',
          'password-reset-abuse',
          'account-takeover-attempt',
          'other',
        ],
        message: 'Invalid event type',
      },
      index: true,
    },
    severity: {
      type: String,
      required: [true, 'Severity is required'],
      enum: {
        values: ['low', 'medium', 'high', 'critical'],
        message: 'Severity must be low, medium, high, or critical',
      },
      default: 'medium',
      index: true,
    },
    triggeredBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'triggeredBy.userModel',
        default: null,
        index: true,
      },
      userModel: {
        type: String,
        enum: ['User', 'Trainer', 'SuperAdmin', null],
        default: null,
      },
      userName: {
        type: String,
        trim: true,
        default: null,
      },
      userEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
      userRole: {
        type: String,
        enum: ['member', 'trainer', 'admin', 'superadmin', null],
        default: null,
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    ipAddress: {
      type: String,
      required: [true, 'IP address is required'],
      trim: true,
      index: true,
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
      userAgent: {
        type: String,
        trim: true,
      },
    },
    location: {
      country: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    eventStatus: {
      type: String,
      enum: {
        values: ['active', 'resolved', 'ignored'],
        message: 'Status must be active, resolved, or ignored',
      },
      default: 'active',
      index: true,
    },
    requestDetails: {
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      url: {
        type: String,
        trim: true,
      },
      headers: {
        type: mongoose.Schema.Types.Mixed,
      },
      body: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuperAdmin',
        default: null,
      },
      userName: {
        type: String,
        trim: true,
        default: null,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Resolution notes cannot exceed 1000 characters'],
      default: null,
    },
    actionTaken: {
      type: String,
      trim: true,
      maxlength: [500, 'Action taken cannot exceed 500 characters'],
      default: null,
    },
    relatedEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SecurityEvent',
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    autoResolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
securityEventSchema.index({ eventType: 1, severity: 1 });
securityEventSchema.index({ eventStatus: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });
securityEventSchema.index({ 'triggeredBy.userId': 1, createdAt: -1 });
securityEventSchema.index({ severity: 1, eventStatus: 1 });

/**
 * Method to resolve event
 */
securityEventSchema.methods.resolve = function (userId, userName, notes, actionTaken) {
  this.eventStatus = 'resolved';
  this.resolvedBy = {
    userId,
    userName,
    resolvedAt: new Date(),
  };
  this.resolutionNotes = notes;
  this.actionTaken = actionTaken;

  return this.save();
};

/**
 * Method to ignore event
 */
securityEventSchema.methods.ignore = function (userId, userName, reason) {
  this.eventStatus = 'ignored';
  this.resolvedBy = {
    userId,
    userName,
    resolvedAt: new Date(),
  };
  this.resolutionNotes = reason;

  return this.save();
};

/**
 * Method to increment attempt count
 */
securityEventSchema.methods.incrementAttempt = function () {
  this.attemptCount += 1;
  this.lastAttemptAt = new Date();

  return this.save();
};

/**
 * Static method to create security event
 */
securityEventSchema.statics.createEvent = async function (eventData) {
  return await this.create(eventData);
};

/**
 * Static method to get events by severity
 */
securityEventSchema.statics.getBySeverity = function (severity, options = {}) {
  const { limit = 100, skip = 0, status } = options;

  const query = { severity };
  if (status) query.eventStatus = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get active events
 */
securityEventSchema.statics.getActiveEvents = function (options = {}) {
  const { limit = 100, skip = 0, severity } = options;

  const query = { eventStatus: 'active' };
  if (severity) query.severity = severity;

  return this.find(query)
    .sort({ severity: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get events by IP
 */
securityEventSchema.statics.getByIP = function (ipAddress, options = {}) {
  const { limit = 100, skip = 0 } = options;

  return this.find({ ipAddress })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get events by user
 */
securityEventSchema.statics.getByUser = function (userId, options = {}) {
  const { limit = 100, skip = 0 } = options;

  return this.find({ 'triggeredBy.userId': userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get critical events
 */
securityEventSchema.statics.getCriticalEvents = function (options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    severity: 'critical',
    eventStatus: 'active',
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get statistics
 */
securityEventSchema.statics.getStatistics = async function (startDate, endDate) {
  const query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [
    totalEvents,
    activeEvents,
    resolvedEvents,
    ignoredEvents,
    criticalEvents,
    highEvents,
    mediumEvents,
    lowEvents,
    byEventType,
    uniqueIPs,
  ] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, eventStatus: 'active' }),
    this.countDocuments({ ...query, eventStatus: 'resolved' }),
    this.countDocuments({ ...query, eventStatus: 'ignored' }),
    this.countDocuments({ ...query, severity: 'critical' }),
    this.countDocuments({ ...query, severity: 'high' }),
    this.countDocuments({ ...query, severity: 'medium' }),
    this.countDocuments({ ...query, severity: 'low' }),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    this.distinct('ipAddress', query),
  ]);

  return {
    totalEvents,
    byStatus: {
      active: activeEvents,
      resolved: resolvedEvents,
      ignored: ignoredEvents,
    },
    bySeverity: {
      critical: criticalEvents,
      high: highEvents,
      medium: mediumEvents,
      low: lowEvents,
    },
    byEventType: byEventType.map(item => ({ eventType: item._id, count: item.count })),
    uniqueIPs: uniqueIPs.length,
  };
};

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

module.exports = SecurityEvent;
