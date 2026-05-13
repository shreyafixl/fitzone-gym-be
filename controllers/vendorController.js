const Vendor = require('../models/Vendor');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all vendors
 * @route   GET /api/superadmin/vendors
 * @access  Private (SuperAdmin)
 */
const getVendors = asyncHandler(async (req, res) => {
  const { category, status } = req.query;
  
  let filter = {};
  if (category) filter.category = category;
  if (status && status !== 'all') filter.status = status;

  const vendors = await Vendor.find(filter).sort({ createdAt: -1 });

  ApiResponse.success(res, { vendors }, 'Vendors retrieved successfully');
});

/**
 * @desc    Get vendor by ID
 * @route   GET /api/superadmin/vendors/:vendorId
 * @access  Private (SuperAdmin)
 */
const getVendorById = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.vendorId);

  if (!vendor) {
    throw ApiError.notFound('Vendor not found');
  }

  ApiResponse.success(res, vendor, 'Vendor retrieved successfully');
});

/**
 * @desc    Create vendor
 * @route   POST /api/superadmin/vendors
 * @access  Private (SuperAdmin)
 */
const createVendor = asyncHandler(async (req, res) => {
  const { name, category, contact, phone, email } = req.body;

  if (!name || !category || !contact) {
    throw ApiError.badRequest('Name, category, and contact are required');
  }

  const vendor = await Vendor.create({
    name,
    category,
    contact,
    phone: phone || '',
    email: email || '',
    status: 'active',
  });

  ApiResponse.success(res, vendor, 'Vendor created successfully', 201);
});

/**
 * @desc    Update vendor
 * @route   PUT /api/superadmin/vendors/:vendorId
 * @access  Private (SuperAdmin)
 */
const updateVendor = asyncHandler(async (req, res) => {
  let vendor = await Vendor.findById(req.params.vendorId);

  if (!vendor) {
    throw ApiError.notFound('Vendor not found');
  }

  vendor = await Vendor.findByIdAndUpdate(
    req.params.vendorId,
    req.body,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, vendor, 'Vendor updated successfully');
});

/**
 * @desc    Delete vendor
 * @route   DELETE /api/superadmin/vendors/:vendorId
 * @access  Private (SuperAdmin)
 */
const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndDelete(req.params.vendorId);

  if (!vendor) {
    throw ApiError.notFound('Vendor not found');
  }

  ApiResponse.success(res, null, 'Vendor deleted successfully');
});

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
};
