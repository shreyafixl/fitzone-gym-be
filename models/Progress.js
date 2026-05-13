const mongoose = require('mongoose');

/**
 * Progress Schema
 * Tracks member fitness progress including measurements, photos, and strength improvements
 */
const progressSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member ID is required'],
      index: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: [true, 'Trainer ID is required'],
      index: true,
    },
    recordDate: {
      type: Date,
      required: [true, 'Record date is required'],
      default: Date.now,
      index: true,
    },
    bodyMeasurements: {
      weight: {
        type: Number, // in kg
        min: [20, 'Weight must be at least 20 kg'],
        max: [500, 'Weight must be less than 500 kg'],
        default: null,
      },
      height: {
        type: Number, // in cm
        min: [50, 'Height must be at least 50 cm'],
        max: [300, 'Height must be less than 300 cm'],
        default: null,
      },
      bmi: {
        type: Number,
        default: null,
      },
      bodyFatPercentage: {
        type: Number,
        min: [0, 'Body fat percentage cannot be negative'],
        max: [100, 'Body fat percentage cannot exceed 100'],
        default: null,
      },
      muscleMass: {
        type: Number, // in kg
        min: [0, 'Muscle mass cannot be negative'],
        default: null,
      },
      chest: {
        type: Number, // in cm
        default: null,
      },
      waist: {
        type: Number, // in cm
        default: null,
      },
      hips: {
        type: Number, // in cm
        default: null,
      },
      biceps: {
        type: Number, // in cm
        default: null,
      },
      thighs: {
        type: Number, // in cm
        default: null,
      },
      calves: {
        type: Number, // in cm
        default: null,
      },
      shoulders: {
        type: Number, // in cm
        default: null,
      },
      neck: {
        type: Number, // in cm
        default: null,
      },
    },
    strengthMetrics: [
      {
        exerciseName: {
          type: String,
          required: true,
          trim: true,
        },
        weight: {
          type: Number, // in kg
          required: true,
        },
        reps: {
          type: Number,
          required: true,
        },
        sets: {
          type: Number,
          default: 1,
        },
        oneRepMax: {
          type: Number, // calculated 1RM
          default: null,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    progressPhotos: [
      {
        photoUrl: {
          type: String,
          required: true,
        },
        photoType: {
          type: String,
          enum: ['front', 'back', 'side', 'other'],
          default: 'front',
        },
        caption: {
          type: String,
          trim: true,
        },
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    fitnessMetrics: {
      restingHeartRate: {
        type: Number, // bpm
        min: [30, 'Resting heart rate must be at least 30 bpm'],
        max: [200, 'Resting heart rate cannot exceed 200 bpm'],
        default: null,
      },
      bloodPressure: {
        systolic: {
          type: Number,
          default: null,
        },
        diastolic: {
          type: Number,
          default: null,
        },
      },
      vo2Max: {
        type: Number, // ml/kg/min
        default: null,
      },
      flexibility: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent'],
        default: null,
      },
      endurance: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent'],
        default: null,
      },
    },
    goals: {
      targetWeight: {
        type: Number,
        default: null,
      },
      targetBodyFat: {
        type: Number,
        default: null,
      },
      targetMeasurements: {
        chest: Number,
        waist: Number,
        hips: Number,
        biceps: Number,
        thighs: Number,
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: null,
    },
    mood: {
      type: String,
      enum: ['excellent', 'good', 'neutral', 'tired', 'exhausted'],
      default: null,
    },
    energyLevel: {
      type: Number, // 1-10 scale
      min: 1,
      max: 10,
      default: null,
    },
    sleepQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: null,
    },
    dietAdherence: {
      type: Number, // percentage 0-100
      min: 0,
      max: 100,
      default: null,
    },
    workoutAdherence: {
      type: Number, // percentage 0-100
      min: 0,
      max: 100,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: {
      type: String,
      enum: ['User', 'Trainer'],
      default: 'Trainer',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
progressSchema.index({ memberId: 1, recordDate: -1 });
progressSchema.index({ trainerId: 1, recordDate: -1 });

/**
 * Pre-save middleware to calculate BMI and 1RM
 */
progressSchema.pre('save', function (next) {
  // Calculate BMI if weight and height are available
  if (this.bodyMeasurements.weight && this.bodyMeasurements.height) {
    const heightInMeters = this.bodyMeasurements.height / 100;
    this.bodyMeasurements.bmi = parseFloat(
      (this.bodyMeasurements.weight / (heightInMeters * heightInMeters)).toFixed(2)
    );
  }

  // Calculate 1RM for strength metrics using Epley formula
  this.strengthMetrics.forEach((metric) => {
    if (metric.weight && metric.reps) {
      metric.oneRepMax = parseFloat((metric.weight * (1 + metric.reps / 30)).toFixed(2));
    }
  });

  next();
});

/**
 * Method to get BMI category
 */
progressSchema.methods.getBMICategory = function () {
  const bmi = this.bodyMeasurements.bmi;
  if (!bmi) return null;

  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Method to get body fat category
 */
progressSchema.methods.getBodyFatCategory = function (gender) {
  const bodyFat = this.bodyMeasurements.bodyFatPercentage;
  if (!bodyFat || !gender) return null;

  if (gender === 'male') {
    if (bodyFat < 6) return 'Essential';
    if (bodyFat < 14) return 'Athletic';
    if (bodyFat < 18) return 'Fitness';
    if (bodyFat < 25) return 'Average';
    return 'Obese';
  } else {
    if (bodyFat < 14) return 'Essential';
    if (bodyFat < 21) return 'Athletic';
    if (bodyFat < 25) return 'Fitness';
    if (bodyFat < 32) return 'Average';
    return 'Obese';
  }
};

/**
 * Method to get public profile
 */
progressSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    memberId: this.memberId,
    trainerId: this.trainerId,
    recordDate: this.recordDate,
    bodyMeasurements: this.bodyMeasurements,
    strengthMetrics: this.strengthMetrics,
    progressPhotos: this.progressPhotos,
    fitnessMetrics: this.fitnessMetrics,
    goals: this.goals,
    notes: this.notes,
    mood: this.mood,
    energyLevel: this.energyLevel,
    sleepQuality: this.sleepQuality,
    dietAdherence: this.dietAdherence,
    workoutAdherence: this.workoutAdherence,
    bmiCategory: this.getBMICategory(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get member progress history
 */
progressSchema.statics.getMemberHistory = function (memberId, limit = 30) {
  return this.find({ memberId })
    .populate('trainerId', 'fullName email')
    .sort({ recordDate: -1 })
    .limit(limit);
};

/**
 * Static method to get latest progress
 */
progressSchema.statics.getLatestProgress = function (memberId) {
  return this.findOne({ memberId })
    .populate('trainerId', 'fullName email')
    .sort({ recordDate: -1 });
};

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
