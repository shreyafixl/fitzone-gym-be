const mongoose = require('mongoose');

const conversionSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead ID is required'],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    conversionType: {
      type: String,
      enum: ['membership', 'personal-training', 'group-classes', 'nutrition', 'other'],
      required: [true, 'Conversion type is required'],
    },
    conversionDate: {
      type: Date,
      default: Date.now,
    },
    conversionValue: {
      type: Number,
      required: [true, 'Conversion value is required'],
      min: [0, 'Conversion value cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank-transfer', 'cheque'],
      default: null,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    conversionSource: {
      type: String,
      enum: ['direct-sale', 'follow-up', 'referral', 'promotion', 'other'],
      required: [true, 'Conversion source is required'],
    },
    followUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      default: null,
    },
    conversionDuration: {
      type: Number,
      default: 0,
    },
    conversionCost: {
      type: Number,
      default: 0,
    },
    roi: {
      type: Number,
      default: 0,
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
conversionSchema.index({ leadId: 1 });
conversionSchema.index({ memberId: 1 });
conversionSchema.index({ conversionDate: -1 });
conversionSchema.index({ conversionType: 1 });
conversionSchema.index({ paymentStatus: 1 });
conversionSchema.index({ conversionValue: 1 });

module.exports = mongoose.model('Conversion', conversionSchema);
