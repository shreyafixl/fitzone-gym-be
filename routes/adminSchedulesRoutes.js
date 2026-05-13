const express = require('express');
const router = express.Router();
const adminSchedulesController = require('../controllers/adminSchedulesController');
const { adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// Schedule routes
router.get('/', adminSchedulesController.getAllSchedules);
router.get('/:id', adminSchedulesController.getScheduleById);
router.post('/', adminSchedulesController.createSchedule);
router.put('/:id', adminSchedulesController.updateSchedule);
router.delete('/:id', adminSchedulesController.deleteSchedule);

// Status update routes
router.patch('/:id/in-progress', adminSchedulesController.markInProgress);
router.patch('/:id/completed', adminSchedulesController.markCompleted);
router.patch('/:id/cancel', adminSchedulesController.cancelSchedule);

module.exports = router;
