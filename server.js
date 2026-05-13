require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Security Middleware
app.use(helmet()); // Set security headers
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim()),
  credentials: true,
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression Middleware
app.use(compression());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FitZone Super Admin API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FitZone Super Admin API v1.0',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      memberAuth: '/api/auth',
      adminAuth: '/api/admin/auth',
      adminUsers: '/api/admin/users',
      adminBranches: '/api/admin/branches',
      adminAnalytics: '/api/admin/analytics',
      adminAttendance: '/api/admin/attendance',
      adminMemberships: '/api/admin/memberships',
      adminMembershipPlans: '/api/admin/membership-plans',
      adminWorkouts: '/api/admin/workouts',
      adminSchedules: '/api/admin/schedules',
      adminTrainers: '/api/admin/trainers',
      adminSupport: '/api/admin/support',
      adminCommunication: '/api/admin/communication',
      trainerAuth: '/api/trainer/auth',
      trainerMembers: '/api/trainer/members',
      trainerWorkouts: '/api/trainer/workouts',
      trainerDiets: '/api/trainer/diets',
      trainerAttendance: '/api/trainer/attendance',
      trainerProgress: '/api/trainer/progress',
      trainerSchedule: '/api/trainer/schedule',
      trainerNotifications: '/api/trainer/notifications',
      trainerDashboard: '/api/trainer/dashboard',
      superAdminAuth: '/api/superadmin/auth',
      users: '/api/superadmin/users',
      branches: '/api/superadmin/branches',
      financial: '/api/superadmin/financial',
      analytics: '/api/superadmin/analytics',
      communication: '/api/superadmin/communication',
      attendance: '/api/attendance',
      memberships: '/api/memberships',
      membershipPlans: '/api/membership-plans',
      workouts: '/api/workouts',
      diets: '/api/diets',
      schedules: '/api/schedules',
      trainers: '/api/trainers',
      support: '/api/support',
      settings: '/api/settings',
      integrations: '/api/integrations',
      data: '/api/data',
    },
  });
});

// Mount API Routes

// Member/User Authentication (for frontend)
app.use('/api/auth', require('./routes/memberAuthRoutes'));

// Admin Authentication (for admin panel)
app.use('/api/admin/auth', require('./routes/adminAuthRoutes'));

// Admin User Management (for admin panel)
app.use('/api/admin/users', require('./routes/adminUserRoutes'));

// Admin Branch Management (for admin panel)
app.use('/api/admin/branches', require('./routes/adminBranchRoutes'));

// Admin Analytics (for admin panel)
app.use('/api/admin/analytics', require('./routes/adminAnalyticsRoutes'));

// Admin Attendance Management (for admin panel)
app.use('/api/admin/attendance', require('./routes/adminAttendanceRoutes'));

// Admin Membership Management (for admin panel)
app.use('/api/admin', require('./routes/adminMembershipRoutes'));

// Admin Workout Management (for admin panel)
app.use('/api/admin/workouts', require('./routes/adminWorkoutRoutes'));

// Admin Schedule Management (for admin panel)
app.use('/api/admin/schedules', require('./routes/adminScheduleRoutes'));

// Admin Trainer Management (for admin panel)
app.use('/api/admin/trainers', require('./routes/adminTrainerRoutes'));

// Admin Support Ticket Management (for admin panel)
app.use('/api/admin/support', require('./routes/adminSupportRoutes'));

// Admin Communication System (for admin panel)
app.use('/api/admin/communication', require('./routes/adminCommunicationRoutes'));

// Trainer Authentication (for trainer dashboard)
app.use('/api/trainer/auth', require('./routes/trainerAuthRoutes'));

// Trainer Members Management (for trainer dashboard)
app.use('/api/trainer/members', require('./routes/trainerMemberRoutes'));

// Trainer Workout Management (for trainer dashboard)
app.use('/api/trainer/workouts', require('./routes/trainerWorkoutRoutes'));

// Trainer Diet & Nutrition Management (for trainer dashboard)
app.use('/api/trainer/diets', require('./routes/trainerDietRoutes'));

// Trainer Attendance Management (for trainer dashboard)
app.use('/api/trainer/attendance', require('./routes/trainerAttendanceRoutes'));

// Trainer Progress Tracking (for trainer dashboard)
app.use('/api/trainer/progress', require('./routes/trainerProgressRoutes'));

// Trainer Schedule & Session Management (for trainer dashboard)
app.use('/api/trainer/schedule', require('./routes/trainerScheduleRoutes'));

// Trainer Notifications (for trainer dashboard)
app.use('/api/trainer/notifications', require('./routes/trainerNotificationRoutes'));

// Trainer Dashboard Analytics (for trainer dashboard)
app.use('/api/trainer/dashboard', require('./routes/trainerDashboardRoutes'));

// Super Admin Routes
app.use('/api/superadmin/auth', require('./routes/superadminAuthRoutes'));
app.use('/api/superadmin/users', require('./routes/userRoutes'));
app.use('/api/superadmin/branches', require('./routes/branchRoutes'));
app.use('/api/superadmin/financial', require('./routes/financialRoutes'));
app.use('/api/superadmin/analytics', require('./routes/analyticsRoutes'));
app.use('/api/superadmin/communication', require('./routes/communicationRoutes'));
app.use('/api/superadmin/equipment', require('./routes/equipmentRoutes'));
app.use('/api/superadmin/vendors', require('./routes/vendorRoutes'));
app.use('/api/superadmin/integrations', require('./routes/integrationRoutes'));
app.use('/api/superadmin/data-management', require('./routes/superadminDataManagementRoutes'));
app.use('/api/superadmin/advanced', require('./routes/advancedRoutes'));

// Attendance Routes
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Membership Routes
app.use('/api', require('./routes/membershipRoutes'));

// Workout Routes
app.use('/api/workouts', require('./routes/workoutRoutes'));

// Diet Routes
app.use('/api/diets', require('./routes/dietRoutes'));

// Schedule Routes
app.use('/api/schedules', require('./routes/scheduleRoutes'));

// Trainer Routes
app.use('/api/trainers', require('./routes/trainerRoutes'));

// Support Routes
app.use('/api/support', require('./routes/supportRoutes'));

// Settings Routes
app.use('/api/settings', require('./routes/settingsRoutes'));

// Integration Routes
app.use('/api/integrations', require('./routes/integrationRoutes'));

// Data Management Routes
app.use('/api/data', require('./routes/dataManagementRoutes'));

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`🏋️  FitZone Super Admin API Server`);
  console.log('🚀 ========================================');
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('🚀 ========================================');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
