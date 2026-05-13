const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  environment: {
    type: String,
    enum: ['production', 'beta', 'alpha', 'development'],
    default: 'development'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['ai', 'streaming', 'security', 'ui', 'integration', 'membership', 'engagement', 'other'],
    default: 'other'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  }
}, {
  timestamps: true
});

// Index for faster queries
featureFlagSchema.index({ key: 1 });
featureFlagSchema.index({ enabled: 1 });
featureFlagSchema.index({ environment: 1 });

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
