const mongoose = require('mongoose');

/**
 * Feedback Schema
 * Manages member feedback and ratings for the gym
 */
const feedbackSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    category: {
      type: String,
      enum: {
        values: ['service', 'facilities', 'staff', 'cleanliness', 'classes', 'equipment', 'other'],
        message: 'Invalid feedback category',
      },
      required: [true, 'Feedback category is required'],
    },
    comment: {
      type: String,
      required: [true, 'Feedback comment is required'],
      trim: true,
      minlength: [5, 'Comment must be at least 5 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved', 'archived'],
      default: 'new',
    },
    response: {
      comment: {
        type: String,
        default: null,
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuperAdmin',
        default: null,
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ branch: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
