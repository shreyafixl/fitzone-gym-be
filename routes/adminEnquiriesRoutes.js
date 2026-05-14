const express = require('express');
const router = express.Router();
const adminEnquiriesController = require('../controllers/adminEnquiriesController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Enquiry routes - specific routes first, then generic ones
router.get('/stats/all', adminEnquiriesController.getEnquiryStats);
router.get('/status/:status', adminEnquiriesController.getEnquiriesByStatus);
router.get('/', adminEnquiriesController.getAllEnquiries);
router.get('/:id', adminEnquiriesController.getEnquiryById);
router.post('/', adminEnquiriesController.createEnquiry);
router.put('/:id', adminEnquiriesController.updateEnquiry);
router.delete('/:id', adminEnquiriesController.deleteEnquiry);

// Enquiry actions
router.post('/:id/notes', adminEnquiriesController.addNote);
router.patch('/:id/convert', adminEnquiriesController.markAsConverted);
router.patch('/:id/assign', adminEnquiriesController.assignEnquiry);

module.exports = router;
