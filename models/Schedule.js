const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
    },
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true,
    },
    recurringSettings: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'none'],
        default: 'none',
      },
      interval: {
        type: Number,
        default: 1,
      },
      daysOfWeek: [
        {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
      ],
      endDate: {
        type: Date,
        default: null,
      },
    },
    bookedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attendanceRecords: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['present', 'absent', 'cancelled'],
          default: 'absent',
        },
        checkInTime: Date,
        checkOutTime: Date,
        duration: Number,
      },
    ],
    sessionStatus: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

// Index for frequently queried fields
scheduleSchema.index({ classId: 1 });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ sessionStatus: 1 });
scheduleSchema.index({ 'bookedMembers': 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
