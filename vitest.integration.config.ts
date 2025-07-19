import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Integration tests config for API routes, database, and Inngest
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/integration.ts'],
    pool: 'threads',
    include: [
      'tests/integration/**/*.test.{js,ts,jsx,tsx}',
      'app/api/**/*.test.{js,ts}',
      '**/*.integration.test.*',
      'lib/inngest*.test.ts',
      'app/actions/inngest.test.ts',
      'app/actions/vibekit.test.ts',
      'app/api/inngest/route.test.ts',
      'app/api/test-inngest/route.test.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.e2e.test.*',
      '**/*.bun.test.*',
      'tests/bun-*.test.*',
      'components/**/*.test.*',
      'hooks/**/*.test.*',
      'lib/**/*.test.{js,ts}',
      'src/**/*.test.*',
      'stores/**/*.test.*',
    ],
    testTimeout: 30_000, // Longer timeout for integration tests
    hookTimeout: 10_000,
    teardownTimeout: 10_000,
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    retry: 0,
    bail: 1,
    watch: false,
    passWithNoTests: true,
    logHeapUsage: true,
    coverage: {
      enabled: false, // Disable coverage for integration tests
    },
  },
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
    },
  },
  esbuild: {
    target: 'es2022',
    format: 'esm',
  },
})
