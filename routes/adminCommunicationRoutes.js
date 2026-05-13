const express = require('express');
const router = express.Router();
const {
  createNotification,
  getAllNotifications,
  sendBulkNotifications,
  createAnnouncement,
  getAllAnnouncements,
  sendMessage,
  sendBulkMessages,
  getAllMessages,
  getCommunicationStats,
} = require('../controllers/adminCommunicationController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/communication/stats
 * @desc    Get communication statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getCommunicationStats);

// Notification routes
/**
 * @route   POST /api/admin/communication/notifications/bulk
 * @desc    Send bulk notifications
 * @access  Private (Admin with canManageSettings permission)
 */
router.post('/notifications/bulk', protectAdmin, checkPermission('canManageSettings'), sendBulkNotifications);

/**
 * @route   GET /api/admin/communication/notifications
 * @desc    Get all notifications
 * @access  Private (Admin with canManageSettings permission)
 */
router.get('/notifications', protectAdmin, checkPermission('canManageSettings'), getAllNotifications);

/**
 * @route   POST /api/admin/communication/notifications
 * @desc    Create notification
 * @access  Private (Admin with canManageSettings permission)
 */
router.post('/notifications', protectAdmin, checkPermission('canManageSettings'), createNotification);

// Announcement routes
/**
 * @route   GET /api/admin/communication/announcements
 * @desc    Get all announcements
 * @access  Private (Admin with canManageSettings permission)
 */
router.get('/announcements', protectAdmin, checkPermission('canManageSettings'), getAllAnnouncements);

/**
 * @route   POST /api/admin/communication/announcements
 * @desc    Create announcement
 * @access  Private (Admin with canManageSettings permission)
 */
router.post('/announcements', protectAdmin, checkPermission('canManageSettings'), createAnnouncement);

// Message routes
/**
 * @route   POST /api/admin/communication/messages/bulk
 * @desc    Send bulk messages
 * @access  Private (Admin with canManageSettings permission)
 */
router.post('/messages/bulk', protectAdmin, checkPermission('canManageSettings'), sendBulkMessages);

/**
 * @route   GET /api/admin/communication/messages
 * @desc    Get all messages
 * @access  Private (Admin with canManageSettings permission)
 */
router.get('/messages', protectAdmin, checkPermission('canManageSettings'), getAllMessages);

/**
 * @route   POST /api/admin/communication/messages
 * @desc    Send message
 * @access  Private (Admin with canManageSettings permission)
 */
router.post('/messages', protectAdmin, checkPermission('canManageSettings'), sendMessage);

module.exports = router;
