const TrainerSettings = require('../models/TrainerSettings');
const Trainer = require('../models/Trainer');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all trainer settings
 * @route   GET /api/trainer/settings
 * @access  Private (Trainer)
 */
const getAllSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(res, settings.getAllSettings(), 'Settings retrieved successfully');
});

/**
 * @desc    Get profile settings
 * @route   GET /api/trainer/settings/profile
 * @access  Private (Trainer)
 */
const getProfileSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(
    res,
    settings.profileSettings,
    'Profile settings retrieved successfully'
  );
});

/**
 * @desc    Update profile settings
 * @route   PUT /api/trainer/settings/profile
 * @access  Private (Trainer)
 */
const updateProfileSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { bio, specializations, certifications, experience, profileVisibility, showRatings, showAvailability } = req.body;

  // Validate input
  if (bio && bio.length > 1000) {
    throw ApiError.badRequest('Bio cannot exceed 1000 characters');
  }

  if (experience && (experience < 0 || experience > 50)) {
    throw ApiError.badRequest('Experience must be between 0 and 50 years');
  }

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update profile settings
  if (bio !== undefined) settings.profileSettings.bio = bio;
  if (specializations !== undefined) settings.profileSettings.specializations = specializations;
  if (certifications !== undefined) settings.profileSettings.certifications = certifications;
  if (experience !== undefined) settings.profileSettings.experience = experience;
  if (profileVisibility !== undefined) settings.profileSettings.profileVisibility = profileVisibility;
  if (showRatings !== undefined) settings.profileSettings.showRatings = showRatings;
  if (showAvailability !== undefined) settings.profileSettings.showAvailability = showAvailability;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  // Also update trainer model with bio and specialization
  await Trainer.findByIdAndUpdate(trainerId, {
    bio: bio || undefined,
    specialization: specializations || undefined,
    certifications: certifications || undefined,
    experience: experience || undefined,
  });

  ApiResponse.success(
    res,
    settings.profileSettings,
    'Profile settings updated successfully'
  );
});

/**
 * @desc    Get trainer preferences
 * @route   GET /api/trainer/settings/preferences
 * @access  Private (Trainer)
 */
const getTrainerPreferences = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(
    res,
    settings.trainerPreferences,
    'Trainer preferences retrieved successfully'
  );
});

/**
 * @desc    Update trainer preferences
 * @route   PUT /api/trainer/settings/preferences
 * @access  Private (Trainer)
 */
const updateTrainerPreferences = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const {
    sessionDuration,
    defaultSessionType,
    maxClientsPerDay,
    breakBetweenSessions,
    preferredLanguages,
    specialClientRequirements,
    acceptGroupClasses,
    acceptOnlineClasses,
    minimumSessionPrice,
    currency,
  } = req.body;

  // Validate input
  if (sessionDuration && (sessionDuration < 15 || sessionDuration > 180)) {
    throw ApiError.badRequest('Session duration must be between 15 and 180 minutes');
  }

  if (maxClientsPerDay && (maxClientsPerDay < 1 || maxClientsPerDay > 50)) {
    throw ApiError.badRequest('Max clients per day must be between 1 and 50');
  }

  if (breakBetweenSessions && (breakBetweenSessions < 0 || breakBetweenSessions > 120)) {
    throw ApiError.badRequest('Break between sessions must be between 0 and 120 minutes');
  }

  if (minimumSessionPrice && minimumSessionPrice < 0) {
    throw ApiError.badRequest('Minimum session price cannot be negative');
  }

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update preferences
  if (sessionDuration !== undefined) settings.trainerPreferences.sessionDuration = sessionDuration;
  if (defaultSessionType !== undefined) settings.trainerPreferences.defaultSessionType = defaultSessionType;
  if (maxClientsPerDay !== undefined) settings.trainerPreferences.maxClientsPerDay = maxClientsPerDay;
  if (breakBetweenSessions !== undefined) settings.trainerPreferences.breakBetweenSessions = breakBetweenSessions;
  if (preferredLanguages !== undefined) settings.trainerPreferences.preferredLanguages = preferredLanguages;
  if (specialClientRequirements !== undefined) settings.trainerPreferences.specialClientRequirements = specialClientRequirements;
  if (acceptGroupClasses !== undefined) settings.trainerPreferences.acceptGroupClasses = acceptGroupClasses;
  if (acceptOnlineClasses !== undefined) settings.trainerPreferences.acceptOnlineClasses = acceptOnlineClasses;
  if (minimumSessionPrice !== undefined) settings.trainerPreferences.minimumSessionPrice = minimumSessionPrice;
  if (currency !== undefined) settings.trainerPreferences.currency = currency;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  ApiResponse.success(
    res,
    settings.trainerPreferences,
    'Trainer preferences updated successfully'
  );
});

/**
 * @desc    Get availability settings
 * @route   GET /api/trainer/settings/availability
 * @access  Private (Trainer)
 */
const getAvailabilitySettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(
    res,
    settings.availabilitySettings,
    'Availability settings retrieved successfully'
  );
});

/**
 * @desc    Update availability settings
 * @route   PUT /api/trainer/settings/availability
 * @access  Private (Trainer)
 */
const updateAvailabilitySettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const {
    workingDays,
    holidays,
    vacationMode,
    autoAcceptBookings,
    bookingAdvanceNotice,
    cancellationPolicy,
    cancellationNotice,
  } = req.body;

  // Validate input
  if (bookingAdvanceNotice && (bookingAdvanceNotice < 0 || bookingAdvanceNotice > 720)) {
    throw ApiError.badRequest('Booking advance notice must be between 0 and 720 hours');
  }

  if (cancellationNotice && (cancellationNotice < 0 || cancellationNotice > 168)) {
    throw ApiError.badRequest('Cancellation notice must be between 0 and 168 hours');
  }

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update availability settings
  if (workingDays !== undefined) settings.availabilitySettings.workingDays = workingDays;
  if (holidays !== undefined) settings.availabilitySettings.holidays = holidays;
  if (vacationMode !== undefined) settings.availabilitySettings.vacationMode = vacationMode;
  if (autoAcceptBookings !== undefined) settings.availabilitySettings.autoAcceptBookings = autoAcceptBookings;
  if (bookingAdvanceNotice !== undefined) settings.availabilitySettings.bookingAdvanceNotice = bookingAdvanceNotice;
  if (cancellationPolicy !== undefined) settings.availabilitySettings.cancellationPolicy = cancellationPolicy;
  if (cancellationNotice !== undefined) settings.availabilitySettings.cancellationNotice = cancellationNotice;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  // Also update trainer model availability
  if (workingDays !== undefined) {
    await Trainer.findByIdAndUpdate(trainerId, {
      availability: workingDays,
    });
  }

  ApiResponse.success(
    res,
    settings.availabilitySettings,
    'Availability settings updated successfully'
  );
});

/**
 * @desc    Get notification preferences
 * @route   GET /api/trainer/settings/notifications
 * @access  Private (Trainer)
 */
const getNotificationPreferences = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(
    res,
    settings.notificationPreferences,
    'Notification preferences retrieved successfully'
  );
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/trainer/settings/notifications
 * @access  Private (Trainer)
 */
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { email, sms, inApp, push, quietHours, notificationFrequency } = req.body;

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update notification preferences
  if (email !== undefined) settings.notificationPreferences.email = { ...settings.notificationPreferences.email, ...email };
  if (sms !== undefined) settings.notificationPreferences.sms = { ...settings.notificationPreferences.sms, ...sms };
  if (inApp !== undefined) settings.notificationPreferences.inApp = { ...settings.notificationPreferences.inApp, ...inApp };
  if (push !== undefined) settings.notificationPreferences.push = { ...settings.notificationPreferences.push, ...push };
  if (quietHours !== undefined) settings.notificationPreferences.quietHours = quietHours;
  if (notificationFrequency !== undefined) settings.notificationPreferences.notificationFrequency = notificationFrequency;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  ApiResponse.success(
    res,
    settings.notificationPreferences,
    'Notification preferences updated successfully'
  );
});

/**
 * @desc    Get account settings
 * @route   GET /api/trainer/settings/account
 * @access  Private (Trainer)
 */
const getAccountSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(
    res,
    settings.accountSettings,
    'Account settings retrieved successfully'
  );
});

/**
 * @desc    Update account settings
 * @route   PUT /api/trainer/settings/account
 * @access  Private (Trainer)
 */
const updateAccountSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { twoFactorAuth, loginSecurity, dataPrivacy, accountStatus } = req.body;

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update account settings
  if (twoFactorAuth !== undefined) settings.accountSettings.twoFactorAuth = twoFactorAuth;
  if (loginSecurity !== undefined) settings.accountSettings.loginSecurity = { ...settings.accountSettings.loginSecurity, ...loginSecurity };
  if (dataPrivacy !== undefined) settings.accountSettings.dataPrivacy = dataPrivacy;

  // Only allow deactivation, not reactivation through this endpoint
  if (accountStatus === 'deactivated') {
    settings.accountSettings.accountStatus = 'deactivated';
    settings.accountSettings.deactivationDate = new Date();
  }

  settings.lastModifiedBy = trainerId;
  await settings.save();

  ApiResponse.success(
    res,
    settings.accountSettings,
    'Account settings updated successfully'
  );
});

/**
 * @desc    Get payment settings
 * @route   GET /api/trainer/settings/payment
 * @access  Private (Trainer)
 */
const getPaymentSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  // Don't expose sensitive payment info
  const safePaymentSettings = {
    ...settings.paymentSettings.toObject(),
    bankAccount: {
      ...settings.paymentSettings.bankAccount,
      accountNumber: settings.paymentSettings.bankAccount?.accountNumber
        ? `****${settings.paymentSettings.bankAccount.accountNumber.slice(-4)}`
        : null,
    },
  };

  ApiResponse.success(
    res,
    safePaymentSettings,
    'Payment settings retrieved successfully'
  );
});

/**
 * @desc    Update payment settings
 * @route   PUT /api/trainer/settings/payment
 * @access  Private (Trainer)
 */
const updatePaymentSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { bankAccount, upiId, paymentMethod, payoutFrequency, taxInformation } = req.body;

  // Validate payment method
  if (paymentMethod && !['bank-transfer', 'upi', 'wallet'].includes(paymentMethod)) {
    throw ApiError.badRequest('Invalid payment method');
  }

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update payment settings
  if (bankAccount !== undefined) settings.paymentSettings.bankAccount = bankAccount;
  if (upiId !== undefined) settings.paymentSettings.upiId = upiId;
  if (paymentMethod !== undefined) settings.paymentSettings.paymentMethod = paymentMethod;
  if (payoutFrequency !== undefined) settings.paymentSettings.payoutFrequency = payoutFrequency;
  if (taxInformation !== undefined) settings.paymentSettings.taxInformation = taxInformation;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  // Return safe version without sensitive data
  const safePaymentSettings = {
    ...settings.paymentSettings.toObject(),
    bankAccount: {
      ...settings.paymentSettings.bankAccount,
      accountNumber: settings.paymentSettings.bankAccount?.accountNumber
        ? `****${settings.paymentSettings.bankAccount.accountNumber.slice(-4)}`
        : null,
    },
  };

  ApiResponse.success(
    res,
    safePaymentSettings,
    'Payment settings updated successfully'
  );
});

/**
 * @desc    Get privacy settings
 * @route   GET /api/trainer/settings/privacy
 * @access  Private (Trainer)
 */
const getPrivacySettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  ApiResponse.success(
    res,
    settings.privacySettings,
    'Privacy settings retrieved successfully'
  );
});

/**
 * @desc    Update privacy settings
 * @route   PUT /api/trainer/settings/privacy
 * @access  Private (Trainer)
 */
const updatePrivacySettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { showPhoneNumber, showEmail, allowDirectMessages, blockList } = req.body;

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update privacy settings
  if (showPhoneNumber !== undefined) settings.privacySettings.showPhoneNumber = showPhoneNumber;
  if (showEmail !== undefined) settings.privacySettings.showEmail = showEmail;
  if (allowDirectMessages !== undefined) settings.privacySettings.allowDirectMessages = allowDirectMessages;
  if (blockList !== undefined) settings.privacySettings.blockList = blockList;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  ApiResponse.success(
    res,
    settings.privacySettings,
    'Privacy settings updated successfully'
  );
});

/**
 * @desc    Get integration settings
 * @route   GET /api/trainer/settings/integrations
 * @access  Private (Trainer)
 */
const getIntegrationSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    throw ApiError.notFound('Settings not found for this trainer');
  }

  // Don't expose sensitive tokens
  const safeIntegrationSettings = {
    googleCalendarSync: {
      isEnabled: settings.integrationSettings.googleCalendarSync.isEnabled,
      calendarId: settings.integrationSettings.googleCalendarSync.calendarId,
    },
    stripeIntegration: {
      isEnabled: settings.integrationSettings.stripeIntegration.isEnabled,
    },
    zoomIntegration: {
      isEnabled: settings.integrationSettings.zoomIntegration.isEnabled,
    },
  };

  ApiResponse.success(
    res,
    safeIntegrationSettings,
    'Integration settings retrieved successfully'
  );
});

/**
 * @desc    Update integration settings
 * @route   PUT /api/trainer/settings/integrations
 * @access  Private (Trainer)
 */
const updateIntegrationSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { googleCalendarSync, stripeIntegration, zoomIntegration } = req.body;

  let settings = await TrainerSettings.findOne({ trainerId });

  if (!settings) {
    settings = await TrainerSettings.create({ trainerId });
  }

  // Update integration settings
  if (googleCalendarSync !== undefined) settings.integrationSettings.googleCalendarSync = googleCalendarSync;
  if (stripeIntegration !== undefined) settings.integrationSettings.stripeIntegration = stripeIntegration;
  if (zoomIntegration !== undefined) settings.integrationSettings.zoomIntegration = zoomIntegration;

  settings.lastModifiedBy = trainerId;
  await settings.save();

  // Return safe version without tokens
  const safeIntegrationSettings = {
    googleCalendarSync: {
      isEnabled: settings.integrationSettings.googleCalendarSync.isEnabled,
      calendarId: settings.integrationSettings.googleCalendarSync.calendarId,
    },
    stripeIntegration: {
      isEnabled: settings.integrationSettings.stripeIntegration.isEnabled,
    },
    zoomIntegration: {
      isEnabled: settings.integrationSettings.zoomIntegration.isEnabled,
    },
  };

  ApiResponse.success(
    res,
    safeIntegrationSettings,
    'Integration settings updated successfully'
  );
});

/**
 * @desc    Reset settings to defaults
 * @route   POST /api/trainer/settings/reset
 * @access  Private (Trainer)
 */
const resetSettings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  await TrainerSettings.deleteOne({ trainerId });

  const newSettings = await TrainerSettings.create({ trainerId });

  ApiResponse.success(
    res,
    newSettings.getAllSettings(),
    'Settings reset to defaults successfully'
  );
});

module.exports = {
  getAllSettings,
  getProfileSettings,
  updateProfileSettings,
  getTrainerPreferences,
  updateTrainerPreferences,
  getAvailabilitySettings,
  updateAvailabilitySettings,
  getNotificationPreferences,
  updateNotificationPreferences,
  getAccountSettings,
  updateAccountSettings,
  getPaymentSettings,
  updatePaymentSettings,
  getPrivacySettings,
  updatePrivacySettings,
  getIntegrationSettings,
  updateIntegrationSettings,
  resetSettings,
};
