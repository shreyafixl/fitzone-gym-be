const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'qualified', 'converted', 'lost'],
      default: 'new',
    },
    source: {
      type: String,
      enum: ['website', 'social-media', 'referral', 'walk-in', 'call', 'other'],
      required: [true, 'Lead source is required'],
    },
    interestedIn: {
      type: String,
      enum: ['membership', 'personal-training', 'group-classes', 'nutrition', 'other'],
      required: [true, 'Interested in is required'],
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    conversionDate: {
      type: Date,
      default: null,
    },
    conversionValue: {
      type: Number,
      default: 0,
    },
    lastContactDate: {
      type: Date,
      default: null,
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    followUpCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    customFields: {
      type: Map,
      of: String,
      default: new Map(),
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
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ nextFollowUpDate: 1 });
leadSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
