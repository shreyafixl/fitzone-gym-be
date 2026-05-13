const express = require('express');
const router = express.Router();
const adminCategoriesController = require('../controllers/adminCategoriesController');
const { adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// Category routes
router.get('/', adminCategoriesController.getAllCategories);
router.get('/:id', adminCategoriesController.getCategoryById);
router.post('/', adminCategoriesController.createCategory);
router.put('/:id', adminCategoriesController.updateCategory);
router.delete('/:id', adminCategoriesController.deleteCategory);

// Statistics
router.get('/stats/all', adminCategoriesController.getCategoryStats);

module.exports = router;
