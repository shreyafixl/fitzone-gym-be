const express = require('express');
const router = express.Router();
const {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  bookSession,
  cancelBooking,
  cancelSession,
  markAttendance,
  getAvailability,
  getUpcomingSessions,
} = require('../controllers/trainerScheduleController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   POST /api/trainer/schedule
 * @desc    Create new session
 * @access  Private (Trainer)
 */
router.post('/', protectTrainer, createSession);

/**
 * @route   GET /api/trainer/schedule
 * @desc    Get all sessions for trainer
 * @access  Private (Trainer)
 * @query   page, limit, sessionType, sessionStatus, branchId, startDate, endDate
 */
router.get('/', protectTrainer, getAllSessions);

/**
 * @route   GET /api/trainer/schedule/availability
 * @desc    Get trainer availability
 * @access  Private (Trainer)
 * @query   startDate, endDate
 */
router.get('/availability', protectTrainer, getAvailability);

/**
 * @route   GET /api/trainer/schedule/upcoming
 * @desc    Get upcoming sessions
 * @access  Private (Trainer)
 * @query   limit
 */
router.get('/upcoming', protectTrainer, getUpcomingSessions);

/**
 * @route   GET /api/trainer/schedule/:id
 * @desc    Get session by ID
 * @access  Private (Trainer)
 */
router.get('/:id', protectTrainer, getSessionById);

/**
 * @route   PUT /api/trainer/schedule/:id
 * @desc    Update session
 * @access  Private (Trainer)
 */
router.put('/:id', protectTrainer, updateSession);

/**
 * @route   DELETE /api/trainer/schedule/:id
 * @desc    Delete session
 * @access  Private (Trainer)
 */
router.delete('/:id', protectTrainer, deleteSession);

/**
 * @route   POST /api/trainer/schedule/:id/book
 * @desc    Book session for member
 * @access  Private (Trainer)
 */
router.post('/:id/book', protectTrainer, bookSession);

/**
 * @route   DELETE /api/trainer/schedule/:id/booking/:memberId
 * @desc    Cancel booking
 * @access  Private (Trainer)
 */
router.delete('/:id/booking/:memberId', protectTrainer, cancelBooking);

/**
 * @route   PUT /api/trainer/schedule/:id/cancel
 * @desc    Cancel session
 * @access  Private (Trainer)
 */
router.put('/:id/cancel', protectTrainer, cancelSession);

/**
 * @route   PUT /api/trainer/schedule/:id/attendance/:memberId
 * @desc    Mark attendance
 * @access  Private (Trainer)
 */
router.put('/:id/attendance/:memberId', protectTrainer, markAttendance);

module.exports = router;
