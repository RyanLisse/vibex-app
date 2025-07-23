const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  moduleNameMapper: {  // Fixed: was moduleNameMapping
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/stores/(.*)$': '<rootDir>/stores/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '^@/db/(.*)$': '<rootDir>/db/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  testMatch: [
    '<rootDir>/**/*.jest.test.{js,ts,jsx,tsx}',
    '<rootDir>/streaming-indicator-jest.test.tsx'
  ],
  
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/**/*.stories.*',
    '<rootDir>/storybook-static/'
  ],
  
  collectCoverageFrom: [
    'lib/**/*.{js,ts,jsx,tsx}',
    'components/**/*.{js,ts,jsx,tsx}',
    'app/**/*.{js,ts,jsx,tsx}',
    'hooks/**/*.{js,ts,jsx,tsx}',
    'utils/**/*.{js,ts,jsx,tsx}',
    'src/**/*.{js,ts,jsx,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.stories.*',
    '!**/test-setup.*',
    '!**/tests/setup/**',
    '!**/migrations/**',
    '!**/__tests__/**',
    '!**/mocks/**',
    '!**/fixtures/**'
  ],
  
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageDirectory: '<rootDir>/coverage/jest',
  
  coverageThreshold: {  // Fixed: was coverageThresholds
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  testTimeout: 10000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  
  verbose: true,
  bail: false,
  
  reporters: [
    'default'
  ]
};