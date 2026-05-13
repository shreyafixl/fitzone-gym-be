const mongoose = require('mongoose');

/**
 * Subscription Schema
 * Defines the structure for user subscriptions
 */
const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    membershipPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: [true, 'Membership plan is required'],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'expired', 'cancelled', 'pending'],
        message: 'Status must be active, expired, cancelled, or pending',
      },
      default: 'pending',
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['card', 'upi', 'netbanking', 'cash', 'wallet'],
        message: 'Invalid payment method',
      },
      default: 'cash',
    },
    transactionId: {
      type: String,
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    renewalDate: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ membershipPlan: 1 });
subscriptionSchema.index({ branch: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

/**
 * Method to get public subscription profile
 */
subscriptionSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    user: this.user,
    membershipPlan: this.membershipPlan,
    branch: this.branch,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    amountPaid: this.amountPaid,
    currency: this.currency,
    paymentMethod: this.paymentMethod,
    transactionId: this.transactionId,
    autoRenew: this.autoRenew,
    renewalDate: this.renewalDate,
    daysRemaining: this.getDaysRemaining(),
    isExpired: this.isExpired(),
    isExpiringSoon: this.isExpiringSoon(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to calculate days remaining
 */
subscriptionSchema.methods.getDaysRemaining = function () {
  if (this.status !== 'active') return 0;
  const today = new Date();
  const endDate = new Date(this.endDate);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Method to check if subscription is expired
 */
subscriptionSchema.methods.isExpired = function () {
  return new Date() > new Date(this.endDate);
};

/**
 * Method to check if subscription is expiring soon (within 7 days)
 */
subscriptionSchema.methods.isExpiringSoon = function () {
  const daysRemaining = this.getDaysRemaining();
  return daysRemaining > 0 && daysRemaining <= 7;
};

/**
 * Method to cancel subscription
 */
subscriptionSchema.methods.cancel = function (reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.autoRenew = false;
  return this.save();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
