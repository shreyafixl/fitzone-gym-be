const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all schedules with filtering and pagination
 * @route   GET /api/schedules
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const getAllSchedules = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    scheduleType,
    status,
    branchId,
    assignedTo,
    startDate,
    endDate,
    search,
  } = req.query;

  // Build query
  const query = {};

  if (scheduleType) query.scheduleType = scheduleType;
  if (status) query.status = status;
  if (branchId) query.branchId = branchId;
  if (assignedTo) query.assignedTo = assignedTo;

  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Search by title
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const schedules = await Schedule.find(query)
    .populate('assignedTo', 'fullName email role phoneNumber')
    .populate('branchId', 'branchName branchCode address city')
    .populate('participants.userId', 'fullName email phoneNumber')
    .sort({ date: 1, startTime: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Schedule.countDocuments(query);

  ApiResponse.success(res, {
    schedules,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalSchedules: total,
      limit: parseInt(limit),
    },
  }, 'Schedules retrieved successfully');
});

/**
 * @desc    Get schedule by ID
 * @route   GET /api/schedules/:id
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const getScheduleById = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id)
    .populate('assignedTo', 'fullName email role phoneNumber')
    .populate('branchId', 'branchName branchCode address city')
    .populate('participants.userId', 'fullName email phoneNumber')
    .populate('createdBy', 'fullName email');

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  ApiResponse.success(res, schedule, 'Schedule retrieved successfully');
});

/**
 * @desc    Get trainer's schedule
 * @route   GET /api/schedules/trainer/:trainerId
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const getTrainerSchedule = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { date, startDate, endDate, status } = req.query;

  // Verify trainer exists
  const trainer = await User.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Build query
  const query = { assignedTo: trainerId };

  if (status) query.status = status;

  // Date filter
  if (date) {
    query.date = new Date(date);
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const schedules = await Schedule.find(query)
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phoneNumber')
    .sort({ date: 1, startTime: 1 });

  ApiResponse.success(res, {
    trainer: {
      id: trainer._id,
      fullName: trainer.fullName,
      email: trainer.email,
      role: trainer.role,
    },
    schedules,
    totalSchedules: schedules.length,
  }, 'Trainer schedule retrieved successfully');
});

/**
 * @desc    Get branch schedule
 * @route   GET /api/schedules/branch/:branchId
 * @access  Private (SuperAdmin, Admin)
 */
const getBranchSchedule = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { date, startDate, endDate, status, scheduleType } = req.query;

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Build query
  const query = { branchId };

  if (status) query.status = status;
  if (scheduleType) query.scheduleType = scheduleType;

  // Date filter
  if (date) {
    query.date = new Date(date);
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const schedules = await Schedule.find(query)
    .populate('assignedTo', 'fullName email role phoneNumber')
    .populate('participants.userId', 'fullName email phoneNumber')
    .sort({ date: 1, startTime: 1 });

  ApiResponse.success(res, {
    branch: {
      id: branch._id,
      branchName: branch.branchName,
      branchCode: branch.branchCode,
      city: branch.city,
    },
    schedules,
    totalSchedules: schedules.length,
  }, 'Branch schedule retrieved successfully');
});

/**
 * @desc    Get member's schedule
 * @route   GET /api/schedules/member/:memberId
 * @access  Private (SuperAdmin, Admin, Trainer, Member)
 */
const getMemberSchedule = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { date, startDate, endDate, status } = req.query;

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Build query - find schedules where member is a participant
  const query = {
    'participants.userId': memberId,
  };

  if (status) query.status = status;

  // Date filter
  if (date) {
    query.date = new Date(date);
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const schedules = await Schedule.find(query)
    .populate('assignedTo', 'fullName email role phoneNumber')
    .populate('branchId', 'branchName branchCode')
    .sort({ date: 1, startTime: 1 });

  ApiResponse.success(res, {
    member: {
      id: member._id,
      fullName: member.fullName,
      email: member.email,
    },
    schedules,
    totalSchedules: schedules.length,
  }, 'Member schedule retrieved successfully');
});

/**
 * @desc    Get schedule statistics
 * @route   GET /api/schedules/stats/overview
 * @access  Private (SuperAdmin, Admin)
 */
const getScheduleStats = asyncHandler(async (req, res) => {
  const { branchId, startDate, endDate } = req.query;

  // Build base query
  const baseQuery = {};
  if (branchId) baseQuery.branchId = branchId;
  if (startDate || endDate) {
    baseQuery.date = {};
    if (startDate) baseQuery.date.$gte = new Date(startDate);
    if (endDate) baseQuery.date.$lte = new Date(endDate);
  }

  // Get statistics
  const [
    totalSchedules,
    scheduledCount,
    inProgressCount,
    completedCount,
    cancelledCount,
    byType,
  ] = await Promise.all([
    Schedule.countDocuments(baseQuery),
    Schedule.countDocuments({ ...baseQuery, status: 'scheduled' }),
    Schedule.countDocuments({ ...baseQuery, status: 'in-progress' }),
    Schedule.countDocuments({ ...baseQuery, status: 'completed' }),
    Schedule.countDocuments({ ...baseQuery, status: 'cancelled' }),
    Schedule.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$scheduleType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  ApiResponse.success(res, {
    totalSchedules,
    byStatus: {
      scheduled: scheduledCount,
      inProgress: inProgressCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    byType: byType.map(item => ({
      type: item._id,
      count: item.count,
    })),
  }, 'Schedule statistics retrieved successfully');
});

/**
 * @desc    Create new schedule
 * @route   POST /api/schedules
 * @access  Private (SuperAdmin, Admin)
 */
const createSchedule = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    assignedTo,
    scheduleType,
    branchId,
    date,
    startTime,
    endTime,
    maxParticipants,
    location,
    room,
    equipment,
    isRecurring,
    recurringPattern,
    notes,
  } = req.body;

  // Validate required fields
  if (!title || !assignedTo || !scheduleType || !branchId || !date || !startTime || !endTime) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Verify assigned user exists
  const user = await User.findById(assignedTo);
  if (!user) {
    throw ApiError.notFound('Assigned user not found');
  }

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Check for scheduling conflicts
  const conflictingSchedule = await Schedule.findOne({
    assignedTo,
    date: new Date(date),
    status: { $nin: ['cancelled', 'completed'] },
    $or: [
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  });

  if (conflictingSchedule) {
    throw ApiError.conflict('Schedule conflict: User already has a schedule at this time');
  }

  // Create schedule
  const schedule = await Schedule.create({
    title,
    description,
    assignedTo,
    scheduleType,
    branchId,
    date: new Date(date),
    startTime,
    endTime,
    maxParticipants: maxParticipants || 1,
    location,
    room,
    equipment,
    isRecurring: isRecurring || false,
    recurringPattern,
    notes,
    createdBy: req.user._id,
    createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'User',
  });

  // Populate schedule
  const populatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.created(res, populatedSchedule, 'Schedule created successfully');
});

/**
 * @desc    Update schedule
 * @route   PUT /api/schedules/:id
 * @access  Private (SuperAdmin, Admin)
 */
const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Don't allow updating completed or cancelled schedules
  if (schedule.status === 'completed' || schedule.status === 'cancelled') {
    throw ApiError.badRequest(`Cannot update ${schedule.status} schedule`);
  }

  const {
    title,
    description,
    assignedTo,
    scheduleType,
    branchId,
    date,
    startTime,
    endTime,
    maxParticipants,
    location,
    room,
    equipment,
    notes,
    status,
  } = req.body;

  // If changing time or assigned user, check for conflicts
  if (assignedTo || date || startTime || endTime) {
    const conflictingSchedule = await Schedule.findOne({
      _id: { $ne: schedule._id },
      assignedTo: assignedTo || schedule.assignedTo,
      date: new Date(date || schedule.date),
      status: { $nin: ['cancelled', 'completed'] },
      $or: [
        { startTime: { $lte: startTime || schedule.startTime }, endTime: { $gt: startTime || schedule.startTime } },
        { startTime: { $lt: endTime || schedule.endTime }, endTime: { $gte: endTime || schedule.endTime } },
        { startTime: { $gte: startTime || schedule.startTime }, endTime: { $lte: endTime || schedule.endTime } },
      ],
    });

    if (conflictingSchedule) {
      throw ApiError.conflict('Schedule conflict: User already has a schedule at this time');
    }
  }

  // Update fields
  if (title) schedule.title = title;
  if (description !== undefined) schedule.description = description;
  if (assignedTo) schedule.assignedTo = assignedTo;
  if (scheduleType) schedule.scheduleType = scheduleType;
  if (branchId) schedule.branchId = branchId;
  if (date) schedule.date = new Date(date);
  if (startTime) schedule.startTime = startTime;
  if (endTime) schedule.endTime = endTime;
  if (maxParticipants) schedule.maxParticipants = maxParticipants;
  if (location !== undefined) schedule.location = location;
  if (room !== undefined) schedule.room = room;
  if (equipment) schedule.equipment = equipment;
  if (notes !== undefined) schedule.notes = notes;
  if (status) schedule.status = status;

  await schedule.save();

  // Populate schedule
  const updatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email');

  ApiResponse.success(res, updatedSchedule, 'Schedule updated successfully');
});

/**
 * @desc    Cancel schedule
 * @route   PATCH /api/schedules/:id/cancel
 * @access  Private (SuperAdmin, Admin)
 */
const cancelSchedule = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  if (schedule.status === 'cancelled') {
    throw ApiError.badRequest('Schedule is already cancelled');
  }

  if (schedule.status === 'completed') {
    throw ApiError.badRequest('Cannot cancel completed schedule');
  }

  await schedule.cancel(reason || 'No reason provided');

  const updatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(res, updatedSchedule, 'Schedule cancelled successfully');
});

/**
 * @desc    Reschedule schedule
 * @route   PATCH /api/schedules/:id/reschedule
 * @access  Private (SuperAdmin, Admin)
 */
const rescheduleSchedule = asyncHandler(async (req, res) => {
  const { newDate, newStartTime, newEndTime } = req.body;

  if (!newDate || !newStartTime || !newEndTime) {
    throw ApiError.badRequest('Please provide new date, start time, and end time');
  }

  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  if (schedule.status === 'cancelled') {
    throw ApiError.badRequest('Cannot reschedule cancelled schedule');
  }

  if (schedule.status === 'completed') {
    throw ApiError.badRequest('Cannot reschedule completed schedule');
  }

  // Check for conflicts with new time
  const conflictingSchedule = await Schedule.findOne({
    _id: { $ne: schedule._id },
    assignedTo: schedule.assignedTo,
    date: new Date(newDate),
    status: { $nin: ['cancelled', 'completed'] },
    $or: [
      { startTime: { $lte: newStartTime }, endTime: { $gt: newStartTime } },
      { startTime: { $lt: newEndTime }, endTime: { $gte: newEndTime } },
      { startTime: { $gte: newStartTime }, endTime: { $lte: newEndTime } },
    ],
  });

  if (conflictingSchedule) {
    throw ApiError.conflict('Schedule conflict: User already has a schedule at the new time');
  }

  await schedule.reschedule(new Date(newDate), newStartTime, newEndTime);

  const updatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(res, updatedSchedule, 'Schedule rescheduled successfully');
});

/**
 * @desc    Complete schedule
 * @route   PATCH /api/schedules/:id/complete
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const completeSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  if (schedule.status === 'completed') {
    throw ApiError.badRequest('Schedule is already completed');
  }

  if (schedule.status === 'cancelled') {
    throw ApiError.badRequest('Cannot complete cancelled schedule');
  }

  await schedule.complete();

  const updatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(res, updatedSchedule, 'Schedule marked as completed');
});

/**
 * @desc    Add participant to schedule
 * @route   PATCH /api/schedules/:id/participants/add
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const addParticipant = asyncHandler(async (req, res) => {
  const { userId, status } = req.body;

  if (!userId) {
    throw ApiError.badRequest('Please provide user ID');
  }

  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  if (schedule.status === 'cancelled' || schedule.status === 'completed') {
    throw ApiError.badRequest(`Cannot add participants to ${schedule.status} schedule`);
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Check if schedule is full
  if (schedule.isFull()) {
    throw ApiError.badRequest('Schedule is full, cannot add more participants');
  }

  await schedule.addParticipant(userId, status || 'pending');

  const updatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phoneNumber');

  ApiResponse.success(res, updatedSchedule, 'Participant added successfully');
});

/**
 * @desc    Remove participant from schedule
 * @route   PATCH /api/schedules/:id/participants/remove
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const removeParticipant = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw ApiError.badRequest('Please provide user ID');
  }

  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  await schedule.removeParticipant(userId);

  const updatedSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phoneNumber');

  ApiResponse.success(res, updatedSchedule, 'Participant removed successfully');
});

/**
 * @desc    Delete schedule
 * @route   DELETE /api/schedules/:id
 * @access  Private (SuperAdmin, Admin)
 */
const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Only allow deletion of scheduled or cancelled schedules
  if (schedule.status === 'in-progress') {
    throw ApiError.badRequest('Cannot delete schedule that is in progress');
  }

  await schedule.deleteOne();

  ApiResponse.success(res, null, 'Schedule deleted successfully');
});

module.exports = {
  getAllSchedules,
  getScheduleById,
  getTrainerSchedule,
  getBranchSchedule,
  getMemberSchedule,
  getScheduleStats,
  createSchedule,
  updateSchedule,
  cancelSchedule,
  rescheduleSchedule,
  completeSchedule,
  addParticipant,
  removeParticipant,
  deleteSchedule,
};
