const ApiError = require('../utils/ApiError');

/**
 * Role-Based Authorization Middleware
 * Restricts access to routes based on user roles
 * Must be used after protect middleware
 * 
 * @param {...string} roles - Allowed roles (e.g., 'superadmin', 'admin')
 * @returns {Function} - Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (should be set by protect middleware)
    if (!req.user) {
      throw ApiError.unauthorized('Not authorized, please login');
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Role '${req.user.role}' is not authorized to access this resource`
      );
    }

    next();
  };
};

/**
 * Super Admin Only Middleware
 * Shorthand for authorize('superadmin')
 */
const superAdminOnly = authorize('superadmin');

/**
 * Admin and Super Admin Middleware
 * Allows both admin and superadmin roles
 */
const adminAccess = authorize('superadmin', 'admin');

module.exports = {
  authorize,
  superAdminOnly,
  adminAccess,
};
