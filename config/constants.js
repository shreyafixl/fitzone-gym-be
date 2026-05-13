/**
 * Application Constants
 * Centralized configuration values used across the application
 */

module.exports = {
  // User Roles
  ROLES: {
    SUPER_ADMIN: 'superadmin',
    ADMIN: 'admin',
    TRAINER: 'trainer',
    RECEPTION: 'reception',
    MEMBER: 'member',
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    EXPIRED: 'expired',
  },

  // Branch Status
  BRANCH_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    NEW: 'new',
    PLANNED: 'planned',
  },

  // Transaction Types
  TRANSACTION_TYPES: {
    MEMBERSHIP: 'membership',
    CLASS: 'class',
    PRODUCT: 'product',
    REFUND: 'refund',
  },

  // Transaction Status
  TRANSACTION_STATUS: {
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending',
    REFUNDED: 'refunded',
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CARD: 'card',
    UPI: 'upi',
    NET_BANKING: 'netbanking',
    CASH: 'cash',
  },

  // Subscription Status
  SUBSCRIPTION_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    EXPIRING: 'expiring',
    CANCELLED: 'cancelled',
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Session Configuration
  SESSION: {
    TIMEOUT_MINUTES: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30,
    MAX_CONCURRENT: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5,
  },

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW_MINUTES: 15,
    API_REQUESTS_PER_HOUR: 1000,
  },

  // Password Configuration
  PASSWORD: {
    MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH) || 12,
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },
};
