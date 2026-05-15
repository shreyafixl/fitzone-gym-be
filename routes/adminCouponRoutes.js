const express = require('express');
const router = express.Router();
const {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats
} = require('../controllers/adminCouponController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/coupons/stats
 * @desc    Get coupon statistics
 * @access  Private (Admin)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getCouponStats);

/**
 * @route   GET /api/admin/coupons
 * @desc    Get all coupons with filtering and pagination
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, checkPermission('canManageSettings'), getAllCoupons);

/**
 * @route   POST /api/admin/coupons
 * @desc    Create new coupon
 * @access  Private (Admin)
 */
router.post('/', protectAdmin, checkPermission('canManageSettings'), createCoupon);

/**
 * @route   GET /api/admin/coupons/:id
 * @desc    Get coupon by ID
 * @access  Private (Admin)
 */
router.get('/:id', protectAdmin, checkPermission('canManageSettings'), getCouponById);

/**
 * @route   PUT /api/admin/coupons/:id
 * @desc    Update coupon
 * @access  Private (Admin)
 */
router.put('/:id', protectAdmin, checkPermission('canManageSettings'), updateCoupon);

/**
 * @route   DELETE /api/admin/coupons/:id
 * @desc    Delete coupon
 * @access  Private (Admin)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageSettings'), checkPermission('canDeleteRecords'), deleteCoupon);

module.exports = router;
