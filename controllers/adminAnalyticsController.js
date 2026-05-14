const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Membership = require('../models/Membership');

// ─── MEMBERS ANALYTICS ────────────────────────────────────────────────────────

exports.getMembersAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, period = 'monthly' } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  // Total members
  const totalMembers = await User.countDocuments({ role: 'member' });
  
  // Active members
  const activeMembers = await User.countDocuments({ 
    role: 'member', 
    membershipStatus: 'active' 
  });
  
  // Inactive members
  const inactiveMembers = await User.countDocuments({ 
    role: 'member', 
    membershipStatus: 'inactive' 
  });

  // Member growth over time
  let groupBy;
  if (period === 'daily') {
    groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (period === 'weekly') {
    groupBy = { $week: '$createdAt' };
  } else if (period === 'monthly') {
    groupBy = { $month: '$createdAt' };
  } else if (period === 'yearly') {
    groupBy = { $year: '$createdAt' };
  }

  const memberGrowth = await User.aggregate([
    { $match: { role: 'member', ...dateFilter } },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Member status breakdown
  const statusBreakdown = await User.aggregate([
    { $match: { role: 'member' } },
    {
      $group: {
        _id: '$membershipStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  // Retention rate
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const retainedMembers = await User.countDocuments({
    role: 'member',
    membershipStatus: 'active',
    lastActivityDate: { $gte: thirtyDaysAgo },
  });

  const retentionRate = totalMembers > 0 ? ((retainedMembers / totalMembers) * 100).toFixed(2) : 0;

  res.status(200).json({
    success: true,
    data: {
      totalMembers,
      activeMembers,
      inactiveMembers,
      retentionRate,
      memberGrowth,
      statusBreakdown,
    },
    message: 'Members analytics retrieved successfully',
  });
});

// ─── REVENUE TRENDS ───────────────────────────────────────────────────────────

exports.getRevenueTrends = asyncHandler(async (req, res) => {
  const { startDate, endDate, period = 'monthly' } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  // Total revenue
  const totalRevenue = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Revenue by period
  let groupBy;
  if (period === 'daily') {
    groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  } else if (period === 'weekly') {
    groupBy = { $week: '$createdAt' };
  } else if (period === 'monthly') {
    groupBy = { $month: '$createdAt' };
  } else if (period === 'yearly') {
    groupBy = { $year: '$createdAt' };
  }

  const revenueTrend = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'success' } },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Revenue by membership plan
  const revenueByPlan = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'success' } },
    {
      $group: {
        _id: '$type',
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  // Average transaction value
  const avgTransaction = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'success' } },
    { $group: { _id: null, avg: { $avg: '$amount' } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: totalRevenue[0]?.total || 0,
      revenueTrend,
      revenueByPlan,
      averageTransaction: avgTransaction[0]?.avg || 0,
    },
    message: 'Revenue trends retrieved successfully',
  });
});

// ─── POPULAR CLASSES ──────────────────────────────────────────────────────────

exports.getPopularClasses = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 10 } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  // Get popular classes by bookings
  const popularClasses = await Class.aggregate([
    {
      $lookup: {
        from: 'schedules',
        localField: '_id',
        foreignField: 'classId',
        as: 'schedules',
      },
    },
    {
      $lookup: {
        from: 'bookings',
        localField: 'schedules._id',
        foreignField: 'scheduleId',
        as: 'bookings',
      },
    },
    {
      $addFields: {
        bookingCount: { $size: '$bookings' },
        fillRate: {
          $cond: [
            { $eq: ['$capacity', 0] },
            0,
            { $multiply: [{ $divide: [{ $size: '$bookings' }, '$capacity'] }, 100] },
          ],
        },
      },
    },
    { $sort: { bookingCount: -1 } },
    { $limit: parseInt(limit) },
    {
      $project: {
        _id: 1,
        name: '$className',
        category: 1,
        trainer: 1,
        capacity: 1,
        bookingCount: 1,
        fillRate: { $round: ['$fillRate', 2] },
      },
    },
  ]);

  // Get class categories distribution
  const categoryDistribution = await Class.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get average class occupancy
  const avgOccupancy = await Class.aggregate([
    {
      $lookup: {
        from: 'schedules',
        localField: '_id',
        foreignField: 'classId',
        as: 'schedules',
      },
    },
    {
      $lookup: {
        from: 'bookings',
        localField: 'schedules._id',
        foreignField: 'scheduleId',
        as: 'bookings',
      },
    },
    {
      $group: {
        _id: null,
        avgFillRate: {
          $avg: {
            $cond: [
              { $eq: ['$capacity', 0] },
              0,
              { $multiply: [{ $divide: [{ $size: '$bookings' }, '$capacity'] }, 100] },
            ],
          },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      popularClasses,
      categoryDistribution,
      averageOccupancy: avgOccupancy[0]?.avgFillRate || 0,
    },
    message: 'Popular classes retrieved successfully',
  });
});

// ─── COMBINED ANALYTICS DASHBOARD ─────────────────────────────────────────────

exports.getAnalyticsDashboard = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  // Members metrics
  const totalMembers = await User.countDocuments({ role: 'member' });
  const activeMembers = await User.countDocuments({ 
    role: 'member', 
    membershipStatus: 'active' 
  });

  // Revenue metrics
  const totalRevenue = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Attendance metrics
  const totalAttendance = await Attendance.countDocuments(dateFilter);

  // Classes metrics
  const totalClasses = await Class.countDocuments();

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalMembers,
        activeMembers,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalAttendance,
        totalClasses,
      },
    },
    message: 'Analytics dashboard retrieved successfully',
  });
});
