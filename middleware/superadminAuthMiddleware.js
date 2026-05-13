const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verify JWT token for superadmin
 */
const protectSuperAdmin = asyncHandler(async (req, res, next) => {
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

    // Find superadmin by id from token
    const superAdmin = await SuperAdmin.findById(decoded.id).select('-password -refreshToken');

    // Check if superadmin exists
    if (!superAdmin) {
      throw ApiError.unauthorized('SuperAdmin not found. Token is invalid.');
    }

    // Check if superadmin is active
    if (superAdmin.isActive === false) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
    }

    // Check if account is locked
    if (superAdmin.isLocked && superAdmin.isLocked()) {
      throw ApiError.forbidden('Your account is locked due to multiple failed login attempts.');
    }

    // Attach superadmin to request object
    req.user = {
      id: superAdmin._id,
      email: superAdmin.email,
      role: superAdmin.role,
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
 * Authorize specific roles
 * @param  {...string} roles - Allowed roles
 */
const authorizeSuperAdmin = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authorized to access this route');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `User role '${req.user.role}' is not authorized to access this route`
      );
    }

    next();
  };
};

/**
 * Optional authentication - doesn't throw error if no token
 * Useful for routes that work differently for authenticated vs non-authenticated users
 */
const optionalSuperAdminAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const superAdmin = await SuperAdmin.findById(decoded.id).select('-password -refreshToken');

    if (superAdmin && superAdmin.isActive !== false && (!superAdmin.isLocked || !superAdmin.isLocked())) {
      req.user = {
        id: superAdmin._id,
        email: superAdmin.email,
        role: superAdmin.role,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
});

module.exports = {
  protectSuperAdmin,
  authorizeSuperAdmin,
  optionalSuperAdminAuth,
};
