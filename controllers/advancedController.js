const FeatureFlag = require('../models/FeatureFlag');
const AIInsight = require('../models/AIInsight');
const LiveMonitoring = require('../models/LiveMonitoring');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all feature flags
 * @route   GET /api/superadmin/advanced/feature-flags
 * @access  Private (SuperAdmin)
 */
const getAllFeatureFlags = asyncHandler(async (req, res) => {
  const { environment, enabled, category } = req.query;
  
  // Build filter
  const filter = {};
  if (environment) filter.environment = environment;
  if (enabled !== undefined) filter.enabled = enabled === 'true';
  if (category) filter.category = category;

  const featureFlags = await FeatureFlag.find(filter)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'fullName email')
    .populate('lastModifiedBy', 'fullName email');

  ApiResponse.success(res, { featureFlags }, 'Feature flags retrieved successfully');
});

/**
 * @desc    Get feature flag by ID
 * @route   GET /api/superadmin/advanced/feature-flags/:id
 * @access  Private (SuperAdmin)
 */
const getFeatureFlagById = asyncHandler(async (req, res) => {
  const featureFlag = await FeatureFlag.findById(req.params.id)
    .populate('createdBy', 'fullName email')
    .populate('lastModifiedBy', 'fullName email');

  if (!featureFlag) {
    throw new ApiError(404, 'Feature flag not found');
  }

  ApiResponse.success(res, { featureFlag }, 'Feature flag retrieved successfully');
});

/**
 * @desc    Create new feature flag
 * @route   POST /api/superadmin/advanced/feature-flags
 * @access  Private (SuperAdmin)
 */
const createFeatureFlag = asyncHandler(async (req, res) => {
  const { name, key, enabled, environment, description, category } = req.body;

  // Check if feature flag with same key already exists
  const existingFlag = await FeatureFlag.findOne({ key });
  if (existingFlag) {
    throw new ApiError(400, 'Feature flag with this key already exists');
  }

  const featureFlag = await FeatureFlag.create({
    name,
    key,
    enabled: enabled || false,
    environment: environment || 'development',
    description,
    category: category || 'other',
    createdBy: req.user._id
  });

  await featureFlag.populate('createdBy', 'fullName email');

  ApiResponse.success(res, { featureFlag }, 'Feature flag created successfully', 201);
});

/**
 * @desc    Update feature flag
 * @route   PUT /api/superadmin/advanced/feature-flags/:id
 * @access  Private (SuperAdmin)
 */
const updateFeatureFlag = asyncHandler(async (req, res) => {
  const { name, enabled, environment, description, category } = req.body;

  const featureFlag = await FeatureFlag.findById(req.params.id);
  if (!featureFlag) {
    throw new ApiError(404, 'Feature flag not found');
  }

  // Check if key is being changed and if new key already exists
  if (req.body.key && req.body.key !== featureFlag.key) {
    const existingFlag = await FeatureFlag.findOne({ key: req.body.key });
    if (existingFlag) {
      throw new ApiError(400, 'Feature flag with this key already exists');
    }
    featureFlag.key = req.body.key;
  }

  featureFlag.name = name || featureFlag.name;
  featureFlag.enabled = enabled !== undefined ? enabled : featureFlag.enabled;
  featureFlag.environment = environment || featureFlag.environment;
  featureFlag.description = description || featureFlag.description;
  featureFlag.category = category || featureFlag.category;
  featureFlag.lastModifiedBy = req.user._id;

  await featureFlag.save();
  await featureFlag.populate('createdBy', 'fullName email');
  await featureFlag.populate('lastModifiedBy', 'fullName email');

  ApiResponse.success(res, { featureFlag }, 'Feature flag updated successfully');
});

/**
 * @desc    Toggle feature flag
 * @route   PATCH /api/superadmin/advanced/feature-flags/:id/toggle
 * @access  Private (SuperAdmin)
 */
const toggleFeatureFlag = asyncHandler(async (req, res) => {
  const featureFlag = await FeatureFlag.findById(req.params.id);
  if (!featureFlag) {
    throw new ApiError(404, 'Feature flag not found');
  }

  featureFlag.enabled = !featureFlag.enabled;
  featureFlag.lastModifiedBy = req.user._id;

  await featureFlag.save();
  await featureFlag.populate('createdBy', 'fullName email');
  await featureFlag.populate('lastModifiedBy', 'fullName email');

  ApiResponse.success(res, { featureFlag }, 'Feature flag toggled successfully');
});

/**
 * @desc    Delete feature flag
 * @route   DELETE /api/superadmin/advanced/feature-flags/:id
 * @access  Private (SuperAdmin)
 */
const deleteFeatureFlag = asyncHandler(async (req, res) => {
  const featureFlag = await FeatureFlag.findById(req.params.id);
  if (!featureFlag) {
    throw new ApiError(404, 'Feature flag not found');
  }

  await FeatureFlag.findByIdAndDelete(req.params.id);

  ApiResponse.success(res, {}, 'Feature flag deleted successfully');
});

/**
 * @desc    Get all AI insights
 * @route   GET /api/superadmin/advanced/ai-insights
 * @access  Private (SuperAdmin)
 */
const getAllAIInsights = asyncHandler(async (req, res) => {
  const { type, status, priority } = req.query;
  
  // Build filter
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const insights = await AIInsight.find(filter)
    .sort({ createdAt: -1 })
    .populate('acknowledgedBy', 'fullName email');

  ApiResponse.success(res, { insights }, 'AI insights retrieved successfully');
});

/**
 * @desc    Get AI insight by ID
 * @route   GET /api/superadmin/advanced/ai-insights/:id
 * @access  Private (SuperAdmin)
 */
const getAIInsightById = asyncHandler(async (req, res) => {
  const insight = await AIInsight.findById(req.params.id)
    .populate('acknowledgedBy', 'fullName email');

  if (!insight) {
    throw new ApiError(404, 'AI insight not found');
  }

  ApiResponse.success(res, { insight }, 'AI insight retrieved successfully');
});

/**
 * @desc    Create new AI insight
 * @route   POST /api/superadmin/advanced/ai-insights
 * @access  Private (SuperAdmin)
 */
const createAIInsight = asyncHandler(async (req, res) => {
  const { type, title, insight, action, icon, priority, confidence, potentialImpact, metadata } = req.body;

  const aiInsight = await AIInsight.create({
    type,
    title,
    insight,
    action,
    icon: icon || '💡',
    priority: priority || 'medium',
    confidence: confidence || 75,
    potentialImpact: potentialImpact || 'medium',
    metadata: metadata || {}
  });

  ApiResponse.success(res, { insight: aiInsight }, 'AI insight created successfully', 201);
});

/**
 * @desc    Acknowledge AI insight
 * @route   PATCH /api/superadmin/advanced/ai-insights/:id/acknowledge
 * @access  Private (SuperAdmin)
 */
const acknowledgeAIInsight = asyncHandler(async (req, res) => {
  const aiInsight = await AIInsight.findById(req.params.id);
  if (!aiInsight) {
    throw new ApiError(404, 'AI insight not found');
  }

  aiInsight.status = 'acknowledged';
  aiInsight.acknowledgedBy = req.user._id;
  aiInsight.acknowledgedAt = new Date();

  await aiInsight.save();
  await aiInsight.populate('acknowledgedBy', 'fullName email');

  ApiResponse.success(res, { insight: aiInsight }, 'AI insight acknowledged successfully');
});

/**
 * @desc    Update AI insight status
 * @route   PATCH /api/superadmin/advanced/ai-insights/:id/status
 * @access  Private (SuperAdmin)
 */
const updateAIInsightStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['active', 'acknowledged', 'in_progress', 'resolved', 'dismissed'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const aiInsight = await AIInsight.findById(req.params.id);
  if (!aiInsight) {
    throw new ApiError(404, 'AI insight not found');
  }

  aiInsight.status = status;
  if (status === 'acknowledged') {
    aiInsight.acknowledgedBy = req.user._id;
    aiInsight.acknowledgedAt = new Date();
  }

  await aiInsight.save();
  await aiInsight.populate('acknowledgedBy', 'fullName email');

  ApiResponse.success(res, { insight: aiInsight }, 'AI insight status updated successfully');
});

/**
 * @desc    Delete AI insight
 * @route   DELETE /api/superadmin/advanced/ai-insights/:id
 * @access  Private (SuperAdmin)
 */
const deleteAIInsight = asyncHandler(async (req, res) => {
  const aiInsight = await AIInsight.findById(req.params.id);
  if (!aiInsight) {
    throw new ApiError(404, 'AI insight not found');
  }

  await AIInsight.findByIdAndDelete(req.params.id);

  ApiResponse.success(res, {}, 'AI insight deleted successfully');
});

/**
 * @desc    Get live monitoring data
 * @route   GET /api/superadmin/advanced/live-monitoring
 * @access  Private (SuperAdmin)
 */
const getLiveMonitoringData = asyncHandler(async (req, res) => {
  const { history } = req.query;
  
  if (history === 'true') {
    // Get historical data (last 24 hours)
    const monitoringData = await LiveMonitoring.getHistory(24);
    ApiResponse.success(res, { monitoringData }, 'Live monitoring history retrieved successfully');
  } else {
    // Get latest data
    const monitoringData = await LiveMonitoring.getLatest();
    ApiResponse.success(res, { monitoringData }, 'Live monitoring data retrieved successfully');
  }
});

/**
 * @desc    Create/update live monitoring data
 * @route   POST /api/superadmin/advanced/live-monitoring
 * @access  Private (SuperAdmin)
 */
const createLiveMonitoringData = asyncHandler(async (req, res) => {
  const { activeUsers, checkInsToday, peakHour, currentLoad, branchLive, systemMetrics, alerts } = req.body;

  const monitoringData = await LiveMonitoring.create({
    activeUsers: activeUsers || 0,
    checkInsToday: checkInsToday || 0,
    peakHour: peakHour || "Not available",
    currentLoad: currentLoad || 0,
    branchLive: branchLive || [],
    systemMetrics: systemMetrics || {},
    alerts: alerts || []
  });

  ApiResponse.success(res, { monitoringData }, 'Live monitoring data created successfully', 201);
});

/**
 * @desc    Acknowledge monitoring alert
 * @route   PATCH /api/superadmin/advanced/live-monitoring/:id/alerts/:alertId/acknowledge
 * @access  Private (SuperAdmin)
 */
const acknowledgeMonitoringAlert = asyncHandler(async (req, res) => {
  const { id, alertId } = req.params;

  const monitoringData = await LiveMonitoring.findById(id);
  if (!monitoringData) {
    throw new ApiError(404, 'Monitoring data not found');
  }

  const alert = monitoringData.alerts.id(alertId);
  if (!alert) {
    throw new ApiError(404, 'Alert not found');
  }

  alert.acknowledged = true;
  alert.acknowledgedBy = req.user._id;
  alert.acknowledgedAt = new Date();

  await monitoringData.save();

  ApiResponse.success(res, { alert }, 'Alert acknowledged successfully');
});

/**
 * @desc    Get Advanced module statistics
 * @route   GET /api/superadmin/advanced/stats
 * @access  Private (SuperAdmin)
 */
const getAdvancedStats = asyncHandler(async (req, res) => {
  const [
    totalFeatureFlags,
    enabledFeatureFlags,
    totalAIInsights,
    activeAIInsights,
    latestMonitoring
  ] = await Promise.all([
    FeatureFlag.countDocuments(),
    FeatureFlag.countDocuments({ enabled: true }),
    AIInsight.countDocuments(),
    AIInsight.countDocuments({ status: 'active' }),
    LiveMonitoring.getLatest()
  ]);

  const stats = {
    featureFlags: {
      total: totalFeatureFlags,
      enabled: enabledFeatureFlags,
      disabled: totalFeatureFlags - enabledFeatureFlags
    },
    aiInsights: {
      total: totalAIInsights,
      active: activeAIInsights,
      acknowledged: totalAIInsights - activeAIInsights
    },
    liveMonitoring: latestMonitoring || {
      activeUsers: 0,
      checkInsToday: 0,
      currentLoad: 0,
      branchLive: []
    }
  };

  ApiResponse.success(res, { stats }, 'Advanced module statistics retrieved successfully');
});

module.exports = {
  // Feature Flags
  getAllFeatureFlags,
  getFeatureFlagById,
  createFeatureFlag,
  updateFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
  
  // AI Insights
  getAllAIInsights,
  getAIInsightById,
  createAIInsight,
  acknowledgeAIInsight,
  updateAIInsightStatus,
  deleteAIInsight,
  
  // Live Monitoring
  getLiveMonitoringData,
  createLiveMonitoringData,
  acknowledgeMonitoringAlert,
  
  // Stats
  getAdvancedStats
};
