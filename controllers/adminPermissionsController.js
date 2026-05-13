const Trainer = require('../models/Trainer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all staff permissions
 * @route   GET /api/admin/permissions
 * @access  Private (Admin)
 */
const getAllPermissions = asyncHandler(async (req, res) => {
  // Get all trainers with their permissions
  const trainers = await Trainer.find()
    .select('fullName email role permissions')
    .lean();

  // Get all admin users with their permissions
  const admins = await User.find({ role: 'staff' })
    .select('fullName email role permissions')
    .lean();

  // Combine both
  const allStaff = [...trainers, ...admins];

  ApiResponse.success(
    res,
    allStaff,
    'Staff permissions retrieved successfully'
  );
});

/**
 * @desc    Get staff member permissions
 * @route   GET /api/admin/permissions/:staffId
 * @access  Private (Admin)
 */
const getStaffPermissions = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  // Try to find in Trainer model first
  let staff = await Trainer.findById(staffId).select('fullName email role permissions');
  
  // If not found, try User model
  if (!staff) {
    staff = await User.findById(staffId).select('fullName email role permissions');
  }

  if (!staff) {
    throw ApiError.notFound('Staff member not found');
  }

  ApiResponse.success(
    res,
    staff,
    'Staff permissions retrieved successfully'
  );
});

/**
 * @desc    Update staff permissions
 * @route   PUT /api/admin/permissions/:staffId
 * @access  Private (Admin with canManageSettings permission)
 */
const updatePermissions = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { permissions } = req.body;

  // Validate permissions object
  if (!permissions || typeof permissions !== 'object') {
    throw ApiError.badRequest('Invalid permissions object');
  }

  // Try to update in Trainer model first
  let staff = await Trainer.findByIdAndUpdate(
    staffId,
    { $set: { permissions } },
    { new: true, runValidators: true }
  ).select('fullName email role permissions');

  // If not found, try User model
  if (!staff) {
    staff = await User.findByIdAndUpdate(
      staffId,
      { $set: { permissions } },
      { new: true, runValidators: true }
    ).select('fullName email role permissions');
  }

  if (!staff) {
    throw ApiError.notFound('Staff member not found');
  }

  ApiResponse.success(
    res,
    staff,
    'Permissions updated successfully'
  );
});

/**
 * @desc    Bulk update permissions
 * @route   PUT /api/admin/permissions/bulk
 * @access  Private (Admin with canManageSettings permission)
 */
const bulkUpdatePermissions = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  // Validate updates array
  if (!Array.isArray(updates) || updates.length === 0) {
    throw ApiError.badRequest('Please provide an array of permission updates');
  }

  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      const { staffId, permissions } = update;

      if (!staffId || !permissions) {
        errors.push({
          staffId,
          error: 'Missing staffId or permissions'
        });
        continue;
      }

      // Try Trainer model first
      let staff = await Trainer.findByIdAndUpdate(
        staffId,
        { $set: { permissions } },
        { new: true }
      );

      // If not found, try User model
      if (!staff) {
        staff = await User.findByIdAndUpdate(
          staffId,
          { $set: { permissions } },
          { new: true }
        );
      }

      if (staff) {
        results.push({
          staffId,
          fullName: staff.fullName,
          permissions: staff.permissions,
          success: true
        });
      } else {
        errors.push({
          staffId,
          error: 'Staff member not found'
        });
      }
    } catch (err) {
      errors.push({
        staffId: update.staffId,
        error: err.message
      });
    }
  }

  ApiResponse.success(
    res,
    {
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    },
    `Bulk update completed. ${results.length} updated, ${errors.length} failed.`
  );
});

module.exports = {
  getAllPermissions,
  getStaffPermissions,
  updatePermissions,
  bulkUpdatePermissions,
};
