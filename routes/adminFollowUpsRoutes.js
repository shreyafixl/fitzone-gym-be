const express = require('express');
const router = express.Router();
const adminFollowUpsController = require('../controllers/adminFollowUpsController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Follow-up routes - specific routes first, then generic ones
router.get('/stats/all', adminFollowUpsController.getFollowUpStats);
router.get('/pending/list', adminFollowUpsController.getPendingFollowUps);
router.get('/overdue/list', adminFollowUpsController.getOverdueFollowUps);
router.get('/enquiry/:enquiryId', adminFollowUpsController.getEnquiryFollowUps);
router.get('/', adminFollowUpsController.getAllFollowUps);
router.get('/:id', adminFollowUpsController.getFollowUpById);
router.post('/', adminFollowUpsController.createFollowUp);
router.put('/:id', adminFollowUpsController.updateFollowUp);
router.delete('/:id', adminFollowUpsController.deleteFollowUp);

// Follow-up actions
router.patch('/:id/complete', adminFollowUpsController.markAsCompleted);
router.patch('/:id/reminder', adminFollowUpsController.sendReminder);

module.exports = router;
