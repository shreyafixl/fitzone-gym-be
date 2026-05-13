const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create attendance record (check-in)
 * @route   POST /api/admin/attendance
 * @access  Private (Admin)
 */
const createAttendance = asyncHandler(async (req, res) => {
  const {
    memberId,
    trainerId,
    branchId,
    attendanceDate,
    checkInTime,
    checkOutTime,
    attendanceStatus,
    notes
  } = req.body;

  // Validate required fields
  if (!memberId || !branchId || !checkInTime) {
    throw ApiError.badRequest('Please provide memberId, branchId, and checkInTime');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }
  if (member.role !== 'member') {
    throw ApiError.badRequest('User must be a member');
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
      throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
    }
  }

  // Check if attendance already exists for this member on this date
  const attendanceDateObj = attendanceDate ? new Date(attendanceDate) : new Date();
  const startOfDay = new Date(attendanceDateObj.setHours(0, 0, 0, 0));
  const endOfDay = new Date(attendanceDateObj.setHours(23, 59, 59, 999));

  const existingAttendance = await Attendance.findOne({
    memberId,
    branchId,
    attendanceDate: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });

  if (existingAttendance) {
    throw ApiError.conflict('Attendance record already exists for this member today');
  }

  // Create attendance record
  const attendance = await Attendance.create({
    memberId,
    trainerId: trainerId || null,
    branchId,
    attendanceDate: attendanceDateObj,
    checkInTime: new Date(checkInTime),
    checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
    attendanceStatus: attendanceStatus || 'present',
    notes,
    createdBy: req.user.id,
    createdByModel: 'Admin'
  });

  // Populate the created attendance
  const populatedAttendance = await Attendance.findById(attendance._id)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(
    res,
    { attendance: populatedAttendance },
    'Attendance record created successfully',
    201
  );
});

/**
 * @desc    Get all attendance records with filtering
 * @route   GET /api/admin/attendance
 * @access  Private (Admin)
 */
const getAllAttendance = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    memberId,
    trainerId,
    branchId,
    attendanceStatus,
    startDate,
    endDate,
    sortBy = 'attendanceDate',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (memberId) {
    query.memberId = memberId;
  }

  if (trainerId) {
    query.trainerId = trainerId;
  }

  if (branchId) {
    query.branchId = branchId;
  }

  if (attendanceStatus) {
    query.attendanceStatus = attendanceStatus;
  }

  // Date range filter
  if (startDate || endDate) {
    query.attendanceDate = {};
    if (startDate) {
      query.attendanceDate.$gte = new Date(startDate);
    }
    if (endDate) {
      query.attendanceDate.$lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const attendanceRecords = await Attendance.find(query)
    .populate('memberId', 'fullName email phone membershipStatus membershipPlan')
    .populate('trainerId', 'fullName email')
    .populate('branchId', 'branchName branchCode city')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalRecords = await Attendance.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalRecords / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      attendance: attendanceRecords,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords,
        limit: limitNum,
        hasMore
      }
    },
    'Attendance records retrieved successfully'
  );
});

/**
 * @desc    Update attendance record (check-out or edit)
 * @route   PUT /api/admin/attendance/:id
 * @access  Private (Admin)
 */
const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    checkOutTime,
    attendanceStatus,
    notes,
    trainerId
  } = req.body;

  // Find attendance record
  const attendance = await Attendance.findById(id);
  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  // Update fields
  if (checkOutTime) {
    attendance.checkOutTime = new Date(checkOutTime);
    
    // Calculate duration
    const durationMs = attendance.checkOutTime - attendance.checkInTime;
    attendance.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
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
        throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
      }
      attendance.trainerId = trainerId;
    } else {
      attendance.trainerId = null;
    }
  }

  await attendance.save();

  // Populate and return updated attendance
  const updatedAttendance = await Attendance.findById(id)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(
    res,
    { attendance: updatedAttendance },
    'Attendance record updated successfully'
  );
});

/**
 * @desc    Get attendance statistics
 * @route   GET /api/admin/attendance/stats
 * @access  Private (Admin)
 */
const getAttendanceStats = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    branchId,
    memberId,
    period = 'month'
  } = req.query;

  // Calculate date range
  const now = new Date();
  let queryStartDate, queryEndDate;

  if (startDate && endDate) {
    queryStartDate = new Date(startDate);
    queryEndDate = new Date(endDate);
  } else if (period === 'month') {
    queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (period === 'year') {
    queryStartDate = new Date(now.getFullYear(), 0, 1);
    queryEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (period === 'week') {
    const dayOfWeek = now.getDay();
    queryStartDate = new Date(now);
    queryStartDate.setDate(now.getDate() - dayOfWeek);
    queryStartDate.setHours(0, 0, 0, 0);
    queryEndDate = new Date(queryStartDate);
    queryEndDate.setDate(queryStartDate.getDate() + 6);
    queryEndDate.setHours(23, 59, 59, 999);
  } else {
    queryStartDate = new Date(0);
    queryEndDate = now;
  }

  // Build match query
  const matchQuery = {
    attendanceDate: {
      $gte: queryStartDate,
      $lte: queryEndDate
    }
  };

  if (branchId) {
    matchQuery.branchId = mongoose.Types.ObjectId(branchId);
  }

  if (memberId) {
    matchQuery.memberId = mongoose.Types.ObjectId(memberId);
  }

  // Total attendance
  const totalAttendance = await Attendance.countDocuments(matchQuery);

  // Attendance by status
  const attendanceByStatus = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$attendanceStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusStats = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0
  };

  attendanceByStatus.forEach(item => {
    statusStats[item._id] = item.count;
  });

  // Unique members
  const uniqueMembers = await Attendance.distinct('memberId', matchQuery);

  // Average attendance per day
  const daysInPeriod = Math.ceil((queryEndDate - queryStartDate) / (1000 * 60 * 60 * 24));
  const avgAttendancePerDay = daysInPeriod > 0 ? (totalAttendance / daysInPeriod).toFixed(2) : 0;

  // Today's attendance
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));
  const todayAttendance = await Attendance.countDocuments({
    attendanceDate: { $gte: todayStart, $lte: todayEnd },
    ...(branchId && { branchId: mongoose.Types.ObjectId(branchId) })
  });

  // Peak hours
  const peakHours = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $project: {
        hour: { $hour: '$checkInTime' }
      }
    },
    {
      $group: {
        _id: '$hour',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // Average duration
  const avgDurationResult = await Attendance.aggregate([
    {
      $match: {
        ...matchQuery,
        duration: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
        minDuration: { $min: '$duration' }
      }
    }
  ]);

  const durationStats = avgDurationResult.length > 0 ? avgDurationResult[0] : {
    avgDuration: 0,
    maxDuration: 0,
    minDuration: 0
  };

  // Attendance by branch
  const attendanceByBranch = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$branchId',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    {
      $lookup: {
        from: 'branches',
        localField: '_id',
        foreignField: '_id',
        as: 'branchInfo'
      }
    },
    { $unwind: '$branchInfo' }
  ]);

  // Top members by attendance
  const topMembers = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$memberId',
        attendanceCount: { $sum: 1 }
      }
    },
    { $sort: { attendanceCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'memberInfo'
      }
    },
    { $unwind: '$memberInfo' }
  ]);

  // Attendance trend (daily for the period)
  const attendanceTrend = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: { $year: '$attendanceDate' },
          month: { $month: '$attendanceDate' },
          day: { $dayOfMonth: '$attendanceDate' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  ApiResponse.success(
    res,
    {
      period,
      dateRange: {
        start: queryStartDate,
        end: queryEndDate
      },
      summary: {
        totalAttendance,
        uniqueMembers: uniqueMembers.length,
        todayAttendance,
        averagePerDay: parseFloat(avgAttendancePerDay),
        averageDuration: Math.round(durationStats.avgDuration),
        maxDuration: durationStats.maxDuration,
        minDuration: durationStats.minDuration
      },
      byStatus: statusStats,
      byBranch: attendanceByBranch.map(item => ({
        branchId: item._id,
        branchName: item.branchInfo.branchName,
        branchCode: item.branchInfo.branchCode,
        count: item.count,
        percentage: ((item.count / totalAttendance) * 100).toFixed(2)
      })),
      peakHours: peakHours.map(item => ({
        hour: item._id,
        count: item.count,
        timeSlot: `${item._id}:00 - ${item._id + 1}:00`
      })),
      topMembers: topMembers.map(item => ({
        memberId: item._id,
        memberName: item.memberInfo.fullName,
        memberEmail: item.memberInfo.email,
        attendanceCount: item.attendanceCount
      })),
      trend: attendanceTrend.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        count: item.count
      }))
    },
    'Attendance statistics retrieved successfully'
  );
});

/**
 * @desc    Bulk create attendance records
 * @route   POST /api/admin/attendance/bulk
 * @access  Private (Admin)
 */
const bulkCreateAttendance = asyncHandler(async (req, res) => {
  const { attendanceRecords } = req.body;

  // Validate input
  if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    throw ApiError.badRequest('Please provide an array of attendance records');
  }

  // Validate each record
  const validatedRecords = [];
  const errors = [];

  for (let i = 0; i < attendanceRecords.length; i++) {
    const record = attendanceRecords[i];
    
    // Check required fields
    if (!record.memberId || !record.branchId || !record.checkInTime) {
      errors.push({
        index: i,
        error: 'Missing required fields: memberId, branchId, checkInTime'
      });
      continue;
    }

    // Verify member exists
    const member = await User.findById(record.memberId);
    if (!member || member.role !== 'member') {
      errors.push({
        index: i,
        memberId: record.memberId,
        error: 'Invalid member ID or user is not a member'
      });
      continue;
    }

    // Verify branch exists
    const branch = await Branch.findById(record.branchId);
    if (!branch) {
      errors.push({
        index: i,
        branchId: record.branchId,
        error: 'Branch not found'
      });
      continue;
    }

    // Verify trainer if provided
    if (record.trainerId) {
      const trainer = await User.findById(record.trainerId);
      if (!trainer || trainer.role !== 'trainer') {
        errors.push({
          index: i,
          trainerId: record.trainerId,
          error: 'Invalid trainer ID or user is not a trainer'
        });
        continue;
      }
    }

    // Check for duplicate attendance
    const attendanceDateObj = record.attendanceDate ? new Date(record.attendanceDate) : new Date();
    const startOfDay = new Date(attendanceDateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(attendanceDateObj.setHours(23, 59, 59, 999));

    const existingAttendance = await Attendance.findOne({
      memberId: record.memberId,
      branchId: record.branchId,
      attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingAttendance) {
      errors.push({
        index: i,
        memberId: record.memberId,
        error: 'Attendance already exists for this member on this date'
      });
      continue;
    }

    // Add to validated records
    validatedRecords.push({
      memberId: record.memberId,
      trainerId: record.trainerId || null,
      branchId: record.branchId,
      attendanceDate: attendanceDateObj,
      checkInTime: new Date(record.checkInTime),
      checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
      attendanceStatus: record.attendanceStatus || 'present',
      notes: record.notes || null,
      createdBy: req.user.id,
      createdByModel: 'Admin'
    });
  }

  // Insert validated records
  let createdRecords = [];
  if (validatedRecords.length > 0) {
    createdRecords = await Attendance.insertMany(validatedRecords);
  }

  ApiResponse.success(
    res,
    {
      created: createdRecords.length,
      failed: errors.length,
      total: attendanceRecords.length,
      errors: errors.length > 0 ? errors : undefined
    },
    `Bulk attendance creation completed. ${createdRecords.length} records created, ${errors.length} failed.`,
    201
  );
});

/**
 * @desc    Delete attendance record
 * @route   DELETE /api/admin/attendance/:id
 * @access  Private (Admin)
 */
const deleteAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find and delete attendance record
  const attendance = await Attendance.findById(id);
  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  await Attendance.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { attendanceId: id },
    'Attendance record deleted successfully'
  );
});

/**
 * @desc    Get attendance by ID
 * @route   GET /api/admin/attendance/:id
 * @access  Private (Admin)
 */
const getAttendanceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const attendance = await Attendance.findById(id)
    .populate('memberId', 'fullName email phone membershipStatus membershipPlan age gender')
    .populate('trainerId', 'fullName email phone specialization')
    .populate('branchId', 'branchName branchCode address city state')
    .lean();

  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  ApiResponse.success(
    res,
    { attendance },
    'Attendance record retrieved successfully'
  );
});

module.exports = {
  createAttendance,
  getAllAttendance,
  updateAttendance,
  getAttendanceStats,
  bulkCreateAttendance,
  deleteAttendance,
  getAttendanceById,
};
