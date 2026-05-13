const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

/**
 * @desc    Admin login
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw ApiError.badRequest('Please provide email and password');
  }

  // Find admin by email (including password and refreshToken fields)
  const admin = await Admin.findByEmail(email);

  // Check if admin exists
  if (!admin) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check if account is locked
  if (admin.isLocked()) {
    const lockTimeRemaining = Math.ceil((admin.lockUntil - Date.now()) / 60000);
    throw ApiError.forbidden(
      `Account is locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`
    );
  }

  // Check if admin is active
  if (!admin.isActive) {
    throw ApiError.forbidden('Account is deactivated. Please contact support.');
  }

  // Verify password
  const isPasswordMatch = await admin.comparePassword(password);

  if (!isPasswordMatch) {
    // Increment login attempts
    await admin.incLoginAttempts();
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Reset login attempts on successful login
  if (admin.loginAttempts > 0) {
    await admin.resetLoginAttempts();
  }

  // Update last login info
  admin.lastLogin = new Date();
  admin.lastLoginIp = req.ip || req.connection.remoteAddress;

  // Generate tokens
  const accessToken = generateAccessToken(admin._id, admin.role);
  const refreshToken = generateRefreshToken(admin._id);

  // Save refresh token to database
  admin.refreshToken = refreshToken;
  await admin.save();

  // Get public profile
  const profile = admin.getPublicProfile();

  // Send response
  ApiResponse.success(
    res,
    {
      admin: profile,
      token: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    },
    'Login successful',
    200
  );
});

/**
 * @desc    Admin logout
 * @route   POST /api/admin/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  const admin = await Admin.findById(req.user.id).select('+refreshToken');
  
  if (admin) {
    admin.refreshToken = null;
    await admin.save();
  }

  ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Verify admin token
 * @route   GET /api/admin/auth/verify
 * @access  Private
 */
const verifyToken = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware
  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }

  if (!admin.isActive) {
    throw ApiError.forbidden('Account is deactivated');
  }

  ApiResponse.success(
    res,
    {
      admin: admin.getPublicProfile(),
      valid: true,
    },
    'Token is valid'
  );
});

/**
 * @desc    Get current logged in admin
 * @route   GET /api/admin/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }

  ApiResponse.success(
    res,
    { admin: admin.getPublicProfile() },
    'Admin profile retrieved successfully'
  );
});

/**
 * @desc    Change admin password
 * @route   PUT /api/admin/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw ApiError.badRequest('Please provide current password, new password, and confirm password');
  }

  // Check if new password and confirm password match
  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('New password and confirm password do not match');
  }

  // Validate new password length
  if (newPassword.length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(newPassword)) {
    throw ApiError.badRequest(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );
  }

  // Check if new password is same as current password
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from current password');
  }

  // Get admin with password
  const admin = await Admin.findById(req.user.id).select('+password +refreshToken');

  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }

  // Verify current password
  const isMatch = await admin.comparePassword(currentPassword);

  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  // Update password
  admin.password = newPassword;
  admin.refreshToken = null; // Invalidate refresh token
  await admin.save();

  // Generate new tokens
  const accessToken = generateAccessToken(admin._id, admin.role);
  const refreshToken = generateRefreshToken(admin._id);

  // Save new refresh token
  admin.refreshToken = refreshToken;
  await admin.save();

  ApiResponse.success(
    res,
    {
      token: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600,
    },
    'Password changed successfully. Please use new credentials for future logins.'
  );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/admin/auth/refresh-token
 * @access  Public
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

    // Find admin with refresh token
    const admin = await Admin.findById(decoded.id).select('+refreshToken');

    if (!admin) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Verify refresh token matches the one in database
    if (admin.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(admin._id, admin.role);

    // Optionally generate new refresh token (rotation)
    const newRefreshToken = generateRefreshToken(admin._id);
    admin.refreshToken = newRefreshToken;
    await admin.save();

    ApiResponse.success(
      res,
      {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
    throw error;
  }
});

/**
 * @desc    Update admin profile
 * @route   PUT /api/admin/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar, department } = req.body;

  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }

  // Update fields
  if (name) admin.name = name;
  if (phone) admin.phone = phone;
  if (avatar) admin.avatar = avatar;
  if (department) admin.department = department;

  await admin.save();

  ApiResponse.success(
    res,
    { admin: admin.getPublicProfile() },
    'Profile updated successfully'
  );
});

/**
 * @desc    Get admin permissions
 * @route   GET /api/admin/auth/permissions
 * @access  Private
 */
const getPermissions = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user.id);

  if (!admin) {
    throw ApiError.notFound('Admin not found');
  }

  ApiResponse.success(
    res,
    {
      permissions: admin.permissions,
      role: admin.role,
    },
    'Permissions retrieved successfully'
  );
});

module.exports = {
  login,
  logout,
  verifyToken,
  getMe,
  changePassword,
  refreshAccessToken,
  updateProfile,
  getPermissions,
};
