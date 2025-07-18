import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['lib/inngest-isolated.test.ts'],
    testTimeout: 3000,
  },
})