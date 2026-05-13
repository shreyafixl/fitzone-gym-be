const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: [true, 'Schedule ID is required'],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member ID is required'],
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    cancellationDate: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    isWaitlisted: {
      type: Boolean,
      default: false,
    },
    waitlistPosition: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate bookings
bookingSchema.index({ scheduleId: 1, memberId: 1 }, { unique: true });
bookingSchema.index({ memberId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ isWaitlisted: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
