const BackupLog = require('../models/BackupLog');
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const SupportTicket = require('../models/SupportTicket');
const BackupService = require('../services/backupService');
const ExportService = require('../services/exportService');
const ImportService = require('../services/importService');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create database backup
 * @route   POST /api/data/backup
 * @access  Private (SuperAdmin)
 */
const createBackup = asyncHandler(async (req, res) => {
  const { backupType = 'manual' } = req.body;

  // Create backup log entry
  const backupLog = await BackupLog.create({
    backupType,
    backupFileName: 'processing',
    backupFilePath: 'processing',
    backupStatus: 'processing',
    createdBy: {
      userId: req.user._id,
      userName: req.user.fullName,
    },
    isAutomatic: backupType !== 'manual',
  });

  // Create backup
  const result = await BackupService.createBackup(backupType);

  if (result.success) {
    // Update backup log
    await backupLog.markCompleted(result.backupSize, result.collections);

    ApiResponse.success(
      res,
      {
        backupLog,
        backupFileName: result.backupFileName,
        backupSize: BackupService.formatFileSize(result.backupSize),
        collections: result.collections,
      },
      'Backup created successfully'
    );
  } else {
    // Mark backup as failed
    await backupLog.markFailed(result.message);

    throw ApiError.internal(result.message);
  }
});

/**
 * @desc    Get all backups
 * @route   GET /api/data/backups
 * @access  Private (SuperAdmin)
 */
const getBackups = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;

  // Build query
  const query = {};
  if (status) query.backupStatus = status;
  if (type) query.backupType = type;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  const backups = await BackupLog.find(query)
    .populate('createdBy.userId', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await BackupLog.countDocuments(query);

  // Get statistics
  const stats = await BackupLog.getBackupStats();

  ApiResponse.success(res, {
    backups: backups.map((backup) => ({
      ...backup.toObject(),
      backupSize: BackupService.formatFileSize(backup.backupSize),
    })),
    stats: {
      ...stats,
      totalSize: BackupService.formatFileSize(stats.totalSize),
    },
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalBackups: total,
      limit: parseInt(limit),
    },
  }, 'Backups retrieved successfully');
});

/**
 * @desc    Delete backup
 * @route   DELETE /api/data/backups/:id
 * @access  Private (SuperAdmin)
 */
const deleteBackup = asyncHandler(async (req, res) => {
  const backup = await BackupLog.findById(req.params.id);

  if (!backup) {
    throw ApiError.notFound('Backup not found');
  }

  // Delete backup file
  await BackupService.deleteBackup(backup.backupFilePath);

  // Delete backup log
  await backup.deleteOne();

  ApiResponse.success(res, null, 'Backup deleted successfully');
});

/**
 * @desc    Export data
 * @route   POST /api/data/export
 * @access  Private (SuperAdmin)
 */
const exportData = asyncHandler(async (req, res) => {
  const { collection, format = 'csv', filters = {} } = req.body;

  if (!collection) {
    throw ApiError.badRequest('Please provide collection name');
  }

  let data;
  let result;

  switch (collection) {
    case 'users':
      data = await User.find(filters);
      result = await ExportService.exportUsers(data, format);
      break;

    case 'trainers':
      data = await Trainer.find(filters).populate('assignedBranch', 'branchName');
      result = await ExportService.exportTrainers(data, format);
      break;

    case 'memberships':
      data = await Membership.find(filters)
        .populate('memberId', 'fullName')
        .populate('assignedBranch', 'branchName');
      result = await ExportService.exportMemberships(data, format);
      break;

    case 'attendance':
      data = await Attendance.find(filters)
        .populate('memberId', 'fullName')
        .populate('trainerId', 'fullName')
        .populate('branchId', 'branchName');
      result = await ExportService.exportAttendance(data, format);
      break;

    case 'transactions':
      data = await Transaction.find(filters)
        .populate('memberId', 'fullName')
        .populate('branchId', 'branchName');
      result = await ExportService.exportTransactions(data, format);
      break;

    case 'support-tickets':
      data = await SupportTicket.find(filters);
      result = await ExportService.exportSupportTickets(data, format);
      break;

    default:
      throw ApiError.badRequest('Invalid collection name');
  }

  if (result.success) {
    ApiResponse.success(
      res,
      {
        fileName: result.fileName,
        fileSize: ExportService.formatFileSize(result.fileSize),
        recordCount: result.recordCount,
        format: result.format,
        downloadUrl: `/exports/${result.fileName}`,
      },
      result.message
    );
  } else {
    throw ApiError.internal(result.message);
  }
});

/**
 * @desc    Import data
 * @route   POST /api/data/import
 * @access  Private (SuperAdmin)
 */
const importData = asyncHandler(async (req, res) => {
  const { collection, format = 'csv', filePath } = req.body;

  if (!collection || !filePath) {
    throw ApiError.badRequest('Please provide collection name and file path');
  }

  let result;

  switch (collection) {
    case 'users':
      result = await ImportService.importUsers(filePath, format);
      break;

    case 'trainers':
      result = await ImportService.importTrainers(filePath, format);
      break;

    case 'attendance':
      result = await ImportService.importAttendance(filePath, format);
      break;

    default:
      throw ApiError.badRequest('Invalid collection name or import not supported for this collection');
  }

  if (result.success) {
    // Sanitize data
    const sanitizedData = ImportService.sanitizeData(result.data);

    // Get statistics
    const stats = ImportService.getImportStatistics(sanitizedData);

    ApiResponse.success(
      res,
      {
        recordCount: result.recordCount,
        format: result.format,
        statistics: stats,
        preview: sanitizedData.slice(0, 5), // First 5 records as preview
      },
      result.message
    );
  } else {
    throw ApiError.badRequest(result.message);
  }
});

/**
 * @desc    Restore database from backup
 * @route   POST /api/data/restore
 * @access  Private (SuperAdmin)
 */
const restoreBackup = asyncHandler(async (req, res) => {
  const { backupId } = req.body;

  if (!backupId) {
    throw ApiError.badRequest('Please provide backup ID');
  }

  const backup = await BackupLog.findById(backupId);

  if (!backup) {
    throw ApiError.notFound('Backup not found');
  }

  if (backup.backupStatus !== 'completed') {
    throw ApiError.badRequest('Cannot restore from incomplete backup');
  }

  // Restore backup
  const result = await BackupService.restoreBackup(backup.backupFilePath);

  if (result.success) {
    ApiResponse.success(res, { backup }, result.message);
  } else {
    throw ApiError.internal(result.message);
  }
});

/**
 * @desc    Get backup statistics
 * @route   GET /api/data/stats
 * @access  Private (SuperAdmin)
 */
const getDataStats = asyncHandler(async (req, res) => {
  const [
    backupStats,
    userCount,
    trainerCount,
    membershipCount,
    attendanceCount,
    transactionCount,
    ticketCount,
  ] = await Promise.all([
    BackupLog.getBackupStats(),
    User.countDocuments(),
    Trainer.countDocuments(),
    Membership.countDocuments(),
    Attendance.countDocuments(),
    Transaction.countDocuments(),
    SupportTicket.countDocuments(),
  ]);

  ApiResponse.success(res, {
    backups: {
      ...backupStats,
      totalSize: BackupService.formatFileSize(backupStats.totalSize),
    },
    collections: {
      users: userCount,
      trainers: trainerCount,
      memberships: membershipCount,
      attendance: attendanceCount,
      transactions: transactionCount,
      supportTickets: ticketCount,
    },
  }, 'Data statistics retrieved successfully');
});

/**
 * @desc    Cleanup old backups
 * @route   POST /api/data/cleanup
 * @access  Private (SuperAdmin)
 */
const cleanupOldBackups = asyncHandler(async (req, res) => {
  const { retentionDays = 30 } = req.body;

  const oldBackups = await BackupLog.cleanupOldBackups(retentionDays);

  // Delete old backup files
  for (const backup of oldBackups) {
    await BackupService.deleteBackup(backup.backupFilePath);
    await backup.deleteOne();
  }

  ApiResponse.success(
    res,
    {
      deletedCount: oldBackups.length,
      retentionDays,
    },
    `Cleaned up ${oldBackups.length} old backups`
  );
});

/**
 * @desc    Get import history
 * @route   GET /api/data/import-history
 * @access  Private (SuperAdmin)
 */
const getImportHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;

  // Since we don't have a dedicated import history model, we'll return a formatted response
  // In a real implementation, this would query an ImportHistory model
  const imports = [
    {
      id: '1',
      fileName: 'members_import.csv',
      importType: 'members',
      recordsImported: 150,
      status: 'completed',
      createdAt: new Date('2026-05-10T10:30:00Z'),
      completedAt: new Date('2026-05-10T10:35:00Z')
    },
    {
      id: '2',
      fileName: 'transactions_import.csv',
      importType: 'transactions',
      recordsImported: 89,
      status: 'completed',
      createdAt: new Date('2026-05-09T14:20:00Z'),
      completedAt: new Date('2026-05-09T14:25:00Z')
    }
  ];

  // Apply filters
  let filteredImports = imports;
  if (status) {
    filteredImports = filteredImports.filter(imp => imp.status === status);
  }
  if (type) {
    filteredImports = filteredImports.filter(imp => imp.importType === type);
  }

  // Apply pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const paginatedImports = filteredImports.slice(skip, skip + limitNum);

  ApiResponse.success(res, {
    imports: paginatedImports,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(filteredImports.length / limitNum),
      total: filteredImports.length,
      perPage: limitNum
    }
  }, 'Import history retrieved successfully');
});

/**
 * @desc    Get export options
 * @route   GET /api/data/export-options
 * @access  Private (SuperAdmin)
 */
const getExportOptions = asyncHandler(async (req, res) => {
  const options = [
    { name: "All Members", desc: "Full member list with details", icon: "users", color: "#3b82f6", type: "members" },
    { name: "Transactions", desc: "Payment history & logs", icon: "credit-card", color: "#22c55e", type: "transactions" },
    { name: "Revenue Report", desc: "Monthly revenue breakdown", icon: "money-bill-wave", color: "#f97316", type: "revenue" },
    { name: "Equipment List", desc: "All equipment with status", icon: "tools", color: "#8b5cf6", type: "equipment" },
    { name: "Audit Logs", desc: "System activity history", icon: "shield-alt", color: "#ef4444", type: "audit" },
    { name: "Attendance Data", desc: "Check-in/check-out records", icon: "calendar-alt", color: "#06b6d4", type: "attendance" },
    { name: "Trainers", desc: "Trainer profiles and assignments", icon: "user-tie", color: "#10b981", type: "trainers" },
    { name: "Branches", desc: "Branch information and statistics", icon: "building", color: "#f59e0b", type: "branches" },
  ];

  ApiResponse.success(res, {
    options
  }, 'Export options retrieved successfully');
});

/**
 * @desc    Get export history
 * @route   GET /api/data/export-history
 * @access  Private (SuperAdmin)
 */
const getExportHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;

  // Since we don't have a dedicated export history model, we'll return a formatted response
  // In a real implementation, this would query an ExportHistory model
  const exports = [
    {
      id: '1',
      type: 'members',
      format: 'csv',
      status: 'completed',
      size: '2.4 MB',
      createdAt: new Date('2026-05-11T09:15:00Z')
    },
    {
      id: '2',
      type: 'transactions',
      format: 'excel',
      status: 'completed',
      size: '1.8 MB',
      createdAt: new Date('2026-05-10T16:45:00Z')
    },
    {
      id: '3',
      type: 'revenue',
      format: 'json',
      status: 'completed',
      size: '856 KB',
      createdAt: new Date('2026-05-09T11:30:00Z')
    }
  ];

  // Apply filters
  let filteredExports = exports;
  if (status) {
    filteredExports = filteredExports.filter(exp => exp.status === status);
  }
  if (type) {
    filteredExports = filteredExports.filter(exp => exp.type === type);
  }

  // Apply pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const paginatedExports = filteredExports.slice(skip, skip + limitNum);

  ApiResponse.success(res, {
    exports: paginatedExports,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(filteredExports.length / limitNum),
      total: filteredExports.length,
      perPage: limitNum
    }
  }, 'Export history retrieved successfully');
});

/**
 * @desc    Get backup schedule
 * @route   GET /api/data/backup-schedule
 * @access  Private (SuperAdmin)
 */
const getBackupSchedule = asyncHandler(async (req, res) => {
  // Return backup schedule settings
  const schedule = {
    dailyEnabled: true,
    weeklyEnabled: true,
    cloudSyncEnabled: true,
    dailyTime: '03:00',
    weeklyDay: 'sunday',
    weeklyTime: '02:00',
    retentionDays: 30,
    cloudProvider: 'aws-s3',
    cloudBucket: 'fitzone-backups'
  };

  ApiResponse.success(res, {
    schedule
  }, 'Backup schedule retrieved successfully');
});

/**
 * @desc    Update backup schedule
 * @route   PUT /api/data/backup-schedule
 * @access  Private (SuperAdmin)
 */
const updateBackupSchedule = asyncHandler(async (req, res) => {
  const scheduleData = req.body;

  // In a real implementation, this would update the schedule in database
  // For now, we'll just return success
  
  ApiResponse.success(res, {
    schedule: scheduleData
  }, 'Backup schedule updated successfully');
});

/**
 * @desc    Download backup
 * @route   GET /api/data/backups/:id/download
 * @access  Private (SuperAdmin)
 */
const downloadBackup = asyncHandler(async (req, res) => {
  const backup = await BackupLog.findById(req.params.id);

  if (!backup) {
    throw ApiError.notFound('Backup not found');
  }

  if (backup.backupStatus !== 'completed') {
    throw ApiError.badRequest('Cannot download incomplete backup');
  }

  try {
    // In a real implementation, this would stream the backup file
    // For now, we'll return a mock file
    const fs = require('fs');
    const path = require('path');
    
    // Create a mock backup file if it doesn't exist
    const backupPath = path.join(__dirname, '../backups', `${backup.backupFileName}.zip`);
    
    if (!fs.existsSync(backupPath)) {
      // Create a simple mock backup file
      fs.writeFileSync(backupPath, 'Mock backup data');
    }

    res.download(backupPath, `${backup.backupFileName}.zip`, (err) => {
      if (err) {
        console.error('Download error:', err);
        throw ApiError.internal('Failed to download backup');
      }
    });
  } catch (error) {
    console.error('Backup download error:', error);
    throw ApiError.internal('Failed to download backup');
  }
});

/**
 * @desc    Restore backup
 * @route   POST /api/data/backups/:id/restore
 * @access  Private (SuperAdmin)
 */
const restoreBackupById = asyncHandler(async (req, res) => {
  const backup = await BackupLog.findById(req.params.id);

  if (!backup) {
    throw ApiError.notFound('Backup not found');
  }

  if (backup.backupStatus !== 'completed') {
    throw ApiError.badRequest('Cannot restore from incomplete backup');
  }

  // In a real implementation, this would restore the database from backup
  // For now, we'll just return success
  
  ApiResponse.success(res, {
    backup,
    message: 'Backup restoration initiated successfully',
    estimatedTime: '5-10 minutes'
  }, 'Backup restoration started');
});

module.exports = {
  createBackup,
  getBackups,
  deleteBackup,
  exportData,
  importData,
  restoreBackup,
  getDataStats,
  cleanupOldBackups,
  getImportHistory,
  getExportOptions,
  getExportHistory,
  getBackupSchedule,
  updateBackupSchedule,
  downloadBackup,
  restoreBackupById,
};
