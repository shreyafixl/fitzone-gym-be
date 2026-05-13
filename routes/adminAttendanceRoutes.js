const express = require('express');
const router = express.Router();
const {
  createAttendance,
  getAllAttendance,
  updateAttendance,
  getAttendanceStats,
  bulkCreateAttendance,
  deleteAttendance,
  getAttendanceById,
} = require('../controllers/adminAttendanceController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/attendance/stats
 * @desc    Get attendance statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getAttendanceStats);

/**
 * @route   POST /api/admin/attendance/bulk
 * @desc    Bulk create attendance records
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/bulk', protectAdmin, checkPermission('canManageUsers'), bulkCreateAttendance);

/**
 * @route   GET /api/admin/attendance
 * @desc    Get all attendance records with filtering
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/', getAllAttendance);

/**
 * @route   POST /api/admin/attendance
 * @desc    Create attendance record (check-in)
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/', createAttendance);

/**
 * @route   GET /api/admin/attendance/:id
 * @desc    Get attendance by ID
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageUsers'), getAttendanceById);

/**
 * @route   PUT /api/admin/attendance/:id
 * @desc    Update attendance record (check-out or edit)
 * @access  Private (Admin with canManageUsers permission)
 */
router.put('/:id', protectAdmin, checkPermission('canManageUsers'), updateAttendance);

/**
 * @route   DELETE /api/admin/attendance/:id
 * @desc    Delete attendance record
 * @access  Private (Admin with canManageUsers and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageUsers'), checkPermission('canDeleteRecords'), deleteAttendance);

module.exports = router;
