const express = require('express');
const router = express.Router();
const {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  assignMemberToTrainer,
  unassignMemberFromTrainer,
  addTrainerAttendance,
  getTrainerAttendance,
  updateTrainerAvailability,
  getTrainerAvailability,
  getTrainersByBranch,
  addCertification,
  getTrainerStats,
} = require('../controllers/trainerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Trainer Routes
 * All routes require authentication
 * Some routes require specific roles
 */

// Branch-specific trainers route (must be before /:id to avoid conflict)
router.get(
  '/branch/:branchId',
  protect,
  authorize('superadmin', 'admin'),
  getTrainersByBranch
);

// Main trainer routes
router
  .route('/')
  .get(protect, authorize('superadmin', 'admin'), getAllTrainers)
  .post(protect, authorize('superadmin', 'admin'), createTrainer);

router
  .route('/:id')
  .get(protect, authorize('superadmin', 'admin', 'trainer'), getTrainerById)
  .put(protect, authorize('superadmin', 'admin'), updateTrainer)
  .delete(protect, authorize('superadmin'), deleteTrainer);

// Member assignment routes
router.post(
  '/:id/assign-member',
  protect,
  authorize('superadmin', 'admin'),
  assignMemberToTrainer
);

router.post(
  '/:id/unassign-member',
  protect,
  authorize('superadmin', 'admin'),
  unassignMemberFromTrainer
);

// Attendance routes
router
  .route('/:id/attendance')
  .get(protect, authorize('superadmin', 'admin', 'trainer'), getTrainerAttendance)
  .post(protect, authorize('superadmin', 'admin', 'trainer'), addTrainerAttendance);

// Availability routes
router
  .route('/:id/availability')
  .get(protect, authorize('superadmin', 'admin', 'trainer', 'member'), getTrainerAvailability)
  .put(protect, authorize('superadmin', 'admin', 'trainer'), updateTrainerAvailability);

// Certification routes
router.post(
  '/:id/certifications',
  protect,
  authorize('superadmin', 'admin', 'trainer'),
  addCertification
);

// Statistics route
router.get(
  '/:id/stats',
  protect,
  authorize('superadmin', 'admin', 'trainer'),
  getTrainerStats
);

module.exports = router;
