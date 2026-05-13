const express = require('express');
const router = express.Router();
const {
  getAllTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketById,
  assignTicket,
  addComment,
  resolveTicket,
  closeTicket,
  reopenTicket,
  getTicketStats,
} = require('../controllers/adminSupportController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/support/stats
 * @desc    Get ticket statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getTicketStats);

/**
 * @route   GET /api/admin/support
 * @desc    Get all support tickets with filtering
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/', protectAdmin, checkPermission('canManageUsers'), getAllTickets);

/**
 * @route   POST /api/admin/support
 * @desc    Create support ticket
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/', protectAdmin, checkPermission('canManageUsers'), createTicket);

/**
 * @route   GET /api/admin/support/:id
 * @desc    Get ticket by ID
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageUsers'), getTicketById);

/**
 * @route   PUT /api/admin/support/:id
 * @desc    Update support ticket
 * @access  Private (Admin with canManageUsers permission)
 */
router.put('/:id', protectAdmin, checkPermission('canManageUsers'), updateTicket);

/**
 * @route   DELETE /api/admin/support/:id
 * @desc    Delete support ticket
 * @access  Private (Admin with canManageUsers and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageUsers'), checkPermission('canDeleteRecords'), deleteTicket);

/**
 * @route   POST /api/admin/support/:id/assign
 * @desc    Assign ticket to user
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/:id/assign', protectAdmin, checkPermission('canManageUsers'), assignTicket);

/**
 * @route   POST /api/admin/support/:id/comment
 * @desc    Add comment to ticket
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/:id/comment', protectAdmin, checkPermission('canManageUsers'), addComment);

/**
 * @route   POST /api/admin/support/:id/resolve
 * @desc    Resolve ticket
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/:id/resolve', protectAdmin, checkPermission('canManageUsers'), resolveTicket);

/**
 * @route   POST /api/admin/support/:id/close
 * @desc    Close ticket
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/:id/close', protectAdmin, checkPermission('canManageUsers'), closeTicket);

/**
 * @route   POST /api/admin/support/:id/reopen
 * @desc    Reopen ticket
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/:id/reopen', protectAdmin, checkPermission('canManageUsers'), reopenTicket);

module.exports = router;
