const mongoose = require('mongoose');

/**
 * Diet Plan Schema
 * Manages diet plans assigned to members by trainers
 */
const dietPlanSchema = new mongoose.Schema(
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
      required: [true, 'Trainer ID is required'],
      index: true,
    },
    dietTitle: {
      type: String,
      required: [true, 'Diet title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    dietType: {
      type: String,
      enum: {
        values: [
          'weight-loss',
          'weight-gain',
          'muscle-building',
          'maintenance',
          'keto',
          'vegan',
          'vegetarian',
          'paleo',
          'mediterranean',
          'low-carb',
          'high-protein',
          'balanced',
          'custom',
        ],
        message: 'Invalid diet type',
      },
      default: 'balanced',
    },
    mealSchedule: [
      {
        mealName: {
          type: String,
          required: true,
          enum: ['breakfast', 'mid-morning-snack', 'lunch', 'evening-snack', 'dinner', 'post-workout', 'other'],
        },
        time: {
          type: String, // e.g., "08:00 AM"
          required: true,
        },
        foods: [
          {
            foodItem: {
              type: String,
              required: true,
              trim: true,
            },
            quantity: {
              type: String, // e.g., "100g", "1 cup", "2 pieces"
              required: true,
            },
            calories: {
              type: Number,
              default: 0,
            },
            protein: {
              type: Number, // in grams
              default: 0,
            },
            carbs: {
              type: Number, // in grams
              default: 0,
            },
            fats: {
              type: Number, // in grams
              default: 0,
            },
          },
        ],
        totalCalories: {
          type: Number,
          default: 0,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: [500, 'Meal notes cannot exceed 500 characters'],
        },
      },
    ],
    calorieTarget: {
      daily: {
        type: Number,
        required: [true, 'Daily calorie target is required'],
        min: [500, 'Daily calories must be at least 500'],
        max: [10000, 'Daily calories cannot exceed 10000'],
      },
      protein: {
        type: Number, // in grams
        default: 0,
      },
      carbs: {
        type: Number, // in grams
        default: 0,
      },
      fats: {
        type: Number, // in grams
        default: 0,
      },
    },
    nutritionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Nutrition notes cannot exceed 2000 characters'],
      default: null,
    },
    restrictions: [
      {
        type: String,
        enum: [
          'dairy-free',
          'gluten-free',
          'nut-free',
          'soy-free',
          'egg-free',
          'shellfish-free',
          'lactose-intolerant',
          'diabetic-friendly',
          'low-sodium',
          'halal',
          'kosher',
        ],
      },
    ],
    supplements: [
      {
        supplementName: {
          type: String,
          required: true,
          trim: true,
        },
        dosage: {
          type: String,
          required: true,
        },
        timing: {
          type: String, // e.g., "Morning", "Post-workout"
          required: true,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    hydrationGoal: {
      type: Number, // in liters
      default: 3,
      min: [1, 'Hydration goal must be at least 1 liter'],
      max: [10, 'Hydration goal cannot exceed 10 liters'],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // Duration in days
      default: 30,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'paused', 'cancelled'],
        message: 'Status must be active, completed, paused, or cancelled',
      },
      default: 'active',
      index: true,
    },
    progress: {
      type: Number, // Percentage 0-100
      default: 0,
      min: 0,
      max: 100,
    },
    adherenceRate: {
      type: Number, // Percentage 0-100
      default: 0,
      min: 0,
      max: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
dietPlanSchema.index({ memberId: 1, status: 1 });
dietPlanSchema.index({ trainerId: 1, status: 1 });
dietPlanSchema.index({ dietType: 1 });

/**
 * Pre-save middleware to calculate total calories per meal
 */
dietPlanSchema.pre('save', function (next) {
  this.mealSchedule.forEach((meal) => {
    meal.totalCalories = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
  });
  next();
});

/**
 * Method to update progress
 */
dietPlanSchema.methods.updateProgress = function (progressPercentage) {
  this.progress = Math.min(100, Math.max(0, progressPercentage));
  if (this.progress === 100) {
    this.status = 'completed';
  }
  return this.save();
};

/**
 * Method to update adherence rate
 */
dietPlanSchema.methods.updateAdherence = function (adherencePercentage) {
  this.adherenceRate = Math.min(100, Math.max(0, adherencePercentage));
  return this.save();
};

/**
 * Method to pause diet plan
 */
dietPlanSchema.methods.pause = function () {
  this.status = 'paused';
  return this.save();
};

/**
 * Method to resume diet plan
 */
dietPlanSchema.methods.resume = function () {
  if (this.status === 'paused') {
    this.status = 'active';
  }
  return this.save();
};

/**
 * Method to complete diet plan
 */
dietPlanSchema.methods.complete = function () {
  this.status = 'completed';
  this.progress = 100;
  this.endDate = new Date();
  return this.save();
};

/**
 * Method to get total daily calories
 */
dietPlanSchema.methods.getTotalDailyCalories = function () {
  return this.mealSchedule.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
};

/**
 * Method to get public profile
 */
dietPlanSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    memberId: this.memberId,
    trainerId: this.trainerId,
    dietTitle: this.dietTitle,
    dietType: this.dietType,
    mealSchedule: this.mealSchedule,
    calorieTarget: this.calorieTarget,
    nutritionNotes: this.nutritionNotes,
    restrictions: this.restrictions,
    supplements: this.supplements,
    hydrationGoal: this.hydrationGoal,
    startDate: this.startDate,
    endDate: this.endDate,
    duration: this.duration,
    status: this.status,
    progress: this.progress,
    adherenceRate: this.adherenceRate,
    totalDailyCalories: this.getTotalDailyCalories(),
    mealCount: this.mealSchedule.length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get member's diet plans
 */
dietPlanSchema.statics.getMemberPlans = function (memberId, status = null) {
  const query = { memberId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('trainerId', 'fullName email')
    .sort({ createdAt: -1 });
};

/**
 * Static method to get trainer's assigned plans
 */
dietPlanSchema.statics.getTrainerPlans = function (trainerId, status = null) {
  const query = { trainerId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('memberId', 'fullName email')
    .sort({ createdAt: -1 });
};

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

module.exports = DietPlan;
