const express = require('express');
const router = express.Router();
const {
  login,
  logout,
  verifyToken,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  updateProfile,
  getStats,
} = require('../controllers/trainerAuthController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   POST /api/trainer/auth/login
 * @desc    Trainer login
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/trainer/auth/logout
 * @desc    Trainer logout
 * @access  Private
 */
router.post('/logout', protectTrainer, logout);

/**
 * @route   GET /api/trainer/auth/verify
 * @desc    Verify trainer token
 * @access  Private
 */
router.get('/verify', protectTrainer, verifyToken);

/**
 * @route   GET /api/trainer/auth/me
 * @desc    Get current trainer profile
 * @access  Private
 */
router.get('/me', protectTrainer, getMe);

/**
 * @route   PUT /api/trainer/auth/change-password
 * @desc    Change trainer password
 * @access  Private
 */
router.put('/change-password', protectTrainer, changePassword);

/**
 * @route   POST /api/trainer/auth/forgot-password
 * @desc    Send password reset token
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/trainer/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   POST /api/trainer/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', refreshAccessToken);

/**
 * @route   PUT /api/trainer/auth/profile
 * @desc    Update trainer profile
 * @access  Private
 */
router.put('/profile', protectTrainer, updateProfile);

/**
 * @route   GET /api/trainer/auth/stats
 * @desc    Get trainer statistics
 * @access  Private
 */
router.get('/stats', protectTrainer, getStats);

module.exports = router;
