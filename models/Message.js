const mongoose = require('mongoose');

/**
 * Message Schema
 * Defines the structure for direct messages between users
 */
const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Sender ID is required'],
      refPath: 'senderModel',
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['User', 'SuperAdmin'],
      default: 'SuperAdmin',
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Receiver ID is required'],
      ref: 'User',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
      default: null,
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message must be at least 1 character'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    messageType: {
      type: String,
      enum: {
        values: ['text', 'notification', 'alert', 'reminder'],
        message: 'Message type must be text, notification, alert, or reminder',
      },
      default: 'text',
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
      },
    ],
    readStatus: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: 'Priority must be low, normal, high, or urgent',
      },
      default: 'normal',
    },
    status: {
      type: String,
      enum: {
        values: ['sent', 'delivered', 'read', 'failed'],
        message: 'Status must be sent, delivered, read, or failed',
      },
      default: 'sent',
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'senderModel',
      },
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'senderModel',
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
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
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, readStatus: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ sentAt: -1 });
messageSchema.index({ status: 1 });

/**
 * Method to get public message profile
 */
messageSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    senderId: this.senderId,
    senderModel: this.senderModel,
    receiverId: this.receiverId,
    subject: this.subject,
    message: this.message,
    messageType: this.messageType,
    attachments: this.attachments,
    readStatus: this.readStatus,
    readAt: this.readAt,
    priority: this.priority,
    status: this.status,
    replyTo: this.replyTo,
    isArchived: this.isArchived,
    sentAt: this.sentAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to mark message as read
 */
messageSchema.methods.markAsRead = function () {
  if (!this.readStatus) {
    this.readStatus = true;
    this.readAt = new Date();
    this.status = 'read';
  }
  return this.save();
};

/**
 * Method to mark message as delivered
 */
messageSchema.methods.markAsDelivered = function () {
  if (this.status === 'sent') {
    this.status = 'delivered';
  }
  return this.save();
};

/**
 * Method to archive message
 */
messageSchema.methods.archiveBy = function (userId) {
  if (!this.archivedBy.includes(userId)) {
    this.archivedBy.push(userId);
  }
  return this.save();
};

/**
 * Method to delete message (soft delete)
 */
messageSchema.methods.deleteBy = function (userId) {
  if (!this.deletedBy.includes(userId)) {
    this.deletedBy.push(userId);
  }
  return this.save();
};

/**
 * Static method to get conversation between two users
 */
messageSchema.statics.getConversation = function (userId1, userId2) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
    deletedBy: { $nin: [userId1, userId2] },
  }).sort({ sentAt: 1 });
};

/**
 * Static method to get unread count for user
 */
messageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiverId: userId,
    readStatus: false,
    deletedBy: { $ne: userId },
  });
};

/**
 * Static method to get inbox for user
 */
messageSchema.statics.getInbox = function (userId) {
  return this.find({
    receiverId: userId,
    deletedBy: { $ne: userId },
  })
    .populate('senderId', 'fullName email')
    .sort({ sentAt: -1 });
};

/**
 * Static method to get sent messages for user
 */
messageSchema.statics.getSent = function (userId) {
  return this.find({
    senderId: userId,
    deletedBy: { $ne: userId },
  })
    .populate('receiverId', 'fullName email')
    .sort({ sentAt: -1 });
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
