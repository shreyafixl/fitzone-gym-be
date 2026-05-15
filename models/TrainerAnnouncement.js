const mongoose = require('mongoose');

/**
 * Trainer Announcement Schema
 * Manages announcements sent to trainers
 */
const trainerAnnouncementSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Creator ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    announcementType: {
      type: String,
      enum: ['general', 'urgent', 'maintenance', 'feature', 'policy', 'event'],
      default: 'general',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['all-trainers', 'specific-trainers', 'specific-branch'],
      default: 'all-trainers',
    },
    targetTrainerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer',
      },
    ],
    targetBranchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
      },
    ],
    imageUrl: {
      type: String,
      default: null,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
      },
    ],
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    readBy: [
      {
        trainerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Trainer',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    actionUrl: {
      type: String,
      default: null,
    },
    actionLabel: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
trainerAnnouncementSchema.index({ createdBy: 1, publishedAt: -1 });
trainerAnnouncementSchema.index({ isActive: 1, publishedAt: -1 });
trainerAnnouncementSchema.index({ announcementType: 1, isActive: 1 });
trainerAnnouncementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Mark announcement as read by trainer
 */
trainerAnnouncementSchema.methods.markAsReadBy = function (trainerId) {
  const existingRead = this.readBy.find(r => r.trainerId.toString() === trainerId.toString());
  if (!existingRead) {
    this.readBy.push({
      trainerId,
      readAt: new Date(),
    });
    this.viewCount += 1;
  }
  return this.save();
};

/**
 * Check if announcement is read by trainer
 */
trainerAnnouncementSchema.methods.isReadByTrainer = function (trainerId) {
  return this.readBy.some(r => r.trainerId.toString() === trainerId.toString());
};

/**
 * Get read percentage
 */
trainerAnnouncementSchema.methods.getReadPercentage = function (totalTrainers) {
  if (totalTrainers === 0) return 0;
  return Math.round((this.readBy.length / totalTrainers) * 100);
};

/**
 * Static method to get active announcements
 */
trainerAnnouncementSchema.statics.getActiveAnnouncements = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    publishedAt: { $lte: now },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ],
  }).sort({ publishedAt: -1 });
};

const TrainerAnnouncement = mongoose.model('TrainerAnnouncement', trainerAnnouncementSchema);

module.exports = TrainerAnnouncement;
