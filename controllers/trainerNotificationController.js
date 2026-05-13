const Notification = require('../models/Notification');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const WorkoutPlan = require('../models/WorkoutPlan');
const Session = require('../models/Session');
const DietPlan = require('../models/DietPlan');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Send notification to member
 * @route   POST /api/trainer/notifications
 * @access  Private (Trainer)
 */
const sendNotification = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const {
    recipientId,
    notificationType,
    title,
    message,
    priority,
    actionUrl,
    actionLabel,
    metadata,
    scheduledFor,
    expiresAt,
  } = req.body;

  // Validate required fields
  if (!recipientId || !notificationType || !title || !message) {
    throw ApiError.badRequest(
      'Please provide recipientId, notificationType, title, and message'
    );
  }

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === recipientId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Verify member exists
  const member = await User.findById(recipientId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Create notification
  const notification = await Notification.create({
    recipientId,
    senderId: trainerId,
    notificationType,
    title,
    message,
    priority: priority || 'medium',
    actionUrl: actionUrl || null,
    actionLabel: actionLabel || null,
    metadata: metadata || {},
    scheduledFor: scheduledFor || null,
    sentAt: scheduledFor ? null : Date.now(),
    expiresAt: expiresAt || null,
    status: scheduledFor ? 'pending' : 'sent',
  });

  // Populate sender details
  await notification.populate('senderId', 'fullName email profileImage');

  ApiResponse.created(
    res,
    { notification: notification.getPublicProfile() },
    'Notification sent successfully'
  );
});

/**
 * @desc    Send workout reminder
 * @route   POST /api/trainer/notifications/workout-reminder
 * @access  Private (Trainer)
 */
const sendWorkoutReminder = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { workoutId, customMessage } = req.body;

  if (!workoutId) {
    throw ApiError.badRequest('Please provide workoutId');
  }

  // Get workout
  const workout = await WorkoutPlan.findOne({
    _id: workoutId,
    trainerId,
  }).populate('memberId', 'fullName email');

  if (!workout) {
    throw ApiError.notFound('Workout plan not found');
  }

  const title = '💪 Workout Reminder';
  const message =
    customMessage ||
    `Don't forget to complete your workout: "${workout.workoutTitle}". Stay consistent with your fitness goals!`;

  // Create notification
  const notification = await Notification.create({
    recipientId: workout.memberId._id,
    senderId: trainerId,
    notificationType: 'workout-reminder',
    title,
    message,
    priority: 'medium',
    actionUrl: `/workouts/${workoutId}`,
    actionLabel: 'View Workout',
    metadata: {
      workoutId: workoutId,
    },
    sentAt: Date.now(),
    status: 'sent',
  });

  await notification.populate('senderId', 'fullName email profileImage');

  ApiResponse.created(
    res,
    { notification: notification.getPublicProfile() },
    'Workout reminder sent successfully'
  );
});

/**
 * @desc    Send session reminder
 * @route   POST /api/trainer/notifications/session-reminder
 * @access  Private (Trainer)
 */
const sendSessionReminder = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { sessionId, customMessage } = req.body;

  if (!sessionId) {
    throw ApiError.badRequest('Please provide sessionId');
  }

  // Get session
  const session = await Session.findOne({
    _id: sessionId,
    trainerId,
  }).populate('participants.memberId', 'fullName email');

  if (!session) {
    throw ApiError.notFound('Session not found');
  }

  // Send reminder to all confirmed participants
  const confirmedParticipants = session.participants.filter(
    (p) => p.bookingStatus === 'confirmed' || p.bookingStatus === 'pending'
  );

  if (confirmedParticipants.length === 0) {
    throw ApiError.badRequest('No confirmed participants for this session');
  }

  const sessionDate = new Date(session.sessionDate).toLocaleDateString();
  const sessionTime = new Date(session.startTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const title = '📅 Session Reminder';
  const message =
    customMessage ||
    `Reminder: You have a ${session.sessionType} session "${session.sessionTitle}" scheduled for ${sessionDate} at ${sessionTime}. See you there!`;

  // Create notifications for all participants
  const notifications = await Promise.all(
    confirmedParticipants.map((participant) =>
      Notification.create({
        recipientId: participant.memberId._id,
        senderId: trainerId,
        notificationType: 'session-reminder',
        title,
        message,
        priority: 'high',
        actionUrl: `/sessions/${sessionId}`,
        actionLabel: 'View Session',
        metadata: {
          sessionId: sessionId,
        },
        sentAt: Date.now(),
        status: 'sent',
      })
    )
  );

  ApiResponse.created(
    res,
    {
      count: notifications.length,
      message: `Session reminder sent to ${notifications.length} participant(s)`,
    },
    'Session reminders sent successfully'
  );
});

/**
 * @desc    Send diet reminder
 * @route   POST /api/trainer/notifications/diet-reminder
 * @access  Private (Trainer)
 */
const sendDietReminder = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { dietId, customMessage } = req.body;

  if (!dietId) {
    throw ApiError.badRequest('Please provide dietId');
  }

  // Get diet plan
  const diet = await DietPlan.findOne({
    _id: dietId,
    trainerId,
  }).populate('memberId', 'fullName email');

  if (!diet) {
    throw ApiError.notFound('Diet plan not found');
  }

  const title = '🥗 Diet Plan Reminder';
  const message =
    customMessage ||
    `Remember to follow your diet plan: "${diet.dietTitle}". Stay on track with your nutrition goals!`;

  // Create notification
  const notification = await Notification.create({
    recipientId: diet.memberId._id,
    senderId: trainerId,
    notificationType: 'diet-reminder',
    title,
    message,
    priority: 'medium',
    actionUrl: `/diets/${dietId}`,
    actionLabel: 'View Diet Plan',
    metadata: {
      dietId: dietId,
    },
    sentAt: Date.now(),
    status: 'sent',
  });

  await notification.populate('senderId', 'fullName email profileImage');

  ApiResponse.created(
    res,
    { notification: notification.getPublicProfile() },
    'Diet reminder sent successfully'
  );
});

/**
 * @desc    Get all notifications sent by trainer
 * @route   GET /api/trainer/notifications
 * @access  Private (Trainer)
 */
const getAllNotifications = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Filters
  const filters = { senderId: trainerId };

  if (req.query.notificationType) {
    filters.notificationType = req.query.notificationType;
  }

  if (req.query.priority) {
    filters.priority = req.query.priority;
  }

  if (req.query.status) {
    filters.status = req.query.status;
  }

  if (req.query.recipientId) {
    filters.recipientId = req.query.recipientId;
  }

  // Get notifications
  const notifications = await Notification.find(filters)
    .populate('recipientId', 'fullName email phone profileImage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalNotifications = await Notification.countDocuments(filters);

  ApiResponse.success(
    res,
    {
      notifications: notifications.map((n) => n.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        limit,
      },
    },
    'Notifications retrieved successfully'
  );
});

/**
 * @desc    Get notification by ID
 * @route   GET /api/trainer/notifications/:id
 * @access  Private (Trainer)
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const notificationId = req.params.id;

  const notification = await Notification.findOne({
    _id: notificationId,
    senderId: trainerId,
  })
    .populate('recipientId', 'fullName email phone profileImage')
    .populate('senderId', 'fullName email profileImage');

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  ApiResponse.success(
    res,
    { notification: notification.getPublicProfile() },
    'Notification retrieved successfully'
  );
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/trainer/notifications/:id
 * @access  Private (Trainer)
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const notificationId = req.params.id;

  const notification = await Notification.findOne({
    _id: notificationId,
    senderId: trainerId,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  await notification.deleteOne();

  ApiResponse.success(res, null, 'Notification deleted successfully');
});

/**
 * @desc    Get notification statistics
 * @route   GET /api/trainer/notifications/stats
 * @access  Private (Trainer)
 */
const getNotificationStats = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Get all notifications
  const notifications = await Notification.find({ senderId: trainerId });

  // Calculate statistics
  const stats = {
    total: notifications.length,
    byType: {},
    byPriority: {
      low: notifications.filter((n) => n.priority === 'low').length,
      medium: notifications.filter((n) => n.priority === 'medium').length,
      high: notifications.filter((n) => n.priority === 'high').length,
      urgent: notifications.filter((n) => n.priority === 'urgent').length,
    },
    byStatus: {
      pending: notifications.filter((n) => n.status === 'pending').length,
      sent: notifications.filter((n) => n.status === 'sent').length,
      delivered: notifications.filter((n) => n.status === 'delivered').length,
      failed: notifications.filter((n) => n.status === 'failed').length,
      expired: notifications.filter((n) => n.status === 'expired').length,
    },
    readRate: 0,
    totalRead: notifications.filter((n) => n.isRead).length,
    totalUnread: notifications.filter((n) => !n.isRead).length,
  };

  // Count by type
  notifications.forEach((notification) => {
    const type = notification.notificationType;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });

  // Calculate read rate
  if (notifications.length > 0) {
    stats.readRate = Math.round((stats.totalRead / notifications.length) * 100);
  }

  ApiResponse.success(
    res,
    { stats },
    'Notification statistics retrieved successfully'
  );
});

/**
 * @desc    Send bulk notifications
 * @route   POST /api/trainer/notifications/bulk
 * @access  Private (Trainer)
 */
const sendBulkNotifications = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const { recipientIds, notificationType, title, message, priority } = req.body;

  // Validate required fields
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw ApiError.badRequest('Please provide an array of recipientIds');
  }

  if (!notificationType || !title || !message) {
    throw ApiError.badRequest('Please provide notificationType, title, and message');
  }

  // Verify trainer is assigned to all members
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const assignedMemberIds = trainer.assignedMembers
    .filter((m) => m.status === 'active')
    .map((m) => m.memberId.toString());

  // Filter only assigned members
  const validRecipientIds = recipientIds.filter((id) =>
    assignedMemberIds.includes(id.toString())
  );

  if (validRecipientIds.length === 0) {
    throw ApiError.forbidden('None of the recipients are assigned to you');
  }

  // Create notifications for all valid recipients
  const notifications = await Promise.all(
    validRecipientIds.map((recipientId) =>
      Notification.create({
        recipientId,
        senderId: trainerId,
        notificationType,
        title,
        message,
        priority: priority || 'medium',
        sentAt: Date.now(),
        status: 'sent',
      })
    )
  );

  ApiResponse.created(
    res,
    {
      count: notifications.length,
      skipped: recipientIds.length - validRecipientIds.length,
      message: `Notifications sent to ${notifications.length} member(s)`,
    },
    'Bulk notifications sent successfully'
  );
});

module.exports = {
  sendNotification,
  sendWorkoutReminder,
  sendSessionReminder,
  sendDietReminder,
  getAllNotifications,
  getNotificationById,
  deleteNotification,
  getNotificationStats,
  sendBulkNotifications,
};
