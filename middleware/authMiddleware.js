const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication Middleware
 * Protects routes by verifying JWT token
 * Attaches authenticated user to req.user
 * Works for SuperAdmin, Admin, and regular Users
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from "Bearer <token>"
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw ApiError.unauthorized('Not authorized, no token provided');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth Middleware] Token decoded:', { id: decoded.id, role: decoded.role, iat: decoded.iat });

    // Try to find user in SuperAdmin collection first
    let user = await SuperAdmin.findById(decoded.id).select('-password');
    console.log('[Auth Middleware] SuperAdmin lookup:', !!user, user ? { role: user.role } : {});

    // If not found in SuperAdmin, try Admin collection
    if (!user) {
      user = await Admin.findById(decoded.id).select('-password');
      console.log('[Auth Middleware] Admin lookup:', !!user, user ? { role: user.role } : {});
    }

    // If not found in Admin, try User collection
    if (!user) {
      user = await User.findById(decoded.id).select('-password');
      console.log('[Auth Middleware] User lookup:', !!user, user ? { role: user.role } : {});
    }

    // Check if user exists
    if (!user) {
      console.error('[Auth Middleware] User not found for ID:', decoded.id);
      throw ApiError.unauthorized('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Ensure role is set from token if not in user document
    if (!user.role && decoded.role) {
      user.role = decoded.role;
      console.log('[Auth Middleware] Role set from token:', decoded.role);
    }

    console.log('[Auth Middleware] Final user object:', { id: user._id, role: user.role, model: user.constructor.modelName });

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw error;
  }
});

module.exports = { protect };
