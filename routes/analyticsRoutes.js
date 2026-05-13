const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUserGrowthAnalytics,
  getAttendanceStatistics,
  getBranchAnalytics,
  getTrainerPerformanceAnalytics,
  getFinancialReport,
  getAttendanceReport,
  getMembershipReport,
  getTrainerReport,
  getBranchPerformanceReport,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

/**
 * Analytics & Reporting Routes
 * Base path: /api/superadmin/analytics
 * All routes require authentication and super admin role
 */

// Apply authentication and authorization to all routes
router.use(protect);
router.use(superAdminOnly);

// ============================================================================
// DASHBOARD ANALYTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/superadmin/analytics/dashboard
 * @desc    Get dashboard overview statistics
 * @access  Private (Super Admin only)
 */
router.get('/dashboard', getDashboardStats);

/**
 * @route   GET /api/superadmin/analytics/user-growth
 * @desc    Get user growth analytics
 * @query   period (daily, weekly, monthly), year
 * @access  Private (Super Admin only)
 */
router.get('/user-growth', getUserGrowthAnalytics);

/**
 * @route   GET /api/superadmin/analytics/attendance
 * @desc    Get attendance statistics
 * @query   startDate, endDate, branchId
 * @access  Private (Super Admin only)
 */
router.get('/attendance', getAttendanceStatistics);

/**
 * @route   GET /api/superadmin/analytics/branches
 * @desc    Get branch-wise analytics
 * @access  Private (Super Admin only)
 */
router.get('/branches', getBranchAnalytics);

/**
 * @route   GET /api/superadmin/analytics/trainers
 * @desc    Get trainer performance analytics
 * @access  Private (Super Admin only)
 */
router.get('/trainers', getTrainerPerformanceAnalytics);

// ============================================================================
// REPORTS ROUTES
// ============================================================================

/**
 * @route   GET /api/superadmin/analytics/reports/financial
 * @desc    Get financial report
 * @query   startDate, endDate, branchId, type
 * @access  Private (Super Admin only)
 */
router.get('/reports/financial', getFinancialReport);

/**
 * @route   GET /api/superadmin/analytics/reports/attendance
 * @desc    Get attendance report
 * @query   startDate, endDate, branchId
 * @access  Private (Super Admin only)
 */
router.get('/reports/attendance', getAttendanceReport);

/**
 * @route   GET /api/superadmin/analytics/reports/membership
 * @desc    Get membership report
 * @query   status, planId, branchId
 * @access  Private (Super Admin only)
 */
router.get('/reports/membership', getMembershipReport);

/**
 * @route   GET /api/superadmin/analytics/reports/trainers
 * @desc    Get trainer report
 * @query   branchId
 * @access  Private (Super Admin only)
 */
router.get('/reports/trainers', getTrainerReport);

/**
 * @route   GET /api/superadmin/analytics/reports/branches
 * @desc    Get branch performance report
 * @query   status
 * @access  Private (Super Admin only)
 */
router.get('/reports/branches', getBranchPerformanceReport);

module.exports = router;
