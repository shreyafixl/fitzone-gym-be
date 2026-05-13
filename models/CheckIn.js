const mongoose = require('mongoose');

/**
 * CheckIn Schema
 * Tracks real-time check-in and check-out status of members
 */
const checkInSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member ID is required'],
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
    status: {
      type: String,
      enum: {
        values: ['active', 'checked-out', 'auto-checked-out'],
        message: 'Status must be active, checked-out, or auto-checked-out',
      },
      default: 'active',
      index: true,
    },
    duration: {
      type: Number, // Duration in minutes
      default: 0,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for frequently queried fields
checkInSchema.index({ memberId: 1, status: 1 });
checkInSchema.index({ status: 1, checkInTime: -1 });
checkInSchema.index({ memberId: 1, checkInTime: -1 });
checkInSchema.index({ branchId: 1, status: 1 });

/**
 * Pre-save middleware to calculate duration
 */
checkInSchema.pre('save', function (next) {
  if (this.checkOutTime && this.checkInTime) {
    const durationMs = this.checkOutTime - this.checkInTime;
    this.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  }
  next();
});

/**
 * Method to check out member
 */
checkInSchema.methods.checkOut = function (checkOutTime = new Date(), isAuto = false) {
  this.checkOutTime = checkOutTime;
  this.status = isAuto ? 'auto-checked-out' : 'checked-out';
  this.isAutoCheckout = isAuto;
  
  if (this.checkInTime) {
    const durationMs = this.checkOutTime - this.checkInTime;
    this.duration = Math.floor(durationMs / (1000 * 60));
  }
  
  return this.save();
};

/**
 * Method to get public profile
 */
checkInSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    memberId: this.memberId,
    checkInTime: this.checkInTime,
    checkOutTime: this.checkOutTime,
    status: this.status,
    duration: this.duration,
    branchId: this.branchId,
    notes: this.notes,
    isAutoCheckout: this.isAutoCheckout,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get active check-ins
 */
checkInSchema.statics.getActiveCheckins = function (filters = {}) {
  return this.find({ status: 'active', ...filters })
    .populate('memberId', 'fullName email phone')
    .populate('branchId', 'branchName branchCode')
    .sort({ checkInTime: -1 });
};

/**
 * Static method to get check-ins by date
 */
checkInSchema.statics.getByDate = function (date, filters = {}) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    checkInTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    ...filters,
  })
    .populate('memberId', 'fullName email phone')
    .populate('branchId', 'branchName branchCode')
    .sort({ checkInTime: -1 });
};

/**
 * Static method to get check-in statistics
 */
checkInSchema.statics.getStats = async function (filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    active: 0,
    'checked-out': 0,
    'auto-checked-out': 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

/**
 * Static method to get average duration
 */
checkInSchema.statics.getAverageDuration = async function (filters = {}) {
  const result = await this.aggregate([
    { $match: { ...filters, duration: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
      },
    },
  ]);

  return result.length > 0 ? Math.round(result[0].avgDuration) : 0;
};

const CheckIn = mongoose.model('CheckIn', checkInSchema);

module.exports = CheckIn;
