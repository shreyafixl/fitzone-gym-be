const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Transaction = require('../models/Transaction');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get dashboard KPIs and overview analytics
 * @route   GET /api/admin/analytics/dashboard
 * @access  Private (Admin)
 */
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query; // month, year, all

  // Calculate date range
  const now = new Date();
  let startDate;
  
  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    startDate = new Date(0); // All time
  }

  // Total members
  const totalMembers = await User.countDocuments({ role: 'member' });
  const activeMembers = await User.countDocuments({ 
    role: 'member', 
    membershipStatus: 'active',
    isActive: true 
  });
  const newMembers = await User.countDocuments({
    role: 'member',
    createdAt: { $gte: startDate }
  });

  // Revenue statistics
  const revenueStats = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgTransaction: { $avg: '$amount' }
      }
    }
  ]);

  const revenue = revenueStats.length > 0 ? revenueStats[0] : {
    totalRevenue: 0,
    totalTransactions: 0,
    avgTransaction: 0
  };

  // Attendance statistics
  const totalAttendance = await Attendance.countDocuments({
    attendanceDate: { $gte: startDate }
  });
  
  const todayAttendance = await Attendance.countDocuments({
    attendanceDate: {
      $gte: new Date(now.setHours(0, 0, 0, 0)),
      $lt: new Date(now.setHours(23, 59, 59, 999))
    }
  });

  // Branch statistics
  const totalBranches = await Branch.countDocuments({ isActive: true });
  const activeBranches = await Branch.countDocuments({ 
    isActive: true,
    branchStatus: 'active'
  });

  // Trainer statistics
  const totalTrainers = await User.countDocuments({ role: 'trainer', isActive: true });

  // Membership expiring soon (next 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = await User.countDocuments({
    role: 'member',
    membershipStatus: 'active',
    membershipEndDate: {
      $gte: now,
      $lte: sevenDaysFromNow
    }
  });

  // Growth rate calculation (compare with previous period)
  let previousStartDate;
  if (period === 'month') {
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (period === 'year') {
    previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
  } else {
    previousStartDate = new Date(0);
  }

  const previousMembers = await User.countDocuments({
    role: 'member',
    createdAt: { $gte: previousStartDate, $lt: startDate }
  });

  const memberGrowthRate = previousMembers > 0 
    ? (((newMembers - previousMembers) / previousMembers) * 100).toFixed(2)
    : 0;

  ApiResponse.success(
    res,
    {
      period,
      overview: {
        totalMembers,
        activeMembers,
        newMembers,
        memberGrowthRate: parseFloat(memberGrowthRate),
        totalBranches,
        activeBranches,
        totalTrainers,
        expiringSoon
      },
      revenue: {
        total: revenue.totalRevenue,
        transactions: revenue.totalTransactions,
        average: Math.round(revenue.avgTransaction)
      },
      attendance: {
        total: totalAttendance,
        today: todayAttendance,
        averageDaily: period === 'month' 
          ? Math.round(totalAttendance / 30)
          : Math.round(totalAttendance / 365)
      }
    },
    'Dashboard analytics retrieved successfully'
  );
});

/**
 * @desc    Get revenue analytics with chart data
 * @route   GET /api/admin/analytics/revenue
 * @access  Private (Admin)
 */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', year, month } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate, endDate, groupBy;

  if (period === 'month') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    groupBy = { $dayOfMonth: '$createdAt' };
  } else if (period === 'year') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    groupBy = { $month: '$createdAt' };
  } else {
    startDate = new Date(0);
    endDate = now;
    groupBy = { $year: '$createdAt' };
  }

  // Revenue by period
  const revenueByPeriod = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Revenue by payment method
  const revenueByMethod = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$paymentMethod',
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  // Revenue by transaction type
  const revenueByType = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  // Revenue by branch
  const revenueByBranch = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        branch: { $ne: null },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$branch',
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
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

  // Total statistics
  const totalStats = await Transaction.aggregate([
    {
      $match: {
        status: 'success',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgTransaction: { $avg: '$amount' },
        maxTransaction: { $max: '$amount' },
        minTransaction: { $min: '$amount' }
      }
    }
  ]);

  const stats = totalStats.length > 0 ? totalStats[0] : {
    totalRevenue: 0,
    totalTransactions: 0,
    avgTransaction: 0,
    maxTransaction: 0,
    minTransaction: 0
  };

  // Format chart data
  const chartData = revenueByPeriod.map(item => ({
    period: item._id,
    revenue: item.revenue,
    transactions: item.transactions
  }));

  ApiResponse.success(
    res,
    {
      period,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalRevenue: stats.totalRevenue,
        totalTransactions: stats.totalTransactions,
        averageTransaction: Math.round(stats.avgTransaction),
        maxTransaction: stats.maxTransaction,
        minTransaction: stats.minTransaction
      },
      chartData,
      byPaymentMethod: revenueByMethod.map(item => ({
        method: item._id,
        revenue: item.revenue,
        count: item.count,
        percentage: ((item.revenue / stats.totalRevenue) * 100).toFixed(2)
      })),
      byTransactionType: revenueByType.map(item => ({
        type: item._id,
        revenue: item.revenue,
        count: item.count,
        percentage: ((item.revenue / stats.totalRevenue) * 100).toFixed(2)
      })),
      byBranch: revenueByBranch.map(item => ({
        branchId: item._id,
        branchName: item.branchInfo.branchName,
        branchCode: item.branchInfo.branchCode,
        revenue: item.revenue,
        transactions: item.transactions
      }))
    },
    'Revenue analytics retrieved successfully'
  );
});

/**
 * @desc    Get member analytics with growth trends
 * @route   GET /api/admin/analytics/members
 * @access  Private (Admin)
 */
const getMemberAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', year, month } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate, endDate, groupBy;

  if (period === 'month') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    groupBy = { $dayOfMonth: '$createdAt' };
  } else if (period === 'year') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    groupBy = { $month: '$createdAt' };
  } else {
    startDate = new Date(0);
    endDate = now;
    groupBy = { $year: '$createdAt' };
  }

  // Member growth over time
  const memberGrowth = await User.aggregate([
    {
      $match: {
        role: 'member',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: groupBy,
        newMembers: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Members by status
  const membersByStatus = await User.aggregate([
    {
      $match: { role: 'member' }
    },
    {
      $group: {
        _id: '$membershipStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  // Members by plan
  const membersByPlan = await User.aggregate([
    {
      $match: { role: 'member' }
    },
    {
      $group: {
        _id: '$membershipPlan',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Members by gender
  const membersByGender = await User.aggregate([
    {
      $match: { role: 'member' }
    },
    {
      $group: {
        _id: '$gender',
        count: { $sum: 1 }
      }
    }
  ]);

  // Members by fitness goal
  const membersByGoal = await User.aggregate([
    {
      $match: { role: 'member' }
    },
    {
      $group: {
        _id: '$fitnessGoal',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Age distribution
  const ageDistribution = await User.aggregate([
    {
      $match: { role: 'member' }
    },
    {
      $bucket: {
        groupBy: '$age',
        boundaries: [13, 18, 25, 35, 45, 55, 65, 120],
        default: 'Other',
        output: {
          count: { $sum: 1 }
        }
      }
    }
  ]);

  // Total statistics
  const totalMembers = await User.countDocuments({ role: 'member' });
  const activeMembers = await User.countDocuments({ 
    role: 'member', 
    membershipStatus: 'active',
    isActive: true 
  });
  const newMembersCount = await User.countDocuments({
    role: 'member',
    createdAt: { $gte: startDate, $lte: endDate }
  });

  // Average age
  const avgAgeResult = await User.aggregate([
    { $match: { role: 'member' } },
    { $group: { _id: null, avgAge: { $avg: '$age' } } }
  ]);
  const averageAge = avgAgeResult.length > 0 ? Math.round(avgAgeResult[0].avgAge) : 0;

  // Retention rate (members who renewed)
  const renewedMembers = await Membership.countDocuments({
    membershipStatus: 'active',
    createdAt: { $lt: startDate }
  });
  const retentionRate = totalMembers > 0 
    ? ((renewedMembers / totalMembers) * 100).toFixed(2)
    : 0;

  // Format chart data
  const chartData = memberGrowth.map(item => ({
    period: item._id,
    newMembers: item.newMembers
  }));

  ApiResponse.success(
    res,
    {
      period,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalMembers,
        activeMembers,
        newMembers: newMembersCount,
        inactiveMembers: totalMembers - activeMembers,
        averageAge,
        retentionRate: parseFloat(retentionRate)
      },
      chartData,
      byStatus: membersByStatus.map(item => ({
        status: item._id,
        count: item.count,
        percentage: ((item.count / totalMembers) * 100).toFixed(2)
      })),
      byPlan: membersByPlan.map(item => ({
        plan: item._id,
        count: item.count,
        percentage: ((item.count / totalMembers) * 100).toFixed(2)
      })),
      byGender: membersByGender.map(item => ({
        gender: item._id,
        count: item.count,
        percentage: ((item.count / totalMembers) * 100).toFixed(2)
      })),
      byFitnessGoal: membersByGoal.map(item => ({
        goal: item._id,
        count: item.count,
        percentage: ((item.count / totalMembers) * 100).toFixed(2)
      })),
      ageDistribution: ageDistribution.map(item => ({
        ageRange: `${item._id}-${item._id + 10}`,
        count: item.count
      }))
    },
    'Member analytics retrieved successfully'
  );
});

/**
 * @desc    Get attendance analytics
 * @route   GET /api/admin/analytics/attendance
 * @access  Private (Admin)
 */
const getAttendanceAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', year, month, branchId } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate, endDate, groupBy;

  if (period === 'month') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    groupBy = { $dayOfMonth: '$attendanceDate' };
  } else if (period === 'year') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    groupBy = { $month: '$attendanceDate' };
  } else {
    startDate = new Date(0);
    endDate = now;
    groupBy = { $year: '$attendanceDate' };
  }

  // Build match query
  const matchQuery = {
    attendanceDate: { $gte: startDate, $lte: endDate }
  };
  if (branchId) {
    matchQuery.branchId = mongoose.Types.ObjectId(branchId);
  }

  // Attendance over time
  const attendanceOverTime = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: groupBy,
        totalAttendance: { $sum: 1 },
        uniqueMembers: { $addToSet: '$memberId' }
      }
    },
    {
      $project: {
        _id: 1,
        totalAttendance: 1,
        uniqueMembers: { $size: '$uniqueMembers' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

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

  // Attendance by branch
  const attendanceByBranch = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$branchId',
        totalAttendance: { $sum: 1 },
        uniqueMembers: { $addToSet: '$memberId' }
      }
    },
    {
      $project: {
        _id: 1,
        totalAttendance: 1,
        uniqueMembers: { $size: '$uniqueMembers' }
      }
    },
    { $sort: { totalAttendance: -1 } },
    { $limit: 10 },
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

  // Peak hours analysis
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
    { $sort: { _id: 1 } }
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

  // Total statistics
  const totalAttendance = await Attendance.countDocuments(matchQuery);
  const uniqueMembersResult = await Attendance.distinct('memberId', matchQuery);
  const uniqueMembers = uniqueMembersResult.length;

  // Today's attendance
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));
  const todayAttendance = await Attendance.countDocuments({
    attendanceDate: { $gte: todayStart, $lte: todayEnd },
    ...(branchId && { branchId: mongoose.Types.ObjectId(branchId) })
  });

  // Format chart data
  const chartData = attendanceOverTime.map(item => ({
    period: item._id,
    totalAttendance: item.totalAttendance,
    uniqueMembers: item.uniqueMembers
  }));

  ApiResponse.success(
    res,
    {
      period,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalAttendance,
        uniqueMembers,
        todayAttendance,
        averageDuration: Math.round(durationStats.avgDuration),
        maxDuration: durationStats.maxDuration,
        minDuration: durationStats.minDuration,
        averageDaily: Math.round(totalAttendance / attendanceOverTime.length || 1)
      },
      chartData,
      byStatus: attendanceByStatus.map(item => ({
        status: item._id,
        count: item.count,
        percentage: ((item.count / totalAttendance) * 100).toFixed(2)
      })),
      byBranch: attendanceByBranch.map(item => ({
        branchId: item._id,
        branchName: item.branchInfo.branchName,
        branchCode: item.branchInfo.branchCode,
        totalAttendance: item.totalAttendance,
        uniqueMembers: item.uniqueMembers
      })),
      peakHours: peakHours.map(item => ({
        hour: item._id,
        count: item.count,
        timeSlot: `${item._id}:00 - ${item._id + 1}:00`
      }))
    },
    'Attendance analytics retrieved successfully'
  );
});

/**
 * @desc    Get class/session analytics
 * @route   GET /api/admin/analytics/classes
 * @access  Private (Admin)
 */
const getClassAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', year, month } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate, endDate;

  if (period === 'month') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    startDate = new Date(targetYear, targetMonth, 1);
    endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
  } else if (period === 'year') {
    const targetYear = year ? parseInt(year) : now.getFullYear();
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
  } else {
    startDate = new Date(0);
    endDate = now;
  }

  // Attendance with trainers (proxy for class sessions)
  const classAttendance = await Attendance.aggregate([
    {
      $match: {
        trainerId: { $ne: null },
        attendanceDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$trainerId',
        totalSessions: { $sum: 1 },
        uniqueMembers: { $addToSet: '$memberId' }
      }
    },
    {
      $project: {
        _id: 1,
        totalSessions: 1,
        uniqueMembers: { $size: '$uniqueMembers' }
      }
    },
    { $sort: { totalSessions: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'trainerInfo'
      }
    },
    { $unwind: '$trainerInfo' }
  ]);

  // Total trainers and their activity
  const totalTrainers = await User.countDocuments({ role: 'trainer', isActive: true });
  const activeTrainers = await Attendance.distinct('trainerId', {
    trainerId: { $ne: null },
    attendanceDate: { $gte: startDate, $lte: endDate }
  });

  // Members with trainers
  const membersWithTrainers = await User.countDocuments({
    role: 'member',
    assignedTrainer: { $ne: null }
  });

  const totalMembers = await User.countDocuments({ role: 'member' });

  // Average sessions per member
  const totalSessions = await Attendance.countDocuments({
    trainerId: { $ne: null },
    attendanceDate: { $gte: startDate, $lte: endDate }
  });

  const avgSessionsPerMember = membersWithTrainers > 0 
    ? (totalSessions / membersWithTrainers).toFixed(2)
    : 0;

  ApiResponse.success(
    res,
    {
      period,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalTrainers,
        activeTrainers: activeTrainers.length,
        totalSessions,
        membersWithTrainers,
        membersWithoutTrainers: totalMembers - membersWithTrainers,
        averageSessionsPerMember: parseFloat(avgSessionsPerMember),
        trainerUtilization: totalTrainers > 0 
          ? ((activeTrainers.length / totalTrainers) * 100).toFixed(2)
          : 0
      },
      topTrainers: classAttendance.map(item => ({
        trainerId: item._id,
        trainerName: item.trainerInfo.fullName,
        trainerEmail: item.trainerInfo.email,
        totalSessions: item.totalSessions,
        uniqueMembers: item.uniqueMembers,
        avgMembersPerSession: (item.uniqueMembers / item.totalSessions).toFixed(2)
      }))
    },
    'Class analytics retrieved successfully'
  );
});

module.exports = {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getMemberAnalytics,
  getAttendanceAnalytics,
  getClassAnalytics,
};
