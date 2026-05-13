const mongoose = require('mongoose');

/**
 * Session Schema
 * Manages trainer sessions including personal training and group classes
 */
const sessionSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: [true, 'Trainer ID is required'],
      index: true,
    },
    sessionType: {
      type: String,
      enum: {
        values: ['personal-training', 'group-class', 'consultation', 'assessment'],
        message: 'Session type must be personal-training, group-class, consultation, or assessment',
      },
      required: [true, 'Session type is required'],
      index: true,
    },
    sessionTitle: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    sessionDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    sessionDate: {
      type: Date,
      required: [true, 'Session date is required'],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch ID is required'],
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    maxParticipants: {
      type: Number,
      default: 1, // 1 for personal training, more for group classes
      min: [1, 'Max participants must be at least 1'],
      max: [50, 'Max participants cannot exceed 50'],
    },
    participants: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        bookingDate: {
          type: Date,
          default: Date.now,
        },
        bookingStatus: {
          type: String,
          enum: ['confirmed', 'pending', 'cancelled', 'completed', 'no-show'],
          default: 'confirmed',
        },
        notes: {
          type: String,
          trim: true,
        },
        attended: {
          type: Boolean,
          default: false,
        },
      },
    ],
    sessionStatus: {
      type: String,
      enum: {
        values: ['scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
        message: 'Status must be scheduled, in-progress, completed, cancelled, or rescheduled',
      },
      default: 'scheduled',
      index: true,
    },
    sessionCategory: {
      type: String,
      enum: [
        'strength-training',
        'cardio',
        'yoga',
        'pilates',
        'hiit',
        'crossfit',
        'zumba',
        'spinning',
        'boxing',
        'martial-arts',
        'functional-training',
        'stretching',
        'other',
      ],
      default: 'other',
    },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
      default: 'all-levels',
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: null,
      },
      daysOfWeek: [
        {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
      ],
      endDate: {
        type: Date,
        default: null,
      },
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderTime: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: null,
    },
    equipment: [
      {
        type: String,
        trim: true,
      },
    ],
    prerequisites: {
      type: String,
      trim: true,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
sessionSchema.index({ trainerId: 1, sessionDate: -1 });
sessionSchema.index({ sessionStatus: 1, sessionDate: -1 });
sessionSchema.index({ branchId: 1, sessionDate: -1 });
sessionSchema.index({ 'participants.memberId': 1 });

/**
 * Pre-save middleware to calculate duration
 */
sessionSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    const durationMs = this.endTime - this.startTime;
    this.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  }
  next();
});

/**
 * Method to check if session is full
 */
sessionSchema.methods.isFull = function () {
  const confirmedParticipants = this.participants.filter(
    (p) => p.bookingStatus === 'confirmed' || p.bookingStatus === 'pending'
  ).length;
  return confirmedParticipants >= this.maxParticipants;
};

/**
 * Method to get available slots
 */
sessionSchema.methods.getAvailableSlots = function () {
  const confirmedParticipants = this.participants.filter(
    (p) => p.bookingStatus === 'confirmed' || p.bookingStatus === 'pending'
  ).length;
  return this.maxParticipants - confirmedParticipants;
};

/**
 * Method to book session
 */
sessionSchema.methods.bookSession = function (memberId, notes = null) {
  if (this.isFull()) {
    throw new Error('Session is full');
  }

  // Check if member already booked
  const existingBooking = this.participants.find(
    (p) => p.memberId.toString() === memberId.toString() && p.bookingStatus !== 'cancelled'
  );

  if (existingBooking) {
    throw new Error('Member has already booked this session');
  }

  this.participants.push({
    memberId,
    bookingDate: Date.now(),
    bookingStatus: 'confirmed',
    notes,
    attended: false,
  });

  return this.save();
};

/**
 * Method to cancel booking
 */
sessionSchema.methods.cancelBooking = function (memberId) {
  const booking = this.participants.find(
    (p) => p.memberId.toString() === memberId.toString() && p.bookingStatus !== 'cancelled'
  );

  if (!booking) {
    throw new Error('Booking not found');
  }

  booking.bookingStatus = 'cancelled';
  return this.save();
};

/**
 * Method to mark attendance
 */
sessionSchema.methods.markAttendance = function (memberId, attended = true) {
  const booking = this.participants.find(
    (p) => p.memberId.toString() === memberId.toString()
  );

  if (!booking) {
    throw new Error('Booking not found');
  }

  booking.attended = attended;
  if (attended) {
    booking.bookingStatus = 'completed';
  } else {
    booking.bookingStatus = 'no-show';
  }

  return this.save();
};

/**
 * Method to cancel session
 */
sessionSchema.methods.cancelSession = function (reason) {
  this.sessionStatus = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = Date.now();
  return this.save();
};

/**
 * Method to get public profile
 */
sessionSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    trainerId: this.trainerId,
    sessionType: this.sessionType,
    sessionTitle: this.sessionTitle,
    sessionDescription: this.sessionDescription,
    sessionDate: this.sessionDate,
    startTime: this.startTime,
    endTime: this.endTime,
    duration: this.duration,
    branchId: this.branchId,
    location: this.location,
    maxParticipants: this.maxParticipants,
    participants: this.participants,
    participantCount: this.participants.filter(
      (p) => p.bookingStatus === 'confirmed' || p.bookingStatus === 'pending'
    ).length,
    availableSlots: this.getAvailableSlots(),
    sessionStatus: this.sessionStatus,
    sessionCategory: this.sessionCategory,
    difficultyLevel: this.difficultyLevel,
    price: this.price,
    isRecurring: this.isRecurring,
    recurringPattern: this.recurringPattern,
    notes: this.notes,
    equipment: this.equipment,
    prerequisites: this.prerequisites,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get trainer sessions
 */
sessionSchema.statics.getTrainerSessions = function (trainerId, filters = {}) {
  const query = { trainerId, ...filters };
  return this.find(query)
    .populate('branchId', 'branchName branchCode')
    .populate('participants.memberId', 'fullName email phone')
    .sort({ sessionDate: 1, startTime: 1 });
};

/**
 * Static method to get upcoming sessions
 */
sessionSchema.statics.getUpcomingSessions = function (trainerId) {
  return this.find({
    trainerId,
    sessionDate: { $gte: new Date() },
    sessionStatus: { $in: ['scheduled', 'in-progress'] },
  })
    .populate('branchId', 'branchName branchCode')
    .populate('participants.memberId', 'fullName email phone')
    .sort({ sessionDate: 1, startTime: 1 });
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
