const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
    },
    source: {
      type: String,
      enum: ['website', 'phone', 'referral', 'social-media', 'walk-in', 'other'],
      default: 'website',
    },
    interestedIn: {
      type: String,
      enum: ['membership', 'personal-training', 'group-classes', 'nutrition', 'other'],
      required: [true, 'Interested in is required'],
    },
    membershipPlan: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
      default: null,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'not-interested', 'converted', 'lost'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    conversionStatus: {
      type: String,
      enum: ['pending', 'converted', 'not-converted'],
      default: 'pending',
    },
    convertedMemberId: {
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
    tags: [String],
    notes: [
      {
        content: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for frequently queried fields
enquirySchema.index({ status: 1 });
enquirySchema.index({ priority: 1 });
enquirySchema.index({ assignedTo: 1 });
enquirySchema.index({ conversionStatus: 1 });
enquirySchema.index({ email: 1 });
enquirySchema.index({ phone: 1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ email: 'text', name: 'text', message: 'text' });

module.exports = mongoose.model('Enquiry', enquirySchema);
