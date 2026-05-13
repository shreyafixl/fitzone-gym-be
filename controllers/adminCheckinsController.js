const CheckIn = require('../models/CheckIn');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all check-ins with pagination, filtering, and statistics
 * @route   GET /api/admin/checkins
 * @access  Private (Admin)
 */
const getCheckins = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = '',
    memberId = '',
    dateFrom = '',
    sortBy = 'checkInTime',
    order = 'desc',
  } = req.query;

  // Build query
  const query = {};

  // Filter by status (active/checked-out/auto-checked-out)
  if (status) {
    query.status = status;
  }

  // Filter by memberId
  if (memberId) {
    query.memberId = memberId;
  }

  // Filter by dateFrom
  if (dateFrom) {
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    query.checkInTime = { $gte: startDate };
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const checkins = await CheckIn.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('branchId', 'branchName branchCode')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalCheckins = await CheckIn.countDocuments(query);

  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Active members count (members with active check-ins)
  const activeMembers = await CheckIn.countDocuments({
    status: 'active',
  });

  // Total check-ins today
  const totalCheckinsToday = await CheckIn.countDocuments({
    checkInTime: {
      $gte: today,
      $lt: tomorrowStart,
    },
  });

  // Average duration (for checked-out sessions)
  const avgDuration = await CheckIn.getAverageDuration({
    status: { $in: ['checked-out', 'auto-checked-out'] },
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalCheckins / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      checkins,
      pagination: {
        currentPage: pageNum,
        totalPages,
        total: totalCheckins,
        limit: limitNum,
        hasMore,
      },
      stats: {
        activeMembers,
        totalCheckinsToday,
        avgDuration,
      },
    },
    'Check-ins retrieved successfully'
  );
});

/**
 * @desc    Get check-in statistics
 * @route   GET /api/admin/checkins/stats
 * @access  Private (Admin)
 */
const getCheckinsStats = asyncHandler(async (req, res) => {
  // Active members count (members with active check-ins)
  const activeMembers = await CheckIn.countDocuments({
    status: 'active',
  });

  // Total check-ins today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const totalCheckinsToday = await CheckIn.countDocuments({
    checkInTime: {
      $gte: today,
      $lt: tomorrowStart,
    },
  });

  // Average duration (for checked-out sessions)
  const avgDuration = await CheckIn.getAverageDuration({
    status: { $in: ['checked-out', 'auto-checked-out'] },
  });

  ApiResponse.success(
    res,
    {
      activeMembers,
      totalCheckinsToday,
      avgDuration,
    },
    'Check-in statistics retrieved successfully'
  );
});

/**
 * @desc    Create a new check-in
 * @route   POST /api/admin/checkins
 * @access  Private (Admin)
 */
const createCheckin = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  // Validate memberId is provided
  if (!memberId) {
    throw ApiError.badRequest('Member ID is required');
  }

  // Verify member exists and is active
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  if (member.membershipStatus !== 'active') {
    throw ApiError.badRequest(
      `Cannot check in member with ${member.membershipStatus} membership status`
    );
  }

  // Check for existing active check-in (prevent duplicate)
  const existingActiveCheckin = await CheckIn.findOne({
    memberId,
    status: 'active',
  });

  if (existingActiveCheckin) {
    throw ApiError.conflict(
      'Member already has an active check-in. Please check out first.'
    );
  }

  // Create check-in record
  const checkin = await CheckIn.create({
    memberId,
    checkInTime: new Date(),
    status: 'active',
  });

  // Populate member details
  const populatedCheckin = await CheckIn.findById(checkin._id)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.created(
    res,
    { checkin: populatedCheckin },
    'Check-in recorded successfully'
  );
});

/**
 * @desc    Checkout a member
 * @route   POST /api/admin/checkins/:id/checkout
 * @access  Private (Admin)
 */
const checkoutMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate check-in exists
  const checkin = await CheckIn.findById(id);
  if (!checkin) {
    throw ApiError.notFound('Check-in record not found');
  }

  // Validate check-in is active
  if (checkin.status !== 'active') {
    throw ApiError.badRequest(
      `Cannot checkout a check-in with status: ${checkin.status}`
    );
  }

  // Update check-in with checkout time
  const checkoutTime = new Date();
  checkin.checkOutTime = checkoutTime;
  checkin.status = 'checked-out';

  // Calculate duration
  if (checkin.checkInTime) {
    const durationMs = checkoutTime - checkin.checkInTime;
    checkin.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  }

  await checkin.save();

  // Create attendance record
  const attendanceDate = new Date(checkin.checkInTime);
  attendanceDate.setHours(0, 0, 0, 0);

  const attendance = await Attendance.create({
    memberId: checkin.memberId,
    branchId: checkin.branchId,
    attendanceDate,
    checkInTime: checkin.checkInTime,
    checkOutTime: checkoutTime,
    attendanceStatus: 'present',
    duration: checkin.duration,
    isAutoCheckout: false,
    createdByModel: 'SuperAdmin',
  });

  // Populate check-in details
  const updatedCheckin = await CheckIn.findById(checkin._id)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(
    res,
    { checkin: updatedCheckin, attendance },
    'Check-out recorded successfully'
  );
});

module.exports = {
  getCheckins,
  getCheckinsStats,
  createCheckin,
  checkoutMember,
};
