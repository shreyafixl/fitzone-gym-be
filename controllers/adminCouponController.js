const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all coupons with filtering and pagination
 * @route   GET /api/admin/coupons
 * @access  Private (Admin)
 */
const getAllCoupons = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    isActive,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (search) {
    query.$or = [
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const coupons = await Coupon.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalCoupons = await Coupon.countDocuments(query);

  // Get summary
  const activeCoupons = await Coupon.countDocuments({ isActive: true });
  const expiredCoupons = await Coupon.countDocuments({ isActive: false });

  // Calculate pagination info
  const totalPages = Math.ceil(totalCoupons / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      coupons,
      pagination: {
        currentPage: pageNum,
        totalPages,
        total: totalCoupons,
        limit: limitNum,
        hasMore
      },
      summary: {
        total: totalCoupons,
        active: activeCoupons,
        expired: expiredCoupons
      }
    },
    'Coupons retrieved successfully'
  );
});

/**
 * @desc    Get coupon by ID
 * @route   GET /api/admin/coupons/:id
 * @access  Private (Admin)
 */
const getCouponById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const coupon = await Coupon.findById(id).lean();

  if (!coupon) {
    throw ApiError.notFound('Coupon not found');
  }

  ApiResponse.success(
    res,
    { coupon },
    'Coupon retrieved successfully'
  );
});

/**
 * @desc    Create new coupon
 * @route   POST /api/admin/coupons
 * @access  Private (Admin)
 */
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    maxDiscount,
    minPurchaseAmount,
    maxUses,
    maxUsesPerUser,
    applicableTo,
    applicableItems,
    validFrom,
    validUntil
  } = req.body;

  // Validate required fields
  if (!code || !discountType || discountValue === undefined || !validFrom || !validUntil) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Check if code already exists
  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (existingCoupon) {
    throw ApiError.conflict('Coupon code already exists');
  }

  // Create coupon
  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountValue,
    maxDiscount,
    minPurchaseAmount: minPurchaseAmount || 0,
    maxUses,
    maxUsesPerUser: maxUsesPerUser || 1,
    applicableTo: applicableTo || 'all',
    applicableItems: applicableItems || [],
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    createdBy: req.user.id,
    createdByModel: 'Admin'
  });

  ApiResponse.success(
    res,
    { coupon },
    'Coupon created successfully',
    201
  );
});

/**
 * @desc    Update coupon
 * @route   PUT /api/admin/coupons/:id
 * @access  Private (Admin)
 */
const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find coupon
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw ApiError.notFound('Coupon not found');
  }

  // Check if code is being changed and if it's already taken
  if (updateData.code && updateData.code.toUpperCase() !== coupon.code) {
    const existingCoupon = await Coupon.findOne({ code: updateData.code.toUpperCase() });
    if (existingCoupon) {
      throw ApiError.conflict('Coupon code already exists');
    }
    updateData.code = updateData.code.toUpperCase();
  }

  // Update coupon
  const updatedCoupon = await Coupon.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  ApiResponse.success(
    res,
    { coupon: updatedCoupon },
    'Coupon updated successfully'
  );
});

/**
 * @desc    Delete coupon
 * @route   DELETE /api/admin/coupons/:id
 * @access  Private (Admin)
 */
const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find coupon
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw ApiError.notFound('Coupon not found');
  }

  // Delete coupon
  await Coupon.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { couponId: id },
    'Coupon deleted successfully'
  );
});

/**
 * @desc    Get coupon statistics
 * @route   GET /api/admin/coupons/stats
 * @access  Private (Admin)
 */
const getCouponStats = asyncHandler(async (req, res) => {
  const now = new Date();

  const totalCoupons = await Coupon.countDocuments();
  const activeCoupons = await Coupon.countDocuments({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });
  const expiredCoupons = await Coupon.countDocuments({
    $or: [
      { isActive: false },
      { validUntil: { $lt: now } }
    ]
  });

  // Total uses
  const usageStats = await Coupon.aggregate([
    {
      $group: {
        _id: null,
        totalUses: { $sum: '$usedCount' },
        totalDiscountGiven: { $sum: { $sum: '$usageHistory.discountAmount' } }
      }
    }
  ]);

  const stats = usageStats.length > 0 ? usageStats[0] : {
    totalUses: 0,
    totalDiscountGiven: 0
  };

  ApiResponse.success(
    res,
    {
      summary: {
        total: totalCoupons,
        active: activeCoupons,
        expired: expiredCoupons
      },
      usage: {
        totalUses: stats.totalUses,
        totalDiscountGiven: stats.totalDiscountGiven
      }
    },
    'Coupon statistics retrieved successfully'
  );
});

module.exports = {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats
};
