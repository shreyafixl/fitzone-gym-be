const Discount = require('../models/Discount');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all discounts with filtering and pagination
 * @route   GET /api/admin/discounts
 * @access  Private (Admin)
 */
const getAllDiscounts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    category = '',
    isActive,
    sortBy = 'priority',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (category) {
    query.category = category;
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
  const discounts = await Discount.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalDiscounts = await Discount.countDocuments(query);

  // Get summary
  const activeDiscounts = await Discount.countDocuments({ isActive: true });
  const expiredDiscounts = await Discount.countDocuments({ isActive: false });

  // Calculate pagination info
  const totalPages = Math.ceil(totalDiscounts / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      discounts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        total: totalDiscounts,
        limit: limitNum,
        hasMore
      },
      summary: {
        total: totalDiscounts,
        active: activeDiscounts,
        expired: expiredDiscounts
      }
    },
    'Discounts retrieved successfully'
  );
});

/**
 * @desc    Get discount by ID
 * @route   GET /api/admin/discounts/:id
 * @access  Private (Admin)
 */
const getDiscountById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const discount = await Discount.findById(id).lean();

  if (!discount) {
    throw ApiError.notFound('Discount not found');
  }

  ApiResponse.success(
    res,
    { discount },
    'Discount retrieved successfully'
  );
});

/**
 * @desc    Create new discount
 * @route   POST /api/admin/discounts
 * @access  Private (Admin)
 */
const createDiscount = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    discountType,
    discountValue,
    maxDiscount,
    category,
    applicableTo,
    applicableItems,
    applicableMembers,
    minPurchaseAmount,
    maxUses,
    validFrom,
    validUntil,
    priority
  } = req.body;

  // Validate required fields
  if (!name || !discountType || discountValue === undefined || !validFrom || !validUntil) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Create discount
  const discount = await Discount.create({
    name,
    description,
    discountType,
    discountValue,
    maxDiscount,
    category: category || 'promotional',
    applicableTo: applicableTo || 'all_members',
    applicableItems: applicableItems || [],
    applicableMembers: applicableMembers || [],
    minPurchaseAmount: minPurchaseAmount || 0,
    maxUses,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    priority: priority || 0,
    createdBy: req.user.id,
    createdByModel: 'Admin'
  });

  ApiResponse.success(
    res,
    { discount },
    'Discount created successfully',
    201
  );
});

/**
 * @desc    Update discount
 * @route   PUT /api/admin/discounts/:id
 * @access  Private (Admin)
 */
const updateDiscount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find discount
  const discount = await Discount.findById(id);
  if (!discount) {
    throw ApiError.notFound('Discount not found');
  }

  // Update discount
  const updatedDiscount = await Discount.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  ApiResponse.success(
    res,
    { discount: updatedDiscount },
    'Discount updated successfully'
  );
});

/**
 * @desc    Delete discount
 * @route   DELETE /api/admin/discounts/:id
 * @access  Private (Admin)
 */
const deleteDiscount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find discount
  const discount = await Discount.findById(id);
  if (!discount) {
    throw ApiError.notFound('Discount not found');
  }

  // Delete discount
  await Discount.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { discountId: id },
    'Discount deleted successfully'
  );
});

/**
 * @desc    Get discount statistics
 * @route   GET /api/admin/discounts/stats
 * @access  Private (Admin)
 */
const getDiscountStats = asyncHandler(async (req, res) => {
  const now = new Date();

  const totalDiscounts = await Discount.countDocuments();
  const activeDiscounts = await Discount.countDocuments({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });
  const expiredDiscounts = await Discount.countDocuments({
    $or: [
      { isActive: false },
      { validUntil: { $lt: now } }
    ]
  });

  // Discounts by category
  const byCategory = await Discount.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Total uses
  const usageStats = await Discount.aggregate([
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
        total: totalDiscounts,
        active: activeDiscounts,
        expired: expiredDiscounts
      },
      byCategory,
      usage: {
        totalUses: stats.totalUses,
        totalDiscountGiven: stats.totalDiscountGiven
      }
    },
    'Discount statistics retrieved successfully'
  );
});

module.exports = {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getDiscountStats
};
