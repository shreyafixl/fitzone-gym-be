const express = require('express');
const router = express.Router();
const {
  getAllWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  assignWorkout,
  getWorkoutStats,
  getWorkoutById,
} = require('../controllers/adminWorkoutController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/workouts/stats
 * @desc    Get workout statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getWorkoutStats);

/**
 * @route   GET /api/admin/workouts
 * @desc    Get all workout plans with filtering
 * @access  Private (Admin with canManageTrainers permission)
 */
router.get('/', protectAdmin, checkPermission('canManageTrainers'), getAllWorkouts);

/**
 * @route   POST /api/admin/workouts
 * @desc    Create workout plan
 * @access  Private (Admin with canManageTrainers permission)
 */
router.post('/', protectAdmin, checkPermission('canManageTrainers'), createWorkout);

/**
 * @route   GET /api/admin/workouts/:id
 * @desc    Get workout by ID
 * @access  Private (Admin with canManageTrainers permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageTrainers'), getWorkoutById);

/**
 * @route   PUT /api/admin/workouts/:id
 * @desc    Update workout plan
 * @access  Private (Admin with canManageTrainers permission)
 */
router.put('/:id', protectAdmin, checkPermission('canManageTrainers'), updateWorkout);

/**
 * @route   DELETE /api/admin/workouts/:id
 * @desc    Delete workout plan
 * @access  Private (Admin with canManageTrainers and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageTrainers'), checkPermission('canDeleteRecords'), deleteWorkout);

/**
 * @route   POST /api/admin/workouts/:id/assign
 * @desc    Assign workout to member
 * @access  Private (Admin with canManageTrainers permission)
 */
router.post('/:id/assign', protectAdmin, checkPermission('canManageTrainers'), assignWorkout);

module.exports = router;
