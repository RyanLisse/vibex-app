module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/emergency-jest.test.js'],
  verbose: true,
  bail: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 5000
};