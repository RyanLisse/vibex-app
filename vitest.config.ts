import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
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
    testTimeout: 15_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,
    bail: 0,
    retry: process.env.CI ? 2 : 0,
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
    outputFile: process.env.CI ? './test-results/results.json' : undefined,
    projects: [
      {
        name: 'unit',
        testMatch: [
          'lib/**/*.test.{js,ts}',
          'src/lib/**/*.test.{js,ts}',
          'src/schemas/**/*.test.{js,ts}',
          'src/shared/**/*.test.{js,ts}',
          'src/features/**/*.test.{js,ts}',
          'src/types/**/*.test.{js,ts}',
          'stores/**/*.test.{js,ts}',
          'src/hooks/useZodForm/**/*.test.{js,ts}',
        ],
        environment: 'node',
      },
      {
        name: 'integration',
        testMatch: ['tests/integration/**/*.test.{js,ts}', 'db/**/*.test.{js,ts}'],
        environment: 'node',
      },
      {
        name: 'components',
        testMatch: [
          'components/**/*.test.{js,ts,jsx,tsx}',
          'hooks/**/*.test.{js,ts}',
          'app/**/*.test.{js,ts,jsx,tsx}',
        ],
        environment: 'jsdom',
      },
      {
        name: 'browser',
        testMatch: ['tests/e2e/**/*.test.{js,ts}', 'tests/browser/**/*.test.{js,ts}'],
        environment: 'jsdom',
      },
    ],
  },
})
