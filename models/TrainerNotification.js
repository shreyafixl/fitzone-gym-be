const mongoose = require('mongoose');

/**
 * Trainer Notification Schema
 * Manages notifications for trainers
 */
const trainerNotificationSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: [true, 'Trainer ID is required'],
      index: true,
    },
    notificationType: {
      type: String,
      enum: [
        'new-booking',
        'booking-cancelled',
        'booking-rescheduled',
        'member-message',
        'member-review',
        'payment-received',
        'system-update',
        'announcement',
        'member-joined',
        'member-progress',
        'custom',
      ],
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
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    icon: {
      type: String,
      default: 'bell',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    category: {
      type: String,
      enum: ['booking', 'message', 'payment', 'system', 'member', 'announcement'],
      default: 'system',
      index: true,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedEntityType: {
      type: String,
      enum: ['session', 'member', 'message', 'payment', 'announcement'],
      default: null,
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
      default: null,
    },
    actionLabel: {
      type: String,
      default: 'View',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
trainerNotificationSchema.index({ trainerId: 1, createdAt: -1 });
trainerNotificationSchema.index({ trainerId: 1, isRead: 1 });
trainerNotificationSchema.index({ trainerId: 1, notificationType: 1 });
trainerNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Mark notification as read
 */
trainerNotificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

/**
 * Mark notification as unread
 */
trainerNotificationSchema.methods.markAsUnread = function () {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

/**
 * Static method to mark all notifications as read for a trainer
 */
trainerNotificationSchema.statics.markAllAsRead = function (trainerId) {
  return this.updateMany(
    { trainerId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * Static method to get unread count
 */
trainerNotificationSchema.statics.getUnreadCount = function (trainerId) {
  return this.countDocuments({ trainerId, isRead: false });
};

const TrainerNotification = mongoose.model('TrainerNotification', trainerNotificationSchema);

module.exports = TrainerNotification;
