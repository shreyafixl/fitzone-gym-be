const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Content = require('../models/Content');

/**
 * @desc    Get all content
 * @route   GET /api/superadmin/content
 * @access  Private (SuperAdmin, Admin)
 */
const getAllContent = asyncHandler(async (req, res) => {
  const { type, status, search, page = 1, limit = 10 } = req.query;

  // Build filter
  const filter = {};
  if (type && type !== 'all') {
    filter.type = type;
  }
  if (status && status !== 'all') {
    filter.status = status;
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const content = await Content.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Content.countDocuments(filter);

  ApiResponse.success(res, {
    content,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  }, 'Content retrieved successfully');
});

/**
 * @desc    Get content by ID
 * @route   GET /api/superadmin/content/:id
 * @access  Private (SuperAdmin, Admin)
 */
const getContentById = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  ApiResponse.success(res, content, 'Content retrieved successfully');
});

/**
 * @desc    Create content
 * @route   POST /api/superadmin/content
 * @access  Private (SuperAdmin, Admin)
 */
const createContent = asyncHandler(async (req, res) => {
  const { title, description, type, content: contentBody, status = 'draft' } = req.body;

  // Validate required fields
  if (!title || !description || !type) {
    throw ApiError.badRequest('Please provide title, description, and type');
  }

  const content = await Content.create({
    title,
    description,
    type,
    content: contentBody || '',
    status,
    createdBy: req.user._id,
  });

  ApiResponse.created(res, content, 'Content created successfully');
});

/**
 * @desc    Update content
 * @route   PUT /api/superadmin/content/:id
 * @access  Private (SuperAdmin, Admin)
 */
const updateContent = asyncHandler(async (req, res) => {
  const { title, description, type, content: contentBody, status } = req.body;

  const content = await Content.findById(req.params.id);

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  // Update fields
  if (title) content.title = title;
  if (description) content.description = description;
  if (type) content.type = type;
  if (contentBody) content.content = contentBody;
  if (status) content.status = status;

  await content.save();

  ApiResponse.success(res, content, 'Content updated successfully');
});

/**
 * @desc    Delete content
 * @route   DELETE /api/superadmin/content/:id
 * @access  Private (SuperAdmin, Admin)
 */
const deleteContent = asyncHandler(async (req, res) => {
  const content = await Content.findByIdAndDelete(req.params.id);

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  ApiResponse.success(res, null, 'Content deleted successfully');
});

/**
 * @desc    Publish content
 * @route   PATCH /api/superadmin/content/:id/publish
 * @access  Private (SuperAdmin, Admin)
 */
const publishContent = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  content.status = 'published';
  content.publishedAt = new Date();
  await content.save();

  ApiResponse.success(res, content, 'Content published successfully');
});

/**
 * @desc    Unpublish content
 * @route   PATCH /api/superadmin/content/:id/unpublish
 * @access  Private (SuperAdmin, Admin)
 */
const unpublishContent = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    throw ApiError.notFound('Content not found');
  }

  content.status = 'draft';
  await content.save();

  ApiResponse.success(res, content, 'Content unpublished successfully');
});

module.exports = {
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
};
