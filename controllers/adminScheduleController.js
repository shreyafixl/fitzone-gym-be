const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all schedules with filtering
 * @route   GET /api/admin/schedules
 * @access  Private (Admin)
 */
const getAllSchedules = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    assignedTo,
    branchId,
    scheduleType,
    status,
    startDate,
    endDate,
    sortBy = 'date',
    order = 'asc'
  } = req.query;

  // Build query
  const query = {};

  if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  if (branchId) {
    query.branchId = branchId;
  }

  if (scheduleType) {
    query.scheduleType = scheduleType;
  }

  if (status) {
    query.status = status;
  }

  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;
  if (sortBy === 'date') {
    sortOptions.startTime = order === 'asc' ? 1 : -1;
  }

  // Execute query
  const schedules = await Schedule.find(query)
    .populate('assignedTo', 'fullName email phone role')
    .populate('branchId', 'branchName branchCode city')
    .populate('participants.userId', 'fullName email phone')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Add calculated fields
  const schedulesWithDetails = schedules.map(schedule => ({
    ...schedule,
    participantCount: schedule.participants ? schedule.participants.length : 0,
    availableSlots: schedule.maxParticipants - (schedule.participants ? schedule.participants.length : 0),
    isFull: (schedule.participants ? schedule.participants.length : 0) >= schedule.maxParticipants
  }));

  // Get total count
  const totalSchedules = await Schedule.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalSchedules / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      schedules: schedulesWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalSchedules,
        limit: limitNum,
        hasMore
      }
    },
    'Schedules retrieved successfully'
  );
});

/**
 * @desc    Create schedule
 * @route   POST /api/admin/schedules
 * @access  Private (Admin)
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
    notes
  } = req.body;

  // Validate required fields
  if (!title || !assignedTo || !scheduleType || !branchId || !date || !startTime || !endTime) {
    throw ApiError.badRequest('Please provide all required fields: title, assignedTo, scheduleType, branchId, date, startTime, endTime');
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

  // Validate time format and logic
  if (startTime >= endTime) {
    throw ApiError.badRequest('End time must be after start time');
  }

  // Check for scheduling conflicts
  const conflictingSchedule = await Schedule.findOne({
    assignedTo,
    branchId,
    date: new Date(date),
    status: { $nin: ['cancelled', 'completed'] },
    $or: [
      {
        $and: [
          { startTime: { $lte: startTime } },
          { endTime: { $gt: startTime } }
        ]
      },
      {
        $and: [
          { startTime: { $lt: endTime } },
          { endTime: { $gte: endTime } }
        ]
      },
      {
        $and: [
          { startTime: { $gte: startTime } },
          { endTime: { $lte: endTime } }
        ]
      }
    ]
  });

  if (conflictingSchedule) {
    throw ApiError.conflict('Schedule conflicts with an existing schedule');
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
    equipment: equipment || [],
    isRecurring: isRecurring || false,
    recurringPattern,
    notes,
    createdBy: req.user.id,
    createdByModel: 'Admin'
  });

  // Populate and return
  const createdSchedule = await Schedule.findById(schedule._id)
    .populate('assignedTo', 'fullName email phone role')
    .populate('branchId', 'branchName branchCode');

  ApiResponse.success(
    res,
    { schedule: createdSchedule },
    'Schedule created successfully',
    201
  );
});

/**
 * @desc    Update schedule
 * @route   PUT /api/admin/schedules/:id
 * @access  Private (Admin)
 */
const updateSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find schedule
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Verify assigned user if being updated
  if (updateData.assignedTo) {
    const user = await User.findById(updateData.assignedTo);
    if (!user) {
      throw ApiError.notFound('Assigned user not found');
    }
  }

  // Verify branch if being updated
  if (updateData.branchId) {
    const branch = await Branch.findById(updateData.branchId);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
  }

  // Validate time if being updated
  const newStartTime = updateData.startTime || schedule.startTime;
  const newEndTime = updateData.endTime || schedule.endTime;
  if (newStartTime >= newEndTime) {
    throw ApiError.badRequest('End time must be after start time');
  }

  // Check for conflicts if date/time is being changed
  if (updateData.date || updateData.startTime || updateData.endTime) {
    const checkDate = updateData.date ? new Date(updateData.date) : schedule.date;
    const checkAssignedTo = updateData.assignedTo || schedule.assignedTo;
    const checkBranchId = updateData.branchId || schedule.branchId;

    const conflictingSchedule = await Schedule.findOne({
      _id: { $ne: id },
      assignedTo: checkAssignedTo,
      branchId: checkBranchId,
      date: checkDate,
      status: { $nin: ['cancelled', 'completed'] },
      $or: [
        {
          $and: [
            { startTime: { $lte: newStartTime } },
            { endTime: { $gt: newStartTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: newEndTime } },
            { endTime: { $gte: newEndTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: newStartTime } },
            { endTime: { $lte: newEndTime } }
          ]
        }
      ]
    });

    if (conflictingSchedule) {
      throw ApiError.conflict('Schedule conflicts with an existing schedule');
    }
  }

  // Update schedule
  const updatedSchedule = await Schedule.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate('assignedTo', 'fullName email phone role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phone');

  ApiResponse.success(
    res,
    { schedule: updatedSchedule },
    'Schedule updated successfully'
  );
});

/**
 * @desc    Delete schedule
 * @route   DELETE /api/admin/schedules/:id
 * @access  Private (Admin)
 */
const deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find and delete schedule
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Check if schedule has participants
  if (schedule.participants && schedule.participants.length > 0) {
    throw ApiError.badRequest(
      `Cannot delete schedule with ${schedule.participants.length} participants. Please cancel the schedule instead.`
    );
  }

  await Schedule.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { scheduleId: id },
    'Schedule deleted successfully'
  );
});

/**
 * @desc    Book schedule (add participant)
 * @route   POST /api/admin/schedules/:id/book
 * @access  Private (Admin)
 */
const bookSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, status } = req.body;

  // Validate required fields
  if (!userId) {
    throw ApiError.badRequest('Please provide userId');
  }

  // Find schedule
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Check if schedule is full
  if (schedule.participants.length >= schedule.maxParticipants) {
    throw ApiError.badRequest('Schedule is full');
  }

  // Check if user is already booked
  const existingParticipant = schedule.participants.find(
    p => p.userId.toString() === userId
  );

  if (existingParticipant) {
    throw ApiError.conflict('User is already booked for this schedule');
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Add participant
  schedule.participants.push({
    userId,
    status: status || 'confirmed',
    joinedAt: new Date()
  });

  await schedule.save();

  // Populate and return
  const updatedSchedule = await Schedule.findById(id)
    .populate('assignedTo', 'fullName email phone role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phone');

  ApiResponse.success(
    res,
    { schedule: updatedSchedule },
    'Schedule booked successfully'
  );
});

/**
 * @desc    Cancel booking (remove participant)
 * @route   DELETE /api/admin/schedules/:id/bookings/:bookingId
 * @access  Private (Admin)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { id, bookingId } = req.params;

  // Find schedule
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Find and remove participant
  const participantIndex = schedule.participants.findIndex(
    p => p._id.toString() === bookingId
  );

  if (participantIndex === -1) {
    throw ApiError.notFound('Booking not found');
  }

  schedule.participants.splice(participantIndex, 1);
  await schedule.save();

  // Populate and return
  const updatedSchedule = await Schedule.findById(id)
    .populate('assignedTo', 'fullName email phone role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phone');

  ApiResponse.success(
    res,
    { schedule: updatedSchedule },
    'Booking cancelled successfully'
  );
});

/**
 * @desc    Check schedule availability
 * @route   GET /api/admin/schedules/:id/availability
 * @access  Private (Admin)
 */
const checkAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find schedule
  const schedule = await Schedule.findById(id)
    .populate('assignedTo', 'fullName email phone role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email phone')
    .lean();

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Calculate availability
  const participantCount = schedule.participants ? schedule.participants.length : 0;
  const availableSlots = schedule.maxParticipants - participantCount;
  const isFull = participantCount >= schedule.maxParticipants;
  const occupancyRate = ((participantCount / schedule.maxParticipants) * 100).toFixed(2);

  ApiResponse.success(
    res,
    {
      schedule: {
        id: schedule._id,
        title: schedule.title,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        scheduleType: schedule.scheduleType,
        status: schedule.status
      },
      availability: {
        maxParticipants: schedule.maxParticipants,
        currentParticipants: participantCount,
        availableSlots,
        isFull,
        occupancyRate: parseFloat(occupancyRate),
        isBookable: !isFull && schedule.status === 'scheduled'
      },
      participants: schedule.participants
    },
    'Schedule availability retrieved successfully'
  );
});

/**
 * @desc    Get schedule by ID
 * @route   GET /api/admin/schedules/:id
 * @access  Private (Admin)
 */
const getScheduleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id)
    .populate('assignedTo', 'fullName email phone role specialization')
    .populate('branchId', 'branchName branchCode address city')
    .populate('participants.userId', 'fullName email phone membershipStatus')
    .lean();

  if (!schedule) {
    throw ApiError.notFound('Schedule not found');
  }

  // Add calculated fields
  const scheduleWithDetails = {
    ...schedule,
    participantCount: schedule.participants ? schedule.participants.length : 0,
    availableSlots: schedule.maxParticipants - (schedule.participants ? schedule.participants.length : 0),
    isFull: (schedule.participants ? schedule.participants.length : 0) >= schedule.maxParticipants
  };

  ApiResponse.success(
    res,
    { schedule: scheduleWithDetails },
    'Schedule retrieved successfully'
  );
});

module.exports = {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  bookSchedule,
  cancelBooking,
  checkAvailability,
  getScheduleById,
};
