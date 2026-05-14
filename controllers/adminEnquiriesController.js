const asyncHandler = require('express-async-handler');
const Enquiry = require('../models/Enquiry');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');

// Get all enquiries with pagination, filtering, and search
exports.getAllEnquiries = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, priority, assignedTo, conversionStatus, search, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;
  if (conversionStatus) query.conversionStatus = conversionStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const total = await Enquiry.countDocuments(query);
  const enquiries = await Enquiry.find(query)
    .populate('assignedTo', 'name email phone')
    .populate('convertedMemberId', 'name email phone')
    .populate('notes.createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: enquiries,
    message: 'Enquiries retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single enquiry by ID
exports.getEnquiryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const enquiry = await Enquiry.findById(id)
    .populate('assignedTo', 'name email phone')
    .populate('convertedMemberId', 'name email phone')
    .populate('notes.createdBy', 'name email');

  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  // Get follow-ups for this enquiry
  const followUps = await FollowUp.find({ enquiryId: id })
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .sort({ scheduledDate: 1 });

  res.status(200).json({
    success: true,
    data: {
      ...enquiry.toObject(),
      followUps,
    },
    message: 'Enquiry retrieved successfully',
  });
});

// Create new enquiry
exports.createEnquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, source, interestedIn, membershipPlan, message } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !interestedIn) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email is required' },
        { field: 'phone', message: 'Phone is required' },
        { field: 'interestedIn', message: 'Interested in is required' },
      ],
    });
  }

  // Check if enquiry already exists
  const existingEnquiry = await Enquiry.findOne({ email });
  if (existingEnquiry) {
    return res.status(400).json({
      success: false,
      message: 'Enquiry with this email already exists',
    });
  }

  const newEnquiry = await Enquiry.create({
    name,
    email,
    phone,
    source: source || 'website',
    interestedIn,
    membershipPlan,
    message,
    status: 'new',
    priority: 'medium',
    conversionStatus: 'pending',
  });

  const populatedEnquiry = await Enquiry.findById(newEnquiry._id)
    .populate('assignedTo', 'name email phone');

  res.status(201).json({
    success: true,
    data: populatedEnquiry,
    message: 'Enquiry created successfully',
  });
});

// Update enquiry
exports.updateEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status, priority, assignedTo, interestedIn, membershipPlan, message, tags } = req.body;

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  // Check if email is being changed and if it already exists
  if (email && email !== enquiry.email) {
    const existingEnquiry = await Enquiry.findOne({ email });
    if (existingEnquiry) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }
  }

  // Update fields
  if (name) enquiry.name = name;
  if (email) enquiry.email = email;
  if (phone) enquiry.phone = phone;
  if (status) enquiry.status = status;
  if (priority) enquiry.priority = priority;
  if (assignedTo) enquiry.assignedTo = assignedTo;
  if (interestedIn) enquiry.interestedIn = interestedIn;
  if (membershipPlan) enquiry.membershipPlan = membershipPlan;
  if (message) enquiry.message = message;
  if (tags) enquiry.tags = tags;

  await enquiry.save();

  const updatedEnquiry = await Enquiry.findById(id)
    .populate('assignedTo', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedEnquiry,
    message: 'Enquiry updated successfully',
  });
});

// Delete enquiry
exports.deleteEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  // Delete associated follow-ups
  await FollowUp.deleteMany({ enquiryId: id });

  await Enquiry.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Enquiry deleted successfully',
  });
});

// Add note to enquiry
exports.addNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: 'Note content is required',
    });
  }

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  enquiry.notes.push({
    content,
    createdBy: req.user._id,
    createdAt: new Date(),
  });

  await enquiry.save();

  const updatedEnquiry = await Enquiry.findById(id)
    .populate('notes.createdBy', 'name email');

  res.status(200).json({
    success: true,
    data: updatedEnquiry,
    message: 'Note added successfully',
  });
});

// Mark enquiry as converted
exports.markAsConverted = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { convertedMemberId, conversionValue } = req.body;

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  enquiry.status = 'converted';
  enquiry.conversionStatus = 'converted';
  enquiry.convertedMemberId = convertedMemberId;
  enquiry.conversionDate = new Date();
  enquiry.conversionValue = conversionValue || 0;

  await enquiry.save();

  const updatedEnquiry = await Enquiry.findById(id)
    .populate('convertedMemberId', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedEnquiry,
    message: 'Enquiry marked as converted',
  });
});

// Get enquiry statistics
exports.getEnquiryStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const totalEnquiries = await Enquiry.countDocuments(query);
  const newEnquiries = await Enquiry.countDocuments({ ...query, status: 'new' });
  const contactedEnquiries = await Enquiry.countDocuments({ ...query, status: 'contacted' });
  const interestedEnquiries = await Enquiry.countDocuments({ ...query, status: 'interested' });
  const convertedEnquiries = await Enquiry.countDocuments({ ...query, conversionStatus: 'converted' });
  const lostEnquiries = await Enquiry.countDocuments({ ...query, status: 'lost' });

  const conversionRate = totalEnquiries > 0 ? ((convertedEnquiries / totalEnquiries) * 100).toFixed(2) : 0;

  const totalConversionValue = await Enquiry.aggregate([
    { $match: { ...query, conversionStatus: 'converted' } },
    { $group: { _id: null, total: { $sum: '$conversionValue' } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalEnquiries,
      newEnquiries,
      contactedEnquiries,
      interestedEnquiries,
      convertedEnquiries,
      lostEnquiries,
      conversionRate: parseFloat(conversionRate),
      totalConversionValue: totalConversionValue[0]?.total || 0,
    },
    message: 'Enquiry statistics retrieved successfully',
  });
});

// Get enquiries by status
exports.getEnquiriesByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const total = await Enquiry.countDocuments({ status });
  const enquiries = await Enquiry.find({ status })
    .populate('assignedTo', 'name email phone')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: enquiries,
    message: `Enquiries with status ${status} retrieved successfully`,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Assign enquiry to staff
exports.assignEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;

  if (!assignedTo) {
    return res.status(400).json({
      success: false,
      message: 'Assigned to is required',
    });
  }

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  enquiry.assignedTo = assignedTo;
  await enquiry.save();

  const updatedEnquiry = await Enquiry.findById(id)
    .populate('assignedTo', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedEnquiry,
    message: 'Enquiry assigned successfully',
  });
});
