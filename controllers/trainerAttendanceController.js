const Attendance = require('../models/Attendance');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Mark member attendance (check-in)
 * @route   POST /api/trainer/attendance
 * @access  Private (Trainer)
 */
const markAttendance = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { memberId, branchId, checkInTime, notes } = req.body;

  // Validate required fields
  if (!memberId || !branchId) {
    throw ApiError.badRequest('Please provide memberId and branchId');
  }

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

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Check if member already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingAttendance = await Attendance.findOne({
    memberId,
    attendanceDate: { $gte: today },
    checkOutTime: null,
  });

  if (existingAttendance) {
    throw ApiError.conflict('Member has already checked in today and not checked out yet');
  }

  // Create attendance record
  const attendance = await Attendance.create({
    memberId,
    trainerId,
    branchId,
    attendanceDate: new Date(),
    checkInTime: checkInTime || new Date(),
    checkOutTime: null,
    attendanceStatus: 'present',
    notes: notes || null,
    createdBy: trainerId,
    createdByModel: 'User',
  });

  // Populate member and branch details
  await attendance.populate([
    { path: 'memberId', select: 'fullName email phone' },
    { path: 'branchId', select: 'branchName branchCode' },
  ]);

  ApiResponse.created(
    res,
    { attendance: attendance.getPublicProfile() },
    'Attendance marked successfully'
  );
});

/**
 * @desc    Update attendance (check-out)
 * @route   PUT /api/trainer/attendance/:id/checkout
 * @access  Private (Trainer)
 */
const checkOut = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const attendanceId = req.params.id;
  const { checkOutTime } = req.body;

  // Find attendance
  const attendance = await Attendance.findOne({
    _id: attendanceId,
    trainerId,
  });

  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  if (attendance.checkOutTime) {
    throw ApiError.conflict('Member has already checked out');
  }

  // Update check-out time
  await attendance.checkOut(checkOutTime || new Date());

  // Populate details
  await attendance.populate([
    { path: 'memberId', select: 'fullName email phone' },
    { path: 'branchId', select: 'branchName branchCode' },
  ]);

  ApiResponse.success(
    res,
    { attendance: attendance.getPublicProfile() },
    'Check-out recorded successfully'
  );
});

/**
 * @desc    Get attendance records
 * @route   GET /api/trainer/attendance
 * @access  Private (Trainer)
 */
const getAttendanceRecords = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Filters
  const filters = { trainerId };

  if (req.query.memberId) {
    filters.memberId = req.query.memberId;
  }

  if (req.query.branchId) {
    filters.branchId = req.query.branchId;
  }

  if (req.query.status) {
    filters.attendanceStatus = req.query.status;
  }

  // Date range filter
  if (req.query.startDate && req.query.endDate) {
    filters.attendanceDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  } else if (req.query.date) {
    // Single date filter
    const date = new Date(req.query.date);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    filters.attendanceDate = {
      $gte: date,
      $lt: nextDay,
    };
  }

  // Get attendance records
  const attendance = await Attendance.find(filters)
    .populate('memberId', 'fullName email phone profileImage')
    .populate('branchId', 'branchName branchCode')
    .sort({ attendanceDate: -1, checkInTime: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Attendance.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      attendance: attendance.map((a) => a.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit,
        hasMore: page < Math.ceil(totalRecords / limit),
      },
    },
    'Attendance records retrieved successfully'
  );
});

/**
 * @desc    Get attendance statistics
 * @route   GET /api/trainer/attendance/stats
 * @access  Private (Trainer)
 */
const getAttendanceStats = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Date range filter (default: last 30 days)
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const startDate = req.query.startDate
    ? new Date(req.query.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filters = {
    trainerId,
    attendanceDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  // Get all attendance records
  const attendance = await Attendance.find(filters);

  // Calculate statistics
  const stats = {
    totalRecords: attendance.length,
    byStatus: {
      present: attendance.filter((a) => a.attendanceStatus === 'present').length,
      absent: attendance.filter((a) => a.attendanceStatus === 'absent').length,
      late: attendance.filter((a) => a.attendanceStatus === 'late').length,
      leave: attendance.filter((a) => a.attendanceStatus === 'leave').length,
    },
    uniqueMembers: new Set(attendance.map((a) => a.memberId.toString())).size,
    totalDuration: 0,
    averageDuration: 0,
    peakHours: {},
  };

  // Calculate duration statistics
  const durationsWithCheckout = attendance.filter((a) => a.checkOutTime);
  if (durationsWithCheckout.length > 0) {
    stats.totalDuration = durationsWithCheckout.reduce((sum, a) => sum + a.duration, 0);
    stats.averageDuration = Math.round(stats.totalDuration / durationsWithCheckout.length);
  }

  // Calculate peak hours
  attendance.forEach((a) => {
    const hour = new Date(a.checkInTime).getHours();
    stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
  });

  // Find top 3 peak hours
  const peakHoursArray = Object.entries(stats.peakHours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
    }));

  stats.topPeakHours = peakHoursArray;

  ApiResponse.success(
    res,
    { stats, dateRange: { startDate, endDate } },
    'Attendance statistics retrieved successfully'
  );
});

/**
 * @desc    Get monthly attendance analytics
 * @route   GET /api/trainer/attendance/analytics/monthly
 * @access  Private (Trainer)
 */
const getMonthlyAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get month and year from query (default: current month)
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  // Calculate date range
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const filters = {
    trainerId,
    attendanceDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  // Get attendance records
  const attendance = await Attendance.find(filters).populate(
    'memberId',
    'fullName email'
  );

  // Group by date
  const dailyStats = {};
  attendance.forEach((a) => {
    const date = a.attendanceDate.toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = {
        date,
        count: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };
    }
    dailyStats[date].count++;
    dailyStats[date][a.attendanceStatus]++;
  });

  // Convert to array and sort by date
  const dailyStatsArray = Object.values(dailyStats).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Calculate member-wise statistics
  const memberStats = {};
  attendance.forEach((a) => {
    const memberId = a.memberId._id.toString();
    if (!memberStats[memberId]) {
      memberStats[memberId] = {
        memberId: a.memberId._id,
        memberName: a.memberId.fullName,
        totalVisits: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };
    }
    memberStats[memberId].totalVisits++;
    memberStats[memberId][a.attendanceStatus]++;
  });

  const memberStatsArray = Object.values(memberStats).sort(
    (a, b) => b.totalVisits - a.totalVisits
  );

  const analytics = {
    month,
    year,
    dateRange: { startDate, endDate },
    summary: {
      totalRecords: attendance.length,
      uniqueMembers: Object.keys(memberStats).length,
      averageVisitsPerDay: (attendance.length / dailyStatsArray.length).toFixed(1),
    },
    dailyStats: dailyStatsArray,
    memberStats: memberStatsArray,
  };

  ApiResponse.success(
    res,
    analytics,
    'Monthly attendance analytics retrieved successfully'
  );
});

/**
 * @desc    Get attendance report
 * @route   GET /api/trainer/attendance/report
 * @access  Private (Trainer)
 */
const getAttendanceReport = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Date range filter
  const startDate = req.query.startDate
    ? new Date(req.query.startDate)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

  const filters = {
    trainerId,
    attendanceDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  // Get attendance records
  const attendance = await Attendance.find(filters)
    .populate('memberId', 'fullName email phone')
    .populate('branchId', 'branchName branchCode')
    .sort({ attendanceDate: -1 });

  // Generate report
  const report = {
    dateRange: { startDate, endDate },
    totalRecords: attendance.length,
    summary: {
      present: attendance.filter((a) => a.attendanceStatus === 'present').length,
      absent: attendance.filter((a) => a.attendanceStatus === 'absent').length,
      late: attendance.filter((a) => a.attendanceStatus === 'late').length,
      leave: attendance.filter((a) => a.attendanceStatus === 'leave').length,
    },
    records: attendance.map((a) => ({
      id: a._id,
      member: {
        id: a.memberId._id,
        name: a.memberId.fullName,
        email: a.memberId.email,
        phone: a.memberId.phone,
      },
      branch: {
        id: a.branchId._id,
        name: a.branchId.branchName,
        code: a.branchId.branchCode,
      },
      date: a.attendanceDate,
      checkIn: a.checkInTime,
      checkOut: a.checkOutTime,
      duration: a.duration,
      status: a.attendanceStatus,
      notes: a.notes,
    })),
  };

  ApiResponse.success(
    res,
    report,
    'Attendance report generated successfully'
  );
});

/**
 * @desc    Get member attendance history
 * @route   GET /api/trainer/attendance/member/:memberId
 * @access  Private (Trainer)
 */
const getMemberAttendanceHistory = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.memberId;

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
    .sort({ attendanceDate: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Attendance.countDocuments(filters);

  // Calculate statistics
  const allAttendance = await Attendance.find({ memberId });
  const stats = {
    totalVisits: allAttendance.length,
    present: allAttendance.filter((a) => a.attendanceStatus === 'present').length,
    absent: allAttendance.filter((a) => a.attendanceStatus === 'absent').length,
    late: allAttendance.filter((a) => a.attendanceStatus === 'late').length,
    leave: allAttendance.filter((a) => a.attendanceStatus === 'leave').length,
  };

  ApiResponse.success(
    res,
    {
      attendance: attendance.map((a) => a.getPublicProfile()),
      stats,
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

module.exports = {
  markAttendance,
  checkOut,
  getAttendanceRecords,
  getAttendanceStats,
  getMonthlyAnalytics,
  getAttendanceReport,
  getMemberAttendanceHistory,
};
