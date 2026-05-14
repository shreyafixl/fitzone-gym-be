module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'models/**/*.js',
    'controllers/**/*.js',
    'services/**/*.js',
    '!node_modules/**',
  ],
  testTimeout: 30000,
  verbose: true,
};
