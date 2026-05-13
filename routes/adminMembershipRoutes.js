const express = require('express');
const router = express.Router();
const {
  getAllMemberships,
  createMembership,
  renewMembership,
  getMembershipStats,
  getAllMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} = require('../controllers/adminMembershipController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

// Membership routes
/**
 * @route   GET /api/admin/memberships/stats
 * @desc    Get membership statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/memberships/stats', protectAdmin, checkPermission('canViewReports'), getMembershipStats);

/**
 * @route   GET /api/admin/memberships
 * @desc    Get all memberships with filtering
 * @access  Private (Admin with canManageUsers permission)
 */
router.get('/memberships', protectAdmin, checkPermission('canManageUsers'), getAllMemberships);

/**
 * @route   POST /api/admin/memberships
 * @desc    Create new membership
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/memberships', protectAdmin, checkPermission('canManageUsers'), createMembership);

/**
 * @route   POST /api/admin/memberships/:id/renew
 * @desc    Renew membership
 * @access  Private (Admin with canManageUsers permission)
 */
router.post('/memberships/:id/renew', protectAdmin, checkPermission('canManageUsers'), renewMembership);

// Membership Plan routes
/**
 * @route   GET /api/admin/membership-plans
 * @desc    Get all membership plans
 * @access  Private (Admin with canManageSettings permission)
 */
router.get('/membership-plans', protectAdmin, checkPermission('canManageSettings'), getAllMembershipPlans);

/**
 * @route   POST /api/admin/membership-plans
 * @desc    Create membership plan
 * @access  Private (Admin with canManageSettings permission)
 */
router.post('/membership-plans', protectAdmin, checkPermission('canManageSettings'), createMembershipPlan);

/**
 * @route   PUT /api/admin/membership-plans/:id
 * @desc    Update membership plan
 * @access  Private (Admin with canManageSettings permission)
 */
router.put('/membership-plans/:id', protectAdmin, checkPermission('canManageSettings'), updateMembershipPlan);

/**
 * @route   DELETE /api/admin/membership-plans/:id
 * @desc    Delete membership plan
 * @access  Private (Admin with canManageSettings and canDeleteRecords permissions)
 */
router.delete('/membership-plans/:id', protectAdmin, checkPermission('canManageSettings'), checkPermission('canDeleteRecords'), deleteMembershipPlan);

module.exports = router;
