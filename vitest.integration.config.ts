import react from '@vitejs/plugin-react'
import { mergeConfig } from 'vitest/config'
import { sharedConfig } from './vitest.shared.config'

// Integration tests config for API routes, database, and Inngest
export default mergeConfig(sharedConfig, {
  plugins: [react()],
  test: {
    name: 'integration',
    environment: 'node',
    setupFiles: ['./tests/setup/integration.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      ELECTRIC_URL: 'http://localhost:5133',
      ELECTRIC_WEBSOCKET_URL: 'ws://localhost:5133',
      ELECTRIC_AUTH_TOKEN: 'test_auth_token',
      ELECTRIC_USER_ID: 'test_user_id',
      ELECTRIC_API_KEY: 'test_api_key',
      AUTH_SECRET: 'test_auth_secret',
      NODE_ENV: 'test',
      INNGEST_SIGNING_KEY: 'test-signing-key',
      INNGEST_EVENT_KEY: 'test-event-key',
    },
    include: [
      'tests/integration/**/*.test.{js,ts,jsx,tsx}',
      'app/api/**/*.test.{js,ts}',
      '**/*.integration.test.*',
      'lib/inngest*.test.ts',
      'app/actions/inngest.test.ts',
      'app/actions/vibekit.test.ts',
      'app/api/inngest/route.test.ts',
      'db/**/*.test.ts',
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
      '!lib/inngest*.test.ts',
      'src/**/*.test.*',
      'stores/**/*.test.*',
    ],
    testTimeout: 30_000, // Longer timeout for integration tests
    hookTimeout: 15_000,
    teardownTimeout: 15_000,
    coverage: {
      enabled: false, // Disable coverage for integration tests
    },
  },
})
