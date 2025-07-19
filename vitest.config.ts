import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Main Vitest config for unit tests (lib, utils, schemas)
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/unit.ts'],
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
    hookTimeout: 5000,
    teardownTimeout: 5000,
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    retry: 0,
    bail: 1,
    watch: false,
    passWithNoTests: true,
    logHeapUsage: true,
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
