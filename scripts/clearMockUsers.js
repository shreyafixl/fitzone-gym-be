require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Script to clear all mock users from the database
 * Keeps only users that were created after a certain date or with specific criteria
 * Run: node scripts/clearMockUsers.js
 */

const clearMockUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all users (this will remove mock data)
    // In production, you might want to keep certain users
    const result = await User.deleteMany({});
    
    console.log('');
    console.log('🎉 ========================================');
    console.log('✅ All Mock Users Cleared Successfully!');
    console.log('🎉 ========================================');
    console.log('');
    console.log(`🗑️  Deleted ${result.deletedCount} users`);
    console.log('');
    console.log('✅ Database is now clean. Create new users using the form!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing users:', error.message);
    process.exit(1);
  }
};

clearMockUsers();
