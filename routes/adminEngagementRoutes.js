const express = require('express');
const router = express.Router();
const adminEngagementController = require('../controllers/adminEngagementController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// ─── NOTIFICATIONS ROUTES ────────────────────────────────────────────────────
// Specific routes MUST come before generic :id routes
router.get('/notifications/stats', adminEngagementController.getNotificationStats);
router.patch('/notifications/mark-all-read', adminEngagementController.markAllNotificationsAsRead);
router.get('/notifications', adminEngagementController.getAllNotifications);
router.post('/notifications', adminEngagementController.createNotification);
router.get('/notifications/:id', adminEngagementController.getNotificationById);
router.put('/notifications/:id', adminEngagementController.updateNotification);
router.delete('/notifications/:id', adminEngagementController.deleteNotification);
router.patch('/notifications/:id/read', adminEngagementController.markNotificationAsRead);
router.patch('/notifications/:id/unread', adminEngagementController.markNotificationAsUnread);

// ─── ANNOUNCEMENTS ROUTES ────────────────────────────────────────────────────
// Specific routes MUST come before generic :id routes
router.get('/announcements/stats', adminEngagementController.getAnnouncementStats);
router.get('/announcements', adminEngagementController.getAllAnnouncements);
router.post('/announcements', adminEngagementController.createAnnouncement);
router.get('/announcements/:id', adminEngagementController.getAnnouncementById);
router.put('/announcements/:id', adminEngagementController.updateAnnouncement);
router.delete('/announcements/:id', adminEngagementController.deleteAnnouncement);
router.patch('/announcements/:id/publish', adminEngagementController.publishAnnouncement);
router.patch('/announcements/:id/schedule', adminEngagementController.scheduleAnnouncement);

// ─── COMMUNICATION ROUTES ────────────────────────────────────────────────────
router.post('/communication/email', adminEngagementController.sendEmail);
router.post('/communication/sms', adminEngagementController.sendSMS);
router.post('/communication/push', adminEngagementController.sendPushNotification);
router.post('/communication/draft', adminEngagementController.saveDraft);
router.get('/communication/drafts', adminEngagementController.getDrafts);
router.get('/communication/history', adminEngagementController.getCommunicationHistory);
router.get('/communication/stats', adminEngagementController.getCommunicationStats);

module.exports = router;
