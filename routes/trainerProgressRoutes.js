const express = require('express');
const router = express.Router();
const {
  recordProgress,
  getMemberProgress,
  getProgressById,
  updateProgress,
  deleteProgress,
  getMemberFitnessReport,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  uploadProgressPhoto,
} = require('../controllers/trainerProgressController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   POST /api/trainer/progress
 * @desc    Record body measurements and progress
 * @access  Private (Trainer)
 */
router.post('/', protectTrainer, recordProgress);

/**
 * @route   GET /api/trainer/progress/member/:memberId
 * @desc    Get member progress history
 * @access  Private (Trainer)
 * @query   page, limit, startDate, endDate
 */
router.get('/member/:memberId', protectTrainer, getMemberProgress);

/**
 * @route   GET /api/trainer/progress/report/:memberId
 * @desc    Get member fitness report
 * @access  Private (Trainer)
 */
router.get('/report/:memberId', protectTrainer, getMemberFitnessReport);

/**
 * @route   GET /api/trainer/progress/analytics/weekly/:memberId
 * @desc    Get weekly analytics
 * @access  Private (Trainer)
 */
router.get('/analytics/weekly/:memberId', protectTrainer, getWeeklyAnalytics);

/**
 * @route   GET /api/trainer/progress/analytics/monthly/:memberId
 * @desc    Get monthly analytics
 * @access  Private (Trainer)
 */
router.get('/analytics/monthly/:memberId', protectTrainer, getMonthlyAnalytics);

/**
 * @route   GET /api/trainer/progress/:id
 * @desc    Get progress by ID
 * @access  Private (Trainer)
 */
router.get('/:id', protectTrainer, getProgressById);

/**
 * @route   PUT /api/trainer/progress/:id
 * @desc    Update progress record
 * @access  Private (Trainer)
 */
router.put('/:id', protectTrainer, updateProgress);

/**
 * @route   DELETE /api/trainer/progress/:id
 * @desc    Delete progress record
 * @access  Private (Trainer)
 */
router.delete('/:id', protectTrainer, deleteProgress);

/**
 * @route   POST /api/trainer/progress/:id/photo
 * @desc    Upload progress photo
 * @access  Private (Trainer)
 */
router.post('/:id/photo', protectTrainer, uploadProgressPhoto);

module.exports = router;
