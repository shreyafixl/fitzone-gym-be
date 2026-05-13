const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const SuperAdmin = require('../models/SuperAdmin');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all support tickets with filtering and pagination
 * @route   GET /api/support
 * @access  Private (SuperAdmin, Admin)
 */
const getAllTickets = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    ticketStatus,
    ticketCategory,
    priorityLevel,
    assignedTo,
    createdBy,
    search,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  // Build query
  const query = {};

  if (ticketStatus) query.ticketStatus = ticketStatus;
  if (ticketCategory) query.ticketCategory = ticketCategory;
  if (priorityLevel) query.priorityLevel = priorityLevel;
  if (assignedTo) query['assignedTo.userId'] = assignedTo;
  if (createdBy) query['createdBy.userId'] = createdBy;

  // Search by title or description
  if (search) {
    query.$or = [
      { ticketTitle: { $regex: search, $options: 'i' } },
      { ticketDescription: { $regex: search, $options: 'i' } },
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build sort object
  const sortOrder = order === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // Execute query
  const tickets = await SupportTicket.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await SupportTicket.countDocuments(query);

  // Calculate statistics
  const stats = {
    totalTickets: total,
    openTickets: await SupportTicket.countDocuments({ ...query, ticketStatus: 'open' }),
    inProgressTickets: await SupportTicket.countDocuments({ ...query, ticketStatus: 'in-progress' }),
    resolvedTickets: await SupportTicket.countDocuments({ ...query, ticketStatus: 'resolved' }),
    closedTickets: await SupportTicket.countDocuments({ ...query, ticketStatus: 'closed' }),
    urgentTickets: await SupportTicket.countDocuments({ ...query, priorityLevel: 'urgent' }),
  };

  ApiResponse.success(res, {
    tickets,
    stats,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalTickets: total,
      limit: parseInt(limit),
    },
  }, 'Support tickets retrieved successfully');
});

/**
 * @desc    Get support ticket by ID
 * @route   GET /api/support/:id
 * @access  Private (SuperAdmin, Admin, Ticket Creator)
 */
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Check if user has access to this ticket
  const userId = req.user._id.toString();
  const isCreator = ticket.createdBy.userId.toString() === userId;
  const isAssigned = ticket.assignedTo.userId && ticket.assignedTo.userId.toString() === userId;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';

  if (!isCreator && !isAssigned && !isAdmin) {
    throw ApiError.forbidden('You do not have access to this ticket');
  }

  // Filter internal comments if user is not admin
  let ticketData = ticket.toObject();
  if (!isAdmin) {
    ticketData.comments = ticketData.comments.filter(comment => !comment.isInternal);
  }

  ApiResponse.success(res, ticketData, 'Support ticket retrieved successfully');
});

/**
 * @desc    Create new support ticket
 * @route   POST /api/support
 * @access  Private (All authenticated users)
 */
const createTicket = asyncHandler(async (req, res) => {
  const {
    ticketTitle,
    ticketDescription,
    ticketCategory,
    priorityLevel,
    attachments,
    tags,
  } = req.body;

  // Validate required fields
  if (!ticketTitle || !ticketDescription || !ticketCategory) {
    throw ApiError.badRequest('Please provide ticket title, description, and category');
  }

  // Get user model type
  let userModel = 'User';
  if (req.user.role === 'superadmin') {
    userModel = 'SuperAdmin';
  } else if (req.user.role === 'trainer') {
    userModel = 'Trainer';
  }

  // Create ticket
  const ticket = await SupportTicket.create({
    ticketTitle,
    ticketDescription,
    createdBy: {
      userId: req.user._id,
      userModel: userModel,
      userName: req.user.fullName,
      userEmail: req.user.email,
    },
    ticketCategory,
    priorityLevel: priorityLevel || 'medium',
    attachments: attachments || [],
    tags: tags || [],
    ticketStatus: 'open',
  });

  ApiResponse.created(res, ticket, 'Support ticket created successfully');
});

/**
 * @desc    Update support ticket
 * @route   PUT /api/support/:id
 * @access  Private (SuperAdmin, Admin, Ticket Creator)
 */
const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Check if user has permission to update
  const userId = req.user._id.toString();
  const isCreator = ticket.createdBy.userId.toString() === userId;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';

  if (!isCreator && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to update this ticket');
  }

  // Don't allow updating closed tickets
  if (ticket.ticketStatus === 'closed' && !isAdmin) {
    throw ApiError.badRequest('Cannot update closed ticket');
  }

  const {
    ticketTitle,
    ticketDescription,
    ticketCategory,
    priorityLevel,
    tags,
  } = req.body;

  // Update fields
  if (ticketTitle) ticket.ticketTitle = ticketTitle;
  if (ticketDescription) ticket.ticketDescription = ticketDescription;
  if (ticketCategory) ticket.ticketCategory = ticketCategory;
  if (tags) ticket.tags = tags;

  // Only admins can update priority
  if (priorityLevel && isAdmin) {
    await ticket.updatePriority(priorityLevel, {
      userId: req.user._id,
      userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'User',
      userName: req.user.fullName,
    });
  }

  // Add to history
  ticket.history.push({
    action: 'updated',
    performedBy: {
      userId: req.user._id,
      userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : (req.user.role === 'trainer' ? 'Trainer' : 'User'),
      userName: req.user.fullName,
    },
    details: 'Ticket details updated',
    timestamp: new Date(),
  });

  await ticket.save();

  ApiResponse.success(res, ticket, 'Support ticket updated successfully');
});

/**
 * @desc    Delete support ticket
 * @route   DELETE /api/support/:id
 * @access  Private (SuperAdmin)
 */
const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  await ticket.deleteOne();

  ApiResponse.success(res, null, 'Support ticket deleted successfully');
});

/**
 * @desc    Assign ticket to user
 * @route   POST /api/support/:id/assign
 * @access  Private (SuperAdmin, Admin)
 */
const assignTicket = asyncHandler(async (req, res) => {
  const { assignToUserId } = req.body;

  if (!assignToUserId) {
    throw ApiError.badRequest('Please provide user ID to assign');
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Find the user to assign (check SuperAdmin first, then User)
  let assignedUser = await SuperAdmin.findById(assignToUserId);
  let userModel = 'SuperAdmin';

  if (!assignedUser) {
    assignedUser = await User.findById(assignToUserId);
    userModel = 'User';
  }

  if (!assignedUser) {
    throw ApiError.notFound('User to assign not found');
  }

  await ticket.assignTicket(
    assignedUser._id,
    userModel,
    assignedUser.fullName,
    assignedUser.email,
    {
      userId: req.user._id,
      userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'User',
      userName: req.user.fullName,
    }
  );

  ApiResponse.success(res, ticket, 'Ticket assigned successfully');
});

/**
 * @desc    Update ticket status
 * @route   PATCH /api/support/:id/status
 * @access  Private (SuperAdmin, Admin, Assigned User)
 */
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!status) {
    throw ApiError.badRequest('Please provide status');
  }

  const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Check if user has permission
  const userId = req.user._id.toString();
  const isAssigned = ticket.assignedTo.userId && ticket.assignedTo.userId.toString() === userId;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';

  if (!isAssigned && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to update this ticket status');
  }

  await ticket.updateStatus(status, {
    userId: req.user._id,
    userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : (req.user.role === 'trainer' ? 'Trainer' : 'User'),
    userName: req.user.fullName,
  }, notes || '');

  ApiResponse.success(res, ticket, 'Ticket status updated successfully');
});

/**
 * @desc    Add comment to ticket
 * @route   POST /api/support/:id/comments
 * @access  Private (SuperAdmin, Admin, Ticket Creator, Assigned User)
 */
const addComment = asyncHandler(async (req, res) => {
  const { comment, isInternal } = req.body;

  if (!comment) {
    throw ApiError.badRequest('Please provide comment text');
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Check if user has access
  const userId = req.user._id.toString();
  const isCreator = ticket.createdBy.userId.toString() === userId;
  const isAssigned = ticket.assignedTo.userId && ticket.assignedTo.userId.toString() === userId;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';

  if (!isCreator && !isAssigned && !isAdmin) {
    throw ApiError.forbidden('You do not have access to comment on this ticket');
  }

  // Only admins can add internal comments
  const commentIsInternal = isAdmin && isInternal === true;

  await ticket.addComment(
    {
      userId: req.user._id,
      userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : (req.user.role === 'trainer' ? 'Trainer' : 'User'),
      userName: req.user.fullName,
    },
    comment,
    commentIsInternal
  );

  ApiResponse.success(res, ticket, 'Comment added successfully');
});

/**
 * @desc    Resolve ticket
 * @route   POST /api/support/:id/resolve
 * @access  Private (SuperAdmin, Admin, Assigned User)
 */
const resolveTicket = asyncHandler(async (req, res) => {
  const { resolutionNotes } = req.body;

  if (!resolutionNotes) {
    throw ApiError.badRequest('Please provide resolution notes');
  }

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Check if user has permission
  const userId = req.user._id.toString();
  const isAssigned = ticket.assignedTo.userId && ticket.assignedTo.userId.toString() === userId;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';

  if (!isAssigned && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to resolve this ticket');
  }

  if (ticket.ticketStatus === 'resolved' || ticket.ticketStatus === 'closed') {
    throw ApiError.badRequest('Ticket is already resolved or closed');
  }

  await ticket.resolveTicket(resolutionNotes, {
    userId: req.user._id,
    userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : (req.user.role === 'trainer' ? 'Trainer' : 'User'),
    userName: req.user.fullName,
  });

  ApiResponse.success(res, ticket, 'Ticket resolved successfully');
});

/**
 * @desc    Close ticket
 * @route   POST /api/support/:id/close
 * @access  Private (SuperAdmin, Admin)
 */
const closeTicket = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  if (ticket.ticketStatus === 'closed') {
    throw ApiError.badRequest('Ticket is already closed');
  }

  await ticket.closeTicket({
    userId: req.user._id,
    userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'User',
    userName: req.user.fullName,
  }, notes || '');

  ApiResponse.success(res, ticket, 'Ticket closed successfully');
});

/**
 * @desc    Reopen ticket
 * @route   POST /api/support/:id/reopen
 * @access  Private (SuperAdmin, Admin, Ticket Creator)
 */
const reopenTicket = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) {
    throw ApiError.notFound('Support ticket not found');
  }

  // Check if user has permission
  const userId = req.user._id.toString();
  const isCreator = ticket.createdBy.userId.toString() === userId;
  const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';

  if (!isCreator && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to reopen this ticket');
  }

  if (ticket.ticketStatus !== 'resolved' && ticket.ticketStatus !== 'closed') {
    throw ApiError.badRequest('Only resolved or closed tickets can be reopened');
  }

  await ticket.reopenTicket({
    userId: req.user._id,
    userModel: req.user.role === 'superadmin' ? 'SuperAdmin' : (req.user.role === 'trainer' ? 'Trainer' : 'User'),
    userName: req.user.fullName,
  }, reason || '');

  ApiResponse.success(res, ticket, 'Ticket reopened successfully');
});

/**
 * @desc    Get my tickets (created by current user)
 * @route   GET /api/support/my-tickets
 * @access  Private (All authenticated users)
 */
const getMyTickets = asyncHandler(async (req, res) => {
  const { status, category } = req.query;

  const query = { 'createdBy.userId': req.user._id };

  if (status) query.ticketStatus = status;
  if (category) query.ticketCategory = category;

  const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });

  ApiResponse.success(res, {
    tickets,
    totalTickets: tickets.length,
  }, 'Your tickets retrieved successfully');
});

/**
 * @desc    Get assigned tickets (assigned to current user)
 * @route   GET /api/support/assigned-to-me
 * @access  Private (SuperAdmin, Admin)
 */
const getAssignedToMe = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;

  const query = { 'assignedTo.userId': req.user._id };

  if (status) query.ticketStatus = status;
  if (priority) query.priorityLevel = priority;

  const tickets = await SupportTicket.find(query).sort({ priorityLevel: -1, createdAt: -1 });

  ApiResponse.success(res, {
    tickets,
    totalTickets: tickets.length,
  }, 'Assigned tickets retrieved successfully');
});

/**
 * @desc    Get ticket statistics
 * @route   GET /api/support/stats
 * @access  Private (SuperAdmin, Admin)
 */
const getTicketStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, category } = req.query;

  // Build base query
  const baseQuery = {};
  if (startDate || endDate) {
    baseQuery.createdAt = {};
    if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
    if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
  }
  if (category) baseQuery.ticketCategory = category;

  // Get statistics
  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
    byCategory,
    byPriority,
    avgResponseTime,
    avgResolutionTime,
  ] = await Promise.all([
    SupportTicket.countDocuments(baseQuery),
    SupportTicket.countDocuments({ ...baseQuery, ticketStatus: 'open' }),
    SupportTicket.countDocuments({ ...baseQuery, ticketStatus: 'in-progress' }),
    SupportTicket.countDocuments({ ...baseQuery, ticketStatus: 'resolved' }),
    SupportTicket.countDocuments({ ...baseQuery, ticketStatus: 'closed' }),
    SupportTicket.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$ticketCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SupportTicket.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$priorityLevel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SupportTicket.aggregate([
      { $match: { ...baseQuery, responseTime: { $ne: null } } },
      { $group: { _id: null, avgTime: { $avg: '$responseTime' } } },
    ]),
    SupportTicket.aggregate([
      { $match: { ...baseQuery, resolutionTime: { $ne: null } } },
      { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } },
    ]),
  ]);

  ApiResponse.success(res, {
    totalTickets,
    byStatus: {
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      closed: closedTickets,
    },
    byCategory: byCategory.map(item => ({
      category: item._id,
      count: item.count,
    })),
    byPriority: byPriority.map(item => ({
      priority: item._id,
      count: item.count,
    })),
    averageResponseTime: avgResponseTime[0] ? Math.round(avgResponseTime[0].avgTime) : 0,
    averageResolutionTime: avgResolutionTime[0] ? Math.round(avgResolutionTime[0].avgTime) : 0,
  }, 'Ticket statistics retrieved successfully');
});

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  assignTicket,
  updateTicketStatus,
  addComment,
  resolveTicket,
  closeTicket,
  reopenTicket,
  getMyTickets,
  getAssignedToMe,
  getTicketStats,
};
