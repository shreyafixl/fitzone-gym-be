const jwt = require('jsonwebtoken');
const Trainer = require('../models/Trainer');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verify JWT token for trainer
 */
const protectTrainer = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route. Please login.');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find trainer by id from token
    const trainer = await Trainer.findById(decoded.id).select('-password');

    // Check if trainer exists
    if (!trainer) {
      throw ApiError.unauthorized('Trainer not found. Token is invalid.');
    }

    // Check if trainer is active
    if (!trainer.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
    }

    // Check trainer status
    if (trainer.trainerStatus === 'inactive') {
      throw ApiError.forbidden('Your trainer account is inactive. Please contact admin.');
    }

    // Attach trainer to request object
    req.user = {
      id: trainer._id,
      email: trainer.email,
      role: 'trainer',
      fullName: trainer.fullName,
      assignedBranch: trainer.assignedBranch,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token. Please login again.');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired. Please login again.');
    }
    throw error;
  }
});

/**
 * Check if trainer belongs to specific branch
 * @param {string} branchId - Branch ID to check
 */
const checkBranchAccess = (branchId) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authorized to access this route');
    }

    if (req.user.assignedBranch.toString() !== branchId) {
      throw ApiError.forbidden('You do not have access to this branch');
    }

    next();
  };
};

/**
 * Check if trainer is assigned to specific member
 * @param {string} memberId - Member ID to check
 */
const checkMemberAccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  const trainer = await Trainer.findById(req.user.id);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const memberId = req.params.memberId || req.body.memberId;

  if (!memberId) {
    throw ApiError.badRequest('Member ID is required');
  }

  const isAssigned = trainer.assignedMembers.some(
    (m) => m.memberId.toString() === memberId && m.status === 'active'
  );

  if (!isAssigned) {
    throw ApiError.forbidden('You are not assigned to this member');
  }

  next();
});

/**
 * Optional authentication - doesn't throw error if no token
 * Useful for routes that work differently for authenticated vs non-authenticated users
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const trainer = await Trainer.findById(decoded.id).select('-password');

    if (trainer && trainer.isActive && trainer.trainerStatus !== 'inactive') {
      req.user = {
        id: trainer._id,
        email: trainer.email,
        role: 'trainer',
        fullName: trainer.fullName,
        assignedBranch: trainer.assignedBranch,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
});

/**
 * Check if trainer status is active (not on leave)
 */
const checkActiveStatus = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  const trainer = await Trainer.findById(req.user.id);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  if (trainer.trainerStatus === 'on-leave') {
    throw ApiError.forbidden('You are currently on leave. Please contact admin.');
  }

  next();
});

module.exports = {
  protectTrainer,
  checkBranchAccess,
  checkMemberAccess,
  optionalAuth,
  checkActiveStatus,
};
