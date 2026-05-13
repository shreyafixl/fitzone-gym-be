const mongoose = require('mongoose');

const liveMonitoringSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  activeUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  checkInsToday: {
    type: Number,
    default: 0,
    min: 0
  },
  peakHour: {
    type: String,
    default: "Not available"
  },
  currentLoad: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  branchLive: [{
    branch: {
      type: String,
      required: true
    },
    checkins: {
      type: Number,
      default: 0,
      min: 0
    },
    active: {
      type: Number,
      default: 0,
      min: 0
    },
    load: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  systemMetrics: {
    cpuUsage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    memoryUsage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    diskUsage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    networkLatency: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  alerts: [{
    type: {
      type: String,
      enum: ['high_load', 'low_activity', 'system_error', 'branch_offline', 'security_alert'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'warning'
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin'
    },
    acknowledgedAt: Date
  }]
}, {
  timestamps: true
});

// Index for faster queries and TTL
liveMonitoringSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // Keep data for 7 days
liveMonitoringSchema.index({ 'alerts.severity': 1 });
liveMonitoringSchema.index({ 'alerts.acknowledged': 1 });

// Static method to get latest monitoring data
liveMonitoringSchema.statics.getLatest = function() {
  return this.findOne().sort({ timestamp: -1 });
};

// Static method to get monitoring history
liveMonitoringSchema.statics.getHistory = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ timestamp: { $gte: since } }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('LiveMonitoring', liveMonitoringSchema);
