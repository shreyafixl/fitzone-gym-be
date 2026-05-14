const asyncHandler = require('express-async-handler');
const FollowUp = require('../models/FollowUp');
const Enquiry = require('../models/Enquiry');

// Get all follow-ups with pagination and filtering
exports.getAllFollowUps = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, enquiryId, status, assignedTo, priority, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (enquiryId) query.enquiryId = enquiryId;
  if (status) query.status = status;
  if (assignedTo) query.assignedTo = assignedTo;
  if (priority) query.priority = priority;

  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = new Date(startDate);
    if (endDate) query.scheduledDate.$lte = new Date(endDate);
  }

  const total = await FollowUp.countDocuments(query);
  const followUps = await FollowUp.find(query)
    .populate({
      path: 'enquiryId',
      select: 'name email phone status',
    })
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ scheduledDate: 1 });

  res.status(200).json({
    success: true,
    data: followUps,
    message: 'Follow-ups retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single follow-up by ID
exports.getFollowUpById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const followUp = await FollowUp.findById(id)
    .populate({
      path: 'enquiryId',
      populate: 'assignedTo',
    })
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email');

  if (!followUp) {
    return res.status(404).json({
      success: false,
      message: 'Follow-up not found',
    });
  }

  res.status(200).json({
    success: true,
    data: followUp,
    message: 'Follow-up retrieved successfully',
  });
});

// Create new follow-up
exports.createFollowUp = asyncHandler(async (req, res) => {
  const { enquiryId, followUpType, scheduledDate, notes, assignedTo, priority } = req.body;

  // Validate required fields
  if (!enquiryId || !followUpType || !scheduledDate || !assignedTo) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'enquiryId', message: 'Enquiry ID is required' },
        { field: 'followUpType', message: 'Follow-up type is required' },
        { field: 'scheduledDate', message: 'Scheduled date is required' },
        { field: 'assignedTo', message: 'Assigned to is required' },
      ],
    });
  }

  // Check if enquiry exists
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  const newFollowUp = await FollowUp.create({
    enquiryId,
    followUpType,
    scheduledDate: new Date(scheduledDate),
    notes,
    assignedTo,
    priority: priority || 'medium',
    status: 'pending',
    outcome: 'pending',
    createdBy: req.user._id,
  });

  const populatedFollowUp = await FollowUp.findById(newFollowUp._id)
    .populate('enquiryId', 'name email phone')
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    data: populatedFollowUp,
    message: 'Follow-up created successfully',
  });
});

// Update follow-up
exports.updateFollowUp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { followUpType, scheduledDate, notes, assignedTo, priority, status, outcome, nextFollowUpDate } = req.body;

  const followUp = await FollowUp.findById(id);
  if (!followUp) {
    return res.status(404).json({
      success: false,
      message: 'Follow-up not found',
    });
  }

  // Update fields
  if (followUpType) followUp.followUpType = followUpType;
  if (scheduledDate) followUp.scheduledDate = new Date(scheduledDate);
  if (notes) followUp.notes = notes;
  if (assignedTo) followUp.assignedTo = assignedTo;
  if (priority) followUp.priority = priority;
  if (status) followUp.status = status;
  if (outcome) followUp.outcome = outcome;
  if (nextFollowUpDate) followUp.nextFollowUpDate = new Date(nextFollowUpDate);

  // If marking as completed, set completedDate
  if (status === 'completed' && !followUp.completedDate) {
    followUp.completedDate = new Date();
  }

  await followUp.save();

  const updatedFollowUp = await FollowUp.findById(id)
    .populate('enquiryId', 'name email phone')
    .populate('assignedTo', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedFollowUp,
    message: 'Follow-up updated successfully',
  });
});

// Delete follow-up
exports.deleteFollowUp = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const followUp = await FollowUp.findById(id);
  if (!followUp) {
    return res.status(404).json({
      success: false,
      message: 'Follow-up not found',
    });
  }

  await FollowUp.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Follow-up deleted successfully',
  });
});

// Mark follow-up as completed
exports.markAsCompleted = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { outcome, notes, nextFollowUpDate } = req.body;

  const followUp = await FollowUp.findById(id);
  if (!followUp) {
    return res.status(404).json({
      success: false,
      message: 'Follow-up not found',
    });
  }

  followUp.status = 'completed';
  followUp.completedDate = new Date();
  if (outcome) followUp.outcome = outcome;
  if (notes) followUp.notes = notes;
  if (nextFollowUpDate) followUp.nextFollowUpDate = new Date(nextFollowUpDate);

  await followUp.save();

  const updatedFollowUp = await FollowUp.findById(id)
    .populate('enquiryId', 'name email phone')
    .populate('assignedTo', 'name email phone');

  res.status(200).json({
    success: true,
    data: updatedFollowUp,
    message: 'Follow-up marked as completed',
  });
});

// Get pending follow-ups
exports.getPendingFollowUps = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, assignedTo } = req.query;
  const skip = (page - 1) * limit;

  let query = { status: 'pending' };
  if (assignedTo) query.assignedTo = assignedTo;

  const total = await FollowUp.countDocuments(query);
  const followUps = await FollowUp.find(query)
    .populate('enquiryId', 'name email phone status')
    .populate('assignedTo', 'name email phone')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ scheduledDate: 1 });

  res.status(200).json({
    success: true,
    data: followUps,
    message: 'Pending follow-ups retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get overdue follow-ups
exports.getOverdueFollowUps = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, assignedTo } = req.query;
  const skip = (page - 1) * limit;

  let query = {
    status: 'pending',
    scheduledDate: { $lt: new Date() },
  };
  if (assignedTo) query.assignedTo = assignedTo;

  const total = await FollowUp.countDocuments(query);
  const followUps = await FollowUp.find(query)
    .populate('enquiryId', 'name email phone status')
    .populate('assignedTo', 'name email phone')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ scheduledDate: 1 });

  res.status(200).json({
    success: true,
    data: followUps,
    message: 'Overdue follow-ups retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get follow-ups for enquiry
exports.getEnquiryFollowUps = asyncHandler(async (req, res) => {
  const { enquiryId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) {
    return res.status(404).json({
      success: false,
      message: 'Enquiry not found',
    });
  }

  const total = await FollowUp.countDocuments({ enquiryId });
  const followUps = await FollowUp.find({ enquiryId })
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ scheduledDate: 1 });

  res.status(200).json({
    success: true,
    data: followUps,
    message: 'Follow-ups retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Send reminder for follow-up
exports.sendReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const followUp = await FollowUp.findById(id);
  if (!followUp) {
    return res.status(404).json({
      success: false,
      message: 'Follow-up not found',
    });
  }

  // Mark reminder as sent
  followUp.reminderSent = true;
  followUp.reminderSentAt = new Date();
  await followUp.save();

  // TODO: Implement actual reminder sending (email/SMS)

  res.status(200).json({
    success: true,
    data: followUp,
    message: 'Reminder sent successfully',
  });
});

// Get follow-up statistics
exports.getFollowUpStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = {};
  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = new Date(startDate);
    if (endDate) query.scheduledDate.$lte = new Date(endDate);
  }

  const totalFollowUps = await FollowUp.countDocuments(query);
  const pendingFollowUps = await FollowUp.countDocuments({ ...query, status: 'pending' });
  const completedFollowUps = await FollowUp.countDocuments({ ...query, status: 'completed' });
  const cancelledFollowUps = await FollowUp.countDocuments({ ...query, status: 'cancelled' });
  const overdueFollowUps = await FollowUp.countDocuments({
    ...query,
    status: 'pending',
    scheduledDate: { $lt: new Date() },
  });

  const completionRate = totalFollowUps > 0 ? ((completedFollowUps / totalFollowUps) * 100).toFixed(2) : 0;

  res.status(200).json({
    success: true,
    data: {
      totalFollowUps,
      pendingFollowUps,
      completedFollowUps,
      cancelledFollowUps,
      overdueFollowUps,
      completionRate: parseFloat(completionRate),
    },
    message: 'Follow-up statistics retrieved successfully',
  });
});
