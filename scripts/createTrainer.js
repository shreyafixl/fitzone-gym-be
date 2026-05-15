/**
 * Script to create a demo trainer account
 * Run: node scripts/createTrainer.js
 */

const mongoose = require('mongoose');
const Trainer = require('../models/Trainer');
const Branch = require('../models/Branch');
require('dotenv').config();

const createTrainer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management');
    console.log('✅ Connected to MongoDB');

    // Find or create a default branch
    let branch = await Branch.findOne();
    if (!branch) {
      console.log('⚠️  No branch found. Creating default branch...');
      branch = await Branch.create({
        branchName: 'Main Branch',
        branchCode: 'MB-001',
        city: 'New York',
        state: 'NY',
        address: '123 Fitness Street',
        pincode: '10001',
        contactNumber: '2125551234',
        email: 'main@fitzone.com',
        openingTime: '06:00',
        closingTime: '22:00',
        branchStatus: 'active',
      });
      console.log('✅ Default branch created');
    }

    // Check if trainer already exists
    const existingTrainer = await Trainer.findOne({ email: 'trainer@gym.com' });
    if (existingTrainer) {
      console.log('⚠️  Trainer already exists with email: trainer@gym.com');
      console.log('Trainer ID:', existingTrainer._id);
      console.log('Trainer Name:', existingTrainer.fullName);
      await mongoose.connection.close();
      return;
    }

    // Create trainer
    const trainer = await Trainer.create({
      fullName: 'John Trainer',
      email: 'trainer@gym.com',
      password: 'Trainer@123', // Must be at least 8 characters
      phone: '9876543210',
      gender: 'male',
      specialization: ['strength-training', 'personal-training'],
      experience: 5,
      assignedBranch: branch._id,
      salary: {
        amount: 50000,
        currency: 'INR',
        paymentFrequency: 'monthly',
      },
      trainerStatus: 'active',
      joiningDate: new Date(),
      bio: 'Experienced fitness trainer with 5 years of experience in strength training and personal training.',
      rating: {
        average: 4.5,
        count: 10,
      },
      sessionsCompleted: 150,
      isActive: true,
    });

    console.log('✅ Trainer created successfully!');
    console.log('📋 Trainer Details:');
    console.log('   Email:', trainer.email);
    console.log('   Password: Trainer@123');
    console.log('   Name:', trainer.fullName);
    console.log('   ID:', trainer._id);
    console.log('   Branch:', branch.branchName);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error creating trainer:', error.message);
    process.exit(1);
  }
};

createTrainer();
