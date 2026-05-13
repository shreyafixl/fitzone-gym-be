const mongoose = require('mongoose');

/**
 * SupportTicket Schema
 * Manages support tickets for members, trainers, and staff
 */
const supportTicketSchema = new mongoose.Schema(
  {
    ticketTitle: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    ticketDescription: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'createdBy.userModel',
        required: [true, 'Created by user is required'],
        index: true,
      },
      userModel: {
        type: String,
        required: true,
        enum: ['User', 'Trainer', 'SuperAdmin'],
        default: 'User',
      },
      userName: {
        type: String,
        required: true,
      },
      userEmail: {
        type: String,
        required: true,
      },
    },
    assignedTo: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'assignedTo.userModel',
        default: null,
        index: true,
      },
      userModel: {
        type: String,
        enum: ['User', 'SuperAdmin'],
        default: 'SuperAdmin',
      },
      userName: {
        type: String,
        default: null,
      },
      userEmail: {
        type: String,
        default: null,
      },
      assignedDate: {
        type: Date,
        default: null,
      },
    },
    ticketCategory: {
      type: String,
      enum: {
        values: ['technical', 'payment', 'membership', 'trainer', 'branch', 'general'],
        message: 'Invalid ticket category',
      },
      required: [true, 'Ticket category is required'],
      index: true,
    },
    priorityLevel: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Priority must be low, medium, high, or urgent',
      },
      default: 'medium',
      index: true,
    },
    ticketStatus: {
      type: String,
      enum: {
        values: ['open', 'in-progress', 'resolved', 'closed'],
        message: 'Status must be open, in-progress, resolved, or closed',
      },
      default: 'open',
      index: true,
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
          trim: true,
        },
        fileUrl: {
          type: String,
          required: true,
          trim: true,
        },
        fileType: {
          type: String,
          trim: true,
        },
        fileSize: {
          type: Number, // Size in bytes
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
      default: null,
    },
    history: [
      {
        action: {
          type: String,
          required: true,
          enum: [
            'created',
            'assigned',
            'status-changed',
            'priority-changed',
            'updated',
            'resolved',
            'closed',
            'reopened',
            'comment-added',
          ],
        },
        performedBy: {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'history.performedBy.userModel',
          },
          userModel: {
            type: String,
            enum: ['User', 'Trainer', 'SuperAdmin'],
          },
          userName: String,
        },
        details: {
          type: String,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        commentBy: {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'comments.commentBy.userModel',
            required: true,
          },
          userModel: {
            type: String,
            required: true,
            enum: ['User', 'Trainer', 'SuperAdmin'],
          },
          userName: {
            type: String,
            required: true,
          },
        },
        comment: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        },
        isInternal: {
          type: Boolean,
          default: false, // Internal comments only visible to staff
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    responseTime: {
      type: Number, // Time in minutes from creation to first response
      default: null,
    },
    resolutionTime: {
      type: Number, // Time in minutes from creation to resolution
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    relatedTickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportTicket',
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Compound indexes for efficient queries
supportTicketSchema.index({ ticketStatus: 1, priorityLevel: 1 });
supportTicketSchema.index({ ticketCategory: 1, ticketStatus: 1 });
supportTicketSchema.index({ 'createdBy.userId': 1, ticketStatus: 1 });
supportTicketSchema.index({ 'assignedTo.userId': 1, ticketStatus: 1 });
supportTicketSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware to add creation history
 */
supportTicketSchema.pre('save', function (next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      performedBy: {
        userId: this.createdBy.userId,
        userModel: this.createdBy.userModel,
        userName: this.createdBy.userName,
      },
      details: `Ticket created: ${this.ticketTitle}`,
      timestamp: new Date(),
    });
  }
  next();
});

/**
 * Method to assign ticket to user
 */
supportTicketSchema.methods.assignTicket = function (userId, userModel, userName, userEmail, performedBy) {
  this.assignedTo = {
    userId,
    userModel,
    userName,
    userEmail,
    assignedDate: new Date(),
  };

  this.history.push({
    action: 'assigned',
    performedBy: {
      userId: performedBy.userId,
      userModel: performedBy.userModel,
      userName: performedBy.userName,
    },
    details: `Ticket assigned to ${userName}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Method to update ticket status
 */
supportTicketSchema.methods.updateStatus = function (newStatus, performedBy, notes = '') {
  const oldStatus = this.ticketStatus;
  this.ticketStatus = newStatus;

  // Set resolved/closed timestamps
  if (newStatus === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
    // Calculate resolution time
    const createdTime = new Date(this.createdAt).getTime();
    const resolvedTime = this.resolvedAt.getTime();
    this.resolutionTime = Math.round((resolvedTime - createdTime) / (1000 * 60)); // in minutes
  }

  if (newStatus === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }

  // Add to history
  this.history.push({
    action: 'status-changed',
    performedBy: {
      userId: performedBy.userId,
      userModel: performedBy.userModel,
      userName: performedBy.userName,
    },
    details: `Status changed from ${oldStatus} to ${newStatus}${notes ? ': ' + notes : ''}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Method to update priority level
 */
supportTicketSchema.methods.updatePriority = function (newPriority, performedBy, reason = '') {
  const oldPriority = this.priorityLevel;
  this.priorityLevel = newPriority;

  this.history.push({
    action: 'priority-changed',
    performedBy: {
      userId: performedBy.userId,
      userModel: performedBy.userModel,
      userName: performedBy.userName,
    },
    details: `Priority changed from ${oldPriority} to ${newPriority}${reason ? ': ' + reason : ''}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Method to add comment
 */
supportTicketSchema.methods.addComment = function (commentBy, comment, isInternal = false) {
  this.comments.push({
    commentBy: {
      userId: commentBy.userId,
      userModel: commentBy.userModel,
      userName: commentBy.userName,
    },
    comment,
    isInternal,
    createdAt: new Date(),
  });

  // Calculate response time if this is the first comment
  if (this.comments.length === 1 && !this.responseTime) {
    const createdTime = new Date(this.createdAt).getTime();
    const responseTime = new Date().getTime();
    this.responseTime = Math.round((responseTime - createdTime) / (1000 * 60)); // in minutes
  }

  this.history.push({
    action: 'comment-added',
    performedBy: {
      userId: commentBy.userId,
      userModel: commentBy.userModel,
      userName: commentBy.userName,
    },
    details: `Comment added${isInternal ? ' (internal)' : ''}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Method to add attachment
 */
supportTicketSchema.methods.addAttachment = function (fileName, fileUrl, fileType, fileSize) {
  this.attachments.push({
    fileName,
    fileUrl,
    fileType,
    fileSize,
    uploadedAt: new Date(),
  });

  return this.save();
};

/**
 * Method to resolve ticket
 */
supportTicketSchema.methods.resolveTicket = function (resolutionNotes, performedBy) {
  this.ticketStatus = 'resolved';
  this.resolutionNotes = resolutionNotes;
  this.resolvedAt = new Date();

  // Calculate resolution time
  const createdTime = new Date(this.createdAt).getTime();
  const resolvedTime = this.resolvedAt.getTime();
  this.resolutionTime = Math.round((resolvedTime - createdTime) / (1000 * 60)); // in minutes

  this.history.push({
    action: 'resolved',
    performedBy: {
      userId: performedBy.userId,
      userModel: performedBy.userModel,
      userName: performedBy.userName,
    },
    details: `Ticket resolved: ${resolutionNotes}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Method to close ticket
 */
supportTicketSchema.methods.closeTicket = function (performedBy, notes = '') {
  this.ticketStatus = 'closed';
  this.closedAt = new Date();

  this.history.push({
    action: 'closed',
    performedBy: {
      userId: performedBy.userId,
      userModel: performedBy.userModel,
      userName: performedBy.userName,
    },
    details: `Ticket closed${notes ? ': ' + notes : ''}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Method to reopen ticket
 */
supportTicketSchema.methods.reopenTicket = function (performedBy, reason = '') {
  this.ticketStatus = 'open';
  this.resolvedAt = null;
  this.closedAt = null;

  this.history.push({
    action: 'reopened',
    performedBy: {
      userId: performedBy.userId,
      userModel: performedBy.userModel,
      userName: performedBy.userName,
    },
    details: `Ticket reopened${reason ? ': ' + reason : ''}`,
    timestamp: new Date(),
  });

  return this.save();
};

/**
 * Static method to get tickets by user
 */
supportTicketSchema.statics.getByUser = function (userId) {
  return this.find({ 'createdBy.userId': userId })
    .sort({ createdAt: -1 })
    .populate('assignedTo.userId', 'fullName email');
};

/**
 * Static method to get assigned tickets
 */
supportTicketSchema.statics.getAssignedTickets = function (userId) {
  return this.find({ 'assignedTo.userId': userId })
    .sort({ priorityLevel: -1, createdAt: -1 })
    .populate('createdBy.userId', 'fullName email');
};

/**
 * Static method to get tickets by status
 */
supportTicketSchema.statics.getByStatus = function (status) {
  return this.find({ ticketStatus: status })
    .sort({ priorityLevel: -1, createdAt: -1 })
    .populate('createdBy.userId', 'fullName email')
    .populate('assignedTo.userId', 'fullName email');
};

/**
 * Static method to get urgent tickets
 */
supportTicketSchema.statics.getUrgentTickets = function () {
  return this.find({
    priorityLevel: 'urgent',
    ticketStatus: { $in: ['open', 'in-progress'] },
  })
    .sort({ createdAt: 1 })
    .populate('createdBy.userId', 'fullName email')
    .populate('assignedTo.userId', 'fullName email');
};

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
