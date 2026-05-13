const SuperAdmin = require('../models/SuperAdmin');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

/**
 * @desc    SuperAdmin login
 * @route   POST /api/superadmin/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw ApiError.badRequest('Please provide email and password');
  }

  // Find superadmin by email (including password and refreshToken fields)
  const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');

  // Check if superadmin exists
  if (!superAdmin) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check if account is locked
  if (superAdmin.isLocked && superAdmin.isLocked()) {
    const lockTimeRemaining = Math.ceil((superAdmin.lockUntil - Date.now()) / 60000);
    throw ApiError.forbidden(
      `Account is locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`
    );
  }

  // Check if superadmin is active
  if (superAdmin.isActive === false) {
    throw ApiError.forbidden('Account is deactivated. Please contact support.');
  }

  // Verify password
  const isPasswordMatch = await superAdmin.comparePassword(password);

  if (!isPasswordMatch) {
    // Increment login attempts if method exists
    if (superAdmin.incLoginAttempts) {
      await superAdmin.incLoginAttempts();
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Reset login attempts on successful login
  if (superAdmin.loginAttempts > 0 && superAdmin.resetLoginAttempts) {
    await superAdmin.resetLoginAttempts();
  }

  // Update last login info
  superAdmin.lastLogin = new Date();
  superAdmin.lastLoginIp = req.ip || req.connection.remoteAddress;

  // Generate tokens
  const accessToken = generateAccessToken(superAdmin._id, superAdmin.role);
  const refreshToken = generateRefreshToken(superAdmin._id);

  // Save refresh token to database
  superAdmin.refreshToken = refreshToken;
  await superAdmin.save();

  // Get public profile
  const profile = superAdmin.toObject();
  delete profile.password;
  delete profile.refreshToken;

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
 * @desc    SuperAdmin logout
 * @route   POST /api/superadmin/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  const superAdmin = await SuperAdmin.findById(req.user.id).select('+refreshToken');
  
  if (superAdmin) {
    superAdmin.refreshToken = null;
    await superAdmin.save();
  }

  ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Verify superadmin token
 * @route   GET /api/superadmin/auth/verify
 * @access  Private
 */
const verifyToken = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware
  const superAdmin = await SuperAdmin.findById(req.user.id);

  if (!superAdmin) {
    throw ApiError.notFound('SuperAdmin not found');
  }

  if (superAdmin.isActive === false) {
    throw ApiError.forbidden('Account is deactivated');
  }

  const profile = superAdmin.toObject();
  delete profile.password;
  delete profile.refreshToken;

  ApiResponse.success(
    res,
    {
      admin: profile,
      valid: true,
    },
    'Token is valid'
  );
});

/**
 * @desc    Get current logged in superadmin
 * @route   GET /api/superadmin/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const superAdmin = await SuperAdmin.findById(req.user.id);

  if (!superAdmin) {
    throw ApiError.notFound('SuperAdmin not found');
  }

  const profile = superAdmin.toObject();
  delete profile.password;
  delete profile.refreshToken;

  ApiResponse.success(
    res,
    { admin: profile },
    'SuperAdmin profile retrieved successfully'
  );
});

/**
 * @desc    Change superadmin password
 * @route   PUT /api/superadmin/auth/change-password
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

  // Check if new password is same as current password
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from current password');
  }

  // Get superadmin with password
  const superAdmin = await SuperAdmin.findById(req.user.id).select('+password +refreshToken');

  if (!superAdmin) {
    throw ApiError.notFound('SuperAdmin not found');
  }

  // Verify current password
  const isMatch = await superAdmin.comparePassword(currentPassword);

  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  // Update password
  superAdmin.password = newPassword;
  superAdmin.refreshToken = null; // Invalidate refresh token
  await superAdmin.save();

  // Generate new tokens
  const accessToken = generateAccessToken(superAdmin._id, superAdmin.role);
  const refreshToken = generateRefreshToken(superAdmin._id);

  // Save new refresh token
  superAdmin.refreshToken = refreshToken;
  await superAdmin.save();

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
 * @route   POST /api/superadmin/auth/refresh-token
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

    // Find superadmin with refresh token
    const superAdmin = await SuperAdmin.findById(decoded.id).select('+refreshToken');

    if (!superAdmin) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Check if superadmin is active
    if (superAdmin.isActive === false) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Verify refresh token matches the one in database
    if (superAdmin.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(superAdmin._id, superAdmin.role);

    // Optionally generate new refresh token (rotation)
    const newRefreshToken = generateRefreshToken(superAdmin._id);
    superAdmin.refreshToken = newRefreshToken;
    await superAdmin.save();

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
 * @desc    Update superadmin profile
 * @route   PUT /api/superadmin/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar, company } = req.body;

  const superAdmin = await SuperAdmin.findById(req.user.id);

  if (!superAdmin) {
    throw ApiError.notFound('SuperAdmin not found');
  }

  // Update fields
  if (name) superAdmin.name = name;
  if (phone) superAdmin.phone = phone;
  if (avatar) superAdmin.avatar = avatar;
  if (company) superAdmin.company = company;

  await superAdmin.save();

  const profile = superAdmin.toObject();
  delete profile.password;
  delete profile.refreshToken;

  ApiResponse.success(
    res,
    { admin: profile },
    'Profile updated successfully'
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
};
