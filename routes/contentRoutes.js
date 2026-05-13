const express = require('express');
const router = express.Router();
const {
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
} = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Content Routes
 * All routes require authentication
 * Most routes require SuperAdmin or Admin role
 */

// Main content routes
router
  .route('/')
  .get(protect, authorize('superadmin', 'admin'), getAllContent)
  .post(protect, authorize('superadmin', 'admin'), createContent);

router
  .route('/:id')
  .get(protect, authorize('superadmin', 'admin'), getContentById)
  .put(protect, authorize('superadmin', 'admin'), updateContent)
  .delete(protect, authorize('superadmin', 'admin'), deleteContent);

// Publish/Unpublish routes
router.patch(
  '/:id/publish',
  protect,
  authorize('superadmin', 'admin'),
  publishContent
);

router.patch(
  '/:id/unpublish',
  protect,
  authorize('superadmin', 'admin'),
  unpublishContent
);

module.exports = router;
