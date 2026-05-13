const DietPlan = require('../models/DietPlan');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// DIET PLAN MANAGEMENT
// ============================================================================

/**
 * @desc    Get all diet plans
 * @route   GET /api/diets
 * @access  Private (Super Admin, Trainers)
 */
const getAllDietPlans = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    memberId,
    trainerId,
    status,
    dietType,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};
  if (memberId) query.memberId = memberId;
  if (trainerId) query.trainerId = trainerId;
  if (status && status !== 'all') query.status = status;
  if (dietType && dietType !== 'all') query.dietType = dietType;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const dietPlans = await DietPlan.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await DietPlan.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  // Get statistics
  const stats = {
    total: await DietPlan.countDocuments(),
    active: await DietPlan.countDocuments({ status: 'active' }),
    completed: await DietPlan.countDocuments({ status: 'completed' }),
    paused: await DietPlan.countDocuments({ status: 'paused' }),
    cancelled: await DietPlan.countDocuments({ status: 'cancelled' }),
  };

  ApiResponse.success(
    res,
    {
      dietPlans: dietPlans.map((d) => d.getPublicProfile()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        perPage: limitNum,
      },
      stats,
    },
    'Diet plans retrieved successfully'
  );
});

/**
 * @desc    Get single diet plan
 * @route   GET /api/diets/:id
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const getDietPlanById = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('trainerId', 'fullName email')
    .populate('createdBy', 'fullName email');

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet plan retrieved successfully'
  );
});

/**
 * @desc    Get member's diet plans
 * @route   GET /api/diets/member/:memberId
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const getMemberDietPlans = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { status } = req.query;

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  const query = { memberId };
  if (status && status !== 'all') query.status = status;

  const dietPlans = await DietPlan.find(query)
    .populate('trainerId', 'fullName email')
    .sort({ createdAt: -1 });

  const activeDiet = dietPlans.find((d) => d.status === 'active');

  ApiResponse.success(
    res,
    {
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        membershipStatus: member.membershipStatus,
      },
      dietPlans: dietPlans.map((d) => d.getPublicProfile()),
      activeDiet: activeDiet ? activeDiet.getPublicProfile() : null,
      totalDiets: dietPlans.length,
    },
    'Member diet plans retrieved successfully'
  );
});

/**
 * @desc    Get trainer's assigned diet plans
 * @route   GET /api/diets/trainer/:trainerId
 * @access  Private (Super Admin, Trainers - own)
 */
const getTrainerDietPlans = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { status } = req.query;

  // Verify trainer exists
  const trainer = await User.findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') {
    throw ApiError.notFound('Trainer not found');
  }

  const query = { trainerId };
  if (status && status !== 'all') query.status = status;

  const dietPlans = await DietPlan.find(query)
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
      dietPlans: dietPlans.map((d) => d.getPublicProfile()),
      totalDiets: dietPlans.length,
    },
    'Trainer diet plans retrieved successfully'
  );
});

/**
 * @desc    Create diet plan
 * @route   POST /api/diets
 * @access  Private (Super Admin, Trainers)
 */
const createDietPlan = asyncHandler(async (req, res) => {
  const {
    memberId,
    trainerId,
    dietTitle,
    dietType,
    mealSchedule,
    calorieTarget,
    nutritionNotes,
    restrictions,
    supplements,
    hydrationGoal,
    startDate,
    endDate,
    duration,
    notes,
  } = req.body;

  // Validate required fields
  if (!memberId || !trainerId || !dietTitle || !calorieTarget || !calorieTarget.daily) {
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

  // Validate meal schedule if provided
  if (mealSchedule && mealSchedule.length > 0) {
    mealSchedule.forEach((meal, index) => {
      if (!meal.mealName || !meal.time) {
        throw ApiError.badRequest(`Meal at index ${index} is missing required fields`);
      }
      if (meal.foods && meal.foods.length > 0) {
        meal.foods.forEach((food, foodIndex) => {
          if (!food.foodItem || !food.quantity) {
            throw ApiError.badRequest(`Food at meal ${index}, food ${foodIndex} is missing required fields`);
          }
        });
      }
    });
  }

  // Create diet plan
  const dietPlan = await DietPlan.create({
    memberId,
    trainerId,
    dietTitle,
    dietType: dietType || 'balanced',
    mealSchedule: mealSchedule || [],
    calorieTarget: {
      daily: calorieTarget.daily,
      protein: calorieTarget.protein || 0,
      carbs: calorieTarget.carbs || 0,
      fats: calorieTarget.fats || 0,
    },
    nutritionNotes: nutritionNotes || null,
    restrictions: restrictions || [],
    supplements: supplements || [],
    hydrationGoal: hydrationGoal || 3,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    duration: duration || 30,
    notes: notes || null,
    status: 'active',
    progress: 0,
    adherenceRate: 0,
    createdBy: req.user.id,
  });

  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.created(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet plan created successfully'
  );
});

/**
 * @desc    Update diet plan
 * @route   PUT /api/diets/:id
 * @access  Private (Super Admin, Trainers)
 */
const updateDietPlan = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  const {
    dietTitle,
    dietType,
    mealSchedule,
    calorieTarget,
    nutritionNotes,
    restrictions,
    supplements,
    hydrationGoal,
    startDate,
    endDate,
    duration,
    status,
    progress,
    adherenceRate,
    notes,
  } = req.body;

  // Update fields
  if (dietTitle) dietPlan.dietTitle = dietTitle;
  if (dietType) dietPlan.dietType = dietType;
  if (mealSchedule) {
    // Validate meal schedule
    mealSchedule.forEach((meal, index) => {
      if (!meal.mealName || !meal.time) {
        throw ApiError.badRequest(`Meal at index ${index} is missing required fields`);
      }
      if (meal.foods && meal.foods.length > 0) {
        meal.foods.forEach((food, foodIndex) => {
          if (!food.foodItem || !food.quantity) {
            throw ApiError.badRequest(`Food at meal ${index}, food ${foodIndex} is missing required fields`);
          }
        });
      }
    });
    dietPlan.mealSchedule = mealSchedule;
  }
  if (calorieTarget) {
    if (calorieTarget.daily) dietPlan.calorieTarget.daily = calorieTarget.daily;
    if (calorieTarget.protein !== undefined) dietPlan.calorieTarget.protein = calorieTarget.protein;
    if (calorieTarget.carbs !== undefined) dietPlan.calorieTarget.carbs = calorieTarget.carbs;
    if (calorieTarget.fats !== undefined) dietPlan.calorieTarget.fats = calorieTarget.fats;
  }
  if (nutritionNotes !== undefined) dietPlan.nutritionNotes = nutritionNotes;
  if (restrictions) dietPlan.restrictions = restrictions;
  if (supplements) dietPlan.supplements = supplements;
  if (hydrationGoal) dietPlan.hydrationGoal = hydrationGoal;
  if (startDate) dietPlan.startDate = new Date(startDate);
  if (endDate !== undefined) dietPlan.endDate = endDate ? new Date(endDate) : null;
  if (duration) dietPlan.duration = duration;
  if (status) dietPlan.status = status;
  if (progress !== undefined) dietPlan.progress = Math.min(100, Math.max(0, progress));
  if (adherenceRate !== undefined) dietPlan.adherenceRate = Math.min(100, Math.max(0, adherenceRate));
  if (notes !== undefined) dietPlan.notes = notes;

  await dietPlan.save();
  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet plan updated successfully'
  );
});

/**
 * @desc    Update diet progress
 * @route   PATCH /api/diets/:id/progress
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const updateDietProgress = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  const { progress } = req.body;

  if (progress === undefined || progress < 0 || progress > 100) {
    throw ApiError.badRequest('Progress must be between 0 and 100');
  }

  await dietPlan.updateProgress(progress);

  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet progress updated successfully'
  );
});

/**
 * @desc    Update diet adherence
 * @route   PATCH /api/diets/:id/adherence
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const updateDietAdherence = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  const { adherenceRate } = req.body;

  if (adherenceRate === undefined || adherenceRate < 0 || adherenceRate > 100) {
    throw ApiError.badRequest('Adherence rate must be between 0 and 100');
  }

  await dietPlan.updateAdherence(adherenceRate);

  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet adherence updated successfully'
  );
});

/**
 * @desc    Complete diet plan
 * @route   PATCH /api/diets/:id/complete
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const completeDietPlan = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  await dietPlan.complete();

  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet plan marked as completed'
  );
});

/**
 * @desc    Pause diet plan
 * @route   PATCH /api/diets/:id/pause
 * @access  Private (Super Admin, Trainers)
 */
const pauseDietPlan = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  if (dietPlan.status !== 'active') {
    throw ApiError.badRequest('Only active diet plans can be paused');
  }

  await dietPlan.pause();

  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet plan paused successfully'
  );
});

/**
 * @desc    Resume diet plan
 * @route   PATCH /api/diets/:id/resume
 * @access  Private (Super Admin, Trainers)
 */
const resumeDietPlan = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  if (dietPlan.status !== 'paused') {
    throw ApiError.badRequest('Only paused diet plans can be resumed');
  }

  await dietPlan.resume();

  await dietPlan.populate('memberId', 'fullName email');
  await dietPlan.populate('trainerId', 'fullName email');

  ApiResponse.success(
    res,
    { dietPlan: dietPlan.getPublicProfile() },
    'Diet plan resumed successfully'
  );
});

/**
 * @desc    Delete diet plan
 * @route   DELETE /api/diets/:id
 * @access  Private (Super Admin, Trainers)
 */
const deleteDietPlan = asyncHandler(async (req, res) => {
  const dietPlan = await DietPlan.findById(req.params.id);

  if (!dietPlan) {
    throw ApiError.notFound('Diet plan not found');
  }

  await dietPlan.deleteOne();

  ApiResponse.success(res, null, 'Diet plan deleted successfully');
});

/**
 * @desc    Get diet statistics
 * @route   GET /api/diets/stats/overview
 * @access  Private (Super Admin, Trainers)
 */
const getDietStats = asyncHandler(async (req, res) => {
  const { trainerId, memberId } = req.query;

  const query = {};
  if (trainerId) query.trainerId = trainerId;
  if (memberId) query.memberId = memberId;

  const stats = {
    total: await DietPlan.countDocuments(query),
    active: await DietPlan.countDocuments({ ...query, status: 'active' }),
    completed: await DietPlan.countDocuments({ ...query, status: 'completed' }),
    paused: await DietPlan.countDocuments({ ...query, status: 'paused' }),
    cancelled: await DietPlan.countDocuments({ ...query, status: 'cancelled' }),
  };

  // Diet type breakdown
  const dietTypeBreakdown = await DietPlan.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$dietType',
        count: { $sum: 1 },
      },
    },
  ]);

  // Average adherence
  const avgAdherence = await DietPlan.aggregate([
    { $match: { ...query, status: 'active' } },
    {
      $group: {
        _id: null,
        avgAdherence: { $avg: '$adherenceRate' },
      },
    },
  ]);

  // Average progress
  const avgProgress = await DietPlan.aggregate([
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
      dietTypeBreakdown,
      averageAdherence: avgAdherence.length > 0 ? Math.round(avgAdherence[0].avgAdherence) : 0,
      averageProgress: avgProgress.length > 0 ? Math.round(avgProgress[0].avgProgress) : 0,
    },
    'Diet statistics retrieved successfully'
  );
});

module.exports = {
  getAllDietPlans,
  getDietPlanById,
  getMemberDietPlans,
  getTrainerDietPlans,
  createDietPlan,
  updateDietPlan,
  updateDietProgress,
  updateDietAdherence,
  completeDietPlan,
  pauseDietPlan,
  resumeDietPlan,
  deleteDietPlan,
  getDietStats,
};
