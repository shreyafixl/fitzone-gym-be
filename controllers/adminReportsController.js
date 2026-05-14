const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const CheckIn = require('../models/CheckIn');
const Trainer = require('../models/Trainer');
const Class = require('../models/Class');
const User = require('../models/User');
const Membership = require('../models/Membership');

// ─── REVENUE REPORTS ─────────────────────────────────────────────────────────

exports.getRevenueReport = asyncHandler(async (req, res) => {
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

  const totalRevenue = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const revenueByPlan = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: '$planType',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyRevenue = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: totalRevenue[0]?.total || 0,
      revenueByPlan,
      monthlyRevenue,
      period,
    },
    message: 'Revenue report retrieved successfully',
  });
});

exports.getRevenueByPeriod = asyncHandler(async (req, res) => {
  const { period } = req.params;
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

  const revenue = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: groupBy,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: revenue,
    message: `Revenue report by ${period} retrieved successfully`,
  });
});

exports.getRevenueByPlan = asyncHandler(async (req, res) => {
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

  const revenueByPlan = await Transaction.aggregate([
    { $match: { ...dateFilter, status: 'completed' } },
    {
      $group: {
        _id: '$planType',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: revenueByPlan,
    message: 'Revenue by plan retrieved successfully',
  });
});

exports.exportRevenue = asyncHandler(async (req, res) => {
  const { format } = req.params;
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

  const transactions = await Transaction.find({ ...dateFilter, status: 'completed' })
    .populate('memberId', 'name email')
    .sort({ createdAt: -1 });

  if (format === 'csv') {
    const csv = [
      ['Date', 'Member', 'Amount', 'Plan Type', 'Status'],
      ...transactions.map(t => [
        new Date(t.createdAt).toLocaleDateString(),
        t.memberId?.name || 'N/A',
        t.amount,
        t.planType,
        t.status,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.csv');
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.json');
    res.json(transactions);
  } else {
    res.status(400).json({
      success: false,
      message: 'Unsupported export format',
    });
  }
});

// ─── ATTENDANCE REPORTS ──────────────────────────────────────────────────────

exports.getAttendanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  const totalCheckIns = await Attendance.countDocuments(dateFilter);
  const avgDuration = await Attendance.aggregate([
    { $match: dateFilter },
    { $group: { _id: null, avg: { $avg: '$duration' } } },
  ]);

  const dailyAttendance = await Attendance.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalCheckIns,
      avgDuration: avgDuration[0]?.avg || 0,
      dailyAttendance,
    },
    message: 'Attendance report retrieved successfully',
  });
});

exports.getAttendanceByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Start date and end date are required',
    });
  }

  const total = await Attendance.countDocuments({
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  });

  const attendance = await Attendance.find({
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  })
    .populate('memberId', 'name email')
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: attendance,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Attendance by date range retrieved successfully',
  });
});

exports.getAttendanceStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  const stats = await Attendance.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalCheckIns: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
        minDuration: { $min: '$duration' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: stats[0] || {
      totalCheckIns: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
    },
    message: 'Attendance statistics retrieved successfully',
  });
});

exports.getPeakHours = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      checkInTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  const peakHours = await CheckIn.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $hour: '$checkInTime' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: peakHours,
    message: 'Peak hours retrieved successfully',
  });
});

exports.exportAttendance = asyncHandler(async (req, res) => {
  const { format } = req.params;
  const { startDate, endDate } = req.query;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  const attendance = await Attendance.find(dateFilter)
    .populate('memberId', 'name email')
    .sort({ date: -1 });

  if (format === 'csv') {
    const csv = [
      ['Date', 'Member', 'Check-in Time', 'Check-out Time', 'Duration (mins)'],
      ...attendance.map(a => [
        new Date(a.date).toLocaleDateString(),
        a.memberId?.name || 'N/A',
        new Date(a.checkInTime).toLocaleTimeString(),
        new Date(a.checkOutTime).toLocaleTimeString(),
        Math.round(a.duration / 60),
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.json');
    res.json(attendance);
  } else {
    res.status(400).json({
      success: false,
      message: 'Unsupported export format',
    });
  }
});

// ─── PERFORMANCE REPORTS ─────────────────────────────────────────────────────

exports.getPerformanceReport = asyncHandler(async (req, res) => {
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

  const totalTrainers = await Trainer.countDocuments();
  const totalClasses = await Class.countDocuments();
  const totalMembers = await User.countDocuments({ role: 'member' });

  const topTrainers = await Trainer.find()
    .sort({ rating: -1 })
    .limit(5)
    .select('fullName email rating specialization');

  const topClasses = await Class.find()
    .sort({ enrolledMembers: -1 })
    .limit(5)
    .select('name category enrolledMembers capacity');

  res.status(200).json({
    success: true,
    data: {
      totalTrainers,
      totalClasses,
      totalMembers,
      topTrainers,
      topClasses,
    },
    message: 'Performance report retrieved successfully',
  });
});

exports.getTrainerPerformance = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const total = await Trainer.countDocuments();
  const trainers = await Trainer.find()
    .sort({ rating: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('fullName email phone rating specialization');

  res.status(200).json({
    success: true,
    data: trainers,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Trainer performance retrieved successfully',
  });
});

exports.getClassPerformance = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const total = await Class.countDocuments();
  const classes = await Class.find()
    .sort({ enrolledMembers: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('name category enrolledMembers capacity trainer');

  res.status(200).json({
    success: true,
    data: classes,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Class performance retrieved successfully',
  });
});

exports.getMemberEngagement = asyncHandler(async (req, res) => {
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

  const activeMembers = await User.countDocuments({
    role: 'member',
    status: 'active',
  });

  const inactiveMembers = await User.countDocuments({
    role: 'member',
    status: 'inactive',
  });

  const newMembers = await User.countDocuments({
    role: 'member',
    ...dateFilter,
  });

  res.status(200).json({
    success: true,
    data: {
      activeMembers,
      inactiveMembers,
      newMembers,
      engagementRate: activeMembers > 0 ? ((activeMembers / (activeMembers + inactiveMembers)) * 100).toFixed(2) : 0,
    },
    message: 'Member engagement retrieved successfully',
  });
});

exports.exportPerformance = asyncHandler(async (req, res) => {
  const { format } = req.params;

  const trainers = await Trainer.find().select('fullName email rating specialization');
  const classes = await Class.find().select('name category enrolledMembers capacity');

  if (format === 'csv') {
    const trainersCsv = [
      ['Trainer Name', 'Email', 'Rating', 'Specialization'],
      ...trainers.map(t => [t.fullName, t.email, t.rating, t.specialization]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const classesCsv = [
      ['Class Name', 'Category', 'Enrolled', 'Capacity'],
      ...classes.map(c => [c.name, c.category, c.enrolledMembers, c.capacity]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const csv = `TRAINERS\n${trainersCsv}\n\nCLASSES\n${classesCsv}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=performance-report.csv');
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=performance-report.json');
    res.json({ trainers, classes });
  } else {
    res.status(400).json({
      success: false,
      message: 'Unsupported export format',
    });
  }
});
