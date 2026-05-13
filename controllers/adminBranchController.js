const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all branches with pagination, filtering, and search
 * @route   GET /api/admin/branches
 * @access  Private (Admin)
 */
const getAllBranches = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    city = '',
    state = '',
    branchStatus = '',
    isActive = '',
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  // Build query
  const query = {};

  // Search by branch name, code, or address
  if (search) {
    query.$or = [
      { branchName: { $regex: search, $options: 'i' } },
      { branchCode: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by city
  if (city) {
    query.city = { $regex: city, $options: 'i' };
  }

  // Filter by state
  if (state) {
    query.state = { $regex: state, $options: 'i' };
  }

  // Filter by branch status
  if (branchStatus) {
    query.branchStatus = branchStatus;
  }

  // Filter by active status
  if (isActive !== '') {
    query.isActive = isActive === 'true';
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const branches = await Branch.find(query)
    .populate('branchManager', 'fullName email phone role')
    .populate('assignedAdmins', 'fullName email role')
    .populate('assignedTrainers', 'fullName email role')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalBranches = await Branch.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalBranches / limitNum);
  const hasMore = pageNum < totalPages;

  // Add occupancy rate to each branch
  const branchesWithStats = branches.map((branch) => ({
    ...branch,
    occupancyRate: branch.capacity > 0 
      ? ((branch.totalMembers / branch.capacity) * 100).toFixed(2) 
      : 0,
    isAtCapacity: branch.totalMembers >= branch.capacity,
  }));

  ApiResponse.success(
    res,
    {
      branches: branchesWithStats,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalBranches,
        limit: limitNum,
        hasMore,
      },
    },
    'Branches retrieved successfully'
  );
});

/**
 * @desc    Get branch by ID
 * @route   GET /api/admin/branches/:id
 * @access  Private (Admin)
 */
const getBranchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const branch = await Branch.findById(id)
    .populate('branchManager', 'fullName email phone role profileImage')
    .populate('assignedAdmins', 'fullName email role')
    .populate('assignedTrainers', 'fullName email phone role specialization')
    .lean();

  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Calculate additional stats
  const occupancyRate = branch.capacity > 0 
    ? ((branch.totalMembers / branch.capacity) * 100).toFixed(2) 
    : 0;
  
  const isAtCapacity = branch.totalMembers >= branch.capacity;
  const availableCapacity = Math.max(0, branch.capacity - branch.totalMembers);

  // Get member count by membership status for this branch
  const activeMembersCount = await User.countDocuments({
    branch: id,
    membershipStatus: 'active',
    isActive: true,
  });

  ApiResponse.success(
    res,
    {
      branch: {
        ...branch,
        occupancyRate,
        isAtCapacity,
        availableCapacity,
        activeMembersCount,
      },
    },
    'Branch retrieved successfully'
  );
});

/**
 * @desc    Create new branch
 * @route   POST /api/admin/branches
 * @access  Private (Admin)
 */
const createBranch = asyncHandler(async (req, res) => {
  const {
    branchName,
    branchCode,
    address,
    city,
    state,
    pincode,
    zipCode,
    contactNumber,
    phone,
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
    images,
    coordinates,
  } = req.body;

  // Validate required fields
  if (!branchName || !branchCode || !address || !city || !state || !(pincode || zipCode) || !(contactNumber || phone) || !email || !openingTime || !closingTime) {
    throw ApiError.badRequest(
      'Please provide all required fields: branchName, branchCode, address, city, state, pincode/zipCode, contactNumber/phone, email, openingTime, closingTime'
    );
  }

  // Check if branch code already exists
  const existingBranch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
  if (existingBranch) {
    throw ApiError.conflict('Branch with this code already exists');
  }

  // Check if email already exists
  const existingEmail = await Branch.findOne({ email });
  if (existingEmail) {
    throw ApiError.conflict('Branch with this email already exists');
  }

  // If branch manager is provided, verify it exists and is a valid user
  if (branchManager) {
    const manager = await User.findById(branchManager);
    if (!manager) {
      throw ApiError.badRequest('Invalid branch manager ID');
    }
    if (!['admin', 'manager', 'staff'].includes(manager.role)) {
      throw ApiError.badRequest('Branch manager must have admin, manager, or staff role');
    }
  }

  // Validate assigned admins if provided
  if (assignedAdmins && assignedAdmins.length > 0) {
    const admins = await User.find({ _id: { $in: assignedAdmins } });
    if (admins.length !== assignedAdmins.length) {
      throw ApiError.badRequest('One or more assigned admin IDs are invalid');
    }
    const invalidAdmins = admins.filter(admin => !['admin', 'manager', 'staff'].includes(admin.role));
    if (invalidAdmins.length > 0) {
      throw ApiError.badRequest('All assigned admins must have admin, manager, or staff role');
    }
  }

  // Validate assigned trainers if provided
  if (assignedTrainers && assignedTrainers.length > 0) {
    const trainers = await User.find({ _id: { $in: assignedTrainers } });
    if (trainers.length !== assignedTrainers.length) {
      throw ApiError.badRequest('One or more assigned trainer IDs are invalid');
    }
    const invalidTrainers = trainers.filter(trainer => trainer.role !== 'trainer');
    if (invalidTrainers.length > 0) {
      throw ApiError.badRequest('All assigned trainers must have trainer role');
    }
  }

  // Validate opening and closing times
  if (openingTime >= closingTime) {
    throw ApiError.badRequest('Closing time must be after opening time');
  }

  // Create branch
  const branch = await Branch.create({
    branchName,
    branchCode: branchCode.toUpperCase(),
    address,
    city,
    state,
    pincode: pincode || zipCode,
    contactNumber: contactNumber || phone,
    email,
    branchManager,
    assignedAdmins,
    assignedTrainers,
    capacity: capacity || 500,
    openingTime,
    closingTime,
    facilities: facilities || [],
    branchStatus: branchStatus || 'active',
    description,
    images: images || [],
    coordinates,
  });

  // Get created branch with populated fields
  const createdBranch = await Branch.findById(branch._id)
    .populate('branchManager', 'fullName email phone role')
    .populate('assignedAdmins', 'fullName email role')
    .populate('assignedTrainers', 'fullName email role');

  ApiResponse.success(
    res,
    { branch: createdBranch },
    'Branch created successfully',
    201
  );
});

/**
 * @desc    Update branch
 * @route   PUT /api/admin/branches/:id
 * @access  Private (Admin)
 */
const updateBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find branch
  const branch = await Branch.findById(id);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Don't allow updating branch code if it's already taken by another branch
  if (updateData.branchCode && updateData.branchCode.toUpperCase() !== branch.branchCode) {
    const existingBranch = await Branch.findOne({ branchCode: updateData.branchCode.toUpperCase() });
    if (existingBranch) {
      throw ApiError.conflict('Branch code is already in use');
    }
    updateData.branchCode = updateData.branchCode.toUpperCase();
  }

  // Don't allow updating email if it's already taken by another branch
  if (updateData.email && updateData.email !== branch.email) {
    const existingEmail = await Branch.findOne({ email: updateData.email });
    if (existingEmail) {
      throw ApiError.conflict('Email is already in use');
    }
  }

  // If branch manager is being updated, verify it exists
  if (updateData.branchManager) {
    const manager = await User.findById(updateData.branchManager);
    if (!manager) {
      throw ApiError.badRequest('Invalid branch manager ID');
    }
    if (!['admin', 'manager', 'staff'].includes(manager.role)) {
      throw ApiError.badRequest('Branch manager must have admin, manager, or staff role');
    }
  }

  // Validate assigned admins if being updated
  if (updateData.assignedAdmins && updateData.assignedAdmins.length > 0) {
    const admins = await User.find({ _id: { $in: updateData.assignedAdmins } });
    if (admins.length !== updateData.assignedAdmins.length) {
      throw ApiError.badRequest('One or more assigned admin IDs are invalid');
    }
    const invalidAdmins = admins.filter(admin => !['admin', 'manager', 'staff'].includes(admin.role));
    if (invalidAdmins.length > 0) {
      throw ApiError.badRequest('All assigned admins must have admin, manager, or staff role');
    }
  }

  // Validate assigned trainers if being updated
  if (updateData.assignedTrainers && updateData.assignedTrainers.length > 0) {
    const trainers = await User.find({ _id: { $in: updateData.assignedTrainers } });
    if (trainers.length !== updateData.assignedTrainers.length) {
      throw ApiError.badRequest('One or more assigned trainer IDs are invalid');
    }
    const invalidTrainers = trainers.filter(trainer => trainer.role !== 'trainer');
    if (invalidTrainers.length > 0) {
      throw ApiError.badRequest('All assigned trainers must have trainer role');
    }
  }

  // Validate opening and closing times if being updated
  const newOpeningTime = updateData.openingTime || branch.openingTime;
  const newClosingTime = updateData.closingTime || branch.closingTime;
  if (newOpeningTime >= newClosingTime) {
    throw ApiError.badRequest('Closing time must be after opening time');
  }

  // Handle zipCode and phone aliases
  if (updateData.zipCode) {
    updateData.pincode = updateData.zipCode;
  }
  if (updateData.phone) {
    updateData.contactNumber = updateData.phone;
  }

  // Update branch
  const updatedBranch = await Branch.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate('branchManager', 'fullName email phone role')
    .populate('assignedAdmins', 'fullName email role')
    .populate('assignedTrainers', 'fullName email role');

  ApiResponse.success(
    res,
    { branch: updatedBranch },
    'Branch updated successfully'
  );
});

/**
 * @desc    Delete branch
 * @route   DELETE /api/admin/branches/:id
 * @access  Private (Admin)
 */
const deleteBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find branch
  const branch = await Branch.findById(id);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Check if branch has active members
  const activeMembersCount = await User.countDocuments({
    branch: id,
    membershipStatus: 'active',
    isActive: true,
  });

  if (activeMembersCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete branch with ${activeMembersCount} active members. Please reassign or deactivate members first.`
    );
  }

  // Soft delete - set isActive to false
  branch.isActive = false;
  branch.branchStatus = 'inactive';
  await branch.save();

  // Or hard delete - uncomment below and comment above
  // await Branch.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { branchId: id },
    'Branch deleted successfully'
  );
});

/**
 * @desc    Get branch statistics
 * @route   GET /api/admin/branches/:id/stats
 * @access  Private (Admin)
 */
const getBranchStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find branch
  const branch = await Branch.findById(id);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Get member statistics for this branch
  const totalMembers = await User.countDocuments({ branch: id });
  const activeMembers = await User.countDocuments({
    branch: id,
    membershipStatus: 'active',
    isActive: true,
  });
  const inactiveMembers = await User.countDocuments({
    branch: id,
    isActive: false,
  });
  const expiredMembers = await User.countDocuments({
    branch: id,
    membershipStatus: 'expired',
  });
  const pendingMembers = await User.countDocuments({
    branch: id,
    membershipStatus: 'pending',
  });

  // Get trainer count
  const trainerCount = branch.assignedTrainers ? branch.assignedTrainers.length : 0;

  // Get admin count
  const adminCount = branch.assignedAdmins ? branch.assignedAdmins.length : 0;

  // Calculate occupancy
  const occupancyRate = branch.capacity > 0 
    ? ((branch.totalMembers / branch.capacity) * 100).toFixed(2) 
    : 0;
  const availableCapacity = Math.max(0, branch.capacity - branch.totalMembers);
  const isAtCapacity = branch.totalMembers >= branch.capacity;

  // Get members by gender
  const maleMembers = await User.countDocuments({ branch: id, gender: 'male' });
  const femaleMembers = await User.countDocuments({ branch: id, gender: 'female' });
  const otherGender = await User.countDocuments({ branch: id, gender: 'other' });

  // Get members by membership plan
  const monthlyPlan = await User.countDocuments({ branch: id, membershipPlan: 'monthly' });
  const quarterlyPlan = await User.countDocuments({ branch: id, membershipPlan: 'quarterly' });
  const halfYearlyPlan = await User.countDocuments({ branch: id, membershipPlan: 'half-yearly' });
  const yearlyPlan = await User.countDocuments({ branch: id, membershipPlan: 'yearly' });

  // Get new members this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newMembersThisMonth = await User.countDocuments({
    branch: id,
    createdAt: { $gte: startOfMonth },
  });

  // Get recent members (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMembers = await User.countDocuments({
    branch: id,
    createdAt: { $gte: sevenDaysAgo },
  });

  // Average age of members
  const ageAggregation = await User.aggregate([
    { $match: { branch: mongoose.Types.ObjectId(id) } },
    { $group: { _id: null, avgAge: { $avg: '$age' } } },
  ]);
  const averageAge = ageAggregation.length > 0 ? Math.round(ageAggregation[0].avgAge) : 0;

  ApiResponse.success(
    res,
    {
      branchInfo: {
        id: branch._id,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        city: branch.city,
        state: branch.state,
        branchStatus: branch.branchStatus,
      },
      capacity: {
        total: branch.capacity,
        occupied: branch.totalMembers,
        available: availableCapacity,
        occupancyRate: parseFloat(occupancyRate),
        isAtCapacity,
      },
      members: {
        total: totalMembers,
        active: activeMembers,
        inactive: inactiveMembers,
        expired: expiredMembers,
        pending: pendingMembers,
        newThisMonth: newMembersThisMonth,
        recentMembers,
        averageAge,
      },
      staff: {
        trainers: trainerCount,
        admins: adminCount,
        hasManager: !!branch.branchManager,
      },
      membersByGender: {
        male: maleMembers,
        female: femaleMembers,
        other: otherGender,
      },
      membersByPlan: {
        monthly: monthlyPlan,
        quarterly: quarterlyPlan,
        halfYearly: halfYearlyPlan,
        yearly: yearlyPlan,
      },
      facilities: branch.facilities || [],
      operatingHours: {
        opening: branch.openingTime,
        closing: branch.closingTime,
      },
    },
    'Branch statistics retrieved successfully'
  );
});

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
};
