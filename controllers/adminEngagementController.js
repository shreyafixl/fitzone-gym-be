const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const Message = require('../models/Message');
const User = require('../models/User');

// ─── NOTIFICATIONS CONTROLLER ────────────────────────────────────────────────

// Get all notifications
exports.getAllNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type, isRead, search } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (type) query.type = type;
  if (isRead !== undefined) query.isRead = isRead === 'true';
  if (search) query.$or = [
    { title: { $regex: search, $options: 'i' } },
    { message: { $regex: search, $options: 'i' } },
  ];

  const total = await Notification.countDocuments(query);
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Notifications retrieved successfully',
  });
});

// Get notification by ID
exports.getNotificationById = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification retrieved successfully',
  });
});

// Create notification
exports.createNotification = asyncHandler(async (req, res) => {
  const { title, message, type = 'system', recipients = [] } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      message: 'Title and message are required',
    });
  }

  const notification = await Notification.create({
    title,
    message,
    type,
    recipients,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: notification,
    message: 'Notification created successfully',
  });
});

// Update notification
exports.updateNotification = asyncHandler(async (req, res) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  notification = await Notification.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification updated successfully',
  });
});

// Delete notification
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Notification deleted successfully',
  });
});

// Mark notification as read
exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification marked as read',
  });
});

// Mark notification as unread
exports.markNotificationAsUnread = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: false, readAt: null },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification marked as unread',
  });
});

// Mark all notifications as read
exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    data: {},
    message: 'All notifications marked as read',
  });
});

// Get notification stats
exports.getNotificationStats = asyncHandler(async (req, res) => {
  const total = await Notification.countDocuments();
  const unread = await Notification.countDocuments({ isRead: false });
  const read = total - unread;

  const typeStats = await Notification.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      unread,
      read,
      byType: typeStats,
    },
    message: 'Notification statistics retrieved successfully',
  });
});

// ─── ANNOUNCEMENTS CONTROLLER ────────────────────────────────────────────────

// Get all announcements
exports.getAllAnnouncements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (status) query.status = status;
  if (search) query.$or = [
    { title: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];

  const total = await Announcement.countDocuments(query);
  const announcements = await Announcement.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: announcements,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Announcements retrieved successfully',
  });
});

// Get announcement by ID
exports.getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  res.status(200).json({
    success: true,
    data: announcement,
    message: 'Announcement retrieved successfully',
  });
});

// Create announcement
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { title, description, targetAudience = 'All Members', status = 'draft', scheduledDate } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Title and description are required',
    });
  }

  const announcement = await Announcement.create({
    title,
    description,
    targetAudience,
    status,
    scheduledDate,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: announcement,
    message: 'Announcement created successfully',
  });
});

// Update announcement
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  let announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: announcement,
    message: 'Announcement updated successfully',
  });
});

// Delete announcement
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Announcement deleted successfully',
  });
});

// Publish announcement
exports.publishAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(
    req.params.id,
    { status: 'published', publishedAt: new Date() },
    { new: true }
  );

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  res.status(200).json({
    success: true,
    data: announcement,
    message: 'Announcement published successfully',
  });
});

// Schedule announcement
exports.scheduleAnnouncement = asyncHandler(async (req, res) => {
  const { scheduledDate } = req.body;

  if (!scheduledDate) {
    return res.status(400).json({
      success: false,
      message: 'Scheduled date is required',
    });
  }

  const announcement = await Announcement.findByIdAndUpdate(
    req.params.id,
    { status: 'scheduled', scheduledDate: new Date(scheduledDate) },
    { new: true }
  );

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found',
    });
  }

  res.status(200).json({
    success: true,
    data: announcement,
    message: 'Announcement scheduled successfully',
  });
});

// Get announcement stats
exports.getAnnouncementStats = asyncHandler(async (req, res) => {
  const total = await Announcement.countDocuments();
  const published = await Announcement.countDocuments({ status: 'published' });
  const scheduled = await Announcement.countDocuments({ status: 'scheduled' });
  const draft = await Announcement.countDocuments({ status: 'draft' });

  res.status(200).json({
    success: true,
    data: {
      total,
      published,
      scheduled,
      draft,
    },
    message: 'Announcement statistics retrieved successfully',
  });
});

// ─── COMMUNICATION CONTROLLER ────────────────────────────────────────────────

// Send email
exports.sendEmail = asyncHandler(async (req, res) => {
  const { subject, message, recipient, template } = req.body;

  if (!subject || !message || !recipient) {
    return res.status(400).json({
      success: false,
      message: 'Subject, message, and recipient are required',
    });
  }

  // TODO: Integrate with email service (SendGrid, Nodemailer, etc.)
  const emailMessage = await Message.create({
    type: 'email',
    subject,
    content: message,
    recipient,
    template,
    status: 'sent',
    sentAt: new Date(),
    sentBy: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: emailMessage,
    message: 'Email sent successfully',
  });
});

// Send SMS
exports.sendSMS = asyncHandler(async (req, res) => {
  const { message, recipient } = req.body;

  if (!message || !recipient) {
    return res.status(400).json({
      success: false,
      message: 'Message and recipient are required',
    });
  }

  // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
  const smsMessage = await Message.create({
    type: 'sms',
    content: message,
    recipient,
    status: 'sent',
    sentAt: new Date(),
    sentBy: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: smsMessage,
    message: 'SMS sent successfully',
  });
});

// Send push notification
exports.sendPushNotification = asyncHandler(async (req, res) => {
  const { title, message, recipient } = req.body;

  if (!title || !message || !recipient) {
    return res.status(400).json({
      success: false,
      message: 'Title, message, and recipient are required',
    });
  }

  // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
  const pushMessage = await Message.create({
    type: 'push',
    subject: title,
    content: message,
    recipient,
    status: 'sent',
    sentAt: new Date(),
    sentBy: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: pushMessage,
    message: 'Push notification sent successfully',
  });
});

// Save draft
exports.saveDraft = asyncHandler(async (req, res) => {
  const { type, subject, message, recipient, template } = req.body;

  if (!type || !message) {
    return res.status(400).json({
      success: false,
      message: 'Type and message are required',
    });
  }

  const draft = await Message.create({
    type,
    subject,
    content: message,
    recipient,
    template,
    status: 'draft',
    savedBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: draft,
    message: 'Draft saved successfully',
  });
});

// Get drafts
exports.getDrafts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type } = req.query;
  const skip = (page - 1) * limit;

  let query = { status: 'draft' };
  if (type) query.type = type;

  const total = await Message.countDocuments(query);
  const drafts = await Message.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: drafts,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Drafts retrieved successfully',
  });
});

// Get communication history
exports.getCommunicationHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type, status } = req.query;
  const skip = (page - 1) * limit;

  let query = { status: { $ne: 'draft' } };
  if (type) query.type = type;
  if (status) query.status = status;

  const total = await Message.countDocuments(query);
  const history = await Message.find(query)
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: history,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    message: 'Communication history retrieved successfully',
  });
});

// Get communication stats
exports.getCommunicationStats = asyncHandler(async (req, res) => {
  const emailsSent = await Message.countDocuments({ type: 'email', status: 'sent' });
  const smsSent = await Message.countDocuments({ type: 'sms', status: 'sent' });
  const pushSent = await Message.countDocuments({ type: 'push', status: 'sent' });
  const drafts = await Message.countDocuments({ status: 'draft' });

  res.status(200).json({
    success: true,
    data: {
      emailsSent,
      smsSent,
      pushSent,
      drafts,
      total: emailsSent + smsSent + pushSent,
    },
    message: 'Communication statistics retrieved successfully',
  });
});
