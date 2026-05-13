const express = require('express');
const router = express.Router();
const {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  assignTicket,
  updateTicketStatus,
  addComment,
  resolveTicket,
  closeTicket,
  reopenTicket,
  getMyTickets,
  getAssignedToMe,
  getTicketStats,
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Support Ticket Routes
 * All routes require authentication
 * Some routes require specific roles
 */

// Statistics route (must be before /:id to avoid conflict)
router.get(
  '/stats',
  protect,
  authorize('superadmin', 'admin'),
  getTicketStats
);

// My tickets route
router.get(
  '/my-tickets',
  protect,
  getMyTickets
);

// Assigned to me route
router.get(
  '/assigned-to-me',
  protect,
  authorize('superadmin', 'admin'),
  getAssignedToMe
);

// Main ticket routes
router
  .route('/')
  .get(protect, authorize('superadmin', 'admin'), getAllTickets)
  .post(protect, createTicket);

router
  .route('/:id')
  .get(protect, getTicketById)
  .put(protect, updateTicket)
  .delete(protect, authorize('superadmin'), deleteTicket);

// Ticket action routes
router.post(
  '/:id/assign',
  protect,
  authorize('superadmin', 'admin'),
  assignTicket
);

router.patch(
  '/:id/status',
  protect,
  authorize('superadmin', 'admin'),
  updateTicketStatus
);

router.post(
  '/:id/comments',
  protect,
  addComment
);

router.post(
  '/:id/resolve',
  protect,
  authorize('superadmin', 'admin'),
  resolveTicket
);

router.post(
  '/:id/close',
  protect,
  authorize('superadmin', 'admin'),
  closeTicket
);

router.post(
  '/:id/reopen',
  protect,
  reopenTicket
);

module.exports = router;
