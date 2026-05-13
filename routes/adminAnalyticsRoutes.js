const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getMemberAnalytics,
  getAttendanceAnalytics,
  getClassAnalytics,
} = require('../controllers/adminAnalyticsController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Get dashboard KPIs and overview analytics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/dashboard', protectAdmin, checkPermission('canViewReports'), getDashboardAnalytics);

/**
 * @route   GET /api/admin/analytics/revenue
 * @desc    Get revenue analytics with chart data
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/revenue', protectAdmin, checkPermission('canViewReports'), getRevenueAnalytics);

/**
 * @route   GET /api/admin/analytics/members
 * @desc    Get member analytics with growth trends
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/members', protectAdmin, checkPermission('canViewReports'), getMemberAnalytics);

/**
 * @route   GET /api/admin/analytics/attendance
 * @desc    Get attendance analytics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/attendance', protectAdmin, checkPermission('canViewReports'), getAttendanceAnalytics);

/**
 * @route   GET /api/admin/analytics/classes
 * @desc    Get class/session analytics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/classes', protectAdmin, checkPermission('canViewReports'), getClassAnalytics);

module.exports = router;
