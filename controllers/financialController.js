const MembershipPlan = require('../models/MembershipPlan');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Branch = require('../models/Branch');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ============================================================================
// MEMBERSHIP PLANS
// ============================================================================

/**
 * @desc    Get all membership plans
 * @route   GET /api/superadmin/financial/plans
 * @access  Private (Super Admin only)
 */
const getAllPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive, category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (category && category !== 'all') query.category = category;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const plans = await MembershipPlan.find(query).sort(sort).skip(skip).limit(limitNum);

  const totalCount = await MembershipPlan.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  const stats = {
    total: await MembershipPlan.countDocuments(),
    active: await MembershipPlan.countDocuments({ isActive: true }),
    inactive: await MembershipPlan.countDocuments({ isActive: false }),
    totalRevenue: plans.reduce((sum, plan) => sum + plan.finalPrice * plan.currentMembers, 0),
  };

  ApiResponse.success(res, {
    plans: plans.map(plan => plan.getPublicProfile()),
    pagination: { currentPage: pageNum, totalPages, totalCount, perPage: limitNum },
    stats,
  }, 'Membership plans retrieved successfully');
});

/**
 * @desc    Get single membership plan
 * @route   GET /api/superadmin/financial/plans/:id
 * @access  Private (Super Admin only)
 */
const getPlanById = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);

  if (!plan) {
    throw ApiError.notFound('Membership plan not found');
  }

  ApiResponse.success(res, { plan: plan.getPublicProfile() }, 'Plan retrieved successfully');
});

/**
 * @desc    Create membership plan
 * @route   POST /api/superadmin/financial/plans
 * @access  Private (Super Admin only)
 */
const createPlan = asyncHandler(async (req, res) => {
  const { planName, planCode, duration, durationType, price, discount, features, description, isPopular, category, maxMembers } = req.body;

  if (!planName || !planCode || !duration || !durationType || price === undefined) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  const existingPlan = await MembershipPlan.findByCode(planCode);
  if (existingPlan) {
    throw ApiError.conflict('Plan with this code already exists');
  }

  const plan = await MembershipPlan.create({
    planName,
    planCode: planCode.toUpperCase(),
    duration,
    durationType,
    price,
    discount: discount || 0,
    features: features || [],
    description,
    isPopular: isPopular || false,
    category: category || 'standard',
    maxMembers,
  });

  ApiResponse.created(res, { plan: plan.getPublicProfile() }, 'Plan created successfully');
});

/**
 * @desc    Update membership plan
 * @route   PUT /api/superadmin/financial/plans/:id
 * @access  Private (Super Admin only)
 */
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);

  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }

  const { planName, planCode, duration, durationType, price, discount, features, description, isPopular, isActive, category, maxMembers } = req.body;

  if (planCode && planCode.toUpperCase() !== plan.planCode) {
    const existingPlan = await MembershipPlan.findByCode(planCode);
    if (existingPlan) {
      throw ApiError.conflict('Plan code already in use');
    }
  }

  if (planName) plan.planName = planName;
  if (planCode) plan.planCode = planCode.toUpperCase();
  if (duration) plan.duration = duration;
  if (durationType) plan.durationType = durationType;
  if (price !== undefined) plan.price = price;
  if (discount !== undefined) plan.discount = discount;
  if (features !== undefined) plan.features = features;
  if (description !== undefined) plan.description = description;
  if (isPopular !== undefined) plan.isPopular = isPopular;
  if (isActive !== undefined) plan.isActive = isActive;
  if (category) plan.category = category;
  if (maxMembers !== undefined) plan.maxMembers = maxMembers;

  await plan.save();

  ApiResponse.success(res, { plan: plan.getPublicProfile() }, 'Plan updated successfully');
});

/**
 * @desc    Delete membership plan
 * @route   DELETE /api/superadmin/financial/plans/:id
 * @access  Private (Super Admin only)
 */
const deletePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);

  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }

  if (plan.currentMembers > 0) {
    throw ApiError.badRequest('Cannot delete plan with active subscriptions');
  }

  await plan.deleteOne();

  ApiResponse.success(res, null, 'Plan deleted successfully');
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * @desc    Get all subscriptions
 * @route   GET /api/superadmin/financial/subscriptions
 * @access  Private (Super Admin only)
 */
const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, userId, branchId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const query = {};
  if (status && status !== 'all') query.status = status;
  if (userId) query.user = userId;
  if (branchId) query.branch = branchId;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const subscriptions = await Subscription.find(query)
    .populate('user', 'fullName email phone')
    .populate('membershipPlan', 'planName planCode price')
    .populate('branch', 'branchName branchCode city')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Subscription.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  const stats = {
    total: await Subscription.countDocuments(),
    active: await Subscription.countDocuments({ status: 'active' }),
    expired: await Subscription.countDocuments({ status: 'expired' }),
    cancelled: await Subscription.countDocuments({ status: 'cancelled' }),
    pending: await Subscription.countDocuments({ status: 'pending' }),
    totalRevenue: subscriptions.reduce((sum, sub) => sum + sub.amountPaid, 0),
  };

  ApiResponse.success(res, {
    subscriptions: subscriptions.map(sub => sub.getPublicProfile()),
    pagination: { currentPage: pageNum, totalPages, totalCount, perPage: limitNum },
    stats,
  }, 'Subscriptions retrieved successfully');
});

/**
 * @desc    Get single subscription
 * @route   GET /api/superadmin/financial/subscriptions/:id
 * @access  Private (Super Admin only)
 */
const getSubscriptionById = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id)
    .populate('user', 'fullName email phone')
    .populate('membershipPlan', 'planName planCode price duration durationType')
    .populate('branch', 'branchName branchCode city');

  if (!subscription) {
    throw ApiError.notFound('Subscription not found');
  }

  ApiResponse.success(res, { subscription: subscription.getPublicProfile() }, 'Subscription retrieved successfully');
});

/**
 * @desc    Create subscription
 * @route   POST /api/superadmin/financial/subscriptions
 * @access  Private (Super Admin only)
 */
const createSubscription = asyncHandler(async (req, res) => {
  const { userId, planId, branchId, startDate, paymentMethod, transactionId, autoRenew } = req.body;

  if (!userId || !planId || !startDate || !paymentMethod) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const plan = await MembershipPlan.findById(planId);
  if (!plan) {
    throw ApiError.notFound('Plan not found');
  }

  if (!plan.isAvailable()) {
    throw ApiError.badRequest('Plan is not available');
  }

  const start = new Date(startDate);
  let end = new Date(start);
  
  if (plan.durationType === 'days') {
    end.setDate(end.getDate() + plan.duration);
  } else if (plan.durationType === 'months') {
    end.setMonth(end.getMonth() + plan.duration);
  } else if (plan.durationType === 'years') {
    end.setFullYear(end.getFullYear() + plan.duration);
  }

  const subscription = await Subscription.create({
    user: userId,
    membershipPlan: planId,
    branch: branchId || null,
    startDate: start,
    endDate: end,
    status: 'active',
    amountPaid: plan.finalPrice,
    paymentMethod,
    transactionId: transactionId || null,
    autoRenew: autoRenew || false,
  });

  plan.currentMembers += 1;
  await plan.save();

  user.membershipPlan = plan.durationType === 'months' ? (plan.duration === 1 ? 'monthly' : plan.duration === 3 ? 'quarterly' : plan.duration === 6 ? 'half-yearly' : 'yearly') : 'none';
  user.membershipStatus = 'active';
  user.membershipStartDate = start;
  user.membershipEndDate = end;
  await user.save();

  await subscription.populate('user', 'fullName email');
  await subscription.populate('membershipPlan', 'planName planCode');

  ApiResponse.created(res, { subscription: subscription.getPublicProfile() }, 'Subscription created successfully');
});

/**
 * @desc    Cancel subscription
 * @route   PATCH /api/superadmin/financial/subscriptions/:id/cancel
 * @access  Private (Super Admin only)
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const subscription = await Subscription.findById(req.params.id);

  if (!subscription) {
    throw ApiError.notFound('Subscription not found');
  }

  if (subscription.status === 'cancelled') {
    throw ApiError.badRequest('Subscription is already cancelled');
  }

  await subscription.cancel(reason || 'Cancelled by admin');

  const plan = await MembershipPlan.findById(subscription.membershipPlan);
  if (plan && plan.currentMembers > 0) {
    plan.currentMembers -= 1;
    await plan.save();
  }

  ApiResponse.success(res, { subscription: subscription.getPublicProfile() }, 'Subscription cancelled successfully');
});

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * @desc    Get all transactions
 * @route   GET /api/superadmin/financial/transactions
 * @access  Private (Super Admin only)
 */
const getAllTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type, userId, branchId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const query = {};
  if (status && status !== 'all') query.status = status;
  if (type && type !== 'all') query.type = type;
  if (userId) query.user = userId;
  if (branchId) query.branch = branchId;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const transactions = await Transaction.find(query)
    .populate('user', 'fullName email')
    .populate('subscription', 'startDate endDate')
    .populate('branch', 'branchName branchCode')
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const totalCount = await Transaction.countDocuments(query);
  const totalPages = Math.ceil(totalCount / limitNum);

  const stats = {
    total: await Transaction.countDocuments(),
    success: await Transaction.countDocuments({ status: 'success' }),
    pending: await Transaction.countDocuments({ status: 'pending' }),
    failed: await Transaction.countDocuments({ status: 'failed' }),
    refunded: await Transaction.countDocuments({ status: 'refunded' }),
    totalAmount: transactions.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0),
  };

  ApiResponse.success(res, {
    transactions: transactions.map(txn => txn.getPublicProfile()),
    pagination: { currentPage: pageNum, totalPages, totalCount, perPage: limitNum },
    stats,
  }, 'Transactions retrieved successfully');
});

/**
 * @desc    Get single transaction
 * @route   GET /api/superadmin/financial/transactions/:id
 * @access  Private (Super Admin only)
 */
const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate('user', 'fullName email phone')
    .populate('subscription', 'startDate endDate status')
    .populate('branch', 'branchName branchCode city');

  if (!transaction) {
    throw ApiError.notFound('Transaction not found');
  }

  ApiResponse.success(res, { transaction: transaction.getPublicProfile() }, 'Transaction retrieved successfully');
});

/**
 * @desc    Create transaction
 * @route   POST /api/superadmin/financial/transactions
 * @access  Private (Super Admin only)
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { userId, subscriptionId, branchId, type, amount, paymentMethod, status, description } = req.body;

  if (!userId || !type || amount === undefined || !paymentMethod) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  const transactionId = await Transaction.generateTransactionId();

  const transaction = await Transaction.create({
    transactionId,
    user: userId,
    subscription: subscriptionId || null,
    branch: branchId || null,
    type,
    amount,
    status: status || 'success',
    paymentMethod,
    description: description || null,
    processedBy: req.user.id,
  });

  await transaction.populate('user', 'fullName email');

  ApiResponse.created(res, { transaction: transaction.getPublicProfile() }, 'Transaction created successfully');
});

/**
 * @desc    Get financial statistics
 * @route   GET /api/superadmin/financial/stats
 * @access  Private (Super Admin only)
 */
const getFinancialStats = asyncHandler(async (req, res) => {
  const totalPlans = await MembershipPlan.countDocuments();
  const activePlans = await MembershipPlan.countDocuments({ isActive: true });
  
  const totalSubscriptions = await Subscription.countDocuments();
  const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
  
  const totalTransactions = await Transaction.countDocuments();
  const successfulTransactions = await Transaction.countDocuments({ status: 'success' });
  
  const transactions = await Transaction.find({ status: 'success' });
  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  const subscriptions = await Subscription.find({ status: 'active' });
  const monthlyRecurring = subscriptions.reduce((sum, s) => sum + s.amountPaid, 0);

  const stats = {
    plans: { total: totalPlans, active: activePlans },
    subscriptions: { total: totalSubscriptions, active: activeSubscriptions },
    transactions: { total: totalTransactions, successful: successfulTransactions },
    revenue: { total: totalRevenue, monthlyRecurring },
  };

  ApiResponse.success(res, stats, 'Financial statistics retrieved successfully');
});

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  cancelSubscription,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  getFinancialStats,
};
