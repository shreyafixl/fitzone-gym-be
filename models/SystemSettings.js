const mongoose = require('mongoose');

/**
 * SystemSettings Schema
 * Manages global system settings, theme, and configuration
 * Only one document should exist in this collection
 */
const systemSettingsSchema = new mongoose.Schema(
  {
    applicationName: {
      type: String,
      default: 'FitZone Super Admin',
      trim: true,
      maxlength: [100, 'Application name cannot exceed 100 characters'],
    },
    logo: {
      type: String,
      default: null,
      trim: true,
    },
    favicon: {
      type: String,
      default: null,
      trim: true,
    },
    primaryTheme: {
      primaryColor: {
        type: String,
        default: '#e8622a',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      secondaryColor: {
        type: String,
        default: '#1a1a1a',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      accentColor: {
        type: String,
        default: '#ff6b35',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      backgroundColor: {
        type: String,
        default: '#ffffff',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      textColor: {
        type: String,
        default: '#333333',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      successColor: {
        type: String,
        default: '#22c55e',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      warningColor: {
        type: String,
        default: '#f59e0b',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      errorColor: {
        type: String,
        default: '#ef4444',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
    },
    secondaryTheme: {
      darkMode: {
        type: Boolean,
        default: false,
      },
      darkPrimaryColor: {
        type: String,
        default: '#e8622a',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      darkBackgroundColor: {
        type: String,
        default: '#1a1a1a',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
      darkTextColor: {
        type: String,
        default: '#e5e5e5',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'],
      },
    },
    sidebarStyle: {
      type: String,
      enum: {
        values: ['expanded', 'collapsed', 'compact'],
        message: 'Sidebar style must be expanded, collapsed, or compact',
      },
      default: 'expanded',
    },
    dashboardLayout: {
      type: String,
      enum: {
        values: ['default', 'modern', 'minimal'],
        message: 'Dashboard layout must be default, modern, or minimal',
      },
      default: 'default',
    },
    maintenanceMode: {
      enabled: {
        type: Boolean,
        default: false,
      },
      message: {
        type: String,
        default: 'System is under maintenance. Please check back later.',
        trim: true,
        maxlength: [500, 'Maintenance message cannot exceed 500 characters'],
      },
      allowedIPs: [
        {
          type: String,
          trim: true,
        },
      ],
      scheduledStart: {
        type: Date,
        default: null,
      },
      scheduledEnd: {
        type: Date,
        default: null,
      },
    },
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      notifyOnNewMember: {
        type: Boolean,
        default: true,
      },
      notifyOnPayment: {
        type: Boolean,
        default: true,
      },
      notifyOnMembershipExpiry: {
        type: Boolean,
        default: true,
      },
      notifyOnSupportTicket: {
        type: Boolean,
        default: true,
      },
      notifyOnLowAttendance: {
        type: Boolean,
        default: false,
      },
      expiryReminderDays: {
        type: Number,
        default: 7,
        min: [1, 'Expiry reminder days must be at least 1'],
        max: [30, 'Expiry reminder days cannot exceed 30'],
      },
    },
    emailSettings: {
      smtpHost: {
        type: String,
        default: null,
        trim: true,
      },
      smtpPort: {
        type: Number,
        default: 587,
        min: [1, 'SMTP port must be at least 1'],
        max: [65535, 'SMTP port cannot exceed 65535'],
      },
      smtpSecure: {
        type: Boolean,
        default: false,
      },
      smtpUser: {
        type: String,
        default: null,
        trim: true,
      },
      smtpPassword: {
        type: String,
        default: null,
        select: false, // Don't return password by default
      },
      fromEmail: {
        type: String,
        default: 'noreply@fitzone.com',
        trim: true,
        lowercase: true,
      },
      fromName: {
        type: String,
        default: 'FitZone Admin',
        trim: true,
      },
      replyToEmail: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
      },
    },
    securitySettings: {
      sessionTimeout: {
        type: Number,
        default: 30, // minutes
        min: [5, 'Session timeout must be at least 5 minutes'],
        max: [1440, 'Session timeout cannot exceed 1440 minutes (24 hours)'],
      },
      maxLoginAttempts: {
        type: Number,
        default: 5,
        min: [3, 'Max login attempts must be at least 3'],
        max: [10, 'Max login attempts cannot exceed 10'],
      },
      lockoutDuration: {
        type: Number,
        default: 15, // minutes
        min: [5, 'Lockout duration must be at least 5 minutes'],
        max: [60, 'Lockout duration cannot exceed 60 minutes'],
      },
      passwordMinLength: {
        type: Number,
        default: 8,
        min: [6, 'Password minimum length must be at least 6'],
        max: [20, 'Password minimum length cannot exceed 20'],
      },
      requireSpecialChar: {
        type: Boolean,
        default: true,
      },
      requireNumber: {
        type: Boolean,
        default: true,
      },
      requireUppercase: {
        type: Boolean,
        default: true,
      },
      twoFactorAuth: {
        type: Boolean,
        default: false,
      },
      ipWhitelist: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    rolePermissions: {
      superadmin: {
        canManageUsers: { type: Boolean, default: true },
        canManageBranches: { type: Boolean, default: true },
        canManageFinancial: { type: Boolean, default: true },
        canManageSettings: { type: Boolean, default: true },
        canViewAnalytics: { type: Boolean, default: true },
        canManageSupport: { type: Boolean, default: true },
        canManageTrainers: { type: Boolean, default: true },
        canManageSchedules: { type: Boolean, default: true },
        canDeleteRecords: { type: Boolean, default: true },
      },
      admin: {
        canManageUsers: { type: Boolean, default: true },
        canManageBranches: { type: Boolean, default: true },
        canManageFinancial: { type: Boolean, default: true },
        canManageSettings: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: true },
        canManageSupport: { type: Boolean, default: true },
        canManageTrainers: { type: Boolean, default: true },
        canManageSchedules: { type: Boolean, default: true },
        canDeleteRecords: { type: Boolean, default: false },
      },
      trainer: {
        canManageUsers: { type: Boolean, default: false },
        canManageBranches: { type: Boolean, default: false },
        canManageFinancial: { type: Boolean, default: false },
        canManageSettings: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: false },
        canManageSupport: { type: Boolean, default: false },
        canManageTrainers: { type: Boolean, default: false },
        canManageSchedules: { type: Boolean, default: true },
        canDeleteRecords: { type: Boolean, default: false },
      },
      member: {
        canManageUsers: { type: Boolean, default: false },
        canManageBranches: { type: Boolean, default: false },
        canManageFinancial: { type: Boolean, default: false },
        canManageSettings: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: false },
        canManageSupport: { type: Boolean, default: false },
        canManageTrainers: { type: Boolean, default: false },
        canManageSchedules: { type: Boolean, default: false },
        canDeleteRecords: { type: Boolean, default: false },
      },
    },
    generalSettings: {
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
        trim: true,
      },
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      },
      timeFormat: {
        type: String,
        default: '24h',
        enum: ['12h', '24h'],
      },
      currency: {
        type: String,
        default: 'INR',
        trim: true,
        uppercase: true,
      },
      currencySymbol: {
        type: String,
        default: '₹',
        trim: true,
      },
      language: {
        type: String,
        default: 'en',
        trim: true,
        lowercase: true,
      },
    },
    backupSettings: {
      autoBackup: {
        type: Boolean,
        default: true,
      },
      backupFrequency: {
        type: String,
        default: 'daily',
        enum: ['daily', 'weekly', 'monthly'],
      },
      backupTime: {
        type: String,
        default: '02:00',
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'],
      },
      retentionDays: {
        type: Number,
        default: 30,
        min: [7, 'Retention days must be at least 7'],
        max: [365, 'Retention days cannot exceed 365'],
      },
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
 * Ensure only one settings document exists
 */
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

/**
 * Method to update theme settings
 */
systemSettingsSchema.methods.updateTheme = function (themeData, userId, userName) {
  if (themeData.primaryTheme) {
    this.primaryTheme = { ...this.primaryTheme, ...themeData.primaryTheme };
  }
  if (themeData.secondaryTheme) {
    this.secondaryTheme = { ...this.secondaryTheme, ...themeData.secondaryTheme };
  }
  if (themeData.sidebarStyle) {
    this.sidebarStyle = themeData.sidebarStyle;
  }
  if (themeData.dashboardLayout) {
    this.dashboardLayout = themeData.dashboardLayout;
  }

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update permissions
 */
systemSettingsSchema.methods.updatePermissions = function (permissionsData, userId, userName) {
  if (permissionsData.superadmin) {
    this.rolePermissions.superadmin = { ...this.rolePermissions.superadmin, ...permissionsData.superadmin };
  }
  if (permissionsData.admin) {
    this.rolePermissions.admin = { ...this.rolePermissions.admin, ...permissionsData.admin };
  }
  if (permissionsData.trainer) {
    this.rolePermissions.trainer = { ...this.rolePermissions.trainer, ...permissionsData.trainer };
  }
  if (permissionsData.member) {
    this.rolePermissions.member = { ...this.rolePermissions.member, ...permissionsData.member };
  }

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to toggle maintenance mode
 */
systemSettingsSchema.methods.toggleMaintenanceMode = function (enabled, message, userId, userName) {
  this.maintenanceMode.enabled = enabled;
  if (message) {
    this.maintenanceMode.message = message;
  }

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update notification settings
 */
systemSettingsSchema.methods.updateNotificationSettings = function (notificationData, userId, userName) {
  this.notificationSettings = { ...this.notificationSettings, ...notificationData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update email settings
 */
systemSettingsSchema.methods.updateEmailSettings = function (emailData, userId, userName) {
  this.emailSettings = { ...this.emailSettings, ...emailData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to update security settings
 */
systemSettingsSchema.methods.updateSecuritySettings = function (securityData, userId, userName) {
  this.securitySettings = { ...this.securitySettings, ...securityData };

  this.lastModifiedBy = {
    userId,
    userName,
    modifiedAt: new Date(),
  };

  return this.save();
};

/**
 * Method to get public settings (without sensitive data)
 */
systemSettingsSchema.methods.getPublicSettings = function () {
  return {
    applicationName: this.applicationName,
    logo: this.logo,
    favicon: this.favicon,
    primaryTheme: this.primaryTheme,
    secondaryTheme: this.secondaryTheme,
    sidebarStyle: this.sidebarStyle,
    dashboardLayout: this.dashboardLayout,
    maintenanceMode: {
      enabled: this.maintenanceMode.enabled,
      message: this.maintenanceMode.message,
    },
    generalSettings: this.generalSettings,
  };
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = SystemSettings;
