const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// MEMBERSHIP MANAGEMENT
// ============================================================================

/**
 * @desc    Get all memberships
 * @route   GET /api/memberships
 * @access  Private (Super Admin, Trainers)
 */
const getAllMemberships = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    memberId,
    branchId,
    membershipStatus,
    paymentStatus,
    membershipPlan,
    autoRenewal,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};
  if (memberId) query.memberId = memberId;
  if (branchId) query.assignedBranch = branchId;
  if (membershipStatus && membershipStatus !== 'all') query.membershipStatus = membershipStatus;
  if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
  if (membershipPlan && membershipPlan !== 'all') query.membershipPlan = membershipPlan;
  if (autoRenewal !== undefined) query.autoRenewal = autoRenewal === 'true';

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const memberships = await Membership.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('assignedBranch', 'branchName branchCode city')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Membership.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  // Get statistics
  const stats = {
    total: await Membership.countDocuments(),
    active: await Membership.countDocuments({ membershipStatus: 'active' }),
    expired: await Membership.countDocuments({ membershipStatus: 'expired' }),
    paused: await Membership.countDocuments({ membershipStatus: 'paused' }),
    cancelled: await Membership.countDocuments({ membershipStatus: 'cancelled' }),
    autoRenewalEnabled: await Membership.countDocuments({ autoRenewal: true }),
  };

  ApiResponse.success(
    res,
    {
      memberships: memberships.map((m) => m.getPublicProfile()),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        perPage: limitNum,
      },
      stats,
    },
    'Memberships retrieved successfully'
  );
});

/**
 * @desc    Get single membership
 * @route   GET /api/memberships/:id
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const getMembershipById = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id)
    .populate('memberId', 'fullName email phone membershipStatus membershipPlan')
    .populate('assignedBranch', 'branchName branchCode city address');

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Membership retrieved successfully'
  );
});

/**
 * @desc    Get member's memberships
 * @route   GET /api/memberships/member/:memberId
 * @access  Private (Super Admin, Trainers, Member - own)
 */
const getMemberMemberships = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  const memberships = await Membership.find({ memberId })
    .populate('assignedBranch', 'branchName branchCode')
    .sort({ createdAt: -1 });

  const activeMembership = memberships.find((m) => m.membershipStatus === 'active');

  ApiResponse.success(
    res,
    {
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        membershipStatus: member.membershipStatus,
      },
      memberships: memberships.map((m) => m.getPublicProfile()),
      activeMembership: activeMembership ? activeMembership.getPublicProfile() : null,
      totalMemberships: memberships.length,
    },
    'Member memberships retrieved successfully'
  );
});

/**
 * @desc    Get expiring memberships
 * @route   GET /api/memberships/expiring
 * @access  Private (Super Admin, Trainers)
 */
const getExpiringMemberships = asyncHandler(async (req, res) => {
  const { days = 7, branchId } = req.query;

  const today = new Date();
  const futureDate = new Date(today.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

  const query = {
    membershipStatus: 'active',
    membershipEndDate: {
      $gte: today,
      $lte: futureDate,
    },
  };

  if (branchId) query.assignedBranch = branchId;

  const memberships = await Membership.find(query)
    .populate('memberId', 'fullName email phone')
    .populate('assignedBranch', 'branchName branchCode')
    .sort({ membershipEndDate: 1 });

  ApiResponse.success(
    res,
    {
      memberships: memberships.map((m) => m.getPublicProfile()),
      totalCount: memberships.length,
      expiringWithinDays: parseInt(days),
    },
    'Expiring memberships retrieved successfully'
  );
});

/**
 * @desc    Create membership
 * @route   POST /api/memberships
 * @access  Private (Super Admin, Trainers)
 */
const createMembership = asyncHandler(async (req, res) => {
  const {
    memberId,
    membershipPlan,
    membershipStartDate,
    membershipEndDate,
    assignedBranch,
    amount,
    discount,
    paymentMethod,
    paymentStatus,
    transactionId,
    autoRenewal,
    notes,
  } = req.body;

  // Validate required fields
  if (!memberId || !membershipPlan || !membershipStartDate || !membershipEndDate || !assignedBranch || !amount) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member) {
    throw ApiError.notFound('Member not found');
  }

  // Verify branch exists
  const branch = await Branch.findById(assignedBranch);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Check if member already has an active membership
  const existingMembership = await Membership.findOne({
    memberId,
    membershipStatus: 'active',
  });

  if (existingMembership) {
    throw ApiError.conflict('Member already has an active membership');
  }

  // Create membership
  const membership = await Membership.create({
    memberId,
    membershipPlan,
    membershipStartDate: new Date(membershipStartDate),
    membershipEndDate: new Date(membershipEndDate),
    assignedBranch,
    amount,
    discount: discount || 0,
    finalAmount: amount - (discount || 0),
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: paymentStatus || 'pending',
    transactionId: transactionId || null,
    autoRenewal: autoRenewal || false,
    notes: notes || null,
    membershipStatus: 'active',
    createdBy: req.user.id,
    createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'User',
  });

  // Update user's membership status
  member.membershipStatus = 'active';
  member.membershipPlan = membershipPlan;
  member.membershipStartDate = new Date(membershipStartDate);
  member.membershipEndDate = new Date(membershipEndDate);
  await member.save();

  await membership.populate('memberId', 'fullName email');
  await membership.populate('assignedBranch', 'branchName branchCode');

  ApiResponse.created(
    res,
    { membership: membership.getPublicProfile() },
    'Membership created successfully'
  );
});

/**
 * @desc    Update membership
 * @route   PUT /api/memberships/:id
 * @access  Private (Super Admin, Trainers)
 */
const updateMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id);

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  const {
    membershipPlan,
    membershipStartDate,
    membershipEndDate,
    membershipStatus,
    paymentStatus,
    assignedBranch,
    amount,
    discount,
    paymentMethod,
    transactionId,
    autoRenewal,
    notes,
  } = req.body;

  // Update fields
  if (membershipPlan) membership.membershipPlan = membershipPlan;
  if (membershipStartDate) membership.membershipStartDate = new Date(membershipStartDate);
  if (membershipEndDate) membership.membershipEndDate = new Date(membershipEndDate);
  if (membershipStatus) membership.membershipStatus = membershipStatus;
  if (paymentStatus) membership.paymentStatus = paymentStatus;
  if (assignedBranch) {
    const branch = await Branch.findById(assignedBranch);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
    membership.assignedBranch = assignedBranch;
  }
  if (amount !== undefined) membership.amount = amount;
  if (discount !== undefined) membership.discount = discount;
  if (paymentMethod) membership.paymentMethod = paymentMethod;
  if (transactionId !== undefined) membership.transactionId = transactionId;
  if (autoRenewal !== undefined) membership.autoRenewal = autoRenewal;
  if (notes !== undefined) membership.notes = notes;

  await membership.save();
  await membership.populate('memberId', 'fullName email');
  await membership.populate('assignedBranch', 'branchName branchCode');

  // Update user's membership info if status changed
  if (membershipStatus) {
    const member = await User.findById(membership.memberId);
    if (member) {
      member.membershipStatus = membershipStatus;
      if (membershipPlan) member.membershipPlan = membershipPlan;
      if (membershipStartDate) member.membershipStartDate = new Date(membershipStartDate);
      if (membershipEndDate) member.membershipEndDate = new Date(membershipEndDate);
      await member.save();
    }
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Membership updated successfully'
  );
});

/**
 * @desc    Renew membership
 * @route   POST /api/memberships/:id/renew
 * @access  Private (Super Admin, Trainers)
 */
const renewMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id);

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  const { membershipEndDate, amount, paymentStatus, paymentMethod, transactionId } = req.body;

  if (!membershipEndDate || !amount) {
    throw ApiError.badRequest('Please provide membership end date and amount');
  }

  await membership.renew(new Date(membershipEndDate), amount);

  if (paymentStatus) membership.paymentStatus = paymentStatus;
  if (paymentMethod) membership.paymentMethod = paymentMethod;
  if (transactionId) membership.transactionId = transactionId;

  await membership.save();
  await membership.populate('memberId', 'fullName email');
  await membership.populate('assignedBranch', 'branchName branchCode');

  // Update user's membership info
  const member = await User.findById(membership.memberId);
  if (member) {
    member.membershipStatus = 'active';
    member.membershipEndDate = new Date(membershipEndDate);
    await member.save();
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Membership renewed successfully'
  );
});

/**
 * @desc    Pause membership
 * @route   PATCH /api/memberships/:id/pause
 * @access  Private (Super Admin, Trainers)
 */
const pauseMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id);

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  if (membership.membershipStatus !== 'active') {
    throw ApiError.badRequest('Only active memberships can be paused');
  }

  const { pausedFrom, pausedUntil } = req.body;

  await membership.pause(
    pausedFrom ? new Date(pausedFrom) : new Date(),
    pausedUntil ? new Date(pausedUntil) : null
  );

  await membership.populate('memberId', 'fullName email');
  await membership.populate('assignedBranch', 'branchName branchCode');

  // Update user's membership status
  const member = await User.findById(membership.memberId);
  if (member) {
    member.membershipStatus = 'paused';
    await member.save();
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Membership paused successfully'
  );
});

/**
 * @desc    Resume membership
 * @route   PATCH /api/memberships/:id/resume
 * @access  Private (Super Admin, Trainers)
 */
const resumeMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id);

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  if (membership.membershipStatus !== 'paused') {
    throw ApiError.badRequest('Only paused memberships can be resumed');
  }

  await membership.resume();

  await membership.populate('memberId', 'fullName email');
  await membership.populate('assignedBranch', 'branchName branchCode');

  // Update user's membership status
  const member = await User.findById(membership.memberId);
  if (member) {
    member.membershipStatus = 'active';
    await member.save();
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Membership resumed successfully'
  );
});

/**
 * @desc    Cancel membership
 * @route   PATCH /api/memberships/:id/cancel
 * @access  Private (Super Admin, Trainers)
 */
const cancelMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id);

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  const { cancellationReason } = req.body;

  await membership.cancel(cancellationReason || 'No reason provided');

  await membership.populate('memberId', 'fullName email');
  await membership.populate('assignedBranch', 'branchName branchCode');

  // Update user's membership status
  const member = await User.findById(membership.memberId);
  if (member) {
    member.membershipStatus = 'cancelled';
    await member.save();
  }

  ApiResponse.success(
    res,
    { membership: membership.getPublicProfile() },
    'Membership cancelled successfully'
  );
});

/**
 * @desc    Delete membership
 * @route   DELETE /api/memberships/:id
 * @access  Private (Super Admin only)
 */
const deleteMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findById(req.params.id);

  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  await membership.deleteOne();

  ApiResponse.success(res, null, 'Membership deleted successfully');
});

// ============================================================================
// MEMBERSHIP PLANS
// ============================================================================

/**
 * @desc    Get all membership plans
 * @route   GET /api/membership-plans
 * @access  Public
 */
const getAllMembershipPlans = asyncHandler(async (req, res) => {
  const { isActive, category, sortBy = 'price', sortOrder = 'asc' } = req.query;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (category && category !== 'all') query.category = category;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const plans = await MembershipPlan.find(query).sort(sort);

  const stats = {
    total: await MembershipPlan.countDocuments(),
    active: await MembershipPlan.countDocuments({ isActive: true }),
    inactive: await MembershipPlan.countDocuments({ isActive: false }),
  };

  ApiResponse.success(
    res,
    {
      plans: plans.map((p) => p.getPublicProfile()),
      stats,
    },
    'Membership plans retrieved successfully'
  );
});

/**
 * @desc    Get single membership plan
 * @route   GET /api/membership-plans/:id
 * @access  Public
 */
const getMembershipPlanById = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);

  if (!plan) {
    throw ApiError.notFound('Membership plan not found');
  }

  ApiResponse.success(res, { plan: plan.getPublicProfile() }, 'Membership plan retrieved successfully');
});

/**
 * @desc    Create membership plan
 * @route   POST /api/membership-plans
 * @access  Private (Super Admin only)
 */
const createMembershipPlan = asyncHandler(async (req, res) => {
  const {
    planName,
    planCode,
    duration,
    durationType,
    price,
    currency,
    discount,
    features,
    description,
    isPopular,
    isActive,
    maxMembers,
    category,
  } = req.body;

  // Validate required fields
  if (!planName || !planCode || !duration || !durationType || price === undefined) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Check if plan code already exists
  const existingPlan = await MembershipPlan.findOne({ planCode: planCode.toUpperCase() });
  if (existingPlan) {
    throw ApiError.conflict('Plan code already exists');
  }

  const plan = await MembershipPlan.create({
    planName,
    planCode: planCode.toUpperCase(),
    duration,
    durationType,
    price,
    currency: currency || 'INR',
    discount: discount || 0,
    features: features || [],
    description: description || null,
    isPopular: isPopular || false,
    isActive: isActive !== undefined ? isActive : true,
    maxMembers: maxMembers || null,
    category: category || 'standard',
  });

  ApiResponse.created(res, { plan: plan.getPublicProfile() }, 'Membership plan created successfully');
});

/**
 * @desc    Update membership plan
 * @route   PUT /api/membership-plans/:id
 * @access  Private (Super Admin only)
 */
const updateMembershipPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);

  if (!plan) {
    throw ApiError.notFound('Membership plan not found');
  }

  const {
    planName,
    duration,
    durationType,
    price,
    currency,
    discount,
    features,
    description,
    isPopular,
    isActive,
    maxMembers,
    category,
  } = req.body;

  // Update fields
  if (planName) plan.planName = planName;
  if (duration) plan.duration = duration;
  if (durationType) plan.durationType = durationType;
  if (price !== undefined) plan.price = price;
  if (currency) plan.currency = currency;
  if (discount !== undefined) plan.discount = discount;
  if (features) plan.features = features;
  if (description !== undefined) plan.description = description;
  if (isPopular !== undefined) plan.isPopular = isPopular;
  if (isActive !== undefined) plan.isActive = isActive;
  if (maxMembers !== undefined) plan.maxMembers = maxMembers;
  if (category) plan.category = category;

  await plan.save();

  ApiResponse.success(res, { plan: plan.getPublicProfile() }, 'Membership plan updated successfully');
});

/**
 * @desc    Delete membership plan
 * @route   DELETE /api/membership-plans/:id
 * @access  Private (Super Admin only)
 */
const deleteMembershipPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);

  if (!plan) {
    throw ApiError.notFound('Membership plan not found');
  }

  // Check if plan is being used
  const activeMemberships = await Membership.countDocuments({
    membershipPlan: plan.planCode,
    membershipStatus: 'active',
  });

  if (activeMemberships > 0) {
    throw ApiError.badRequest('Cannot delete plan with active memberships');
  }

  await plan.deleteOne();

  ApiResponse.success(res, null, 'Membership plan deleted successfully');
});

module.exports = {
  // Memberships
  getAllMemberships,
  getMembershipById,
  getMemberMemberships,
  getExpiringMemberships,
  createMembership,
  updateMembership,
  renewMembership,
  pauseMembership,
  resumeMembership,
  cancelMembership,
  deleteMembership,
  // Membership Plans
  getAllMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
};
