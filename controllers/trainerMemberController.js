const User = require('../models/User');
const Trainer = require('../models/Trainer');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const WorkoutPlan = require('../models/WorkoutPlan');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all assigned members for logged-in trainer
 * @route   GET /api/trainer/members
 * @access  Private (Trainer)
 */
const getAssignedMembers = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Sorting
  const sortBy = req.query.sortBy || 'fullName';
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  // Search
  const search = req.query.search || '';

  // Filters
  const filters = {};
  if (req.query.membershipStatus) {
    filters.membershipStatus = req.query.membershipStatus;
  }
  if (req.query.fitnessGoal) {
    filters.fitnessGoal = req.query.fitnessGoal;
  }
  if (req.query.gender) {
    filters.gender = req.query.gender;
  }
  if (req.query.isActive !== undefined) {
    filters.isActive = req.query.isActive === 'true';
  }

  // Get trainer to access assigned members
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get active assigned member IDs
  const assignedMemberIds = trainer.assignedMembers
    .filter((m) => m.status === 'active')
    .map((m) => m.memberId);

  // Build query
  const query = {
    _id: { $in: assignedMemberIds },
    ...filters,
  };

  // Add search functionality
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Get members with pagination
  const members = await User.find(query)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Get total count
  const totalMembers = await User.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalMembers / limit);
  const hasMore = page < totalPages;

  ApiResponse.success(
    res,
    {
      members,
      pagination: {
        currentPage: page,
        totalPages,
        totalMembers,
        limit,
        hasMore,
      },
    },
    'Assigned members retrieved successfully'
  );
});

/**
 * @desc    Get member details by ID
 * @route   GET /api/trainer/members/:id
 * @access  Private (Trainer)
 */
const getMemberById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.id;

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Get member details
  const member = await User.findById(memberId).select('-password');

  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  ApiResponse.success(
    res,
    { member },
    'Member details retrieved successfully'
  );
});

/**
 * @desc    Get member fitness goals
 * @route   GET /api/trainer/members/:id/fitness-goals
 * @access  Private (Trainer)
 */
const getMemberFitnessGoals = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.id;

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Get member with fitness goals
  const member = await User.findById(memberId).select(
    'fullName email fitnessGoal height weight age gender'
  );

  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Calculate BMI if height and weight are available
  let bmi = null;
  let bmiCategory = null;

  if (member.height && member.weight) {
    const heightInMeters = member.height / 100;
    bmi = (member.weight / (heightInMeters * heightInMeters)).toFixed(2);

    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Normal';
    else if (bmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';
  }

  const fitnessData = {
    member: {
      id: member._id,
      fullName: member.fullName,
      email: member.email,
      age: member.age,
      gender: member.gender,
    },
    fitnessGoal: member.fitnessGoal,
    physicalStats: {
      height: member.height,
      weight: member.weight,
      bmi,
      bmiCategory,
    },
  };

  ApiResponse.success(
    res,
    fitnessData,
    'Member fitness goals retrieved successfully'
  );
});

/**
 * @desc    Get member membership details
 * @route   GET /api/trainer/members/:id/membership
 * @access  Private (Trainer)
 */
const getMemberMembership = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.id;

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Get active membership
  const membership = await Membership.findOne({
    memberId,
    membershipStatus: { $in: ['active', 'paused'] },
  })
    .populate('assignedBranch', 'branchName branchCode address phone')
    .sort({ createdAt: -1 });

  if (!membership) {
    throw ApiError.notFound('No active membership found for this member');
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Member membership details retrieved successfully'
  );
});

/**
 * @desc    Get member attendance history
 * @route   GET /api/trainer/members/:id/attendance
 * @access  Private (Trainer)
 */
const getMemberAttendance = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.id;

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  // Date range filter
  const filters = { memberId };

  if (req.query.startDate && req.query.endDate) {
    filters.attendanceDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  // Get attendance records
  const attendance = await Attendance.find(filters)
    .populate('branchId', 'branchName branchCode')
    .sort({ attendanceDate: -1, checkInTime: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Attendance.countDocuments(filters);

  // Calculate statistics
  const stats = await Attendance.aggregate([
    { $match: { memberId: memberId } },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' },
      },
    },
  ]);

  const statistics = stats.length > 0 ? stats[0] : {
    totalVisits: 0,
    totalDuration: 0,
    avgDuration: 0,
  };

  ApiResponse.success(
    res,
    {
      attendance,
      statistics: {
        totalVisits: statistics.totalVisits,
        totalDuration: Math.round(statistics.totalDuration),
        avgDuration: Math.round(statistics.avgDuration),
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit,
      },
    },
    'Member attendance history retrieved successfully'
  );
});

/**
 * @desc    Get member progress
 * @route   GET /api/trainer/members/:id/progress
 * @access  Private (Trainer)
 */
const getMemberProgress = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.id;

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Get member details
  const member = await User.findById(memberId).select(
    'fullName email fitnessGoal height weight joinDate'
  );

  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Get workout plans progress
  const workoutPlans = await WorkoutPlan.find({ memberId, trainerId })
    .select('workoutTitle status progress startDate endDate')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get attendance statistics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAttendance = await Attendance.countDocuments({
    memberId,
    attendanceDate: { $gte: thirtyDaysAgo },
  });

  // Get total attendance
  const totalAttendance = await Attendance.countDocuments({ memberId });

  // Calculate days since joining
  const daysSinceJoining = Math.floor(
    (Date.now() - new Date(member.joinDate)) / (1000 * 60 * 60 * 24)
  );

  const progress = {
    member: {
      id: member._id,
      fullName: member.fullName,
      email: member.email,
      fitnessGoal: member.fitnessGoal,
      joinDate: member.joinDate,
      daysSinceJoining,
    },
    physicalStats: {
      height: member.height,
      weight: member.weight,
    },
    attendance: {
      last30Days: recentAttendance,
      total: totalAttendance,
      averagePerWeek: ((recentAttendance / 30) * 7).toFixed(1),
    },
    workoutPlans: {
      total: workoutPlans.length,
      active: workoutPlans.filter((w) => w.status === 'active').length,
      completed: workoutPlans.filter((w) => w.status === 'completed').length,
      recentPlans: workoutPlans,
    },
  };

  ApiResponse.success(
    res,
    progress,
    'Member progress retrieved successfully'
  );
});

/**
 * @desc    Get member assigned workouts
 * @route   GET /api/trainer/members/:id/workouts
 * @access  Private (Trainer)
 */
const getMemberWorkouts = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.id;

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Status filter
  const filters = { memberId, trainerId };
  if (req.query.status) {
    filters.status = req.query.status;
  }

  // Get workout plans
  const workouts = await WorkoutPlan.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalWorkouts = await WorkoutPlan.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      workouts: workouts.map((w) => w.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalWorkouts / limit),
        totalWorkouts,
        limit,
      },
    },
    'Member workouts retrieved successfully'
  );
});

/**
 * @desc    Search and filter assigned members
 * @route   GET /api/trainer/members/search
 * @access  Private (Trainer)
 */
const searchMembers = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get trainer to access assigned members
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get active assigned member IDs
  const assignedMemberIds = trainer.assignedMembers
    .filter((m) => m.status === 'active')
    .map((m) => m.memberId);

  // Build search query
  const query = { _id: { $in: assignedMemberIds } };

  // Search by name, email, or phone
  if (req.query.q) {
    query.$or = [
      { fullName: { $regex: req.query.q, $options: 'i' } },
      { email: { $regex: req.query.q, $options: 'i' } },
      { phone: { $regex: req.query.q, $options: 'i' } },
    ];
  }

  // Apply filters
  if (req.query.membershipStatus) {
    query.membershipStatus = req.query.membershipStatus;
  }
  if (req.query.fitnessGoal) {
    query.fitnessGoal = req.query.fitnessGoal;
  }
  if (req.query.gender) {
    query.gender = req.query.gender;
  }

  // Get members
  const members = await User.find(query)
    .select('fullName email phone gender age fitnessGoal membershipStatus membershipPlan profileImage')
    .limit(20);

  ApiResponse.success(
    res,
    { members, count: members.length },
    'Search results retrieved successfully'
  );
});

/**
 * @desc    Get assigned members statistics
 * @route   GET /api/trainer/members/stats
 * @access  Private (Trainer)
 */
const getMembersStats = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get trainer to access assigned members
  const trainer = await Trainer.findById(trainerId);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get active assigned member IDs
  const assignedMemberIds = trainer.assignedMembers
    .filter((m) => m.status === 'active')
    .map((m) => m.memberId);

  // Get all assigned members
  const members = await User.find({ _id: { $in: assignedMemberIds } });

  // Calculate statistics
  const stats = {
    totalMembers: members.length,
    byMembershipStatus: {
      active: members.filter((m) => m.membershipStatus === 'active').length,
      expired: members.filter((m) => m.membershipStatus === 'expired').length,
      pending: members.filter((m) => m.membershipStatus === 'pending').length,
    },
    byFitnessGoal: {},
    byGender: {
      male: members.filter((m) => m.gender === 'male').length,
      female: members.filter((m) => m.gender === 'female').length,
      other: members.filter((m) => m.gender === 'other').length,
    },
    byMembershipPlan: {},
  };

  // Count by fitness goal
  members.forEach((member) => {
    const goal = member.fitnessGoal || 'none';
    stats.byFitnessGoal[goal] = (stats.byFitnessGoal[goal] || 0) + 1;
  });

  // Count by membership plan
  members.forEach((member) => {
    const plan = member.membershipPlan || 'none';
    stats.byMembershipPlan[plan] = (stats.byMembershipPlan[plan] || 0) + 1;
  });

  ApiResponse.success(
    res,
    { stats },
    'Members statistics retrieved successfully'
  );
});

module.exports = {
  getAssignedMembers,
  getMemberById,
  getMemberFitnessGoals,
  getMemberMembership,
  getMemberAttendance,
  getMemberProgress,
  getMemberWorkouts,
  searchMembers,
  getMembersStats,
};
