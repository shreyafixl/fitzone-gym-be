const User = require('../models/User');
const Branch = require('../models/Branch');
const MembershipPlan = require('../models/MembershipPlan');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// DASHBOARD ANALYTICS
// ============================================================================

/**
 * @desc    Get dashboard overview statistics
 * @route   GET /api/superadmin/analytics/dashboard
 * @access  Private (Super Admin only)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Total counts
  const totalUsers = await User.countDocuments();
  const totalTrainers = await User.countDocuments({ role: 'trainer' });
  const totalMembers = await User.countDocuments({ role: 'user' });
  const totalBranches = await Branch.countDocuments();
  const totalPlans = await MembershipPlan.countDocuments();

  // Membership statistics
  const activeMemberships = await User.countDocuments({ membershipStatus: 'active' });
  const expiredMemberships = await User.countDocuments({ membershipStatus: 'expired' });
  const pendingMemberships = await User.countDocuments({ membershipStatus: 'pending' });

  // Subscription statistics
  const totalSubscriptions = await Subscription.countDocuments();
  const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
  const cancelledSubscriptions = await Subscription.countDocuments({ status: 'cancelled' });

  // Financial statistics
  const successfulTransactions = await Transaction.find({ status: 'success' });
  const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Monthly revenue (current month)
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthlyTransactions = await Transaction.find({
    status: 'success',
    createdAt: { $gte: firstDayOfMonth },
  });
  const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Yearly revenue (current year)
  const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const yearlyTransactions = await Transaction.find({
    status: 'success',
    createdAt: { $gte: firstDayOfYear },
  });
  const yearlyRevenue = yearlyTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Recent activity counts
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsersLast30Days = await User.countDocuments({ createdAt: { $gte: last30Days } });
  const newSubscriptionsLast30Days = await Subscription.countDocuments({ createdAt: { $gte: last30Days } });

  const stats = {
    overview: {
      totalUsers,
      totalTrainers,
      totalMembers,
      totalBranches,
      totalPlans,
    },
    memberships: {
      active: activeMemberships,
      expired: expiredMemberships,
      pending: pendingMemberships,
      total: totalUsers,
      activePercentage: totalUsers > 0 ? ((activeMemberships / totalUsers) * 100).toFixed(2) : 0,
    },
    subscriptions: {
      total: totalSubscriptions,
      active: activeSubscriptions,
      cancelled: cancelledSubscriptions,
    },
    revenue: {
      total: totalRevenue,
      monthly: monthlyRevenue,
      yearly: yearlyRevenue,
      currency: 'INR',
    },
    recentActivity: {
      newUsersLast30Days,
      newSubscriptionsLast30Days,
    },
  };

  ApiResponse.success(res, stats, 'Dashboard statistics retrieved successfully');
});

/**
 * @desc    Get user growth analytics
 * @route   GET /api/superadmin/analytics/user-growth
 * @access  Private (Super Admin only)
 */
const getUserGrowthAnalytics = asyncHandler(async (req, res) => {
  const { period = 'monthly', year = new Date().getFullYear() } = req.query;

  let groupBy;
  let dateFormat;

  if (period === 'daily') {
    groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    dateFormat = 'daily';
  } else if (period === 'weekly') {
    groupBy = { $week: '$createdAt' };
    dateFormat = 'weekly';
  } else {
    groupBy = { $month: '$createdAt' };
    dateFormat = 'monthly';
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(parseInt(year) + 1, 0, 1);

  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: yearStart, $lt: yearEnd },
      },
    },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
        members: {
          $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] },
        },
        trainers: {
          $sum: { $cond: [{ $eq: ['$role', 'trainer'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalUsers = await User.countDocuments();
  const totalMembers = await User.countDocuments({ role: 'user' });
  const totalTrainers = await User.countDocuments({ role: 'trainer' });

  ApiResponse.success(
    res,
    {
      period: dateFormat,
      year: parseInt(year),
      growth: userGrowth,
      totals: {
        users: totalUsers,
        members: totalMembers,
        trainers: totalTrainers,
      },
    },
    'User growth analytics retrieved successfully'
  );
});

/**
 * @desc    Get attendance statistics
 * @route   GET /api/superadmin/analytics/attendance
 * @access  Private (Super Admin only)
 */
const getAttendanceStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate, branchId } = req.query;

  const query = {};
  if (branchId) query.assignedBranch = branchId;

  const users = await User.find(query).select('fullName email attendance');

  let totalCheckIns = 0;
  let totalUsers = users.length;
  let usersWithAttendance = 0;

  const attendanceData = users.map((user) => {
    let checkIns = user.attendance || [];

    if (startDate || endDate) {
      checkIns = checkIns.filter((record) => {
        const recordDate = new Date(record.date);
        if (startDate && recordDate < new Date(startDate)) return false;
        if (endDate && recordDate > new Date(endDate)) return false;
        return true;
      });
    }

    totalCheckIns += checkIns.length;
    if (checkIns.length > 0) usersWithAttendance++;

    return {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      totalCheckIns: checkIns.length,
    };
  });

  const averageAttendance = totalUsers > 0 ? (totalCheckIns / totalUsers).toFixed(2) : 0;
  const attendanceRate = totalUsers > 0 ? ((usersWithAttendance / totalUsers) * 100).toFixed(2) : 0;

  ApiResponse.success(
    res,
    {
      summary: {
        totalUsers,
        totalCheckIns,
        usersWithAttendance,
        averageAttendance: parseFloat(averageAttendance),
        attendanceRate: parseFloat(attendanceRate),
      },
      users: attendanceData.sort((a, b) => b.totalCheckIns - a.totalCheckIns).slice(0, 20),
    },
    'Attendance statistics retrieved successfully'
  );
});

/**
 * @desc    Get branch-wise analytics
 * @route   GET /api/superadmin/analytics/branches
 * @access  Private (Super Admin only)
 */
const getBranchAnalytics = asyncHandler(async (req, res) => {
  const branches = await Branch.find().select('branchName branchCode city state totalMembers capacity branchStatus');

  const branchAnalytics = await Promise.all(
    branches.map(async (branch) => {
      const branchUsers = await User.countDocuments({ assignedBranch: branch._id });
      const activeMembers = await User.countDocuments({
        assignedBranch: branch._id,
        membershipStatus: 'active',
      });

      const branchSubscriptions = await Subscription.countDocuments({ branch: branch._id });
      const activeSubscriptions = await Subscription.countDocuments({
        branch: branch._id,
        status: 'active',
      });

      const branchTransactions = await Transaction.find({
        branch: branch._id,
        status: 'success',
      });
      const branchRevenue = branchTransactions.reduce((sum, t) => sum + t.amount, 0);

      const occupancyRate = branch.capacity > 0 ? ((branchUsers / branch.capacity) * 100).toFixed(2) : 0;

      return {
        branchId: branch._id,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        city: branch.city,
        state: branch.state,
        status: branch.branchStatus,
        metrics: {
          totalUsers: branchUsers,
          activeMembers,
          capacity: branch.capacity,
          occupancyRate: parseFloat(occupancyRate),
          subscriptions: {
            total: branchSubscriptions,
            active: activeSubscriptions,
          },
          revenue: branchRevenue,
        },
      };
    })
  );

  const totalRevenue = branchAnalytics.reduce((sum, b) => sum + b.metrics.revenue, 0);
  const totalUsers = branchAnalytics.reduce((sum, b) => sum + b.metrics.totalUsers, 0);

  ApiResponse.success(
    res,
    {
      branches: branchAnalytics.sort((a, b) => b.metrics.revenue - a.metrics.revenue),
      summary: {
        totalBranches: branches.length,
        totalRevenue,
        totalUsers,
        averageRevenuePerBranch: branches.length > 0 ? (totalRevenue / branches.length).toFixed(2) : 0,
      },
    },
    'Branch analytics retrieved successfully'
  );
});

/**
 * @desc    Get trainer performance analytics
 * @route   GET /api/superadmin/analytics/trainers
 * @access  Private (Super Admin only)
 */
const getTrainerPerformanceAnalytics = asyncHandler(async (req, res) => {
  const trainers = await User.find({ role: 'trainer' }).select('fullName email phone assignedBranch');

  const trainerAnalytics = await Promise.all(
    trainers.map(async (trainer) => {
      const assignedMembers = await User.countDocuments({ assignedTrainer: trainer._id });
      const activeMembers = await User.countDocuments({
        assignedTrainer: trainer._id,
        membershipStatus: 'active',
      });

      const branch = trainer.assignedBranch
        ? await Branch.findById(trainer.assignedBranch).select('branchName branchCode')
        : null;

      return {
        trainerId: trainer._id,
        fullName: trainer.fullName,
        email: trainer.email,
        phone: trainer.phone,
        branch: branch
          ? {
              id: branch._id,
              name: branch.branchName,
              code: branch.branchCode,
            }
          : null,
        metrics: {
          assignedMembers,
          activeMembers,
          inactiveMembers: assignedMembers - activeMembers,
          retentionRate: assignedMembers > 0 ? ((activeMembers / assignedMembers) * 100).toFixed(2) : 0,
        },
      };
    })
  );

  const totalAssignedMembers = trainerAnalytics.reduce((sum, t) => sum + t.metrics.assignedMembers, 0);
  const averageMembersPerTrainer =
    trainers.length > 0 ? (totalAssignedMembers / trainers.length).toFixed(2) : 0;

  ApiResponse.success(
    res,
    {
      trainers: trainerAnalytics.sort((a, b) => b.metrics.assignedMembers - a.metrics.assignedMembers),
      summary: {
        totalTrainers: trainers.length,
        totalAssignedMembers,
        averageMembersPerTrainer: parseFloat(averageMembersPerTrainer),
      },
    },
    'Trainer performance analytics retrieved successfully'
  );
});

// ============================================================================
// REPORTS
// ============================================================================

/**
 * @desc    Get financial report
 * @route   GET /api/superadmin/analytics/reports/financial
 * @access  Private (Super Admin only)
 */
const getFinancialReport = asyncHandler(async (req, res) => {
  console.log('[getFinancialReport] Starting financial report generation');
  console.log('[getFinancialReport] Query params:', req.query);

  try {
    const { startDate, endDate, branchId, type } = req.query;

    const query = { status: 'success' };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (branchId) query.branch = branchId;
    if (type && type !== 'all') query.type = type;

    console.log('[getFinancialReport] Fetching transactions with query:', query);

    const transactions = await Transaction.find(query)
      .populate('user', 'fullName email')
      .populate('branch', 'branchName branchCode')
      .sort({ createdAt: -1 });

    console.log('[getFinancialReport] Found transactions:', transactions.length);

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalRefunds = transactions
      .filter((t) => t.status === 'refunded')
      .reduce((sum, t) => sum + (t.refundAmount || 0), 0);
    const netRevenue = totalRevenue - totalRefunds;

    const paymentMethodBreakdown = transactions.reduce((acc, t) => {
      const method = t.paymentMethod || 'Unknown';
      acc[method] = (acc[method] || 0) + (t.amount || 0);
      return acc;
    }, {});

    const typeBreakdown = transactions.reduce((acc, t) => {
      const txType = t.type || 'Unknown';
      acc[txType] = (acc[txType] || 0) + (t.amount || 0);
      return acc;
    }, {});

    console.log('[getFinancialReport] Total revenue:', totalRevenue);
    console.log('[getFinancialReport] Sending response');

    const response = {
      summary: {
        totalTransactions: transactions.length,
        totalRevenue,
        totalRefunds,
        netRevenue,
        currency: 'INR',
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time',
        },
      },
      breakdown: {
        byPaymentMethod: paymentMethodBreakdown,
        byType: typeBreakdown,
      },
      transactions: transactions.slice(0, 100).map((t) => {
        try {
          return t.getPublicProfile ? t.getPublicProfile() : {
            id: t._id,
            amount: t.amount,
            type: t.type,
            status: t.status,
            paymentMethod: t.paymentMethod,
            createdAt: t.createdAt,
          };
        } catch (err) {
          console.error('[getFinancialReport] Error getting public profile:', err.message);
          return {
            id: t._id,
            amount: t.amount,
            type: t.type,
            status: t.status,
            paymentMethod: t.paymentMethod,
            createdAt: t.createdAt,
          };
        }
      }),
    };

    ApiResponse.success(
      res,
      response,
      'Financial report generated successfully'
    );
  } catch (err) {
    console.error('[getFinancialReport] Error in financial report:', err);
    throw err; // Let asyncHandler catch it
  }
});

/**
 * @desc    Get attendance report
 * @route   GET /api/superadmin/analytics/reports/attendance
 * @access  Private (Super Admin only)
 */
const getAttendanceReport = asyncHandler(async (req, res) => {
  console.log('[getAttendanceReport] Starting attendance report generation');
  console.log('[getAttendanceReport] Query params:', req.query);

  try {
    const { startDate, endDate, branchId } = req.query;

    // Build query - note: User model doesn't have assignedBranch field
    const query = {};
    // branchId filtering would require a branch field in User model
    // For now, we'll fetch all users and filter by attendance

    console.log('[getAttendanceReport] Fetching users with query:', query);

    const users = await User.find(query)
      .select('fullName email role attendance');

    console.log('[getAttendanceReport] Found users:', users.length);

    const attendanceReport = users.map((user) => {
      try {
        // Safely get attendance array, default to empty array if undefined
        let checkIns = Array.isArray(user.attendance) ? user.attendance : [];

        console.log(`[getAttendanceReport] User ${user._id} has ${checkIns.length} check-ins`);

        // Filter by date range if provided
        if ((startDate || endDate) && checkIns.length > 0) {
          checkIns = checkIns.filter((record) => {
            try {
              const recordDate = new Date(record.date);
              if (startDate && recordDate < new Date(startDate)) return false;
              if (endDate && recordDate > new Date(endDate)) return false;
              return true;
            } catch (err) {
              console.error(`[getAttendanceReport] Error filtering record date:`, err.message);
              return false;
            }
          });
        }

        // Get last check-in safely
        let lastCheckIn = null;
        if (checkIns.length > 0 && checkIns[checkIns.length - 1]) {
          lastCheckIn = checkIns[checkIns.length - 1].date || null;
        }

        return {
          userId: user._id,
          fullName: user.fullName || 'N/A',
          email: user.email || 'N/A',
          role: user.role || 'member',
          totalCheckIns: checkIns.length,
          lastCheckIn: lastCheckIn,
        };
      } catch (err) {
        console.error(`[getAttendanceReport] Error processing user ${user._id}:`, err.message);
        // Return a safe default object instead of crashing
        return {
          userId: user._id,
          fullName: user.fullName || 'N/A',
          email: user.email || 'N/A',
          role: user.role || 'member',
          totalCheckIns: 0,
          lastCheckIn: null,
        };
      }
    });

    console.log('[getAttendanceReport] Generated report for', attendanceReport.length, 'users');

    const totalCheckIns = attendanceReport.reduce((sum, u) => sum + (u.totalCheckIns || 0), 0);
    const usersWithAttendance = attendanceReport.filter((u) => u.totalCheckIns > 0).length;

    console.log('[getAttendanceReport] Total check-ins:', totalCheckIns);
    console.log('[getAttendanceReport] Users with attendance:', usersWithAttendance);

    const response = {
      summary: {
        totalUsers: users.length,
        totalCheckIns,
        usersWithAttendance,
        averageCheckIns: users.length > 0 ? (totalCheckIns / users.length).toFixed(2) : 0,
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time',
        },
      },
      report: attendanceReport.sort((a, b) => b.totalCheckIns - a.totalCheckIns),
    };

    console.log('[getAttendanceReport] Sending response');

    ApiResponse.success(
      res,
      response,
      'Attendance report generated successfully'
    );
  } catch (err) {
    console.error('[getAttendanceReport] Error in attendance report:', err);
    throw err; // Let asyncHandler catch it
  }
});

/**
 * @desc    Get membership report
 * @route   GET /api/superadmin/analytics/reports/membership
 * @access  Private (Super Admin only)
 */
const getMembershipReport = asyncHandler(async (req, res) => {
  console.log('[getMembershipReport] Starting membership report generation');
  console.log('[getMembershipReport] Query params:', req.query);

  try {
    const { status, planId, branchId } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (planId) query.membershipPlan = planId;
    if (branchId) query.branch = branchId;

    console.log('[getMembershipReport] Fetching subscriptions with query:', query);

    const subscriptions = await Subscription.find(query)
      .populate('user', 'fullName email phone')
      .populate('membershipPlan', 'planName planCode price duration durationType')
      .populate('branch', 'branchName branchCode')
      .sort({ createdAt: -1 });

    console.log('[getMembershipReport] Found subscriptions:', subscriptions.length);

    const statusBreakdown = subscriptions.reduce((acc, s) => {
      const subStatus = s.status || 'unknown';
      acc[subStatus] = (acc[subStatus] || 0) + 1;
      return acc;
    }, {});

    const planBreakdown = subscriptions.reduce((acc, s) => {
      const planName = s.membershipPlan?.planName || 'Unknown';
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {});

    const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    
    // Safely check for expiring soon
    const expiringSoon = subscriptions.filter((s) => {
      try {
        return s.isExpiringSoon && typeof s.isExpiringSoon === 'function' ? s.isExpiringSoon() : false;
      } catch (err) {
        console.error('[getMembershipReport] Error checking expiring soon:', err.message);
        return false;
      }
    }).length;

    console.log('[getMembershipReport] Total revenue:', totalRevenue);
    console.log('[getMembershipReport] Expiring soon:', expiringSoon);

    const response = {
      summary: {
        totalSubscriptions: subscriptions.length,
        totalRevenue,
        expiringSoon,
        currency: 'INR',
      },
      breakdown: {
        byStatus: statusBreakdown,
        byPlan: planBreakdown,
      },
      subscriptions: subscriptions.slice(0, 100).map((s) => {
        try {
          return s.getPublicProfile ? s.getPublicProfile() : {
            id: s._id,
            user: s.user,
            plan: s.membershipPlan,
            status: s.status,
            amountPaid: s.amountPaid,
            createdAt: s.createdAt,
          };
        } catch (err) {
          console.error('[getMembershipReport] Error getting public profile:', err.message);
          return {
            id: s._id,
            user: s.user,
            plan: s.membershipPlan,
            status: s.status,
            amountPaid: s.amountPaid,
            createdAt: s.createdAt,
          };
        }
      }),
    };

    console.log('[getMembershipReport] Sending response');

    ApiResponse.success(
      res,
      response,
      'Membership report generated successfully'
    );
  } catch (err) {
    console.error('[getMembershipReport] Error in membership report:', err);
    throw err; // Let asyncHandler catch it
  }
});

/**
 * @desc    Get trainer report
 * @route   GET /api/superadmin/analytics/reports/trainers
 * @access  Private (Super Admin only)
 */
const getTrainerReport = asyncHandler(async (req, res) => {
  console.log('[getTrainerReport] Starting trainer report generation');
  console.log('[getTrainerReport] Query params:', req.query);

  try {
    const { branchId } = req.query;

    const query = { role: 'trainer' };
    if (branchId) query.assignedBranch = branchId;

    console.log('[getTrainerReport] Fetching trainers with query:', query);

    const trainers = await User.find(query)
      .select('fullName email phone assignedBranch createdAt')
      .populate('assignedBranch', 'branchName branchCode city');

    console.log('[getTrainerReport] Found trainers:', trainers.length);

    const trainerReport = await Promise.all(
      trainers.map(async (trainer) => {
        try {
          const assignedMembers = await User.countDocuments({ assignedTrainer: trainer._id });
          const activeMembers = await User.countDocuments({
            assignedTrainer: trainer._id,
            membershipStatus: 'active',
          });

          const members = await User.find({ assignedTrainer: trainer._id }).select('fullName email membershipStatus');

          return {
            trainerId: trainer._id,
            fullName: trainer.fullName || 'N/A',
            email: trainer.email || 'N/A',
            phone: trainer.phone || 'N/A',
            branch: trainer.assignedBranch
              ? {
                  id: trainer.assignedBranch._id,
                  name: trainer.assignedBranch.branchName,
                  code: trainer.assignedBranch.branchCode,
                  city: trainer.assignedBranch.city,
                }
              : null,
            joinedDate: trainer.createdAt,
            metrics: {
              totalAssignedMembers: assignedMembers,
              activeMembers,
              inactiveMembers: assignedMembers - activeMembers,
              retentionRate: assignedMembers > 0 ? ((activeMembers / assignedMembers) * 100).toFixed(2) : 0,
            },
            members: members.map((m) => ({
              id: m._id,
              fullName: m.fullName,
              email: m.email,
              status: m.membershipStatus,
            })),
          };
        } catch (err) {
          console.error(`[getTrainerReport] Error processing trainer ${trainer._id}:`, err.message);
          // Return a safe default object
          return {
            trainerId: trainer._id,
            fullName: trainer.fullName || 'N/A',
            email: trainer.email || 'N/A',
            phone: trainer.phone || 'N/A',
            branch: null,
            joinedDate: trainer.createdAt,
            metrics: {
              totalAssignedMembers: 0,
              activeMembers: 0,
              inactiveMembers: 0,
              retentionRate: 0,
            },
            members: [],
          };
        }
      })
    );

    console.log('[getTrainerReport] Generated report for', trainerReport.length, 'trainers');

    const response = {
      summary: {
        totalTrainers: trainers.length,
        totalAssignedMembers: trainerReport.reduce((sum, t) => sum + (t.metrics?.totalAssignedMembers || 0), 0),
      },
      report: trainerReport.sort((a, b) => (b.metrics?.totalAssignedMembers || 0) - (a.metrics?.totalAssignedMembers || 0)),
    };

    console.log('[getTrainerReport] Sending response');

    ApiResponse.success(
      res,
      response,
      'Trainer report generated successfully'
    );
  } catch (err) {
    console.error('[getTrainerReport] Error in trainer report:', err);
    throw err; // Let asyncHandler catch it
  }
});

/**
 * @desc    Get branch performance report
 * @route   GET /api/superadmin/analytics/reports/branches
 * @access  Private (Super Admin only)
 */
const getBranchPerformanceReport = asyncHandler(async (req, res) => {
  console.log('[getBranchPerformanceReport] Starting branch performance report generation');
  console.log('[getBranchPerformanceReport] Query params:', req.query);

  try {
    const { status } = req.query;

    const query = {};
    if (status && status !== 'all') query.branchStatus = status;

    console.log('[getBranchPerformanceReport] Fetching branches with query:', query);

    const branches = await Branch.find(query);

    console.log('[getBranchPerformanceReport] Found branches:', branches.length);

    const branchReport = await Promise.all(
      branches.map(async (branch) => {
        try {
          const totalUsers = await User.countDocuments({ assignedBranch: branch._id });
          const activeMembers = await User.countDocuments({
            assignedBranch: branch._id,
            membershipStatus: 'active',
          });
          const trainers = await User.countDocuments({
            assignedBranch: branch._id,
            role: 'trainer',
          });

          const subscriptions = await Subscription.countDocuments({ branch: branch._id });
          const activeSubscriptions = await Subscription.countDocuments({
            branch: branch._id,
            status: 'active',
          });

          const transactions = await Transaction.find({
            branch: branch._id,
            status: 'success',
          });
          const revenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

          const monthlyTransactions = await Transaction.find({
            branch: branch._id,
            status: 'success',
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          });
          const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

          const capacity = branch.capacity || 1;
          const occupancyRate = capacity > 0 ? ((totalUsers / capacity) * 100).toFixed(2) : 0;

          return {
            branchId: branch._id,
            branchName: branch.branchName || 'N/A',
            branchCode: branch.branchCode || 'N/A',
            location: {
              address: branch.address || 'N/A',
              city: branch.city || 'N/A',
              state: branch.state || 'N/A',
              pincode: branch.pincode || 'N/A',
            },
            contact: {
              phone: branch.contactNumber || 'N/A',
              email: branch.email || 'N/A',
            },
            status: branch.branchStatus || 'active',
            metrics: {
              users: {
                total: totalUsers,
                activeMembers,
                trainers,
              },
              subscriptions: {
                total: subscriptions,
                active: activeSubscriptions,
              },
              revenue: {
                total: revenue,
                monthly: monthlyRevenue,
              },
              capacity: capacity,
              occupancyRate: parseFloat(occupancyRate),
            },
            facilities: branch.facilities || [],
          };
        } catch (err) {
          console.error(`[getBranchPerformanceReport] Error processing branch ${branch._id}:`, err.message);
          // Return a safe default object
          return {
            branchId: branch._id,
            branchName: branch.branchName || 'N/A',
            branchCode: branch.branchCode || 'N/A',
            location: {
              address: branch.address || 'N/A',
              city: branch.city || 'N/A',
              state: branch.state || 'N/A',
              pincode: branch.pincode || 'N/A',
            },
            contact: {
              phone: branch.contactNumber || 'N/A',
              email: branch.email || 'N/A',
            },
            status: branch.branchStatus || 'active',
            metrics: {
              users: {
                total: 0,
                activeMembers: 0,
                trainers: 0,
              },
              subscriptions: {
                total: 0,
                active: 0,
              },
              revenue: {
                total: 0,
                monthly: 0,
              },
              capacity: branch.capacity || 0,
              occupancyRate: 0,
            },
            facilities: branch.facilities || [],
          };
        }
      })
    );

    console.log('[getBranchPerformanceReport] Generated report for', branchReport.length, 'branches');

    const totalRevenue = branchReport.reduce((sum, b) => sum + (b.metrics?.revenue?.total || 0), 0);
    const totalUsers = branchReport.reduce((sum, b) => sum + (b.metrics?.users?.total || 0), 0);

    const response = {
      summary: {
        totalBranches: branches.length,
        totalRevenue,
        totalUsers,
        averageRevenuePerBranch: branches.length > 0 ? (totalRevenue / branches.length).toFixed(2) : 0,
      },
      report: branchReport.sort((a, b) => (b.metrics?.revenue?.total || 0) - (a.metrics?.revenue?.total || 0)),
    };

    console.log('[getBranchPerformanceReport] Sending response');

    ApiResponse.success(
      res,
      response,
      'Branch performance report generated successfully'
    );
  } catch (err) {
    console.error('[getBranchPerformanceReport] Error in branch performance report:', err);
    throw err; // Let asyncHandler catch it
  }
});

module.exports = {
  getDashboardStats,
  getUserGrowthAnalytics,
  getAttendanceStatistics,
  getBranchAnalytics,
  getTrainerPerformanceAnalytics,
  getFinancialReport,
  getAttendanceReport,
  getMembershipReport,
  getTrainerReport,
  getBranchPerformanceReport,
};
