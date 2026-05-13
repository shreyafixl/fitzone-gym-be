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
const {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByIP,
  getAuditLogStats,
  getLoginActivities,
} = require('../controllers/securityController');
const {
  getSystemLogs,
  getSystemLogById,
  getSystemLogsByLevel,
  getSystemLogsByService,
  getSystemLogStats,
  searchSystemLogs,
  exportSystemLogs,
  clearOldSystemLogs,
} = require('../controllers/systemLogsController');
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

// ============================================================================
// AUDIT & SECURITY LOGS ROUTES
// ============================================================================

// Audit logs statistics
router.get(
  '/audit-logs/stats',
  protect,
  authorize('superadmin'),
  getAuditLogStats
);

// Audit logs by user
router.get(
  '/audit-logs/user/:userId',
  protect,
  authorize('superadmin'),
  getAuditLogsByUser
);

// Audit logs by IP
router.get(
  '/audit-logs/ip/:ipAddress',
  protect,
  authorize('superadmin'),
  getAuditLogsByIP
);

// Audit log by ID
router.get(
  '/audit-logs/:id',
  protect,
  authorize('superadmin'),
  getAuditLogById
);

// All audit logs
router.get(
  '/audit-logs',
  protect,
  authorize('superadmin'),
  getAuditLogs
);

// Login history (using login activities endpoint)
router.get(
  '/login-history',
  protect,
  authorize('superadmin'),
  getLoginActivities
);

// ============================================================================
// SYSTEM LOGS ROUTES
// ============================================================================

// System logs export
router.get(
  '/system-logs/export',
  protect,
  authorize('superadmin'),
  exportSystemLogs
);

// System logs search
router.get(
  '/system-logs/search',
  protect,
  authorize('superadmin'),
  searchSystemLogs
);

// System logs statistics
router.get(
  '/system-logs/stats',
  protect,
  authorize('superadmin'),
  getSystemLogStats
);

// System logs by level
router.get(
  '/system-logs/level/:level',
  protect,
  authorize('superadmin'),
  getSystemLogsByLevel
);

// System logs by service
router.get(
  '/system-logs/service/:service',
  protect,
  authorize('superadmin'),
  getSystemLogsByService
);

// System log by ID
router.get(
  '/system-logs/:id',
  protect,
  authorize('superadmin'),
  getSystemLogById
);

// All system logs
router.get(
  '/system-logs',
  protect,
  authorize('superadmin'),
  getSystemLogs
);

// Clear old system logs
router.delete(
  '/system-logs/clear',
  protect,
  authorize('superadmin'),
  clearOldSystemLogs
);

// Main settings routes (must be last to avoid conflicts)
router
  .route('/')
  .get(protect, authorize('superadmin'), getSettings)
  .put(protect, authorize('superadmin'), updateSettings);

module.exports = router;
