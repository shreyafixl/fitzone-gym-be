const mongoose = require('mongoose');

/**
 * Membership Plan Schema
 * Defines the structure for gym membership plans
 */
const membershipPlanSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      minlength: [2, 'Plan name must be at least 2 characters'],
      maxlength: [100, 'Plan name cannot exceed 100 characters'],
    },
    planCode: {
      type: String,
      required: [true, 'Plan code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]+$/, 'Plan code can only contain uppercase letters, numbers, and hyphens'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 day'],
    },
    durationType: {
      type: String,
      enum: {
        values: ['days', 'months', 'years'],
        message: 'Duration type must be days, months, or years',
      },
      required: [true, 'Duration type is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    finalPrice: {
      type: Number,
      default: 0,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      default: null,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxMembers: {
      type: Number,
      default: null,
    },
    currentMembers: {
      type: Number,
      default: 0,
      min: [0, 'Current members cannot be negative'],
    },
    category: {
      type: String,
      enum: {
        values: ['basic', 'standard', 'premium', 'vip'],
        message: 'Category must be basic, standard, premium, or vip',
      },
      default: 'standard',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
membershipPlanSchema.index({ planCode: 1 });
membershipPlanSchema.index({ isActive: 1 });
membershipPlanSchema.index({ category: 1 });

/**
 * Pre-save middleware to calculate final price
 */
membershipPlanSchema.pre('save', function (next) {
  if (this.isModified('price') || this.isModified('discount')) {
    this.finalPrice = this.price - (this.price * this.discount) / 100;
  }
  next();
});

/**
 * Method to get public plan profile
 */
membershipPlanSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    planName: this.planName,
    planCode: this.planCode,
    duration: this.duration,
    durationType: this.durationType,
    price: this.price,
    currency: this.currency,
    discount: this.discount,
    finalPrice: this.finalPrice,
    features: this.features,
    description: this.description,
    isPopular: this.isPopular,
    isActive: this.isActive,
    maxMembers: this.maxMembers,
    currentMembers: this.currentMembers,
    category: this.category,
    availableSlots: this.maxMembers ? this.maxMembers - this.currentMembers : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to check if plan is available
 */
membershipPlanSchema.methods.isAvailable = function () {
  if (!this.isActive) return false;
  if (this.maxMembers && this.currentMembers >= this.maxMembers) return false;
  return true;
};

/**
 * Static method to find plan by code
 */
membershipPlanSchema.statics.findByCode = function (code) {
  return this.findOne({ planCode: code.toUpperCase() });
};

const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);

module.exports = MembershipPlan;
