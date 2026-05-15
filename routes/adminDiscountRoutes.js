const express = require('express');
const router = express.Router();
const {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getDiscountStats
} = require('../controllers/adminDiscountController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/discounts/stats
 * @desc    Get discount statistics
 * @access  Private (Admin)
 */
router.get('/stats', protectAdmin, checkPermission('canViewReports'), getDiscountStats);

/**
 * @route   GET /api/admin/discounts
 * @desc    Get all discounts with filtering and pagination
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, checkPermission('canManageSettings'), getAllDiscounts);

/**
 * @route   POST /api/admin/discounts
 * @desc    Create new discount
 * @access  Private (Admin)
 */
router.post('/', protectAdmin, checkPermission('canManageSettings'), createDiscount);

/**
 * @route   GET /api/admin/discounts/:id
 * @desc    Get discount by ID
 * @access  Private (Admin)
 */
router.get('/:id', protectAdmin, checkPermission('canManageSettings'), getDiscountById);

/**
 * @route   PUT /api/admin/discounts/:id
 * @desc    Update discount
 * @access  Private (Admin)
 */
router.put('/:id', protectAdmin, checkPermission('canManageSettings'), updateDiscount);

/**
 * @route   DELETE /api/admin/discounts/:id
 * @desc    Delete discount
 * @access  Private (Admin)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageSettings'), checkPermission('canDeleteRecords'), deleteDiscount);

module.exports = router;
