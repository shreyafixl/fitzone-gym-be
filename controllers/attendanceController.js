const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

/**
 * @desc    Get all attendance records
 * @route   GET /api/attendance
 * @access  Private (Super Admin, Trainers)
 */
const getAllAttendance = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    memberId,
    trainerId,
    branchId,
    status,
    startDate,
    endDate,
    sortBy = 'attendanceDate',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};
  if (memberId) query.memberId = memberId;
  if (trainerId) query.trainerId = trainerId;
  if (branchId) query.branchId = branchId;
  if (status && status !== 'all') query.attendanceStatus = status;

  // Date range filter
  if (startDate || endDate) {
    query.attendanceDate = {};
    if (startDate) query.attendanceDate.$gte = new Date(startDate);
    if (endDate) query.attendanceDate.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const attendance = await Attendance.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .populate('branchId', 'branchName branchCode city')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Attendance.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  // Get statistics
  const stats = await Attendance.getStats(query);

  ApiResponse.success(
    res,
    {
      attendance: attendance.map((a) => a.getPublicProfile()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        perPage: limitNum,
      },
      stats,
    },
    'Attendance records retrieved successfully'
  );
});

/**
 * @desc    Get single attendance record
 * @route   GET /api/attendance/:id
 * @access  Private (Super Admin, Trainers)
 */
const getAttendanceById = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id)
    .populate('memberId', 'fullName email phone membershipStatus membershipPlan')
    .populate('trainerId', 'fullName email')
    .populate('branchId', 'branchName branchCode city address');

  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  ApiResponse.success(
    res,
    { attendance: attendance.getPublicProfile() },
    'Attendance record retrieved successfully'
  );
});

/**
 * @desc    Get member attendance history
 * @route   GET /api/attendance/member/:memberId
 * @access  Private (Super Admin, Trainers, Member)
 */
const getMemberAttendanceHistory = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { limit = 30, startDate, endDate } = req.query;

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  let query = { memberId };

  // Date range filter
  if (startDate || endDate) {
    query.attendanceDate = {};
    if (startDate) query.attendanceDate.$gte = new Date(startDate);
    if (endDate) query.attendanceDate.$lte = new Date(endDate);
  }

  const attendance = await Attendance.find(query)
    .populate('branchId', 'branchName branchCode')
    .populate('trainerId', 'fullName')
    .sort({ attendanceDate: -1 })
    .limit(parseInt(limit));

  const stats = await Attendance.getStats({ memberId });

  ApiResponse.success(
    res,
    {
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        membershipStatus: member.membershipStatus,
      },
      attendance: attendance.map((a) => a.getPublicProfile()),
      stats,
      totalRecords: attendance.length,
    },
    'Member attendance history retrieved successfully'
  );
});

/**
 * @desc    Get branch attendance
 * @route   GET /api/attendance/branch/:branchId
 * @access  Private (Super Admin, Trainers)
 */
const getBranchAttendance = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { date, status } = req.query;

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  const query = { branchId };
  if (date) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.attendanceDate = { $gte: targetDate, $lt: nextDay };
  }
  if (status && status !== 'all') {
    query.attendanceStatus = status;
  }

  const attendance = await Attendance.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName')
    .sort({ checkInTime: -1 });

  const stats = await Attendance.getStats({ branchId });

  ApiResponse.success(
    res,
    {
      branch: {
        id: branch._id,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
      },
      attendance: attendance.map((a) => a.getPublicProfile()),
      stats,
      totalRecords: attendance.length,
    },
    'Branch attendance retrieved successfully'
  );
});

/**
 * @desc    Create attendance record (Check-in)
 * @route   POST /api/attendance
 * @access  Private (Super Admin, Trainers, Members)
 */
const createAttendance = asyncHandler(async (req, res) => {
  const {
    memberId,
    trainerId,
    branchId,
    attendanceDate,
    checkInTime,
    attendanceStatus,
    notes,
  } = req.body;

  // Validate required fields
  if (!memberId || !branchId) {
    throw ApiError.badRequest('Member ID and Branch ID are required');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Verify trainer if provided
  if (trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID');
    }
  }

  // Check if member already checked in today at this branch
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await Attendance.findOne({
    memberId,
    branchId,
    attendanceDate: { $gte: today, $lt: tomorrow },
  });

  if (existingAttendance) {
    throw ApiError.conflict('Member already checked in today at this branch');
  }

  // Create attendance record
  const attendance = await Attendance.create({
    memberId,
    trainerId: trainerId || null,
    branchId,
    attendanceDate: attendanceDate || new Date(),
    checkInTime: checkInTime || new Date(),
    attendanceStatus: attendanceStatus || 'present',
    notes: notes || null,
    createdBy: req.user.id,
    createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'User',
  });

  await attendance.populate('memberId', 'fullName email');
  await attendance.populate('branchId', 'branchName branchCode');
  if (trainerId) {
    await attendance.populate('trainerId', 'fullName');
  }

  ApiResponse.created(
    res,
    { attendance: attendance.getPublicProfile() },
    'Attendance marked successfully'
  );
});

/**
 * @desc    Update attendance record (Check-out or modify)
 * @route   PUT /api/attendance/:id
 * @access  Private (Super Admin, Trainers)
 */
const updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);

  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  const {
    checkOutTime,
    attendanceStatus,
    notes,
    trainerId,
  } = req.body;

  // Update fields
  if (checkOutTime !== undefined) {
    attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
  }
  if (attendanceStatus) {
    attendance.attendanceStatus = attendanceStatus;
  }
  if (notes !== undefined) {
    attendance.notes = notes;
  }
  if (trainerId !== undefined) {
    if (trainerId) {
      const trainer = await User.findById(trainerId);
      if (!trainer || trainer.role !== 'trainer') {
        throw ApiError.badRequest('Invalid trainer ID');
      }
    }
    attendance.trainerId = trainerId || null;
  }

  await attendance.save();
  await attendance.populate('memberId', 'fullName email');
  await attendance.populate('branchId', 'branchName branchCode');
  if (attendance.trainerId) {
    await attendance.populate('trainerId', 'fullName');
  }

  ApiResponse.success(
    res,
    { attendance: attendance.getPublicProfile() },
    'Attendance record updated successfully'
  );
});

/**
 * @desc    Check out member
 * @route   PATCH /api/attendance/:id/checkout
 * @access  Private (Super Admin, Trainers, Members)
 */
const checkOutMember = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);

  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  if (attendance.checkOutTime) {
    throw ApiError.badRequest('Member already checked out');
  }

  const { checkOutTime } = req.body;
  await attendance.checkOut(checkOutTime ? new Date(checkOutTime) : new Date());

  await attendance.populate('memberId', 'fullName email');
  await attendance.populate('branchId', 'branchName branchCode');

  ApiResponse.success(
    res,
    { attendance: attendance.getPublicProfile() },
    'Member checked out successfully'
  );
});

/**
 * @desc    Delete attendance record
 * @route   DELETE /api/attendance/:id
 * @access  Private (Super Admin only)
 */
const deleteAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);

  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  await attendance.deleteOne();

  ApiResponse.success(res, null, 'Attendance record deleted successfully');
});

/**
 * @desc    Get attendance statistics
 * @route   GET /api/attendance/stats/overview
 * @access  Private (Super Admin, Trainers)
 */
const getAttendanceStats = asyncHandler(async (req, res) => {
  const { branchId, startDate, endDate } = req.query;

  const query = {};
  if (branchId) query.branchId = branchId;
  if (startDate || endDate) {
    query.attendanceDate = {};
    if (startDate) query.attendanceDate.$gte = new Date(startDate);
    if (endDate) query.attendanceDate.$lte = new Date(endDate);
  }

  const stats = await Attendance.getStats(query);

  // Get daily attendance trend
  const dailyTrend = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]);

  // Get branch-wise attendance
  const branchWise = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$branchId',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'branches',
        localField: '_id',
        foreignField: '_id',
        as: 'branch',
      },
    },
    { $unwind: '$branch' },
    {
      $project: {
        branchName: '$branch.branchName',
        branchCode: '$branch.branchCode',
        count: 1,
      },
    },
  ]);

  // Average duration
  const avgDuration = await Attendance.aggregate([
    { $match: { ...query, checkOutTime: { $ne: null } } },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
      },
    },
  ]);

  ApiResponse.success(
    res,
    {
      stats,
      dailyTrend,
      branchWise,
      averageDuration: avgDuration.length > 0 ? Math.round(avgDuration[0].avgDuration) : 0,
    },
    'Attendance statistics retrieved successfully'
  );
});

/**
 * @desc    Get today's attendance
 * @route   GET /api/attendance/today
 * @access  Private (Super Admin, Trainers)
 */
const getTodayAttendance = asyncHandler(async (req, res) => {
  const { branchId } = req.query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const query = {
    attendanceDate: { $gte: today, $lt: tomorrow },
  };

  if (branchId) query.branchId = branchId;

  const attendance = await Attendance.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName')
    .populate('branchId', 'branchName branchCode')
    .sort({ checkInTime: -1 });

  const stats = await Attendance.getStats(query);

  ApiResponse.success(
    res,
    {
      date: today,
      attendance: attendance.map((a) => a.getPublicProfile()),
      stats,
      totalRecords: attendance.length,
    },
    "Today's attendance retrieved successfully"
  );
});

module.exports = {
  getAllAttendance,
  getAttendanceById,
  getMemberAttendanceHistory,
  getBranchAttendance,
  createAttendance,
  updateAttendance,
  checkOutMember,
  deleteAttendance,
  getAttendanceStats,
  getTodayAttendance,
};
