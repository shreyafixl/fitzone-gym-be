const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

/**
 * @desc    Member signup
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, gender, age } = req.body;

  // Validate required fields
  if (!fullName || !fullName.trim()) {
    throw ApiError.badRequest('Full name is required');
  }

  if (!email || !email.trim()) {
    throw ApiError.badRequest('Email is required');
  }

  if (!password) {
    throw ApiError.badRequest('Password is required');
  }

  if (!phone || !phone.trim()) {
    throw ApiError.badRequest('Phone number is required');
  }

  if (!gender) {
    throw ApiError.badRequest('Gender is required');
  }

  if (!age) {
    throw ApiError.badRequest('Age is required');
  }

  // Validate password length
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  // Validate phone format (10 digits)
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw ApiError.badRequest('Phone number must be exactly 10 digits');
  }

  // Validate age
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
    throw ApiError.badRequest('Age must be between 13 and 120');
  }

  // Validate gender
  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(gender.toLowerCase())) {
    throw ApiError.badRequest('Gender must be male, female, or other');
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }

  // Create new user
  const user = new User({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone.trim(),
    gender: gender.toLowerCase(),
    age: ageNum,
    role: 'member',
    membershipStatus: 'pending',
  });

  // Save user (password will be hashed by pre-save middleware)
  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const profile = user.getPublicProfile();

  ApiResponse.success(
    res,
    {
      user: profile,
      token: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600,
    },
    'Account created successfully',
    201
  );
});

/**
 * @desc    Member login
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.role !== 'member') {
    throw ApiError.forbidden('This login is for members only');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account is deactivated. Please contact support.');
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const profile = user.getPublicProfile();

  ApiResponse.success(
    res,
    {
      user: profile,
      token: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600,
    },
    'Login successful',
    200
  );
});

/**
 * @desc    Get current member profile
 * @route   GET /api/member/auth/me
 * @access  Private (Member only)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('assignedTrainer', 'fullName email phone');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  ApiResponse.success(
    res,
    { user: user.getPublicProfile() },
    'Profile retrieved successfully'
  );
});

/**
 * @desc    Update member profile
 * @route   PUT /api/member/auth/profile
 * @access  Private (Member only)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, gender, age, height, weight, fitnessGoal, address, emergencyContact } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (fullName) user.fullName = fullName;
  if (phone) user.phone = phone;
  if (gender) user.gender = gender;
  if (age) user.age = age;
  if (height !== undefined) user.height = height;
  if (weight !== undefined) user.weight = weight;
  if (fitnessGoal) user.fitnessGoal = fitnessGoal;
  if (address !== undefined) user.address = address;
  if (emergencyContact) {
    user.emergencyContact = {
      ...user.emergencyContact,
      ...emergencyContact,
    };
  }

  await user.save();

  ApiResponse.success(
    res,
    { user: user.getPublicProfile() },
    'Profile updated successfully'
  );
});

/**
 * @desc    Change member password
 * @route   PUT /api/member/auth/password
 * @access  Private (Member only)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Please provide current and new password');
  }

  if (newPassword.length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }

  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  ApiResponse.success(
    res,
    null,
    'Password changed successfully'
  );
});

/**
 * @desc    Member logout
 * @route   POST /api/member/auth/logout
 * @access  Private (Member only)
 */
const logout = asyncHandler(async (req, res) => {
  ApiResponse.success(
    res,
    null,
    'Logged out successfully'
  );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/member/auth/refresh
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token is required');
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (user.role !== 'member') {
      throw ApiError.forbidden('This token is not valid for member access');
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    ApiResponse.success(
      res,
      {
        token: newAccessToken,
        expiresIn: 3600,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
});

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
};
