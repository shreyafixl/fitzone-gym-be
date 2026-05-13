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
 */

// Statistics route
router.get(
  '/stats',
  protect,
  authorize('superadmin'),
  getDataStats
);

// Backup routes
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

// Import History route
router.get(
  '/import-history',
  protect,
  authorize('superadmin'),
  getImportHistory
);

// Export Options route
router.get(
  '/export-options',
  protect,
  authorize('superadmin'),
  getExportOptions
);

// Export History route
router.get(
  '/export-history',
  protect,
  authorize('superadmin'),
  getExportHistory
);

// Backup Schedule routes
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

// Backup Download route
router.get(
  '/backups/:id/download',
  protect,
  authorize('superadmin'),
  downloadBackup
);

// Backup Restore route
router.post(
  '/backups/:id/restore',
  protect,
  authorize('superadmin'),
  restoreBackupById
);

// Cleanup route
router.post(
  '/cleanup',
  protect,
  authorize('superadmin'),
  cleanupOldBackups
);

module.exports = router;
