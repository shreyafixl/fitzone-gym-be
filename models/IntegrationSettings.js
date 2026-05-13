const mongoose = require('mongoose');

/**
 * IntegrationSettings Schema
 * Manages third-party integrations and API configurations
 * Only one document should exist in this collection (singleton)
 */
const integrationSettingsSchema = new mongoose.Schema(
  {
    paymentGateway: {
      provider: {
        type: String,
        enum: ['stripe', 'razorpay', 'paypal', 'none'],
        default: 'none',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'testing'],
        default: 'inactive',
      },
      config: {
        apiKey: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        apiSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        webhookSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        publicKey: {
          type: String,
          default: null,
        },
        mode: {
          type: String,
          enum: ['test', 'live'],
          default: 'test',
        },
        currency: {
          type: String,
          default: 'INR',
          uppercase: true,
        },
      },
      features: {
        subscriptions: {
          type: Boolean,
          default: false,
        },
        refunds: {
          type: Boolean,
          default: false,
        },
        webhooks: {
          type: Boolean,
          default: false,
        },
      },
      lastTested: {
        type: Date,
        default: null,
      },
      testResult: {
        success: {
          type: Boolean,
          default: null,
        },
        message: {
          type: String,
          default: null,
        },
      },
    },
    emailProvider: {
      provider: {
        type: String,
        enum: ['smtp', 'sendgrid', 'mailgun', 'ses', 'none'],
        default: 'smtp',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'testing'],
        default: 'inactive',
      },
      config: {
        apiKey: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        apiSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        domain: {
          type: String,
          default: null,
        },
        fromEmail: {
          type: String,
          default: 'noreply@fitzone.com',
          lowercase: true,
        },
        fromName: {
          type: String,
          default: 'FitZone',
        },
        replyTo: {
          type: String,
          default: null,
          lowercase: true,
        },
        // SMTP specific
        smtpHost: {
          type: String,
          default: null,
        },
        smtpPort: {
          type: Number,
          default: 587,
        },
        smtpSecure: {
          type: Boolean,
          default: false,
        },
        smtpUser: {
          type: String,
          default: null,
        },
        smtpPassword: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
      },
      features: {
        templates: {
          type: Boolean,
          default: false,
        },
        tracking: {
          type: Boolean,
          default: false,
        },
        analytics: {
          type: Boolean,
          default: false,
        },
      },
      lastTested: {
        type: Date,
        default: null,
      },
      testResult: {
        success: {
          type: Boolean,
          default: null,
        },
        message: {
          type: String,
          default: null,
        },
      },
    },
    smsProvider: {
      provider: {
        type: String,
        enum: ['twilio', 'msg91', 'nexmo', 'aws-sns', 'none'],
        default: 'none',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'testing'],
        default: 'inactive',
      },
      config: {
        apiKey: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        apiSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        accountSid: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        authToken: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        senderId: {
          type: String,
          default: null,
        },
        phoneNumber: {
          type: String,
          default: null,
        },
      },
      features: {
        transactional: {
          type: Boolean,
          default: true,
        },
        promotional: {
          type: Boolean,
          default: false,
        },
        otp: {
          type: Boolean,
          default: true,
        },
      },
      lastTested: {
        type: Date,
        default: null,
      },
      testResult: {
        success: {
          type: Boolean,
          default: null,
        },
        message: {
          type: String,
          default: null,
        },
      },
    },
    cloudStorageProvider: {
      provider: {
        type: String,
        enum: ['aws-s3', 'google-cloud', 'azure-blob', 'cloudinary', 'local', 'none'],
        default: 'local',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'testing'],
        default: 'active',
      },
      config: {
        apiKey: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        apiSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        bucketName: {
          type: String,
          default: null,
        },
        region: {
          type: String,
          default: null,
        },
        cloudName: {
          type: String,
          default: null,
        },
        endpoint: {
          type: String,
          default: null,
        },
        publicUrl: {
          type: String,
          default: null,
        },
      },
      features: {
        publicAccess: {
          type: Boolean,
          default: true,
        },
        cdn: {
          type: Boolean,
          default: false,
        },
        imageOptimization: {
          type: Boolean,
          default: false,
        },
      },
      lastTested: {
        type: Date,
        default: null,
      },
      testResult: {
        success: {
          type: Boolean,
          default: null,
        },
        message: {
          type: String,
          default: null,
        },
      },
    },
    apiKeys: {
      googleMaps: {
        apiKey: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        status: {
          type: String,
          enum: ['active', 'inactive'],
          default: 'inactive',
        },
      },
      analytics: {
        googleAnalyticsId: {
          type: String,
          default: null,
        },
        facebookPixelId: {
          type: String,
          default: null,
        },
        status: {
          type: String,
          enum: ['active', 'inactive'],
          default: 'inactive',
        },
      },
      socialAuth: {
        googleClientId: {
          type: String,
          default: null,
        },
        googleClientSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        facebookAppId: {
          type: String,
          default: null,
        },
        facebookAppSecret: {
          type: String,
          default: null,
          select: false, // Don't return by default
        },
        status: {
          type: String,
          enum: ['active', 'inactive'],
          default: 'inactive',
        },
      },
    },
    webhookUrls: {
      paymentSuccess: {
        type: String,
        default: null,
      },
      paymentFailure: {
        type: String,
        default: null,
      },
      membershipExpiry: {
        type: String,
        default: null,
      },
      newMemberRegistration: {
        type: String,
        default: null,
      },
      supportTicketCreated: {
        type: String,
        default: null,
      },
      customWebhooks: [
        {
          name: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          events: [
            {
              type: String,
            },
          ],
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],
    },
    integrationStatus: {
      type: String,
      enum: ['active', 'inactive', 'testing'],
      default: 'inactive',
    },
    lastModifiedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuperAdmin',
        default: null,
      },
      userName: {
        type: String,
        default: null,
      },
      modifiedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Ensure only one integration settings document exists
 */
integrationSettingsSchema.statics.getIntegrations = async function () {
  let integrations = await this.findOne();
  if (!integrations) {
    integrations = await this.create({});
  }
  return integrations;
};

/**
 * Method to update payment gateway settings
 */
integrationSettingsSchema.methods.updatePaymentGateway = function (paymentData, userId, userName) {
  this.paymentGateway = { ...this.paymentGateway, ...paymentData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update email provider settings
 */
integrationSettingsSchema.methods.updateEmailProvider = function (emailData, userId, userName) {
  this.emailProvider = { ...this.emailProvider, ...emailData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update SMS provider settings
 */
integrationSettingsSchema.methods.updateSmsProvider = function (smsData, userId, userName) {
  this.smsProvider = { ...this.smsProvider, ...smsData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update cloud storage provider settings
 */
integrationSettingsSchema.methods.updateStorageProvider = function (storageData, userId, userName) {
  this.cloudStorageProvider = { ...this.cloudStorageProvider, ...storageData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to get public integrations (without sensitive data)
 */
integrationSettingsSchema.methods.getPublicIntegrations = function () {
  return {
    paymentGateway: {
      provider: this.paymentGateway.provider,
      status: this.paymentGateway.status,
      publicKey: this.paymentGateway.config.publicKey,
      mode: this.paymentGateway.config.mode,
    },
    emailProvider: {
      provider: this.emailProvider.provider,
      status: this.emailProvider.status,
    },
    smsProvider: {
      provider: this.smsProvider.provider,
      status: this.smsProvider.status,
    },
    cloudStorageProvider: {
      provider: this.cloudStorageProvider.provider,
      status: this.cloudStorageProvider.status,
    },
    integrationStatus: this.integrationStatus,
  };
};

const IntegrationSettings = mongoose.model('IntegrationSettings', integrationSettingsSchema);

module.exports = IntegrationSettings;
