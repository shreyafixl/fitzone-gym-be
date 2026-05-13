const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getMemberAnalytics,
  getSessionAnalytics,
  getAttendanceAnalytics,
  getWorkoutAnalytics,
  getDietAnalytics,
  getProgressAnalytics,
  getPerformanceStats,
} = require('../controllers/trainerDashboardController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   GET /api/trainer/dashboard
 * @desc    Get trainer dashboard overview
 * @access  Private (Trainer)
 */
router.get('/', protectTrainer, getDashboardOverview);

/**
 * @route   GET /api/trainer/dashboard/members
 * @desc    Get member analytics
 * @access  Private (Trainer)
 */
router.get('/members', protectTrainer, getMemberAnalytics);

/**
 * @route   GET /api/trainer/dashboard/sessions
 * @desc    Get session analytics
 * @access  Private (Trainer)
 */
router.get('/sessions', protectTrainer, getSessionAnalytics);

/**
 * @route   GET /api/trainer/dashboard/attendance
 * @desc    Get attendance analytics
 * @access  Private (Trainer)
 */
router.get('/attendance', protectTrainer, getAttendanceAnalytics);

/**
 * @route   GET /api/trainer/dashboard/workouts
 * @desc    Get workout analytics
 * @access  Private (Trainer)
 */
router.get('/workouts', protectTrainer, getWorkoutAnalytics);

/**
 * @route   GET /api/trainer/dashboard/diets
 * @desc    Get diet analytics
 * @access  Private (Trainer)
 */
router.get('/diets', protectTrainer, getDietAnalytics);

/**
 * @route   GET /api/trainer/dashboard/progress
 * @desc    Get progress analytics
 * @access  Private (Trainer)
 */
router.get('/progress', protectTrainer, getProgressAnalytics);

/**
 * @route   GET /api/trainer/dashboard/performance
 * @desc    Get trainer performance statistics
 * @access  Private (Trainer)
 */
router.get('/performance', protectTrainer, getPerformanceStats);

module.exports = router;
