const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Integration name is required'],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Payment', 'SMS', 'Email', 'Analytics', 'Video', 'Comms', 'Storage', 'Other'],
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '🔌',
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    apiKey: {
      type: String,
      default: '',
      select: false, // Don't return API key by default
    },
    apiSecret: {
      type: String,
      default: '',
      select: false, // Don't return API secret by default
    },
    webhookUrl: {
      type: String,
      default: '',
    },
    webhookSecret: {
      type: String,
      default: '',
      select: false,
    },
    settings: {
      type: Map,
      of: String,
      default: new Map(),
    },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'pending'],
      default: 'disconnected',
    },
    lastConnectionTest: {
      type: Date,
      default: null,
    },
    connectionError: {
      type: String,
      default: '',
    },
    permissions: [
      {
        type: String,
        default: [],
      },
    ],
    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Integration', integrationSchema);
