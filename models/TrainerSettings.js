const mongoose = require('mongoose');

/**
 * Trainer Settings Schema
 * Manages trainer-specific settings including preferences, availability, notifications, and account settings
 */
const trainerSettingsSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: [true, 'Trainer ID is required'],
      unique: true,
      index: true,
    },
    // Profile Settings
    profileSettings: {
      bio: {
        type: String,
        trim: true,
        maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      },
      specializations: [
        {
          type: String,
          enum: [
            'strength-training',
            'cardio',
            'yoga',
            'pilates',
            'crossfit',
            'bodybuilding',
            'weight-loss',
            'nutrition',
            'sports-training',
            'rehabilitation',
            'functional-training',
            'hiit',
            'zumba',
            'martial-arts',
            'personal-training',
            'group-fitness',
          ],
        },
      ],
      certifications: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          issuingOrganization: {
            type: String,
            trim: true,
          },
          issueDate: Date,
          expiryDate: Date,
          certificateNumber: String,
          isVerified: {
            type: Boolean,
            default: false,
          },
        },
      ],
      experience: {
        type: Number,
        default: 0,
        min: 0,
        max: 50,
      },
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'members-only'],
        default: 'members-only',
      },
      showRatings: {
        type: Boolean,
        default: true,
      },
      showAvailability: {
        type: Boolean,
        default: true,
      },
    },

    // Trainer Preferences
    trainerPreferences: {
      sessionDuration: {
        type: Number,
        default: 60,
        min: 15,
        max: 180,
      },
      defaultSessionType: {
        type: String,
        enum: ['personal-training', 'group-class', 'consultation', 'assessment'],
        default: 'personal-training',
      },
      maxClientsPerDay: {
        type: Number,
        default: 10,
        min: 1,
        max: 50,
      },
      breakBetweenSessions: {
        type: Number,
        default: 15,
        min: 0,
        max: 120,
      },
      preferredLanguages: [
        {
          type: String,
          default: ['English'],
        },
      ],
      specialClientRequirements: {
        type: String,
        trim: true,
        maxlength: [500, 'Special requirements cannot exceed 500 characters'],
      },
      acceptGroupClasses: {
        type: Boolean,
        default: true,
      },
      acceptOnlineClasses: {
        type: Boolean,
        default: true,
      },
      minimumSessionPrice: {
        type: Number,
        default: 500,
        min: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },

    // Availability Settings
    availabilitySettings: {
      workingDays: {
        monday: {
          isAvailable: { type: Boolean, default: true },
          slots: [
            {
              startTime: String, // Format: "HH:MM"
              endTime: String,
            },
          ],
        },
        tuesday: {
          isAvailable: { type: Boolean, default: true },
          slots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
        wednesday: {
          isAvailable: { type: Boolean, default: true },
          slots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
        thursday: {
          isAvailable: { type: Boolean, default: true },
          slots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
        friday: {
          isAvailable: { type: Boolean, default: true },
          slots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
        saturday: {
          isAvailable: { type: Boolean, default: true },
          slots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
        sunday: {
          isAvailable: { type: Boolean, default: false },
          slots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
      },
      holidays: [
        {
          date: Date,
          reason: String,
        },
      ],
      vacationMode: {
        isEnabled: { type: Boolean, default: false },
        startDate: Date,
        endDate: Date,
        message: String,
      },
      autoAcceptBookings: {
        type: Boolean,
        default: false,
      },
      bookingAdvanceNotice: {
        type: Number,
        default: 24,
        min: 0,
        max: 720,
      }, // in hours
      cancellationPolicy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict'],
        default: 'moderate',
      },
      cancellationNotice: {
        type: Number,
        default: 24,
        min: 0,
        max: 168,
      }, // in hours
    },

    // Notification Preferences
    notificationPreferences: {
      email: {
        newBooking: { type: Boolean, default: true },
        bookingCancellation: { type: Boolean, default: true },
        bookingRescheduled: { type: Boolean, default: true },
        clientMessage: { type: Boolean, default: true },
        clientReview: { type: Boolean, default: true },
        paymentReceived: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: false },
        weeklyReport: { type: Boolean, default: true },
        monthlyReport: { type: Boolean, default: true },
      },
      sms: {
        newBooking: { type: Boolean, default: true },
        bookingCancellation: { type: Boolean, default: true },
        bookingRescheduled: { type: Boolean, default: false },
        clientMessage: { type: Boolean, default: true },
        paymentReceived: { type: Boolean, default: true },
      },
      inApp: {
        newBooking: { type: Boolean, default: true },
        bookingCancellation: { type: Boolean, default: true },
        bookingRescheduled: { type: Boolean, default: true },
        clientMessage: { type: Boolean, default: true },
        clientReview: { type: Boolean, default: true },
        paymentReceived: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: true },
      },
      push: {
        newBooking: { type: Boolean, default: true },
        bookingCancellation: { type: Boolean, default: true },
        clientMessage: { type: Boolean, default: true },
        paymentReceived: { type: Boolean, default: true },
      },
      quietHours: {
        isEnabled: { type: Boolean, default: false },
        startTime: String, // Format: "HH:MM"
        endTime: String,
      },
      notificationFrequency: {
        type: String,
        enum: ['instant', 'hourly', 'daily', 'weekly'],
        default: 'instant',
      },
    },

    // Account Settings
    accountSettings: {
      twoFactorAuth: {
        isEnabled: { type: Boolean, default: false },
        method: {
          type: String,
          enum: ['sms', 'email', 'authenticator'],
          default: 'email',
        },
      },
      loginSecurity: {
        allowRememberMe: { type: Boolean, default: true },
        sessionTimeout: { type: Number, default: 30 }, // in minutes
        requirePasswordChange: { type: Boolean, default: false },
        lastPasswordChange: Date,
      },
      dataPrivacy: {
        shareAnalytics: { type: Boolean, default: true },
        shareUsageData: { type: Boolean, default: false },
        allowThirdPartyIntegration: { type: Boolean, default: false },
      },
      accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'deactivated'],
        default: 'active',
      },
      deactivationReason: String,
      deactivationDate: Date,
    },

    // Payment Settings
    paymentSettings: {
      bankAccount: {
        accountHolderName: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        accountType: {
          type: String,
          enum: ['savings', 'current'],
        },
        isVerified: { type: Boolean, default: false },
      },
      upiId: String,
      paymentMethod: {
        type: String,
        enum: ['bank-transfer', 'upi', 'wallet'],
        default: 'bank-transfer',
      },
      payoutFrequency: {
        type: String,
        enum: ['weekly', 'bi-weekly', 'monthly'],
        default: 'monthly',
      },
      taxInformation: {
        panNumber: String,
        gstNumber: String,
      },
    },

    // Privacy Settings
    privacySettings: {
      showPhoneNumber: { type: Boolean, default: false },
      showEmail: { type: Boolean, default: false },
      allowDirectMessages: { type: Boolean, default: true },
      blockList: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // Integration Settings
    integrationSettings: {
      googleCalendarSync: {
        isEnabled: { type: Boolean, default: false },
        accessToken: String,
        refreshToken: String,
        calendarId: String,
      },
      stripeIntegration: {
        isEnabled: { type: Boolean, default: false },
        stripeAccountId: String,
      },
      zoomIntegration: {
        isEnabled: { type: Boolean, default: false },
        zoomAccountId: String,
      },
    },

    // Metadata
    settingsVersion: {
      type: Number,
      default: 1,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
trainerSettingsSchema.index({ trainerId: 1 });
trainerSettingsSchema.index({ 'accountSettings.accountStatus': 1 });

/**
 * Method to get all settings
 */
trainerSettingsSchema.methods.getAllSettings = function () {
  return {
    profileSettings: this.profileSettings,
    trainerPreferences: this.trainerPreferences,
    availabilitySettings: this.availabilitySettings,
    notificationPreferences: this.notificationPreferences,
    accountSettings: this.accountSettings,
    paymentSettings: this.paymentSettings,
    privacySettings: this.privacySettings,
    integrationSettings: this.integrationSettings,
  };
};

/**
 * Method to update specific setting category
 */
trainerSettingsSchema.methods.updateSettingCategory = function (category, data) {
  if (this[category]) {
    Object.assign(this[category], data);
  }
  return this.save();
};

/**
 * Static method to get or create settings for a trainer
 */
trainerSettingsSchema.statics.getOrCreate = async function (trainerId) {
  let settings = await this.findOne({ trainerId });
  if (!settings) {
    settings = await this.create({ trainerId });
  }
  return settings;
};

const TrainerSettings = mongoose.model('TrainerSettings', trainerSettingsSchema);

module.exports = TrainerSettings;
