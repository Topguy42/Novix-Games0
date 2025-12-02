module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: [],
  globalSetup: './tests/jest.global-setup.js',
  globalTeardown: './tests/jest.global-teardown.js',
  transform: {},
  moduleFileExtensions: ['mjs', 'js', 'json'],
  testTimeout: 30000
};
