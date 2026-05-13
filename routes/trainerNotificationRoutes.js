const express = require('express');
const router = express.Router();
const {
  sendNotification,
  sendWorkoutReminder,
  sendSessionReminder,
  sendDietReminder,
  getAllNotifications,
  getNotificationById,
  deleteNotification,
  getNotificationStats,
  sendBulkNotifications,
} = require('../controllers/trainerNotificationController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   POST /api/trainer/notifications
 * @desc    Send notification to member
 * @access  Private (Trainer)
 */
router.post('/', protectTrainer, sendNotification);

/**
 * @route   GET /api/trainer/notifications
 * @desc    Get all notifications sent by trainer
 * @access  Private (Trainer)
 * @query   page, limit, notificationType, priority, status, recipientId
 */
router.get('/', protectTrainer, getAllNotifications);

/**
 * @route   GET /api/trainer/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Trainer)
 */
router.get('/stats', protectTrainer, getNotificationStats);

/**
 * @route   POST /api/trainer/notifications/bulk
 * @desc    Send bulk notifications
 * @access  Private (Trainer)
 */
router.post('/bulk', protectTrainer, sendBulkNotifications);

/**
 * @route   POST /api/trainer/notifications/workout-reminder
 * @desc    Send workout reminder
 * @access  Private (Trainer)
 */
router.post('/workout-reminder', protectTrainer, sendWorkoutReminder);

/**
 * @route   POST /api/trainer/notifications/session-reminder
 * @desc    Send session reminder
 * @access  Private (Trainer)
 */
router.post('/session-reminder', protectTrainer, sendSessionReminder);

/**
 * @route   POST /api/trainer/notifications/diet-reminder
 * @desc    Send diet reminder
 * @access  Private (Trainer)
 */
router.post('/diet-reminder', protectTrainer, sendDietReminder);

/**
 * @route   GET /api/trainer/notifications/:id
 * @desc    Get notification by ID
 * @access  Private (Trainer)
 */
router.get('/:id', protectTrainer, getNotificationById);

/**
 * @route   DELETE /api/trainer/notifications/:id
 * @desc    Delete notification
 * @access  Private (Trainer)
 */
router.delete('/:id', protectTrainer, deleteNotification);

module.exports = router;
