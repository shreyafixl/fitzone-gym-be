const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/communicationController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

/**
 * Communication & Engagement Routes
 * Base path: /api/superadmin/communication
 * All routes require authentication and super admin role
 */

// Apply authentication and authorization to all routes
router.use(protect);
router.use(superAdminOnly);

// ============================================================================
// STATISTICS ROUTE
// ============================================================================

/**
 * @route   GET /api/superadmin/communication/stats
 * @desc    Get communication statistics
 * @access  Private (Super Admin only)
 */
router.get('/stats', getCommunicationStats);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

/**
 * @route   GET /api/superadmin/communication/notifications
 * @desc    Get all notifications
 * @query   page, limit, type, recipientType, status, sortBy, sortOrder
 * @access  Private (Super Admin only)
 */
router.get('/notifications', getAllNotifications);

/**
 * @route   GET /api/superadmin/communication/notifications/:id
 * @desc    Get single notification
 * @access  Private (Super Admin only)
 */
router.get('/notifications/:id', getNotificationById);

/**
 * @route   POST /api/superadmin/communication/notifications
 * @desc    Create notification
 * @body    title, message, type, recipientType, recipientIds, branchIds, priority, actionUrl, actionLabel, expiresAt
 * @access  Private (Super Admin only)
 */
router.post('/notifications', createNotification);

/**
 * @route   PUT /api/superadmin/communication/notifications/:id
 * @desc    Update notification
 * @body    title, message, type, priority, actionUrl, actionLabel, expiresAt, status
 * @access  Private (Super Admin only)
 */
router.put('/notifications/:id', updateNotification);

/**
 * @route   DELETE /api/superadmin/communication/notifications/:id
 * @desc    Delete notification
 * @access  Private (Super Admin only)
 */
router.delete('/notifications/:id', deleteNotification);

/**
 * @route   PATCH /api/superadmin/communication/notifications/:id/read
 * @desc    Mark notification as read
 * @body    userId
 * @access  Private (Super Admin only)
 */
router.patch('/notifications/:id/read', markNotificationAsRead);

// ============================================================================
// ANNOUNCEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/superadmin/communication/announcements
 * @desc    Get all announcements
 * @query   page, limit, status, category, targetAudience, isPinned, sortBy, sortOrder
 * @access  Private (Super Admin only)
 */
router.get('/announcements', getAllAnnouncements);

/**
 * @route   GET /api/superadmin/communication/announcements/:id
 * @desc    Get single announcement
 * @access  Private (Super Admin only)
 */
router.get('/announcements/:id', getAnnouncementById);

/**
 * @route   POST /api/superadmin/communication/announcements
 * @desc    Create announcement
 * @body    title, description, targetAudience, targetBranches, publishDate, expiryDate, priority, category, isPinned, tags, status
 * @access  Private (Super Admin only)
 */
router.post('/announcements', createAnnouncement);

/**
 * @route   PUT /api/superadmin/communication/announcements/:id
 * @desc    Update announcement
 * @body    title, description, targetAudience, targetBranches, publishDate, expiryDate, priority, category, isPinned, tags, status
 * @access  Private (Super Admin only)
 */
router.put('/announcements/:id', updateAnnouncement);

/**
 * @route   DELETE /api/superadmin/communication/announcements/:id
 * @desc    Delete announcement
 * @access  Private (Super Admin only)
 */
router.delete('/announcements/:id', deleteAnnouncement);

/**
 * @route   PATCH /api/superadmin/communication/announcements/:id/publish
 * @desc    Publish announcement
 * @access  Private (Super Admin only)
 */
router.patch('/announcements/:id/publish', publishAnnouncement);

/**
 * @route   PATCH /api/superadmin/communication/announcements/:id/archive
 * @desc    Archive announcement
 * @access  Private (Super Admin only)
 */
router.patch('/announcements/:id/archive', archiveAnnouncement);

// ============================================================================
// MESSAGE ROUTES
// ============================================================================

/**
 * @route   GET /api/superadmin/communication/messages
 * @desc    Get all messages (inbox/sent)
 * @query   page, limit, type (all/inbox/sent), readStatus, priority, sortBy, sortOrder
 * @access  Private (Super Admin only)
 */
router.get('/messages', getAllMessages);

/**
 * @route   GET /api/superadmin/communication/messages/conversation/:userId
 * @desc    Get conversation with specific user
 * @access  Private (Super Admin only)
 */
router.get('/messages/conversation/:userId', getConversation);

/**
 * @route   GET /api/superadmin/communication/messages/:id
 * @desc    Get single message
 * @access  Private (Super Admin only)
 */
router.get('/messages/:id', getMessageById);

/**
 * @route   POST /api/superadmin/communication/messages
 * @desc    Send message
 * @body    receiverId, subject, message, messageType, priority, attachments, replyTo
 * @access  Private (Super Admin only)
 */
router.post('/messages', sendMessage);

/**
 * @route   PATCH /api/superadmin/communication/messages/:id/read
 * @desc    Mark message as read
 * @access  Private (Super Admin only)
 */
router.patch('/messages/:id/read', markMessageAsRead);

/**
 * @route   DELETE /api/superadmin/communication/messages/:id
 * @desc    Delete message (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete('/messages/:id', deleteMessage);

module.exports = router;
