const express = require('express');
const router = express.Router();
const {
  getMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/admin/maintenance
 * @desc    Get all maintenance logs
 * @access  Private (Admin)
 */
router.get('/', getMaintenance);

/**
 * @route   GET /api/admin/maintenance/:maintenanceId
 * @desc    Get maintenance log by ID
 * @access  Private (Admin)
 */
router.get('/:maintenanceId', getMaintenanceById);

/**
 * @route   POST /api/admin/maintenance
 * @desc    Create new maintenance log
 * @access  Private (Admin)
 */
router.post('/', createMaintenance);

/**
 * @route   PUT /api/admin/maintenance/:maintenanceId
 * @desc    Update maintenance log
 * @access  Private (Admin)
 */
router.put('/:maintenanceId', updateMaintenance);

/**
 * @route   DELETE /api/admin/maintenance/:maintenanceId
 * @desc    Delete maintenance log
 * @access  Private (Admin)
 */
router.delete('/:maintenanceId', deleteMaintenance);

module.exports = router;
