const express = require('express');
const router = express.Router();
const {
  getAllDietPlans,
  getDietPlanById,
  getMemberDietPlans,
  getTrainerDietPlans,
  createDietPlan,
  updateDietPlan,
  updateDietProgress,
  updateDietAdherence,
  completeDietPlan,
  pauseDietPlan,
  resumeDietPlan,
  deleteDietPlan,
  getDietStats,
} = require('../controllers/dietController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Diet & Nutrition Management Routes
 * Base path: /api/diets
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(protect);

// ============================================================================
// STATISTICS & OVERVIEW ROUTES
// ============================================================================

/**
 * @route   GET /api/diets/stats/overview
 * @desc    Get diet statistics
 * @query   trainerId, memberId
 * @access  Private (Super Admin, Trainers)
 */
router.get('/stats/overview', authorize('superadmin', 'trainer'), getDietStats);

// ============================================================================
// MEMBER & TRAINER SPECIFIC ROUTES
// ============================================================================

/**
 * @route   GET /api/diets/member/:memberId
 * @desc    Get member's diet plans
 * @query   status
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.get('/member/:memberId', getMemberDietPlans);

/**
 * @route   GET /api/diets/trainer/:trainerId
 * @desc    Get trainer's assigned diet plans
 * @query   status
 * @access  Private (Super Admin, Trainers - own)
 */
router.get('/trainer/:trainerId', getTrainerDietPlans);

// ============================================================================
// DIET PLAN CRUD ROUTES
// ============================================================================

/**
 * @route   GET /api/diets
 * @desc    Get all diet plans
 * @query   page, limit, memberId, trainerId, status, dietType, sortBy, sortOrder
 * @access  Private (Super Admin, Trainers)
 */
router.get('/', authorize('superadmin', 'trainer'), getAllDietPlans);

/**
 * @route   POST /api/diets
 * @desc    Create diet plan
 * @body    memberId, trainerId, dietTitle, dietType, mealSchedule, calorieTarget, nutritionNotes, restrictions, supplements, hydrationGoal, startDate, endDate, duration, notes
 * @access  Private (Super Admin, Trainers)
 */
router.post('/', authorize('superadmin', 'trainer'), createDietPlan);

/**
 * @route   GET /api/diets/:id
 * @desc    Get single diet plan
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.get('/:id', getDietPlanById);

/**
 * @route   PUT /api/diets/:id
 * @desc    Update diet plan
 * @body    dietTitle, dietType, mealSchedule, calorieTarget, nutritionNotes, restrictions, supplements, hydrationGoal, startDate, endDate, duration, status, progress, adherenceRate, notes
 * @access  Private (Super Admin, Trainers)
 */
router.put('/:id', authorize('superadmin', 'trainer'), updateDietPlan);

/**
 * @route   PATCH /api/diets/:id/progress
 * @desc    Update diet progress
 * @body    progress (0-100)
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.patch('/:id/progress', updateDietProgress);

/**
 * @route   PATCH /api/diets/:id/adherence
 * @desc    Update diet adherence
 * @body    adherenceRate (0-100)
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.patch('/:id/adherence', updateDietAdherence);

/**
 * @route   PATCH /api/diets/:id/complete
 * @desc    Complete diet plan
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.patch('/:id/complete', completeDietPlan);

/**
 * @route   PATCH /api/diets/:id/pause
 * @desc    Pause diet plan
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/:id/pause', authorize('superadmin', 'trainer'), pauseDietPlan);

/**
 * @route   PATCH /api/diets/:id/resume
 * @desc    Resume diet plan
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/:id/resume', authorize('superadmin', 'trainer'), resumeDietPlan);

/**
 * @route   DELETE /api/diets/:id
 * @desc    Delete diet plan
 * @access  Private (Super Admin, Trainers)
 */
router.delete('/:id', authorize('superadmin', 'trainer'), deleteDietPlan);

module.exports = router;
