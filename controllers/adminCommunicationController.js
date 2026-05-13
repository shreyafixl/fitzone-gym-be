const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const Message = require('../models/Message');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create notification
 * @route   POST /api/admin/communication/notifications
 * @access  Private (Admin)
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
    expiresAt
  } = req.body;

  // Validate required fields
  if (!title || !message || !recipientType) {
    throw ApiError.badRequest('Please provide all required fields: title, message, recipientType');
  }

  // Validate recipient IDs if recipientType is specific
  if (recipientType === 'specific' && (!recipientIds || recipientIds.length === 0)) {
    throw ApiError.badRequest('Please provide recipientIds for specific recipient type');
  }

  // Validate branch IDs if recipientType is branches
  if (recipientType === 'branches' && (!branchIds || branchIds.length === 0)) {
    throw ApiError.badRequest('Please provide branchIds for branches recipient type');
  }

  // Create notification
  const notification = await Notification.create({
    title,
    message,
    type: type || 'info',
    recipientType,
    recipientIds: recipientIds || [],
    branchIds: branchIds || [],
    priority: priority || 'medium',
    actionUrl,
    actionLabel,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    status: 'sent',
    createdBy: req.user.id
  });

  ApiResponse.success(
    res,
    { notification },
    'Notification created successfully',
    201
  );
});

/**
 * @desc    Get all notifications
 * @route   GET /api/admin/communication/notifications
 * @access  Private (Admin)
 */
const getAllNotifications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    recipientType,
    status,
    priority,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (type) {
    query.type = type;
  }

  if (recipientType) {
    query.recipientType = recipientType;
  }

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const notifications = await Notification.find(query)
    .populate('createdBy', 'fullName email')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Add read count
  const notificationsWithDetails = notifications.map(notification => ({
    ...notification,
    readCount: notification.readBy ? notification.readBy.length : 0
  }));

  // Get total count
  const totalNotifications = await Notification.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalNotifications / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      notifications: notificationsWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalNotifications,
        limit: limitNum,
        hasMore
      }
    },
    'Notifications retrieved successfully'
  );
});

/**
 * @desc    Send bulk notifications
 * @route   POST /api/admin/communication/notifications/bulk
 * @access  Private (Admin)
 */
const sendBulkNotifications = asyncHandler(async (req, res) => {
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
    expiresAt
  } = req.body;

  // Validate required fields
  if (!title || !message || !recipientType) {
    throw ApiError.badRequest('Please provide all required fields: title, message, recipientType');
  }

  let targetRecipients = [];

  // Determine recipients based on type
  if (recipientType === 'all') {
    const allUsers = await User.find({ isActive: true }).select('_id');
    targetRecipients = allUsers.map(user => user._id);
  } else if (recipientType === 'users') {
    const members = await User.find({ role: 'member', isActive: true }).select('_id');
    targetRecipients = members.map(user => user._id);
  } else if (recipientType === 'trainers') {
    const trainers = await User.find({ role: 'trainer', isActive: true }).select('_id');
    targetRecipients = trainers.map(user => user._id);
  } else if (recipientType === 'branches' && branchIds && branchIds.length > 0) {
    // Get users from specific branches
    const branchUsers = await User.find({ 
      branch: { $in: branchIds },
      isActive: true 
    }).select('_id');
    targetRecipients = branchUsers.map(user => user._id);
  } else if (recipientType === 'specific' && recipientIds && recipientIds.length > 0) {
    targetRecipients = recipientIds;
  }

  if (targetRecipients.length === 0) {
    throw ApiError.badRequest('No recipients found for the specified criteria');
  }

  // Create notification
  const notification = await Notification.create({
    title,
    message,
    type: type || 'info',
    recipientType,
    recipientIds: targetRecipients,
    branchIds: branchIds || [],
    priority: priority || 'medium',
    actionUrl,
    actionLabel,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    status: 'sent',
    createdBy: req.user.id
  });

  ApiResponse.success(
    res,
    {
      notification,
      recipientCount: targetRecipients.length
    },
    `Bulk notification sent to ${targetRecipients.length} recipients`,
    201
  );
});

/**
 * @desc    Create announcement
 * @route   POST /api/admin/communication/announcements
 * @access  Private (Admin)
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
    attachments,
    isPinned,
    tags
  } = req.body;

  // Validate required fields
  if (!title || !description || !targetAudience) {
    throw ApiError.badRequest('Please provide all required fields: title, description, targetAudience');
  }

  // Validate target branches if targetAudience is specific-branch
  if (targetAudience === 'specific-branch' && (!targetBranches || targetBranches.length === 0)) {
    throw ApiError.badRequest('Please provide targetBranches for specific-branch audience');
  }

  // Create announcement
  const announcement = await Announcement.create({
    title,
    description,
    targetAudience,
    targetBranches: targetBranches || [],
    publishDate: publishDate ? new Date(publishDate) : new Date(),
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    priority: priority || 'medium',
    status: 'published',
    category: category || 'general',
    attachments: attachments || [],
    isPinned: isPinned || false,
    tags: tags || [],
    createdBy: req.user.id
  });

  ApiResponse.success(
    res,
    { announcement },
    'Announcement created successfully',
    201
  );
});

/**
 * @desc    Get all announcements
 * @route   GET /api/admin/communication/announcements
 * @access  Private (Admin)
 */
const getAllAnnouncements = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    category,
    targetAudience,
    isPinned,
    sortBy = 'publishDate',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (targetAudience) {
    query.targetAudience = targetAudience;
  }

  if (isPinned !== undefined) {
    query.isPinned = isPinned === 'true';
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const announcements = await Announcement.find(query)
    .populate('createdBy', 'fullName email')
    .populate('targetBranches', 'branchName branchCode')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalAnnouncements = await Announcement.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalAnnouncements / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      announcements,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalAnnouncements,
        limit: limitNum,
        hasMore
      }
    },
    'Announcements retrieved successfully'
  );
});

/**
 * @desc    Send message
 * @route   POST /api/admin/communication/messages
 * @access  Private (Admin)
 */
const sendMessage = asyncHandler(async (req, res) => {
  const {
    receiverId,
    subject,
    message,
    messageType,
    priority,
    attachments
  } = req.body;

  // Validate required fields
  if (!receiverId || !message) {
    throw ApiError.badRequest('Please provide all required fields: receiverId, message');
  }

  // Verify receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw ApiError.notFound('Receiver not found');
  }

  // Create message
  const newMessage = await Message.create({
    senderId: req.user.id,
    senderModel: 'Admin',
    receiverId,
    subject,
    message,
    messageType: messageType || 'text',
    priority: priority || 'normal',
    attachments: attachments || [],
    status: 'sent',
    sentAt: new Date()
  });

  // Populate and return
  const populatedMessage = await Message.findById(newMessage._id)
    .populate('receiverId', 'fullName email phone');

  ApiResponse.success(
    res,
    { message: populatedMessage },
    'Message sent successfully',
    201
  );
});

/**
 * @desc    Send bulk messages
 * @route   POST /api/admin/communication/messages/bulk
 * @access  Private (Admin)
 */
const sendBulkMessages = asyncHandler(async (req, res) => {
  const {
    recipientIds,
    recipientType,
    branchIds,
    subject,
    message,
    messageType,
    priority,
    attachments
  } = req.body;

  // Validate required fields
  if (!message || !recipientType) {
    throw ApiError.badRequest('Please provide all required fields: message, recipientType');
  }

  let targetRecipients = [];

  // Determine recipients based on type
  if (recipientType === 'all') {
    const allUsers = await User.find({ isActive: true }).select('_id');
    targetRecipients = allUsers.map(user => user._id);
  } else if (recipientType === 'members') {
    const members = await User.find({ role: 'member', isActive: true }).select('_id');
    targetRecipients = members.map(user => user._id);
  } else if (recipientType === 'trainers') {
    const trainers = await User.find({ role: 'trainer', isActive: true }).select('_id');
    targetRecipients = trainers.map(user => user._id);
  } else if (recipientType === 'branches' && branchIds && branchIds.length > 0) {
    const branchUsers = await User.find({ 
      branch: { $in: branchIds },
      isActive: true 
    }).select('_id');
    targetRecipients = branchUsers.map(user => user._id);
  } else if (recipientType === 'specific' && recipientIds && recipientIds.length > 0) {
    targetRecipients = recipientIds;
  }

  if (targetRecipients.length === 0) {
    throw ApiError.badRequest('No recipients found for the specified criteria');
  }

  // Create messages for all recipients
  const messages = targetRecipients.map(recipientId => ({
    senderId: req.user.id,
    senderModel: 'Admin',
    receiverId: recipientId,
    subject,
    message,
    messageType: messageType || 'text',
    priority: priority || 'normal',
    attachments: attachments || [],
    status: 'sent',
    sentAt: new Date()
  }));

  // Bulk insert messages
  const createdMessages = await Message.insertMany(messages);

  ApiResponse.success(
    res,
    {
      messageCount: createdMessages.length,
      recipientCount: targetRecipients.length
    },
    `Bulk messages sent to ${targetRecipients.length} recipients`,
    201
  );
});

/**
 * @desc    Get all messages
 * @route   GET /api/admin/communication/messages
 * @access  Private (Admin)
 */
const getAllMessages = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    messageType,
    priority,
    status,
    readStatus,
    sortBy = 'sentAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = { senderId: req.user.id };

  if (messageType) {
    query.messageType = messageType;
  }

  if (priority) {
    query.priority = priority;
  }

  if (status) {
    query.status = status;
  }

  if (readStatus !== undefined) {
    query.readStatus = readStatus === 'true';
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const messages = await Message.find(query)
    .populate('receiverId', 'fullName email phone')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalMessages = await Message.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalMessages / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      messages,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalMessages,
        limit: limitNum,
        hasMore
      }
    },
    'Messages retrieved successfully'
  );
});

/**
 * @desc    Get communication statistics
 * @route   GET /api/admin/communication/stats
 * @access  Private (Admin)
 */
const getCommunicationStats = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    startDate = new Date(0);
  }

  // Notification stats
  const totalNotifications = await Notification.countDocuments();
  const sentNotifications = await Notification.countDocuments({ status: 'sent' });
  const newNotifications = await Notification.countDocuments({
    createdAt: { $gte: startDate }
  });

  // Announcement stats
  const totalAnnouncements = await Announcement.countDocuments();
  const publishedAnnouncements = await Announcement.countDocuments({ status: 'published' });
  const newAnnouncements = await Announcement.countDocuments({
    createdAt: { $gte: startDate }
  });

  // Message stats
  const totalMessages = await Message.countDocuments();
  const sentMessages = await Message.countDocuments({ status: 'sent' });
  const readMessages = await Message.countDocuments({ readStatus: true });
  const newMessages = await Message.countDocuments({
    createdAt: { $gte: startDate }
  });

  // Read rate
  const readRate = totalMessages > 0 
    ? ((readMessages / totalMessages) * 100).toFixed(2)
    : 0;

  ApiResponse.success(
    res,
    {
      period,
      notifications: {
        total: totalNotifications,
        sent: sentNotifications,
        new: newNotifications
      },
      announcements: {
        total: totalAnnouncements,
        published: publishedAnnouncements,
        new: newAnnouncements
      },
      messages: {
        total: totalMessages,
        sent: sentMessages,
        read: readMessages,
        new: newMessages,
        readRate: parseFloat(readRate)
      }
    },
    'Communication statistics retrieved successfully'
  );
});

module.exports = {
  createNotification,
  getAllNotifications,
  sendBulkNotifications,
  createAnnouncement,
  getAllAnnouncements,
  sendMessage,
  sendBulkMessages,
  getAllMessages,
  getCommunicationStats,
};
