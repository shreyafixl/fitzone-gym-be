const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * System Settings Routes
 * Most routes require SuperAdmin authentication
 * Public route available for frontend theme
 */

// Public settings route (no auth required)
router.get('/public', getPublicSettings);

// Theme settings routes
router
  .route('/theme')
  .get(protect, authorize('superadmin'), getThemeSettings)
  .put(protect, authorize('superadmin'), updateThemeSettings);

// Permission settings routes
router
  .route('/permissions')
  .get(protect, authorize('superadmin'), getPermissions)
  .put(protect, authorize('superadmin'), updatePermissions);

// Maintenance mode route
router.post(
  '/maintenance',
  protect,
  authorize('superadmin'),
  toggleMaintenanceMode
);

// Notification settings routes
router
  .route('/notifications')
  .get(protect, authorize('superadmin'), getNotificationSettings)
  .put(protect, authorize('superadmin'), updateNotificationSettings);

// Email settings routes
router
  .route('/email')
  .get(protect, authorize('superadmin'), getEmailSettings)
  .put(protect, authorize('superadmin'), updateEmailSettings);

// Security settings routes
router
  .route('/security')
  .get(protect, authorize('superadmin'), getSecuritySettings)
  .put(protect, authorize('superadmin'), updateSecuritySettings);

// General settings routes
router
  .route('/general')
  .get(protect, authorize('superadmin'), getGeneralSettings)
  .put(protect, authorize('superadmin'), updateGeneralSettings);

// Backup settings routes
router
  .route('/backup')
  .get(protect, authorize('superadmin'), getBackupSettings)
  .put(protect, authorize('superadmin'), updateBackupSettings);

// Reset settings route
router.post(
  '/reset',
  protect,
  authorize('superadmin'),
  resetSettings
);

// Main settings routes (must be last to avoid conflicts)
router
  .route('/')
  .get(protect, authorize('superadmin'), getSettings)
  .put(protect, authorize('superadmin'), updateSettings);

module.exports = router;
