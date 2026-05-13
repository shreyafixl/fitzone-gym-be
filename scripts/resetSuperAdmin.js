require('dotenv').config();
const mongoose = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * Script to reset/create SuperAdmin user
 * Run: node scripts/resetSuperAdmin.js
 */

const resetSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing superadmin@gym.com if it exists
    const existingAdmin = await SuperAdmin.findOne({ email: 'superadmin@gym.com' });
    if (existingAdmin) {
      await SuperAdmin.deleteOne({ email: 'superadmin@gym.com' });
      console.log('🗑️  Deleted existing superadmin@gym.com');
    }

    // Create new SuperAdmin
    const superAdmin = await SuperAdmin.create({
      name: 'Aditya Sharma',
      email: 'superadmin@gym.com',
      password: 'SuperAdmin@123', // Will be hashed automatically
      role: 'superadmin',
      company: 'FitZone Group',
      phone: '+91 98765 43210',
      isActive: true,
    });

    console.log('');
    console.log('🎉 ========================================');
    console.log('✅ SuperAdmin Created Successfully!');
    console.log('🎉 ========================================');
    console.log('');
    console.log('📧 Email:    superadmin@gym.com');
    console.log('🔑 Password: SuperAdmin@123');
    console.log('👤 Name:     Aditya Sharma');
    console.log('🏢 Company:  FitZone Group');
    console.log('🎭 Role:     superadmin');
    console.log('');
    console.log('✅ You can now login with these credentials!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
};

resetSuperAdmin();
