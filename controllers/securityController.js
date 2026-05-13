const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all audit logs with filtering and pagination
 * @route   GET /api/security/audit-logs
 * @access  Private (SuperAdmin)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    actionType,
    moduleName,
    userId,
    ipAddress,
    success,
    startDate,
    endDate,
    search,
  } = req.query;

  // Build query
  const query = {};

  if (actionType) query.actionType = actionType;
  if (moduleName) query.moduleName = moduleName;
  if (userId) query['performedBy.userId'] = userId;
  if (ipAddress) query.ipAddress = ipAddress;
  if (success !== undefined) query.success = success === 'true';

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Search by description or user name
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { 'performedBy.userName': { $regex: search, $options: 'i' } },
      { 'performedBy.userEmail': { $regex: search, $options: 'i' } },
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await AuditLog.countDocuments(query);

  ApiResponse.success(res, {
    logs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalLogs: total,
      limit: parseInt(limit),
    },
  }, 'Audit logs retrieved successfully');
});

/**
 * @desc    Get audit log by ID
 * @route   GET /api/security/audit-logs/:id
 * @access  Private (SuperAdmin)
 */
const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id);

  if (!log) {
    throw ApiError.notFound('Audit log not found');
  }

  ApiResponse.success(res, log, 'Audit log retrieved successfully');
});

/**
 * @desc    Get audit logs by user
 * @route   GET /api/security/audit-logs/user/:userId
 * @access  Private (SuperAdmin)
 */
const getAuditLogsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 100, skip = 0, actionType, moduleName, startDate, endDate } = req.query;

  const logs = await AuditLog.getByUser(userId, {
    limit: parseInt(limit),
    skip: parseInt(skip),
    actionType,
    moduleName,
    startDate,
    endDate,
  });

  ApiResponse.success(res, {
    logs,
    totalLogs: logs.length,
  }, 'User audit logs retrieved successfully');
});

/**
 * @desc    Get audit logs by IP address
 * @route   GET /api/security/audit-logs/ip/:ipAddress
 * @access  Private (SuperAdmin)
 */
const getAuditLogsByIP = asyncHandler(async (req, res) => {
  const { ipAddress } = req.params;
  const { limit = 100, skip = 0 } = req.query;

  const logs = await AuditLog.getByIP(ipAddress, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  ApiResponse.success(res, {
    logs,
    totalLogs: logs.length,
  }, 'IP audit logs retrieved successfully');
});

/**
 * @desc    Get failed actions
 * @route   GET /api/security/audit-logs/failed
 * @access  Private (SuperAdmin)
 */
const getFailedActions = asyncHandler(async (req, res) => {
  const { limit = 100, skip = 0, startDate, endDate } = req.query;

  const logs = await AuditLog.getFailedActions({
    limit: parseInt(limit),
    skip: parseInt(skip),
    startDate,
    endDate,
  });

  ApiResponse.success(res, {
    logs,
    totalLogs: logs.length,
  }, 'Failed actions retrieved successfully');
});

/**
 * @desc    Get login activities
 * @route   GET /api/security/audit-logs/login-activities
 * @access  Private (SuperAdmin)
 */
const getLoginActivities = asyncHandler(async (req, res) => {
  const { limit = 100, skip = 0, startDate, endDate } = req.query;

  const logs = await AuditLog.getLoginActivities({
    limit: parseInt(limit),
    skip: parseInt(skip),
    startDate,
    endDate,
  });

  ApiResponse.success(res, {
    logs,
    totalLogs: logs.length,
  }, 'Login activities retrieved successfully');
});

/**
 * @desc    Get audit log statistics
 * @route   GET /api/security/audit-logs/stats
 * @access  Private (SuperAdmin)
 */
const getAuditLogStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await AuditLog.getStatistics(startDate, endDate);

  ApiResponse.success(res, stats, 'Audit log statistics retrieved successfully');
});

/**
 * @desc    Get all security events with filtering and pagination
 * @route   GET /api/security/security-events
 * @access  Private (SuperAdmin)
 */
const getSecurityEvents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    eventType,
    severity,
    eventStatus,
    ipAddress,
    userId,
    startDate,
    endDate,
    search,
  } = req.query;

  // Build query
  const query = {};

  if (eventType) query.eventType = eventType;
  if (severity) query.severity = severity;
  if (eventStatus) query.eventStatus = eventStatus;
  if (ipAddress) query.ipAddress = ipAddress;
  if (userId) query['triggeredBy.userId'] = userId;

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Search by description
  if (search) {
    query.description = { $regex: search, $options: 'i' };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const events = await SecurityEvent.find(query)
    .sort({ severity: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await SecurityEvent.countDocuments(query);

  ApiResponse.success(res, {
    events,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalEvents: total,
      limit: parseInt(limit),
    },
  }, 'Security events retrieved successfully');
});

/**
 * @desc    Get security event by ID
 * @route   GET /api/security/security-events/:id
 * @access  Private (SuperAdmin)
 */
const getSecurityEventById = asyncHandler(async (req, res) => {
  const event = await SecurityEvent.findById(req.params.id)
    .populate('relatedEvents');

  if (!event) {
    throw ApiError.notFound('Security event not found');
  }

  ApiResponse.success(res, event, 'Security event retrieved successfully');
});

/**
 * @desc    Create security event
 * @route   POST /api/security/security-events
 * @access  Private (SuperAdmin)
 */
const createSecurityEvent = asyncHandler(async (req, res) => {
  const {
    eventType,
    severity,
    triggeredBy,
    description,
    ipAddress,
    deviceInfo,
    location,
    requestDetails,
    metadata,
  } = req.body;

  // Validate required fields
  if (!eventType || !severity || !description || !ipAddress) {
    throw ApiError.badRequest('Please provide all required fields');
  }

  // Create security event
  const event = await SecurityEvent.create({
    eventType,
    severity,
    triggeredBy,
    description,
    ipAddress,
    deviceInfo,
    location,
    requestDetails,
    metadata,
    eventStatus: 'active',
  });

  ApiResponse.created(res, event, 'Security event created successfully');
});

/**
 * @desc    Update security event
 * @route   PUT /api/security/security-events/:id
 * @access  Private (SuperAdmin)
 */
const updateSecurityEvent = asyncHandler(async (req, res) => {
  const event = await SecurityEvent.findById(req.params.id);

  if (!event) {
    throw ApiError.notFound('Security event not found');
  }

  const { eventStatus, severity, description, actionTaken, resolutionNotes } = req.body;

  // Update fields
  if (eventStatus) event.eventStatus = eventStatus;
  if (severity) event.severity = severity;
  if (description) event.description = description;
  if (actionTaken) event.actionTaken = actionTaken;
  if (resolutionNotes) event.resolutionNotes = resolutionNotes;

  await event.save();

  ApiResponse.success(res, event, 'Security event updated successfully');
});

/**
 * @desc    Resolve security event
 * @route   POST /api/security/security-events/:id/resolve
 * @access  Private (SuperAdmin)
 */
const resolveSecurityEvent = asyncHandler(async (req, res) => {
  const { resolutionNotes, actionTaken } = req.body;

  if (!resolutionNotes) {
    throw ApiError.badRequest('Please provide resolution notes');
  }

  const event = await SecurityEvent.findById(req.params.id);

  if (!event) {
    throw ApiError.notFound('Security event not found');
  }

  if (event.eventStatus === 'resolved') {
    throw ApiError.badRequest('Event is already resolved');
  }

  await event.resolve(
    req.user._id,
    req.user.fullName,
    resolutionNotes,
    actionTaken || ''
  );

  ApiResponse.success(res, event, 'Security event resolved successfully');
});

/**
 * @desc    Ignore security event
 * @route   POST /api/security/security-events/:id/ignore
 * @access  Private (SuperAdmin)
 */
const ignoreSecurityEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const event = await SecurityEvent.findById(req.params.id);

  if (!event) {
    throw ApiError.notFound('Security event not found');
  }

  if (event.eventStatus !== 'active') {
    throw ApiError.badRequest('Only active events can be ignored');
  }

  await event.ignore(
    req.user._id,
    req.user.fullName,
    reason || 'No reason provided'
  );

  ApiResponse.success(res, event, 'Security event ignored successfully');
});

/**
 * @desc    Get active security events
 * @route   GET /api/security/security-events/active
 * @access  Private (SuperAdmin)
 */
const getActiveSecurityEvents = asyncHandler(async (req, res) => {
  const { limit = 100, skip = 0, severity } = req.query;

  const events = await SecurityEvent.getActiveEvents({
    limit: parseInt(limit),
    skip: parseInt(skip),
    severity,
  });

  ApiResponse.success(res, {
    events,
    totalEvents: events.length,
  }, 'Active security events retrieved successfully');
});

/**
 * @desc    Get critical security events
 * @route   GET /api/security/security-events/critical
 * @access  Private (SuperAdmin)
 */
const getCriticalSecurityEvents = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;

  const events = await SecurityEvent.getCriticalEvents({
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  ApiResponse.success(res, {
    events,
    totalEvents: events.length,
  }, 'Critical security events retrieved successfully');
});

/**
 * @desc    Get security events by IP
 * @route   GET /api/security/security-events/ip/:ipAddress
 * @access  Private (SuperAdmin)
 */
const getSecurityEventsByIP = asyncHandler(async (req, res) => {
  const { ipAddress } = req.params;
  const { limit = 100, skip = 0 } = req.query;

  const events = await SecurityEvent.getByIP(ipAddress, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  ApiResponse.success(res, {
    events,
    totalEvents: events.length,
  }, 'IP security events retrieved successfully');
});

/**
 * @desc    Get security events by user
 * @route   GET /api/security/security-events/user/:userId
 * @access  Private (SuperAdmin)
 */
const getSecurityEventsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 100, skip = 0 } = req.query;

  const events = await SecurityEvent.getByUser(userId, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  ApiResponse.success(res, {
    events,
    totalEvents: events.length,
  }, 'User security events retrieved successfully');
});

/**
 * @desc    Get security event statistics
 * @route   GET /api/security/security-events/stats
 * @access  Private (SuperAdmin)
 */
const getSecurityEventStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await SecurityEvent.getStatistics(startDate, endDate);

  ApiResponse.success(res, stats, 'Security event statistics retrieved successfully');
});

/**
 * @desc    Get security dashboard overview
 * @route   GET /api/security/dashboard
 * @access  Private (SuperAdmin)
 */
const getSecurityDashboard = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Get both audit log and security event statistics
  const [auditStats, securityStats, recentEvents, recentFailedLogins] = await Promise.all([
    AuditLog.getStatistics(startDate, endDate),
    SecurityEvent.getStatistics(startDate, endDate),
    SecurityEvent.getActiveEvents({ limit: 10 }),
    AuditLog.getFailedActions({ limit: 10 }),
  ]);

  ApiResponse.success(res, {
    auditLogs: auditStats,
    securityEvents: securityStats,
    recentActiveEvents: recentEvents,
    recentFailedLogins: recentFailedLogins,
  }, 'Security dashboard data retrieved successfully');
});

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByIP,
  getFailedActions,
  getLoginActivities,
  getAuditLogStats,
  getSecurityEvents,
  getSecurityEventById,
  createSecurityEvent,
  updateSecurityEvent,
  resolveSecurityEvent,
  ignoreSecurityEvent,
  getActiveSecurityEvents,
  getCriticalSecurityEvents,
  getSecurityEventsByIP,
  getSecurityEventsByUser,
  getSecurityEventStats,
  getSecurityDashboard,
};
