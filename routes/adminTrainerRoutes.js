const express = require('express');
const router = express.Router();
const {
  getAllTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  assignMembers,
  updateAvailability,
  getTrainerById,
  getTrainerStats,
} = require('../controllers/adminTrainerController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/trainers/stats
 * @desc    Get trainer statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getTrainerStats);

/**
 * @route   GET /api/admin/trainers
 * @desc    Get all trainers with filtering
 * @access  Private (Admin with canManageTrainers permission)
 */
router.get('/', getAllTrainers);

/**
 * @route   POST /api/admin/trainers
 * @desc    Create trainer
 * @access  Private (Admin with canManageTrainers permission)
 */
router.post('/', createTrainer);

/**
 * @route   GET /api/admin/trainers/:id
 * @desc    Get trainer by ID
 * @access  Private (Admin with canManageTrainers permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageTrainers'), getTrainerById);

/**
 * @route   PUT /api/admin/trainers/:id
 * @desc    Update trainer
 * @access  Public (for demo)
 */
router.put('/:id', updateTrainer);

/**
 * @route   DELETE /api/admin/trainers/:id
 * @desc    Delete trainer
 * @access  Private (Admin with canManageTrainers and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageTrainers'), checkPermission('canDeleteRecords'), deleteTrainer);

/**
 * @route   POST /api/admin/trainers/:id/assign-members
 * @desc    Assign members to trainer
 * @access  Private (Admin with canManageTrainers permission)
 */
router.post('/:id/assign-members', protectAdmin, checkPermission('canManageTrainers'), assignMembers);

/**
 * @route   PUT /api/admin/trainers/:id/availability
 * @desc    Update trainer availability
 * @access  Private (Admin with canManageTrainers permission)
 */
router.put('/:id/availability', protectAdmin, checkPermission('canManageTrainers'), updateAvailability);

module.exports = router;
