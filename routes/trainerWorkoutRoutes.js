const express = require('express');
const router = express.Router();
const {
  getAllWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  assignWorkout,
  updateProgress,
  pauseWorkout,
  resumeWorkout,
  completeWorkout,
  getWorkoutStats,
  getWeeklySchedule,
  duplicateWorkout,
} = require('../controllers/trainerWorkoutController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   GET /api/trainer/workouts
 * @desc    Get all workout plans created by trainer
 * @access  Private (Trainer)
 * @query   page, limit, sortBy, sortOrder, search, status, category, difficulty, memberId
 */
router.get('/', protectTrainer, getAllWorkouts);

/**
 * @route   GET /api/trainer/workouts/stats
 * @desc    Get workout statistics
 * @access  Private (Trainer)
 */
router.get('/stats', protectTrainer, getWorkoutStats);

/**
 * @route   GET /api/trainer/workouts/schedule
 * @desc    Get weekly workout schedule
 * @access  Private (Trainer)
 */
router.get('/schedule', protectTrainer, getWeeklySchedule);

/**
 * @route   POST /api/trainer/workouts
 * @desc    Create new workout plan
 * @access  Private (Trainer)
 */
router.post('/', protectTrainer, createWorkout);

/**
 * @route   GET /api/trainer/workouts/:id
 * @desc    Get workout plan by ID
 * @access  Private (Trainer)
 */
router.get('/:id', protectTrainer, getWorkoutById);

/**
 * @route   PUT /api/trainer/workouts/:id
 * @desc    Update workout plan
 * @access  Private (Trainer)
 */
router.put('/:id', protectTrainer, updateWorkout);

/**
 * @route   DELETE /api/trainer/workouts/:id
 * @desc    Delete workout plan
 * @access  Private (Trainer)
 */
router.delete('/:id', protectTrainer, deleteWorkout);

/**
 * @route   POST /api/trainer/workouts/:id/assign
 * @desc    Assign workout to member
 * @access  Private (Trainer)
 */
router.post('/:id/assign', protectTrainer, assignWorkout);

/**
 * @route   PUT /api/trainer/workouts/:id/progress
 * @desc    Update workout progress
 * @access  Private (Trainer)
 */
router.put('/:id/progress', protectTrainer, updateProgress);

/**
 * @route   PUT /api/trainer/workouts/:id/pause
 * @desc    Pause workout plan
 * @access  Private (Trainer)
 */
router.put('/:id/pause', protectTrainer, pauseWorkout);

/**
 * @route   PUT /api/trainer/workouts/:id/resume
 * @desc    Resume workout plan
 * @access  Private (Trainer)
 */
router.put('/:id/resume', protectTrainer, resumeWorkout);

/**
 * @route   PUT /api/trainer/workouts/:id/complete
 * @desc    Complete workout plan
 * @access  Private (Trainer)
 */
router.put('/:id/complete', protectTrainer, completeWorkout);

/**
 * @route   POST /api/trainer/workouts/:id/duplicate
 * @desc    Duplicate workout plan
 * @access  Private (Trainer)
 */
router.post('/:id/duplicate', protectTrainer, duplicateWorkout);

module.exports = router;
