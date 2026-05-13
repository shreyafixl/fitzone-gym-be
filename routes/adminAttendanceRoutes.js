const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getAttendanceStats,
  getAttendanceByDateRange,
} = require('../controllers/adminAttendanceController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/attendance/stats
 * @desc    Get attendance statistics
 * @access  Private (Admin)
 */
router.get('/stats', protectAdmin, getAttendanceStats);

/**
 * @route   GET /api/admin/attendance/range
 * @desc    Get attendance by date range
 * @access  Private (Admin)
 */
router.get('/range', protectAdmin, getAttendanceByDateRange);

/**
 * @route   GET /api/admin/attendance
 * @desc    Get all attendance records with pagination and filtering
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, getAttendance);

module.exports = router;
