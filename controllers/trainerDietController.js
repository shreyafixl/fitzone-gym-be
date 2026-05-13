const DietPlan = require('../models/DietPlan');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all diet plans created by trainer
 * @route   GET /api/trainer/diets
 * @access  Private (Trainer)
 */
const getAllDiets = asyncHandler(async (req, res) => {
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
  if (req.query.dietType) {
    filters.dietType = req.query.dietType;
  }
  if (req.query.memberId) {
    filters.memberId = req.query.memberId;
  }

  // Search
  if (req.query.search) {
    filters.dietTitle = { $regex: req.query.search, $options: 'i' };
  }

  // Sorting
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // Get diet plans
  const diets = await DietPlan.find(filters)
    .populate('memberId', 'fullName email phone membershipStatus')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalDiets = await DietPlan.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      diets: diets.map((d) => d.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalDiets / limit),
        totalDiets,
        limit,
        hasMore: page < Math.ceil(totalDiets / limit),
      },
    },
    'Diet plans retrieved successfully'
  );
});

/**
 * @desc    Get diet plan by ID
 * @route   GET /api/trainer/diets/:id
 * @access  Private (Trainer)
 */
const getDietById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const dietId = req.params.id;

  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  })
    .populate('memberId', 'fullName email phone gender age fitnessGoal weight height')
    .populate('trainerId', 'fullName email specialization');

  if (!diet) {
    throw ApiError.notFound('Diet plan not found');
  }

  ApiResponse.success(
    res,
    { diet: diet.getPublicProfile() },
    'Diet plan retrieved successfully'
  );
});

/**
 * @desc    Create new diet plan
 * @route   POST /api/trainer/diets
 * @access  Private (Trainer)
 */
const createDiet = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const {
    memberId,
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
  if (!memberId || !dietTitle || !mealSchedule || !calorieTarget) {
    throw ApiError.badRequest(
      'Please provide memberId, dietTitle, mealSchedule, and calorieTarget'
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

  // Validate meal schedule
  if (!Array.isArray(mealSchedule) || mealSchedule.length === 0) {
    throw ApiError.badRequest('Please provide at least one meal');
  }

  // Validate calorie target
  if (!calorieTarget.daily) {
    throw ApiError.badRequest('Please provide daily calorie target');
  }

  // Create diet plan
  const diet = await DietPlan.create({
    memberId,
    trainerId,
    dietTitle,
    dietType: dietType || 'balanced',
    mealSchedule,
    calorieTarget,
    nutritionNotes: nutritionNotes || null,
    restrictions: restrictions || [],
    supplements: supplements || [],
    hydrationGoal: hydrationGoal || 3,
    startDate: startDate || Date.now(),
    endDate: endDate || null,
    duration: duration || 30,
    status: 'active',
    progress: 0,
    adherenceRate: 0,
    notes: notes || null,
    createdBy: trainerId,
  });

  // Populate member details
  await diet.populate('memberId', 'fullName email phone');

  ApiResponse.created(
    res,
    { diet: diet.getPublicProfile() },
    'Diet plan created successfully'
  );
});

/**
 * @desc    Update diet plan
 * @route   PUT /api/trainer/diets/:id
 * @access  Private (Trainer)
 */
const updateDiet = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const dietId = req.params.id;

  // Find diet
  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  });

  if (!diet) {
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
  if (dietTitle) diet.dietTitle = dietTitle;
  if (dietType) diet.dietType = dietType;
  if (mealSchedule) {
    if (!Array.isArray(mealSchedule) || mealSchedule.length === 0) {
      throw ApiError.badRequest('Please provide at least one meal');
    }
    diet.mealSchedule = mealSchedule;
  }
  if (calorieTarget) diet.calorieTarget = { ...diet.calorieTarget, ...calorieTarget };
  if (nutritionNotes !== undefined) diet.nutritionNotes = nutritionNotes;
  if (restrictions) diet.restrictions = restrictions;
  if (supplements) diet.supplements = supplements;
  if (hydrationGoal) diet.hydrationGoal = hydrationGoal;
  if (startDate) diet.startDate = startDate;
  if (endDate !== undefined) diet.endDate = endDate;
  if (duration) diet.duration = duration;
  if (status) diet.status = status;
  if (progress !== undefined) diet.progress = progress;
  if (adherenceRate !== undefined) diet.adherenceRate = adherenceRate;
  if (notes !== undefined) diet.notes = notes;

  await diet.save();

  // Populate member details
  await diet.populate('memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { diet: diet.getPublicProfile() },
    'Diet plan updated successfully'
  );
});

/**
 * @desc    Delete diet plan
 * @route   DELETE /api/trainer/diets/:id
 * @access  Private (Trainer)
 */
const deleteDiet = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const dietId = req.params.id;

  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  });

  if (!diet) {
    throw ApiError.notFound('Diet plan not found');
  }

  await diet.deleteOne();

  ApiResponse.success(res, null, 'Diet plan deleted successfully');
});

/**
 * @desc    Assign diet plan to member
 * @route   POST /api/trainer/diets/:id/assign
 * @access  Private (Trainer)
 */
const assignDiet = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const dietId = req.params.id;
  const { memberId } = req.body;

  if (!memberId) {
    throw ApiError.badRequest('Please provide memberId');
  }

  // Find diet
  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  });

  if (!diet) {
    throw ApiError.notFound('Diet plan not found');
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

  // Update diet assignment
  diet.memberId = memberId;
  diet.status = 'active';
  diet.startDate = Date.now();
  await diet.save();

  // Populate member details
  await diet.populate('memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { diet: diet.getPublicProfile() },
    'Diet plan assigned successfully'
  );
});

/**
 * @desc    Get diet recommendations for member
 * @route   GET /api/trainer/diets/recommendations/:memberId
 * @access  Private (Trainer)
 */
const getDietRecommendations = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const memberId = req.params.memberId;

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

  // Get member details
  const member = await User.findById(memberId).select(
    'fullName fitnessGoal weight height age gender'
  );

  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
  let bmr = 0;
  if (member.weight && member.height && member.age) {
    if (member.gender === 'male') {
      bmr = 10 * member.weight + 6.25 * member.height - 5 * member.age + 5;
    } else {
      bmr = 10 * member.weight + 6.25 * member.height - 5 * member.age - 161;
    }
  }

  // Calculate TDEE (Total Daily Energy Expenditure) - assuming moderate activity
  const tdee = Math.round(bmr * 1.55);

  // Adjust calories based on fitness goal
  let recommendedCalories = tdee;
  let recommendedProtein = 0;
  let recommendedCarbs = 0;
  let recommendedFats = 0;
  let recommendedDietType = 'balanced';

  switch (member.fitnessGoal) {
    case 'weight-loss':
      recommendedCalories = Math.round(tdee * 0.8); // 20% deficit
      recommendedProtein = Math.round((member.weight || 70) * 2); // 2g per kg
      recommendedCarbs = Math.round((recommendedCalories * 0.3) / 4); // 30% of calories
      recommendedFats = Math.round((recommendedCalories * 0.3) / 9); // 30% of calories
      recommendedDietType = 'weight-loss';
      break;
    case 'muscle-gain':
      recommendedCalories = Math.round(tdee * 1.15); // 15% surplus
      recommendedProtein = Math.round((member.weight || 70) * 2.2); // 2.2g per kg
      recommendedCarbs = Math.round((recommendedCalories * 0.45) / 4); // 45% of calories
      recommendedFats = Math.round((recommendedCalories * 0.25) / 9); // 25% of calories
      recommendedDietType = 'muscle-building';
      break;
    case 'strength':
      recommendedCalories = Math.round(tdee * 1.1); // 10% surplus
      recommendedProtein = Math.round((member.weight || 70) * 2); // 2g per kg
      recommendedCarbs = Math.round((recommendedCalories * 0.4) / 4); // 40% of calories
      recommendedFats = Math.round((recommendedCalories * 0.3) / 9); // 30% of calories
      recommendedDietType = 'high-protein';
      break;
    default:
      recommendedCalories = tdee;
      recommendedProtein = Math.round((member.weight || 70) * 1.6); // 1.6g per kg
      recommendedCarbs = Math.round((recommendedCalories * 0.4) / 4); // 40% of calories
      recommendedFats = Math.round((recommendedCalories * 0.3) / 9); // 30% of calories
      recommendedDietType = 'balanced';
  }

  const recommendations = {
    member: {
      id: member._id,
      fullName: member.fullName,
      fitnessGoal: member.fitnessGoal,
      weight: member.weight,
      height: member.height,
      age: member.age,
      gender: member.gender,
    },
    calculations: {
      bmr: Math.round(bmr),
      tdee: tdee,
    },
    recommendations: {
      dailyCalories: recommendedCalories,
      protein: recommendedProtein,
      carbs: recommendedCarbs,
      fats: recommendedFats,
      dietType: recommendedDietType,
      hydration: 3, // liters
      meals: 5, // meals per day
    },
    mealDistribution: {
      breakfast: Math.round(recommendedCalories * 0.25),
      midMorningSnack: Math.round(recommendedCalories * 0.1),
      lunch: Math.round(recommendedCalories * 0.3),
      eveningSnack: Math.round(recommendedCalories * 0.1),
      dinner: Math.round(recommendedCalories * 0.25),
    },
  };

  ApiResponse.success(
    res,
    recommendations,
    'Diet recommendations generated successfully'
  );
});

/**
 * @desc    Get diet statistics
 * @route   GET /api/trainer/diets/stats
 * @access  Private (Trainer)
 */
const getDietStats = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get all diets for trainer
  const diets = await DietPlan.find({ trainerId });

  // Calculate statistics
  const stats = {
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
    totalMeals: 0,
  };

  // Count by diet type
  diets.forEach((diet) => {
    const type = diet.dietType;
    stats.byDietType[type] = (stats.byDietType[type] || 0) + 1;
    stats.totalMeals += diet.mealSchedule.length;
  });

  // Calculate averages
  if (diets.length > 0) {
    const totalProgress = diets.reduce((sum, d) => sum + d.progress, 0);
    const totalAdherence = diets.reduce((sum, d) => sum + d.adherenceRate, 0);
    stats.averageProgress = Math.round(totalProgress / diets.length);
    stats.averageAdherence = Math.round(totalAdherence / diets.length);
  }

  ApiResponse.success(
    res,
    { stats },
    'Diet statistics retrieved successfully'
  );
});

/**
 * @desc    Update diet progress
 * @route   PUT /api/trainer/diets/:id/progress
 * @access  Private (Trainer)
 */
const updateProgress = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const dietId = req.params.id;
  const { progress } = req.body;

  if (progress === undefined || progress === null) {
    throw ApiError.badRequest('Please provide progress value');
  }

  if (progress < 0 || progress > 100) {
    throw ApiError.badRequest('Progress must be between 0 and 100');
  }

  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  });

  if (!diet) {
    throw ApiError.notFound('Diet plan not found');
  }

  await diet.updateProgress(progress);

  ApiResponse.success(
    res,
    { diet: diet.getPublicProfile() },
    'Diet progress updated successfully'
  );
});

/**
 * @desc    Update adherence rate
 * @route   PUT /api/trainer/diets/:id/adherence
 * @access  Private (Trainer)
 */
const updateAdherence = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const dietId = req.params.id;
  const { adherenceRate } = req.body;

  if (adherenceRate === undefined || adherenceRate === null) {
    throw ApiError.badRequest('Please provide adherence rate value');
  }

  if (adherenceRate < 0 || adherenceRate > 100) {
    throw ApiError.badRequest('Adherence rate must be between 0 and 100');
  }

  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  });

  if (!diet) {
    throw ApiError.notFound('Diet plan not found');
  }

  await diet.updateAdherence(adherenceRate);

  ApiResponse.success(
    res,
    { diet: diet.getPublicProfile() },
    'Diet adherence updated successfully'
  );
});

module.exports = {
  getAllDiets,
  getDietById,
  createDiet,
  updateDiet,
  deleteDiet,
  assignDiet,
  getDietRecommendations,
  getDietStats,
  updateProgress,
  updateAdherence,
};
