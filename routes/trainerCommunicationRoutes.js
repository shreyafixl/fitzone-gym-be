const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversation,
  getInbox,
  markMessageAsRead,
  deleteMessage,
  getUnreadCount,
  getAnnouncements,
  getAnnouncementById,
  getAnnouncementStats,
} = require('../controllers/trainerCommunicationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// All routes require authentication and trainer role
router.use(protect);
router.use(authorize('trainer'));

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/trainer/communication/messages
 * @desc    Send message to member
 * @access  Private (Trainer)
 */
router.post('/messages', sendMessage);

/**
 * @route   GET /api/trainer/communication/messages
 * @desc    Get all conversations (inbox)
 * @access  Private (Trainer)
 * @query   page, limit
 */
router.get('/messages', getInbox);

/**
 * @route   GET /api/trainer/communication/messages/unread/count
 * @desc    Get unread message count
 * @access  Private (Trainer)
 */
router.get('/messages/unread/count', getUnreadCount);

/**
 * @route   GET /api/trainer/communication/messages/:memberId
 * @desc    Get conversation with member
 * @access  Private (Trainer)
 * @query   page, limit
 */
router.get('/messages/:memberId', getConversation);

/**
 * @route   PUT /api/trainer/communication/messages/:id/read
 * @desc    Mark message as read
 * @access  Private (Trainer)
 */
router.put('/messages/:id/read', markMessageAsRead);

/**
 * @route   DELETE /api/trainer/communication/messages/:id
 * @desc    Delete message
 * @access  Private (Trainer)
 */
router.delete('/messages/:id', deleteMessage);

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/trainer/communication/announcements
 * @desc    Get announcements for trainer
 * @access  Private (Trainer)
 * @query   page, limit
 */
router.get('/announcements', getAnnouncements);

/**
 * @route   GET /api/trainer/communication/announcements/stats
 * @desc    Get announcement statistics
 * @access  Private (Trainer)
 */
router.get('/announcements/stats', getAnnouncementStats);

/**
 * @route   GET /api/trainer/communication/announcements/:id
 * @desc    Get announcement by ID
 * @access  Private (Trainer)
 */
router.get('/announcements/:id', getAnnouncementById);

module.exports = router;
