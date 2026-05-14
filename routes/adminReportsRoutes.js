const express = require('express');
const router = express.Router();
const adminReportsController = require('../controllers/adminReportsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// ─── REVENUE REPORTS ─────────────────────────────────────────────────────────
router.get('/reports/revenue', adminReportsController.getRevenueReport);
router.get('/reports/revenue/:period', adminReportsController.getRevenueByPeriod);
router.get('/reports/revenue/by-plan', adminReportsController.getRevenueByPlan);
router.get('/reports/revenue/export/:format', adminReportsController.exportRevenue);

// ─── ATTENDANCE REPORTS ──────────────────────────────────────────────────────
router.get('/reports/attendance', adminReportsController.getAttendanceReport);
router.get('/reports/attendance/date-range', adminReportsController.getAttendanceByDateRange);
router.get('/reports/attendance/stats', adminReportsController.getAttendanceStats);
router.get('/reports/attendance/peak-hours', adminReportsController.getPeakHours);
router.get('/reports/attendance/export/:format', adminReportsController.exportAttendance);

// ─── PERFORMANCE REPORTS ─────────────────────────────────────────────────────
router.get('/reports/performance', adminReportsController.getPerformanceReport);
router.get('/reports/performance/trainers', adminReportsController.getTrainerPerformance);
router.get('/reports/performance/classes', adminReportsController.getClassPerformance);
router.get('/reports/performance/member-engagement', adminReportsController.getMemberEngagement);
router.get('/reports/performance/export/:format', adminReportsController.exportPerformance);

module.exports = router;
