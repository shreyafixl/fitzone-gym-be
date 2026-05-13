const mongoose = require('mongoose');

/**
 * Membership Schema
 * Manages member subscriptions and membership details
 */
const membershipSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member ID is required'],
      index: true,
    },
    membershipPlan: {
      type: String,
      enum: {
        values: ['monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'],
        message: 'Invalid membership plan',
      },
      required: [true, 'Membership plan is required'],
    },
    membershipStartDate: {
      type: Date,
      required: [true, 'Membership start date is required'],
      index: true,
    },
    membershipEndDate: {
      type: Date,
      required: [true, 'Membership end date is required'],
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['paid', 'pending', 'failed', 'refunded'],
        message: 'Payment status must be paid, pending, failed, or refunded',
      },
      default: 'pending',
      index: true,
    },
    membershipStatus: {
      type: String,
      enum: {
        values: ['active', 'expired', 'paused', 'cancelled'],
        message: 'Membership status must be active, expired, paused, or cancelled',
      },
      default: 'active',
      index: true,
    },
    assignedBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Assigned branch is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Membership amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'net-banking', 'other'],
      default: 'cash',
    },
    transactionId: {
      type: String,
      default: null,
    },
    autoRenewal: {
      type: Boolean,
      default: false,
    },
    renewalDate: {
      type: Date,
      default: null,
    },
    pausedFrom: {
      type: Date,
      default: null,
    },
    pausedUntil: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: null,
    },
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

// Indexes for efficient queries
membershipSchema.index({ memberId: 1, membershipStatus: 1 });
membershipSchema.index({ assignedBranch: 1, membershipStatus: 1 });
membershipSchema.index({ membershipEndDate: 1, membershipStatus: 1 });
membershipSchema.index({ paymentStatus: 1 });

/**
 * Pre-save middleware to calculate final amount
 */
membershipSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isModified('discount')) {
    this.finalAmount = this.amount - this.discount;
  }
  next();
});

/**
 * Method to check if membership is expiring soon
 */
membershipSchema.methods.isExpiringSoon = function (days = 7) {
  if (this.membershipStatus !== 'active') return false;
  
  const today = new Date();
  const daysUntilExpiry = Math.ceil((this.membershipEndDate - today) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
};

/**
 * Method to get days remaining
 */
membershipSchema.methods.getDaysRemaining = function () {
  if (this.membershipStatus !== 'active') return 0;
  
  const today = new Date();
  const daysRemaining = Math.ceil((this.membershipEndDate - today) / (1000 * 60 * 60 * 24));
  
  return daysRemaining > 0 ? daysRemaining : 0;
};

/**
 * Method to pause membership
 */
membershipSchema.methods.pause = function (pausedFrom, pausedUntil) {
  this.membershipStatus = 'paused';
  this.pausedFrom = pausedFrom || new Date();
  this.pausedUntil = pausedUntil;
  return this.save();
};

/**
 * Method to resume membership
 */
membershipSchema.methods.resume = function () {
  if (this.membershipStatus === 'paused') {
    this.membershipStatus = 'active';
    this.pausedFrom = null;
    this.pausedUntil = null;
  }
  return this.save();
};

/**
 * Method to cancel membership
 */
membershipSchema.methods.cancel = function (reason) {
  this.membershipStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

/**
 * Method to renew membership
 */
membershipSchema.methods.renew = function (newEndDate, amount) {
  this.membershipStatus = 'active';
  this.membershipStartDate = this.membershipEndDate;
  this.membershipEndDate = newEndDate;
  this.amount = amount;
  this.finalAmount = amount - (this.discount || 0);
  this.paymentStatus = 'pending';
  this.cancelledAt = null;
  this.cancellationReason = null;
  return this.save();
};

/**
 * Method to get public profile
 */
membershipSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    memberId: this.memberId,
    membershipPlan: this.membershipPlan,
    membershipStartDate: this.membershipStartDate,
    membershipEndDate: this.membershipEndDate,
    paymentStatus: this.paymentStatus,
    membershipStatus: this.membershipStatus,
    assignedBranch: this.assignedBranch,
    amount: this.amount,
    discount: this.discount,
    finalAmount: this.finalAmount,
    paymentMethod: this.paymentMethod,
    autoRenewal: this.autoRenewal,
    daysRemaining: this.getDaysRemaining(),
    isExpiringSoon: this.isExpiringSoon(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get expiring memberships
 */
membershipSchema.statics.getExpiring = function (days = 7) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  
  return this.find({
    membershipStatus: 'active',
    membershipEndDate: {
      $gte: today,
      $lte: futureDate,
    },
  })
    .populate('memberId', 'fullName email phone')
    .populate('assignedBranch', 'branchName branchCode')
    .sort({ membershipEndDate: 1 });
};

/**
 * Static method to get active memberships
 */
membershipSchema.statics.getActive = function (branchId = null) {
  const query = { membershipStatus: 'active' };
  if (branchId) query.assignedBranch = branchId;
  
  return this.find(query)
    .populate('memberId', 'fullName email phone')
    .populate('assignedBranch', 'branchName branchCode')
    .sort({ membershipEndDate: 1 });
};

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
