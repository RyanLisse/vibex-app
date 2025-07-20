import { defineConfig } from 'vitest/config'

// Final working component test configuration
export default defineConfig({
  test: {
    // Use happy-dom for DOM environment
    environment: 'happy-dom',

    // Enable global test functions
    globals: true,

    // Use existing setup file
    setupFiles: ['./tests/setup/unit.ts'],

    // Component test patterns
    include: [
      'components/**/*.test.{jsx,tsx}',
      'app/**/*.test.{jsx,tsx}',
      'hooks/**/*.test.{jsx,tsx}',
    ],

    // Exclude non-component tests
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
      '**/*.bun.test.*',
      'lib/**/*.test.*',
      'stores/**/*.test.*',
    ],

    // Timeouts
    testTimeout: 10_000,
    hookTimeout: 5_000,

    // Test isolation
    isolate: true,
    restoreMocks: true,
    clearMocks: true,

    // Test execution
    retry: 0,
    watch: false,
    passWithNoTests: true,
  },

  // Environment variables for tests
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.DATABASE_URL': '"postgresql://test:test@localhost:5432/test"',
    'process.env.OPENAI_API_KEY': '"test-key"',
    'process.env.INNGEST_EVENT_KEY': '"test-inngest-key"',
  },
})
