const express = require('express');
const router = express.Router();
const {
  // Memberships
  getAllMemberships,
  getMembershipById,
  getMemberMemberships,
  getExpiringMemberships,
  createMembership,
  updateMembership,
  renewMembership,
  pauseMembership,
  resumeMembership,
  cancelMembership,
  deleteMembership,
  // Membership Plans
  getAllMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} = require('../controllers/membershipController');
const { protect } = require('../middleware/authMiddleware');
const { authorize, superAdminOnly } = require('../middleware/roleMiddleware');

/**
 * Membership Management Routes
 * Base paths: /api/memberships and /api/membership-plans
 */

// ============================================================================
// MEMBERSHIP PLANS ROUTES (Public + Admin)
// ============================================================================

/**
 * @route   GET /api/membership-plans
 * @desc    Get all membership plans
 * @query   isActive, category, sortBy, sortOrder
 * @access  Public
 */
router.get('/membership-plans', getAllMembershipPlans);

/**
 * @route   GET /api/membership-plans/:id
 * @desc    Get single membership plan
 * @access  Public
 */
router.get('/membership-plans/:id', getMembershipPlanById);

/**
 * @route   POST /api/membership-plans
 * @desc    Create membership plan
 * @body    planName, planCode, duration, durationType, price, currency, discount, features, description, isPopular, isActive, maxMembers, category
 * @access  Private (Super Admin only)
 */
router.post('/membership-plans', protect, superAdminOnly, createMembershipPlan);

/**
 * @route   PUT /api/membership-plans/:id
 * @desc    Update membership plan
 * @body    planName, duration, durationType, price, currency, discount, features, description, isPopular, isActive, maxMembers, category
 * @access  Private (Super Admin only)
 */
router.put('/membership-plans/:id', protect, superAdminOnly, updateMembershipPlan);

/**
 * @route   DELETE /api/membership-plans/:id
 * @desc    Delete membership plan
 * @access  Private (Super Admin only)
 */
router.delete('/membership-plans/:id', protect, superAdminOnly, deleteMembershipPlan);

// ============================================================================
// MEMBERSHIP ROUTES (Protected)
// ============================================================================

// Apply authentication to all membership routes
router.use('/memberships', protect);

/**
 * @route   GET /api/memberships/expiring
 * @desc    Get expiring memberships
 * @query   days, branchId
 * @access  Private (Super Admin, Trainers)
 */
router.get('/memberships/expiring', authorize('superadmin', 'trainer'), getExpiringMemberships);

/**
 * @route   GET /api/memberships/member/:memberId
 * @desc    Get member's memberships
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.get('/memberships/member/:memberId', getMemberMemberships);

/**
 * @route   GET /api/memberships
 * @desc    Get all memberships
 * @query   page, limit, memberId, branchId, membershipStatus, paymentStatus, membershipPlan, autoRenewal, sortBy, sortOrder
 * @access  Private (Super Admin, Trainers)
 */
router.get('/memberships', authorize('superadmin', 'trainer'), getAllMemberships);

/**
 * @route   POST /api/memberships
 * @desc    Create membership
 * @body    memberId, membershipPlan, membershipStartDate, membershipEndDate, assignedBranch, amount, discount, paymentMethod, paymentStatus, transactionId, autoRenewal, notes
 * @access  Private (Super Admin, Trainers)
 */
router.post('/memberships', authorize('superadmin', 'trainer'), createMembership);

/**
 * @route   GET /api/memberships/:id
 * @desc    Get single membership
 * @access  Private (Super Admin, Trainers, Member - own)
 */
router.get('/memberships/:id', getMembershipById);

/**
 * @route   PUT /api/memberships/:id
 * @desc    Update membership
 * @body    membershipPlan, membershipStartDate, membershipEndDate, membershipStatus, paymentStatus, assignedBranch, amount, discount, paymentMethod, transactionId, autoRenewal, notes
 * @access  Private (Super Admin, Trainers)
 */
router.put('/memberships/:id', authorize('superadmin', 'trainer'), updateMembership);

/**
 * @route   POST /api/memberships/:id/renew
 * @desc    Renew membership
 * @body    membershipEndDate, amount, paymentStatus, paymentMethod, transactionId
 * @access  Private (Super Admin, Trainers)
 */
router.post('/memberships/:id/renew', authorize('superadmin', 'trainer'), renewMembership);

/**
 * @route   PATCH /api/memberships/:id/pause
 * @desc    Pause membership
 * @body    pausedFrom (optional), pausedUntil (optional)
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/memberships/:id/pause', authorize('superadmin', 'trainer'), pauseMembership);

/**
 * @route   PATCH /api/memberships/:id/resume
 * @desc    Resume membership
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/memberships/:id/resume', authorize('superadmin', 'trainer'), resumeMembership);

/**
 * @route   PATCH /api/memberships/:id/cancel
 * @desc    Cancel membership
 * @body    cancellationReason (optional)
 * @access  Private (Super Admin, Trainers)
 */
router.patch('/memberships/:id/cancel', authorize('superadmin', 'trainer'), cancelMembership);

/**
 * @route   DELETE /api/memberships/:id
 * @desc    Delete membership
 * @access  Private (Super Admin only)
 */
router.delete('/memberships/:id', superAdminOnly, deleteMembership);

module.exports = router;
