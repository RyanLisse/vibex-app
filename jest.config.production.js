const path = require('path');

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  moduleNameMapping: {
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
    '<rootDir>/lib/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/components/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/app/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/hooks/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/utils/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
    '<rootDir>/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'
  ],
  
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/integration/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/api/',
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
  
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
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
  
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  verbose: true,
  bail: false,
  
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage/jest',
      outputName: 'junit.xml',
    }]
  ]
};