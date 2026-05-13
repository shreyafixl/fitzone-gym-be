const WorkoutPlan = require('../models/WorkoutPlan');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all workout plans created by trainer
 * @route   GET /api/trainer/workouts
 * @access  Private (Trainer)
 */
const getAllWorkouts = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filters
  const filters = { trainerId };

  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.category) {
    filters.workoutCategory = req.query.category;
  }
  if (req.query.difficulty) {
    filters.difficultyLevel = req.query.difficulty;
  }
  if (req.query.memberId) {
    filters.memberId = req.query.memberId;
  }

  // Search
  if (req.query.search) {
    filters.workoutTitle = { $regex: req.query.search, $options: 'i' };
  }

  // Sorting
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // Get workouts
  const workouts = await WorkoutPlan.find(filters)
    .populate('memberId', 'fullName email phone membershipStatus')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalWorkouts = await WorkoutPlan.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      workouts: workouts.map((w) => w.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalWorkouts / limit),
        totalWorkouts,
        limit,
        hasMore: page < Math.ceil(totalWorkouts / limit),
      },
    },
    'Workout plans retrieved successfully'
  );
});

/**
 * @desc    Get workout plan by ID
 * @route   GET /api/trainer/workouts/:id
 * @access  Private (Trainer)
 */
const getWorkoutById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  })
    .populate('memberId', 'fullName email phone gender age fitnessGoal membershipStatus')
    .populate('trainerId', 'fullName email specialization');

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan retrieved successfully'
  );
});

/**
 * @desc    Create new workout plan
 * @route   POST /api/trainer/workouts
 * @access  Private (Trainer)
 */
const createWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const {
    memberId,
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
  if (!memberId || !workoutTitle || !workoutCategory || !exercises || !duration || !difficultyLevel) {
    throw ApiError.badRequest(
      'Please provide memberId, workoutTitle, workoutCategory, exercises, duration, and difficultyLevel'
    );
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

  // Validate exercises array
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw ApiError.badRequest('Please provide at least one exercise');
  }

  // Validate each exercise
  exercises.forEach((exercise, index) => {
    if (!exercise.exerciseName || !exercise.sets || !exercise.reps) {
      throw ApiError.badRequest(
        `Exercise at index ${index} is missing required fields (exerciseName, sets, reps)`
      );
    }
  });

  // Create workout plan
  const workout = await WorkoutPlan.create({
    memberId,
    trainerId,
    workoutTitle,
    workoutCategory,
    exercises,
    duration,
    difficultyLevel,
    targetMuscleGroups: targetMuscleGroups || [],
    goals: goals || [],
    frequency: frequency || '3 times per week',
    startDate: startDate || Date.now(),
    endDate: endDate || null,
    notes: notes || null,
    status: 'active',
    progress: 0,
    createdBy: trainerId,
  });

  // Populate member details
  await workout.populate('memberId', 'fullName email phone');

  ApiResponse.created(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan created successfully'
  );
});

/**
 * @desc    Update workout plan
 * @route   PUT /api/trainer/workouts/:id
 * @access  Private (Trainer)
 */
const updateWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  // Find workout
  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
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
  if (workoutTitle) workout.workoutTitle = workoutTitle;
  if (workoutCategory) workout.workoutCategory = workoutCategory;
  if (exercises) {
    // Validate exercises array
    if (!Array.isArray(exercises) || exercises.length === 0) {
      throw ApiError.badRequest('Please provide at least one exercise');
    }
    workout.exercises = exercises;
  }
  if (duration) workout.duration = duration;
  if (difficultyLevel) workout.difficultyLevel = difficultyLevel;
  if (targetMuscleGroups) workout.targetMuscleGroups = targetMuscleGroups;
  if (goals) workout.goals = goals;
  if (frequency) workout.frequency = frequency;
  if (startDate) workout.startDate = startDate;
  if (endDate !== undefined) workout.endDate = endDate;
  if (status) workout.status = status;
  if (progress !== undefined) workout.progress = progress;
  if (notes !== undefined) workout.notes = notes;

  await workout.save();

  // Populate member details
  await workout.populate('memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan updated successfully'
  );
});

/**
 * @desc    Delete workout plan
 * @route   DELETE /api/trainer/workouts/:id
 * @access  Private (Trainer)
 */
const deleteWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workout.deleteOne();

  ApiResponse.success(res, null, 'Workout plan deleted successfully');
});

/**
 * @desc    Assign workout to member
 * @route   POST /api/trainer/workouts/:id/assign
 * @access  Private (Trainer)
 */
const assignWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;
  const { memberId } = req.body;

  if (!memberId) {
    throw ApiError.badRequest('Please provide memberId');
  }

  // Find workout
  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
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

  // Update workout assignment
  workout.memberId = memberId;
  workout.status = 'active';
  workout.startDate = Date.now();
  await workout.save();

  // Populate member details
  await workout.populate('memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan assigned successfully'
  );
});

/**
 * @desc    Update workout progress
 * @route   PUT /api/trainer/workouts/:id/progress
 * @access  Private (Trainer)
 */
const updateProgress = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;
  const { progress } = req.body;

  if (progress === undefined || progress === null) {
    throw ApiError.badRequest('Please provide progress value');
  }

  if (progress < 0 || progress > 100) {
    throw ApiError.badRequest('Progress must be between 0 and 100');
  }

  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workout.updateProgress(progress);

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout progress updated successfully'
  );
});

/**
 * @desc    Pause workout plan
 * @route   PUT /api/trainer/workouts/:id/pause
 * @access  Private (Trainer)
 */
const pauseWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workout.pause();

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan paused successfully'
  );
});

/**
 * @desc    Resume workout plan
 * @route   PUT /api/trainer/workouts/:id/resume
 * @access  Private (Trainer)
 */
const resumeWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workout.resume();

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan resumed successfully'
  );
});

/**
 * @desc    Complete workout plan
 * @route   PUT /api/trainer/workouts/:id/complete
 * @access  Private (Trainer)
 */
const completeWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  await workout.complete();

  ApiResponse.success(
    res,
    { workout: workout.getPublicProfile() },
    'Workout plan completed successfully'
  );
});

/**
 * @desc    Get workout statistics
 * @route   GET /api/trainer/workouts/stats
 * @access  Private (Trainer)
 */
const getWorkoutStats = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get all workouts for trainer
  const workouts = await WorkoutPlan.find({ trainerId });

  // Calculate statistics
  const stats = {
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
    totalExercises: 0,
  };

  // Count by category
  workouts.forEach((workout) => {
    const category = workout.workoutCategory;
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    stats.totalExercises += workout.exercises.length;
  });

  // Calculate average progress
  if (workouts.length > 0) {
    const totalProgress = workouts.reduce((sum, w) => sum + w.progress, 0);
    stats.averageProgress = Math.round(totalProgress / workouts.length);
  }

  ApiResponse.success(
    res,
    { stats },
    'Workout statistics retrieved successfully'
  );
});

/**
 * @desc    Get weekly workout schedule
 * @route   GET /api/trainer/workouts/schedule
 * @access  Private (Trainer)
 */
const getWeeklySchedule = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get date range for current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Get active workouts
  const workouts = await WorkoutPlan.find({
    trainerId,
    status: 'active',
    startDate: { $lte: endOfWeek },
    $or: [
      { endDate: null },
      { endDate: { $gte: startOfWeek } },
    ],
  })
    .populate('memberId', 'fullName email phone profileImage')
    .sort({ startDate: 1 });

  // Organize by day of week
  const schedule = {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  };

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  workouts.forEach((workout) => {
    // Parse frequency to determine which days
    // For simplicity, distribute evenly across the week
    // In production, you'd have a more sophisticated scheduling system
    const frequency = workout.frequency.toLowerCase();
    
    if (frequency.includes('daily') || frequency.includes('7')) {
      days.forEach((day) => {
        schedule[day].push(workout.getPublicProfile());
      });
    } else if (frequency.includes('3')) {
      // Monday, Wednesday, Friday
      schedule.monday.push(workout.getPublicProfile());
      schedule.wednesday.push(workout.getPublicProfile());
      schedule.friday.push(workout.getPublicProfile());
    } else if (frequency.includes('5')) {
      // Monday to Friday
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
        schedule[day].push(workout.getPublicProfile());
      });
    } else {
      // Default to 3 days
      schedule.monday.push(workout.getPublicProfile());
      schedule.wednesday.push(workout.getPublicProfile());
      schedule.friday.push(workout.getPublicProfile());
    }
  });

  ApiResponse.success(
    res,
    { schedule, weekStart: startOfWeek, weekEnd: endOfWeek },
    'Weekly workout schedule retrieved successfully'
  );
});

/**
 * @desc    Duplicate workout plan
 * @route   POST /api/trainer/workouts/:id/duplicate
 * @access  Private (Trainer)
 */
const duplicateWorkout = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const workoutId = req.params.id;

  const originalWorkout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  });

  if (!originalWorkout) {
    throw ApiError.notFound('Workout plan not found');
  }

  // Create duplicate
  const duplicateData = originalWorkout.toObject();
  delete duplicateData._id;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;
  
  duplicateData.workoutTitle = `${duplicateData.workoutTitle} (Copy)`;
  duplicateData.status = 'active';
  duplicateData.progress = 0;
  duplicateData.startDate = Date.now();
  duplicateData.endDate = null;

  const newWorkout = await WorkoutPlan.create(duplicateData);

  // Populate member details
  await newWorkout.populate('memberId', 'fullName email phone');

  ApiResponse.created(
    res,
    { workout: newWorkout.getPublicProfile() },
    'Workout plan duplicated successfully'
  );
});

module.exports = {
  getAllWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  assignWorkout,
  updateProgress,
  pauseWorkout,
  resumeWorkout,
  completeWorkout,
  getWorkoutStats,
  getWeeklySchedule,
  duplicateWorkout,
};
