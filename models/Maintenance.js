const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    equipment_id: {
      type: String,
      required: [true, 'Equipment ID is required'],
    },
    type: {
      type: String,
      required: [true, 'Maintenance type is required'],
      enum: ['routine', 'repair', 'emergency', 'inspection'],
    },
    technician_name: {
      type: String,
      required: [true, 'Technician name is required'],
      trim: true,
    },
    scheduled_date: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    completed_date: {
      type: Date,
      default: null,
    },
    cost: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
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

module.exports = mongoose.model('Maintenance', maintenanceSchema);
