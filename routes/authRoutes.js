const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  logout,
  refreshToken,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

/**
 * Authentication Routes
 * Base path: /api/superadmin/auth
 */

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes (require authentication)
router.use(protect); // All routes below this require authentication

router.get('/me', getMe);
router.post('/logout', logout);
router.put('/password', updatePassword);

module.exports = router;
