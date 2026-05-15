const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/trainerSettingsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// All routes require authentication and trainer role
router.use(protect);
router.use(authorize('trainer'));

// Main settings routes
router.get('/', getAllSettings);
router.post('/reset', resetSettings);

// Profile settings routes
router.get('/profile', getProfileSettings);
router.put('/profile', updateProfileSettings);

// Trainer preferences routes
router.get('/preferences', getTrainerPreferences);
router.put('/preferences', updateTrainerPreferences);

// Availability settings routes
router.get('/availability', getAvailabilitySettings);
router.put('/availability', updateAvailabilitySettings);

// Notification preferences routes
router.get('/notifications', getNotificationPreferences);
router.put('/notifications', updateNotificationPreferences);

// Account settings routes
router.get('/account', getAccountSettings);
router.put('/account', updateAccountSettings);

// Payment settings routes
router.get('/payment', getPaymentSettings);
router.put('/payment', updatePaymentSettings);

// Privacy settings routes
router.get('/privacy', getPrivacySettings);
router.put('/privacy', updatePrivacySettings);

// Integration settings routes
router.get('/integrations', getIntegrationSettings);
router.put('/integrations', updateIntegrationSettings);

module.exports = router;
