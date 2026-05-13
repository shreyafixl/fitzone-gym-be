const Session = require('../models/Session');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create new session
 * @route   POST /api/trainer/schedule
 * @access  Private (Trainer)
 */
const createSession = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const {
    sessionType,
    sessionTitle,
    sessionDescription,
    sessionDate,
    startTime,
    endTime,
    branchId,
    location,
    maxParticipants,
    sessionCategory,
    difficultyLevel,
    price,
    isRecurring,
    recurringPattern,
    notes,
    equipment,
    prerequisites,
  } = req.body;

  // Validate required fields
  if (!sessionType || !sessionTitle || !sessionDate || !startTime || !endTime || !branchId) {
    throw ApiError.badRequest(
      'Please provide sessionType, sessionTitle, sessionDate, startTime, endTime, and branchId'
    );
  }

  // Validate time
  if (new Date(startTime) >= new Date(endTime)) {
    throw ApiError.badRequest('End time must be after start time');
  }

  // Check for scheduling conflicts
  const conflictingSession = await Session.findOne({
    trainerId,
    sessionStatus: { $in: ['scheduled', 'in-progress'] },
    $or: [
      {
        startTime: { $lt: new Date(endTime) },
        endTime: { $gt: new Date(startTime) },
      },
    ],
  });

  if (conflictingSession) {
    throw ApiError.conflict('You have a conflicting session at this time');
  }

  // Create session
  const session = await Session.create({
    trainerId,
    sessionType,
    sessionTitle,
    sessionDescription: sessionDescription || null,
    sessionDate: new Date(sessionDate),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    branchId,
    location: location || null,
    maxParticipants: maxParticipants || (sessionType === 'personal-training' ? 1 : 10),
    sessionCategory: sessionCategory || 'other',
    difficultyLevel: difficultyLevel || 'all-levels',
    price: price || 0,
    isRecurring: isRecurring || false,
    recurringPattern: recurringPattern || {},
    notes: notes || null,
    equipment: equipment || [],
    prerequisites: prerequisites || null,
    sessionStatus: 'scheduled',
    participants: [],
    createdBy: trainerId,
  });

  // Populate branch details
  await session.populate('branchId', 'branchName branchCode address');

  ApiResponse.created(
    res,
    { session: session.getPublicProfile() },
    'Session created successfully'
  );
});

/**
 * @desc    Get all sessions for trainer
 * @route   GET /api/trainer/schedule
 * @access  Private (Trainer)
 */
const getAllSessions = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Filters
  const filters = { trainerId };

  if (req.query.sessionType) {
    filters.sessionType = req.query.sessionType;
  }

  if (req.query.sessionStatus) {
    filters.sessionStatus = req.query.sessionStatus;
  }

  if (req.query.branchId) {
    filters.branchId = req.query.branchId;
  }

  // Date range filter
  if (req.query.startDate && req.query.endDate) {
    filters.sessionDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate),
    };
  }

  // Get sessions
  const sessions = await Session.find(filters)
    .populate('branchId', 'branchName branchCode')
    .populate('participants.memberId', 'fullName email phone profileImage')
    .sort({ sessionDate: 1, startTime: 1 })
    .skip(skip)
    .limit(limit);

  const totalSessions = await Session.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      sessions: sessions.map((s) => s.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        totalSessions,
        limit,
      },
    },
    'Sessions retrieved successfully'
  );
});

/**
 * @desc    Get session by ID
 * @route   GET /api/trainer/schedule/:id
 * @access  Private (Trainer)
 */
const getSessionById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;

  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  })
    .populate('branchId', 'branchName branchCode address phone')
    .populate('participants.memberId', 'fullName email phone profileImage membershipStatus');

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  ApiResponse.success(
    res,
    { session: session.getPublicProfile() },
    'Session retrieved successfully'
  );
});

/**
 * @desc    Update session
 * @route   PUT /api/trainer/schedule/:id
 * @access  Private (Trainer)
 */
const updateSession = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;

  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  });

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  const {
    sessionTitle,
    sessionDescription,
    sessionDate,
    startTime,
    endTime,
    location,
    maxParticipants,
    sessionCategory,
    difficultyLevel,
    price,
    notes,
    equipment,
    prerequisites,
  } = req.body;

  // Update fields
  if (sessionTitle) session.sessionTitle = sessionTitle;
  if (sessionDescription !== undefined) session.sessionDescription = sessionDescription;
  if (sessionDate) session.sessionDate = new Date(sessionDate);
  if (startTime) session.startTime = new Date(startTime);
  if (endTime) session.endTime = new Date(endTime);
  if (location !== undefined) session.location = location;
  if (maxParticipants) session.maxParticipants = maxParticipants;
  if (sessionCategory) session.sessionCategory = sessionCategory;
  if (difficultyLevel) session.difficultyLevel = difficultyLevel;
  if (price !== undefined) session.price = price;
  if (notes !== undefined) session.notes = notes;
  if (equipment) session.equipment = equipment;
  if (prerequisites !== undefined) session.prerequisites = prerequisites;

  // Validate time if updated
  if (session.startTime >= session.endTime) {
    throw ApiError.badRequest('End time must be after start time');
  }

  await session.save();

  await session.populate('branchId', 'branchName branchCode');

  ApiResponse.success(
    res,
    { session: session.getPublicProfile() },
    'Session updated successfully'
  );
});

/**
 * @desc    Delete session
 * @route   DELETE /api/trainer/schedule/:id
 * @access  Private (Trainer)
 */
const deleteSession = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;

  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  });

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  // Check if session has participants
  if (session.participants.length > 0) {
    throw ApiError.conflict(
      'Cannot delete session with participants. Please cancel the session instead.'
    );
  }

  await session.deleteOne();

  ApiResponse.success(res, null, 'Session deleted successfully');
});

/**
 * @desc    Book session for member
 * @route   POST /api/trainer/schedule/:id/book
 * @access  Private (Trainer)
 */
const bookSession = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;
  const { memberId, notes } = req.body;

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

  // Get session
  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  });

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  if (session.sessionStatus !== 'scheduled') {
    throw ApiError.conflict('Can only book scheduled sessions');
  }

  // Book session
  try {
    await session.bookSession(memberId, notes);
  } catch (error) {
    throw ApiError.conflict(error.message);
  }

  await session.populate('participants.memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { session: session.getPublicProfile() },
    'Session booked successfully'
  );
});

/**
 * @desc    Cancel booking
 * @route   DELETE /api/trainer/schedule/:id/booking/:memberId
 * @access  Private (Trainer)
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;
  const memberId = req.params.memberId;

  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  });

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  // Cancel booking
  try {
    await session.cancelBooking(memberId);
  } catch (error) {
    throw ApiError.notFound(error.message);
  }

  await session.populate('participants.memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { session: session.getPublicProfile() },
    'Booking cancelled successfully'
  );
});

/**
 * @desc    Cancel session
 * @route   PUT /api/trainer/schedule/:id/cancel
 * @access  Private (Trainer)
 */
const cancelSession = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;
  const { reason } = req.body;

  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  });

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  await session.cancelSession(reason || 'No reason provided');

  ApiResponse.success(
    res,
    { session: session.getPublicProfile() },
    'Session cancelled successfully'
  );
});

/**
 * @desc    Mark attendance
 * @route   PUT /api/trainer/schedule/:id/attendance/:memberId
 * @access  Private (Trainer)
 */
const markAttendance = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const sessionId = req.params.id;
  const memberId = req.params.memberId;
  const { attended } = req.body;

  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  });

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  // Mark attendance
  try {
    await session.markAttendance(memberId, attended !== false);
  } catch (error) {
    throw ApiError.notFound(error.message);
  }

  await session.populate('participants.memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { session: session.getPublicProfile() },
    'Attendance marked successfully'
  );
});

/**
 * @desc    Get trainer availability
 * @route   GET /api/trainer/schedule/availability
 * @access  Private (Trainer)
 */
const getAvailability = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get date range (default: next 7 days)
  const startDate = req.query.startDate
    ? new Date(req.query.startDate)
    : new Date();
  const endDate = req.query.endDate
    ? new Date(req.query.endDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Get trainer details
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get scheduled sessions
  const sessions = await Session.find({
    trainerId,
    sessionDate: { $gte: startDate, $lte: endDate },
    sessionStatus: { $in: ['scheduled', 'in-progress'] },
  }).sort({ sessionDate: 1, startTime: 1 });

  // Build availability calendar
  const availability = {
    dateRange: { startDate, endDate },
    weeklySchedule: trainer.availability,
    bookedSlots: sessions.map((s) => ({
      sessionId: s._id,
      sessionTitle: s.sessionTitle,
      date: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
    })),
  };

  ApiResponse.success(
    res,
    availability,
    'Availability retrieved successfully'
  );
});

/**
 * @desc    Get upcoming sessions
 * @route   GET /api/trainer/schedule/upcoming
 * @access  Private (Trainer)
 */
const getUpcomingSessions = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const limit = parseInt(req.query.limit) || 10;

  const sessions = await Session.getUpcomingSessions(trainerId);

  ApiResponse.success(
    res,
    { sessions: sessions.slice(0, limit).map((s) => s.getPublicProfile()) },
    'Upcoming sessions retrieved successfully'
  );
});

module.exports = {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  bookSession,
  cancelBooking,
  cancelSession,
  markAttendance,
  getAvailability,
  getUpcomingSessions,
};
