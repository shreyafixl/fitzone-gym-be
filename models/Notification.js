const mongoose = require('mongoose');

/**
 * Notification Schema
 * Manages notifications sent to members by trainers
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    notificationType: {
      type: String,
      enum: {
        values: [
          'workout-reminder',
          'session-reminder',
          'diet-reminder',
          'progress-update',
          'achievement',
          'membership-expiry',
          'payment-reminder',
          'general',
          'announcement',
        ],
        message: 'Invalid notification type',
      },
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    actionUrl: {
      type: String,
      trim: true,
      default: null,
    },
    actionLabel: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      workoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkoutPlan',
        default: null,
      },
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: null,
      },
      dietId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DietPlan',
        default: null,
      },
      progressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Progress',
        default: null,
      },
      customData: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    pushNotification: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: {
        type: Date,
        default: null,
      },
      deviceTokens: [String],
      error: {
        type: String,
        default: null,
      },
    },
    emailNotification: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },
    smsNotification: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'expired'],
      default: 'sent',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ senderId: 1, createdAt: -1 });
notificationSchema.index({ notificationType: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

/**
 * Method to mark as read
 */
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = Date.now();
  return this.save();
};

/**
 * Method to mark as unread
 */
notificationSchema.methods.markAsUnread = function () {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

/**
 * Method to soft delete
 */
notificationSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  return this.save();
};

/**
 * Method to check if expired
 */
notificationSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * Method to get public profile
 */
notificationSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    recipientId: this.recipientId,
    senderId: this.senderId,
    notificationType: this.notificationType,
    title: this.title,
    message: this.message,
    priority: this.priority,
    isRead: this.isRead,
    readAt: this.readAt,
    actionUrl: this.actionUrl,
    actionLabel: this.actionLabel,
    metadata: this.metadata,
    scheduledFor: this.scheduledFor,
    sentAt: this.sentAt,
    expiresAt: this.expiresAt,
    status: this.status,
    isExpired: this.isExpired(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Static method to get unread count
 */
notificationSchema.statics.getUnreadCount = function (recipientId) {
  return this.countDocuments({
    recipientId,
    isRead: false,
    isDeleted: false,
  });
};

/**
 * Static method to mark all as read
 */
notificationSchema.statics.markAllAsRead = function (recipientId) {
  return this.updateMany(
    { recipientId, isRead: false, isDeleted: false },
    { isRead: true, readAt: Date.now() }
  );
};

/**
 * Static method to get notifications by type
 */
notificationSchema.statics.getByType = function (recipientId, notificationType, limit = 20) {
  return this.find({
    recipientId,
    notificationType,
    isDeleted: false,
  })
    .populate('senderId', 'fullName email profileImage')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
