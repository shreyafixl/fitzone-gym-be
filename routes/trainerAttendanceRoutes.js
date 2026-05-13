const express = require('express');
const router = express.Router();
const {
  markAttendance,
  checkOut,
  getAttendanceRecords,
  getAttendanceStats,
  getMonthlyAnalytics,
  getAttendanceReport,
  getMemberAttendanceHistory,
} = require('../controllers/trainerAttendanceController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   POST /api/trainer/attendance
 * @desc    Mark member attendance (check-in)
 * @access  Private (Trainer)
 */
router.post('/', protectTrainer, markAttendance);

/**
 * @route   GET /api/trainer/attendance
 * @desc    Get attendance records
 * @access  Private (Trainer)
 * @query   page, limit, memberId, branchId, status, date, startDate, endDate
 */
router.get('/', protectTrainer, getAttendanceRecords);

/**
 * @route   GET /api/trainer/attendance/stats
 * @desc    Get attendance statistics
 * @access  Private (Trainer)
 * @query   startDate, endDate
 */
router.get('/stats', protectTrainer, getAttendanceStats);

/**
 * @route   GET /api/trainer/attendance/analytics/monthly
 * @desc    Get monthly attendance analytics
 * @access  Private (Trainer)
 * @query   year, month
 */
router.get('/analytics/monthly', protectTrainer, getMonthlyAnalytics);

/**
 * @route   GET /api/trainer/attendance/report
 * @desc    Get attendance report
 * @access  Private (Trainer)
 * @query   startDate, endDate
 */
router.get('/report', protectTrainer, getAttendanceReport);

/**
 * @route   GET /api/trainer/attendance/member/:memberId
 * @desc    Get member attendance history
 * @access  Private (Trainer)
 * @query   page, limit, startDate, endDate
 */
router.get('/member/:memberId', protectTrainer, getMemberAttendanceHistory);

/**
 * @route   PUT /api/trainer/attendance/:id/checkout
 * @desc    Update attendance (check-out)
 * @access  Private (Trainer)
 */
router.put('/:id/checkout', protectTrainer, checkOut);

module.exports = router;
