const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all members with pagination, filtering, and search
 * @route   GET /api/admin/members
 * @access  Private (Admin)
 */
const getAllMembers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    plan = '',
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  // Build query
  const query = { role: 'member' };

  // Search by name, email, or phone
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by status (active/inactive/suspended/expired)
  if (status) {
    query.membershipStatus = status;
  }

  // Filter by plan (basic/premium/elite)
  if (plan) {
    query.membershipPlan = plan;
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const members = await User.find(query)
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalMembers = await User.countDocuments(query);

  // Get member count summary
  const totalCount = await User.countDocuments({ role: 'member' });
  const activeCount = await User.countDocuments({
    role: 'member',
    membershipStatus: 'active',
  });
  const inactiveCount = await User.countDocuments({
    role: 'member',
    membershipStatus: 'inactive',
  });
  const suspendedCount = await User.countDocuments({
    role: 'member',
    membershipStatus: 'suspended',
  });
  const expiredCount = await User.countDocuments({
    role: 'member',
    membershipStatus: 'expired',
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalMembers / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      members,
      pagination: {
        currentPage: pageNum,
        totalPages,
        total: totalMembers,
        limit: limitNum,
        hasMore,
      },
      summary: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        suspended: suspendedCount,
        expired: expiredCount,
      },
    },
    'Members retrieved successfully'
  );
});

/**
 * @desc    Get member by ID
 * @route   GET /api/admin/members/:id
 * @access  Private (Admin)
 */
const getMemberById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const member = await User.findById(id)
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone role')
    .lean();

  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Calculate additional info
  const membershipDaysRemaining = member.membershipEndDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(member.membershipEndDate) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  ApiResponse.success(
    res,
    {
      member: {
        ...member,
        membershipDaysRemaining,
        attendanceCount: member.attendance?.length || 0,
      },
    },
    'Member retrieved successfully'
  );
});

/**
 * @desc    Create new member
 * @route   POST /api/admin/members
 * @access  Private (Admin)
 */
const createMember = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    plan,
    status,
    password,
    gender,
    age,
    height,
    weight,
    fitnessGoal,
    membershipStartDate,
    membershipEndDate,
    assignedTrainer,
    address,
    emergencyContact,
    profileImage,
  } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !plan || !status) {
    throw ApiError.badRequest(
      'Please provide all required fields: name, email, phone, plan, status'
    );
  }

  // Validate email format
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    throw ApiError.badRequest('Please provide a valid email address');
  }

  // Validate phone format (10 digits)
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    throw ApiError.badRequest('Please provide a valid 10-digit phone number');
  }

  // Check for duplicate email
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw ApiError.conflict('User with this email already exists');
  }

  // Check for duplicate phone
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw ApiError.conflict('User with this phone number already exists');
  }

  // If assigned trainer is provided, verify it exists
  if (assignedTrainer) {
    const trainer = await User.findById(assignedTrainer);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest(
        'Invalid trainer ID or user is not a trainer'
      );
    }
  }

  // Generate a default password if not provided
  const memberPassword = password || 'DefaultPass@123';

  // Create member
  const member = await User.create({
    fullName: name,
    email,
    password: memberPassword,
    phone,
    gender: gender || 'other',
    age: age || 0,
    height,
    weight,
    fitnessGoal,
    membershipPlan: plan,
    membershipStatus: status,
    membershipStartDate,
    membershipEndDate,
    assignedTrainer,
    role: 'member',
    address,
    emergencyContact,
    profileImage,
    joinDate: new Date(),
  });

  // Get member without password
  const createdMember = await User.findById(member._id)
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone');

  ApiResponse.success(
    res,
    { member: createdMember },
    'Member created successfully',
    201
  );
});

/**
 * @desc    Update member
 * @route   PUT /api/admin/members/:id
 * @access  Private (Admin)
 */
const updateMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find member
  const member = await User.findById(id);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Don't allow updating password through this endpoint
  if (updateData.password) {
    throw ApiError.badRequest(
      'Use change password endpoint to update password'
    );
  }

  // Validate email format if provided
  if (updateData.email) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(updateData.email)) {
      throw ApiError.badRequest('Please provide a valid email address');
    }

    // Check for duplicate email (excluding current member)
    if (updateData.email !== member.email) {
      const existingEmail = await User.findOne({ email: updateData.email });
      if (existingEmail) {
        throw ApiError.conflict('Email is already in use');
      }
    }
  }

  // Validate phone format if provided
  if (updateData.phone) {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(updateData.phone)) {
      throw ApiError.badRequest(
        'Please provide a valid 10-digit phone number'
      );
    }

    // Check for duplicate phone (excluding current member)
    if (updateData.phone !== member.phone) {
      const existingPhone = await User.findOne({ phone: updateData.phone });
      if (existingPhone) {
        throw ApiError.conflict('Phone number is already in use');
      }
    }
  }

  // If assigned trainer is being updated, verify it exists
  if (updateData.assignedTrainer) {
    const trainer = await User.findById(updateData.assignedTrainer);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest(
        'Invalid trainer ID or user is not a trainer'
      );
    }
  }

  // Map 'name' to 'fullName' if provided
  if (updateData.name) {
    updateData.fullName = updateData.name;
    delete updateData.name;
  }

  // Map 'plan' to 'membershipPlan' if provided
  if (updateData.plan) {
    updateData.membershipPlan = updateData.plan;
    delete updateData.plan;
  }

  // Map 'status' to 'membershipStatus' if provided
  if (updateData.status) {
    updateData.membershipStatus = updateData.status;
    delete updateData.status;
  }

  // Update member
  const updatedMember = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('assignedTrainer', 'fullName email phone');

  ApiResponse.success(
    res,
    { member: updatedMember },
    'Member updated successfully'
  );
});

/**
 * @desc    Delete member
 * @route   DELETE /api/admin/members/:id
 * @access  Private (Admin)
 */
const deleteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find member
  const member = await User.findById(id);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Soft delete - set isActive to false
  member.isActive = false;
  await member.save();

  ApiResponse.success(
    res,
    { memberId: id },
    'Member deleted successfully'
  );
});

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
