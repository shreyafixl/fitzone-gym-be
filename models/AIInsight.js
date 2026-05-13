const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['revenue', 'churn', 'equipment', 'growth', 'finance', 'engagement', 'retention'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  insight: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: '💡'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'in_progress', 'resolved', 'dismissed'],
    default: 'active'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  potentialImpact: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'medium'
  },
  metadata: {
    sourceData: mongoose.Schema.Types.Mixed,
    relatedEntities: [{
      type: String,
      enum: ['user', 'branch', 'equipment', 'membership', 'transaction', 'trainer']
    }],
    entityIds: [mongoose.Schema.Types.ObjectId]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  acknowledgedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
aiInsightSchema.index({ type: 1 });
aiInsightSchema.index({ status: 1 });
aiInsightSchema.index({ priority: 1 });
aiInsightSchema.index({ createdAt: -1 });
aiInsightSchema.index({ expiresAt: 1 });

// TTL index to automatically remove expired insights
aiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AIInsight', aiInsightSchema);
