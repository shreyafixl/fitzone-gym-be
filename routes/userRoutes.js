const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateMembershipStatus,
  assignTrainer,
  addAttendance,
  getUserAttendance,
  getUserStats,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

/**
 * User Management Routes
 * Base path: /api/superadmin/users
 * All routes require authentication and super admin role
 */

// Apply authentication and authorization to all routes
router.use(protect);
router.use(superAdminOnly);

// Statistics route (must be before /:id to avoid conflict)
router.get('/stats', getUserStats);

// Main CRUD routes
router.route('/')
  .get(getAllUsers)      // GET /api/superadmin/users
  .post(createUser);     // POST /api/superadmin/users

router.route('/:id')
  .get(getUserById)      // GET /api/superadmin/users/:id
  .put(updateUser)       // PUT /api/superadmin/users/:id
  .delete(deleteUser);   // DELETE /api/superadmin/users/:id

// Membership management
router.patch('/:id/membership-status', updateMembershipStatus);

// Trainer assignment
router.patch('/:id/assign-trainer', assignTrainer);

// Attendance management
router.route('/:id/attendance')
  .get(getUserAttendance)    // GET /api/superadmin/users/:id/attendance
  .post(addAttendance);      // POST /api/superadmin/users/:id/attendance

module.exports = router;
