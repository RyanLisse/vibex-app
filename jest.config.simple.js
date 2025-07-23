module.exports = {
  testEnvironment: 'jsdom',
  
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.minimal.js'
  ],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  testMatch: [
    '**/streaming-indicator-jest-fixed.test.tsx'
  ],
  
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
  
  verbose: true
};