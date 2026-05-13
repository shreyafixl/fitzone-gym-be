const mongoose = require('mongoose');

/**
 * Content Schema
 * Manages blog posts, announcements, schedules, and other content
 */
const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Content title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Content description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['blog', 'announcement', 'schedule', 'other'],
        message: 'Invalid content type',
      },
      required: [true, 'Content type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: 'Invalid content status',
      },
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
contentSchema.index({ type: 1, status: 1 });
contentSchema.index({ createdAt: -1 });
contentSchema.index({ publishedAt: -1 });
contentSchema.index({ featured: 1, status: 1 });

module.exports = mongoose.model('Content', contentSchema);
