import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/unit/**',
        'tests/e2e/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types.ts',
        '**/.storybook/**',
        '**/storybook-static/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: [
      '**/*.integration.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e/**',
      'tests/unit/**',
      'tests/e2e/**',
      '**/*.unit.test.*',
      '**/*.spec.*'
    ],
    testTimeout: 30_000,
    hookTimeout: 15_000,
    teardownTimeout: 10_000,
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    retry: 1,
    bail: 1,
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
    },
  },
})
