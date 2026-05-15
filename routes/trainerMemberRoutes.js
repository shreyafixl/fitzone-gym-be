const express = require('express');
const router = express.Router();
const {
  getAssignedMembers,
  getMemberById,
  getMemberFitnessGoals,
  getMemberMembership,
  getMemberAttendance,
  getMemberProgress,
  getMemberWorkouts,
  searchMembers,
  getMembersStats,
  addProgressNote,
  getAvailableMembers,
  assignMemberToTrainer,
} = require('../controllers/trainerMemberController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   GET /api/trainer/members
 * @desc    Get all assigned members with pagination, sorting, and filtering
 * @access  Private (Trainer)
 * @query   page, limit, sortBy, sortOrder, search, membershipStatus, fitnessGoal, gender, isActive
 */
router.get('/', protectTrainer, getAssignedMembers);

/**
 * @route   GET /api/trainer/members/available
 * @desc    Get available members (not assigned to trainer)
 * @access  Private (Trainer)
 * @query   page, limit, search
 */
router.get('/available', protectTrainer, getAvailableMembers);

/**
 * @route   GET /api/trainer/members/search
 * @desc    Search and filter assigned members
 * @access  Private (Trainer)
 * @query   q, membershipStatus, fitnessGoal, gender
 */
router.get('/search', protectTrainer, searchMembers);

/**
 * @route   GET /api/trainer/members/stats
 * @desc    Get assigned members statistics
 * @access  Private (Trainer)
 */
router.get('/stats', protectTrainer, getMembersStats);

/**
 * @route   GET /api/trainer/members/:id
 * @desc    Get member details by ID
 * @access  Private (Trainer)
 */
router.get('/:id', protectTrainer, getMemberById);

/**
 * @route   GET /api/trainer/members/:id/fitness-goals
 * @desc    Get member fitness goals and physical stats
 * @access  Private (Trainer)
 */
router.get('/:id/fitness-goals', protectTrainer, getMemberFitnessGoals);

/**
 * @route   GET /api/trainer/members/:id/membership
 * @desc    Get member membership details
 * @access  Private (Trainer)
 */
router.get('/:id/membership', protectTrainer, getMemberMembership);

/**
 * @route   GET /api/trainer/members/:id/attendance
 * @desc    Get member attendance history
 * @access  Private (Trainer)
 * @query   page, limit, startDate, endDate
 */
router.get('/:id/attendance', protectTrainer, getMemberAttendance);

/**
 * @route   GET /api/trainer/members/:id/progress
 * @desc    Get member progress (workouts, attendance, stats)
 * @access  Private (Trainer)
 */
router.get('/:id/progress', protectTrainer, getMemberProgress);

/**
 * @route   GET /api/trainer/members/:id/workouts
 * @desc    Get member assigned workouts
 * @access  Private (Trainer)
 * @query   page, limit, status
 */
router.get('/:id/workouts', protectTrainer, getMemberWorkouts);

/**
 * @route   POST /api/trainer/members/:id/notes
 * @desc    Add a progress note for a member
 * @access  Private (Trainer)
 * @body    { note: String, bodyMeasurements?: Object, strengthMetrics?: Array, mood?: String, energyLevel?: Number, sleepQuality?: String, dietAdherence?: Number, workoutAdherence?: Number }
 */
router.post('/:id/notes', protectTrainer, addProgressNote);

/**
 * @route   POST /api/trainer/members/:id/assign
 * @desc    Assign a member to trainer
 * @access  Private (Trainer)
 */
router.post('/:id/assign', protectTrainer, assignMemberToTrainer);

module.exports = router;
