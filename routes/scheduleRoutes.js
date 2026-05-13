const express = require('express');
const router = express.Router();
const {
  getAllSchedules,
  getScheduleById,
  getTrainerSchedule,
  getBranchSchedule,
  getMemberSchedule,
  getScheduleStats,
  createSchedule,
  updateSchedule,
  cancelSchedule,
  rescheduleSchedule,
  completeSchedule,
  addParticipant,
  removeParticipant,
  deleteSchedule,
} = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Schedule Routes
 * All routes require authentication
 * Some routes require specific roles
 */

// Statistics route (must be before /:id to avoid conflict)
router.get(
  '/stats/overview',
  protect,
  authorize('superadmin', 'admin'),
  getScheduleStats
);

// Trainer schedule route
router.get(
  '/trainer/:trainerId',
  protect,
  authorize('superadmin', 'admin', 'trainer'),
  getTrainerSchedule
);

// Branch schedule route
router.get(
  '/branch/:branchId',
  protect,
  authorize('superadmin', 'admin'),
  getBranchSchedule
);

// Member schedule route
router.get(
  '/member/:memberId',
  protect,
  authorize('superadmin', 'admin', 'trainer', 'member'),
  getMemberSchedule
);

// Main schedule routes
router
  .route('/')
  .get(protect, authorize('superadmin', 'admin', 'trainer'), getAllSchedules)
  .post(protect, authorize('superadmin', 'admin'), createSchedule);

router
  .route('/:id')
  .get(protect, authorize('superadmin', 'admin', 'trainer'), getScheduleById)
  .put(protect, authorize('superadmin', 'admin'), updateSchedule)
  .delete(protect, authorize('superadmin', 'admin'), deleteSchedule);

// Schedule action routes
router.patch(
  '/:id/cancel',
  protect,
  authorize('superadmin', 'admin'),
  cancelSchedule
);

router.patch(
  '/:id/reschedule',
  protect,
  authorize('superadmin', 'admin'),
  rescheduleSchedule
);

router.patch(
  '/:id/complete',
  protect,
  authorize('superadmin', 'admin', 'trainer'),
  completeSchedule
);

// Participant management routes
router.patch(
  '/:id/participants/add',
  protect,
  authorize('superadmin', 'admin', 'trainer'),
  addParticipant
);

router.patch(
  '/:id/participants/remove',
  protect,
  authorize('superadmin', 'admin', 'trainer'),
  removeParticipant
);

module.exports = router;
