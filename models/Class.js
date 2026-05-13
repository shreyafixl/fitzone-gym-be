const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      minlength: [3, 'Class name must be at least 3 characters'],
      maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainer is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [300, 'Duration cannot exceed 300 minutes'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [500, 'Capacity cannot exceed 500'],
    },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: [true, 'Difficulty level is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    image: {
      type: String,
      default: null,
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

// Index for frequently queried fields
classSchema.index({ category: 1 });
classSchema.index({ trainer: 1 });
classSchema.index({ status: 1 });
classSchema.index({ className: 'text', description: 'text' });

module.exports = mongoose.model('Class', classSchema);
