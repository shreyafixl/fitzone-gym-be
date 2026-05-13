const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all memberships with filtering
 * @route   GET /api/admin/memberships
 * @access  Private (Admin)
 */
const getAllMemberships = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    memberId,
    branchId,
    membershipStatus,
    paymentStatus,
    membershipPlan,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (memberId) {
    query.memberId = memberId;
  }

  if (branchId) {
    query.assignedBranch = branchId;
  }

  if (membershipStatus) {
    query.membershipStatus = membershipStatus;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (membershipPlan) {
    query.membershipPlan = membershipPlan;
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const memberships = await Membership.find(query)
    .populate('memberId', 'fullName email phone membershipStatus')
    .populate('assignedBranch', 'branchName branchCode city')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Add calculated fields
  const membershipsWithDetails = memberships.map(membership => {
    const daysRemaining = membership.membershipStatus === 'active'
      ? Math.max(0, Math.ceil((new Date(membership.membershipEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;
    
    return {
      ...membership,
      daysRemaining,
      isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7
    };
  });

  // Get total count
  const totalMemberships = await Membership.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalMemberships / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      memberships: membershipsWithDetails,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalMemberships,
        limit: limitNum,
        hasMore
      }
    },
    'Memberships retrieved successfully'
  );
});

/**
 * @desc    Create new membership
 * @route   POST /api/admin/memberships
 * @access  Private (Admin)
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
    notes
  } = req.body;

  // Validate required fields
  if (!memberId || !membershipPlan || !membershipStartDate || !membershipEndDate || !assignedBranch || !amount) {
    throw ApiError.badRequest('Please provide all required fields: memberId, membershipPlan, membershipStartDate, membershipEndDate, assignedBranch, amount');
  }

  // Verify member exists
  const member = await User.findById(memberId);
  if (!member || member.role !== 'member') {
    throw ApiError.badRequest('Invalid member ID or user is not a member');
  }

  // Verify branch exists
  const branch = await Branch.findById(assignedBranch);
  if (!branch) {
    throw ApiError.notFound('Branch not found');
  }

  // Check if member already has an active membership
  const existingMembership = await Membership.findOne({
    memberId,
    membershipStatus: 'active'
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
    transactionId,
    autoRenewal: autoRenewal || false,
    notes,
    createdBy: req.user.id,
    createdByModel: 'Admin'
  });

  // Update user's membership details
  await User.findByIdAndUpdate(memberId, {
    membershipPlan,
    membershipStatus: 'active',
    membershipStartDate: new Date(membershipStartDate),
    membershipEndDate: new Date(membershipEndDate)
  });

  // Populate and return
  const createdMembership = await Membership.findById(membership._id)
    .populate('memberId', 'fullName email phone')
    .populate('assignedBranch', 'branchName branchCode');

  ApiResponse.success(
    res,
    { membership: createdMembership },
    'Membership created successfully',
    201
  );
});

/**
 * @desc    Renew membership
 * @route   POST /api/admin/memberships/:id/renew
 * @access  Private (Admin)
 */
const renewMembership = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    membershipPlan,
    duration,
    amount,
    discount,
    paymentMethod,
    paymentStatus,
    transactionId
  } = req.body;

  // Find existing membership
  const membership = await Membership.findById(id);
  if (!membership) {
    throw ApiError.notFound('Membership not found');
  }

  // Validate required fields
  if (!duration || !amount) {
    throw ApiError.badRequest('Please provide duration and amount for renewal');
  }

  // Calculate new dates
  const startDate = new Date(membership.membershipEndDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + parseInt(duration));

  // Create new membership record
  const newMembership = await Membership.create({
    memberId: membership.memberId,
    membershipPlan: membershipPlan || membership.membershipPlan,
    membershipStartDate: startDate,
    membershipEndDate: endDate,
    assignedBranch: membership.assignedBranch,
    amount,
    discount: discount || 0,
    finalAmount: amount - (discount || 0),
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: paymentStatus || 'pending',
    transactionId,
    autoRenewal: membership.autoRenewal,
    createdBy: req.user.id,
    createdByModel: 'Admin'
  });

  // Update old membership status
  membership.membershipStatus = 'expired';
  await membership.save();

  // Update user's membership details
  await User.findByIdAndUpdate(membership.memberId, {
    membershipPlan: membershipPlan || membership.membershipPlan,
    membershipStatus: 'active',
    membershipStartDate: startDate,
    membershipEndDate: endDate
  });

  // Populate and return
  const renewedMembership = await Membership.findById(newMembership._id)
    .populate('memberId', 'fullName email phone')
    .populate('assignedBranch', 'branchName branchCode');

  ApiResponse.success(
    res,
    { membership: renewedMembership },
    'Membership renewed successfully',
    201
  );
});

/**
 * @desc    Get membership statistics
 * @route   GET /api/admin/memberships/stats
 * @access  Private (Admin)
 */
const getMembershipStats = asyncHandler(async (req, res) => {
  const { branchId, period = 'month' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    startDate = new Date(0);
  }

  // Build match query
  const matchQuery = {
    createdAt: { $gte: startDate }
  };

  if (branchId) {
    matchQuery.assignedBranch = mongoose.Types.ObjectId(branchId);
  }

  // Total memberships
  const totalMemberships = await Membership.countDocuments();
  const activeMemberships = await Membership.countDocuments({ membershipStatus: 'active' });
  const expiredMemberships = await Membership.countDocuments({ membershipStatus: 'expired' });
  const pausedMemberships = await Membership.countDocuments({ membershipStatus: 'paused' });
  const cancelledMemberships = await Membership.countDocuments({ membershipStatus: 'cancelled' });

  // New memberships in period
  const newMemberships = await Membership.countDocuments(matchQuery);

  // Expiring soon (next 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = await Membership.countDocuments({
    membershipStatus: 'active',
    membershipEndDate: {
      $gte: now,
      $lte: sevenDaysFromNow
    }
  });

  // Memberships by plan
  const membershipsByPlan = await Membership.aggregate([
    { $match: { membershipStatus: 'active' } },
    {
      $group: {
        _id: '$membershipPlan',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$finalAmount' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Memberships by payment status
  const membershipsByPayment = await Membership.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  // Revenue statistics
  const revenueStats = await Membership.aggregate([
    {
      $match: {
        ...matchQuery,
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$finalAmount' },
        avgRevenue: { $avg: '$finalAmount' }
      }
    }
  ]);

  const revenue = revenueStats.length > 0 ? revenueStats[0] : {
    totalRevenue: 0,
    avgRevenue: 0
  };

  // Renewal rate
  const renewedCount = await Membership.countDocuments({
    createdAt: { $gte: startDate },
    membershipStartDate: { $gt: new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000) }
  });

  const renewalRate = newMemberships > 0 
    ? ((renewedCount / newMemberships) * 100).toFixed(2)
    : 0;

  // Memberships by branch
  const membershipsByBranch = await Membership.aggregate([
    { $match: { membershipStatus: 'active' } },
    {
      $group: {
        _id: '$assignedBranch',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
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
      period,
      summary: {
        totalMemberships,
        activeMemberships,
        expiredMemberships,
        pausedMemberships,
        cancelledMemberships,
        newMemberships,
        expiringSoon,
        renewalRate: parseFloat(renewalRate)
      },
      revenue: {
        total: revenue.totalRevenue,
        average: Math.round(revenue.avgRevenue)
      },
      byPlan: membershipsByPlan.map(item => ({
        plan: item._id,
        count: item.count,
        revenue: item.totalRevenue,
        percentage: ((item.count / activeMemberships) * 100).toFixed(2)
      })),
      byPaymentStatus: membershipsByPayment.map(item => ({
        status: item._id,
        count: item.count
      })),
      byBranch: membershipsByBranch.map(item => ({
        branchId: item._id,
        branchName: item.branchInfo.branchName,
        branchCode: item.branchInfo.branchCode,
        count: item.count
      }))
    },
    'Membership statistics retrieved successfully'
  );
});

/**
 * @desc    Get all membership plans
 * @route   GET /api/admin/membership-plans
 * @access  Private (Admin)
 */
const getAllMembershipPlans = asyncHandler(async (req, res) => {
  const { isActive, category } = req.query;

  // Build query
  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (category) {
    query.category = category;
  }

  // Get all plans
  const plans = await MembershipPlan.find(query)
    .sort({ category: 1, price: 1 })
    .lean();

  // Add availability info
  const plansWithAvailability = plans.map(plan => ({
    ...plan,
    availableSlots: plan.maxMembers ? plan.maxMembers - plan.currentMembers : null,
    isAvailable: plan.isActive && (!plan.maxMembers || plan.currentMembers < plan.maxMembers)
  }));

  ApiResponse.success(
    res,
    { plans: plansWithAvailability, count: plans.length },
    'Membership plans retrieved successfully'
  );
});

/**
 * @desc    Create membership plan
 * @route   POST /api/admin/membership-plans
 * @access  Private (Admin)
 */
const createMembershipPlan = asyncHandler(async (req, res) => {
  const {
    planName,
    planCode,
    duration,
    durationType,
    price,
    discount,
    features,
    description,
    isPopular,
    maxMembers,
    category
  } = req.body;

  // Validate required fields
  if (!planName || !planCode || !duration || !durationType || price === undefined) {
    throw ApiError.badRequest('Please provide all required fields: planName, planCode, duration, durationType, price');
  }

  // Check if plan code already exists
  const existingPlan = await MembershipPlan.findOne({ planCode: planCode.toUpperCase() });
  if (existingPlan) {
    throw ApiError.conflict('Membership plan with this code already exists');
  }

  // Create plan
  const plan = await MembershipPlan.create({
    planName,
    planCode: planCode.toUpperCase(),
    duration,
    durationType,
    price,
    discount: discount || 0,
    finalPrice: price - (price * (discount || 0)) / 100,
    features: features || [],
    description,
    isPopular: isPopular || false,
    maxMembers,
    category: category || 'standard'
  });

  ApiResponse.success(
    res,
    { plan },
    'Membership plan created successfully',
    201
  );
});

/**
 * @desc    Update membership plan
 * @route   PUT /api/admin/membership-plans/:id
 * @access  Private (Admin)
 */
const updateMembershipPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find plan
  const plan = await MembershipPlan.findById(id);
  if (!plan) {
    throw ApiError.notFound('Membership plan not found');
  }

  // Check if plan code is being changed and if it's already taken
  if (updateData.planCode && updateData.planCode.toUpperCase() !== plan.planCode) {
    const existingPlan = await MembershipPlan.findOne({ planCode: updateData.planCode.toUpperCase() });
    if (existingPlan) {
      throw ApiError.conflict('Plan code is already in use');
    }
    updateData.planCode = updateData.planCode.toUpperCase();
  }

  // Update plan
  const updatedPlan = await MembershipPlan.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  ApiResponse.success(
    res,
    { plan: updatedPlan },
    'Membership plan updated successfully'
  );
});

/**
 * @desc    Delete membership plan
 * @route   DELETE /api/admin/membership-plans/:id
 * @access  Private (Admin)
 */
const deleteMembershipPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find plan
  const plan = await MembershipPlan.findById(id);
  if (!plan) {
    throw ApiError.notFound('Membership plan not found');
  }

  // Check if plan has active memberships
  const activeMemberships = await Membership.countDocuments({
    membershipPlan: plan.planCode.toLowerCase(),
    membershipStatus: 'active'
  });

  if (activeMemberships > 0) {
    throw ApiError.badRequest(
      `Cannot delete plan with ${activeMemberships} active memberships. Please deactivate the plan instead.`
    );
  }

  // Soft delete - set isActive to false
  plan.isActive = false;
  await plan.save();

  // Or hard delete - uncomment below
  // await MembershipPlan.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { planId: id },
    'Membership plan deleted successfully'
  );
});

module.exports = {
  getAllMemberships,
  createMembership,
  renewMembership,
  getMembershipStats,
  getAllMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
};
