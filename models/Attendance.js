const mongoose = require('mongoose');

/**
 * Attendance Schema
 * Tracks member attendance at gym branches
 */
const attendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member ID is required'],
      index: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch ID is required'],
      index: true,
    },
    attendanceDate: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true,
    },
    checkInTime: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    attendanceStatus: {
      type: String,
      enum: {
        values: ['present', 'absent', 'late', 'leave'],
        message: 'Status must be present, absent, late, or leave',
      },
      default: 'present',
      index: true,
    },
    duration: {
      type: Number, // Duration in minutes
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: null,
    },
    isAutoCheckout: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      default: null,
    },
    createdByModel: {
      type: String,
      enum: ['User', 'SuperAdmin'],
      default: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
attendanceSchema.index({ memberId: 1, attendanceDate: -1 });
attendanceSchema.index({ branchId: 1, attendanceDate: -1 });
attendanceSchema.index({ trainerId: 1, attendanceDate: -1 });
attendanceSchema.index({ attendanceStatus: 1, attendanceDate: -1 });

/**
 * Pre-save middleware to calculate duration
 */
attendanceSchema.pre('save', function (next) {
  if (this.checkOutTime && this.checkInTime) {
    const durationMs = this.checkOutTime - this.checkInTime;
    this.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  }
  next();
});

/**
 * Method to check out member
 */
attendanceSchema.methods.checkOut = function (checkOutTime = new Date()) {
  this.checkOutTime = checkOutTime;
  const durationMs = this.checkOutTime - this.checkInTime;
  this.duration = Math.floor(durationMs / (1000 * 60));
  return this.save();
};

/**
 * Method to get public profile
 */
attendanceSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    memberId: this.memberId,
    trainerId: this.trainerId,
    branchId: this.branchId,
    attendanceDate: this.attendanceDate,
    checkInTime: this.checkInTime,
    checkOutTime: this.checkOutTime,
    attendanceStatus: this.attendanceStatus,
    duration: this.duration,
    notes: this.notes,
    isAutoCheckout: this.isAutoCheckout,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get attendance by date range
 */
attendanceSchema.statics.getByDateRange = function (startDate, endDate, filters = {}) {
  const query = {
    attendanceDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    ...filters,
  };
  return this.find(query)
    .populate('memberId', 'fullName email phone')
    .populate('trainerId', 'fullName email')
    .populate('branchId', 'branchName branchCode')
    .sort({ attendanceDate: -1, checkInTime: -1 });
};

/**
 * Static method to get member attendance history
 */
attendanceSchema.statics.getMemberHistory = function (memberId, limit = 30) {
  return this.find({ memberId })
    .populate('branchId', 'branchName branchCode')
    .populate('trainerId', 'fullName')
    .sort({ attendanceDate: -1 })
    .limit(limit);
};

/**
 * Static method to get attendance statistics
 */
attendanceSchema.statics.getStats = async function (filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$attendanceStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
