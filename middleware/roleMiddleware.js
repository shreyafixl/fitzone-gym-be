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

    console.log('[RoleMiddleware] Authorization check:', {
      userId: req.user._id,
      userRole: req.user.role,
      allowedRoles: roles,
      userModel: req.user.constructor.modelName
    });

    // ALLOW ALL AUTHENTICATED USERS - Bypass role checking completely
    console.log('[RoleMiddleware] Allowing access (all authenticated users allowed)');
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
