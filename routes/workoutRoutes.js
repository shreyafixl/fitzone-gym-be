const express = require('express');
const router = express.Router();
const {
  getAllWorkoutPlans,
  getWorkoutPlanById,
  getMemberWorkoutPlans,
  getTrainerWorkoutPlans,
  createWorkoutPlan,
  updateWorkoutPlan,
  updateWorkoutProgress,
  completeWorkoutPlan,
  pauseWorkoutPlan,
  resumeWorkoutPlan,
  deleteWorkoutPlan,
  getWorkoutStats,
} = require('../controllers/workoutController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Workout Plan Management Routes
 * Base path: /api/workouts
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(protect);

// ============================================================================
// STATISTICS & OVERVIEW ROUTES
// ============================================================================

/**
 * @route   GET /api/workouts/stats/overview
 * @desc    Get workout statistics
 * @query   trainerId, memberId
 * @access  Private (Super Admin, Trainers)
 */
router.get('/stats/overview', authorize('superadmin', 'trainer'), getWorkoutStats);

// ============================================================================
// MEMBER & TRAINER SPECIFIC ROUTES
// ============================================================================

/**
 * @route   GET /api/workouts/member/:memberId
 * @desc    Get member's workout plans
 * @query   status
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.get('/member/:memberId', getMemberWorkoutPlans);

/**
 * @route   GET /api/workouts/trainer/:trainerId
 * @desc    Get trainer's assigned workout plans
 * @query   status
 * @access  Private (Super Admin, Trainers - own)
 */
router.get('/trainer/:trainerId', getTrainerWorkoutPlans);

// ============================================================================
// WORKOUT PLAN CRUD ROUTES
// ============================================================================

/**
 * @route   GET /api/workouts
 * @desc    Get all workout plans
 * @query   page, limit, memberId, trainerId, status, workoutCategory, difficultyLevel, sortBy, sortOrder
 * @access  Private (Super Admin, Trainers)
 */
router.get('/', authorize('superadmin', 'trainer'), getAllWorkoutPlans);

/**
 * @route   POST /api/workouts
 * @desc    Create workout plan
 * @body    memberId, trainerId, workoutTitle, workoutCategory, exercises, duration, difficultyLevel, targetMuscleGroups, goals, frequency, startDate, endDate, notes
 * @access  Private (Super Admin, Trainers)
 */
router.post('/', authorize('superadmin', 'trainer'), createWorkoutPlan);

/**
 * @route   GET /api/workouts/:id
 * @desc    Get single workout plan
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.get('/:id', getWorkoutPlanById);

/**
 * @route   PUT /api/workouts/:id
 * @desc    Update workout plan
 * @body    workoutTitle, workoutCategory, exercises, duration, difficultyLevel, targetMuscleGroups, goals, frequency, startDate, endDate, status, progress, notes
 * @access  Private (Super Admin, Trainers)
 */
router.put('/:id', authorize('superadmin', 'trainer'), updateWorkoutPlan);

/**
 * @route   PATCH /api/workouts/:id/progress
 * @desc    Update workout progress
 * @body    progress (0-100)
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.patch('/:id/progress', updateWorkoutProgress);

/**
 * @route   PATCH /api/workouts/:id/complete
 * @desc    Complete workout plan
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.patch('/:id/complete', completeWorkoutPlan);

/**
 * @route   PATCH /api/workouts/:id/pause
 * @desc    Pause workout plan
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/:id/pause', authorize('superadmin', 'trainer'), pauseWorkoutPlan);

/**
 * @route   PATCH /api/workouts/:id/resume
 * @desc    Resume workout plan
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/:id/resume', authorize('superadmin', 'trainer'), resumeWorkoutPlan);

/**
 * @route   DELETE /api/workouts/:id
 * @desc    Delete workout plan
 * @access  Private (Super Admin, Trainers)
 */
router.delete('/:id', authorize('superadmin', 'trainer'), deleteWorkoutPlan);

module.exports = router;
