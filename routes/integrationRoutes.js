const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/integrationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/**
 * Integration Routes
 */

// Get all integrations
router.get('/', protect, authorize('superadmin'), getIntegrations);

// Get integration settings
router.get('/settings', protect, authorize('superadmin'), getIntegrationSettings);

// Get available apps
router.get('/apps', protect, authorize('superadmin'), getAvailableApps);

// Create integration
router.post('/', protect, authorize('superadmin'), createIntegration);

// Get integration by ID
router.get('/:integrationId', protect, authorize('superadmin'), getIntegrationById);

// Update integration
router.put('/:integrationId', protect, authorize('superadmin'), updateIntegration);

// Toggle integration enabled/disabled
router.patch('/:integrationId/toggle', protect, authorize('superadmin'), toggleIntegration);

// Test integration connection
router.post('/:integrationId/test', protect, authorize('superadmin'), testIntegrationConnection);

// Update integration settings
router.patch('/:integrationId/settings', protect, authorize('superadmin'), updateIntegrationSettings);

// Install app
router.post('/:integrationId/install', protect, authorize('superadmin'), installApp);

// Uninstall app
router.delete('/:integrationId/uninstall', protect, authorize('superadmin'), uninstallApp);

// Delete integration
router.delete('/:integrationId', protect, authorize('superadmin'), deleteIntegration);

module.exports = router;
