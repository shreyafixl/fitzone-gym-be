const Integration = require('../models/Integration');

const integrationSeeds = [
  {
    name: 'Razorpay',
    category: 'Payment',
    description: 'Primary payment gateway',
    icon: '💳',
    enabled: true,
    connectionStatus: 'connected',
    permissions: ['payments', 'refunds', 'webhooks'],
  },
  {
    name: 'Stripe',
    category: 'Payment',
    description: 'International payments',
    icon: '💳',
    enabled: false,
    connectionStatus: 'disconnected',
    permissions: ['payments', 'subscriptions'],
  },
  {
    name: 'Twilio SMS',
    category: 'SMS',
    description: 'SMS notifications & OTP',
    icon: '📱',
    enabled: true,
    connectionStatus: 'connected',
    permissions: ['send_sms', 'receive_sms'],
  },
  {
    name: 'SendGrid Email',
    category: 'Email',
    description: 'Transactional email service',
    icon: '📧',
    enabled: true,
    connectionStatus: 'connected',
    permissions: ['send_email', 'templates'],
  },
  {
    name: 'Google Analytics',
    category: 'Analytics',
    description: 'Website & app analytics',
    icon: '📊',
    enabled: true,
    connectionStatus: 'connected',
    permissions: ['read_analytics', 'track_events'],
  },
  {
    name: 'Zoom',
    category: 'Video',
    description: 'Virtual training sessions',
    icon: '🎥',
    enabled: false,
    connectionStatus: 'disconnected',
    permissions: ['create_meetings', 'manage_users'],
  },
  {
    name: 'Slack',
    category: 'Comms',
    description: 'Internal team notifications',
    icon: '💬',
    enabled: false,
    connectionStatus: 'disconnected',
    permissions: ['send_messages', 'manage_channels'],
  },
  {
    name: 'AWS S3',
    category: 'Storage',
    description: 'Media & backup storage',
    icon: '☁️',
    enabled: true,
    connectionStatus: 'connected',
    permissions: ['read_objects', 'write_objects', 'delete_objects'],
  },
];

const seedIntegrations = async () => {
  try {
    // Clear existing integrations
    await Integration.deleteMany({});
    console.log('Cleared existing integrations');

    // Insert seed data
    const created = await Integration.insertMany(integrationSeeds);
    console.log(`✅ Created ${created.length} integrations`);

    return created;
  } catch (error) {
    console.error('❌ Error seeding integrations:', error);
    throw error;
  }
};

module.exports = { seedIntegrations, integrationSeeds };
