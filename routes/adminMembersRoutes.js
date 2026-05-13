const express = require('express');
const router = express.Router();
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/adminMembersController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/members
 * @desc    Get all members with pagination, filtering, and search
 * @access  Private (Admin)
 */
router.get('/', protectAdmin, getAllMembers);

/**
 * @route   POST /api/admin/members
 * @desc    Create new member
 * @access  Private (Admin)
 */
router.post('/', protectAdmin, createMember);

/**
 * @route   GET /api/admin/members/:id
 * @desc    Get member by ID
 * @access  Private (Admin)
 */
router.get('/:id', protectAdmin, getMemberById);

/**
 * @route   PUT /api/admin/members/:id
 * @desc    Update member
 * @access  Private (Admin)
 */
router.put('/:id', protectAdmin, updateMember);

/**
 * @route   DELETE /api/admin/members/:id
 * @desc    Delete member
 * @access  Private (Admin)
 */
router.delete('/:id', protectAdmin, deleteMember);

module.exports = router;
