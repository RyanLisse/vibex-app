// Simple Jest configuration for component tests
const customJestConfig = {
  displayName: 'Component Tests',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/components/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/hooks/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/lib/**/*.test.*',
    '<rootDir>/tests/bun-*.test.*',
    '<rootDir>/**/*.integration.test.*',
    '<rootDir>/**/*.e2e.test.*',
    '<rootDir>/**/*.bun.test.*',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage/jest-components',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10_000,
  verbose: true,
}

module.exports = customJestConfig
