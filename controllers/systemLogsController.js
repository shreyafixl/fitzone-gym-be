const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all system logs with filtering and pagination
 * @route   GET /api/settings/system-logs
 * @access  Private (SuperAdmin)
 */
const getSystemLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    level,
    service,
    search,
    startDate,
    endDate,
  } = req.query;

  // Build query - system logs are audit logs with specific criteria
  const query = {};

  if (level) {
    // Map level to actionType
    const levelMap = {
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    if (levelMap[level]) query.actionType = levelMap[level];
  }

  if (service) query.moduleName = service;

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Search by description or module
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { moduleName: { $regex: search, $options: 'i' } },
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

  // Transform to system log format
  const systemLogs = logs.map(log => ({
    id: log._id,
    _id: log._id,
    level: log.actionType || 'info',
    message: log.description,
    service: log.moduleName,
    time: log.createdAt,
    createdAt: log.createdAt,
    source: log.moduleName,
  }));

  ApiResponse.success(res, {
    data: systemLogs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalLogs: total,
      limit: parseInt(limit),
    },
  }, 'System logs retrieved successfully');
});

/**
 * @desc    Get system log by ID
 * @route   GET /api/settings/system-logs/:id
 * @access  Private (SuperAdmin)
 */
const getSystemLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id);

  if (!log) {
    throw ApiError.notFound('System log not found');
  }

  const systemLog = {
    id: log._id,
    _id: log._id,
    level: log.actionType || 'info',
    message: log.description,
    service: log.moduleName,
    time: log.createdAt,
    createdAt: log.createdAt,
    source: log.moduleName,
    details: log,
  };

  ApiResponse.success(res, systemLog, 'System log retrieved successfully');
});

/**
 * @desc    Get system logs by level
 * @route   GET /api/settings/system-logs/level/:level
 * @access  Private (SuperAdmin)
 */
const getSystemLogsByLevel = asyncHandler(async (req, res) => {
  const { level } = req.params;
  const { limit = 100, page = 1 } = req.query;

  const levelMap = {
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  if (!levelMap[level]) {
    throw ApiError.badRequest('Invalid log level. Must be error, warning, or info');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await AuditLog.find({ actionType: levelMap[level] })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await AuditLog.countDocuments({ actionType: levelMap[level] });

  const systemLogs = logs.map(log => ({
    id: log._id,
    _id: log._id,
    level: log.actionType || 'info',
    message: log.description,
    service: log.moduleName,
    time: log.createdAt,
    createdAt: log.createdAt,
    source: log.moduleName,
  }));

  ApiResponse.success(res, {
    data: systemLogs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalLogs: total,
    },
  }, `System logs with level '${level}' retrieved successfully`);
});

/**
 * @desc    Get system logs by service
 * @route   GET /api/settings/system-logs/service/:service
 * @access  Private (SuperAdmin)
 */
const getSystemLogsByService = asyncHandler(async (req, res) => {
  const { service } = req.params;
  const { limit = 100, page = 1 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await AuditLog.find({ moduleName: service })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await AuditLog.countDocuments({ moduleName: service });

  const systemLogs = logs.map(log => ({
    id: log._id,
    _id: log._id,
    level: log.actionType || 'info',
    message: log.description,
    service: log.moduleName,
    time: log.createdAt,
    createdAt: log.createdAt,
    source: log.moduleName,
  }));

  ApiResponse.success(res, {
    data: systemLogs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalLogs: total,
    },
  }, `System logs for service '${service}' retrieved successfully`);
});

/**
 * @desc    Get system log statistics
 * @route   GET /api/settings/system-logs/stats
 * @access  Private (SuperAdmin)
 */
const getSystemLogStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [totalLogs, errorLogs, warningLogs, infoLogs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.countDocuments({ ...query, actionType: 'error' }),
    AuditLog.countDocuments({ ...query, actionType: 'warning' }),
    AuditLog.countDocuments({ ...query, actionType: 'info' }),
  ]);

  const stats = {
    totalLogs,
    errors: errorLogs,
    warnings: warningLogs,
    info: infoLogs,
    errorPercentage: totalLogs > 0 ? ((errorLogs / totalLogs) * 100).toFixed(2) : 0,
    warningPercentage: totalLogs > 0 ? ((warningLogs / totalLogs) * 100).toFixed(2) : 0,
    infoPercentage: totalLogs > 0 ? ((infoLogs / totalLogs) * 100).toFixed(2) : 0,
  };

  ApiResponse.success(res, stats, 'System log statistics retrieved successfully');
});

/**
 * @desc    Search system logs
 * @route   GET /api/settings/system-logs/search
 * @access  Private (SuperAdmin)
 */
const searchSystemLogs = asyncHandler(async (req, res) => {
  const { q, limit = 50, page = 1 } = req.query;

  if (!q || q.trim().length === 0) {
    throw ApiError.badRequest('Search query is required');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const logs = await AuditLog.find({
    $or: [
      { description: { $regex: q, $options: 'i' } },
      { moduleName: { $regex: q, $options: 'i' } },
      { 'performedBy.userName': { $regex: q, $options: 'i' } },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await AuditLog.countDocuments({
    $or: [
      { description: { $regex: q, $options: 'i' } },
      { moduleName: { $regex: q, $options: 'i' } },
      { 'performedBy.userName': { $regex: q, $options: 'i' } },
    ],
  });

  const systemLogs = logs.map(log => ({
    id: log._id,
    _id: log._id,
    level: log.actionType || 'info',
    message: log.description,
    service: log.moduleName,
    time: log.createdAt,
    createdAt: log.createdAt,
    source: log.moduleName,
  }));

  ApiResponse.success(res, {
    data: systemLogs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalLogs: total,
    },
  }, `Search results for '${q}' retrieved successfully`);
});

/**
 * @desc    Export system logs
 * @route   GET /api/settings/system-logs/export
 * @access  Private (SuperAdmin)
 */
const exportSystemLogs = asyncHandler(async (req, res) => {
  const { level, service, format = 'csv', startDate, endDate } = req.query;

  const query = {};
  if (level) query.actionType = level;
  if (service) query.moduleName = service;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(query).sort({ createdAt: -1 });

  if (format === 'csv') {
    // Generate CSV
    const csv = [
      ['Time', 'Level', 'Service', 'Message', 'User', 'IP Address'].join(','),
      ...logs.map(log =>
        [
          new Date(log.createdAt).toISOString(),
          log.actionType || 'info',
          log.moduleName,
          `"${(log.description || '').replace(/"/g, '""')}"`,
          log.performedBy?.userName || 'System',
          log.ipAddress || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="system-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } else if (format === 'json') {
    // Generate JSON
    const systemLogs = logs.map(log => ({
      id: log._id,
      level: log.actionType || 'info',
      message: log.description,
      service: log.moduleName,
      time: log.createdAt,
      user: log.performedBy?.userName || 'System',
      ipAddress: log.ipAddress,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="system-logs-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(systemLogs, null, 2));
  } else {
    throw ApiError.badRequest('Unsupported export format. Use csv or json');
  }
});

/**
 * @desc    Clear old system logs
 * @route   DELETE /api/settings/system-logs/clear
 * @access  Private (SuperAdmin)
 */
const clearOldSystemLogs = asyncHandler(async (req, res) => {
  const { daysOld = 30 } = req.query;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

  const result = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  ApiResponse.success(res, {
    deletedCount: result.deletedCount,
    message: `Deleted ${result.deletedCount} logs older than ${daysOld} days`,
  }, 'Old system logs cleared successfully');
});

module.exports = {
  getSystemLogs,
  getSystemLogById,
  getSystemLogsByLevel,
  getSystemLogsByService,
  getSystemLogStats,
  searchSystemLogs,
  exportSystemLogs,
  clearOldSystemLogs,
};
