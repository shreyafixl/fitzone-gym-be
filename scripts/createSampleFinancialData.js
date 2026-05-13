require('dotenv').config();
const mongoose = require('mongoose');
const MembershipPlan = require('../models/MembershipPlan');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Script to create sample financial data for testing
 * Run: node scripts/createSampleFinancialData.js
 */

const samplePlans = [
  {
    planName: 'Monthly Basic',
    planCode: 'PLAN-MONTHLY',
    duration: 1,
    durationType: 'months',
    price: 1500,
    discount: 0,
    features: ['Access to Cardio Zone', 'Access to Weight Training', 'Locker Facility'],
    description: 'Perfect for beginners starting their fitness journey',
    category: 'basic',
    isPopular: false,
  },
  {
    planName: 'Quarterly Standard',
    planCode: 'PLAN-QUARTERLY',
    duration: 3,
    durationType: 'months',
    price: 4000,
    discount: 10,
    features: ['All Basic Features', 'Group Classes', 'Nutrition Consultation', 'Free Locker'],
    description: 'Best value for regular gym-goers',
    category: 'standard',
    isPopular: true,
  },
  {
    planName: 'Half-Yearly Premium',
    planCode: 'PLAN-HALFYEARLY',
    duration: 6,
    durationType: 'months',
    price: 7500,
    discount: 15,
    features: ['All Standard Features', 'Personal Training (4 sessions)', 'Steam & Sauna', 'Guest Pass (2)'],
    description: 'Premium experience with personal training',
    category: 'premium',
    isPopular: true,
  },
  {
    planName: 'Yearly VIP',
    planCode: 'PLAN-YEARLY',
    duration: 1,
    durationType: 'years',
    price: 12000,
    discount: 20,
    features: ['All Premium Features', 'Unlimited Personal Training', 'Priority Booking', 'Spa Access', 'Guest Pass (5)'],
    description: 'Ultimate fitness package with all amenities',
    category: 'vip',
    isPopular: false,
  },
  {
    planName: 'Student Special',
    planCode: 'PLAN-STUDENT',
    duration: 3,
    durationType: 'months',
    price: 3000,
    discount: 25,
    features: ['Access to Cardio Zone', 'Access to Weight Training', 'Group Classes', 'Student ID Required'],
    description: 'Special discounted plan for students',
    category: 'basic',
    isPopular: false,
  },
];

const createSampleFinancialData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if plans already exist
    const existingPlansCount = await MembershipPlan.countDocuments();
    
    if (existingPlansCount > 0) {
      console.log(`⚠️  Database already has ${existingPlansCount} membership plans`);
    }

    // Create membership plans
    console.log('\n📝 Creating membership plans...\n');
    
    const createdPlans = [];
    for (const planData of samplePlans) {
      const existing = await MembershipPlan.findByCode(planData.planCode);
      
      if (existing) {
        console.log(`⏭️  Skipped: ${planData.planName} (${planData.planCode}) - already exists`);
        createdPlans.push(existing);
        continue;
      }

      const plan = await MembershipPlan.create(planData);
      createdPlans.push(plan);
      console.log(`✅ Created: ${plan.planName} (${plan.planCode}) - ₹${plan.finalPrice}`);
    }

    // Create sample subscriptions if users exist
    const users = await User.find({ role: 'member' }).limit(5);
    
    if (users.length > 0 && createdPlans.length > 0) {
      console.log('\n📝 Creating sample subscriptions...\n');
      
      for (let i = 0; i < Math.min(users.length, 3); i++) {
        const user = users[i];
        const plan = createdPlans[i % createdPlans.length];
        
        const startDate = new Date();
        let endDate = new Date(startDate);
        
        if (plan.durationType === 'months') {
          endDate.setMonth(endDate.getMonth() + plan.duration);
        } else if (plan.durationType === 'years') {
          endDate.setFullYear(endDate.getFullYear() + plan.duration);
        }

        const subscription = await Subscription.create({
          user: user._id,
          membershipPlan: plan._id,
          startDate,
          endDate,
          status: 'active',
          amountPaid: plan.finalPrice,
          paymentMethod: 'card',
          transactionId: `TXN-${Date.now()}-${i}`,
        });

        // Create corresponding transaction
        const transactionId = await Transaction.generateTransactionId();
        await Transaction.create({
          transactionId,
          user: user._id,
          subscription: subscription._id,
          type: 'membership',
          amount: plan.finalPrice,
          status: 'success',
          paymentMethod: 'card',
          description: `Membership purchase: ${plan.planName}`,
        });

        plan.currentMembers += 1;
        await plan.save();

        console.log(`✅ Created subscription for ${user.fullName} - ${plan.planName}`);
      }
    }

    console.log('\n🎉 ========================================');
    console.log('✅ Sample Financial Data Created Successfully!');
    console.log('🎉 ========================================\n');

    // Display summary
    const stats = {
      plans: await MembershipPlan.countDocuments(),
      activePlans: await MembershipPlan.countDocuments({ isActive: true }),
      subscriptions: await Subscription.countDocuments(),
      activeSubscriptions: await Subscription.countDocuments({ status: 'active' }),
      transactions: await Transaction.countDocuments(),
      successfulTransactions: await Transaction.countDocuments({ status: 'success' }),
    };

    const transactions = await Transaction.find({ status: 'success' });
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);

    console.log('📊 Financial Statistics:');
    console.log(`   Total Plans: ${stats.plans}`);
    console.log(`   Active Plans: ${stats.activePlans}`);
    console.log(`   Total Subscriptions: ${stats.subscriptions}`);
    console.log(`   Active Subscriptions: ${stats.activeSubscriptions}`);
    console.log(`   Total Transactions: ${stats.transactions}`);
    console.log(`   Successful Transactions: ${stats.successfulTransactions}`);
    console.log(`   Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
    console.log('');

    console.log('💰 Membership Plans:');
    const plans = await MembershipPlan.find();
    plans.forEach(plan => {
      console.log(`   ${plan.planName}: ₹${plan.price} (${plan.discount}% off) = ₹${plan.finalPrice} - ${plan.currentMembers} members`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample financial data:', error.message);
    process.exit(1);
  }
};

createSampleFinancialData();
