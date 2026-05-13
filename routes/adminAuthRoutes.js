const express = require('express');
const router = express.Router();
const {
  login,
  logout,
  verifyToken,
  getMe,
  changePassword,
  refreshAccessToken,
  updateProfile,
  getPermissions,
} = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private
 */
router.post('/logout', protectAdmin, logout);

/**
 * @route   GET /api/admin/auth/verify
 * @desc    Verify admin token
 * @access  Private
 */
router.get('/verify', protectAdmin, verifyToken);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private
 */
router.get('/me', protectAdmin, getMe);

/**
 * @route   PUT /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private
 */
router.put('/change-password', protectAdmin, changePassword);

/**
 * @route   POST /api/admin/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', refreshAccessToken);

/**
 * @route   PUT /api/admin/auth/profile
 * @desc    Update admin profile
 * @access  Private
 */
router.put('/profile', protectAdmin, updateProfile);

/**
 * @route   GET /api/admin/auth/permissions
 * @desc    Get admin permissions
 * @access  Private
 */
router.get('/permissions', protectAdmin, getPermissions);

module.exports = router;
