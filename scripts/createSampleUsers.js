require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Script to create sample users for testing
 * Run: node scripts/createSampleUsers.js
 */

const sampleUsers = [
  {
    fullName: 'Rahul Sharma',
    email: 'rahul@example.com',
    password: 'User@123456',
    phone: '9876543210',
    gender: 'male',
    age: 28,
    membershipPlan: 'yearly',
    membershipStatus: 'active',
    membershipStartDate: new Date('2026-01-01'),
    membershipEndDate: new Date('2027-01-01'),
    role: 'member',
    address: 'Mumbai, Maharashtra',
    emergencyContact: {
      name: 'Priya Sharma',
      phone: '9876543211',
      relationship: 'spouse',
    },
  },
  {
    fullName: 'Priya Patel',
    email: 'priya@example.com',
    password: 'User@123456',
    phone: '9876543220',
    gender: 'female',
    age: 25,
    membershipPlan: 'half-yearly',
    membershipStatus: 'active',
    membershipStartDate: new Date('2026-02-01'),
    membershipEndDate: new Date('2026-08-01'),
    role: 'member',
    address: 'Delhi, India',
  },
  {
    fullName: 'Amit Kumar',
    email: 'amit.trainer@example.com',
    password: 'Trainer@123456',
    phone: '9876543230',
    gender: 'male',
    age: 32,
    membershipPlan: 'none',
    membershipStatus: 'active',
    role: 'trainer',
    address: 'Bangalore, Karnataka',
  },
  {
    fullName: 'Sneha Reddy',
    email: 'sneha.trainer@example.com',
    password: 'Trainer@123456',
    phone: '9876543240',
    gender: 'female',
    age: 29,
    membershipPlan: 'none',
    membershipStatus: 'active',
    role: 'trainer',
    address: 'Hyderabad, Telangana',
  },
  {
    fullName: 'Vikram Singh',
    email: 'vikram@example.com',
    password: 'User@123456',
    phone: '9876543250',
    gender: 'male',
    age: 35,
    membershipPlan: 'monthly',
    membershipStatus: 'expired',
    membershipStartDate: new Date('2026-03-01'),
    membershipEndDate: new Date('2026-04-01'),
    role: 'member',
    address: 'Pune, Maharashtra',
  },
  {
    fullName: 'Anjali Verma',
    email: 'anjali@example.com',
    password: 'User@123456',
    phone: '9876543260',
    gender: 'female',
    age: 22,
    membershipPlan: 'quarterly',
    membershipStatus: 'pending',
    role: 'member',
    address: 'Chennai, Tamil Nadu',
  },
  {
    fullName: 'Rajesh Staff',
    email: 'rajesh.staff@example.com',
    password: 'Staff@123456',
    phone: '9876543270',
    gender: 'male',
    age: 40,
    membershipPlan: 'none',
    membershipStatus: 'active',
    role: 'staff',
    address: 'Kolkata, West Bengal',
  },
];

const createSampleUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if users already exist
    const existingCount = await User.countDocuments();
    
    if (existingCount > 0) {
      console.log(`⚠️  Database already has ${existingCount} users`);
      console.log('Do you want to continue? This will add more users.');
    }

    // Create users
    console.log('\n📝 Creating sample users...\n');
    
    for (const userData of sampleUsers) {
      // Check if user already exists
      const existing = await User.findOne({ email: userData.email });
      
      if (existing) {
        console.log(`⏭️  Skipped: ${userData.fullName} (${userData.email}) - already exists`);
        continue;
      }

      const user = await User.create(userData);
      console.log(`✅ Created: ${user.fullName} (${user.role}) - ${user.email}`);
    }

    console.log('\n🎉 ========================================');
    console.log('✅ Sample Users Created Successfully!');
    console.log('🎉 ========================================\n');

    // Display summary
    const stats = {
      total: await User.countDocuments(),
      members: await User.countDocuments({ role: 'member' }),
      trainers: await User.countDocuments({ role: 'trainer' }),
      staff: await User.countDocuments({ role: 'staff' }),
      active: await User.countDocuments({ membershipStatus: 'active' }),
      expired: await User.countDocuments({ membershipStatus: 'expired' }),
      pending: await User.countDocuments({ membershipStatus: 'pending' }),
    };

    console.log('📊 Database Statistics:');
    console.log(`   Total Users: ${stats.total}`);
    console.log(`   Members: ${stats.members}`);
    console.log(`   Trainers: ${stats.trainers}`);
    console.log(`   Staff: ${stats.staff}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Expired: ${stats.expired}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log('');

    console.log('🔑 Test Credentials:');
    console.log('   Member: rahul@example.com / User@123456');
    console.log('   Trainer: amit.trainer@example.com / Trainer@123456');
    console.log('   Staff: rajesh.staff@example.com / Staff@123456');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample users:', error.message);
    process.exit(1);
  }
};

createSampleUsers();
