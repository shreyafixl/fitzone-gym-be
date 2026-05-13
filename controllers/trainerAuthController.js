const Trainer = require('../models/Trainer');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * @desc    Trainer login
 * @route   POST /api/trainer/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw ApiError.badRequest('Please provide email and password');
  }

  // Find trainer by email (including password field)
  const trainer = await Trainer.findByEmail(email);

  // Check if trainer exists
  if (!trainer) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check if trainer is active
  if (!trainer.isActive) {
    throw ApiError.forbidden('Account is deactivated. Please contact support.');
  }

  // Check trainer status
  if (trainer.trainerStatus === 'inactive') {
    throw ApiError.forbidden('Your trainer account is inactive. Please contact admin.');
  }

  // Verify password
  const isPasswordMatch = await trainer.comparePassword(password);

  if (!isPasswordMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login
  trainer.lastLogin = new Date();
  await trainer.save();

  // Generate tokens
  const accessToken = generateAccessToken(trainer._id, 'trainer');
  const refreshToken = generateRefreshToken(trainer._id);

  // Get public profile
  const profile = trainer.getPublicProfile();

  // Send response
  ApiResponse.success(
    res,
    {
      trainer: profile,
      token: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    },
    'Login successful',
    200
  );
});

/**
 * @desc    Trainer logout
 * @route   POST /api/trainer/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // But we can add token to blacklist if needed in future
  
  ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Verify trainer token
 * @route   GET /api/trainer/auth/verify
 * @access  Private
 */
const verifyToken = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware
  const trainer = await Trainer.findById(req.user.id);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  if (!trainer.isActive) {
    throw ApiError.forbidden('Account is deactivated');
  }

  ApiResponse.success(
    res,
    {
      trainer: trainer.getPublicProfile(),
      valid: true,
    },
    'Token is valid'
  );
});

/**
 * @desc    Get current logged in trainer
 * @route   GET /api/trainer/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.user.id)
    .populate('assignedBranch', 'branchName branchCode address phone email')
    .populate('assignedMembers.memberId', 'fullName email phone membershipStatus');

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  ApiResponse.success(
    res,
    { trainer: trainer.getPublicProfile() },
    'Trainer profile retrieved successfully'
  );
});

/**
 * @desc    Change trainer password
 * @route   PUT /api/trainer/auth/change-password
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

  // Get trainer with password
  const trainer = await Trainer.findById(req.user.id).select('+password');

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Verify current password
  const isMatch = await trainer.comparePassword(currentPassword);

  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  // Update password
  trainer.password = newPassword;
  await trainer.save();

  // Generate new tokens
  const accessToken = generateAccessToken(trainer._id, 'trainer');
  const refreshToken = generateRefreshToken(trainer._id);

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
 * @desc    Forgot password - Send reset token
 * @route   POST /api/trainer/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw ApiError.badRequest('Please provide email address');
  }

  // Find trainer by email
  const trainer = await Trainer.findOne({ email });

  if (!trainer) {
    // Don't reveal if email exists or not for security
    ApiResponse.success(
      res,
      null,
      'If an account with that email exists, a password reset link has been sent.'
    );
    return;
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Save hashed token and expiry to trainer (add these fields to model if needed)
  // For now, we'll use a simple approach with JWT
  const resetTokenJWT = jwt.sign(
    { id: trainer._id, purpose: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // In production, send email with reset link
  // For now, return token in response (ONLY FOR DEVELOPMENT)
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/trainer/reset-password/${resetTokenJWT}`;

  // TODO: Send email with resetUrl
  // await sendEmail({
  //   to: trainer.email,
  //   subject: 'Password Reset Request',
  //   text: `You requested a password reset. Click this link: ${resetUrl}`,
  // });

  ApiResponse.success(
    res,
    {
      message: 'Password reset link sent to email',
      // Remove resetToken from response in production
      resetToken: resetTokenJWT,
      resetUrl: resetUrl,
    },
    'If an account with that email exists, a password reset link has been sent.'
  );
});

/**
 * @desc    Reset password with token
 * @route   POST /api/trainer/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    throw ApiError.badRequest('Please provide reset token, new password, and confirm password');
  }

  // Check if passwords match
  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('Passwords do not match');
  }

  // Validate new password length
  if (newPassword.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(newPassword)) {
    throw ApiError.badRequest(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    if (decoded.purpose !== 'password-reset') {
      throw ApiError.badRequest('Invalid reset token');
    }

    // Find trainer
    const trainer = await Trainer.findById(decoded.id).select('+password');

    if (!trainer) {
      throw ApiError.notFound('Trainer not found');
    }

    if (!trainer.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Update password
    trainer.password = newPassword;
    await trainer.save();

    ApiResponse.success(
      res,
      null,
      'Password reset successful. You can now login with your new password.'
    );
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw ApiError.badRequest('Invalid or expired reset token');
    }
    throw error;
  }
});

/**
 * @desc    Refresh access token
 * @route   POST /api/trainer/auth/refresh-token
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

    // Find trainer
    const trainer = await Trainer.findById(decoded.id);

    if (!trainer) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Check if trainer is active
    if (!trainer.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(trainer._id, 'trainer');

    // Optionally generate new refresh token (rotation)
    const newRefreshToken = generateRefreshToken(trainer._id);

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
 * @desc    Update trainer profile
 * @route   PUT /api/trainer/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const {
    fullName,
    phone,
    gender,
    bio,
    profileImage,
    address,
    emergencyContact,
  } = req.body;

  const trainer = await Trainer.findById(req.user.id);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Update fields
  if (fullName) trainer.fullName = fullName;
  if (phone) trainer.phone = phone;
  if (gender) trainer.gender = gender;
  if (bio) trainer.bio = bio;
  if (profileImage) trainer.profileImage = profileImage;
  if (address) trainer.address = { ...trainer.address, ...address };
  if (emergencyContact) trainer.emergencyContact = { ...trainer.emergencyContact, ...emergencyContact };

  await trainer.save();

  ApiResponse.success(
    res,
    { trainer: trainer.getPublicProfile() },
    'Profile updated successfully'
  );
});

/**
 * @desc    Get trainer statistics
 * @route   GET /api/trainer/auth/stats
 * @access  Private
 */
const getStats = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.user.id)
    .populate('assignedMembers.memberId', 'fullName membershipStatus');

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const stats = {
    totalMembers: trainer.assignedMembers.length,
    activeMembers: trainer.assignedMembers.filter(m => m.status === 'active').length,
    sessionsCompleted: trainer.sessionsCompleted,
    rating: trainer.rating,
    experience: trainer.experience,
    specializations: trainer.specialization.length,
    certifications: trainer.certifications.length,
    attendanceRecords: trainer.attendance.length,
  };

  ApiResponse.success(
    res,
    { stats },
    'Trainer statistics retrieved successfully'
  );
});

module.exports = {
  login,
  logout,
  verifyToken,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  updateProfile,
  getStats,
};
