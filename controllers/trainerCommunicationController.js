const Message = require('../models/Message');
const Announcement = require('../models/Announcement');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Send message to member
 * @route   POST /api/trainer/communication/messages
 * @access  Private (Trainer)
 */
const sendMessage = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { receiverId, subject, message, priority, attachments } = req.body;

  // Validate required fields
  if (!receiverId || !message) {
    throw ApiError.badRequest('Please provide receiverId and message');
  }

  // Verify trainer is assigned to this member
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === receiverId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  // Verify member exists
  const member = await User.findById(receiverId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Create message
  const newMessage = await Message.create({
    senderId: trainerId,
    senderModel: 'Trainer',
    receiverId,
    subject: subject || null,
    message,
    messageType: 'text',
    priority: priority || 'normal',
    attachments: attachments || [],
    status: 'sent',
    sentAt: Date.now(),
  });

  // Populate sender details
  await newMessage.populate('senderId', 'fullName email profileImage');

  ApiResponse.created(
    res,
    { message: newMessage.getPublicProfile() },
    'Message sent successfully'
  );
});

/**
 * @desc    Get conversation with member
 * @route   GET /api/trainer/communication/messages/:memberId
 * @access  Private (Trainer)
 */
const getConversation = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { memberId } = req.params;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

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

  // Get conversation
  const messages = await Message.find({
    $or: [
      { senderId: trainerId, receiverId: memberId },
      { senderId: memberId, receiverId: trainerId },
    ],
    deletedBy: { $nin: [trainerId] },
  })
    .populate('senderId', 'fullName email profileImage')
    .populate('receiverId', 'fullName email profileImage')
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalMessages = await Message.countDocuments({
    $or: [
      { senderId: trainerId, receiverId: memberId },
      { senderId: memberId, receiverId: trainerId },
    ],
    deletedBy: { $nin: [trainerId] },
  });

  // Mark all messages from member as read
  await Message.updateMany(
    {
      senderId: memberId,
      receiverId: trainerId,
      readStatus: false,
    },
    {
      readStatus: true,
      readAt: Date.now(),
      status: 'read',
    }
  );

  ApiResponse.success(
    res,
    {
      messages: messages.map((m) => m.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        limit,
      },
    },
    'Conversation retrieved successfully'
  );
});

/**
 * @desc    Get all conversations (inbox)
 * @route   GET /api/trainer/communication/messages
 * @access  Private (Trainer)
 */
const getInbox = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Get unique conversations
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ senderId: trainerId }, { receiverId: trainerId }],
        deletedBy: { $nin: [trainerId] },
      },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$senderId', trainerId] },
            '$receiverId',
            '$senderId',
          ],
        },
        lastMessage: { $first: '$message' },
        lastMessageTime: { $first: '$sentAt' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', trainerId] },
                  { $eq: ['$readStatus', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { lastMessageTime: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  // Populate member details
  const populatedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const member = await User.findById(conv._id).select(
        'fullName email profileImage'
      );
      return {
        memberId: conv._id,
        member,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount,
      };
    })
  );

  const totalConversations = await Message.aggregate([
    {
      $match: {
        $or: [{ senderId: trainerId }, { receiverId: trainerId }],
        deletedBy: { $nin: [trainerId] },
      },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$senderId', trainerId] },
            '$receiverId',
            '$senderId',
          ],
        },
      },
    },
    { $count: 'total' },
  ]);

  const total = totalConversations[0]?.total || 0;

  ApiResponse.success(
    res,
    {
      conversations: populatedConversations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalConversations: total,
        limit,
      },
    },
    'Inbox retrieved successfully'
  );
});

/**
 * @desc    Mark message as read
 * @route   PUT /api/trainer/communication/messages/:id/read
 * @access  Private (Trainer)
 */
const markMessageAsRead = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { id } = req.params;

  const message = await Message.findOne({
    _id: id,
    receiverId: trainerId,
  });

  if (!message) {
    throw ApiError.notFound('Message not found');
  }

  await message.markAsRead();

  ApiResponse.success(
    res,
    { message: message.getPublicProfile() },
    'Message marked as read'
  );
});

/**
 * @desc    Delete message
 * @route   DELETE /api/trainer/communication/messages/:id
 * @access  Private (Trainer)
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { id } = req.params;

  const message = await Message.findOne({
    _id: id,
    $or: [{ senderId: trainerId }, { receiverId: trainerId }],
  });

  if (!message) {
    throw ApiError.notFound('Message not found');
  }

  await message.deleteBy(trainerId);

  ApiResponse.success(res, null, 'Message deleted successfully');
});

/**
 * @desc    Get unread message count
 * @route   GET /api/trainer/communication/messages/unread/count
 * @access  Private (Trainer)
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;

  const unreadCount = await Message.getUnreadCount(trainerId);

  ApiResponse.success(
    res,
    { unreadCount },
    'Unread count retrieved successfully'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get announcements for trainer
 * @route   GET /api/trainer/communication/announcements
 * @access  Private (Trainer)
 */
const getAnnouncements = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Get active announcements for trainers
  const announcements = await Announcement.find({
    status: 'published',
    publishDate: { $lte: new Date() },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } },
    ],
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'trainers' },
    ],
  })
    .populate('createdBy', 'fullName email')
    .sort({ isPinned: -1, publishDate: -1 })
    .skip(skip)
    .limit(limit);

  const totalAnnouncements = await Announcement.countDocuments({
    status: 'published',
    publishDate: { $lte: new Date() },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } },
    ],
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'trainers' },
    ],
  });

  ApiResponse.success(
    res,
    {
      announcements: announcements.map((a) => a.getPublicProfile()),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalAnnouncements / limit),
        totalAnnouncements,
        limit,
      },
    },
    'Announcements retrieved successfully'
  );
});

/**
 * @desc    Get announcement by ID
 * @route   GET /api/trainer/communication/announcements/:id
 * @access  Private (Trainer)
 */
const getAnnouncementById = asyncHandler(async (req, res) => {
  const trainerId = req.user.id;
  const { id } = req.params;

  const announcement = await Announcement.findOne({
    _id: id,
    status: 'published',
    publishDate: { $lte: new Date() },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } },
    ],
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'trainers' },
    ],
  }).populate('createdBy', 'fullName email');

  if (!announcement) {
    throw ApiError.notFound('Announcement not found');
  }

  // Increment view count
  await announcement.incrementViewCount(trainerId);

  ApiResponse.success(
    res,
    { announcement: announcement.getPublicProfile() },
    'Announcement retrieved successfully'
  );
});

/**
 * @desc    Get announcement statistics
 * @route   GET /api/trainer/communication/announcements/stats
 * @access  Private (Trainer)
 */
const getAnnouncementStats = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({
    status: 'published',
    publishDate: { $lte: new Date() },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } },
    ],
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'trainers' },
    ],
  });

  const stats = {
    total: announcements.length,
    byCategory: {},
    byPriority: {
      low: announcements.filter((a) => a.priority === 'low').length,
      medium: announcements.filter((a) => a.priority === 'medium').length,
      high: announcements.filter((a) => a.priority === 'high').length,
      urgent: announcements.filter((a) => a.priority === 'urgent').length,
    },
    pinned: announcements.filter((a) => a.isPinned).length,
    totalViews: announcements.reduce((sum, a) => sum + a.viewCount, 0),
    averageViews: 0,
  };

  // Count by category
  announcements.forEach((announcement) => {
    const category = announcement.category;
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
  });

  // Calculate average views
  if (announcements.length > 0) {
    stats.averageViews = Math.round(stats.totalViews / announcements.length);
  }

  ApiResponse.success(
    res,
    { stats },
    'Announcement statistics retrieved successfully'
  );
});

module.exports = {
  // Messages
  sendMessage,
  getConversation,
  getInbox,
  markMessageAsRead,
  deleteMessage,
  getUnreadCount,
  // Announcements
  getAnnouncements,
  getAnnouncementById,
  getAnnouncementStats,
};
