const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all users with pagination, filtering, and search
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    membershipStatus = '',
    membershipPlan = '',
    gender = '',
    isActive = '',
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  // Build query
  const query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Filter by membership status
  if (membershipStatus) {
    query.membershipStatus = membershipStatus;
  }

  // Filter by membership plan
  if (membershipPlan) {
    query.membershipPlan = membershipPlan;
  }

  // Filter by gender
  if (gender) {
    query.gender = gender;
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
  const users = await User.find(query)
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalUsers = await User.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalUsers / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      users,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        limit: limitNum,
        hasMore,
      },
    },
    'Users retrieved successfully'
  );
});

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone role')
    .lean();

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Calculate additional info
  const membershipDaysRemaining = user.membershipEndDate
    ? Math.max(0, Math.ceil((new Date(user.membershipEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  ApiResponse.success(
    res,
    {
      user: {
        ...user,
        membershipDaysRemaining,
        attendanceCount: user.attendance?.length || 0,
      },
    },
    'User retrieved successfully'
  );
});

/**
 * @desc    Create new user
 * @route   POST /api/admin/users
 * @access  Private (Admin)
 */
const createUser = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    gender,
    age,
    height,
    weight,
    fitnessGoal,
    membershipPlan,
    membershipStatus,
    membershipStartDate,
    membershipEndDate,
    assignedTrainer,
    role,
    address,
    emergencyContact,
    profileImage,
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !password || !phone || !gender || !age) {
    throw ApiError.badRequest('Please provide all required fields: fullName, email, password, phone, gender, age');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('User with this email already exists');
  }

  // Check if phone already exists
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw ApiError.conflict('User with this phone number already exists');
  }

  // Validate password strength
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  // If assigned trainer is provided, verify it exists
  if (assignedTrainer) {
    const trainer = await User.findById(assignedTrainer);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
    }
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    password,
    phone,
    gender,
    age,
    height,
    weight,
    fitnessGoal,
    membershipPlan: membershipPlan || 'none',
    membershipStatus: membershipStatus || 'pending',
    membershipStartDate,
    membershipEndDate,
    assignedTrainer,
    role: role || 'member',
    address,
    emergencyContact,
    profileImage,
    joinDate: new Date(),
  });

  // Get user without password
  const createdUser = await User.findById(user._id)
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone');

  ApiResponse.success(
    res,
    { user: createdUser },
    'User created successfully',
    201
  );
});

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find user
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Don't allow updating password through this endpoint
  if (updateData.password) {
    throw ApiError.badRequest('Use change password endpoint to update password');
  }

  // Don't allow updating email if it's already taken by another user
  if (updateData.email && updateData.email !== user.email) {
    const existingUser = await User.findOne({ email: updateData.email });
    if (existingUser) {
      throw ApiError.conflict('Email is already in use');
    }
  }

  // Don't allow updating phone if it's already taken by another user
  if (updateData.phone && updateData.phone !== user.phone) {
    const existingPhone = await User.findOne({ phone: updateData.phone });
    if (existingPhone) {
      throw ApiError.conflict('Phone number is already in use');
    }
  }

  // If assigned trainer is being updated, verify it exists
  if (updateData.assignedTrainer) {
    const trainer = await User.findById(updateData.assignedTrainer);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone');

  ApiResponse.success(
    res,
    { user: updatedUser },
    'User updated successfully'
  );
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find user
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Soft delete - set isActive to false
  user.isActive = false;
  await user.save();

  // Or hard delete - uncomment below and comment above
  // await User.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { userId: id },
    'User deleted successfully'
  );
});

/**
 * @desc    Get user statistics
 * @route   GET /api/admin/users/stats
 * @access  Private (Admin)
 */
const getUserStats = asyncHandler(async (req, res) => {
  // Total users
  const totalUsers = await User.countDocuments();

  // Active users
  const activeUsers = await User.countDocuments({ isActive: true });

  // Users by role
  const memberCount = await User.countDocuments({ role: 'member' });
  const trainerCount = await User.countDocuments({ role: 'trainer' });
  const staffCount = await User.countDocuments({ role: 'staff' });

  // Users by membership status
  const activeMemberships = await User.countDocuments({ membershipStatus: 'active' });
  const expiredMemberships = await User.countDocuments({ membershipStatus: 'expired' });
  const pendingMemberships = await User.countDocuments({ membershipStatus: 'pending' });

  // Users by membership plan
  const monthlyPlan = await User.countDocuments({ membershipPlan: 'monthly' });
  const quarterlyPlan = await User.countDocuments({ membershipPlan: 'quarterly' });
  const halfYearlyPlan = await User.countDocuments({ membershipPlan: 'half-yearly' });
  const yearlyPlan = await User.countDocuments({ membershipPlan: 'yearly' });
  const noPlan = await User.countDocuments({ membershipPlan: 'none' });

  // Users by gender
  const maleUsers = await User.countDocuments({ gender: 'male' });
  const femaleUsers = await User.countDocuments({ gender: 'female' });
  const otherGender = await User.countDocuments({ gender: 'other' });

  // New users this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newUsersThisMonth = await User.countDocuments({
    createdAt: { $gte: startOfMonth },
  });

  // Users with trainers
  const usersWithTrainers = await User.countDocuments({
    assignedTrainer: { $ne: null },
  });

  // Average age
  const ageAggregation = await User.aggregate([
    { $group: { _id: null, avgAge: { $avg: '$age' } } },
  ]);
  const averageAge = ageAggregation.length > 0 ? Math.round(ageAggregation[0].avgAge) : 0;

  // Users by fitness goal
  const fitnessGoals = await User.aggregate([
    { $group: { _id: '$fitnessGoal', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Recent users (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentUsers = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  ApiResponse.success(
    res,
    {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newUsersThisMonth,
        recentUsers,
        averageAge,
      },
      byRole: {
        members: memberCount,
        trainers: trainerCount,
        staff: staffCount,
      },
      byMembershipStatus: {
        active: activeMemberships,
        expired: expiredMemberships,
        pending: pendingMemberships,
      },
      byMembershipPlan: {
        monthly: monthlyPlan,
        quarterly: quarterlyPlan,
        halfYearly: halfYearlyPlan,
        yearly: yearlyPlan,
        none: noPlan,
      },
      byGender: {
        male: maleUsers,
        female: femaleUsers,
        other: otherGender,
      },
      fitnessGoals: fitnessGoals.map((goal) => ({
        goal: goal._id || 'none',
        count: goal.count,
      })),
      trainers: {
        usersWithTrainers,
        usersWithoutTrainers: memberCount - usersWithTrainers,
      },
    },
    'User statistics retrieved successfully'
  );
});

/**
 * @desc    Bulk update users
 * @route   PUT /api/admin/users/bulk-update
 * @access  Private (Admin)
 */
const bulkUpdateUsers = asyncHandler(async (req, res) => {
  const { userIds, updateData } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest('Please provide an array of user IDs');
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw ApiError.badRequest('Please provide update data');
  }

  // Don't allow updating password or email through bulk update
  if (updateData.password || updateData.email) {
    throw ApiError.badRequest('Cannot update password or email through bulk update');
  }

  // Update users
  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: updateData },
    { runValidators: true }
  );

  ApiResponse.success(
    res,
    {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    },
    `${result.modifiedCount} users updated successfully`
  );
});

/**
 * @desc    Export users data
 * @route   GET /api/admin/users/export
 * @access  Private (Admin)
 */
const exportUsers = asyncHandler(async (req, res) => {
  const { format = 'json', role = '', membershipStatus = '' } = req.query;

  // Build query
  const query = {};
  if (role) query.role = role;
  if (membershipStatus) query.membershipStatus = membershipStatus;

  // Get users
  const users = await User.find(query)
    .select('-password -attendance')
    .populate('assignedTrainer', 'fullName email')
    .lean();

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeader = 'ID,Name,Email,Phone,Gender,Age,Role,Membership Plan,Membership Status,Join Date\n';
    const csvRows = users.map((user) =>
      `${user._id},${user.fullName},${user.email},${user.phone},${user.gender},${user.age},${user.role},${user.membershipPlan},${user.membershipStatus},${user.joinDate}`
    ).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    return res.send(csv);
  }

  // Default JSON format
  ApiResponse.success(
    res,
    { users, count: users.length },
    'Users exported successfully'
  );
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  bulkUpdateUsers,
  exportUsers,
};
