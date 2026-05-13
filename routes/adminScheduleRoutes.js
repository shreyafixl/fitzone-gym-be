const express = require('express');
const router = express.Router();
const {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  bookSchedule,
  cancelBooking,
  checkAvailability,
  getScheduleById,
} = require('../controllers/adminScheduleController');
const { protectAdmin, checkPermission } = require('../middleware/adminAuthMiddleware');

/**
 * @route   GET /api/admin/schedules/:id/availability
 * @desc    Check schedule availability
 * @access  Private (Admin with canManageClasses permission)
 */
router.get('/:id/availability', protectAdmin, checkPermission('canManageClasses'), checkAvailability);

/**
 * @route   GET /api/admin/schedules
 * @desc    Get all schedules with filtering
 * @access  Private (Admin with canManageClasses permission)
 */
router.get('/', protectAdmin, checkPermission('canManageClasses'), getAllSchedules);

/**
 * @route   POST /api/admin/schedules
 * @desc    Create schedule
 * @access  Private (Admin with canManageClasses permission)
 */
router.post('/', protectAdmin, checkPermission('canManageClasses'), createSchedule);

/**
 * @route   GET /api/admin/schedules/:id
 * @desc    Get schedule by ID
 * @access  Private (Admin with canManageClasses permission)
 */
router.get('/:id', protectAdmin, checkPermission('canManageClasses'), getScheduleById);

/**
 * @route   PUT /api/admin/schedules/:id
 * @desc    Update schedule
 * @access  Private (Admin with canManageClasses permission)
 */
router.put('/:id', protectAdmin, checkPermission('canManageClasses'), updateSchedule);

/**
 * @route   DELETE /api/admin/schedules/:id
 * @desc    Delete schedule
 * @access  Private (Admin with canManageClasses and canDeleteRecords permissions)
 */
router.delete('/:id', protectAdmin, checkPermission('canManageClasses'), checkPermission('canDeleteRecords'), deleteSchedule);

/**
 * @route   POST /api/admin/schedules/:id/book
 * @desc    Book schedule (add participant)
 * @access  Private (Admin with canManageClasses permission)
 */
router.post('/:id/book', protectAdmin, checkPermission('canManageClasses'), bookSchedule);

/**
 * @route   DELETE /api/admin/schedules/:id/bookings/:bookingId
 * @desc    Cancel booking (remove participant)
 * @access  Private (Admin with canManageClasses permission)
 */
router.delete('/:id/bookings/:bookingId', protectAdmin, checkPermission('canManageClasses'), cancelBooking);

module.exports = router;
