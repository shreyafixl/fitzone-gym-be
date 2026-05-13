const express = require('express');
const router = express.Router();
const {
  getAllDiets,
  getDietById,
  createDiet,
  updateDiet,
  deleteDiet,
  assignDiet,
  getDietRecommendations,
  getDietStats,
  updateProgress,
  updateAdherence,
} = require('../controllers/trainerDietController');
const { protectTrainer } = require('../middleware/trainerAuthMiddleware');

/**
 * @route   GET /api/trainer/diets
 * @desc    Get all diet plans created by trainer
 * @access  Private (Trainer)
 * @query   page, limit, sortBy, sortOrder, search, status, dietType, memberId
 */
router.get('/', protectTrainer, getAllDiets);

/**
 * @route   GET /api/trainer/diets/stats
 * @desc    Get diet statistics
 * @access  Private (Trainer)
 */
router.get('/stats', protectTrainer, getDietStats);

/**
 * @route   GET /api/trainer/diets/recommendations/:memberId
 * @desc    Get diet recommendations for member
 * @access  Private (Trainer)
 */
router.get('/recommendations/:memberId', protectTrainer, getDietRecommendations);

/**
 * @route   POST /api/trainer/diets
 * @desc    Create new diet plan
 * @access  Private (Trainer)
 */
router.post('/', protectTrainer, createDiet);

/**
 * @route   GET /api/trainer/diets/:id
 * @desc    Get diet plan by ID
 * @access  Private (Trainer)
 */
router.get('/:id', protectTrainer, getDietById);

/**
 * @route   PUT /api/trainer/diets/:id
 * @desc    Update diet plan
 * @access  Private (Trainer)
 */
router.put('/:id', protectTrainer, updateDiet);

/**
 * @route   DELETE /api/trainer/diets/:id
 * @desc    Delete diet plan
 * @access  Private (Trainer)
 */
router.delete('/:id', protectTrainer, deleteDiet);

/**
 * @route   POST /api/trainer/diets/:id/assign
 * @desc    Assign diet plan to member
 * @access  Private (Trainer)
 */
router.post('/:id/assign', protectTrainer, assignDiet);

/**
 * @route   PUT /api/trainer/diets/:id/progress
 * @desc    Update diet progress
 * @access  Private (Trainer)
 */
router.put('/:id/progress', protectTrainer, updateProgress);

/**
 * @route   PUT /api/trainer/diets/:id/adherence
 * @desc    Update adherence rate
 * @access  Private (Trainer)
 */
router.put('/:id/adherence', protectTrainer, updateAdherence);

module.exports = router;
