const express = require('express');
const router = express.Router();
const adminCategoriesController = require('../controllers/adminCategoriesController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// Category routes
router.get('/', adminCategoriesController.getAllCategories);
router.get('/:id', adminCategoriesController.getCategoryById);
router.post('/', adminCategoriesController.createCategory);
router.put('/:id', adminCategoriesController.updateCategory);
router.delete('/:id', adminCategoriesController.deleteCategory);

// Statistics
router.get('/stats/all', adminCategoriesController.getCategoryStats);

module.exports = router;
