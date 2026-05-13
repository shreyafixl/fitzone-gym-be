const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const User = require('../models/User');

// Get all bookings with pagination and filtering
exports.getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, scheduleId, memberId, status, startDate, endDate, search } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (scheduleId) query.scheduleId = scheduleId;
  if (memberId) query.memberId = memberId;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.bookingDate = {};
    if (startDate) query.bookingDate.$gte = new Date(startDate);
    if (endDate) query.bookingDate.$lte = new Date(endDate);
  }

  // Search by member name or email
  if (search) {
    const members = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    });
    const memberIds = members.map((m) => m._id);
    query.memberId = { $in: memberIds };
  }

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate({
      path: 'scheduleId',
      populate: {
        path: 'classId',
        populate: [
          { path: 'trainer', select: 'name email phone' },
          { path: 'category', select: 'categoryName' },
        ],
      },
    })
    .populate('memberId', 'name email phone membership status')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ bookingDate: -1 });

  res.status(200).json({
    success: true,
    data: bookings,
    message: 'Bookings retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get bookings for a specific schedule
exports.getScheduleBookings = asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  const total = await Booking.countDocuments({ scheduleId, status: 'active' });
  const bookings = await Booking.find({ scheduleId, status: 'active' })
    .populate('memberId', 'name email phone membership status')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ bookingDate: 1 });

  res.status(200).json({
    success: true,
    data: bookings,
    message: 'Schedule bookings retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Create new booking
exports.createBooking = asyncHandler(async (req, res) => {
  const { scheduleId, memberId } = req.body;

  // Validate required fields
  if (!scheduleId || !memberId) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'scheduleId', message: 'Schedule ID is required' },
        { field: 'memberId', message: 'Member ID is required' },
      ],
    });
  }

  // Check if schedule exists
  const schedule = await Schedule.findById(scheduleId).populate('classId');
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }

  // Check if member exists
  const member = await User.findById(memberId);
  if (!member) {
    return res.status(404).json({
      success: false,
      message: 'Member not found',
    });
  }

  // Check if member is already booked
  const existingBooking = await Booking.findOne({
    scheduleId,
    memberId,
    status: { $in: ['active', 'completed'] },
  });

  if (existingBooking) {
    return res.status(400).json({
      success: false,
      message: 'Member is already booked for this schedule',
    });
  }

  // Check capacity
  const bookedCount = await Booking.countDocuments({
    scheduleId,
    status: 'active',
  });

  const isWaitlisted = bookedCount >= schedule.classId.capacity;

  // Create booking
  const newBooking = await Booking.create({
    scheduleId,
    memberId,
    status: 'active',
    isWaitlisted,
    waitlistPosition: isWaitlisted ? bookedCount - schedule.classId.capacity + 1 : null,
  });

  // Add member to schedule's bookedMembers if not waitlisted
  if (!isWaitlisted) {
    await Schedule.findByIdAndUpdate(scheduleId, {
      $push: { bookedMembers: memberId },
    });
  }

  const populatedBooking = await Booking.findById(newBooking._id)
    .populate({
      path: 'scheduleId',
      populate: {
        path: 'classId',
        populate: [
          { path: 'trainer', select: 'name email phone' },
          { path: 'category', select: 'categoryName' },
        ],
      },
    })
    .populate('memberId', 'name email phone membership status');

  res.status(201).json({
    success: true,
    data: populatedBooking,
    message: isWaitlisted ? 'Member added to waitlist' : 'Booking created successfully',
  });
});

// Cancel booking
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Remove member from schedule's bookedMembers if not waitlisted
  if (!booking.isWaitlisted) {
    await Schedule.findByIdAndUpdate(booking.scheduleId, {
      $pull: { bookedMembers: booking.memberId },
    });

    // Check if there are waitlisted members and promote the first one
    const waitlistedBooking = await Booking.findOne({
      scheduleId: booking.scheduleId,
      isWaitlisted: true,
      status: 'active',
    }).sort({ createdAt: 1 });

    if (waitlistedBooking) {
      waitlistedBooking.isWaitlisted = false;
      waitlistedBooking.waitlistPosition = null;
      await waitlistedBooking.save();

      await Schedule.findByIdAndUpdate(booking.scheduleId, {
        $push: { bookedMembers: waitlistedBooking.memberId },
      });
    }
  }

  booking.status = 'cancelled';
  booking.cancellationDate = new Date();
  await booking.save();

  res.status(200).json({
    success: true,
    data: booking,
    message: 'Booking cancelled successfully',
  });
});

// Get member bookings
exports.getMemberBookings = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  let query = { memberId };
  if (status) query.status = status;

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate({
      path: 'scheduleId',
      populate: {
        path: 'classId',
        populate: [
          { path: 'trainer', select: 'name email phone' },
          { path: 'category', select: 'categoryName' },
        ],
      },
    })
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ bookingDate: -1 });

  res.status(200).json({
    success: true,
    data: bookings,
    message: 'Member bookings retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get booking statistics
exports.getBookingStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = {};
  if (startDate || endDate) {
    query.bookingDate = {};
    if (startDate) query.bookingDate.$gte = new Date(startDate);
    if (endDate) query.bookingDate.$lte = new Date(endDate);
  }

  const totalBookings = await Booking.countDocuments(query);
  const activeBookings = await Booking.countDocuments({ ...query, status: 'active' });
  const cancelledBookings = await Booking.countDocuments({ ...query, status: 'cancelled' });
  const waitlistedBookings = await Booking.countDocuments({ ...query, isWaitlisted: true });

  res.status(200).json({
    success: true,
    data: {
      totalBookings,
      activeBookings,
      cancelledBookings,
      waitlistedBookings,
    },
    message: 'Booking statistics retrieved successfully',
  });
});
