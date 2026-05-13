const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAttendanceById,
  getMemberAttendanceHistory,
  getBranchAttendance,
  createAttendance,
  updateAttendance,
  checkOutMember,
  deleteAttendance,
  getAttendanceStats,
  getTodayAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Attendance Management Routes
 * Base path: /api/attendance
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(protect);

// ============================================================================
// STATISTICS & OVERVIEW ROUTES
// ============================================================================

/**
 * @route   GET /api/attendance/stats/overview
 * @desc    Get attendance statistics
 * @access  Private (Super Admin, Trainers)
 */
router.get('/stats/overview', authorize('superadmin', 'trainer'), getAttendanceStats);

/**
 * @route   GET /api/attendance/today
 * @desc    Get today's attendance
 * @access  Private (Super Admin, Trainers)
 */
router.get('/today', authorize('superadmin', 'trainer'), getTodayAttendance);

// ============================================================================
// MEMBER & BRANCH SPECIFIC ROUTES
// ============================================================================

/**
 * @route   GET /api/attendance/member/:memberId
 * @desc    Get member attendance history
 * @access  Private (Super Admin, Trainers, Member - own records)
 */
router.get('/member/:memberId', getMemberAttendanceHistory);

/**
 * @route   GET /api/attendance/branch/:branchId
 * @desc    Get branch attendance
 * @access  Private (Super Admin, Trainers)
 */
router.get('/branch/:branchId', authorize('superadmin', 'trainer'), getBranchAttendance);

// ============================================================================
// ATTENDANCE CRUD ROUTES
// ============================================================================

/**
 * @route   GET /api/attendance
 * @desc    Get all attendance records
 * @query   page, limit, memberId, trainerId, branchId, status, startDate, endDate, sortBy, sortOrder
 * @access  Private (Super Admin, Trainers)
 */
router.get('/', authorize('superadmin', 'trainer'), getAllAttendance);

/**
 * @route   POST /api/attendance
 * @desc    Create attendance record (Check-in)
 * @body    memberId, branchId, trainerId (optional), attendanceDate (optional), checkInTime (optional), attendanceStatus (optional), notes (optional)
 * @access  Private (Super Admin, Trainers, Members)
 */
router.post('/', createAttendance);

/**
 * @route   GET /api/attendance/:id
 * @desc    Get single attendance record
 * @access  Private (Super Admin, Trainers)
 */
router.get('/:id', authorize('superadmin', 'trainer'), getAttendanceById);

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance record
 * @body    checkOutTime (optional), attendanceStatus (optional), notes (optional), trainerId (optional)
 * @access  Private (Super Admin, Trainers)
 */
router.put('/:id', authorize('superadmin', 'trainer'), updateAttendance);

/**
 * @route   PATCH /api/attendance/:id/checkout
 * @desc    Check out member
 * @body    checkOutTime (optional)
 * @access  Private (Super Admin, Trainers, Members)
 */
router.patch('/:id/checkout', checkOutMember);

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete attendance record
 * @access  Private (Super Admin only)
 */
router.delete('/:id', authorize('superadmin'), deleteAttendance);

module.exports = router;
