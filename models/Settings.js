const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Gym Information
    gymName: {
      type: String,
      required: true,
      default: 'FitZone - Main Branch',
    },
    adminEmail: {
      type: String,
      required: true,
      match: /^\S+@\S+\.\S+$/,
      default: 'admin@fitzone.com',
    },
    phone: {
      type: String,
      required: true,
      default: '+91 98765 43210',
    },
    address: {
      type: String,
      required: true,
      default: '123 Fitness Street, Mumbai',
    },
    city: {
      type: String,
      default: 'Mumbai',
    },
    state: {
      type: String,
      default: 'Maharashtra',
    },
    pincode: {
      type: String,
      default: '400001',
    },
    website: {
      type: String,
      default: 'https://fitzone.com',
    },
    logo: {
      type: String,
      default: null,
    },

    // Notification Preferences
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsAlerts: {
      type: Boolean,
      default: false,
    },
    autoRenewalReminders: {
      type: Boolean,
      default: true,
    },
    reminderDaysBefore: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
    },

    // Theme & UI
    darkMode: {
      type: Boolean,
      default: false,
    },
    accentColor: {
      type: String,
      default: '#f97316',
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'es', 'fr'],
      default: 'en',
    },

    // Security
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 480,
    },
    passwordExpiryDays: {
      type: Number,
      default: 90,
      min: 0,
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },

    // Membership Plans
    membershipPlans: [
      {
        name: {
          type: String,
          enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'],
        },
        price: {
          type: Number,
          required: true,
        },
        _id: false,
      },
    ],

    // Business Settings
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    businessHours: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '06:00', close: '22:00' },
      sunday: { open: '06:00', close: '22:00' },
    },

    // Email Configuration
    emailProvider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'mailgun'],
      default: 'smtp',
    },
    smtpHost: {
      type: String,
      default: 'smtp.gmail.com',
    },
    smtpPort: {
      type: Number,
      default: 587,
    },
    smtpUser: {
      type: String,
      default: null,
    },
    smtpPassword: {
      type: String,
      default: null,
    },

    // SMS Configuration
    smsProvider: {
      type: String,
      enum: ['twilio', 'aws-sns', 'custom'],
      default: 'twilio',
    },
    smsApiKey: {
      type: String,
      default: null,
    },

    // Backup & Maintenance
    autoBackupEnabled: {
      type: Boolean,
      default: true,
    },
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'System is under maintenance. Please try again later.',
    },

    // API Settings
    apiRateLimit: {
      type: Number,
      default: 1000,
      min: 100,
    },
    apiTimeout: {
      type: Number,
      default: 30,
      min: 5,
    },

    // Updated by
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function (updates, userId) {
  const settings = await this.findOneAndUpdate(
    {},
    { ...updates, updatedBy: userId },
    { new: true, upsert: true }
  );
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
