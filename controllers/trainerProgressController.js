const Progress = require('../models/Progress');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Record body measurements and progress
 * @route   POST /api/trainer/progress
 * @access  Private (Trainer)
 */
const recordProgress = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const {
    memberId,
    recordDate,
    bodyMeasurements,
    strengthMetrics,
    progressPhotos,
    fitnessMetrics,
    goals,
    notes,
    mood,
    energyLevel,
    sleepQuality,
    dietAdherence,
    workoutAdherence,
  } = req.body;

  // Validate required fields
  if (!memberId) {
    throw ApiError.badRequest('Please provide memberId');
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

  // Create progress record
  const progress = await Progress.create({
    memberId,
    trainerId,
    recordDate: recordDate || Date.now(),
    bodyMeasurements: bodyMeasurements || {},
    strengthMetrics: strengthMetrics || [],
    progressPhotos: progressPhotos || [],
    fitnessMetrics: fitnessMetrics || {},
    goals: goals || {},
    notes: notes || null,
    mood: mood || null,
    energyLevel: energyLevel || null,
    sleepQuality: sleepQuality || null,
    dietAdherence: dietAdherence || null,
    workoutAdherence: workoutAdherence || null,
    createdBy: trainerId,
    createdByModel: 'Trainer',
  });

  // Populate member details
  await progress.populate('memberId', 'fullName email phone gender');

  ApiResponse.created(
    res,
    { progress: progress.getPublicProfile() },
    'Progress recorded successfully'
  );
});

/**
 * @desc    Get member progress history
 * @route   GET /api/trainer/progress/member/:memberId
 * @access  Private (Trainer)
 */
const getMemberProgress = asyncHandler(async (req, res) => {
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

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Date range filter
  const filters = { memberId };

  if (req.query.startDate && req.query.endDate) {
    filters.recordDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  // Get progress records
  const progressRecords = await Progress.find(filters)
    .populate('trainerId', 'fullName email')
    .sort({ recordDate: -1 })
    .skip(skip)
    .limit(limit);

  const totalRecords = await Progress.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      progress: progressRecords.map((p) => p.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit,
      },
    },
    'Member progress history retrieved successfully'
  );
});

/**
 * @desc    Get progress by ID
 * @route   GET /api/trainer/progress/:id
 * @access  Private (Trainer)
 */
const getProgressById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const progressId = req.params.id;

  const progress = await Progress.findOne({
    _id: progressId,
    trainerId,
  })
    .populate('memberId', 'fullName email phone gender age')
    .populate('trainerId', 'fullName email');

  if (!progress) {
    throw ApiError.notFound('Progress record not found');
  }

  ApiResponse.success(
    res,
    { progress: progress.getPublicProfile() },
    'Progress record retrieved successfully'
  );
});

/**
 * @desc    Update progress record
 * @route   PUT /api/trainer/progress/:id
 * @access  Private (Trainer)
 */
const updateProgress = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const progressId = req.params.id;

  const progress = await Progress.findOne({
    _id: progressId,
    trainerId,
  });

  if (!progress) {
    throw ApiError.notFound('Progress record not found');
  }

  const {
    recordDate,
    bodyMeasurements,
    strengthMetrics,
    progressPhotos,
    fitnessMetrics,
    goals,
    notes,
    mood,
    energyLevel,
    sleepQuality,
    dietAdherence,
    workoutAdherence,
  } = req.body;

  // Update fields
  if (recordDate) progress.recordDate = recordDate;
  if (bodyMeasurements) progress.bodyMeasurements = { ...progress.bodyMeasurements, ...bodyMeasurements };
  if (strengthMetrics) progress.strengthMetrics = strengthMetrics;
  if (progressPhotos) progress.progressPhotos = progressPhotos;
  if (fitnessMetrics) progress.fitnessMetrics = { ...progress.fitnessMetrics, ...fitnessMetrics };
  if (goals) progress.goals = { ...progress.goals, ...goals };
  if (notes !== undefined) progress.notes = notes;
  if (mood) progress.mood = mood;
  if (energyLevel) progress.energyLevel = energyLevel;
  if (sleepQuality) progress.sleepQuality = sleepQuality;
  if (dietAdherence !== undefined) progress.dietAdherence = dietAdherence;
  if (workoutAdherence !== undefined) progress.workoutAdherence = workoutAdherence;

  await progress.save();

  await progress.populate('memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { progress: progress.getPublicProfile() },
    'Progress record updated successfully'
  );
});

/**
 * @desc    Delete progress record
 * @route   DELETE /api/trainer/progress/:id
 * @access  Private (Trainer)
 */
const deleteProgress = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const progressId = req.params.id;

  const progress = await Progress.findOne({
    _id: progressId,
    trainerId,
  });

  if (!progress) {
    throw ApiError.notFound('Progress record not found');
  }

  await progress.deleteOne();

  ApiResponse.success(res, null, 'Progress record deleted successfully');
});

/**
 * @desc    Get member fitness report
 * @route   GET /api/trainer/progress/report/:memberId
 * @access  Private (Trainer)
 */
const getMemberFitnessReport = asyncHandler(async (req, res) => {
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
    'fullName email phone gender age fitnessGoal joinDate'
  );

  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Get all progress records
  const progressRecords = await Progress.find({ memberId }).sort({ recordDate: 1 });

  if (progressRecords.length === 0) {
    throw ApiError.notFound('No progress records found for this member');
  }

  // Get first and latest records
  const firstRecord = progressRecords[0];
  const latestRecord = progressRecords[progressRecords.length - 1];

  // Calculate changes
  const changes = {
    weight: null,
    bodyFat: null,
    bmi: null,
    chest: null,
    waist: null,
    hips: null,
    biceps: null,
  };

  if (firstRecord.bodyMeasurements.weight && latestRecord.bodyMeasurements.weight) {
    changes.weight = parseFloat(
      (latestRecord.bodyMeasurements.weight - firstRecord.bodyMeasurements.weight).toFixed(2)
    );
  }

  if (firstRecord.bodyMeasurements.bodyFatPercentage && latestRecord.bodyMeasurements.bodyFatPercentage) {
    changes.bodyFat = parseFloat(
      (latestRecord.bodyMeasurements.bodyFatPercentage - firstRecord.bodyMeasurements.bodyFatPercentage).toFixed(2)
    );
  }

  if (firstRecord.bodyMeasurements.bmi && latestRecord.bodyMeasurements.bmi) {
    changes.bmi = parseFloat(
      (latestRecord.bodyMeasurements.bmi - firstRecord.bodyMeasurements.bmi).toFixed(2)
    );
  }

  ['chest', 'waist', 'hips', 'biceps'].forEach((measurement) => {
    if (firstRecord.bodyMeasurements[measurement] && latestRecord.bodyMeasurements[measurement]) {
      changes[measurement] = parseFloat(
        (latestRecord.bodyMeasurements[measurement] - firstRecord.bodyMeasurements[measurement]).toFixed(2)
      );
    }
  });

  // Generate report
  const report = {
    member: {
      id: member._id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      gender: member.gender,
      age: member.age,
      fitnessGoal: member.fitnessGoal,
      joinDate: member.joinDate,
    },
    summary: {
      totalRecords: progressRecords.length,
      firstRecordDate: firstRecord.recordDate,
      latestRecordDate: latestRecord.recordDate,
      daysTracked: Math.floor(
        (latestRecord.recordDate - firstRecord.recordDate) / (1000 * 60 * 60 * 24)
      ),
    },
    firstRecord: firstRecord.getPublicProfile(),
    latestRecord: latestRecord.getPublicProfile(),
    changes,
    progressPhotos: latestRecord.progressPhotos,
  };

  ApiResponse.success(
    res,
    report,
    'Member fitness report generated successfully'
  );
});

/**
 * @desc    Get weekly analytics
 * @route   GET /api/trainer/progress/analytics/weekly/:memberId
 * @access  Private (Trainer)
 */
const getWeeklyAnalytics = asyncHandler(async (req, res) => {
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

  // Get last 7 days of progress
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const progressRecords = await Progress.find({
    memberId,
    recordDate: { $gte: sevenDaysAgo },
  }).sort({ recordDate: 1 });

  // Prepare chart data
  const weightData = [];
  const bodyFatData = [];
  const moodData = [];
  const energyData = [];

  progressRecords.forEach((record) => {
    const date = record.recordDate.toISOString().split('T')[0];

    if (record.bodyMeasurements.weight) {
      weightData.push({
        date,
        value: record.bodyMeasurements.weight,
      });
    }

    if (record.bodyMeasurements.bodyFatPercentage) {
      bodyFatData.push({
        date,
        value: record.bodyMeasurements.bodyFatPercentage,
      });
    }

    if (record.mood) {
      const moodValue = { excellent: 5, good: 4, neutral: 3, tired: 2, exhausted: 1 }[record.mood];
      moodData.push({
        date,
        value: moodValue,
        label: record.mood,
      });
    }

    if (record.energyLevel) {
      energyData.push({
        date,
        value: record.energyLevel,
      });
    }
  });

  const analytics = {
    weekRange: {
      start: sevenDaysAgo,
      end: new Date(),
    },
    totalRecords: progressRecords.length,
    charts: {
      weight: weightData,
      bodyFat: bodyFatData,
      mood: moodData,
      energy: energyData,
    },
  };

  ApiResponse.success(
    res,
    analytics,
    'Weekly analytics retrieved successfully'
  );
});

/**
 * @desc    Get monthly analytics
 * @route   GET /api/trainer/progress/analytics/monthly/:memberId
 * @access  Private (Trainer)
 */
const getMonthlyAnalytics = asyncHandler(async (req, res) => {
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

  // Get last 30 days of progress
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const progressRecords = await Progress.find({
    memberId,
    recordDate: { $gte: thirtyDaysAgo },
  }).sort({ recordDate: 1 });

  // Prepare chart data
  const weightData = [];
  const bodyFatData = [];
  const bmiData = [];
  const strengthData = {};

  progressRecords.forEach((record) => {
    const date = record.recordDate.toISOString().split('T')[0];

    if (record.bodyMeasurements.weight) {
      weightData.push({ date, value: record.bodyMeasurements.weight });
    }

    if (record.bodyMeasurements.bodyFatPercentage) {
      bodyFatData.push({ date, value: record.bodyMeasurements.bodyFatPercentage });
    }

    if (record.bodyMeasurements.bmi) {
      bmiData.push({ date, value: record.bodyMeasurements.bmi });
    }

    // Track strength improvements
    record.strengthMetrics.forEach((metric) => {
      if (!strengthData[metric.exerciseName]) {
        strengthData[metric.exerciseName] = [];
      }
      strengthData[metric.exerciseName].push({
        date,
        weight: metric.weight,
        reps: metric.reps,
        oneRepMax: metric.oneRepMax,
      });
    });
  });

  const analytics = {
    monthRange: {
      start: thirtyDaysAgo,
      end: new Date(),
    },
    totalRecords: progressRecords.length,
    charts: {
      weight: weightData,
      bodyFat: bodyFatData,
      bmi: bmiData,
      strength: strengthData,
    },
  };

  ApiResponse.success(
    res,
    analytics,
    'Monthly analytics retrieved successfully'
  );
});

/**
 * @desc    Upload progress photo
 * @route   POST /api/trainer/progress/:id/photo
 * @access  Private (Trainer)
 */
const uploadProgressPhoto = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const progressId = req.params.id;
  const { photoUrl, photoType, caption } = req.body;

  if (!photoUrl) {
    throw ApiError.badRequest('Please provide photoUrl');
  }

  const progress = await Progress.findOne({
    _id: progressId,
    trainerId,
  });

  if (!progress) {
    throw ApiError.notFound('Progress record not found');
  }

  // Add photo
  progress.progressPhotos.push({
    photoUrl,
    photoType: photoType || 'front',
    caption: caption || null,
    uploadDate: Date.now(),
  });

  await progress.save();

  ApiResponse.success(
    res,
    { progress: progress.getPublicProfile() },
    'Progress photo uploaded successfully'
  );
});

module.exports = {
  recordProgress,
  getMemberProgress,
  getProgressById,
  updateProgress,
  deleteProgress,
  getMemberFitnessReport,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  uploadProgressPhoto,
};
