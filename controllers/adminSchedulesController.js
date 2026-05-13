const asyncHandler = require('express-async-handler');
const Schedule = require('../models/Schedule');
const Class = require('../models/Class');
const Booking = require('../models/Booking');

// Get all schedules with pagination and filtering
exports.getAllSchedules = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, classId, startDate, endDate, trainer, room, status } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (classId) query.classId = classId;
  if (status) query.sessionStatus = status;
  if (room) query.room = room;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // If trainer filter is provided, find classes by trainer first
  if (trainer) {
    const trainerClasses = await Class.find({ trainer });
    const classIds = trainerClasses.map((c) => c._id);
    query.classId = { $in: classIds };
  }

  const total = await Schedule.countDocuments(query);
  const schedules = await Schedule.find(query)
    .populate({
      path: 'classId',
      populate: [
        { path: 'trainer', select: 'name email phone' },
        { path: 'category', select: 'categoryName color' },
      ],
    })
    .populate('bookedMembers', 'name email phone')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ date: 1, startTime: 1 });

  // Add available seats info
  const schedulesWithCapacity = schedules.map((schedule) => {
    const classData = schedule.classId;
    const bookedCount = schedule.bookedMembers.length;
    const availableSeats = classData.capacity - bookedCount;

    return {
      ...schedule.toObject(),
      bookedCount,
      availableSeats,
      isFull: availableSeats <= 0,
    };
  });

  res.status(200).json({
    success: true,
    data: schedulesWithCapacity,
    message: 'Schedules retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single schedule by ID
exports.getScheduleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id)
    .populate({
      path: 'classId',
      populate: [
        { path: 'trainer', select: 'name email phone' },
        { path: 'category', select: 'categoryName color' },
      ],
    })
    .populate('bookedMembers', 'name email phone membership status');

  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  const classData = schedule.classId;
  const bookedCount = schedule.bookedMembers.length;
  const availableSeats = classData.capacity - bookedCount;

  res.status(200).json({
    success: true,
    data: {
      ...schedule.toObject(),
      bookedCount,
      availableSeats,
      isFull: availableSeats <= 0,
    },
    message: 'Schedule retrieved successfully',
  });
});

// Create new schedule
exports.createSchedule = asyncHandler(async (req, res) => {
  const { classId, date, startTime, endTime, room, recurringSettings } = req.body;

  // Validate required fields
  if (!classId || !date || !startTime || !endTime || !room) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'classId', message: 'Class ID is required' },
        { field: 'date', message: 'Date is required' },
        { field: 'startTime', message: 'Start time is required' },
        { field: 'endTime', message: 'End time is required' },
        { field: 'room', message: 'Room is required' },
      ],
    });
  }

  // Validate class exists
  const classData = await Class.findById(classId);
  if (!classData) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID',
    });
  }

  // Validate time format and logic
  if (startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: 'Start time must be before end time',
    });
  }

  // Check for room conflicts
  const conflict = await Schedule.findOne({
    date: new Date(date),
    room,
    sessionStatus: { $in: ['scheduled', 'in-progress'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
    ],
  });

  if (conflict) {
    return res.status(400).json({
      success: false,
      message: 'Room is already booked for this time slot',
    });
  }

  // Create schedule
  const newSchedule = await Schedule.create({
    classId,
    date: new Date(date),
    startTime,
    endTime,
    room,
    recurringSettings: recurringSettings || { frequency: 'none' },
    bookedMembers: [],
    attendanceRecords: [],
    sessionStatus: 'scheduled',
  });

  const populatedSchedule = await Schedule.findById(newSchedule._id)
    .populate({
      path: 'classId',
      populate: [
        { path: 'trainer', select: 'name email phone' },
        { path: 'category', select: 'categoryName color' },
      ],
    });

  res.status(201).json({
    success: true,
    data: populatedSchedule,
    message: 'Schedule created successfully',
  });
});

// Update schedule
exports.updateSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, startTime, endTime, room, sessionStatus } = req.body;

  const schedule = await Schedule.findById(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  // Prevent updates if schedule is in-progress or completed
  if (['in-progress', 'completed'].includes(schedule.sessionStatus)) {
    return res.status(400).json({
      success: false,
      message: `Cannot update schedule with status: ${schedule.sessionStatus}`,
    });
  }

  // Update fields
  if (date) schedule.date = new Date(date);
  if (startTime) schedule.startTime = startTime;
  if (endTime) schedule.endTime = endTime;
  if (room) schedule.room = room;
  if (sessionStatus) schedule.sessionStatus = sessionStatus;

  await schedule.save();

  const updatedSchedule = await Schedule.findById(id)
    .populate({
      path: 'classId',
      populate: [
        { path: 'trainer', select: 'name email phone' },
        { path: 'category', select: 'categoryName color' },
      ],
    })
    .populate('bookedMembers', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedSchedule,
    message: 'Schedule updated successfully',
  });
});

// Delete schedule
exports.deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  // Prevent deletion if schedule is in-progress or completed
  if (['in-progress', 'completed'].includes(schedule.sessionStatus)) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete schedule with status: ${schedule.sessionStatus}`,
    });
  }

  // Delete associated bookings
  await Booking.deleteMany({ scheduleId: id });

  await Schedule.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Schedule deleted successfully',
  });
});

// Mark schedule as in-progress
exports.markInProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  schedule.sessionStatus = 'in-progress';
  await schedule.save();

  res.status(200).json({
    success: true,
    data: schedule,
    message: 'Schedule marked as in-progress',
  });
});

// Mark schedule as completed and create attendance records
exports.markCompleted = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  // Create attendance records for all booked members
  const attendanceRecords = schedule.bookedMembers.map((memberId) => ({
    memberId,
    status: 'absent',
    checkInTime: null,
    checkOutTime: null,
    duration: 0,
  }));

  schedule.attendanceRecords = attendanceRecords;
  schedule.sessionStatus = 'completed';
  await schedule.save();

  res.status(200).json({
    success: true,
    data: schedule,
    message: 'Schedule marked as completed',
  });
});

// Cancel schedule
exports.cancelSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await Schedule.findById(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  schedule.sessionStatus = 'cancelled';
  await schedule.save();

  // Delete all bookings for this schedule
  await Booking.deleteMany({ scheduleId: id });

  res.status(200).json({
    success: true,
    data: schedule,
    message: 'Schedule cancelled successfully',
  });
});
