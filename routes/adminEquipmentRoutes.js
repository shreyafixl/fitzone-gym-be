const express = require('express');
const router = express.Router();
const {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  updateEquipmentStatus,
  getEquipmentStats
} = require('../controllers/adminEquipmentController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/equipment/stats
 * @desc    Get equipment statistics
 * @access  Private (Admin)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getEquipmentStats);

/**
 * @route   GET /api/admin/equipment
 * @desc    Get all equipment with filtering and pagination
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, checkPermission('canManageSettings'), getAllEquipment);

/**
 * @route   POST /api/admin/equipment
 * @desc    Create new equipment
 * @access  Private (Admin)
 */
router.post('/', protectAdmin, checkPermission('canManageSettings'), createEquipment);

/**
 * @route   GET /api/admin/equipment/:id
 * @desc    Get equipment by ID
 * @access  Private (Admin)
 */
router.get('/:id', protectAdmin, checkPermission('canManageSettings'), getEquipmentById);

/**
 * @route   PUT /api/admin/equipment/:id
 * @desc    Update equipment
 * @access  Private (Admin)
 */
router.put('/:id', protectAdmin, checkPermission('canManageSettings'), updateEquipment);

/**
 * @route   PUT /api/admin/equipment/:id/status
 * @desc    Update equipment status
 * @access  Private (Admin)
 */
router.put('/:id/status', protectAdmin, checkPermission('canManageSettings'), updateEquipmentStatus);

/**
 * @route   DELETE /api/admin/equipment/:id
 * @desc    Delete equipment
 * @access  Private (Admin)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageSettings'), checkPermission('canDeleteRecords'), deleteEquipment);

module.exports = router;
