const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const WorkoutPlan = require('../models/WorkoutPlan');
const DietPlan = require('../models/DietPlan');
const Progress = require('../models/Progress');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get trainer dashboard overview
 * @route   GET /api/trainer/dashboard
 * @access  Private (Trainer)
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get trainer details
  const trainer = await Trainer.findById(trainerId).populate(
    'assignedBranch',
    'branchName branchCode'
  );

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get active assigned member IDs
  const assignedMemberIds = trainer.assignedMembers
    .filter((m) => m.status === 'active')
    .map((m) => m.memberId);

  // Total assigned members
  const totalMembers = assignedMemberIds.length;

  // Get active members (with active membership status)
  const activeMembers = await User.countDocuments({
    _id: { $in: assignedMemberIds },
    membershipStatus: 'active',
  });

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's sessions
  const todaySessions = await Session.countDocuments({
    trainerId,
    sessionDate: { $gte: today, $lt: tomorrow },
    sessionStatus: { $in: ['scheduled', 'in-progress'] },
  });

  // Upcoming sessions (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingSessions = await Session.countDocuments({
    trainerId,
    sessionDate: { $gte: today, $lte: nextWeek },
    sessionStatus: 'scheduled',
  });

  // Active workout plans
  const activeWorkouts = await WorkoutPlan.countDocuments({
    trainerId,
    status: 'active',
  });

  // Active diet plans
  const activeDiets = await DietPlan.countDocuments({
    trainerId,
    status: 'active',
  });

  // This month's attendance (trainer's members)
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyAttendance = await Attendance.countDocuments({
    trainerId,
    attendanceDate: { $gte: firstDayOfMonth },
  });

  // Completed sessions this month
  const completedSessions = await Session.countDocuments({
    trainerId,
    sessionDate: { $gte: firstDayOfMonth },
    sessionStatus: 'completed',
  });

  // Today's revenue (from completed sessions today)
  const todayRevenueSessions = await Session.find({
    trainerId,
    sessionDate: { $gte: today, $lt: tomorrow },
    sessionStatus: 'completed',
  });

  const todayRevenue = todayRevenueSessions.reduce((sum, session) => sum + (session.price || 0), 0);

  // Recent progress updates (last 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentProgressUpdates = await Progress.countDocuments({
    trainerId,
    recordDate: { $gte: sevenDaysAgo },
  });

  // Get today's schedule (sessions for today)
  const todaySchedule = await Session.find({
    trainerId,
    sessionDate: { $gte: today, $lt: tomorrow },
  })
    .populate('participants.memberId', 'fullName')
    .select('sessionDate sessionType duration sessionStatus participants price')
    .sort({ sessionDate: 1 })
    .limit(10);

  // Format today's schedule
  const formattedTodaySchedule = todaySchedule.map((session) => {
    const participant = session.participants[0]; // Get first participant
    return {
      id: session._id,
      time: new Date(session.sessionDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      clientName: participant?.memberId?.fullName || 'Unknown',
      type: session.sessionType || 'Session',
      duration: `${session.duration || 60} min`,
      status: session.sessionStatus || 'scheduled',
    };
  });

  // Get active clients preview (first 4 active members)
  const activeClientsPreview = await User.find({
    _id: { $in: assignedMemberIds },
    membershipStatus: 'active',
  })
    .select('fullName profileImage membershipPlan')
    .limit(4);

  // Format active clients preview with progress data
  const formattedActiveClientsPreview = await Promise.all(
    activeClientsPreview.map(async (client) => {
      // Get latest progress for this client
      const latestProgress = await Progress.findOne({
        memberId: client._id,
        trainerId,
      }).sort({ recordDate: -1 });

      // Calculate progress percentage based on goals
      let progress = 0;
      if (latestProgress && latestProgress.goals) {
        const goals = latestProgress.goals;
        const measurements = latestProgress.bodyMeasurements;

        // Simple progress calculation based on weight goal
        if (goals.targetWeight && measurements.weight) {
          const initialWeight = measurements.weight; // This is simplified; ideally track initial weight
          const targetWeight = goals.targetWeight;
          const currentWeight = measurements.weight;

          // Calculate progress as percentage towards goal
          if (initialWeight > targetWeight) {
            progress = Math.min(
              100,
              Math.max(0, ((initialWeight - currentWeight) / (initialWeight - targetWeight)) * 100)
            );
          } else if (initialWeight < targetWeight) {
            progress = Math.min(
              100,
              Math.max(0, ((currentWeight - initialWeight) / (targetWeight - initialWeight)) * 100)
            );
          }
        }
      }

      return {
        _id: client._id,
        id: client._id,
        name: client.fullName,
        photo: client.profileImage || 'https://via.placeholder.com/80',
        plan: client.membershipPlan || 'Standard',
        membershipPlan: client.membershipPlan || 'Standard',
        progress: Math.round(progress),
      };
    })
  );

  // Get monthly revenue data (last 12 months)
  const monthlyRevenueData = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

    const monthRevenue = await Session.aggregate([
      {
        $match: {
          trainerId: trainer._id,
          sessionDate: { $gte: monthStart, $lt: monthEnd },
          sessionStatus: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$price' },
        },
      },
    ]);

    monthlyRevenueData.push(monthRevenue[0]?.total || 0);
  }

  // Get pending tasks (placeholder - can be extended with actual task model)
  const pendingTasks = [
    {
      id: 1,
      task: 'Review member progress reports',
      priority: 'high',
      done: false,
    },
    {
      id: 2,
      task: 'Update workout plans',
      priority: 'medium',
      done: false,
    },
    {
      id: 3,
      task: 'Schedule client consultations',
      priority: 'medium',
      done: false,
    },
  ];

  const overview = {
    trainer: {
      id: trainer._id,
      fullName: trainer.fullName,
      email: trainer.email,
      specialization: trainer.specialization,
      experience: trainer.experience,
      rating: trainer.rating?.average || 0,
      assignedBranch: trainer.assignedBranch,
      trainerStatus: trainer.trainerStatus,
    },
    statistics: {
      totalMembers,
      activeMembers,
      todaySessions,
      upcomingSessions,
      activeWorkouts,
      activeDiets,
      monthlyAttendance,
      completedSessions,
      recentProgressUpdates,
      todayRevenue,
    },
    todaySchedule: formattedTodaySchedule,
    activeClientsPreview: formattedActiveClientsPreview,
    monthlyRevenue: monthlyRevenueData,
    pendingTasks,
  };

  ApiResponse.success(
    res,
    overview,
    'Dashboard overview retrieved successfully'
  );
});

/**
 * @desc    Get member analytics
 * @route   GET /api/trainer/dashboard/members
 * @access  Private (Trainer)
 */
const getMemberAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get trainer
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

  // Analytics
  const analytics = {
    total: members.length,
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
    newMembersThisMonth: 0,
  };

  // Count by fitness goal
  members.forEach((member) => {
    const goal = member.fitnessGoal || 'none';
    analytics.byFitnessGoal[goal] = (analytics.byFitnessGoal[goal] || 0) + 1;
  });

  // Count by membership plan
  members.forEach((member) => {
    const plan = member.membershipPlan || 'none';
    analytics.byMembershipPlan[plan] = (analytics.byMembershipPlan[plan] || 0) + 1;
  });

  // New members this month
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  analytics.newMembersThisMonth = trainer.assignedMembers.filter(
    (m) => new Date(m.assignedDate) >= firstDayOfMonth && m.status === 'active'
  ).length;

  ApiResponse.success(
    res,
    { analytics },
    'Member analytics retrieved successfully'
  );
});

/**
 * @desc    Get session analytics
 * @route   GET /api/trainer/dashboard/sessions
 * @access  Private (Trainer)
 */
const getSessionAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get all sessions
  const sessions = await Session.find({ trainerId });

  // This month's sessions
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const thisMonthSessions = sessions.filter(
    (s) => new Date(s.sessionDate) >= firstDayOfMonth
  );

  // Analytics
  const analytics = {
    total: sessions.length,
    thisMonth: thisMonthSessions.length,
    byType: {
      'personal-training': sessions.filter((s) => s.sessionType === 'personal-training').length,
      'group-class': sessions.filter((s) => s.sessionType === 'group-class').length,
      consultation: sessions.filter((s) => s.sessionType === 'consultation').length,
      assessment: sessions.filter((s) => s.sessionType === 'assessment').length,
    },
    byStatus: {
      scheduled: sessions.filter((s) => s.sessionStatus === 'scheduled').length,
      'in-progress': sessions.filter((s) => s.sessionStatus === 'in-progress').length,
      completed: sessions.filter((s) => s.sessionStatus === 'completed').length,
      cancelled: sessions.filter((s) => s.sessionStatus === 'cancelled').length,
      rescheduled: sessions.filter((s) => s.sessionStatus === 'rescheduled').length,
    },
    completionRate: 0,
    cancellationRate: 0,
    averageParticipants: 0,
  };

  // Calculate rates
  if (sessions.length > 0) {
    analytics.completionRate = Math.round(
      (analytics.byStatus.completed / sessions.length) * 100
    );
    analytics.cancellationRate = Math.round(
      (analytics.byStatus.cancelled / sessions.length) * 100
    );

    // Calculate average participants
    const totalParticipants = sessions.reduce(
      (sum, s) => sum + s.participants.filter((p) => p.bookingStatus === 'confirmed').length,
      0
    );
    analytics.averageParticipants = (totalParticipants / sessions.length).toFixed(1);
  }

  ApiResponse.success(
    res,
    { analytics },
    'Session analytics retrieved successfully'
  );
});

/**
 * @desc    Get attendance analytics
 * @route   GET /api/trainer/dashboard/attendance
 * @access  Private (Trainer)
 */
const getAttendanceAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // This month's attendance
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const attendance = await Attendance.find({
    trainerId,
    attendanceDate: { $gte: firstDayOfMonth },
  });

  // Analytics
  const analytics = {
    totalRecords: attendance.length,
    uniqueMembers: new Set(attendance.map((a) => a.memberId.toString())).size,
    byStatus: {
      present: attendance.filter((a) => a.attendanceStatus === 'present').length,
      absent: attendance.filter((a) => a.attendanceStatus === 'absent').length,
      late: attendance.filter((a) => a.attendanceStatus === 'late').length,
      leave: attendance.filter((a) => a.attendanceStatus === 'leave').length,
    },
    averageAttendancePerDay: 0,
    totalDuration: 0,
    averageDuration: 0,
  };

  // Calculate averages
  const daysInMonth = new Date().getDate();
  analytics.averageAttendancePerDay = (attendance.length / daysInMonth).toFixed(1);

  // Calculate duration
  const durationsWithCheckout = attendance.filter((a) => a.checkOutTime);
  if (durationsWithCheckout.length > 0) {
    analytics.totalDuration = durationsWithCheckout.reduce((sum, a) => sum + a.duration, 0);
    analytics.averageDuration = Math.round(analytics.totalDuration / durationsWithCheckout.length);
  }

  ApiResponse.success(
    res,
    { analytics },
    'Attendance analytics retrieved successfully'
  );
});

/**
 * @desc    Get workout analytics
 * @route   GET /api/trainer/dashboard/workouts
 * @access  Private (Trainer)
 */
const getWorkoutAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get all workouts
  const workouts = await WorkoutPlan.find({ trainerId });

  // Analytics
  const analytics = {
    total: workouts.length,
    byStatus: {
      active: workouts.filter((w) => w.status === 'active').length,
      completed: workouts.filter((w) => w.status === 'completed').length,
      paused: workouts.filter((w) => w.status === 'paused').length,
      cancelled: workouts.filter((w) => w.status === 'cancelled').length,
    },
    byCategory: {},
    byDifficulty: {
      beginner: workouts.filter((w) => w.difficultyLevel === 'beginner').length,
      intermediate: workouts.filter((w) => w.difficultyLevel === 'intermediate').length,
      advanced: workouts.filter((w) => w.difficultyLevel === 'advanced').length,
      expert: workouts.filter((w) => w.difficultyLevel === 'expert').length,
    },
    averageProgress: 0,
    completionRate: 0,
  };

  // Count by category
  workouts.forEach((workout) => {
    const category = workout.workoutCategory;
    analytics.byCategory[category] = (analytics.byCategory[category] || 0) + 1;
  });

  // Calculate averages
  if (workouts.length > 0) {
    const totalProgress = workouts.reduce((sum, w) => sum + w.progress, 0);
    analytics.averageProgress = Math.round(totalProgress / workouts.length);
    analytics.completionRate = Math.round(
      (analytics.byStatus.completed / workouts.length) * 100
    );
  }

  ApiResponse.success(
    res,
    { analytics },
    'Workout analytics retrieved successfully'
  );
});

/**
 * @desc    Get diet analytics
 * @route   GET /api/trainer/dashboard/diets
 * @access  Private (Trainer)
 */
const getDietAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get all diets
  const diets = await DietPlan.find({ trainerId });

  // Analytics
  const analytics = {
    total: diets.length,
    byStatus: {
      active: diets.filter((d) => d.status === 'active').length,
      completed: diets.filter((d) => d.status === 'completed').length,
      paused: diets.filter((d) => d.status === 'paused').length,
      cancelled: diets.filter((d) => d.status === 'cancelled').length,
    },
    byDietType: {},
    averageProgress: 0,
    averageAdherence: 0,
  };

  // Count by diet type
  diets.forEach((diet) => {
    const type = diet.dietType;
    analytics.byDietType[type] = (analytics.byDietType[type] || 0) + 1;
  });

  // Calculate averages
  if (diets.length > 0) {
    const totalProgress = diets.reduce((sum, d) => sum + d.progress, 0);
    const totalAdherence = diets.reduce((sum, d) => sum + d.adherenceRate, 0);
    analytics.averageProgress = Math.round(totalProgress / diets.length);
    analytics.averageAdherence = Math.round(totalAdherence / diets.length);
  }

  ApiResponse.success(
    res,
    { analytics },
    'Diet analytics retrieved successfully'
  );
});

/**
 * @desc    Get progress analytics
 * @route   GET /api/trainer/dashboard/progress
 * @access  Private (Trainer)
 */
const getProgressAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // This month's progress records
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const progressRecords = await Progress.find({
    trainerId,
    recordDate: { $gte: firstDayOfMonth },
  });

  // Analytics
  const analytics = {
    totalRecords: progressRecords.length,
    uniqueMembers: new Set(progressRecords.map((p) => p.memberId.toString())).size,
    averageRecordsPerMember: 0,
    photosUploaded: 0,
    strengthMetricsRecorded: 0,
  };

  // Calculate averages
  if (analytics.uniqueMembers > 0) {
    analytics.averageRecordsPerMember = (
      progressRecords.length / analytics.uniqueMembers
    ).toFixed(1);
  }

  // Count photos and strength metrics
  progressRecords.forEach((record) => {
    analytics.photosUploaded += record.progressPhotos.length;
    analytics.strengthMetricsRecorded += record.strengthMetrics.length;
  });

  ApiResponse.success(
    res,
    { analytics },
    'Progress analytics retrieved successfully'
  );
});

/**
 * @desc    Get trainer performance statistics
 * @route   GET /api/trainer/dashboard/performance
 * @access  Private (Trainer)
 */
const getPerformanceStats = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get trainer
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // This month's data
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  // Sessions completed this month
  const sessionsCompleted = await Session.countDocuments({
    trainerId,
    sessionDate: { $gte: firstDayOfMonth },
    sessionStatus: 'completed',
  });

  // Workouts created this month
  const workoutsCreated = await WorkoutPlan.countDocuments({
    trainerId,
    createdAt: { $gte: firstDayOfMonth },
  });

  // Diets created this month
  const dietsCreated = await DietPlan.countDocuments({
    trainerId,
    createdAt: { $gte: firstDayOfMonth },
  });

  // Progress records this month
  const progressRecords = await Progress.countDocuments({
    trainerId,
    recordDate: { $gte: firstDayOfMonth },
  });

  // Active members count
  const activeMembers = trainer.assignedMembers.filter((m) => m.status === 'active').length;

  const performance = {
    rating: trainer.rating,
    sessionsCompleted: trainer.sessionsCompleted,
    activeMembers,
    thisMonth: {
      sessionsCompleted,
      workoutsCreated,
      dietsCreated,
      progressRecords,
    },
  };

  ApiResponse.success(
    res,
    { performance },
    'Performance statistics retrieved successfully'
  );
});

/**
 * @desc    Get trainer ratings and reviews
 * @route   GET /api/trainer/dashboard/ratings
 * @access  Private (Trainer)
 */
const getRatings = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get trainer
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get all sessions with ratings
  const sessions = await Session.find({ trainerId })
    .populate('memberId', 'fullName profileImage')
    .select('sessionDate sessionType rating feedback')
    .sort({ sessionDate: -1 })
    .limit(50);

  // Filter sessions with ratings
  const ratedSessions = sessions.filter((s) => s.rating && s.rating > 0);

  // Calculate rating statistics
  const ratingStats = {
    averageRating: trainer.rating || 0,
    totalRatings: ratedSessions.length,
    ratingDistribution: {
      5: ratedSessions.filter((s) => s.rating === 5).length,
      4: ratedSessions.filter((s) => s.rating === 4).length,
      3: ratedSessions.filter((s) => s.rating === 3).length,
      2: ratedSessions.filter((s) => s.rating === 2).length,
      1: ratedSessions.filter((s) => s.rating === 1).length,
    },
  };

  // Get recent reviews
  const recentReviews = ratedSessions.map((s) => ({
    id: s._id,
    memberName: s.memberId?.fullName || 'Anonymous',
    memberImage: s.memberId?.profileImage || null,
    rating: s.rating,
    feedback: s.feedback || 'No feedback provided',
    date: s.sessionDate,
    sessionType: s.sessionType,
  }));

  ApiResponse.success(
    res,
    {
      ratingStats,
      recentReviews,
    },
    'Trainer ratings retrieved successfully'
  );
});

module.exports = {
  getDashboardOverview,
  getMemberAnalytics,
  getSessionAnalytics,
  getAttendanceAnalytics,
  getWorkoutAnalytics,
  getDietAnalytics,
  getProgressAnalytics,
  getPerformanceStats,
  getRatings,
};
