const Branch = require('../models/Branch');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all branches with filters and pagination
 * @route   GET /api/superadmin/branches
 * @access  Private (Super Admin only)
 */
const getAllBranches = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    city,
    branchStatus,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};

  // Filter by city
  if (city && city !== 'all') {
    query.city = new RegExp(city, 'i');
  }

  // Filter by branch status
  if (branchStatus && branchStatus !== 'all') {
    query.branchStatus = branchStatus;
  }

  // Search by branch name or code
  if (search) {
    query.$or = [
      { branchName: { $regex: search, $options: 'i' } },
      { branchCode: { $regex: search, $options: 'i' } },
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort order
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const branches = await Branch.find(query)
    .populate('branchManager', 'fullName email phone role')
    .populate('assignedAdmins', 'fullName email role')
    .populate('assignedTrainers', 'fullName email role')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const totalCount = await Branch.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  // Get statistics
  const stats = {
    total: await Branch.countDocuments(),
    active: await Branch.countDocuments({ branchStatus: 'active' }),
    inactive: await Branch.countDocuments({ branchStatus: 'inactive' }),
    underMaintenance: await Branch.countDocuments({ branchStatus: 'under-maintenance' }),
    totalMembers: branches.reduce((sum, branch) => sum + branch.totalMembers, 0),
    avgOccupancy: branches.length > 0
      ? (branches.reduce((sum, branch) => sum + parseFloat(branch.getOccupancyRate()), 0) / branches.length).toFixed(2)
      : 0,
  };

  ApiResponse.success(
    res,
    {
      branches: branches.map(branch => branch.getPublicProfile()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        perPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      stats,
    },
    'Branches retrieved successfully'
  );
});

/**
 * @desc    Get single branch by ID
 * @route   GET /api/superadmin/branches/:id
 * @access  Private (Super Admin only)
 */
const getBranchById = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id)
    .populate('branchManager', 'fullName email phone role')
    .populate('assignedAdmins', 'fullName email phone role')
    .populate('assignedTrainers', 'fullName email phone role');

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Get member count for this branch
  const memberCount = await User.countDocuments({
    role: 'member',
    // Assuming there's a branch field in User model - adjust if needed
  });

  ApiResponse.success(
    res,
    {
      branch: branch.getPublicProfile(),
      occupancyRate: branch.getOccupancyRate(),
      isAtCapacity: branch.isAtCapacity(),
      stats: {
        totalAdmins: branch.assignedAdmins.length,
        totalTrainers: branch.assignedTrainers.length,
        totalMembers: branch.totalMembers,
      },
    },
    'Branch retrieved successfully'
  );
});

/**
 * @desc    Create new branch
 * @route   POST /api/superadmin/branches
 * @access  Private (Super Admin only)
 */
const createBranch = asyncHandler(async (req, res) => {
  const {
    branchName,
    branchCode,
    address,
    city,
    state,
    pincode,
    contactNumber,
    email,
    branchManager,
    assignedAdmins,
    assignedTrainers,
    capacity,
    openingTime,
    closingTime,
    facilities,
    branchStatus,
    description,
    coordinates,
  } = req.body;

  // Validate required fields
  if (!branchName || !branchCode || !address || !city || !state || !pincode || !contactNumber || !email || !openingTime || !closingTime) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Check if branch code already exists
  const existingBranch = await Branch.findByCode(branchCode);
  if (existingBranch) {
    throw ApiError.conflict('Branch with this code already exists');
  }

  // Validate branch manager if provided
  if (branchManager) {
    const manager = await User.findById(branchManager);
    if (!manager) {
      throw ApiError.badRequest('Invalid branch manager ID');
    }
  }

  // Validate assigned admins if provided
  if (assignedAdmins && assignedAdmins.length > 0) {
    const admins = await User.find({ _id: { $in: assignedAdmins }, role: { $in: ['admin', 'staff'] } });
    if (admins.length !== assignedAdmins.length) {
      throw ApiError.badRequest('One or more admin IDs are invalid');
    }
  }

  // Validate assigned trainers if provided
  if (assignedTrainers && assignedTrainers.length > 0) {
    const trainers = await User.find({ _id: { $in: assignedTrainers }, role: 'trainer' });
    if (trainers.length !== assignedTrainers.length) {
      throw ApiError.badRequest('One or more trainer IDs are invalid');
    }
  }

  // Create branch
  const branch = await Branch.create({
    branchName,
    branchCode: branchCode.toUpperCase(),
    address,
    city,
    state,
    pincode,
    contactNumber,
    email: email.toLowerCase(),
    branchManager: branchManager || null,
    assignedAdmins: assignedAdmins || [],
    assignedTrainers: assignedTrainers || [],
    capacity: capacity || 500,
    openingTime,
    closingTime,
    facilities: facilities || [],
    branchStatus: branchStatus || 'active',
    description: description || null,
    coordinates: coordinates || { latitude: null, longitude: null },
  });

  // Populate references
  await branch.populate('branchManager', 'fullName email phone role');
  await branch.populate('assignedAdmins', 'fullName email role');
  await branch.populate('assignedTrainers', 'fullName email role');

  ApiResponse.created(
    res,
    { branch: branch.getPublicProfile() },
    'Branch created successfully'
  );
});

/**
 * @desc    Update branch
 * @route   PUT /api/superadmin/branches/:id
 * @access  Private (Super Admin only)
 */
const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  const {
    branchName,
    branchCode,
    address,
    city,
    state,
    pincode,
    contactNumber,
    email,
    branchManager,
    assignedAdmins,
    assignedTrainers,
    totalMembers,
    capacity,
    openingTime,
    closingTime,
    facilities,
    branchStatus,
    description,
    coordinates,
    isActive,
  } = req.body;

  // Check if branch code is being changed and if it's already taken
  if (branchCode && branchCode.toUpperCase() !== branch.branchCode) {
    const existingBranch = await Branch.findByCode(branchCode);
    if (existingBranch) {
      throw ApiError.conflict('Branch code already in use');
    }
  }

  // Validate branch manager if being changed
  if (branchManager && branchManager !== branch.branchManager?.toString()) {
    const manager = await User.findById(branchManager);
    if (!manager) {
      throw ApiError.badRequest('Invalid branch manager ID');
    }
  }

  // Validate assigned admins if being changed
  if (assignedAdmins) {
    const admins = await User.find({ _id: { $in: assignedAdmins }, role: { $in: ['admin', 'staff'] } });
    if (admins.length !== assignedAdmins.length) {
      throw ApiError.badRequest('One or more admin IDs are invalid');
    }
  }

  // Validate assigned trainers if being changed
  if (assignedTrainers) {
    const trainers = await User.find({ _id: { $in: assignedTrainers }, role: 'trainer' });
    if (trainers.length !== assignedTrainers.length) {
      throw ApiError.badRequest('One or more trainer IDs are invalid');
    }
  }

  // Update fields
  if (branchName) branch.branchName = branchName;
  if (branchCode) branch.branchCode = branchCode.toUpperCase();
  if (address) branch.address = address;
  if (city) branch.city = city;
  if (state) branch.state = state;
  if (pincode) branch.pincode = pincode;
  if (contactNumber) branch.contactNumber = contactNumber;
  if (email) branch.email = email.toLowerCase();
  if (branchManager !== undefined) branch.branchManager = branchManager;
  if (assignedAdmins !== undefined) branch.assignedAdmins = assignedAdmins;
  if (assignedTrainers !== undefined) branch.assignedTrainers = assignedTrainers;
  if (totalMembers !== undefined) branch.totalMembers = totalMembers;
  if (capacity !== undefined) branch.capacity = capacity;
  if (openingTime) branch.openingTime = openingTime;
  if (closingTime) branch.closingTime = closingTime;
  if (facilities !== undefined) branch.facilities = facilities;
  if (branchStatus) branch.branchStatus = branchStatus;
  if (description !== undefined) branch.description = description;
  if (coordinates) branch.coordinates = coordinates;
  if (isActive !== undefined) branch.isActive = isActive;

  await branch.save();

  // Populate references
  await branch.populate('branchManager', 'fullName email phone role');
  await branch.populate('assignedAdmins', 'fullName email role');
  await branch.populate('assignedTrainers', 'fullName email role');

  ApiResponse.success(
    res,
    { branch: branch.getPublicProfile() },
    'Branch updated successfully'
  );
});

/**
 * @desc    Delete branch
 * @route   DELETE /api/superadmin/branches/:id
 * @access  Private (Super Admin only)
 */
const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Check if branch has members
  if (branch.totalMembers > 0) {
    throw ApiError.badRequest('Cannot delete branch with active members. Please transfer members first.');
  }

  await branch.deleteOne();

  ApiResponse.success(res, null, 'Branch deleted successfully');
});

/**
 * @desc    Update branch status
 * @route   PATCH /api/superadmin/branches/:id/status
 * @access  Private (Super Admin only)
 */
const updateBranchStatus = asyncHandler(async (req, res) => {
  const { branchStatus } = req.body;

  if (!branchStatus) {
    throw ApiError.badRequest('Branch status is required');
  }

  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  branch.branchStatus = branchStatus;
  await branch.save();

  ApiResponse.success(
    res,
    { branch: branch.getPublicProfile() },
    'Branch status updated successfully'
  );
});

/**
 * @desc    Assign manager to branch
 * @route   PATCH /api/superadmin/branches/:id/assign-manager
 * @access  Private (Super Admin only)
 */
const assignManager = asyncHandler(async (req, res) => {
  const { managerId } = req.body;

  if (!managerId) {
    throw ApiError.badRequest('Manager ID is required');
  }

  // Validate manager
  const manager = await User.findById(managerId);
  if (!manager) {
    throw ApiError.badRequest('Invalid manager ID');
  }

  // Find and update branch
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  branch.branchManager = managerId;
  await branch.save();

  // Populate manager info
  await branch.populate('branchManager', 'fullName email phone role');

  ApiResponse.success(
    res,
    { branch: branch.getPublicProfile() },
    'Manager assigned successfully'
  );
});

/**
 * @desc    Assign admins to branch
 * @route   PATCH /api/superadmin/branches/:id/assign-admins
 * @access  Private (Super Admin only)
 */
const assignAdmins = asyncHandler(async (req, res) => {
  const { adminIds } = req.body;

  if (!adminIds || !Array.isArray(adminIds)) {
    throw ApiError.badRequest('Admin IDs array is required');
  }

  // Validate admins
  const admins = await User.find({ _id: { $in: adminIds }, role: { $in: ['admin', 'staff'] } });
  if (admins.length !== adminIds.length) {
    throw ApiError.badRequest('One or more admin IDs are invalid');
  }

  // Find and update branch
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  branch.assignedAdmins = adminIds;
  await branch.save();

  // Populate admin info
  await branch.populate('assignedAdmins', 'fullName email role');

  ApiResponse.success(
    res,
    { branch: branch.getPublicProfile() },
    'Admins assigned successfully'
  );
});

/**
 * @desc    Assign trainers to branch
 * @route   PATCH /api/superadmin/branches/:id/assign-trainers
 * @access  Private (Super Admin only)
 */
const assignTrainers = asyncHandler(async (req, res) => {
  const { trainerIds } = req.body;

  if (!trainerIds || !Array.isArray(trainerIds)) {
    throw ApiError.badRequest('Trainer IDs array is required');
  }

  // Validate trainers
  const trainers = await User.find({ _id: { $in: trainerIds }, role: 'trainer' });
  if (trainers.length !== trainerIds.length) {
    throw ApiError.badRequest('One or more trainer IDs are invalid');
  }

  // Find and update branch
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  branch.assignedTrainers = trainerIds;
  await branch.save();

  // Populate trainer info
  await branch.populate('assignedTrainers', 'fullName email role');

  ApiResponse.success(
    res,
    { branch: branch.getPublicProfile() },
    'Trainers assigned successfully'
  );
});

/**
 * @desc    Update branch facilities
 * @route   PATCH /api/superadmin/branches/:id/facilities
 * @access  Private (Super Admin only)
 */
const updateFacilities = asyncHandler(async (req, res) => {
  const { facilities } = req.body;

  if (!facilities || !Array.isArray(facilities)) {
    throw ApiError.badRequest('Facilities array is required');
  }

  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  branch.facilities = facilities;
  await branch.save();

  ApiResponse.success(
    res,
    { branch: branch.getPublicProfile() },
    'Facilities updated successfully'
  );
});

/**
 * @desc    Get branch statistics
 * @route   GET /api/superadmin/branches/stats
 * @access  Private (Super Admin only)
 */
const getBranchStats = asyncHandler(async (req, res) => {
  const totalBranches = await Branch.countDocuments();
  const activeBranches = await Branch.countDocuments({ branchStatus: 'active' });
  const inactiveBranches = await Branch.countDocuments({ branchStatus: 'inactive' });
  const underMaintenance = await Branch.countDocuments({ branchStatus: 'under-maintenance' });

  const branches = await Branch.find();
  const totalMembers = branches.reduce((sum, branch) => sum + branch.totalMembers, 0);
  const totalCapacity = branches.reduce((sum, branch) => sum + branch.capacity, 0);
  const avgOccupancy = branches.length > 0
    ? (branches.reduce((sum, branch) => sum + parseFloat(branch.getOccupancyRate()), 0) / branches.length).toFixed(2)
    : 0;

  // Get branches by city
  const branchesByCity = await Branch.aggregate([
    {
      $group: {
        _id: '$city',
        count: { $sum: 1 },
        totalMembers: { $sum: '$totalMembers' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get recent branches
  const recentBranches = await Branch.find()
    .select('branchName branchCode city branchStatus createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  const stats = {
    total: totalBranches,
    active: activeBranches,
    inactive: inactiveBranches,
    underMaintenance,
    totalMembers,
    totalCapacity,
    avgOccupancy: parseFloat(avgOccupancy),
    branchesByCity,
    recentBranches,
  };

  ApiResponse.success(res, stats, 'Branch statistics retrieved successfully');
});

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  updateBranchStatus,
  assignManager,
  assignAdmins,
  assignTrainers,
  updateFacilities,
  getBranchStats,
};
