const mongoose = require('mongoose');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all trainers with filtering
 * @route   GET /api/admin/trainers
 * @access  Private (Admin)
 */
const getAllTrainers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    branchId,
    trainerStatus,
    specialization,
    search,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (branchId) {
    query.assignedBranch = branchId;
  }

  if (trainerStatus) {
    query.trainerStatus = trainerStatus;
  }

  if (specialization) {
    query.specialization = specialization;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const trainers = await Trainer.find(query)
    .populate('assignedBranch', 'branchName branchCode city')
    .populate('assignedMembers.memberId', 'fullName email phone membershipStatus')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Add calculated fields
  const trainersWithDetails = trainers.map(trainer => ({
    ...trainer,
    activeMembersCount: trainer.assignedMembers 
      ? trainer.assignedMembers.filter(m => m.status === 'active').length 
      : 0
  }));

  // Get total count
  const totalTrainers = await Trainer.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalTrainers / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      trainers: trainersWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTrainers,
        limit: limitNum,
        hasMore
      }
    },
    'Trainers retrieved successfully'
  );
});

/**
 * @desc    Create trainer
 * @route   POST /api/admin/trainers
 * @access  Private (Admin)
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
    address,
    emergencyContact,
    bio,
    profileImage
  } = req.body;

  // Validate required fields
  if (!fullName || !email || !password || !phone || !gender || !salary) {
    throw ApiError.badRequest('Please provide all required fields: fullName, email, password, phone, gender, salary');
  }

  // Check if trainer already exists
  const existingTrainer = await Trainer.findOne({ email });
  if (existingTrainer) {
    throw ApiError.conflict('Trainer with this email already exists');
  }

  // Check if phone already exists
  const existingPhone = await Trainer.findOne({ phone });
  if (existingPhone) {
    throw ApiError.conflict('Trainer with this phone number already exists');
  }

  // Verify branch exists if provided
  let validBranchId = assignedBranch;
  if (assignedBranch) {
    const branch = await Branch.findById(assignedBranch);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
  } else {
    // Get the first branch as default if not provided
    const defaultBranch = await Branch.findOne();
    if (defaultBranch) {
      validBranchId = defaultBranch._id;
    } else {
      throw ApiError.badRequest('No branches available. Please create a branch first.');
    }
  }

  // Validate password strength
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  // Validate salary
  if (!salary.amount || salary.amount < 0) {
    throw ApiError.badRequest('Please provide a valid salary amount');
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
    assignedBranch: validBranchId,
    salary: {
      amount: salary.amount,
      currency: salary.currency || 'INR',
      paymentFrequency: salary.paymentFrequency || 'monthly'
    },
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    address,
    emergencyContact,
    bio,
    profileImage
  });

  // Get created trainer without password
  const createdTrainer = await Trainer.findById(trainer._id)
    .select('-password')
    .populate('assignedBranch', 'branchName branchCode');

  ApiResponse.success(
    res,
    { trainer: createdTrainer },
    'Trainer created successfully',
    201
  );
});

/**
 * @desc    Update trainer
 * @route   PUT /api/admin/trainers/:id
 * @access  Private (Admin)
 */
const updateTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find trainer
  const trainer = await Trainer.findById(id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Don't allow updating password through this endpoint
  if (updateData.password) {
    throw ApiError.badRequest('Use change password endpoint to update password');
  }

  // Don't allow updating email if it's already taken by another trainer
  if (updateData.email && updateData.email !== trainer.email) {
    const existingTrainer = await Trainer.findOne({ email: updateData.email });
    if (existingTrainer) {
      throw ApiError.conflict('Email is already in use');
    }
  }

  // Don't allow updating phone if it's already taken by another trainer
  if (updateData.phone && updateData.phone !== trainer.phone) {
    const existingPhone = await Trainer.findOne({ phone: updateData.phone });
    if (existingPhone) {
      throw ApiError.conflict('Phone number is already in use');
    }
  }

  // Verify branch if being updated
  if (updateData.assignedBranch) {
    const branch = await Branch.findById(updateData.assignedBranch);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
  }

  // Update trainer
  const updatedTrainer = await Trainer.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('assignedBranch', 'branchName branchCode')
    .populate('assignedMembers.memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    { trainer: updatedTrainer },
    'Trainer updated successfully'
  );
});

/**
 * @desc    Delete trainer
 * @route   DELETE /api/admin/trainers/:id
 * @access  Private (Admin)
 */
const deleteTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find trainer
  const trainer = await Trainer.findById(id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Check if trainer has active members
  const activeMembers = trainer.assignedMembers.filter(m => m.status === 'active');
  if (activeMembers.length > 0) {
    throw ApiError.badRequest(
      `Cannot delete trainer with ${activeMembers.length} active members. Please reassign members first.`
    );
  }

  // Soft delete - set isActive to false
  trainer.isActive = false;
  trainer.trainerStatus = 'inactive';
  await trainer.save();

  // Or hard delete - uncomment below
  // await Trainer.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { trainerId: id },
    'Trainer deleted successfully'
  );
});

/**
 * @desc    Assign members to trainer
 * @route   POST /api/admin/trainers/:id/assign-members
 * @access  Private (Admin)
 */
const assignMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberIds } = req.body;

  // Validate required fields
  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    throw ApiError.badRequest('Please provide an array of member IDs');
  }

  // Find trainer
  const trainer = await Trainer.findById(id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Verify all members exist
  const members = await User.find({ _id: { $in: memberIds }, role: 'member' });
  if (members.length !== memberIds.length) {
    throw ApiError.badRequest('One or more member IDs are invalid');
  }

  // Assign members
  const assignedMembers = [];
  const alreadyAssigned = [];

  for (const memberId of memberIds) {
    // Check if member is already assigned
    const existingMember = trainer.assignedMembers.find(
      m => m.memberId.toString() === memberId && m.status === 'active'
    );

    if (existingMember) {
      alreadyAssigned.push(memberId);
    } else {
      trainer.assignedMembers.push({
        memberId,
        assignedDate: new Date(),
        status: 'active'
      });
      assignedMembers.push(memberId);

      // Update user's assignedTrainer field
      await User.findByIdAndUpdate(memberId, { assignedTrainer: id });
    }
  }

  await trainer.save();

  // Populate and return
  const updatedTrainer = await Trainer.findById(id)
    .select('-password')
    .populate('assignedBranch', 'branchName branchCode')
    .populate('assignedMembers.memberId', 'fullName email phone');

  ApiResponse.success(
    res,
    {
      trainer: updatedTrainer,
      assigned: assignedMembers.length,
      alreadyAssigned: alreadyAssigned.length
    },
    `${assignedMembers.length} members assigned successfully. ${alreadyAssigned.length} were already assigned.`
  );
});

/**
 * @desc    Update trainer availability
 * @route   PUT /api/admin/trainers/:id/availability
 * @access  Private (Admin)
 */
const updateAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;

  // Validate required fields
  if (!availability) {
    throw ApiError.badRequest('Please provide availability data');
  }

  // Find trainer
  const trainer = await Trainer.findById(id);
  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Validate availability structure
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day in availability) {
    if (!validDays.includes(day)) {
      throw ApiError.badRequest(`Invalid day: ${day}`);
    }

    // Validate time slots
    if (availability[day].slots) {
      for (const slot of availability[day].slots) {
        if (!slot.startTime || !slot.endTime) {
          throw ApiError.badRequest(`Invalid time slot for ${day}`);
        }
        if (slot.startTime >= slot.endTime) {
          throw ApiError.badRequest(`End time must be after start time for ${day}`);
        }
      }
    }
  }

  // Update availability
  trainer.availability = { ...trainer.availability, ...availability };
  await trainer.save();

  // Return updated trainer
  const updatedTrainer = await Trainer.findById(id)
    .select('-password')
    .populate('assignedBranch', 'branchName branchCode');

  ApiResponse.success(
    res,
    { trainer: updatedTrainer },
    'Trainer availability updated successfully'
  );
});

/**
 * @desc    Get trainer by ID
 * @route   GET /api/admin/trainers/:id
 * @access  Private (Admin)
 */
const getTrainerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const trainer = await Trainer.findById(id)
    .select('-password')
    .populate('assignedBranch', 'branchName branchCode address city')
    .populate('assignedMembers.memberId', 'fullName email phone membershipStatus age gender fitnessGoal')
    .lean();

  if (!trainer) {
    throw ApiError.notFound('Trainer not found');
  }

  // Add calculated fields
  const trainerWithDetails = {
    ...trainer,
    activeMembersCount: trainer.assignedMembers 
      ? trainer.assignedMembers.filter(m => m.status === 'active').length 
      : 0,
    totalCertifications: trainer.certifications ? trainer.certifications.length : 0,
    verifiedCertifications: trainer.certifications 
      ? trainer.certifications.filter(c => c.isVerified).length 
      : 0
  };

  ApiResponse.success(
    res,
    { trainer: trainerWithDetails },
    'Trainer retrieved successfully'
  );
});

/**
 * @desc    Get trainer statistics
 * @route   GET /api/admin/trainers/stats
 * @access  Private (Admin)
 */
const getTrainerStats = asyncHandler(async (req, res) => {
  const { branchId } = req.query;

  // Build match query
  const matchQuery = {};
  if (branchId) {
    matchQuery.assignedBranch = mongoose.Types.ObjectId(branchId);
  }

  // Total trainers
  const totalTrainers = await Trainer.countDocuments(matchQuery);
  const activeTrainers = await Trainer.countDocuments({ ...matchQuery, trainerStatus: 'active' });
  const inactiveTrainers = await Trainer.countDocuments({ ...matchQuery, trainerStatus: 'inactive' });
  const onLeaveTrainers = await Trainer.countDocuments({ ...matchQuery, trainerStatus: 'on-leave' });

  // Trainers by specialization
  const trainersBySpecialization = await Trainer.aggregate([
    { $match: matchQuery },
    { $unwind: '$specialization' },
    {
      $group: {
        _id: '$specialization',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Average experience
  const avgExperienceResult = await Trainer.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        avgExperience: { $avg: '$experience' }
      }
    }
  ]);

  const avgExperience = avgExperienceResult.length > 0 
    ? Math.round(avgExperienceResult[0].avgExperience) 
    : 0;

  // Total assigned members
  const totalAssignedMembers = await Trainer.aggregate([
    { $match: matchQuery },
    { $unwind: '$assignedMembers' },
    { $match: { 'assignedMembers.status': 'active' } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ]);

  const assignedMembersCount = totalAssignedMembers.length > 0 
    ? totalAssignedMembers[0].count 
    : 0;

  // Average members per trainer
  const avgMembersPerTrainer = activeTrainers > 0 
    ? (assignedMembersCount / activeTrainers).toFixed(2)
    : 0;

  // Top trainers by member count
  const topTrainers = await Trainer.aggregate([
    { $match: { ...matchQuery, trainerStatus: 'active' } },
    {
      $project: {
        fullName: 1,
        email: 1,
        specialization: 1,
        rating: 1,
        sessionsCompleted: 1,
        activeMembersCount: {
          $size: {
            $filter: {
              input: '$assignedMembers',
              as: 'member',
              cond: { $eq: ['$$member.status', 'active'] }
            }
          }
        }
      }
    },
    { $sort: { activeMembersCount: -1 } },
    { $limit: 10 }
  ]);

  // Average rating
  const avgRatingResult = await Trainer.aggregate([
    { $match: { ...matchQuery, 'rating.count': { $gt: 0 } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating.average' }
      }
    }
  ]);

  const avgRating = avgRatingResult.length > 0 
    ? avgRatingResult[0].avgRating.toFixed(2)
    : 0;

  // Trainers by branch
  const trainersByBranch = await Trainer.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$assignedBranch',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    {
      $lookup: {
        from: 'branches',
        localField: '_id',
        foreignField: '_id',
        as: 'branchInfo'
      }
    },
    { $unwind: '$branchInfo' }
  ]);

  ApiResponse.success(
    res,
    {
      summary: {
        totalTrainers,
        activeTrainers,
        inactiveTrainers,
        onLeaveTrainers,
        averageExperience: avgExperience,
        averageRating: parseFloat(avgRating),
        totalAssignedMembers: assignedMembersCount,
        averageMembersPerTrainer: parseFloat(avgMembersPerTrainer)
      },
      bySpecialization: trainersBySpecialization.map(item => ({
        specialization: item._id,
        count: item.count,
        percentage: ((item.count / totalTrainers) * 100).toFixed(2)
      })),
      byBranch: trainersByBranch.map(item => ({
        branchId: item._id,
        branchName: item.branchInfo.branchName,
        branchCode: item.branchInfo.branchCode,
        count: item.count
      })),
      topTrainers: topTrainers.map(trainer => ({
        trainerId: trainer._id,
        fullName: trainer.fullName,
        email: trainer.email,
        specialization: trainer.specialization,
        activeMembersCount: trainer.activeMembersCount,
        rating: trainer.rating.average,
        sessionsCompleted: trainer.sessionsCompleted
      }))
    },
    'Trainer statistics retrieved successfully'
  );
});

module.exports = {
  getAllTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  assignMembers,
  updateAvailability,
  getTrainerById,
  getTrainerStats,
};
