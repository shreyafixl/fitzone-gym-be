const express = require('express');
const router = express.Router();
const adminClassesController = require('../controllers/adminClassesController');
const { adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// Class routes
router.get('/', adminClassesController.getAllClasses);
router.get('/:id', adminClassesController.getClassById);
router.post('/', adminClassesController.createClass);
router.put('/:id', adminClassesController.updateClass);
router.delete('/:id', adminClassesController.deleteClass);

// Filter routes
router.get('/category/:categoryId', adminClassesController.getClassesByCategory);
router.get('/trainer/:trainerId', adminClassesController.getClassesByTrainer);

module.exports = router;
