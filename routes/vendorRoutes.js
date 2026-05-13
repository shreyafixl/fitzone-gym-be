const express = require('express');
const router = express.Router();
const {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} = require('../controllers/vendorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Vendor Routes
 */

// Get all vendors
router.get('/', protect, authorize('superadmin'), getVendors);

// Create vendor
router.post('/', protect, authorize('superadmin'), createVendor);

// Get vendor by ID
router.get('/:vendorId', protect, authorize('superadmin'), getVendorById);

// Update vendor
router.put('/:vendorId', protect, authorize('superadmin'), updateVendor);

// Delete vendor
router.delete('/:vendorId', protect, authorize('superadmin'), deleteVendor);

module.exports = router;
