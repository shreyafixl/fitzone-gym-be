const mongoose = require('mongoose');

/**
 * Announcement Schema
 * Defines the structure for system announcements
 */
const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Announcement description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    targetAudience: {
      type: String,
      enum: {
        values: ['all', 'members', 'trainers', 'staff', 'admins', 'specific-branch'],
        message: 'Target audience must be all, members, trainers, staff, admins, or specific-branch',
      },
      required: [true, 'Target audience is required'],
      default: 'all',
    },
    targetBranches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
      },
    ],
    publishDate: {
      type: Date,
      required: [true, 'Publish date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Priority must be low, medium, high, or urgent',
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived', 'expired'],
        message: 'Status must be draft, published, archived, or expired',
      },
      default: 'draft',
    },
    category: {
      type: String,
      enum: {
        values: ['general', 'event', 'maintenance', 'promotion', 'policy', 'emergency'],
        message: 'Category must be general, event, maintenance, promotion, policy, or emergency',
      },
      default: 'general',
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      required: [true, 'Creator is required'],
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
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
announcementSchema.index({ status: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ expiryDate: 1 });
announcementSchema.index({ isPinned: -1, publishDate: -1 });
announcementSchema.index({ category: 1 });

/**
 * Method to get public announcement profile
 */
announcementSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    targetAudience: this.targetAudience,
    targetBranches: this.targetBranches,
    publishDate: this.publishDate,
    expiryDate: this.expiryDate,
    priority: this.priority,
    status: this.status,
    category: this.category,
    attachments: this.attachments,
    isPinned: this.isPinned,
    viewCount: this.viewCount,
    tags: this.tags,
    isExpired: this.isExpired(),
    isPublished: this.isPublished(),
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to check if announcement is expired
 */
announcementSchema.methods.isExpired = function () {
  if (!this.expiryDate) return false;
  return new Date() > new Date(this.expiryDate);
};

/**
 * Method to check if announcement is published
 */
announcementSchema.methods.isPublished = function () {
  const now = new Date();
  return (
    this.status === 'published' &&
    new Date(this.publishDate) <= now &&
    (!this.expiryDate || new Date(this.expiryDate) > now)
  );
};

/**
 * Method to increment view count
 */
announcementSchema.methods.incrementViewCount = function (userId) {
  const alreadyViewed = this.viewedBy.some((view) => view.userId.toString() === userId.toString());
  if (!alreadyViewed) {
    this.viewedBy.push({ userId, viewedAt: new Date() });
    this.viewCount += 1;
  }
  return this.save();
};

/**
 * Method to publish announcement
 */
announcementSchema.methods.publish = function () {
  this.status = 'published';
  if (!this.publishDate || new Date(this.publishDate) < new Date()) {
    this.publishDate = new Date();
  }
  return this.save();
};

/**
 * Method to archive announcement
 */
announcementSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

/**
 * Static method to get active announcements
 */
announcementSchema.statics.getActive = function (targetAudience = null) {
  const query = {
    status: 'published',
    publishDate: { $lte: new Date() },
    $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
  };
  if (targetAudience) {
    query.$or = [{ targetAudience: 'all' }, { targetAudience }];
  }
  return this.find(query).sort({ isPinned: -1, publishDate: -1 });
};

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
