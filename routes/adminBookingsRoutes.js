const express = require('express');
const router = express.Router();
const adminBookingsController = require('../controllers/adminBookingsController');
const { adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// Booking routes
router.get('/', adminBookingsController.getAllBookings);
router.post('/', adminBookingsController.createBooking);
router.delete('/:id', adminBookingsController.cancelBooking);

// Schedule bookings
router.get('/schedule/:scheduleId', adminBookingsController.getScheduleBookings);

// Member bookings
router.get('/member/:memberId', adminBookingsController.getMemberBookings);

// Statistics
router.get('/stats/all', adminBookingsController.getBookingStats);

module.exports = router;
