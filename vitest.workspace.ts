import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // Unit tests for business logic
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: [
        'lib/**/*.test.{js,ts}',
        'src/lib/**/*.test.{js,ts}',
        'src/schemas/**/*.test.{js,ts}',
        'src/shared/**/*.test.{js,ts}',
        'src/features/**/*.test.{js,ts}',
        'src/types/**/*.test.{js,ts}',
        'stores/**/*.test.{js,ts}',
      ],
    },
  },
  // Component tests
  {
    extends: './vitest.components.config.ts',
    test: {
      name: 'components',
      include: [
        'components/**/*.test.{js,ts,jsx,tsx}',
        'hooks/**/*.test.{js,ts,jsx,tsx}',
        'app/**/*.test.{js,ts,jsx,tsx}',
      ],
    },
  },
  // Integration tests
  {
    extends: './vitest.integration.config.ts',
    test: {
      name: 'integration',
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
    },
  },
  // Browser tests
  {
    extends: './vitest.browser.config.ts',
    test: {
      name: 'browser',
      include: ['tests/e2e/**/*.spec.{js,ts,jsx,tsx}'],
    },
  },
])
