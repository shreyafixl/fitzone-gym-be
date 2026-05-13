const Equipment = require('../models/Equipment');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all equipment
 * @route   GET /api/superadmin/equipment
 * @access  Private (SuperAdmin)
 */
const getEquipment = asyncHandler(async (req, res) => {
  const { status, category, branch_id } = req.query;
  
  let filter = {};
  if (status && status !== 'all') filter.status = status;
  if (category) filter.category = category;
  if (branch_id) filter.branch_id = branch_id;

  const equipment = await Equipment.find(filter).sort({ createdAt: -1 });

  const summary = {
    total: equipment.length,
    working: equipment.filter(e => e.status === 'working').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    broken: equipment.filter(e => e.status === 'broken').length,
  };

  ApiResponse.success(res, { equipment, summary }, 'Equipment retrieved successfully');
});

/**
 * @desc    Get equipment by ID
 * @route   GET /api/superadmin/equipment/:equipmentId
 * @access  Private (SuperAdmin)
 */
const getEquipmentById = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.equipmentId);

  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  ApiResponse.success(res, equipment, 'Equipment retrieved successfully');
});

/**
 * @desc    Create equipment
 * @route   POST /api/superadmin/equipment
 * @access  Private (SuperAdmin)
 */
const createEquipment = asyncHandler(async (req, res) => {
  const { name, category, branch, status } = req.body;

  if (!name || !category) {
    throw ApiError.badRequest('Name and category are required');
  }

  const equipment = await Equipment.create({
    name,
    category,
    branch: branch || 'N/A',
    status: status || 'working',
  });

  ApiResponse.success(res, equipment, 'Equipment created successfully', 201);
});

/**
 * @desc    Update equipment
 * @route   PUT /api/superadmin/equipment/:equipmentId
 * @access  Private (SuperAdmin)
 */
const updateEquipment = asyncHandler(async (req, res) => {
  let equipment = await Equipment.findById(req.params.equipmentId);

  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  equipment = await Equipment.findByIdAndUpdate(
    req.params.equipmentId,
    req.body,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, equipment, 'Equipment updated successfully');
});

/**
 * @desc    Delete equipment
 * @route   DELETE /api/superadmin/equipment/:equipmentId
 * @access  Private (SuperAdmin)
 */
const deleteEquipment = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findByIdAndDelete(req.params.equipmentId);

  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  ApiResponse.success(res, null, 'Equipment deleted successfully');
});

module.exports = {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};
