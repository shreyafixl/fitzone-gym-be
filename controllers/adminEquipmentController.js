const Equipment = require('../models/Equipment');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all equipment with filtering and pagination
 * @route   GET /api/admin/equipment
 * @access  Private (Admin)
 */
const getAllEquipment = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = '',
    category = '',
    search = '',
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const equipment = await Equipment.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalEquipment = await Equipment.countDocuments(query);

  // Get summary
  const totalCount = await Equipment.countDocuments();
  const operationalCount = await Equipment.countDocuments({ status: 'operational' });
  const maintenanceCount = await Equipment.countDocuments({ status: 'maintenance' });
  const outOfOrderCount = await Equipment.countDocuments({ status: 'out_of_order' });

  // Calculate pagination info
  const totalPages = Math.ceil(totalEquipment / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      equipment,
      pagination: {
        currentPage: pageNum,
        totalPages,
        total: totalEquipment,
        limit: limitNum,
        hasMore
      },
      summary: {
        total: totalCount,
        operational: operationalCount,
        maintenance: maintenanceCount,
        outOfOrder: outOfOrderCount
      }
    },
    'Equipment retrieved successfully'
  );
});

/**
 * @desc    Get equipment by ID
 * @route   GET /api/admin/equipment/:id
 * @access  Private (Admin)
 */
const getEquipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const equipment = await Equipment.findById(id).lean();

  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  ApiResponse.success(
    res,
    { equipment },
    'Equipment retrieved successfully'
  );
});

/**
 * @desc    Create new equipment
 * @route   POST /api/admin/equipment
 * @access  Private (Admin)
 */
const createEquipment = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    quantity,
    status,
    location,
    purchaseDate,
    notes,
    lastService,
    nextService
  } = req.body;

  // Validate required fields
  if (!name || !category) {
    throw ApiError.badRequest('Please provide name and category');
  }

  // Create equipment
  const equipment = await Equipment.create({
    name,
    category,
    quantity: quantity || 1,
    status: status || 'operational',
    location: location || '',
    purchaseDate: purchaseDate || null,
    notes: notes || '',
    lastService: lastService || null,
    nextService: nextService || null,
    createdBy: req.user.id
  });

  ApiResponse.success(
    res,
    { equipment },
    'Equipment created successfully',
    201
  );
});

/**
 * @desc    Update equipment
 * @route   PUT /api/admin/equipment/:id
 * @access  Private (Admin)
 */
const updateEquipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find equipment
  const equipment = await Equipment.findById(id);
  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  // Update equipment
  const updatedEquipment = await Equipment.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  ApiResponse.success(
    res,
    { equipment: updatedEquipment },
    'Equipment updated successfully'
  );
});

/**
 * @desc    Delete equipment
 * @route   DELETE /api/admin/equipment/:id
 * @access  Private (Admin)
 */
const deleteEquipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find equipment
  const equipment = await Equipment.findById(id);
  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  // Delete equipment
  await Equipment.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { equipmentId: id },
    'Equipment deleted successfully'
  );
});

/**
 * @desc    Update equipment status
 * @route   PUT /api/admin/equipment/:id/status
 * @access  Private (Admin)
 */
const updateEquipmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw ApiError.badRequest('Status is required');
  }

  const validStatuses = ['operational', 'maintenance', 'out_of_order'];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  const equipment = await Equipment.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!equipment) {
    throw ApiError.notFound('Equipment not found');
  }

  ApiResponse.success(
    res,
    { equipment },
    'Equipment status updated successfully'
  );
});

/**
 * @desc    Get equipment statistics
 * @route   GET /api/admin/equipment/stats
 * @access  Private (Admin)
 */
const getEquipmentStats = asyncHandler(async (req, res) => {
  const totalEquipment = await Equipment.countDocuments();
  const operationalCount = await Equipment.countDocuments({ status: 'operational' });
  const maintenanceCount = await Equipment.countDocuments({ status: 'maintenance' });
  const outOfOrderCount = await Equipment.countDocuments({ status: 'out_of_order' });

  // Equipment by category
  const byCategory = await Equipment.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Equipment by status
  const byStatus = await Equipment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  ApiResponse.success(
    res,
    {
      summary: {
        total: totalEquipment,
        operational: operationalCount,
        maintenance: maintenanceCount,
        outOfOrder: outOfOrderCount
      },
      byCategory,
      byStatus
    },
    'Equipment statistics retrieved successfully'
  );
});

module.exports = {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  updateEquipmentStatus,
  getEquipmentStats
};
