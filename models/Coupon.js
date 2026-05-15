const mongoose = require('mongoose');

/**
 * Coupon Schema
 * Manages promotional coupons and discount codes
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: null,
    },
    discountType: {
      type: String,
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Discount type must be percentage or fixed',
      },
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, 'Max discount cannot be negative'],
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: [0, 'Min purchase amount cannot be negative'],
    },
    maxUses: {
      type: Number,
      default: null,
      min: [1, 'Max uses must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    maxUsesPerUser: {
      type: Number,
      default: 1,
      min: [1, 'Max uses per user must be at least 1'],
    },
    applicableTo: {
      type: String,
      enum: {
        values: ['all', 'membership', 'classes', 'specific'],
        message: 'Applicable to must be all, membership, classes, or specific',
      },
      default: 'all',
    },
    applicableItems: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    validFrom: {
      type: Date,
      required: [true, 'Valid from date is required'],
      index: true,
    },
    validUntil: {
      type: Date,
      required: [true, 'Valid until date is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: {
      type: String,
      enum: ['Admin', 'SuperAdmin'],
      default: 'Admin',
    },
    usageHistory: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        orderAmount: Number,
        discountAmount: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ createdAt: -1 });

/**
 * Method to check if coupon is valid
 */
couponSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (!this.maxUses || this.usedCount < this.maxUses)
  );
};

/**
 * Method to check if coupon can be used by a user
 */
couponSchema.methods.canBeUsedByUser = function (userId) {
  if (!this.isValid()) return false;

  const userUsageCount = this.usageHistory.filter(
    (usage) => usage.userId.toString() === userId.toString()
  ).length;

  return userUsageCount < this.maxUsesPerUser;
};

/**
 * Method to calculate discount amount
 */
couponSchema.methods.calculateDiscount = function (purchaseAmount) {
  if (!this.isValid() || purchaseAmount < this.minPurchaseAmount) {
    return 0;
  }

  let discount = 0;

  if (this.discountType === 'percentage') {
    discount = (purchaseAmount * this.discountValue) / 100;
  } else if (this.discountType === 'fixed') {
    discount = this.discountValue;
  }

  if (this.maxDiscount && discount > this.maxDiscount) {
    discount = this.maxDiscount;
  }

  return Math.min(discount, purchaseAmount);
};

/**
 * Method to use coupon
 */
couponSchema.methods.use = function (userId, orderAmount) {
  if (!this.canBeUsedByUser(userId)) {
    throw new Error('Coupon cannot be used by this user');
  }

  const discountAmount = this.calculateDiscount(orderAmount);

  this.usedCount += 1;
  this.usageHistory.push({
    userId,
    usedAt: new Date(),
    orderAmount,
    discountAmount,
  });

  return this.save();
};

/**
 * Static method to find valid coupon by code
 */
couponSchema.statics.findValidByCode = function (code) {
  const now = new Date();
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  });
};

/**
 * Static method to get active coupons
 */
couponSchema.statics.getActive = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  }).sort({ createdAt: -1 });
};

/**
 * Static method to get expiring soon coupons
 */
couponSchema.statics.getExpiringSoon = function (days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    isActive: true,
    validUntil: {
      $gte: now,
      $lte: futureDate,
    },
  }).sort({ validUntil: 1 });
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
