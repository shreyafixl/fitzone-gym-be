require('dotenv').config();
const mongoose = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * Script to create a Super Admin user
 * Run: node scripts/createSuperAdmin.js
 */

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await SuperAdmin.findOne({ email: 'admin@fitzone.com' });

    if (existingAdmin) {
      console.log('⚠️  Super Admin already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.name);
      process.exit(0);
    }

    // Create new super admin
    const superAdmin = await SuperAdmin.create({
      name: 'Aditya Sharma',
      email: 'admin@fitzone.com',
      password: 'Admin@123456', // Will be hashed automatically
      role: 'superadmin',
      company: 'FitZone Group',
      phone: '+91 98765 43210',
      isActive: true,
    });

    console.log('');
    console.log('🎉 ========================================');
    console.log('✅ Super Admin Created Successfully!');
    console.log('🎉 ========================================');
    console.log('');
    console.log('📧 Email:    admin@fitzone.com');
    console.log('🔑 Password: Admin@123456');
    console.log('👤 Name:     Aditya Sharma');
    console.log('🏢 Company:  FitZone Group');
    console.log('🎭 Role:     superadmin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();
