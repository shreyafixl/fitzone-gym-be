const express = require('express');
const router = express.Router();
const {
  getAllFeedback,
  getFeedbackById,
  getFeedbackStats,
  getFeedbackByRating,
  deleteFeedback,
  exportFeedback,
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Feedback Routes
 * All routes require authentication
 * Most routes require SuperAdmin or Admin role
 */

// Statistics route (must be before /:id to avoid conflict)
router.get(
  '/stats',
  protect,
  authorize('superadmin', 'admin'),
  getFeedbackStats
);

// Export route
router.get(
  '/export',
  protect,
  authorize('superadmin', 'admin'),
  exportFeedback
);

// Rating route
router.get(
  '/rating/:rating',
  protect,
  authorize('superadmin', 'admin'),
  getFeedbackByRating
);

// Main feedback routes
router
  .route('/')
  .get(protect, authorize('superadmin', 'admin'), getAllFeedback);

router
  .route('/:id')
  .get(protect, authorize('superadmin', 'admin'), getFeedbackById)
  .delete(protect, authorize('superadmin', 'admin'), deleteFeedback);

module.exports = router;
