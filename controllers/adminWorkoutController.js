const mongoose = require('mongoose');
const WorkoutPlan = require('../models/WorkoutPlan');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all workout plans with filtering
 * @route   GET /api/admin/workouts
 * @access  Private (Admin)
 */
const getAllWorkouts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    memberId,
    trainerId,
    status,
    workoutCategory,
    difficultyLevel,
    sortBy = 'createdAt',
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

  if (status) {
    query.status = status;
  }

  if (workoutCategory) {
    query.workoutCategory = workoutCategory;
  }

  if (difficultyLevel) {
    query.difficultyLevel = difficultyLevel;
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const workouts = await WorkoutPlan.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email phone')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Add exercise count
  const workoutsWithDetails = workouts.map(workout => ({
    ...workout,
    exerciseCount: workout.exercises ? workout.exercises.length : 0
  }));

  // Get total count
  const totalWorkouts = await WorkoutPlan.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalWorkouts / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      workouts: workoutsWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalWorkouts,
        limit: limitNum,
        hasMore
      }
    },
    'Workout plans retrieved successfully'
  );
});

/**
 * @desc    Create workout plan
 * @route   POST /api/admin/workouts
 * @access  Private (Admin)
 */
const createWorkout = asyncHandler(async (req, res) => {
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
    isPublic
  } = req.body;

  // Validate required fields
  if (!memberId || !trainerId || !workoutTitle || !workoutCategory || !exercises || !duration || !difficultyLevel) {
    throw ApiError.badRequest('Please provide all required fields: memberId, trainerId, workoutTitle, workoutCategory, exercises, duration, difficultyLevel');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member || member.role !== 'member') {
    throw ApiError.badRequest('Invalid member ID or user is not a member');
  }

  // Verify trainer exists
  const trainer = await User.findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') {
    throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
  }

  // Validate exercises array
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw ApiError.badRequest('Please provide at least one exercise');
  }

  // Validate each exercise
  exercises.forEach((exercise, index) => {
    if (!exercise.exerciseName || !exercise.sets || !exercise.reps) {
      throw ApiError.badRequest(`Exercise at index ${index} is missing required fields: exerciseName, sets, reps`);
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
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    notes,
    isPublic: isPublic || false,
    createdBy: req.user.id
  });

  // Populate and return
  const createdWorkout = await WorkoutPlan.findById(workout._id)
    .populate('memberId', 'fullName email phone')
    .populate('trainerId', 'fullName email phone');

  ApiResponse.success(
    res,
    { workout: createdWorkout },
    'Workout plan created successfully',
    201
  );
});

/**
 * @desc    Update workout plan
 * @route   PUT /api/admin/workouts/:id
 * @access  Private (Admin)
 */
const updateWorkout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find workout
  const workout = await WorkoutPlan.findById(id);
  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  // Verify trainer if being updated
  if (updateData.trainerId) {
    const trainer = await User.findById(updateData.trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
    }
  }

  // Verify member if being updated
  if (updateData.memberId) {
    const member = await User.findById(updateData.memberId);
    if (!member || member.role !== 'member') {
      throw ApiError.badRequest('Invalid member ID or user is not a member');
    }
  }

  // Validate exercises if being updated
  if (updateData.exercises) {
    if (!Array.isArray(updateData.exercises) || updateData.exercises.length === 0) {
      throw ApiError.badRequest('Please provide at least one exercise');
    }

    updateData.exercises.forEach((exercise, index) => {
      if (!exercise.exerciseName || !exercise.sets || !exercise.reps) {
        throw ApiError.badRequest(`Exercise at index ${index} is missing required fields: exerciseName, sets, reps`);
      }
    });
  }

  // Update workout
  const updatedWorkout = await WorkoutPlan.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate('memberId', 'fullName email phone')
    .populate('trainerId', 'fullName email phone');

  ApiResponse.success(
    res,
    { workout: updatedWorkout },
    'Workout plan updated successfully'
  );
});

/**
 * @desc    Delete workout plan
 * @route   DELETE /api/admin/workouts/:id
 * @access  Private (Admin)
 */
const deleteWorkout = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find and delete workout
  const workout = await WorkoutPlan.findById(id);
  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  await WorkoutPlan.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { workoutId: id },
    'Workout plan deleted successfully'
  );
});

/**
 * @desc    Assign workout to member
 * @route   POST /api/admin/workouts/:id/assign
 * @access  Private (Admin)
 */
const assignWorkout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberId, trainerId } = req.body;

  // Validate required fields
  if (!memberId) {
    throw ApiError.badRequest('Please provide memberId');
  }

  // Find workout
  const workout = await WorkoutPlan.findById(id);
  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member || member.role !== 'member') {
    throw ApiError.badRequest('Invalid member ID or user is not a member');
  }

  // Verify trainer if provided
  if (trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Invalid trainer ID or user is not a trainer');
    }
  }

  // Create a copy of the workout for the new member
  const newWorkout = await WorkoutPlan.create({
    memberId,
    trainerId: trainerId || workout.trainerId,
    workoutTitle: workout.workoutTitle,
    workoutCategory: workout.workoutCategory,
    exercises: workout.exercises,
    duration: workout.duration,
    difficultyLevel: workout.difficultyLevel,
    targetMuscleGroups: workout.targetMuscleGroups,
    goals: workout.goals,
    frequency: workout.frequency,
    startDate: new Date(),
    endDate: workout.endDate,
    notes: workout.notes,
    isPublic: workout.isPublic,
    createdBy: req.user.id
  });

  // Populate and return
  const assignedWorkout = await WorkoutPlan.findById(newWorkout._id)
    .populate('memberId', 'fullName email phone')
    .populate('trainerId', 'fullName email phone');

  ApiResponse.success(
    res,
    { workout: assignedWorkout },
    'Workout plan assigned successfully',
    201
  );
});

/**
 * @desc    Get workout statistics
 * @route   GET /api/admin/workouts/stats
 * @access  Private (Admin)
 */
const getWorkoutStats = asyncHandler(async (req, res) => {
  const { trainerId, memberId, period = 'month' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    startDate = new Date(0);
  }

  // Build match query
  const matchQuery = {
    createdAt: { $gte: startDate }
  };

  if (trainerId) {
    matchQuery.trainerId = mongoose.Types.ObjectId(trainerId);
  }

  if (memberId) {
    matchQuery.memberId = mongoose.Types.ObjectId(memberId);
  }

  // Total workouts
  const totalWorkouts = await WorkoutPlan.countDocuments();
  const activeWorkouts = await WorkoutPlan.countDocuments({ status: 'active' });
  const completedWorkouts = await WorkoutPlan.countDocuments({ status: 'completed' });
  const pausedWorkouts = await WorkoutPlan.countDocuments({ status: 'paused' });
  const cancelledWorkouts = await WorkoutPlan.countDocuments({ status: 'cancelled' });

  // New workouts in period
  const newWorkouts = await WorkoutPlan.countDocuments(matchQuery);

  // Workouts by category
  const workoutsByCategory = await WorkoutPlan.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$workoutCategory',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Workouts by difficulty
  const workoutsByDifficulty = await WorkoutPlan.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$difficultyLevel',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Average progress
  const avgProgressResult = await WorkoutPlan.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  const avgProgress = avgProgressResult.length > 0 ? Math.round(avgProgressResult[0].avgProgress) : 0;

  // Top trainers by workout count
  const topTrainers = await WorkoutPlan.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$trainerId',
        workoutCount: { $sum: 1 }
      }
    },
    { $sort: { workoutCount: -1 } },
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

  // Members with workouts
  const membersWithWorkouts = await WorkoutPlan.distinct('memberId', { status: 'active' });
  const totalMembers = await User.countDocuments({ role: 'member' });

  // Average exercises per workout
  const avgExercisesResult = await WorkoutPlan.aggregate([
    { $match: { status: 'active' } },
    {
      $project: {
        exerciseCount: { $size: '$exercises' }
      }
    },
    {
      $group: {
        _id: null,
        avgExercises: { $avg: '$exerciseCount' }
      }
    }
  ]);

  const avgExercises = avgExercisesResult.length > 0 ? Math.round(avgExercisesResult[0].avgExercises) : 0;

  // Completion rate
  const completionRate = totalWorkouts > 0 
    ? ((completedWorkouts / totalWorkouts) * 100).toFixed(2)
    : 0;

  ApiResponse.success(
    res,
    {
      period,
      summary: {
        totalWorkouts,
        activeWorkouts,
        completedWorkouts,
        pausedWorkouts,
        cancelledWorkouts,
        newWorkouts,
        averageProgress: avgProgress,
        averageExercises: avgExercises,
        completionRate: parseFloat(completionRate)
      },
      engagement: {
        membersWithWorkouts: membersWithWorkouts.length,
        totalMembers,
        engagementRate: totalMembers > 0 
          ? ((membersWithWorkouts.length / totalMembers) * 100).toFixed(2)
          : 0
      },
      byCategory: workoutsByCategory.map(item => ({
        category: item._id,
        count: item.count,
        percentage: ((item.count / activeWorkouts) * 100).toFixed(2)
      })),
      byDifficulty: workoutsByDifficulty.map(item => ({
        difficulty: item._id,
        count: item.count,
        percentage: ((item.count / activeWorkouts) * 100).toFixed(2)
      })),
      topTrainers: topTrainers.map(item => ({
        trainerId: item._id,
        trainerName: item.trainerInfo.fullName,
        trainerEmail: item.trainerInfo.email,
        workoutCount: item.workoutCount
      }))
    },
    'Workout statistics retrieved successfully'
  );
});

/**
 * @desc    Get workout by ID
 * @route   GET /api/admin/workouts/:id
 * @access  Private (Admin)
 */
const getWorkoutById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const workout = await WorkoutPlan.findById(id)
    .populate('memberId', 'fullName email phone membershipStatus age gender fitnessGoal')
    .populate('trainerId', 'fullName email phone specialization')
    .lean();

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  // Add exercise count
  const workoutWithDetails = {
    ...workout,
    exerciseCount: workout.exercises ? workout.exercises.length : 0
  };

  ApiResponse.success(
    res,
    { workout: workoutWithDetails },
    'Workout plan retrieved successfully'
  );
});

module.exports = {
  getAllWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  assignWorkout,
  getWorkoutStats,
  getWorkoutById,
};
