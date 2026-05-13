const express = require('express');
const router = express.Router();
const {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  cancelSubscription,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  getFinancialStats,
} = require('../controllers/financialController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

/**
 * Financial Management Routes
 * Base path: /api/superadmin/financial
 * All routes require authentication and super admin role
 */

// Apply authentication and authorization to all routes
router.use(protect);
router.use(superAdminOnly);

// Statistics route
router.get('/stats', getFinancialStats);

// Membership Plans routes
router.route('/plans')
  .get(getAllPlans)       // GET /api/superadmin/financial/plans
  .post(createPlan);      // POST /api/superadmin/financial/plans

router.route('/plans/:id')
  .get(getPlanById)       // GET /api/superadmin/financial/plans/:id
  .put(updatePlan)        // PUT /api/superadmin/financial/plans/:id
  .delete(deletePlan);    // DELETE /api/superadmin/financial/plans/:id

// Subscriptions routes
router.route('/subscriptions')
  .get(getAllSubscriptions)      // GET /api/superadmin/financial/subscriptions
  .post(createSubscription);     // POST /api/superadmin/financial/subscriptions

router.route('/subscriptions/:id')
  .get(getSubscriptionById);     // GET /api/superadmin/financial/subscriptions/:id

router.patch('/subscriptions/:id/cancel', cancelSubscription);

// Transactions routes
router.route('/transactions')
  .get(getAllTransactions)       // GET /api/superadmin/financial/transactions
  .post(createTransaction);      // POST /api/superadmin/financial/transactions

router.route('/transactions/:id')
  .get(getTransactionById);      // GET /api/superadmin/financial/transactions/:id

module.exports = router;
