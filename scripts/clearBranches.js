require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');

/**
 * Script to clear all branches from the database
 * Run: node scripts/clearBranches.js
 */

const clearBranches = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all branches
    const result = await Branch.deleteMany({});
    console.log('');
    console.log('🎉 ========================================');
    console.log('✅ All Branches Cleared Successfully!');
    console.log('🎉 ========================================');
    console.log('');
    console.log(`🗑️  Deleted ${result.deletedCount} branches`);
    console.log('');
    console.log('✅ Database is now clean. Create new branches using the form!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing branches:', error.message);
    process.exit(1);
  }
};

clearBranches();
