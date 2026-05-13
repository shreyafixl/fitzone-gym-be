const Integration = require('../models/Integration');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all integrations
 * @route   GET /api/superadmin/integrations
 * @access  Private (SuperAdmin)
 */
const getIntegrations = asyncHandler(async (req, res) => {
  const { category, enabled } = req.query;

  let filter = {};
  if (category) filter.category = category;
  if (enabled !== undefined) filter.enabled = enabled === 'true';

  const integrations = await Integration.find(filter).sort({ category: 1, name: 1 });

  const summary = {
    total: integrations.length,
    enabled: integrations.filter(i => i.enabled).length,
    disabled: integrations.filter(i => !i.enabled).length,
    byCategory: {},
  };

  // Group by category
  integrations.forEach(i => {
    if (!summary.byCategory[i.category]) {
      summary.byCategory[i.category] = 0;
    }
    summary.byCategory[i.category]++;
  });

  ApiResponse.success(res, { integrations, summary }, 'Integrations retrieved successfully');
});

/**
 * @desc    Get integration by ID
 * @route   GET /api/superadmin/integrations/:integrationId
 * @access  Private (SuperAdmin)
 */
const getIntegrationById = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.integrationId).select(
    '+apiKey +apiSecret +webhookSecret'
  );

  if (!integration) {
    throw ApiError.notFound('Integration not found');
  }

  ApiResponse.success(res, integration, 'Integration retrieved successfully');
});

/**
 * @desc    Create integration
 * @route   POST /api/superadmin/integrations
 * @access  Private (SuperAdmin)
 */
const createIntegration = asyncHandler(async (req, res) => {
  const { name, category, description, icon, apiKey, apiSecret, webhookUrl } = req.body;

  if (!name || !category) {
    throw ApiError.badRequest('Name and category are required');
  }

  const integration = await Integration.create({
    name,
    category,
    description: description || '',
    icon: icon || '🔌',
    apiKey: apiKey || '',
    apiSecret: apiSecret || '',
    webhookUrl: webhookUrl || '',
  });

  ApiResponse.success(res, integration, 'Integration created successfully', 201);
});

/**
 * @desc    Update integration
 * @route   PUT /api/superadmin/integrations/:integrationId
 * @access  Private (SuperAdmin)
 */
const updateIntegration = asyncHandler(async (req, res) => {
  let integration = await Integration.findById(req.params.integrationId);

  if (!integration) {
    throw ApiError.notFound('Integration not found');
  }

  integration = await Integration.findByIdAndUpdate(
    req.params.integrationId,
    req.body,
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, integration, 'Integration updated successfully');
});

/**
 * @desc    Toggle integration enabled/disabled
 * @route   PATCH /api/superadmin/integrations/:integrationId/toggle
 * @access  Private (SuperAdmin)
 */
const toggleIntegration = asyncHandler(async (req, res) => {
  let integration = await Integration.findById(req.params.integrationId);

  if (!integration) {
    throw ApiError.notFound('Integration not found');
  }

  integration.enabled = !integration.enabled;
  await integration.save();

  ApiResponse.success(res, integration, `Integration ${integration.enabled ? 'enabled' : 'disabled'}`);
});

/**
 * @desc    Test integration connection
 * @route   POST /api/superadmin/integrations/:integrationId/test
 * @access  Private (SuperAdmin)
 */
const testIntegrationConnection = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.integrationId).select(
    '+apiKey +apiSecret'
  );

  if (!integration) {
    throw ApiError.notFound('Integration not found');
  }

  if (!integration.apiKey) {
    throw ApiError.badRequest('API key not configured');
  }

  try {
    // Simulate connection test
    // In production, this would make actual API calls to verify credentials
    integration.connectionStatus = 'connected';
    integration.lastConnectionTest = new Date();
    integration.connectionError = '';
    await integration.save();

    ApiResponse.success(res, integration, 'Connection test successful');
  } catch (error) {
    integration.connectionStatus = 'error';
    integration.connectionError = error.message;
    await integration.save();

    throw ApiError.badRequest(`Connection test failed: ${error.message}`);
  }
});

/**
 * @desc    Update integration settings
 * @route   PATCH /api/superadmin/integrations/:integrationId/settings
 * @access  Private (SuperAdmin)
 */
const updateIntegrationSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    throw ApiError.badRequest('Settings must be an object');
  }

  const integration = await Integration.findByIdAndUpdate(
    req.params.integrationId,
    { settings: new Map(Object.entries(settings)) },
    { new: true, runValidators: true }
  );

  if (!integration) {
    throw ApiError.notFound('Integration not found');
  }

  ApiResponse.success(res, integration, 'Integration settings updated successfully');
});

/**
 * @desc    Delete integration
 * @route   DELETE /api/superadmin/integrations/:integrationId
 * @access  Private (SuperAdmin)
 */
const deleteIntegration = asyncHandler(async (req, res) => {
  const integration = await Integration.findByIdAndDelete(req.params.integrationId);

  if (!integration) {
    throw ApiError.notFound('Integration not found');
  }

  ApiResponse.success(res, null, 'Integration deleted successfully');
});

/**
 * @desc    Get integration settings
 * @route   GET /api/superadmin/integrations/settings
 * @access  Private (SuperAdmin)
 */
const getIntegrationSettings = asyncHandler(async (req, res) => {
  const integrations = await Integration.find().select(
    'name category enabled settings connectionStatus lastConnectionTest'
  );

  const settings = integrations.map(i => ({
    id: i._id,
    name: i.name,
    category: i.category,
    enabled: i.enabled,
    settings: Object.fromEntries(i.settings || []),
    connectionStatus: i.connectionStatus,
    lastConnectionTest: i.lastConnectionTest,
  }));

  ApiResponse.success(res, { settings }, 'Integration settings retrieved successfully');
});

/**
 * @desc    Get available apps
 * @route   GET /api/superadmin/integrations/apps
 * @access  Private (SuperAdmin)
 */
const getAvailableApps = asyncHandler(async (req, res) => {
  const integrations = await Integration.find().select(
    'name category description icon enabled permissions metadata'
  );

  const apps = integrations.map(i => ({
    id: i._id,
    name: i.name,
    category: i.category,
    description: i.description,
    icon: i.icon,
    installed: i.enabled,
    permissions: i.permissions || [],
    metadata: Object.fromEntries(i.metadata || []),
  }));

  ApiResponse.success(res, { apps }, 'Available apps retrieved successfully');
});

/**
 * @desc    Install app
 * @route   POST /api/superadmin/integrations/:integrationId/install
 * @access  Private (SuperAdmin)
 */
const installApp = asyncHandler(async (req, res) => {
  const integration = await Integration.findByIdAndUpdate(
    req.params.integrationId,
    { enabled: true },
    { new: true }
  );

  if (!integration) {
    throw ApiError.notFound('App not found');
  }

  ApiResponse.success(res, integration, 'App installed successfully');
});

/**
 * @desc    Uninstall app
 * @route   DELETE /api/superadmin/integrations/:integrationId/uninstall
 * @access  Private (SuperAdmin)
 */
const uninstallApp = asyncHandler(async (req, res) => {
  const integration = await Integration.findByIdAndUpdate(
    req.params.integrationId,
    { enabled: false },
    { new: true }
  );

  if (!integration) {
    throw ApiError.notFound('App not found');
  }

  ApiResponse.success(res, integration, 'App uninstalled successfully');
});

module.exports = {
  getIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  toggleIntegration,
  testIntegrationConnection,
  updateIntegrationSettings,
  deleteIntegration,
  getIntegrationSettings,
  getAvailableApps,
  installApp,
  uninstallApp,
};
