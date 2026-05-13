const express = require('express');
const router = express.Router();
const {
  getAllFeatureFlags,
  getFeatureFlagById,
  createFeatureFlag,
  updateFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
  getAllAIInsights,
  getAIInsightById,
  createAIInsight,
  acknowledgeAIInsight,
  updateAIInsightStatus,
  deleteAIInsight,
  getLiveMonitoringData,
  createLiveMonitoringData,
  acknowledgeMonitoringAlert,
  getAdvancedStats
} = require('../controllers/advancedController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Advanced Module Routes
 * All routes require SuperAdmin authentication
 */

// Statistics route
router.get(
  '/stats',
  protect,
  authorize('superadmin'),
  getAdvancedStats
);

// ─── FEATURE FLAGS ─────────────────────────────────────────────────────────────

// Get all feature flags
router.get(
  '/feature-flags',
  protect,
  authorize('superadmin'),
  getAllFeatureFlags
);

// Get feature flag by ID
router.get(
  '/feature-flags/:id',
  protect,
  authorize('superadmin'),
  getFeatureFlagById
);

// Create new feature flag
router.post(
  '/feature-flags',
  protect,
  authorize('superadmin'),
  createFeatureFlag
);

// Update feature flag
router.put(
  '/feature-flags/:id',
  protect,
  authorize('superadmin'),
  updateFeatureFlag
);

// Toggle feature flag
router.patch(
  '/feature-flags/:id/toggle',
  protect,
  authorize('superadmin'),
  toggleFeatureFlag
);

// Delete feature flag
router.delete(
  '/feature-flags/:id',
  protect,
  authorize('superadmin'),
  deleteFeatureFlag
);

// ─── AI INSIGHTS ───────────────────────────────────────────────────────────────

// Get all AI insights
router.get(
  '/ai-insights',
  protect,
  authorize('superadmin'),
  getAllAIInsights
);

// Get AI insight by ID
router.get(
  '/ai-insights/:id',
  protect,
  authorize('superadmin'),
  getAIInsightById
);

// Create new AI insight
router.post(
  '/ai-insights',
  protect,
  authorize('superadmin'),
  createAIInsight
);

// Acknowledge AI insight
router.patch(
  '/ai-insights/:id/acknowledge',
  protect,
  authorize('superadmin'),
  acknowledgeAIInsight
);

// Update AI insight status
router.patch(
  '/ai-insights/:id/status',
  protect,
  authorize('superadmin'),
  updateAIInsightStatus
);

// Delete AI insight
router.delete(
  '/ai-insights/:id',
  protect,
  authorize('superadmin'),
  deleteAIInsight
);

// ─── LIVE MONITORING ───────────────────────────────────────────────────────────

// Get live monitoring data
router.get(
  '/live-monitoring',
  protect,
  authorize('superadmin'),
  getLiveMonitoringData
);

// Create/update live monitoring data
router.post(
  '/live-monitoring',
  protect,
  authorize('superadmin'),
  createLiveMonitoringData
);

// Acknowledge monitoring alert
router.patch(
  '/live-monitoring/:id/alerts/:alertId/acknowledge',
  protect,
  authorize('superadmin'),
  acknowledgeMonitoringAlert
);

module.exports = router;
