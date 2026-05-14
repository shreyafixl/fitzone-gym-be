const express = require('express');
const router = express.Router();
const {
  getMembersAnalytics,
  getRevenueTrends,
  getPopularClasses,
  getAnalyticsDashboard,
} = require('../controllers/adminAnalyticsController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Get dashboard KPIs and overview analytics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/dashboard', protectAdmin, checkPermission('canViewReports'), getAnalyticsDashboard);

/**
 * @route   GET /api/admin/analytics/revenue
 * @desc    Get revenue analytics with chart data
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/revenue', protectAdmin, checkPermission('canViewReports'), getRevenueTrends);

/**
 * @route   GET /api/admin/analytics/members
 * @desc    Get member analytics with growth trends
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/members', protectAdmin, checkPermission('canViewReports'), getMembersAnalytics);

/**
 * @route   GET /api/admin/analytics/classes
 * @desc    Get class/session analytics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/classes', protectAdmin, checkPermission('canViewReports'), getPopularClasses);

module.exports = router;
