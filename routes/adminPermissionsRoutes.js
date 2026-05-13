const express = require('express');
const router = express.Router();
const {
  getAllPermissions,
  getStaffPermissions,
  updatePermissions,
  bulkUpdatePermissions,
} = require('../controllers/adminPermissionsController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/permissions
 * @desc    Get all staff permissions
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, getAllPermissions);

/**
 * @route   GET /api/admin/permissions/:staffId
 * @desc    Get staff member permissions
 * @access  Private (Admin)
 */
router.get('/:staffId', protectAdmin, getStaffPermissions);

/**
 * @route   PUT /api/admin/permissions/:staffId
 * @desc    Update staff permissions
 * @access  Private (Admin with canManageSettings permission)
 */
router.put('/:staffId', protectAdmin, checkPermission('canManageSettings'), updatePermissions);

/**
 * @route   PUT /api/admin/permissions/bulk
 * @desc    Bulk update permissions
 * @access  Private (Admin with canManageSettings permission)
 */
router.put('/bulk', protectAdmin, checkPermission('canManageSettings'), bulkUpdatePermissions);

module.exports = router;
