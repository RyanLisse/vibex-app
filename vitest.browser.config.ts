import react from '@vitejs/plugin-react'
import { mergeConfig } from 'vitest/config'
import { sharedConfig } from './vitest.shared.config'

// Browser tests config for E2E and browser-specific testing
export default mergeConfig(sharedConfig, {
  plugins: [react()],
  test: {
    name: 'browser',
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }], // Only chromium for faster testing
    },
    setupFiles: ['./tests/setup/browser.ts'],
    include: ['tests/e2e/**/*.spec.{js,ts,jsx,tsx}', '**/*.e2e.test.*', '**/*.browser.test.*'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.integration.test.*',
      '**/*.unit.test.*',
      'lib/**/*.test.*',
      'components/**/*.test.*',
      'hooks/**/*.test.*',
      'app/**/*.test.*',
      '**/*.bun.test.*',
      'tests/bun-*.test.*',
    ],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    teardownTimeout: 30_000,
    retry: 2, // E2E tests can be flaky
  },
})
