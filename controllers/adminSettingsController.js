const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

let settingsData = {
  gymName: 'FitZone - Main Branch',
  adminEmail: 'admin@fitzone.com',
  phone: '+91 98765 43210',
  address: '123 Fitness Street, Mumbai',
  emailNotifications: true,
  smsAlerts: false,
  autoRenewalReminders: true,
  reminderDaysBefore: 7,
  darkMode: false,
  twoFactorAuth: false,
  sessionTimeout: 30,
  monthlyPlanPrice: 39,
  quarterlyPlanPrice: 99,
  halfYearlyPlanPrice: 179,
  annualPlanPrice: 299,
};

exports.getSettings = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, settingsData, 'Settings retrieved'));
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const updates = req.body;
  Object.keys(updates).forEach(key => {
    if (key in settingsData) {
      settingsData[key] = updates[key];
    }
  });
  res.status(200).json(new ApiResponse(200, settingsData, 'Settings updated'));
});
