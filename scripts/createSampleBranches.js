require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');

/**
 * Script to create sample branches for testing
 * Run: node scripts/createSampleBranches.js
 */

const sampleBranches = [
  {
    branchName: 'FitZone Main Branch',
    branchCode: 'FZ-MAIN',
    address: '123 MG Road, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400058',
    contactNumber: '9876543210',
    email: 'main@fitzone.com',
    capacity: 500,
    openingTime: '05:00',
    closingTime: '23:00',
    facilities: ['Cardio Zone', 'Weight Training', 'Yoga Studio', 'Steam Room', 'Locker Rooms', 'Parking'],
    branchStatus: 'active',
    description: 'Our flagship branch with state-of-the-art equipment and facilities',
    totalMembers: 342,
  },
  {
    branchName: 'FitZone North Branch',
    branchCode: 'FZ-NORTH',
    address: '456 Linking Road, Bandra',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    contactNumber: '9876543220',
    email: 'north@fitzone.com',
    capacity: 400,
    openingTime: '06:00',
    closingTime: '22:00',
    facilities: ['Cardio Zone', 'Weight Training', 'Zumba Studio', 'Locker Rooms', 'Parking'],
    branchStatus: 'active',
    description: 'Premium branch in the heart of Bandra',
    totalMembers: 278,
  },
  {
    branchName: 'FitZone South Branch',
    branchCode: 'FZ-SOUTH',
    address: '789 Nehru Nagar, Kurla',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400024',
    contactNumber: '9876543230',
    email: 'south@fitzone.com',
    capacity: 350,
    openingTime: '05:30',
    closingTime: '22:30',
    facilities: ['Cardio Zone', 'Weight Training', 'CrossFit Area', 'Locker Rooms'],
    branchStatus: 'active',
    description: 'Affordable fitness for South Mumbai residents',
    totalMembers: 195,
  },
  {
    branchName: 'FitZone West Branch',
    branchCode: 'FZ-WEST',
    address: '321 SV Road, Goregaon',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400062',
    contactNumber: '9876543240',
    email: 'west@fitzone.com',
    capacity: 450,
    openingTime: '05:00',
    closingTime: '23:00',
    facilities: ['Cardio Zone', 'Weight Training', 'Swimming Pool', 'Spa', 'Locker Rooms', 'Parking', 'Cafe'],
    branchStatus: 'active',
    description: 'Luxury fitness experience with swimming pool and spa',
    totalMembers: 412,
  },
  {
    branchName: 'FitZone Pune Branch',
    branchCode: 'FZ-PUNE',
    address: '555 FC Road, Shivajinagar',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411005',
    contactNumber: '9876543250',
    email: 'pune@fitzone.com',
    capacity: 400,
    openingTime: '06:00',
    closingTime: '22:00',
    facilities: ['Cardio Zone', 'Weight Training', 'Yoga Studio', 'Locker Rooms', 'Parking'],
    branchStatus: 'active',
    description: 'First branch outside Mumbai, serving Pune fitness enthusiasts',
    totalMembers: 156,
  },
  {
    branchName: 'FitZone Express Thane',
    branchCode: 'FZ-THANE',
    address: '888 Ghodbunder Road, Thane West',
    city: 'Thane',
    state: 'Maharashtra',
    pincode: '400607',
    contactNumber: '9876543260',
    email: 'thane@fitzone.com',
    capacity: 300,
    openingTime: '06:00',
    closingTime: '22:00',
    facilities: ['Cardio Zone', 'Weight Training', 'Locker Rooms'],
    branchStatus: 'active',
    description: 'Compact express branch for quick workouts',
    totalMembers: 89,
  },
  {
    branchName: 'FitZone Bangalore Branch',
    branchCode: 'FZ-BLR',
    address: '100 MG Road, Indiranagar',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560038',
    contactNumber: '9876543270',
    email: 'bangalore@fitzone.com',
    capacity: 500,
    openingTime: '05:00',
    closingTime: '23:00',
    facilities: ['Cardio Zone', 'Weight Training', 'Yoga Studio', 'Pilates Studio', 'Locker Rooms', 'Parking', 'Juice Bar'],
    branchStatus: 'under-maintenance',
    description: 'Newly opened branch, currently under maintenance for equipment upgrade',
    totalMembers: 45,
  },
];

const createSampleBranches = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if branches already exist
    const existingCount = await Branch.countDocuments();
    
    if (existingCount > 0) {
      console.log(`⚠️  Database already has ${existingCount} branches`);
      console.log('Do you want to continue? This will add more branches.');
    }

    // Create branches
    console.log('\n📝 Creating sample branches...\n');
    
    for (const branchData of sampleBranches) {
      // Check if branch already exists
      const existing = await Branch.findByCode(branchData.branchCode);
      
      if (existing) {
        console.log(`⏭️  Skipped: ${branchData.branchName} (${branchData.branchCode}) - already exists`);
        continue;
      }

      const branch = await Branch.create(branchData);
      console.log(`✅ Created: ${branch.branchName} (${branch.branchCode}) - ${branch.city}`);
    }

    console.log('\n🎉 ========================================');
    console.log('✅ Sample Branches Created Successfully!');
    console.log('🎉 ========================================\n');

    // Display summary
    const stats = {
      total: await Branch.countDocuments(),
      active: await Branch.countDocuments({ branchStatus: 'active' }),
      inactive: await Branch.countDocuments({ branchStatus: 'inactive' }),
      underMaintenance: await Branch.countDocuments({ branchStatus: 'under-maintenance' }),
    };

    const branches = await Branch.find();
    const totalMembers = branches.reduce((sum, b) => sum + b.totalMembers, 0);
    const totalCapacity = branches.reduce((sum, b) => sum + b.capacity, 0);

    console.log('📊 Database Statistics:');
    console.log(`   Total Branches: ${stats.total}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Inactive: ${stats.inactive}`);
    console.log(`   Under Maintenance: ${stats.underMaintenance}`);
    console.log(`   Total Members: ${totalMembers}`);
    console.log(`   Total Capacity: ${totalCapacity}`);
    console.log(`   Occupancy Rate: ${((totalMembers / totalCapacity) * 100).toFixed(2)}%`);
    console.log('');

    console.log('🏢 Branches by City:');
    const branchesByCity = await Branch.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          totalMembers: { $sum: '$totalMembers' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    branchesByCity.forEach(city => {
      console.log(`   ${city._id}: ${city.count} branches, ${city.totalMembers} members`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample branches:', error.message);
    process.exit(1);
  }
};

createSampleBranches();
