const mongoose = require('mongoose');

/**
 * Workout Plan Schema
 * Manages workout plans assigned to members by trainers
 */
const workoutPlanSchema = new mongoose.Schema(
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
    workoutTitle: {
      type: String,
      required: [true, 'Workout title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    workoutCategory: {
      type: String,
      enum: {
        values: [
          'strength',
          'cardio',
          'flexibility',
          'hiit',
          'crossfit',
          'yoga',
          'pilates',
          'functional',
          'sports-specific',
          'rehabilitation',
          'custom',
        ],
        message: 'Invalid workout category',
      },
      required: [true, 'Workout category is required'],
    },
    exercises: [
      {
        exerciseName: {
          type: String,
          required: true,
          trim: true,
        },
        sets: {
          type: Number,
          required: true,
          min: [1, 'Sets must be at least 1'],
        },
        reps: {
          type: String, // Can be "10-12" or "10" or "AMRAP"
          required: true,
        },
        weight: {
          type: String, // e.g., "50kg", "bodyweight", "progressive"
          default: 'bodyweight',
        },
        restTime: {
          type: Number, // Rest time in seconds
          default: 60,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: [500, 'Exercise notes cannot exceed 500 characters'],
        },
        videoUrl: {
          type: String,
          default: null,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    duration: {
      type: Number, // Duration in minutes
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [300, 'Duration cannot exceed 300 minutes'],
    },
    difficultyLevel: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced', 'expert'],
        message: 'Difficulty level must be beginner, intermediate, advanced, or expert',
      },
      required: [true, 'Difficulty level is required'],
    },
    targetMuscleGroups: [
      {
        type: String,
        enum: [
          'chest',
          'back',
          'shoulders',
          'arms',
          'legs',
          'core',
          'glutes',
          'full-body',
          'cardio',
        ],
      },
    ],
    goals: [
      {
        type: String,
        enum: [
          'weight-loss',
          'muscle-gain',
          'strength',
          'endurance',
          'flexibility',
          'general-fitness',
          'rehabilitation',
        ],
      },
    ],
    frequency: {
      type: String, // e.g., "3 times per week", "Daily"
      default: '3 times per week',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
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
workoutPlanSchema.index({ memberId: 1, status: 1 });
workoutPlanSchema.index({ trainerId: 1, status: 1 });
workoutPlanSchema.index({ workoutCategory: 1 });
workoutPlanSchema.index({ difficultyLevel: 1 });

/**
 * Method to update progress
 */
workoutPlanSchema.methods.updateProgress = function (progressPercentage) {
  this.progress = Math.min(100, Math.max(0, progressPercentage));
  if (this.progress === 100) {
    this.status = 'completed';
  }
  return this.save();
};

/**
 * Method to pause workout plan
 */
workoutPlanSchema.methods.pause = function () {
  this.status = 'paused';
  return this.save();
};

/**
 * Method to resume workout plan
 */
workoutPlanSchema.methods.resume = function () {
  if (this.status === 'paused') {
    this.status = 'active';
  }
  return this.save();
};

/**
 * Method to complete workout plan
 */
workoutPlanSchema.methods.complete = function () {
  this.status = 'completed';
  this.progress = 100;
  this.endDate = new Date();
  return this.save();
};

/**
 * Method to get public profile
 */
workoutPlanSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    memberId: this.memberId,
    trainerId: this.trainerId,
    workoutTitle: this.workoutTitle,
    workoutCategory: this.workoutCategory,
    exercises: this.exercises,
    duration: this.duration,
    difficultyLevel: this.difficultyLevel,
    targetMuscleGroups: this.targetMuscleGroups,
    goals: this.goals,
    frequency: this.frequency,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    progress: this.progress,
    notes: this.notes,
    exerciseCount: this.exercises.length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get member's workout plans
 */
workoutPlanSchema.statics.getMemberPlans = function (memberId, status = null) {
  const query = { memberId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('trainerId', 'fullName email')
    .sort({ createdAt: -1 });
};

/**
 * Static method to get trainer's assigned plans
 */
workoutPlanSchema.statics.getTrainerPlans = function (trainerId, status = null) {
  const query = { trainerId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('memberId', 'fullName email')
    .sort({ createdAt: -1 });
};

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);

module.exports = WorkoutPlan;
