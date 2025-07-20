import { mergeConfig } from 'vitest/config'
import { sharedConfig } from './vitest.shared.config'

// Main Vitest config for unit tests (lib, utils, schemas)
export default mergeConfig(sharedConfig, {
  test: {
    name: 'unit',
    environment: 'node',
    setupFiles: ['./tests/setup/unit-node.ts'],
    include: [
      'lib/**/*.test.{js,ts}',
      'src/lib/**/*.test.{js,ts}',
      'src/schemas/**/*.test.{js,ts}',
      'src/shared/**/*.test.{js,ts}',
      'src/features/**/*.test.{js,ts}',
      'src/types/**/*.test.{js,ts}',
      'stores/**/*.test.{js,ts}',
      'src/hooks/useZodForm/**/*.test.{js,ts}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
      '**/*.bun.test.*',
      'tests/bun-*.test.*',
      'components/**/*.test.*',
      'app/**/*.test.*',
      'hooks/**/*.test.*',
    ],
    testTimeout: 10_000,
    hookTimeout: 5_000,
    teardownTimeout: 5_000,
  },
})
