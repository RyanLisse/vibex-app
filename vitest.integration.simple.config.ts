import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    css: false,
    include: [
      'tests/integration/inngest-simple-mock.test.ts',
      'tests/integration/inngest-mock-validation.test.ts',
    ],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10_000,
    hookTimeout: 5_000,
    teardownTimeout: 5_000,
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    retry: 0,
    bail: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/app': path.resolve(__dirname, './app'),
    },
  },
})
