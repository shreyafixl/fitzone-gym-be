const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      required: [true, 'Enquiry ID is required'],
    },
    followUpType: {
      type: String,
      enum: ['call', 'email', 'sms', 'meeting', 'demo', 'other'],
      required: [true, 'Follow-up type is required'],
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    completedDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'rescheduled'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    outcome: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'pending'],
      default: 'pending',
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned to is required'],
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
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

// Indexes for frequently queried fields
followUpSchema.index({ enquiryId: 1 });
followUpSchema.index({ status: 1 });
followUpSchema.index({ scheduledDate: 1 });
followUpSchema.index({ assignedTo: 1 });
followUpSchema.index({ reminderSent: 1 });
followUpSchema.index({ priority: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
