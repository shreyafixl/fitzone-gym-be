const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all support tickets with filtering
 * @route   GET /api/admin/support
 * @access  Private (Admin)
 */
const getAllTickets = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    ticketStatus,
    priorityLevel,
    ticketCategory,
    assignedTo,
    createdBy,
    search,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (ticketStatus) {
    query.ticketStatus = ticketStatus;
  }

  if (priorityLevel) {
    query.priorityLevel = priorityLevel;
  }

  if (ticketCategory) {
    query.ticketCategory = ticketCategory;
  }

  if (assignedTo) {
    query['assignedTo.userId'] = assignedTo;
  }

  if (createdBy) {
    query['createdBy.userId'] = createdBy;
  }

  // Search by title or description
  if (search) {
    query.$or = [
      { ticketTitle: { $regex: search, $options: 'i' } },
      { ticketDescription: { $regex: search, $options: 'i' } },
      { 'createdBy.userName': { $regex: search, $options: 'i' } },
      { 'createdBy.userEmail': { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  // Execute query
  const tickets = await SupportTicket.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const totalTickets = await SupportTicket.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(totalTickets / limitNum);
  const hasMore = pageNum < totalPages;

  ApiResponse.success(
    res,
    {
      tickets,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTickets,
        limit: limitNum,
        hasMore
      }
    },
    'Support tickets retrieved successfully'
  );
});

/**
 * @desc    Create support ticket
 * @route   POST /api/admin/support
 * @access  Private (Admin)
 */
const createTicket = asyncHandler(async (req, res) => {
  const {
    ticketTitle,
    ticketDescription,
    createdByUserId,
    ticketCategory,
    priorityLevel,
    attachments,
    tags
  } = req.body;

  // Validate required fields
  if (!ticketTitle || !ticketDescription || !createdByUserId || !ticketCategory) {
    throw ApiError.badRequest('Please provide all required fields: ticketTitle, ticketDescription, createdByUserId, ticketCategory');
  }

  // Verify user exists
  const user = await User.findById(createdByUserId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Create ticket
  const ticket = await SupportTicket.create({
    ticketTitle,
    ticketDescription,
    createdBy: {
      userId: createdByUserId,
      userModel: 'User',
      userName: user.fullName,
      userEmail: user.email
    },
    ticketCategory,
    priorityLevel: priorityLevel || 'medium',
    attachments: attachments || [],
    tags: tags || []
  });

  ApiResponse.success(
    res,
    { ticket },
    'Support ticket created successfully',
    201
  );
});

/**
 * @desc    Update support ticket
 * @route   PUT /api/admin/support/:id
 * @access  Private (Admin)
 */
const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    ticketTitle,
    ticketDescription,
    ticketCategory,
    priorityLevel,
    ticketStatus,
    assignedToUserId,
    resolutionNotes,
    tags
  } = req.body;

  // Find ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Prepare performed by info
  const performedBy = {
    userId: req.user.id,
    userModel: 'Admin',
    userName: req.user.email
  };

  // Update basic fields
  if (ticketTitle) ticket.ticketTitle = ticketTitle;
  if (ticketDescription) ticket.ticketDescription = ticketDescription;
  if (ticketCategory) ticket.ticketCategory = ticketCategory;
  if (tags) ticket.tags = tags;
  if (resolutionNotes) ticket.resolutionNotes = resolutionNotes;

  // Update priority if changed
  if (priorityLevel && priorityLevel !== ticket.priorityLevel) {
    await ticket.updatePriority(priorityLevel, performedBy);
  }

  // Update status if changed
  if (ticketStatus && ticketStatus !== ticket.ticketStatus) {
    await ticket.updateStatus(ticketStatus, performedBy);
  }

  // Assign ticket if assignedToUserId provided
  if (assignedToUserId) {
    const assignedUser = await User.findById(assignedToUserId);
    if (!assignedUser) {
      throw ApiError.notFound('Assigned user not found');
    }

    await ticket.assignTicket(
      assignedToUserId,
      'User',
      assignedUser.fullName,
      assignedUser.email,
      performedBy
    );
  }

  // Save other changes
  await ticket.save();

  // Get updated ticket
  const updatedTicket = await SupportTicket.findById(id);

  ApiResponse.success(
    res,
    { ticket: updatedTicket },
    'Support ticket updated successfully'
  );
});

/**
 * @desc    Delete support ticket
 * @route   DELETE /api/admin/support/:id
 * @access  Private (Admin)
 */
const deleteTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find and delete ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Only allow deletion of closed tickets
  if (ticket.ticketStatus !== 'closed') {
    throw ApiError.badRequest('Only closed tickets can be deleted. Please close the ticket first.');
  }

  await SupportTicket.findByIdAndDelete(id);

  ApiResponse.success(
    res,
    { ticketId: id },
    'Support ticket deleted successfully'
  );
});

/**
 * @desc    Get ticket by ID
 * @route   GET /api/admin/support/:id
 * @access  Private (Admin)
 */
const getTicketById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await SupportTicket.findById(id).lean();

  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  ApiResponse.success(
    res,
    { ticket },
    'Support ticket retrieved successfully'
  );
});

/**
 * @desc    Assign ticket to user
 * @route   POST /api/admin/support/:id/assign
 * @access  Private (Admin)
 */
const assignTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedToUserId } = req.body;

  // Validate required fields
  if (!assignedToUserId) {
    throw ApiError.badRequest('Please provide assignedToUserId');
  }

  // Find ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Verify assigned user exists
  const assignedUser = await User.findById(assignedToUserId);
  if (!assignedUser) {
    throw ApiError.notFound('Assigned user not found');
  }

  // Prepare performed by info
  const performedBy = {
    userId: req.user.id,
    userModel: 'Admin',
    userName: req.user.email
  };

  // Assign ticket
  await ticket.assignTicket(
    assignedToUserId,
    'User',
    assignedUser.fullName,
    assignedUser.email,
    performedBy
  );

  // Get updated ticket
  const updatedTicket = await SupportTicket.findById(id);

  ApiResponse.success(
    res,
    { ticket: updatedTicket },
    'Ticket assigned successfully'
  );
});

/**
 * @desc    Add comment to ticket
 * @route   POST /api/admin/support/:id/comment
 * @access  Private (Admin)
 */
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment, isInternal } = req.body;

  // Validate required fields
  if (!comment) {
    throw ApiError.badRequest('Please provide comment');
  }

  // Find ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Prepare comment by info
  const commentBy = {
    userId: req.user.id,
    userModel: 'Admin',
    userName: req.user.email
  };

  // Add comment
  await ticket.addComment(commentBy, comment, isInternal || false);

  // Get updated ticket
  const updatedTicket = await SupportTicket.findById(id);

  ApiResponse.success(
    res,
    { ticket: updatedTicket },
    'Comment added successfully'
  );
});

/**
 * @desc    Resolve ticket
 * @route   POST /api/admin/support/:id/resolve
 * @access  Private (Admin)
 */
const resolveTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resolutionNotes } = req.body;

  // Validate required fields
  if (!resolutionNotes) {
    throw ApiError.badRequest('Please provide resolutionNotes');
  }

  // Find ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Prepare performed by info
  const performedBy = {
    userId: req.user.id,
    userModel: 'Admin',
    userName: req.user.email
  };

  // Resolve ticket
  await ticket.resolveTicket(resolutionNotes, performedBy);

  // Get updated ticket
  const updatedTicket = await SupportTicket.findById(id);

  ApiResponse.success(
    res,
    { ticket: updatedTicket },
    'Ticket resolved successfully'
  );
});

/**
 * @desc    Close ticket
 * @route   POST /api/admin/support/:id/close
 * @access  Private (Admin)
 */
const closeTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  // Find ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Prepare performed by info
  const performedBy = {
    userId: req.user.id,
    userModel: 'Admin',
    userName: req.user.email
  };

  // Close ticket
  await ticket.closeTicket(performedBy, notes || '');

  // Get updated ticket
  const updatedTicket = await SupportTicket.findById(id);

  ApiResponse.success(
    res,
    { ticket: updatedTicket },
    'Ticket closed successfully'
  );
});

/**
 * @desc    Reopen ticket
 * @route   POST /api/admin/support/:id/reopen
 * @access  Private (Admin)
 */
const reopenTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // Find ticket
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Prepare performed by info
  const performedBy = {
    userId: req.user.id,
    userModel: 'Admin',
    userName: req.user.email
  };

  // Reopen ticket
  await ticket.reopenTicket(performedBy, reason || '');

  // Get updated ticket
  const updatedTicket = await SupportTicket.findById(id);

  ApiResponse.success(
    res,
    { ticket: updatedTicket },
    'Ticket reopened successfully'
  );
});

/**
 * @desc    Get ticket statistics
 * @route   GET /api/admin/support/stats
 * @access  Private (Admin)
 */
const getTicketStats = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

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

  // Total tickets
  const totalTickets = await SupportTicket.countDocuments();
  const openTickets = await SupportTicket.countDocuments({ ticketStatus: 'open' });
  const inProgressTickets = await SupportTicket.countDocuments({ ticketStatus: 'in-progress' });
  const resolvedTickets = await SupportTicket.countDocuments({ ticketStatus: 'resolved' });
  const closedTickets = await SupportTicket.countDocuments({ ticketStatus: 'closed' });

  // New tickets in period
  const newTickets = await SupportTicket.countDocuments({
    createdAt: { $gte: startDate }
  });

  // Tickets by priority
  const urgentTickets = await SupportTicket.countDocuments({ 
    priorityLevel: 'urgent',
    ticketStatus: { $in: ['open', 'in-progress'] }
  });
  const highPriorityTickets = await SupportTicket.countDocuments({ 
    priorityLevel: 'high',
    ticketStatus: { $in: ['open', 'in-progress'] }
  });

  // Tickets by category
  const ticketsByCategory = await SupportTicket.aggregate([
    {
      $group: {
        _id: '$ticketCategory',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Average response time
  const avgResponseTimeResult = await SupportTicket.aggregate([
    {
      $match: {
        responseTime: { $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);

  const avgResponseTime = avgResponseTimeResult.length > 0 
    ? Math.round(avgResponseTimeResult[0].avgResponseTime)
    : 0;

  // Average resolution time
  const avgResolutionTimeResult = await SupportTicket.aggregate([
    {
      $match: {
        resolutionTime: { $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        avgResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);

  const avgResolutionTime = avgResolutionTimeResult.length > 0 
    ? Math.round(avgResolutionTimeResult[0].avgResolutionTime)
    : 0;

  // Resolution rate
  const resolutionRate = totalTickets > 0 
    ? ((resolvedTickets + closedTickets) / totalTickets * 100).toFixed(2)
    : 0;

  ApiResponse.success(
    res,
    {
      period,
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        newTickets,
        urgentTickets,
        highPriorityTickets,
        resolutionRate: parseFloat(resolutionRate)
      },
      performance: {
        averageResponseTime: avgResponseTime,
        averageResolutionTime: avgResolutionTime
      },
      byCategory: ticketsByCategory.map(item => ({
        category: item._id,
        count: item.count,
        percentage: ((item.count / totalTickets) * 100).toFixed(2)
      }))
    },
    'Ticket statistics retrieved successfully'
  );
});

module.exports = {
  getAllTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketById,
  assignTicket,
  addComment,
  resolveTicket,
  closeTicket,
  reopenTicket,
  getTicketStats,
};
