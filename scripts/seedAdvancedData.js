const mongoose = require('mongoose');
require('dotenv').config();
const FeatureFlag = require('../models/FeatureFlag');
const AIInsight = require('../models/AIInsight');
const LiveMonitoring = require('../models/LiveMonitoring');
const SuperAdmin = require('../models/SuperAdmin');

const seedAdvancedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitzone-superadmin');
    console.log('Connected to MongoDB');

    // Find a SuperAdmin to use as creator
    let superAdmin = await SuperAdmin.findOne();
    if (!superAdmin) {
      console.log('No SuperAdmin found. Please create a SuperAdmin first.');
      return;
    }

    // Clear existing data
    await FeatureFlag.deleteMany({});
    await AIInsight.deleteMany({});
    await LiveMonitoring.deleteMany({});
    console.log('Cleared existing Advanced module data');

    // Seed Feature Flags
    const featureFlags = [
      {
        name: "AI Workout Suggestions",
        key: "ai_suggestions",
        enabled: true,
        environment: "production",
        description: "Show AI-powered workout tips to members",
        category: "ai",
        createdBy: superAdmin._id
      },
      {
        name: "Live Class Streaming",
        key: "live_streaming",
        enabled: false,
        environment: "beta",
        description: "Enable live class video streaming",
        category: "streaming",
        createdBy: superAdmin._id
      },
      {
        name: "Biometric Check-in",
        key: "biometric_checkin",
        enabled: true,
        environment: "production",
        description: "Fingerprint/face check-in at branches",
        category: "security",
        createdBy: superAdmin._id
      },
      {
        name: "Referral Program",
        key: "referral_program",
        enabled: true,
        environment: "production",
        description: "Member referral rewards system",
        category: "engagement",
        createdBy: superAdmin._id
      },
      {
        name: "Nutrition Tracker",
        key: "nutrition_tracker",
        enabled: false,
        environment: "beta",
        description: "In-app nutrition & diet tracking",
        category: "engagement",
        createdBy: superAdmin._id
      },
      {
        name: "Dark Mode",
        key: "dark_mode",
        enabled: true,
        environment: "production",
        description: "Dark theme for member app",
        category: "ui",
        createdBy: superAdmin._id
      },
      {
        name: "Multi-branch Membership",
        key: "multi_branch",
        enabled: false,
        environment: "alpha",
        description: "Single membership valid at all branches",
        category: "membership",
        createdBy: superAdmin._id
      }
    ];

    const createdFlags = await FeatureFlag.insertMany(featureFlags);
    console.log(`Created ${createdFlags.length} feature flags`);

    // Seed AI Insights
    const aiInsights = [
      {
        type: "revenue",
        title: "Revenue Opportunity",
        insight: "15 members on Monthly plan haven't upgraded in 6+ months. Targeted upgrade campaign could yield +$2,400/mo.",
        action: "Create Campaign",
        icon: "💡",
        priority: "medium",
        confidence: 85,
        potentialImpact: "high",
        metadata: {
          sourceData: "membership_analysis",
          relatedEntities: ["user", "membership"],
          entityIds: []
        }
      },
      {
        type: "churn",
        title: "Churn Risk Detected",
        insight: "23 members haven't checked in for 14+ days. Engagement nudge could recover ~60% based on historical data.",
        action: "Send Nudge",
        icon: "⚠️",
        priority: "high",
        confidence: 78,
        potentialImpact: "high",
        metadata: {
          sourceData: "attendance_analysis",
          relatedEntities: ["user"],
          entityIds: []
        }
      },
      {
        type: "equipment",
        title: "Maintenance Prediction",
        insight: "Treadmill #3 at North branch shows usage patterns similar to units that failed. Schedule preventive service.",
        action: "Schedule Service",
        icon: "🔧",
        priority: "medium",
        confidence: 92,
        potentialImpact: "medium",
        metadata: {
          sourceData: "equipment_usage",
          relatedEntities: ["equipment"],
          entityIds: []
        }
      },
      {
        type: "growth",
        title: "Peak Hour Optimization",
        insight: "Tuesday 6–8 PM is 94% capacity at Main. Adding one more class slot could serve 30+ additional members.",
        action: "Add Slot",
        icon: "📈",
        priority: "medium",
        confidence: 88,
        potentialImpact: "medium",
        metadata: {
          sourceData: "capacity_analysis",
          relatedEntities: ["branch"],
          entityIds: []
        }
      },
      {
        type: "finance",
        title: "Pricing Insight",
        insight: "Annual plan conversion rate is 12% below industry average. A 10% discount trial could boost conversions.",
        action: "Test Discount",
        icon: "💰",
        priority: "low",
        confidence: 71,
        potentialImpact: "medium",
        metadata: {
          sourceData: "pricing_analysis",
          relatedEntities: ["transaction"],
          entityIds: []
        }
      }
    ];

    const createdInsights = await AIInsight.insertMany(aiInsights);
    console.log(`Created ${createdInsights.length} AI insights`);

    // Seed Live Monitoring Data
    const liveMonitoringData = {
      activeUsers: 142,
      checkInsToday: 387,
      peakHour: "7:00 AM – 9:00 AM",
      currentLoad: 68,
      branchLive: [
        { branch: "Main", checkins: 158, active: 62, load: 78 },
        { branch: "North", checkins: 112, active: 48, load: 65 },
        { branch: "South", checkins: 89, active: 22, load: 45 },
        { branch: "West", checkins: 28, active: 10, load: 35 }
      ],
      systemMetrics: {
        cpuUsage: 68,
        memoryUsage: 72,
        diskUsage: 45,
        networkLatency: 38
      },
      alerts: [
        {
          type: "high_load",
          message: "Main branch server load approaching 80% capacity",
          severity: "warning",
          acknowledged: false
        },
        {
          type: "low_activity",
          message: "West branch showing unusually low activity for this time",
          severity: "info",
          acknowledged: false
        }
      ]
    };

    const createdMonitoring = await LiveMonitoring.create(liveMonitoringData);
    console.log('Created live monitoring data');

    console.log('\n✅ Advanced module data seeded successfully!');
    console.log(`- Feature Flags: ${createdFlags.length}`);
    console.log(`- AI Insights: ${createdInsights.length}`);
    console.log(`- Live Monitoring: 1 record`);
    
  } catch (error) {
    console.error('Error seeding Advanced module data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
if (require.main === module) {
  seedAdvancedData();
}

module.exports = seedAdvancedData;
