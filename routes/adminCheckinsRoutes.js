const express = require('express');
const router = express.Router();
const {
  getCheckins,
  getCheckinsStats,
  createCheckin,
  checkoutMember,
} = require('../controllers/adminCheckinsController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/checkins/stats
 * @desc    Get check-in statistics
 * @access  Private (Admin)
 */
router.get('/stats', protectAdmin, getCheckinsStats);

/**
 * @route   GET /api/admin/checkins
 * @desc    Get all check-ins with pagination, filtering, and statistics
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, getCheckins);

/**
 * @route   POST /api/admin/checkins
 * @desc    Create a new check-in
 * @access  Private (Admin)
 */
router.post('/', protectAdmin, createCheckin);

/**
 * @route   POST /api/admin/checkins/:id/checkout
 * @desc    Checkout a member
 * @access  Private (Admin)
 */
router.post('/:id/checkout', protectAdmin, checkoutMember);

module.exports = router;
