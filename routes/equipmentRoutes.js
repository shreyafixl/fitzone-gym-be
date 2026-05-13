const express = require('express');
const router = express.Router();
const {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require('../controllers/equipmentController');
const {
  getMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Equipment Routes
 */

// Get all equipment
router.get('/', protect, authorize('superadmin'), getEquipment);

// Create equipment
router.post('/', protect, authorize('superadmin'), createEquipment);

// Get equipment by ID
router.get('/:equipmentId', protect, authorize('superadmin'), getEquipmentById);

// Update equipment
router.put('/:equipmentId', protect, authorize('superadmin'), updateEquipment);

// Delete equipment
router.delete('/:equipmentId', protect, authorize('superadmin'), deleteEquipment);

/**
 * Maintenance Routes (nested under equipment)
 */

// Get all maintenance logs
router.get('/maintenance/list', protect, authorize('superadmin'), getMaintenance);

// Schedule maintenance for equipment
router.post('/:equipmentId/maintenance', protect, authorize('superadmin'), createMaintenance);

// Get maintenance by ID
router.get('/maintenance/:maintenanceId', protect, authorize('superadmin'), getMaintenanceById);

// Update maintenance
router.put('/maintenance/:maintenanceId', protect, authorize('superadmin'), updateMaintenance);

// Delete maintenance
router.delete('/maintenance/:maintenanceId', protect, authorize('superadmin'), deleteMaintenance);

module.exports = router;
