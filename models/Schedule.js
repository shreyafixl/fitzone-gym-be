const mongoose = require('mongoose');

/**
 * Schedule Schema
 * Manages schedules for trainers, classes, and branch operations
 */
const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Schedule title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
      index: true,
    },
    scheduleType: {
      type: String,
      enum: {
        values: [
          'training-session',
          'group-class',
          'personal-training',
          'consultation',
          'assessment',
          'maintenance',
          'event',
          'meeting',
          'other',
        ],
        message: 'Invalid schedule type',
      },
      required: [true, 'Schedule type is required'],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    startTime: {
      type: String, // Format: "HH:MM" (24-hour format)
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'],
    },
    endTime: {
      type: String, // Format: "HH:MM" (24-hour format)
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM'],
    },
    duration: {
      type: Number, // Duration in minutes
      default: 60,
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
        message: 'Status must be scheduled, in-progress, completed, cancelled, or rescheduled',
      },
      default: 'scheduled',
      index: true,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['confirmed', 'pending', 'cancelled'],
          default: 'pending',
        },
        joinedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    maxParticipants: {
      type: Number,
      default: 1,
      min: [1, 'Max participants must be at least 1'],
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    room: {
      type: String,
      trim: true,
      default: null,
    },
    equipment: [
      {
        type: String,
        trim: true,
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        default: 'weekly',
      },
      interval: {
        type: Number, // e.g., every 2 weeks
        default: 1,
      },
      daysOfWeek: [
        {
          type: Number, // 0 = Sunday, 1 = Monday, etc.
          min: 0,
          max: 6,
        },
      ],
      endDate: {
        type: Date,
        default: null,
      },
    },
    parentScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
      default: null,
    },
    rescheduledFrom: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: null,
    },
    reminders: [
      {
        reminderTime: {
          type: Date,
          required: true,
        },
        reminderType: {
          type: String,
          enum: ['email', 'sms', 'notification'],
          default: 'notification',
        },
        sent: {
          type: Boolean,
          default: false,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: {
      type: String,
      enum: ['User', 'SuperAdmin'],
      default: 'SuperAdmin',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
scheduleSchema.index({ branchId: 1, date: 1 });
scheduleSchema.index({ assignedTo: 1, date: 1 });
scheduleSchema.index({ scheduleType: 1, status: 1 });
scheduleSchema.index({ date: 1, startTime: 1 });

/**
 * Pre-save middleware to calculate duration
 */
scheduleSchema.pre('save', function (next) {
  if (this.isModified('startTime') || this.isModified('endTime')) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    this.duration = endMinutes - startMinutes;
  }
  next();
});

/**
 * Method to add participant
 */
scheduleSchema.methods.addParticipant = function (userId, status = 'pending') {
  const existingParticipant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    existingParticipant.status = status;
  } else {
    if (this.participants.length >= this.maxParticipants) {
      throw new Error('Maximum participants reached');
    }
    this.participants.push({ userId, status });
  }
  
  return this.save();
};

/**
 * Method to remove participant
 */
scheduleSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(
    (p) => p.userId.toString() !== userId.toString()
  );
  return this.save();
};

/**
 * Method to cancel schedule
 */
scheduleSchema.methods.cancel = function (reason) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  return this.save();
};

/**
 * Method to reschedule
 */
scheduleSchema.methods.reschedule = function (newDate, newStartTime, newEndTime) {
  this.rescheduledFrom = this.date;
  this.date = newDate;
  this.startTime = newStartTime;
  this.endTime = newEndTime;
  this.status = 'rescheduled';
  return this.save();
};

/**
 * Method to mark as completed
 */
scheduleSchema.methods.complete = function () {
  this.status = 'completed';
  return this.save();
};

/**
 * Method to check if schedule is full
 */
scheduleSchema.methods.isFull = function () {
  return this.participants.length >= this.maxParticipants;
};

/**
 * Method to get available slots
 */
scheduleSchema.methods.getAvailableSlots = function () {
  return this.maxParticipants - this.participants.length;
};

/**
 * Method to get public profile
 */
scheduleSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    assignedTo: this.assignedTo,
    scheduleType: this.scheduleType,
    branchId: this.branchId,
    date: this.date,
    startTime: this.startTime,
    endTime: this.endTime,
    duration: this.duration,
    status: this.status,
    participants: this.participants,
    participantCount: this.participants.length,
    maxParticipants: this.maxParticipants,
    availableSlots: this.getAvailableSlots(),
    isFull: this.isFull(),
    location: this.location,
    room: this.room,
    equipment: this.equipment,
    isRecurring: this.isRecurring,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get schedules by date range
 */
scheduleSchema.statics.getByDateRange = function (startDate, endDate, filters = {}) {
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    ...filters,
  };
  
  return this.find(query)
    .populate('assignedTo', 'fullName email role')
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email')
    .sort({ date: 1, startTime: 1 });
};

/**
 * Static method to get trainer's schedule
 */
scheduleSchema.statics.getTrainerSchedule = function (trainerId, date = null) {
  const query = { assignedTo: trainerId };
  if (date) {
    query.date = new Date(date);
  }
  
  return this.find(query)
    .populate('branchId', 'branchName branchCode')
    .populate('participants.userId', 'fullName email')
    .sort({ date: 1, startTime: 1 });
};

/**
 * Static method to get branch schedule
 */
scheduleSchema.statics.getBranchSchedule = function (branchId, date = null) {
  const query = { branchId };
  if (date) {
    query.date = new Date(date);
  }
  
  return this.find(query)
    .populate('assignedTo', 'fullName email role')
    .populate('participants.userId', 'fullName email')
    .sort({ date: 1, startTime: 1 });
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
