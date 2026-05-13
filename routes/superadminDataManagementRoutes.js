const express = require('express');
const router = express.Router();
const {
  createBackup,
  getBackups,
  deleteBackup,
  exportData,
  importData,
  restoreBackup,
  getDataStats,
  cleanupOldBackups,
  getImportHistory,
  getExportOptions,
  getExportHistory,
  getBackupSchedule,
  updateBackupSchedule,
  downloadBackup,
  restoreBackupById,
} = require('../controllers/dataManagementController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * SuperAdmin Data Management Routes
 * All routes require SuperAdmin authentication
 * NOTE: More specific routes must come before general routes
 */

// Statistics route (must be before /:id routes)
router.get(
  '/stats',
  protect,
  authorize('superadmin'),
  getDataStats
);

// Import History route (must be before /import)
router.get(
  '/import-history',
  protect,
  authorize('superadmin'),
  getImportHistory
);

// Export Options route (must be before /export)
router.get(
  '/export-options',
  protect,
  authorize('superadmin'),
  getExportOptions
);

// Export History route (must be before /export)
router.get(
  '/export-history',
  protect,
  authorize('superadmin'),
  getExportHistory
);

// Backup Schedule routes (must be before /backups/:id routes)
router.get(
  '/backup-schedule',
  protect,
  authorize('superadmin'),
  getBackupSchedule
);

router.put(
  '/backup-schedule',
  protect,
  authorize('superadmin'),
  updateBackupSchedule
);

// Backup Download route (must be before /backups/:id routes)
router.get(
  '/backups/:id/download',
  protect,
  authorize('superadmin'),
  downloadBackup
);

// Backup Restore route (must be before /backups/:id routes)
router.post(
  '/backups/:id/restore',
  protect,
  authorize('superadmin'),
  restoreBackupById
);

// Main backup routes
router.post(
  '/backups',
  protect,
  authorize('superadmin'),
  createBackup
);

router.get(
  '/backups',
  protect,
  authorize('superadmin'),
  getBackups
);

router.delete(
  '/backups/:id',
  protect,
  authorize('superadmin'),
  deleteBackup
);

// Restore route
router.post(
  '/restore',
  protect,
  authorize('superadmin'),
  restoreBackup
);

// Export route
router.post(
  '/export',
  protect,
  authorize('superadmin'),
  exportData
);

// Import route
router.post(
  '/import',
  protect,
  authorize('superadmin'),
  importData
);

// Cleanup route
router.post(
  '/cleanup',
  protect,
  authorize('superadmin'),
  cleanupOldBackups
);

module.exports = router;
