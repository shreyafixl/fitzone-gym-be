const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Equipment name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Cardio', 'Strength', 'Functional', 'Flexibility', 'Other'],
    },
    branch: {
      type: String,
      default: 'N/A',
    },
    status: {
      type: String,
      enum: ['working', 'maintenance', 'broken', 'retired'],
      default: 'working',
    },
    lastService: {
      type: Date,
      default: null,
    },
    nextService: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Equipment', equipmentSchema);
