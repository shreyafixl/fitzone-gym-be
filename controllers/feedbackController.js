const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Feedback = require('../models/Feedback');

/**
 * @desc    Get all feedback
 * @route   GET /api/feedback
 * @access  Private (SuperAdmin, Admin)
 */
const getAllFeedback = asyncHandler(async (req, res) => {
  const { rating, search, page = 1, limit = 10 } = req.query;

  // Build filter
  const filter = {};
  if (rating) {
    filter.rating = parseInt(rating);
  }
  if (search) {
    filter.$or = [
      { userName: { $regex: search, $options: 'i' } },
      { comment: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const feedback = await Feedback.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments(filter);

  ApiResponse.success(res, {
    feedback,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  }, 'Feedback retrieved successfully');
});

/**
 * @desc    Get feedback by ID
 * @route   GET /api/feedback/:id
 * @access  Private (SuperAdmin, Admin)
 */
const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw ApiError.notFound('Feedback not found');
  }

  ApiResponse.success(res, feedback, 'Feedback retrieved successfully');
});

/**
 * @desc    Get feedback statistics
 * @route   GET /api/feedback/stats
 * @access  Private (SuperAdmin, Admin)
 */
const getFeedbackStats = asyncHandler(async (req, res) => {
  const allFeedback = await Feedback.find();

  if (allFeedback.length === 0) {
    return ApiResponse.success(res, {
      avgRating: 0,
      totalReviews: 0,
      fiveStarReviews: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    }, 'Feedback statistics retrieved successfully');
  }

  const avgRating = (allFeedback.reduce((a, b) => a + b.rating, 0) / allFeedback.length).toFixed(1);
  const ratingDistribution = {
    5: allFeedback.filter(f => f.rating === 5).length,
    4: allFeedback.filter(f => f.rating === 4).length,
    3: allFeedback.filter(f => f.rating === 3).length,
    2: allFeedback.filter(f => f.rating === 2).length,
    1: allFeedback.filter(f => f.rating === 1).length,
  };

  ApiResponse.success(res, {
    avgRating,
    totalReviews: allFeedback.length,
    fiveStarReviews: ratingDistribution[5],
    ratingDistribution,
  }, 'Feedback statistics retrieved successfully');
});

/**
 * @desc    Get feedback by rating
 * @route   GET /api/feedback/rating/:rating
 * @access  Private (SuperAdmin, Admin)
 */
const getFeedbackByRating = asyncHandler(async (req, res) => {
  const { rating } = req.params;

  if (rating < 1 || rating > 5) {
    throw ApiError.badRequest('Rating must be between 1 and 5');
  }

  const feedback = await Feedback.find({ rating: parseInt(rating) })
    .sort({ createdAt: -1 });

  ApiResponse.success(res, {
    feedback,
    count: feedback.length,
  }, 'Feedback retrieved successfully');
});

/**
 * @desc    Delete feedback
 * @route   DELETE /api/feedback/:id
 * @access  Private (SuperAdmin, Admin)
 */
const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByIdAndDelete(req.params.id);

  if (!feedback) {
    throw ApiError.notFound('Feedback not found');
  }

  ApiResponse.success(res, null, 'Feedback deleted successfully');
});

/**
 * @desc    Export feedback as CSV
 * @route   GET /api/feedback/export
 * @access  Private (SuperAdmin, Admin)
 */
const exportFeedback = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;

  const feedback = await Feedback.find().sort({ createdAt: -1 });

  if (format === 'csv') {
    // Create CSV content
    const headers = ['User', 'Rating', 'Category', 'Comment', 'Date'];
    const rows = feedback.map(f => [
      f.userName,
      f.rating,
      f.category,
      `"${(f.comment || '').replace(/"/g, '""')}"`,
      new Date(f.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(feedback);
  } else {
    throw ApiError.badRequest('Invalid export format. Use csv or json');
  }
});

module.exports = {
  getAllFeedback,
  getFeedbackById,
  getFeedbackStats,
  getFeedbackByRating,
  deleteFeedback,
  exportFeedback,
};
