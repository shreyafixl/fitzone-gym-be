const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Category name must be at least 3 characters'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: '#000000',
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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
categorySchema.index({ status: 1 });
categorySchema.index({ categoryName: 1 });

module.exports = mongoose.model('Category', categorySchema);
