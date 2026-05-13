const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
} = require('../controllers/memberAuthController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Member Authentication Routes
 * Base path: /api/auth
 */

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes (require authentication)
router.use(protect);

// Member only routes
router.get('/me', authorize('member'), getMe);
router.put('/profile', authorize('member'), updateProfile);
router.put('/password', authorize('member'), changePassword);
router.post('/logout', authorize('member'), logout);

module.exports = router;
