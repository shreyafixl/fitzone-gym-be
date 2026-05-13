const WorkoutPlan = require('../models/WorkoutPlan');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// WORKOUT PLAN MANAGEMENT
// ============================================================================

/**
 * @desc    Get all workout plans
 * @route   GET /api/workouts
 * @access  Private (Super Admin, Trainers)
 */
const getAllWorkoutPlans = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    memberId,
    trainerId,
    status,
    workoutCategory,
    difficultyLevel,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};
  if (memberId) query.memberId = memberId;
  if (trainerId) query.trainerId = trainerId;
  if (status && status !== 'all') query.status = status;
  if (workoutCategory && workoutCategory !== 'all') query.workoutCategory = workoutCategory;
  if (difficultyLevel && difficultyLevel !== 'all') query.difficultyLevel = difficultyLevel;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const workoutPlans = await WorkoutPlan.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await WorkoutPlan.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  // Get statistics
  const stats = {
    total: await WorkoutPlan.countDocuments(),
    active: await WorkoutPlan.countDocuments({ status: 'active' }),
    completed: await WorkoutPlan.countDocuments({ status: 'completed' }),
    paused: await WorkoutPlan.countDocuments({ status: 'paused' }),
    cancelled: await WorkoutPlan.countDocuments({ status: 'cancelled' }),
  };

  ApiResponse.success(
    res,
    {
      workoutPlans: workoutPlans.map((w) => w.getPublicProfile()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        perPage: limitNum,
      },
      stats,
    },
    'Workout plans retrieved successfully'
  );
});

/**
 * @desc    Get single workout plan
 * @route   GET /api/workouts/:id
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const getWorkoutPlanById = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .populate('createdBy', 'fullName email');

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  ApiResponse.success(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout plan retrieved successfully'
  );
});

/**
 * @desc    Get member's workout plans
 * @route   GET /api/workouts/member/:memberId
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const getMemberWorkoutPlans = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { status } = req.query;

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  const query = { memberId };
  if (status && status !== 'all') query.status = status;

  const workoutPlans = await WorkoutPlan.find(query)
    .populate('trainerId', 'fullName email')
    .sort({ createdAt: -1 });

  const activeWorkout = workoutPlans.find((w) => w.status === 'active');

  ApiResponse.success(
    res,
    {
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        membershipStatus: member.membershipStatus,
      },
      workoutPlans: workoutPlans.map((w) => w.getPublicProfile()),
      activeWorkout: activeWorkout ? activeWorkout.getPublicProfile() : null,
      totalWorkouts: workoutPlans.length,
    },
    'Member workout plans retrieved successfully'
  );
});

/**
 * @desc    Get trainer's assigned workout plans
 * @route   GET /api/workouts/trainer/:trainerId
 * @access  Private (Super Admin, Trainers - own)
 */
const getTrainerWorkoutPlans = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { status } = req.query;

  // Verify trainer exists
  const trainer = await User.findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') {
    throw ApiError.notFound('Trainer not found');
  }

  const query = { trainerId };
  if (status && status !== 'all') query.status = status;

  const workoutPlans = await WorkoutPlan.find(query)
    .populate('memberId', 'fullName email membershipStatus')
    .sort({ createdAt: -1 });

  ApiResponse.success(
    res,
    {
      trainer: {
        id: trainer._id,
        fullName: trainer.fullName,
        email: trainer.email,
      },
      workoutPlans: workoutPlans.map((w) => w.getPublicProfile()),
      totalWorkouts: workoutPlans.length,
    },
    'Trainer workout plans retrieved successfully'
  );
});

/**
 * @desc    Create workout plan
 * @route   POST /api/workouts
 * @access  Private (Super Admin, Trainers)
 */
const createWorkoutPlan = asyncHandler(async (req, res) => {
  const {
    memberId,
    trainerId,
    workoutTitle,
    workoutCategory,
    exercises,
    duration,
    difficultyLevel,
    targetMuscleGroups,
    goals,
    frequency,
    startDate,
    endDate,
    notes,
  } = req.body;

  // Validate required fields
  if (!memberId || !trainerId || !workoutTitle || !workoutCategory || !duration || !difficultyLevel) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Verify trainer exists
  const trainer = await User.findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') {
    throw ApiError.notFound('Trainer not found or invalid trainer role');
  }

  // Validate exercises if provided
  if (exercises && exercises.length > 0) {
    exercises.forEach((exercise, index) => {
      if (!exercise.exerciseName || !exercise.sets || !exercise.reps) {
        throw ApiError.badRequest(`Exercise at index ${index} is missing required fields`);
      }
    });
  }

  // Create workout plan
  const workoutPlan = await WorkoutPlan.create({
    memberId,
    trainerId,
    workoutTitle,
    workoutCategory,
    exercises: exercises || [],
    duration,
    difficultyLevel,
    targetMuscleGroups: targetMuscleGroups || [],
    goals: goals || [],
    frequency: frequency || '3 times per week',
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    notes: notes || null,
    status: 'active',
    progress: 0,
    createdBy: req.user.id,
  });

  await workoutPlan.populate('memberId', 'fullName email');
  await workoutPlan.populate('trainerId', 'fullName email');

  ApiResponse.created(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout plan created successfully'
  );
});

/**
 * @desc    Update workout plan
 * @route   PUT /api/workouts/:id
 * @access  Private (Super Admin, Trainers)
 */
const updateWorkoutPlan = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id);

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  const {
    workoutTitle,
    workoutCategory,
    exercises,
    duration,
    difficultyLevel,
    targetMuscleGroups,
    goals,
    frequency,
    startDate,
    endDate,
    status,
    progress,
    notes,
  } = req.body;

  // Update fields
  if (workoutTitle) workoutPlan.workoutTitle = workoutTitle;
  if (workoutCategory) workoutPlan.workoutCategory = workoutCategory;
  if (exercises) {
    // Validate exercises
    exercises.forEach((exercise, index) => {
      if (!exercise.exerciseName || !exercise.sets || !exercise.reps) {
        throw ApiError.badRequest(`Exercise at index ${index} is missing required fields`);
      }
    });
    workoutPlan.exercises = exercises;
  }
  if (duration) workoutPlan.duration = duration;
  if (difficultyLevel) workoutPlan.difficultyLevel = difficultyLevel;
  if (targetMuscleGroups) workoutPlan.targetMuscleGroups = targetMuscleGroups;
  if (goals) workoutPlan.goals = goals;
  if (frequency) workoutPlan.frequency = frequency;
  if (startDate) workoutPlan.startDate = new Date(startDate);
  if (endDate !== undefined) workoutPlan.endDate = endDate ? new Date(endDate) : null;
  if (status) workoutPlan.status = status;
  if (progress !== undefined) workoutPlan.progress = Math.min(100, Math.max(0, progress));
  if (notes !== undefined) workoutPlan.notes = notes;

  await workoutPlan.save();
  await workoutPlan.populate('memberId', 'fullName email');
  await workoutPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout plan updated successfully'
  );
});

/**
 * @desc    Update workout progress
 * @route   PATCH /api/workouts/:id/progress
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const updateWorkoutProgress = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id);

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  const { progress } = req.body;

  if (progress === undefined || progress < 0 || progress > 100) {
    throw ApiError.badRequest('Progress must be between 0 and 100');
  }

  await workoutPlan.updateProgress(progress);

  await workoutPlan.populate('memberId', 'fullName email');
  await workoutPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout progress updated successfully'
  );
});

/**
 * @desc    Complete workout plan
 * @route   PATCH /api/workouts/:id/complete
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const completeWorkoutPlan = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id);

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workoutPlan.complete();

  await workoutPlan.populate('memberId', 'fullName email');
  await workoutPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout plan marked as completed'
  );
});

/**
 * @desc    Pause workout plan
 * @route   PATCH /api/workouts/:id/pause
 * @access  Private (Super Admin, Trainers)
 */
const pauseWorkoutPlan = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id);

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  if (workoutPlan.status !== 'active') {
    throw ApiError.badRequest('Only active workout plans can be paused');
  }

  await workoutPlan.pause();

  await workoutPlan.populate('memberId', 'fullName email');
  await workoutPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout plan paused successfully'
  );
});

/**
 * @desc    Resume workout plan
 * @route   PATCH /api/workouts/:id/resume
 * @access  Private (Super Admin, Trainers)
 */
const resumeWorkoutPlan = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id);

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  if (workoutPlan.status !== 'paused') {
    throw ApiError.badRequest('Only paused workout plans can be resumed');
  }

  await workoutPlan.resume();

  await workoutPlan.populate('memberId', 'fullName email');
  await workoutPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { workoutPlan: workoutPlan.getPublicProfile() },
    'Workout plan resumed successfully'
  );
});

/**
 * @desc    Delete workout plan
 * @route   DELETE /api/workouts/:id
 * @access  Private (Super Admin, Trainers)
 */
const deleteWorkoutPlan = asyncHandler(async (req, res) => {
  const workoutPlan = await WorkoutPlan.findById(req.params.id);

  if (!workoutPlan) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workoutPlan.deleteOne();

  ApiResponse.success(res, null, 'Workout plan deleted successfully');
});

/**
 * @desc    Get workout statistics
 * @route   GET /api/workouts/stats/overview
 * @access  Private (Super Admin, Trainers)
 */
const getWorkoutStats = asyncHandler(async (req, res) => {
  const { trainerId, memberId } = req.query;

  const query = {};
  if (trainerId) query.trainerId = trainerId;
  if (memberId) query.memberId = memberId;

  const stats = {
    total: await WorkoutPlan.countDocuments(query),
    active: await WorkoutPlan.countDocuments({ ...query, status: 'active' }),
    completed: await WorkoutPlan.countDocuments({ ...query, status: 'completed' }),
    paused: await WorkoutPlan.countDocuments({ ...query, status: 'paused' }),
    cancelled: await WorkoutPlan.countDocuments({ ...query, status: 'cancelled' }),
  };

  // Category breakdown
  const categoryBreakdown = await WorkoutPlan.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$workoutCategory',
        count: { $sum: 1 },
      },
    },
  ]);

  // Difficulty breakdown
  const difficultyBreakdown = await WorkoutPlan.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$difficultyLevel',
        count: { $sum: 1 },
      },
    },
  ]);

  // Average progress
  const avgProgress = await WorkoutPlan.aggregate([
    { $match: { ...query, status: 'active' } },
    {
      $group: {
        _id: null,
        avgProgress: { $avg: '$progress' },
      },
    },
  ]);

  ApiResponse.success(
    res,
    {
      stats,
      categoryBreakdown,
      difficultyBreakdown,
      averageProgress: avgProgress.length > 0 ? Math.round(avgProgress[0].avgProgress) : 0,
    },
    'Workout statistics retrieved successfully'
  );
});

module.exports = {
  getAllWorkoutPlans,
  getWorkoutPlanById,
  getMemberWorkoutPlans,
  getTrainerWorkoutPlans,
  createWorkoutPlan,
  updateWorkoutPlan,
  updateWorkoutProgress,
  completeWorkoutPlan,
  pauseWorkoutPlan,
  resumeWorkoutPlan,
  deleteWorkoutPlan,
  getWorkoutStats,
};
