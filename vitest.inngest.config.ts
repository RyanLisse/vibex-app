import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Set environment variable to disable fake timers
process.env.VITEST_INNGEST_TESTS = 'true'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.inngest.ts'], // Use the Inngest-specific setup
    include: [
      'lib/inngest*.test.ts',
      'tests/integration/inngest*.test.ts',
      'app/**/*inngest*.test.ts',
    ],
    exclude: ['node_modules'],
    testTimeout: 10000, // Reasonable timeout for async operations
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    pool: 'threads', // Use threads for better performance
    // Disable coverage for inngest tests to avoid instrumentation issues
    coverage: {
      enabled: false,
    },
    // Better error reporting
    logHeapUsage: true,
    bail: 1, // Stop on first test failure
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
    },
  },
})
