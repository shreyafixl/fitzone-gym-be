const asyncHandler = require('express-async-handler');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Conversion = require('../models/Conversion');

// Get all leads with pagination, filtering, and search
exports.getAllLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, source, interestLevel, assignedTo, search, sortBy = '-createdAt' } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (status) query.status = status;
  if (source) query.source = source;
  if (interestLevel) query.interestLevel = interestLevel;
  if (assignedTo) query.assignedTo = assignedTo;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Lead.countDocuments(query);
  const leads = await Lead.find(query)
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .populate('branch', 'branchName')
    .skip(skip)
    .limit(parseInt(limit))
    .sort(sortBy);

  res.status(200).json({
    success: true,
    data: leads,
    message: 'Leads retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single lead by ID
exports.getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .populate('convertedMemberId', 'name email phone')
    .populate('branch', 'branchName');

  if (!lead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found',
    });
  }

  // Get follow-ups for this lead
  const followUps = await FollowUp.find({ leadId: id })
    .populate('assignedTo', 'name email')
    .sort({ scheduledDate: -1 });

  // Get conversion if exists
  const conversion = await Conversion.findOne({ leadId: id })
    .populate('memberId', 'name email phone')
    .populate('convertedBy', 'name email');

  res.status(200).json({
    success: true,
    data: {
      ...lead.toObject(),
      followUps,
      conversion,
    },
    message: 'Lead retrieved successfully',
  });
});

// Create new lead
exports.createLead = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, source, status, interestLevel, membershipInterest, notes, assignedTo, branch } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !source) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'firstName', message: 'First name is required' },
        { field: 'lastName', message: 'Last name is required' },
        { field: 'email', message: 'Email is required' },
        { field: 'phone', message: 'Phone number is required' },
        { field: 'source', message: 'Lead source is required' },
      ],
    });
  }

  // Check if lead already exists
  const existingLead = await Lead.findOne({ $or: [{ email }, { phone }] });
  if (existingLead) {
    return res.status(400).json({
      success: false,
      message: 'Lead with this email or phone already exists',
    });
  }

  const newLead = await Lead.create({
    firstName,
    lastName,
    email,
    phone,
    source,
    status: status || 'new',
    interestLevel: interestLevel || 'medium',
    membershipInterest: membershipInterest || 'not_decided',
    notes,
    assignedTo,
    branch,
    createdBy: req.user._id,
  });

  const populatedLead = await Lead.findById(newLead._id)
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .populate('branch', 'branchName');

  res.status(201).json({
    success: true,
    data: populatedLead,
    message: 'Lead created successfully',
  });
});

// Update lead
exports.updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, source, status, interestLevel, membershipInterest, notes, assignedTo, branch } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found',
    });
  }

  // Check if email/phone already exists (excluding current)
  if (email && email !== lead.email) {
    const existingEmail = await Lead.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }
  }

  if (phone && phone !== lead.phone) {
    const existingPhone = await Lead.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists',
      });
    }
  }

  // Update fields
  if (firstName) lead.firstName = firstName;
  if (lastName) lead.lastName = lastName;
  if (email) lead.email = email;
  if (phone) lead.phone = phone;
  if (source) lead.source = source;
  if (status) {
    lead.status = status;
    if (status === 'contacted') lead.lastContactDate = new Date();
  }
  if (interestLevel) lead.interestLevel = interestLevel;
  if (membershipInterest) lead.membershipInterest = membershipInterest;
  if (notes) lead.notes = notes;
  if (assignedTo) lead.assignedTo = assignedTo;
  if (branch) lead.branch = branch;

  await lead.save();

  const updatedLead = await Lead.findById(id)
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email')
    .populate('branch', 'branchName');

  res.status(200).json({
    success: true,
    data: updatedLead,
    message: 'Lead updated successfully',
  });
});

// Delete lead
exports.deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Lead.findById(id);
  if (!lead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found',
    });
  }

  // Delete associated follow-ups and conversions
  await FollowUp.deleteMany({ leadId: id });
  await Conversion.deleteMany({ leadId: id });

  await Lead.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Lead deleted successfully',
  });
});

// Get leads by status
exports.getLeadsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const total = await Lead.countDocuments({ status });
  const leads = await Lead.find({ status })
    .populate('assignedTo', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: leads,
    message: 'Leads retrieved successfully',
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get leads dashboard metrics
exports.getLeadMetrics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateQuery = {};
  if (startDate || endDate) {
    dateQuery.createdAt = {};
    if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
    if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
  }

  const totalLeads = await Lead.countDocuments(dateQuery);
  const newLeads = await Lead.countDocuments({ ...dateQuery, status: 'new' });
  const contactedLeads = await Lead.countDocuments({ ...dateQuery, status: 'contacted' });
  const interestedLeads = await Lead.countDocuments({ ...dateQuery, status: 'interested' });
  const convertedLeads = await Lead.countDocuments({ ...dateQuery, status: 'converted' });
  const lostLeads = await Lead.countDocuments({ ...dateQuery, status: 'lost' });

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

  // Get leads by source
  const leadsBySource = await Lead.aggregate([
    { $match: dateQuery },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Get leads by interest level
  const leadsByInterest = await Lead.aggregate([
    { $match: dateQuery },
    { $group: { _id: '$interestLevel', count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalLeads,
      newLeads,
      contactedLeads,
      interestedLeads,
      convertedLeads,
      lostLeads,
      conversionRate,
      leadsBySource,
      leadsByInterest,
    },
    message: 'Lead metrics retrieved successfully',
  });
});

// Assign lead to user
exports.assignLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;

  if (!assignedTo) {
    return res.status(400).json({
      success: false,
      message: 'Assigned user ID is required',
    });
  }

  const lead = await Lead.findByIdAndUpdate(
    id,
    { assignedTo },
    { new: true, runValidators: true }
  )
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email');

  if (!lead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found',
    });
  }

  res.status(200).json({
    success: true,
    data: lead,
    message: 'Lead assigned successfully',
  });
});

// Mark lead as converted
exports.convertLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberId, membershipPlan, membershipAmount } = req.body;

  if (!memberId || !membershipPlan || membershipAmount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: [
        { field: 'memberId', message: 'Member ID is required' },
        { field: 'membershipPlan', message: 'Membership plan is required' },
        { field: 'membershipAmount', message: 'Membership amount is required' },
      ],
    });
  }

  const lead = await Lead.findById(id);
  if (!lead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found',
    });
  }

  // Calculate days to conversion
  const daysToConversion = Math.floor((new Date() - lead.createdAt) / (1000 * 60 * 60 * 24));

  // Create conversion record
  const conversion = await Conversion.create({
    leadId: id,
    memberId,
    membershipPlan,
    membershipAmount,
    conversionSource: lead.source,
    followUpCount: lead.followUpCount,
    daysToConversion,
    convertedBy: req.user._id,
    branch: lead.branch,
  });

  // Update lead status
  lead.status = 'converted';
  lead.convertedMemberId = memberId;
  lead.conversionDate = new Date();
  await lead.save();

  const populatedConversion = await Conversion.findById(conversion._id)
    .populate('leadId', 'firstName lastName email phone')
    .populate('memberId', 'name email phone')
    .populate('convertedBy', 'name email');

  res.status(201).json({
    success: true,
    data: populatedConversion,
    message: 'Lead converted successfully',
  });
});

// Mark lead as lost
exports.markLeadAsLost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found',
    });
  }

  lead.status = 'lost';
  if (reason) lead.notes = `Lost reason: ${reason}. ${lead.notes || ''}`;
  await lead.save();

  res.status(200).json({
    success: true,
    data: lead,
    message: 'Lead marked as lost',
  });
});
