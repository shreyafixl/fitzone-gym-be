const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  bulkUpdateUsers,
  exportUsers,
} = require('../controllers/adminUserController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getUserStats);

/**
 * @route   GET /api/admin/users/export
 * @desc    Export users data
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/export', protectAdmin, checkPermission('canViewReports'), exportUsers);

/**
 * @route   PUT /api/admin/users/bulk-update
 * @desc    Bulk update users
 * @access  Private (Admin with canManageUsers permission)
 */
router.put('/bulk-update', protectAdmin, checkPermission('canManageUsers'), bulkUpdateUsers);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/', getAllUsers);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/', createUser);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageUsers'), getUserById);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin with canManageUsers permission)
 */
router.put('/:id', protectAdmin, checkPermission('canManageUsers'), updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin with canManageUsers and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageUsers'), checkPermission('canDeleteRecords'), deleteUser);

module.exports = router;
