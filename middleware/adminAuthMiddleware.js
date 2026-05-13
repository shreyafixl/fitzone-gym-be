const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect routes - Verify JWT token for admin
 */
const protectAdmin = asyncHandler(async (req, res, next) => {
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

    // Find admin by id from token
    const admin = await Admin.findById(decoded.id).select('-password -refreshToken');

    // Check if admin exists
    if (!admin) {
      throw ApiError.unauthorized('Admin not found. Token is invalid.');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
    }

    // Check if account is locked
    if (admin.isLocked()) {
      throw ApiError.forbidden('Your account is locked due to multiple failed login attempts.');
    }

    // Check if password was changed after token was issued
    if (admin.changedPasswordAfter(decoded.iat)) {
      throw ApiError.unauthorized('Password was recently changed. Please login again.');
    }

    // Attach admin to request object
    req.user = {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
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
const authorizeAdmin = (...roles) => {
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
 * Check specific permission
 * @param {string} permission - Permission to check
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authorized to access this route');
    }

    if (!req.user.permissions || !req.user.permissions[permission]) {
      throw ApiError.forbidden(
        `You do not have permission to perform this action. Required permission: ${permission}`
      );
    }

    next();
  };
};

/**
 * Check multiple permissions (all required)
 * @param  {...string} permissions - Permissions to check
 */
const checkPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authorized to access this route');
    }

    const missingPermissions = permissions.filter(
      (permission) => !req.user.permissions || !req.user.permissions[permission]
    );

    if (missingPermissions.length > 0) {
      throw ApiError.forbidden(
        `You do not have the required permissions: ${missingPermissions.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Check if user has any of the specified permissions
 * @param  {...string} permissions - Permissions to check
 */
const checkAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authorized to access this route');
    }

    const hasPermission = permissions.some(
      (permission) => req.user.permissions && req.user.permissions[permission]
    );

    if (!hasPermission) {
      throw ApiError.forbidden(
        `You need at least one of these permissions: ${permissions.join(', ')}`
      );
    }

    next();
  };
};

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
    const admin = await Admin.findById(decoded.id).select('-password -refreshToken');

    if (admin && admin.isActive && !admin.isLocked()) {
      req.user = {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
});

module.exports = {
  protectAdmin,
  authorizeAdmin,
  checkPermission,
  checkPermissions,
  checkAnyPermission,
  optionalAuth,
};
