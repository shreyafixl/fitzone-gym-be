const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all users with filters and pagination
 * @route   GET /api/superadmin/users
 * @access  Private (Super Admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    membershipStatus,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};

  // Filter by role
  if (role && role !== 'all') {
    query.role = role;
  }

  // Filter by membership status
  if (membershipStatus && membershipStatus !== 'all') {
    query.membershipStatus = membershipStatus;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
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
  const users = await User.find(query)
    .select('-password')
    .populate('assignedTrainer', 'fullName email role')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  // Get statistics
  const stats = {
    total: await User.countDocuments(),
    active: await User.countDocuments({ membershipStatus: 'active' }),
    expired: await User.countDocuments({ membershipStatus: 'expired' }),
    pending: await User.countDocuments({ membershipStatus: 'pending' }),
    members: await User.countDocuments({ role: 'member' }),
    trainers: await User.countDocuments({ role: 'trainer' }),
    staff: await User.countDocuments({ role: 'staff' }),
  };

  ApiResponse.success(
    res,
    {
      users: users.map(user => user.getPublicProfile()),
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
    'Users retrieved successfully'
  );
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/superadmin/users/:id
 * @access  Private (Super Admin only)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('assignedTrainer', 'fullName email role phone');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Calculate additional info
  const daysRemaining = user.getMembershipDaysRemaining();
  const recentAttendance = user.attendance.slice(-10).reverse(); // Last 10 records

  ApiResponse.success(
    res,
    {
      user: user.getPublicProfile(),
      membershipDaysRemaining: daysRemaining,
      recentAttendance,
      totalAttendance: user.attendance.length,
    },
    'User retrieved successfully'
  );
});

/**
 * @desc    Create new user
 * @route   POST /api/superadmin/users
 * @access  Private (Super Admin only)
 */
const createUser = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    gender,
    age,
    membershipPlan,
    membershipStatus,
    membershipStartDate,
    membershipEndDate,
    assignedTrainer,
    role,
    address,
    emergencyContact,
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !password || !phone || !gender || !age) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('User with this email already exists');
  }

  // Validate trainer if assigned
  if (assignedTrainer) {
    const trainer = await User.findById(assignedTrainer);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID');
    }
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    password, // Will be hashed by pre-save hook
    phone,
    gender,
    age,
    membershipPlan: membershipPlan || 'none',
    membershipStatus: membershipStatus || 'pending',
    membershipStartDate: membershipStartDate || null,
    membershipEndDate: membershipEndDate || null,
    assignedTrainer: assignedTrainer || null,
    role: role || 'member',
    address: address || null,
    emergencyContact: emergencyContact || {},
  });

  ApiResponse.created(
    res,
    { user: user.getPublicProfile() },
    'User created successfully'
  );
});

/**
 * @desc    Update user
 * @route   PUT /api/superadmin/users/:id
 * @access  Private (Super Admin only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const {
    fullName,
    email,
    phone,
    gender,
    age,
    membershipPlan,
    membershipStatus,
    membershipStartDate,
    membershipEndDate,
    assignedTrainer,
    role,
    address,
    emergencyContact,
    isActive,
  } = req.body;

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('Email already in use');
    }
  }

  // Validate trainer if being assigned
  if (assignedTrainer && assignedTrainer !== user.assignedTrainer?.toString()) {
    const trainer = await User.findById(assignedTrainer);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID');
    }
  }

  // Update fields
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (gender) user.gender = gender;
  if (age) user.age = age;
  if (membershipPlan) user.membershipPlan = membershipPlan;
  if (membershipStatus) user.membershipStatus = membershipStatus;
  if (membershipStartDate !== undefined) user.membershipStartDate = membershipStartDate;
  if (membershipEndDate !== undefined) user.membershipEndDate = membershipEndDate;
  if (assignedTrainer !== undefined) user.assignedTrainer = assignedTrainer;
  if (role) user.role = role;
  if (address !== undefined) user.address = address;
  if (emergencyContact) user.emergencyContact = emergencyContact;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  // Populate trainer info
  await user.populate('assignedTrainer', 'fullName email role');

  ApiResponse.success(
    res,
    { user: user.getPublicProfile() },
    'User updated successfully'
  );
});

/**
 * @desc    Delete user
 * @route   DELETE /api/superadmin/users/:id
 * @access  Private (Super Admin only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  await user.deleteOne();

  ApiResponse.success(res, null, 'User deleted successfully');
});

/**
 * @desc    Update membership status
 * @route   PATCH /api/superadmin/users/:id/membership-status
 * @access  Private (Super Admin only)
 */
const updateMembershipStatus = asyncHandler(async (req, res) => {
  const { membershipStatus, membershipStartDate, membershipEndDate } = req.body;

  if (!membershipStatus) {
    throw ApiError.badRequest('Membership status is required');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.membershipStatus = membershipStatus;
  
  if (membershipStartDate) {
    user.membershipStartDate = membershipStartDate;
  }
  
  if (membershipEndDate) {
    user.membershipEndDate = membershipEndDate;
  }

  await user.save();

  ApiResponse.success(
    res,
    { user: user.getPublicProfile() },
    'Membership status updated successfully'
  );
});

/**
 * @desc    Assign trainer to user
 * @route   PATCH /api/superadmin/users/:id/assign-trainer
 * @access  Private (Super Admin only)
 */
const assignTrainer = asyncHandler(async (req, res) => {
  const { trainerId } = req.body;

  if (!trainerId) {
    throw ApiError.badRequest('Trainer ID is required');
  }

  // Validate trainer
  const trainer = await User.findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') {
    throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
  }

  // Find and update user
  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.assignedTrainer = trainerId;
  await user.save();

  // Populate trainer info
  await user.populate('assignedTrainer', 'fullName email role phone');

  ApiResponse.success(
    res,
    { user: user.getPublicProfile() },
    'Trainer assigned successfully'
  );
});

/**
 * @desc    Add attendance record
 * @route   POST /api/superadmin/users/:id/attendance
 * @access  Private (Super Admin only)
 */
const addAttendance = asyncHandler(async (req, res) => {
  const { checkIn, checkOut } = req.body;

  if (!checkIn) {
    throw ApiError.badRequest('Check-in time is required');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  await user.addAttendance(new Date(checkIn), checkOut ? new Date(checkOut) : null);

  ApiResponse.success(
    res,
    {
      user: user.getPublicProfile(),
      totalAttendance: user.attendance.length,
    },
    'Attendance added successfully'
  );
});

/**
 * @desc    Get user attendance history
 * @route   GET /api/superadmin/users/:id/attendance
 * @access  Private (Super Admin only)
 */
const getUserAttendance = asyncHandler(async (req, res) => {
  const { limit = 30 } = req.query;

  const user = await User.findById(req.params.id).select('fullName email attendance');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Get recent attendance records
  const recentAttendance = user.attendance
    .slice(-parseInt(limit))
    .reverse()
    .map(record => ({
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      duration: record.checkOut
        ? Math.round((new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60))
        : null, // Duration in minutes
    }));

  ApiResponse.success(
    res,
    {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      attendance: recentAttendance,
      totalRecords: user.attendance.length,
    },
    'Attendance history retrieved successfully'
  );
});

/**
 * @desc    Get user statistics
 * @route   GET /api/superadmin/users/stats
 * @access  Private (Super Admin only)
 */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = {
    total: await User.countDocuments(),
    byStatus: {
      active: await User.countDocuments({ membershipStatus: 'active' }),
      expired: await User.countDocuments({ membershipStatus: 'expired' }),
      pending: await User.countDocuments({ membershipStatus: 'pending' }),
    },
    byRole: {
      members: await User.countDocuments({ role: 'member' }),
      trainers: await User.countDocuments({ role: 'trainer' }),
      staff: await User.countDocuments({ role: 'staff' }),
    },
    byPlan: {
      monthly: await User.countDocuments({ membershipPlan: 'monthly' }),
      quarterly: await User.countDocuments({ membershipPlan: 'quarterly' }),
      halfYearly: await User.countDocuments({ membershipPlan: 'half-yearly' }),
      yearly: await User.countDocuments({ membershipPlan: 'yearly' }),
      none: await User.countDocuments({ membershipPlan: 'none' }),
    },
    recentUsers: await User.find()
      .select('fullName email role membershipStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(5),
  };

  ApiResponse.success(res, stats, 'User statistics retrieved successfully');
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateMembershipStatus,
  assignTrainer,
  addAttendance,
  getUserAttendance,
  getUserStats,
};
