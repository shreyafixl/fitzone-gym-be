const Maintenance = require('../models/Maintenance');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all maintenance logs
 * @route   GET /api/superadmin/equipment/maintenance
 * @access  Private (SuperAdmin)
 */
const getMaintenance = asyncHandler(async (req, res) => {
  const { status, equipment_id } = req.query;
  
  let filter = {};
  if (status && status !== 'all') filter.status = status;
  if (equipment_id) filter.equipment_id = equipment_id;

  const maintenance = await Maintenance.find(filter).sort({ createdAt: -1 });

  const summary = {
    total: maintenance.length,
    pending: maintenance.filter(m => m.status === 'pending').length,
    'in-progress': maintenance.filter(m => m.status === 'in-progress').length,
    completed: maintenance.filter(m => m.status === 'completed').length,
  };

  ApiResponse.success(res, { maintenance, summary }, 'Maintenance logs retrieved successfully');
});

/**
 * @desc    Get maintenance by ID
 * @route   GET /api/superadmin/equipment/maintenance/:maintenanceId
 * @access  Private (SuperAdmin)
 */
const getMaintenanceById = asyncHandler(async (req, res) => {
  const maintenance = await Maintenance.findById(req.params.maintenanceId);

  if (!maintenance) {
    throw ApiError.notFound('Maintenance log not found');
  }

  ApiResponse.success(res, maintenance, 'Maintenance log retrieved successfully');
});

/**
 * @desc    Create maintenance log
 * @route   POST /api/superadmin/equipment/:equipmentId/maintenance
 * @access  Private (SuperAdmin)
 */
const createMaintenance = asyncHandler(async (req, res) => {
  const { type, technician_name, scheduled_date, cost, description, status } = req.body;
  const { equipmentId } = req.params;

  if (!type || !technician_name || !scheduled_date) {
    throw ApiError.badRequest('Type, technician name, and scheduled date are required');
  }

  const maintenance = await Maintenance.create({
    equipment_id: equipmentId,
    type,
    technician_name,
    scheduled_date,
    cost: cost || 0,
    description: description || '',
    status: status || 'pending',
  });

  ApiResponse.success(res, maintenance, 'Maintenance scheduled successfully', 201);
});

/**
 * @desc    Update maintenance log
 * @route   PUT /api/superadmin/equipment/maintenance/:maintenanceId
 * @access  Private (SuperAdmin)
 */
const updateMaintenance = asyncHandler(async (req, res) => {
  let maintenance = await Maintenance.findById(req.params.maintenanceId);

  if (!maintenance) {
    throw ApiError.notFound('Maintenance log not found');
  }

  maintenance = await Maintenance.findByIdAndUpdate(
    req.params.maintenanceId,
    req.body,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, maintenance, 'Maintenance updated successfully');
});

/**
 * @desc    Delete maintenance log
 * @route   DELETE /api/superadmin/equipment/maintenance/:maintenanceId
 * @access  Private (SuperAdmin)
 */
const deleteMaintenance = asyncHandler(async (req, res) => {
  const maintenance = await Maintenance.findByIdAndDelete(req.params.maintenanceId);

  if (!maintenance) {
    throw ApiError.notFound('Maintenance log not found');
  }

  ApiResponse.success(res, null, 'Maintenance log deleted successfully');
});

module.exports = {
  getMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
};
