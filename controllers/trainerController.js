const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all trainers with filtering and pagination
 * @route   GET /api/trainers
 * @access  Private (SuperAdmin, Admin)
 */
const getAllTrainers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    trainerStatus,
    assignedBranch,
    specialization,
    search,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  // Build query
  const query = {};

  if (trainerStatus) query.trainerStatus = trainerStatus;
  if (assignedBranch) query.assignedBranch = assignedBranch;
  if (specialization) query.specialization = { $in: [specialization] };

  // Search by name, email, or phone
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build sort object
  const sortOrder = order === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // Execute query
  const trainers = await Trainer.find(query)
    .populate('assignedBranch', 'branchName branchCode address city')
    .populate('assignedMembers.memberId', 'fullName email phone')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-password');

  // Get total count
  const total = await Trainer.countDocuments(query);

  // Calculate statistics
  const stats = {
    totalTrainers: total,
    activeTrainers: await Trainer.countDocuments({ ...query, trainerStatus: 'active' }),
    inactiveTrainers: await Trainer.countDocuments({ ...query, trainerStatus: 'inactive' }),
    onLeaveTrainers: await Trainer.countDocuments({ ...query, trainerStatus: 'on-leave' }),
  };

  ApiResponse.success(res, {
    trainers,
    stats,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalTrainers: total,
      limit: parseInt(limit),
    },
  }, 'Trainers retrieved successfully');
});

/**
 * @desc    Get trainer by ID
 * @route   GET /api/trainers/:id
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const getTrainerById = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id)
    .populate('assignedBranch', 'branchName branchCode address city state zipCode')
    .populate('assignedMembers.memberId', 'fullName email phone membershipStatus')
    .select('-password');

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Get additional statistics
  const activeMembersCount = trainer.assignedMembers.filter(m => m.status === 'active').length;
  const attendanceRate = trainer.attendance.length > 0
    ? ((trainer.attendance.filter(a => a.status === 'present').length / trainer.attendance.length) * 100).toFixed(2)
    : 0;

  ApiResponse.success(res, {
    trainer,
    statistics: {
      activeMembersCount,
      totalMembersAssigned: trainer.assignedMembers.length,
      attendanceRate: `${attendanceRate}%`,
      sessionsCompleted: trainer.sessionsCompleted,
      averageRating: trainer.rating.average.toFixed(2),
      totalRatings: trainer.rating.count,
    },
  }, 'Trainer retrieved successfully');
});

/**
 * @desc    Create new trainer
 * @route   POST /api/trainers
 * @access  Private (SuperAdmin, Admin)
 */
const createTrainer = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    gender,
    specialization,
    certifications,
    experience,
    assignedBranch,
    salary,
    joiningDate,
    profileImage,
    address,
    emergencyContact,
    bio,
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !password || !phone || !gender || !assignedBranch || !salary) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Check if trainer already exists
  const existingTrainer = await Trainer.findOne({ email });
  if (existingTrainer) {
    throw ApiError.conflict('Trainer with this email already exists');
  }

  // Verify branch exists
  const branch = await Branch.findById(assignedBranch);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Create trainer
  const trainer = await Trainer.create({
    fullName,
    email,
    password,
    phone,
    gender,
    specialization: specialization || [],
    certifications: certifications || [],
    experience: experience || 0,
    assignedBranch,
    salary: {
      amount: salary.amount,
      currency: salary.currency || 'INR',
      paymentFrequency: salary.paymentFrequency || 'monthly',
    },
    joiningDate: joiningDate || Date.now(),
    profileImage,
    address,
    emergencyContact,
    bio,
    trainerStatus: 'active',
    isActive: true,
  });

  // Populate trainer
  const populatedTrainer = await Trainer.findById(trainer._id)
    .populate('assignedBranch', 'branchName branchCode')
    .select('-password');

  ApiResponse.created(res, populatedTrainer, 'Trainer created successfully');
});

/**
 * @desc    Update trainer
 * @route   PUT /api/trainers/:id
 * @access  Private (SuperAdmin, Admin)
 */
const updateTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const {
    fullName,
    email,
    phone,
    gender,
    specialization,
    certifications,
    experience,
    assignedBranch,
    salary,
    trainerStatus,
    profileImage,
    address,
    emergencyContact,
    bio,
    isActive,
  } = req.body;

  // Check if email is being changed and if it's already taken
  if (email && email !== trainer.email) {
    const existingTrainer = await Trainer.findOne({ email });
    if (existingTrainer) {
      throw ApiError.conflict('Email is already in use');
    }
  }

  // Verify branch if being changed
  if (assignedBranch && assignedBranch !== trainer.assignedBranch.toString()) {
    const branch = await Branch.findById(assignedBranch);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
  }

  // Update fields
  if (fullName) trainer.fullName = fullName;
  if (email) trainer.email = email;
  if (phone) trainer.phone = phone;
  if (gender) trainer.gender = gender;
  if (specialization) trainer.specialization = specialization;
  if (certifications) trainer.certifications = certifications;
  if (experience !== undefined) trainer.experience = experience;
  if (assignedBranch) trainer.assignedBranch = assignedBranch;
  if (salary) {
    trainer.salary.amount = salary.amount || trainer.salary.amount;
    trainer.salary.currency = salary.currency || trainer.salary.currency;
    trainer.salary.paymentFrequency = salary.paymentFrequency || trainer.salary.paymentFrequency;
  }
  if (trainerStatus) trainer.trainerStatus = trainerStatus;
  if (profileImage !== undefined) trainer.profileImage = profileImage;
  if (address) trainer.address = { ...trainer.address, ...address };
  if (emergencyContact) trainer.emergencyContact = { ...trainer.emergencyContact, ...emergencyContact };
  if (bio !== undefined) trainer.bio = bio;
  if (isActive !== undefined) trainer.isActive = isActive;

  await trainer.save();

  // Populate trainer
  const updatedTrainer = await Trainer.findById(trainer._id)
    .populate('assignedBranch', 'branchName branchCode')
    .populate('assignedMembers.memberId', 'fullName email')
    .select('-password');

  ApiResponse.success(res, updatedTrainer, 'Trainer updated successfully');
});

/**
 * @desc    Delete trainer
 * @route   DELETE /api/trainers/:id
 * @access  Private (SuperAdmin)
 */
const deleteTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Check if trainer has active members assigned
  const activeMembersCount = trainer.assignedMembers.filter(m => m.status === 'active').length;
  if (activeMembersCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete trainer with ${activeMembersCount} active members. Please reassign members first.`
    );
  }

  await trainer.deleteOne();

  ApiResponse.success(res, null, 'Trainer deleted successfully');
});

/**
 * @desc    Assign member to trainer
 * @route   POST /api/trainers/:id/assign-member
 * @access  Private (SuperAdmin, Admin)
 */
const assignMemberToTrainer = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  if (!memberId) {
    throw ApiError.badRequest('Please provide member ID');
  }

  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Check if trainer is active
  if (trainer.trainerStatus !== 'active') {
    throw ApiError.badRequest('Cannot assign members to inactive trainer');
  }

  await trainer.assignMember(memberId);

  // Update member's assignedTrainer field
  member.assignedTrainer = trainer._id;
  await member.save();

  const updatedTrainer = await Trainer.findById(trainer._id)
    .populate('assignedMembers.memberId', 'fullName email phone')
    .select('-password');

  ApiResponse.success(res, updatedTrainer, 'Member assigned to trainer successfully');
});

/**
 * @desc    Unassign member from trainer
 * @route   POST /api/trainers/:id/unassign-member
 * @access  Private (SuperAdmin, Admin)
 */
const unassignMemberFromTrainer = asyncHandler(async (req, res) => {
  const { memberId } = req.body;

  if (!memberId) {
    throw ApiError.badRequest('Please provide member ID');
  }

  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  await trainer.unassignMember(memberId);

  // Update member's assignedTrainer field
  const member = await User.findById(memberId);
  if (member) {
    member.assignedTrainer = null;
    await member.save();
  }

  const updatedTrainer = await Trainer.findById(trainer._id)
    .populate('assignedMembers.memberId', 'fullName email phone')
    .select('-password');

  ApiResponse.success(res, updatedTrainer, 'Member unassigned from trainer successfully');
});

/**
 * @desc    Add attendance for trainer
 * @route   POST /api/trainers/:id/attendance
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const addTrainerAttendance = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, status, notes } = req.body;

  if (!checkIn) {
    throw ApiError.badRequest('Please provide check-in time');
  }

  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  await trainer.addAttendance(
    new Date(checkIn),
    checkOut ? new Date(checkOut) : null,
    status || 'present',
    notes || ''
  );

  ApiResponse.success(res, {
    trainerId: trainer._id,
    fullName: trainer.fullName,
    attendance: trainer.attendance[trainer.attendance.length - 1],
  }, 'Attendance added successfully');
});

/**
 * @desc    Get trainer attendance
 * @route   GET /api/trainers/:id/attendance
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const getTrainerAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;

  const trainer = await Trainer.findById(req.params.id).select('fullName email attendance');
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  let attendance = trainer.attendance;

  // Filter by date range
  if (startDate || endDate) {
    attendance = attendance.filter(record => {
      const recordDate = new Date(record.date);
      if (startDate && recordDate < new Date(startDate)) return false;
      if (endDate && recordDate > new Date(endDate)) return false;
      return true;
    });
  }

  // Filter by status
  if (status) {
    attendance = attendance.filter(record => record.status === status);
  }

  // Calculate statistics
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const absentDays = attendance.filter(a => a.status === 'absent').length;
  const lateDays = attendance.filter(a => a.status === 'late').length;
  const leaveDays = attendance.filter(a => a.status === 'leave').length;
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;

  ApiResponse.success(res, {
    trainer: {
      id: trainer._id,
      fullName: trainer.fullName,
      email: trainer.email,
    },
    attendance: attendance.sort((a, b) => new Date(b.date) - new Date(a.date)),
    statistics: {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      attendanceRate: `${attendanceRate}%`,
    },
  }, 'Trainer attendance retrieved successfully');
});

/**
 * @desc    Update trainer availability
 * @route   PUT /api/trainers/:id/availability
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const updateTrainerAvailability = asyncHandler(async (req, res) => {
  const { day, isAvailable, slots } = req.body;

  if (!day) {
    throw ApiError.badRequest('Please provide day of week');
  }

  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  if (!validDays.includes(day.toLowerCase())) {
    throw ApiError.badRequest('Invalid day of week');
  }

  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  await trainer.updateAvailability(day.toLowerCase(), isAvailable, slots || []);

  ApiResponse.success(res, {
    trainerId: trainer._id,
    fullName: trainer.fullName,
    availability: trainer.availability,
  }, 'Trainer availability updated successfully');
});

/**
 * @desc    Get trainer availability
 * @route   GET /api/trainers/:id/availability
 * @access  Private (SuperAdmin, Admin, Trainer, Member)
 */
const getTrainerAvailability = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id).select('fullName email availability');
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  ApiResponse.success(res, {
    trainer: {
      id: trainer._id,
      fullName: trainer.fullName,
      email: trainer.email,
    },
    availability: trainer.availability,
  }, 'Trainer availability retrieved successfully');
});

/**
 * @desc    Get trainers by branch
 * @route   GET /api/trainers/branch/:branchId
 * @access  Private (SuperAdmin, Admin)
 */
const getTrainersByBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.params;

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  const trainers = await Trainer.getByBranch(branchId);

  ApiResponse.success(res, {
    branch: {
      id: branch._id,
      branchName: branch.branchName,
      branchCode: branch.branchCode,
    },
    trainers,
    totalTrainers: trainers.length,
  }, 'Branch trainers retrieved successfully');
});

/**
 * @desc    Add certification to trainer
 * @route   POST /api/trainers/:id/certifications
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const addCertification = asyncHandler(async (req, res) => {
  const { name, issuingOrganization, issueDate, expiryDate, certificateNumber } = req.body;

  if (!name) {
    throw ApiError.badRequest('Please provide certification name');
  }

  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  await trainer.addCertification({
    name,
    issuingOrganization,
    issueDate: issueDate ? new Date(issueDate) : undefined,
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    certificateNumber,
    isVerified: false,
  });

  ApiResponse.success(res, {
    trainerId: trainer._id,
    fullName: trainer.fullName,
    certifications: trainer.certifications,
  }, 'Certification added successfully');
});

/**
 * @desc    Get trainer statistics
 * @route   GET /api/trainers/:id/stats
 * @access  Private (SuperAdmin, Admin, Trainer)
 */
const getTrainerStats = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id)
    .populate('assignedMembers.memberId', 'fullName membershipStatus');

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  const activeMembersCount = trainer.assignedMembers.filter(m => m.status === 'active').length;
  const totalMembersAssigned = trainer.assignedMembers.length;
  const attendanceRate = trainer.attendance.length > 0
    ? ((trainer.attendance.filter(a => a.status === 'present').length / trainer.attendance.length) * 100).toFixed(2)
    : 0;

  ApiResponse.success(res, {
    trainer: {
      id: trainer._id,
      fullName: trainer.fullName,
      email: trainer.email,
      trainerStatus: trainer.trainerStatus,
    },
    statistics: {
      activeMembersCount,
      totalMembersAssigned,
      attendanceRate: `${attendanceRate}%`,
      sessionsCompleted: trainer.sessionsCompleted,
      averageRating: trainer.rating.average.toFixed(2),
      totalRatings: trainer.rating.count,
      experienceYears: trainer.experience,
      certificationsCount: trainer.certifications.length,
      totalAttendanceRecords: trainer.attendance.length,
    },
  }, 'Trainer statistics retrieved successfully');
});

module.exports = {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  assignMemberToTrainer,
  unassignMemberFromTrainer,
  addTrainerAttendance,
  getTrainerAttendance,
  updateTrainerAvailability,
  getTrainerAvailability,
  getTrainersByBranch,
  addCertification,
  getTrainerStats,
};
