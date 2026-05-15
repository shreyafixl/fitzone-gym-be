const mongoose = require('mongoose');

/**
 * Discount Schema
 * Manages promotional discounts and special offers
 */
const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Discount name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
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
        values: ['percentage', 'fixed', 'bogo', 'tiered'],
        message: 'Discount type must be percentage, fixed, bogo, or tiered',
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
    category: {
      type: String,
      enum: {
        values: ['seasonal', 'promotional', 'loyalty', 'referral', 'bulk', 'other'],
        message: 'Category must be seasonal, promotional, loyalty, referral, bulk, or other',
      },
      default: 'promotional',
    },
    applicableTo: {
      type: String,
      enum: {
        values: ['all_members', 'new_members', 'specific_plan', 'specific_members'],
        message: 'Applicable to must be all_members, new_members, specific_plan, or specific_members',
      },
      default: 'all_members',
    },
    applicableItems: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    applicableMembers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
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
    priority: {
      type: Number,
      default: 0,
      min: [0, 'Priority cannot be negative'],
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
discountSchema.index({ name: 1, isActive: 1 });
discountSchema.index({ validFrom: 1, validUntil: 1 });
discountSchema.index({ category: 1, isActive: 1 });
discountSchema.index({ priority: -1, createdAt: -1 });

/**
 * Method to check if discount is valid
 */
discountSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (!this.maxUses || this.usedCount < this.maxUses)
  );
};

/**
 * Method to check if discount applies to user
 */
discountSchema.methods.appliesToUser = function (userId, membershipPlan = null) {
  if (!this.isValid()) return false;

  if (this.applicableTo === 'all_members') {
    return true;
  } else if (this.applicableTo === 'new_members') {
    // Would need to check user's join date
    return true;
  } else if (this.applicableTo === 'specific_plan' && membershipPlan) {
    return this.applicableItems.some((item) => item.toString() === membershipPlan.toString());
  } else if (this.applicableTo === 'specific_members') {
    return this.applicableMembers.some((member) => member.toString() === userId.toString());
  }

  return false;
};

/**
 * Method to calculate discount amount
 */
discountSchema.methods.calculateDiscount = function (purchaseAmount) {
  if (!this.isValid() || purchaseAmount < this.minPurchaseAmount) {
    return 0;
  }

  let discount = 0;

  if (this.discountType === 'percentage') {
    discount = (purchaseAmount * this.discountValue) / 100;
  } else if (this.discountType === 'fixed') {
    discount = this.discountValue;
  } else if (this.discountType === 'bogo') {
    // Buy one get one - discount is 50% of the item
    discount = purchaseAmount * 0.5;
  } else if (this.discountType === 'tiered') {
    // Tiered discount based on amount
    discount = (purchaseAmount * this.discountValue) / 100;
  }

  if (this.maxDiscount && discount > this.maxDiscount) {
    discount = this.maxDiscount;
  }

  return Math.min(discount, purchaseAmount);
};

/**
 * Method to use discount
 */
discountSchema.methods.use = function (userId, orderAmount) {
  if (!this.isValid()) {
    throw new Error('Discount is not valid');
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
 * Static method to get active discounts
 */
discountSchema.statics.getActive = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 });
};

/**
 * Static method to get discounts by category
 */
discountSchema.statics.getByCategory = function (category) {
  const now = new Date();
  return this.find({
    category,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  }).sort({ priority: -1 });
};

/**
 * Static method to get expiring soon discounts
 */
discountSchema.statics.getExpiringSoon = function (days = 7) {
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

const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount;
