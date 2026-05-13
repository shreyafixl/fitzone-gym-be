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
} = require('../controllers/superadminAuthController');
const { protectSuperAdmin } = require('../middleware/superadminAuthMiddleware');

/**
 * @route   POST /api/superadmin/auth/login
 * @desc    SuperAdmin login
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/superadmin/auth/logout
 * @desc    SuperAdmin logout
 * @access  Private
 */
router.post('/logout', protectSuperAdmin, logout);

/**
 * @route   GET /api/superadmin/auth/verify
 * @desc    Verify superadmin token
 * @access  Private
 */
router.get('/verify', protectSuperAdmin, verifyToken);

/**
 * @route   GET /api/superadmin/auth/me
 * @desc    Get current superadmin profile
 * @access  Private
 */
router.get('/me', protectSuperAdmin, getMe);

/**
 * @route   PUT /api/superadmin/auth/change-password
 * @desc    Change superadmin password
 * @access  Private
 */
router.put('/change-password', protectSuperAdmin, changePassword);

/**
 * @route   POST /api/superadmin/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', refreshAccessToken);

/**
 * @route   PUT /api/superadmin/auth/profile
 * @desc    Update superadmin profile
 * @access  Private
 */
router.put('/profile', protectSuperAdmin, updateProfile);

module.exports = router;
