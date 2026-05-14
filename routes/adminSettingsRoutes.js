const express = require('express');
const { verifyJWT } = require('../middleware/authMiddleware');

const router = express.Router();

// GET SETTINGS
const getSettings = (req, res) => {
  const settingsData = {
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

  res.status(200).json({
    success: true,
    data: settingsData,
  });
};

// UPDATE SETTINGS
const updateSettings = (req, res) => {
  res.status(200).json({
    success: true,
    data: req.body,
    message: 'Settings updated',
  });
};

// ROUTES
router.get('/', verifyJWT, getSettings);
router.put('/', verifyJWT, updateSettings);

module.exports = router;