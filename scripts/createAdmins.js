require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

// Sample admin users
const admins = [
  {
    name: 'Admin User',
    email: 'admin@fitzone.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '9876543210',
    department: 'operations',
    permissions: {
      canManageUsers: true,
      canManageBranches: true,
      canManageFinance: true,
      canManageTrainers: true,
      canManageClasses: true,
      canViewReports: true,
      canManageSettings: true,
      canDeleteRecords: true,
    },
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Manager User',
    email: 'manager@fitzone.com',
    password: 'Manager@123',
    role: 'manager',
    phone: '9876543211',
    department: 'operations',
    permissions: {
      canManageUsers: true,
      canManageBranches: true,
      canManageFinance: false,
      canManageTrainers: true,
      canManageClasses: true,
      canViewReports: true,
      canManageSettings: false,
      canDeleteRecords: false,
    },
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Staff User',
    email: 'staff@fitzone.com',
    password: 'Staff@123',
    role: 'staff',
    phone: '9876543212',
    department: 'general',
    permissions: {
      canManageUsers: false,
      canManageBranches: false,
      canManageFinance: false,
      canManageTrainers: false,
      canManageClasses: true,
      canViewReports: true,
      canManageSettings: false,
      canDeleteRecords: false,
    },
    isActive: true,
    isEmailVerified: true,
  },
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitzone', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Create admins
const createAdmins = async () => {
  try {
    await connectDB();

    // Clear existing admins (optional - comment out if you want to keep existing)
    // await Admin.deleteMany({});
    // console.log('🗑️  Cleared existing admins');

    // Create admins
    for (const adminData of admins) {
      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email: adminData.email });
      
      if (existingAdmin) {
        console.log(`⚠️  Admin already exists: ${adminData.email}`);
        continue;
      }

      const admin = await Admin.create(adminData);
      console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
    }

    console.log('\n🎉 Admin creation completed!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    admins.forEach((admin) => {
      console.log(`\n👤 ${admin.role.toUpperCase()}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admins:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmins();
