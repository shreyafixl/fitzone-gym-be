const SystemSettings = require('../models/SystemSettings');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all system settings
 * @route   GET /api/settings
 * @access  Private (SuperAdmin)
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  ApiResponse.success(res, settings, 'System settings retrieved successfully');
});

/**
 * @desc    Update system settings
 * @route   PUT /api/settings
 * @access  Private (SuperAdmin)
 */
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  const {
    applicationName,
    logo,
    favicon,
    sidebarStyle,
    dashboardLayout,
    maintenanceMode,
    notificationSettings,
    emailSettings,
    securitySettings,
    generalSettings,
    backupSettings,
  } = req.body;

  // Update basic settings
  if (applicationName) settings.applicationName = applicationName;
  if (logo !== undefined) settings.logo = logo;
  if (favicon !== undefined) settings.favicon = favicon;
  if (sidebarStyle) settings.sidebarStyle = sidebarStyle;
  if (dashboardLayout) settings.dashboardLayout = dashboardLayout;

  // Update maintenance mode
  if (maintenanceMode) {
    settings.maintenanceMode = { ...settings.maintenanceMode, ...maintenanceMode };
  }

  // Update notification settings
  if (notificationSettings) {
    settings.notificationSettings = { ...settings.notificationSettings, ...notificationSettings };
  }

  // Update email settings
  if (emailSettings) {
    settings.emailSettings = { ...settings.emailSettings, ...emailSettings };
  }

  // Update security settings
  if (securitySettings) {
    settings.securitySettings = { ...settings.securitySettings, ...securitySettings };
  }

  // Update general settings
  if (generalSettings) {
    settings.generalSettings = { ...settings.generalSettings, ...generalSettings };
  }

  // Update backup settings
  if (backupSettings) {
    settings.backupSettings = { ...settings.backupSettings, ...backupSettings };
  }

  // Update last modified by
  settings.lastModifiedBy = {
    userId: req.user._id,
    userName: req.user.fullName,
    modifiedAt: new Date(),
  };

  await settings.save();

  ApiResponse.success(res, settings, 'System settings updated successfully');
});

/**
 * @desc    Get theme settings
 * @route   GET /api/settings/theme
 * @access  Private (SuperAdmin)
 */
const getThemeSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  const themeSettings = {
    primaryTheme: settings.primaryTheme,
    secondaryTheme: settings.secondaryTheme,
    sidebarStyle: settings.sidebarStyle,
    dashboardLayout: settings.dashboardLayout,
  };

  ApiResponse.success(res, themeSettings, 'Theme settings retrieved successfully');
});

/**
 * @desc    Update theme settings
 * @route   PUT /api/settings/theme
 * @access  Private (SuperAdmin)
 */
const updateThemeSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  const { primaryTheme, secondaryTheme, sidebarStyle, dashboardLayout } = req.body;

  await settings.updateTheme(
    {
      primaryTheme,
      secondaryTheme,
      sidebarStyle,
      dashboardLayout,
    },
    req.user._id,
    req.user.fullName
  );

  const themeSettings = {
    primaryTheme: settings.primaryTheme,
    secondaryTheme: settings.secondaryTheme,
    sidebarStyle: settings.sidebarStyle,
    dashboardLayout: settings.dashboardLayout,
  };

  ApiResponse.success(res, themeSettings, 'Theme settings updated successfully');
});

/**
 * @desc    Get role permissions
 * @route   GET /api/settings/permissions
 * @access  Private (SuperAdmin)
 */
const getPermissions = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  ApiResponse.success(res, settings.rolePermissions, 'Role permissions retrieved successfully');
});

/**
 * @desc    Update role permissions
 * @route   PUT /api/settings/permissions
 * @access  Private (SuperAdmin)
 */
const updatePermissions = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  const { superadmin, admin, trainer, member } = req.body;

  await settings.updatePermissions(
    {
      superadmin,
      admin,
      trainer,
      member,
    },
    req.user._id,
    req.user.fullName
  );

  ApiResponse.success(res, settings.rolePermissions, 'Role permissions updated successfully');
});

/**
 * @desc    Toggle maintenance mode
 * @route   POST /api/settings/maintenance
 * @access  Private (SuperAdmin)
 */
const toggleMaintenanceMode = asyncHandler(async (req, res) => {
  const { enabled, message, allowedIPs, scheduledStart, scheduledEnd } = req.body;

  if (enabled === undefined) {
    throw ApiError.badRequest('Please provide enabled status');
  }

  const settings = await SystemSettings.getSettings();

  await settings.toggleMaintenanceMode(enabled, message, req.user._id, req.user.fullName);

  // Update additional maintenance settings
  if (allowedIPs) settings.maintenanceMode.allowedIPs = allowedIPs;
  if (scheduledStart) settings.maintenanceMode.scheduledStart = new Date(scheduledStart);
  if (scheduledEnd) settings.maintenanceMode.scheduledEnd = new Date(scheduledEnd);

  await settings.save();

  ApiResponse.success(
    res,
    settings.maintenanceMode,
    `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`
  );
});

/**
 * @desc    Get notification settings
 * @route   GET /api/settings/notifications
 * @access  Private (SuperAdmin)
 */
const getNotificationSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  ApiResponse.success(res, settings.notificationSettings, 'Notification settings retrieved successfully');
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/settings/notifications
 * @access  Private (SuperAdmin)
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  await settings.updateNotificationSettings(req.body, req.user._id, req.user.fullName);

  ApiResponse.success(res, settings.notificationSettings, 'Notification settings updated successfully');
});

/**
 * @desc    Get email settings
 * @route   GET /api/settings/email
 * @access  Private (SuperAdmin)
 */
const getEmailSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  // Don't return SMTP password
  const emailSettings = { ...settings.emailSettings.toObject() };
  delete emailSettings.smtpPassword;

  ApiResponse.success(res, emailSettings, 'Email settings retrieved successfully');
});

/**
 * @desc    Update email settings
 * @route   PUT /api/settings/email
 * @access  Private (SuperAdmin)
 */
const updateEmailSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  await settings.updateEmailSettings(req.body, req.user._id, req.user.fullName);

  // Don't return SMTP password
  const emailSettings = { ...settings.emailSettings.toObject() };
  delete emailSettings.smtpPassword;

  ApiResponse.success(res, emailSettings, 'Email settings updated successfully');
});

/**
 * @desc    Get security settings
 * @route   GET /api/settings/security
 * @access  Private (SuperAdmin)
 */
const getSecuritySettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  ApiResponse.success(res, settings.securitySettings, 'Security settings retrieved successfully');
});

/**
 * @desc    Update security settings
 * @route   PUT /api/settings/security
 * @access  Private (SuperAdmin)
 */
const updateSecuritySettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  await settings.updateSecuritySettings(req.body, req.user._id, req.user.fullName);

  ApiResponse.success(res, settings.securitySettings, 'Security settings updated successfully');
});

/**
 * @desc    Get general settings
 * @route   GET /api/settings/general
 * @access  Private (SuperAdmin)
 */
const getGeneralSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  ApiResponse.success(res, settings.generalSettings, 'General settings retrieved successfully');
});

/**
 * @desc    Update general settings
 * @route   PUT /api/settings/general
 * @access  Private (SuperAdmin)
 */
const updateGeneralSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  settings.generalSettings = { ...settings.generalSettings, ...req.body };

  settings.lastModifiedBy = {
    userId: req.user._id,
    userName: req.user.fullName,
    modifiedAt: new Date(),
  };

  await settings.save();

  ApiResponse.success(res, settings.generalSettings, 'General settings updated successfully');
});

/**
 * @desc    Get backup settings
 * @route   GET /api/settings/backup
 * @access  Private (SuperAdmin)
 */
const getBackupSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  ApiResponse.success(res, settings.backupSettings, 'Backup settings retrieved successfully');
});

/**
 * @desc    Update backup settings
 * @route   PUT /api/settings/backup
 * @access  Private (SuperAdmin)
 */
const updateBackupSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  settings.backupSettings = { ...settings.backupSettings, ...req.body };

  settings.lastModifiedBy = {
    userId: req.user._id,
    userName: req.user.fullName,
    modifiedAt: new Date(),
  };

  await settings.save();

  ApiResponse.success(res, settings.backupSettings, 'Backup settings updated successfully');
});

/**
 * @desc    Get public settings (for frontend without auth)
 * @route   GET /api/settings/public
 * @access  Public
 */
const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();

  const publicSettings = settings.getPublicSettings();

  ApiResponse.success(res, publicSettings, 'Public settings retrieved successfully');
});

/**
 * @desc    Reset settings to default
 * @route   POST /api/settings/reset
 * @access  Private (SuperAdmin)
 */
const resetSettings = asyncHandler(async (req, res) => {
  const { section } = req.body;

  if (!section) {
    throw ApiError.badRequest('Please provide section to reset');
  }

  const settings = await SystemSettings.getSettings();

  // Reset specific section to defaults
  switch (section) {
    case 'theme':
      settings.primaryTheme = {
        primaryColor: '#e8622a',
        secondaryColor: '#1a1a1a',
        accentColor: '#ff6b35',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        successColor: '#22c55e',
        warningColor: '#f59e0b',
        errorColor: '#ef4444',
      };
      settings.secondaryTheme = {
        darkMode: false,
        darkPrimaryColor: '#e8622a',
        darkBackgroundColor: '#1a1a1a',
        darkTextColor: '#e5e5e5',
      };
      settings.sidebarStyle = 'expanded';
      settings.dashboardLayout = 'default';
      break;

    case 'notifications':
      settings.notificationSettings = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        notifyOnNewMember: true,
        notifyOnPayment: true,
        notifyOnMembershipExpiry: true,
        notifyOnSupportTicket: true,
        notifyOnLowAttendance: false,
        expiryReminderDays: 7,
      };
      break;

    case 'security':
      settings.securitySettings = {
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        passwordMinLength: 8,
        requireSpecialChar: true,
        requireNumber: true,
        requireUppercase: true,
        twoFactorAuth: false,
        ipWhitelist: [],
      };
      break;

    default:
      throw ApiError.badRequest('Invalid section specified');
  }

  settings.lastModifiedBy = {
    userId: req.user._id,
    userName: req.user.fullName,
    modifiedAt: new Date(),
  };

  await settings.save();

  ApiResponse.success(res, settings, `${section} settings reset to default successfully`);
});

module.exports = {
  getSettings,
  updateSettings,
  getThemeSettings,
  updateThemeSettings,
  getPermissions,
  updatePermissions,
  toggleMaintenanceMode,
  getNotificationSettings,
  updateNotificationSettings,
  getEmailSettings,
  updateEmailSettings,
  getSecuritySettings,
  updateSecuritySettings,
  getGeneralSettings,
  updateGeneralSettings,
  getBackupSettings,
  updateBackupSettings,
  getPublicSettings,
  resetSettings,
};
