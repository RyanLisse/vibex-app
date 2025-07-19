import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Browser tests config for E2E and browser-specific testing
export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }], // Only chromium for faster testing
    },
    globals: true,
    include: ['tests/e2e/**/*.test.{js,ts,jsx,tsx}', '**/*.e2e.test.*', '**/*.browser.test.*'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.integration.test.*',
      '**/*.bun.test.*',
      'tests/bun-*.test.*',
    ],
    testTimeout: 30_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,
    retry: 1, // Allow retry for browser tests
    bail: 1,
    watch: false,
    passWithNoTests: true,
  },
})
