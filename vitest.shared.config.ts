import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Shared configuration for all test types
export const sharedConfig = defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/app': path.resolve(__dirname, './app'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/test': path.resolve(__dirname, './tests'),
      '@/fixtures': path.resolve(__dirname, './tests/fixtures'),
      '@/mocks': path.resolve(__dirname, './tests/mocks'),
      '@/db': path.resolve(__dirname, './db'),
      '@/stores': path.resolve(__dirname, './stores'),
      '@/src': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2022',
    format: 'esm',
  },
  test: {
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    passWithNoTests: true,
    logHeapUsage: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    // Improved timeout management
    testTimeout: 15_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,
    // Better error handling
    bail: 0, // Don't bail on first failure
    retry: process.env.CI ? 2 : 0, // Retry in CI
    // Reporter configuration
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
    outputFile: process.env.CI ? './test-results/results.json' : undefined,
  },
})
