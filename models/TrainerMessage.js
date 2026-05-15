const mongoose = require('mongoose');

/**
 * Trainer Message Schema
 * Manages direct messages between trainers and members
 */
const trainerMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    messageText: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice'],
      default: 'text',
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    reactions: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        emoji: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
trainerMessageSchema.index({ senderId: 1, recipientId: 1 });
trainerMessageSchema.index({ conversationId: 1, createdAt: -1 });
trainerMessageSchema.index({ isRead: 1, recipientId: 1 });

/**
 * Mark message as read
 */
trainerMessageSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

/**
 * Soft delete message
 */
trainerMessageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const TrainerMessage = mongoose.model('TrainerMessage', trainerMessageSchema);

module.exports = TrainerMessage;
