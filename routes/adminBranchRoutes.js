const express = require('express');
const router = express.Router();
const {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
} = require('../controllers/adminBranchController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/branches/:id/stats
 * @desc    Get branch statistics
 * @access  Private (Admin with canViewReports permission)
 */
router.get('/:id/stats', protectAdmin, checkPermission('canViewReports'), getBranchStats);

/**
 * @route   GET /api/admin/branches
 * @desc    Get all branches with pagination and filtering
 * @access  Public (for form dropdowns)
 */
router.get('/', getAllBranches);

/**
 * @route   POST /api/admin/branches
 * @desc    Create new branch
 * @access  Private (Admin with canManageBranches permission)
 */
router.post('/', protectAdmin, checkPermission('canManageBranches'), createBranch);

/**
 * @route   GET /api/admin/branches/:id
 * @desc    Get branch by ID
 * @access  Private (Admin with canManageBranches permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageBranches'), getBranchById);

/**
 * @route   PUT /api/admin/branches/:id
 * @desc    Update branch
 * @access  Private (Admin with canManageBranches permission)
 */
router.put('/:id', protectAdmin, checkPermission('canManageBranches'), updateBranch);

/**
 * @route   DELETE /api/admin/branches/:id
 * @desc    Delete branch
 * @access  Private (Admin with canManageBranches and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageBranches'), checkPermission('canDeleteRecords'), deleteBranch);

module.exports = router;
