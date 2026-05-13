const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const Message = require('../models/Message');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * @desc    Get all notifications
 * @route   GET /api/superadmin/communication/notifications
 * @access  Private (Super Admin only)
 */
const getAllNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, recipientType, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const query = {};
  if (type && type !== 'all') query.type = type;
  if (recipientType && recipientType !== 'all') query.recipientType = recipientType;
  if (status && status !== 'all') query.status = status;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const notifications = await Notification.find(query)
    .populate('createdBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Notification.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  const stats = {
    total: await Notification.countDocuments(),
    sent: await Notification.countDocuments({ status: 'sent' }),
    pending: await Notification.countDocuments({ status: 'pending' }),
    failed: await Notification.countDocuments({ status: 'failed' }),
  };

  ApiResponse.success(
    res,
    {
      notifications: notifications.map((n) => n.getPublicProfile()),
      pagination: { currentPage: pageNum, totalPages, totalCount, perPage: limitNum },
      stats,
    },
    'Notifications retrieved successfully'
  );
});

/**
 * @desc    Get single notification
 * @route   GET /api/superadmin/communication/notifications/:id
 * @access  Private (Super Admin only)
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('recipientIds', 'fullName email')
    .populate('branchIds', 'branchName branchCode');

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  ApiResponse.success(res, { notification: notification.getPublicProfile() }, 'Notification retrieved successfully');
});

/**
 * @desc    Create notification
 * @route   POST /api/superadmin/communication/notifications
 * @access  Private (Super Admin only)
 */
const createNotification = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    type,
    recipientType,
    recipientIds,
    branchIds,
    priority,
    actionUrl,
    actionLabel,
    expiresAt,
  } = req.body;

  if (!title || !message || !recipientType) {
    throw ApiError.badRequest('Please provide title, message, and recipient type');
  }

  // Validate recipient IDs if specific
  if (recipientType === 'specific' && (!recipientIds || recipientIds.length === 0)) {
    throw ApiError.badRequest('Recipient IDs are required for specific recipient type');
  }

  // Validate branch IDs if branches
  if (recipientType === 'branches' && (!branchIds || branchIds.length === 0)) {
    throw ApiError.badRequest('Branch IDs are required for branches recipient type');
  }

  const notification = await Notification.create({
    title,
    message,
    type: type || 'info',
    recipientType,
    recipientIds: recipientIds || [],
    branchIds: branchIds || [],
    priority: priority || 'medium',
    actionUrl: actionUrl || null,
    actionLabel: actionLabel || null,
    expiresAt: expiresAt || null,
    status: 'sent',
    createdBy: req.user.id,
  });

  await notification.populate('createdBy', 'name email');

  ApiResponse.created(res, { notification: notification.getPublicProfile() }, 'Notification created successfully');
});

/**
 * @desc    Update notification
 * @route   PUT /api/superadmin/communication/notifications/:id
 * @access  Private (Super Admin only)
 */
const updateNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  const { title, message, type, priority, actionUrl, actionLabel, expiresAt, status } = req.body;

  if (title) notification.title = title;
  if (message) notification.message = message;
  if (type) notification.type = type;
  if (priority) notification.priority = priority;
  if (actionUrl !== undefined) notification.actionUrl = actionUrl;
  if (actionLabel !== undefined) notification.actionLabel = actionLabel;
  if (expiresAt !== undefined) notification.expiresAt = expiresAt;
  if (status) notification.status = status;

  await notification.save();
  await notification.populate('createdBy', 'name email');

  ApiResponse.success(res, { notification: notification.getPublicProfile() }, 'Notification updated successfully');
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/superadmin/communication/notifications/:id
 * @access  Private (Super Admin only)
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  await notification.deleteOne();

  ApiResponse.success(res, null, 'Notification deleted successfully');
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/superadmin/communication/notifications/:id/read
 * @access  Private (Super Admin only)
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw ApiError.badRequest('User ID is required');
  }

  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  await notification.markAsRead(userId);

  ApiResponse.success(res, { notification: notification.getPublicProfile() }, 'Notification marked as read');
});

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

/**
 * @desc    Get all announcements
 * @route   GET /api/superadmin/communication/announcements
 * @access  Private (Super Admin only)
 */
const getAllAnnouncements = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    targetAudience,
    isPinned,
    sortBy = 'publishDate',
    sortOrder = 'desc',
  } = req.query;

  const query = {};
  if (status && status !== 'all') query.status = status;
  if (category && category !== 'all') query.category = category;
  if (targetAudience && targetAudience !== 'all') query.targetAudience = targetAudience;
  if (isPinned !== undefined) query.isPinned = isPinned === 'true';

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const announcements = await Announcement.find(query)
    .populate('createdBy', 'name email')
    .populate('targetBranches', 'branchName branchCode')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Announcement.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  const stats = {
    total: await Announcement.countDocuments(),
    published: await Announcement.countDocuments({ status: 'published' }),
    draft: await Announcement.countDocuments({ status: 'draft' }),
    archived: await Announcement.countDocuments({ status: 'archived' }),
    pinned: await Announcement.countDocuments({ isPinned: true }),
  };

  ApiResponse.success(
    res,
    {
      announcements: announcements.map((a) => a.getPublicProfile()),
      pagination: { currentPage: pageNum, totalPages, totalCount, perPage: limitNum },
      stats,
    },
    'Announcements retrieved successfully'
  );
});

/**
 * @desc    Get single announcement
 * @route   GET /api/superadmin/communication/announcements/:id
 * @access  Private (Super Admin only)
 */
const getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email')
    .populate('targetBranches', 'branchName branchCode city');

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  ApiResponse.success(res, { announcement: announcement.getPublicProfile() }, 'Announcement retrieved successfully');
});

/**
 * @desc    Create announcement
 * @route   POST /api/superadmin/communication/announcements
 * @access  Private (Super Admin only)
 */
const createAnnouncement = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    targetAudience,
    targetBranches,
    publishDate,
    expiryDate,
    priority,
    category,
    isPinned,
    tags,
    status,
  } = req.body;

  if (!title || !description || !targetAudience) {
    throw ApiError.badRequest('Please provide title, description, and target audience');
  }

  // Validate target branches if specific-branch
  if (targetAudience === 'specific-branch' && (!targetBranches || targetBranches.length === 0)) {
    throw ApiError.badRequest('Target branches are required for specific-branch audience');
  }

  const announcement = await Announcement.create({
    title,
    description,
    targetAudience,
    targetBranches: targetBranches || [],
    publishDate: publishDate || new Date(),
    expiryDate: expiryDate || null,
    priority: priority || 'medium',
    category: category || 'general',
    isPinned: isPinned || false,
    tags: tags || [],
    status: status || 'draft',
    createdBy: req.user.id,
  });

  await announcement.populate('createdBy', 'name email');

  ApiResponse.created(res, { announcement: announcement.getPublicProfile() }, 'Announcement created successfully');
});

/**
 * @desc    Update announcement
 * @route   PUT /api/superadmin/communication/announcements/:id
 * @access  Private (Super Admin only)
 */
const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  const {
    title,
    description,
    targetAudience,
    targetBranches,
    publishDate,
    expiryDate,
    priority,
    category,
    isPinned,
    tags,
    status,
  } = req.body;

  if (title) announcement.title = title;
  if (description) announcement.description = description;
  if (targetAudience) announcement.targetAudience = targetAudience;
  if (targetBranches !== undefined) announcement.targetBranches = targetBranches;
  if (publishDate) announcement.publishDate = publishDate;
  if (expiryDate !== undefined) announcement.expiryDate = expiryDate;
  if (priority) announcement.priority = priority;
  if (category) announcement.category = category;
  if (isPinned !== undefined) announcement.isPinned = isPinned;
  if (tags !== undefined) announcement.tags = tags;
  if (status) announcement.status = status;

  announcement.lastModifiedBy = req.user.id;

  await announcement.save();
  await announcement.populate('createdBy', 'name email');
  await announcement.populate('lastModifiedBy', 'name email');

  ApiResponse.success(res, { announcement: announcement.getPublicProfile() }, 'Announcement updated successfully');
});

/**
 * @desc    Delete announcement
 * @route   DELETE /api/superadmin/communication/announcements/:id
 * @access  Private (Super Admin only)
 */
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  await announcement.deleteOne();

  ApiResponse.success(res, null, 'Announcement deleted successfully');
});

/**
 * @desc    Publish announcement
 * @route   PATCH /api/superadmin/communication/announcements/:id/publish
 * @access  Private (Super Admin only)
 */
const publishAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  await announcement.publish();

  ApiResponse.success(res, { announcement: announcement.getPublicProfile() }, 'Announcement published successfully');
});

/**
 * @desc    Archive announcement
 * @route   PATCH /api/superadmin/communication/announcements/:id/archive
 * @access  Private (Super Admin only)
 */
const archiveAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  await announcement.archive();

  ApiResponse.success(res, { announcement: announcement.getPublicProfile() }, 'Announcement archived successfully');
});

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * @desc    Get all messages
 * @route   GET /api/superadmin/communication/messages
 * @access  Private (Super Admin only)
 */
const getAllMessages = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type = 'all',
    readStatus,
    priority,
    sortBy = 'sentAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (type === 'inbox') {
    query.receiverId = req.user.id;
  } else if (type === 'sent') {
    query.senderId = req.user.id;
  }

  if (readStatus !== undefined) query.readStatus = readStatus === 'true';
  if (priority && priority !== 'all') query.priority = priority;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const messages = await Message.find(query)
    .populate('senderId', 'fullName email name')
    .populate('receiverId', 'fullName email')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Message.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  const unreadCount = await Message.getUnreadCount(req.user.id);

  ApiResponse.success(
    res,
    {
      messages: messages.map((m) => m.getPublicProfile()),
      pagination: { currentPage: pageNum, totalPages, totalCount, perPage: limitNum },
      unreadCount,
    },
    'Messages retrieved successfully'
  );
});

/**
 * @desc    Get single message
 * @route   GET /api/superadmin/communication/messages/:id
 * @access  Private (Super Admin only)
 */
const getMessageById = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id)
    .populate('senderId', 'fullName email name')
    .populate('receiverId', 'fullName email')
    .populate('replyTo');

  if (!message) {
    throw ApiError.notFound('Message not found');
  }

  ApiResponse.success(res, { message: message.getPublicProfile() }, 'Message retrieved successfully');
});

/**
 * @desc    Send message
 * @route   POST /api/superadmin/communication/messages
 * @access  Private (Super Admin only)
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, subject, message, messageType, priority, attachments, replyTo } = req.body;

  if (!receiverId || !message) {
    throw ApiError.badRequest('Please provide receiver ID and message');
  }

  // Verify receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw ApiError.notFound('Receiver not found');
  }

  const newMessage = await Message.create({
    senderId: req.user.id,
    senderModel: 'SuperAdmin',
    receiverId,
    subject: subject || null,
    message,
    messageType: messageType || 'text',
    priority: priority || 'normal',
    attachments: attachments || [],
    replyTo: replyTo || null,
    status: 'sent',
  });

  await newMessage.populate('senderId', 'name email');
  await newMessage.populate('receiverId', 'fullName email');

  ApiResponse.created(res, { message: newMessage.getPublicProfile() }, 'Message sent successfully');
});

/**
 * @desc    Mark message as read
 * @route   PATCH /api/superadmin/communication/messages/:id/read
 * @access  Private (Super Admin only)
 */
const markMessageAsRead = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    throw ApiError.notFound('Message not found');
  }

  await message.markAsRead();

  ApiResponse.success(res, { message: message.getPublicProfile() }, 'Message marked as read');
});

/**
 * @desc    Delete message
 * @route   DELETE /api/superadmin/communication/messages/:id
 * @access  Private (Super Admin only)
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    throw ApiError.notFound('Message not found');
  }

  await message.deleteBy(req.user.id);

  ApiResponse.success(res, null, 'Message deleted successfully');
});

/**
 * @desc    Get conversation between two users
 * @route   GET /api/superadmin/communication/messages/conversation/:userId
 * @access  Private (Super Admin only)
 */
const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const messages = await Message.getConversation(req.user.id, userId);

  await Message.populate(messages, [
    { path: 'senderId', select: 'fullName email name' },
    { path: 'receiverId', select: 'fullName email' },
  ]);

  ApiResponse.success(
    res,
    { messages: messages.map((m) => m.getPublicProfile()) },
    'Conversation retrieved successfully'
  );
});

/**
 * @desc    Get communication statistics
 * @route   GET /api/superadmin/communication/stats
 * @access  Private (Super Admin only)
 */
const getCommunicationStats = asyncHandler(async (req, res) => {
  const notificationStats = {
    total: await Notification.countDocuments(),
    sent: await Notification.countDocuments({ status: 'sent' }),
    pending: await Notification.countDocuments({ status: 'pending' }),
    failed: await Notification.countDocuments({ status: 'failed' }),
  };

  const announcementStats = {
    total: await Announcement.countDocuments(),
    published: await Announcement.countDocuments({ status: 'published' }),
    draft: await Announcement.countDocuments({ status: 'draft' }),
    archived: await Announcement.countDocuments({ status: 'archived' }),
    pinned: await Announcement.countDocuments({ isPinned: true }),
  };

  const messageStats = {
    total: await Message.countDocuments(),
    sent: await Message.countDocuments({ status: 'sent' }),
    read: await Message.countDocuments({ status: 'read' }),
    unread: await Message.countDocuments({ readStatus: false }),
  };

  const stats = {
    notifications: notificationStats,
    announcements: announcementStats,
    messages: messageStats,
  };

  ApiResponse.success(res, stats, 'Communication statistics retrieved successfully');
});

module.exports = {
  // Notifications
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
  markNotificationAsRead,
  // Announcements
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  // Messages
  getAllMessages,
  getMessageById,
  sendMessage,
  markMessageAsRead,
  deleteMessage,
  getConversation,
  // Stats
  getCommunicationStats,
};
