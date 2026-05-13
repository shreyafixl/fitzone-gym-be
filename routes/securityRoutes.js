const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByIP,
  getFailedActions,
  getLoginActivities,
  getAuditLogStats,
  getSecurityEvents,
  getSecurityEventById,
  createSecurityEvent,
  updateSecurityEvent,
  resolveSecurityEvent,
  ignoreSecurityEvent,
  getActiveSecurityEvents,
  getCriticalSecurityEvents,
  getSecurityEventsByIP,
  getSecurityEventsByUser,
  getSecurityEventStats,
  getSecurityDashboard,
} = require('../controllers/securityController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Security & Audit Routes
 * All routes require SuperAdmin authentication
 */

// Dashboard route
router.get(
  '/dashboard',
  protect,
  authorize('superadmin'),
  getSecurityDashboard
);

// Audit Log Routes
router.get(
  '/audit-logs/stats',
  protect,
  authorize('superadmin'),
  getAuditLogStats
);

router.get(
  '/audit-logs/failed',
  protect,
  authorize('superadmin'),
  getFailedActions
);

router.get(
  '/audit-logs/login-activities',
  protect,
  authorize('superadmin'),
  getLoginActivities
);

router.get(
  '/audit-logs/user/:userId',
  protect,
  authorize('superadmin'),
  getAuditLogsByUser
);

router.get(
  '/audit-logs/ip/:ipAddress',
  protect,
  authorize('superadmin'),
  getAuditLogsByIP
);

router.get(
  '/audit-logs/:id',
  protect,
  authorize('superadmin'),
  getAuditLogById
);

router.get(
  '/audit-logs',
  protect,
  authorize('superadmin'),
  getAuditLogs
);

// Security Event Routes
router.get(
  '/security-events/stats',
  protect,
  authorize('superadmin'),
  getSecurityEventStats
);

router.get(
  '/security-events/active',
  protect,
  authorize('superadmin'),
  getActiveSecurityEvents
);

router.get(
  '/security-events/critical',
  protect,
  authorize('superadmin'),
  getCriticalSecurityEvents
);

router.get(
  '/security-events/ip/:ipAddress',
  protect,
  authorize('superadmin'),
  getSecurityEventsByIP
);

router.get(
  '/security-events/user/:userId',
  protect,
  authorize('superadmin'),
  getSecurityEventsByUser
);

router.post(
  '/security-events/:id/resolve',
  protect,
  authorize('superadmin'),
  resolveSecurityEvent
);

router.post(
  '/security-events/:id/ignore',
  protect,
  authorize('superadmin'),
  ignoreSecurityEvent
);

router
  .route('/security-events/:id')
  .get(protect, authorize('superadmin'), getSecurityEventById)
  .put(protect, authorize('superadmin'), updateSecurityEvent);

router
  .route('/security-events')
  .get(protect, authorize('superadmin'), getSecurityEvents)
  .post(protect, authorize('superadmin'), createSecurityEvent);

module.exports = router;
