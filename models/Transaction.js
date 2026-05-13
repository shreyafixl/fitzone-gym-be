const mongoose = require('mongoose');

/**
 * Transaction Schema
 * Defines the structure for financial transactions
 */
const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: ['membership', 'renewal', 'upgrade', 'refund', 'other'],
        message: 'Invalid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: ['success', 'pending', 'failed', 'refunded'],
        message: 'Invalid transaction status',
      },
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['card', 'upi', 'netbanking', 'cash', 'wallet'],
        message: 'Invalid payment method',
      },
      required: [true, 'Payment method is required'],
    },
    paymentGateway: {
      type: String,
      default: null,
    },
    gatewayTransactionId: {
      type: String,
      default: null,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: {
      type: String,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ subscription: 1 });
transactionSchema.index({ branch: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

/**
 * Method to get public transaction profile
 */
transactionSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    transactionId: this.transactionId,
    user: this.user,
    subscription: this.subscription,
    branch: this.branch,
    type: this.type,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    paymentGateway: this.paymentGateway,
    gatewayTransactionId: this.gatewayTransactionId,
    description: this.description,
    refundAmount: this.refundAmount,
    refundReason: this.refundReason,
    refundedAt: this.refundedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Method to process refund
 */
transactionSchema.methods.processRefund = function (amount, reason) {
  this.status = 'refunded';
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  return this.save();
};

/**
 * Static method to generate transaction ID
 */
transactionSchema.statics.generateTransactionId = async function () {
  const prefix = 'TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
