import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/component.ts', './vitest.setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        maxThreads: 6,
        minThreads: 1,
      },
    },
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: './coverage/vitest-components',
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.stories.{js,ts,jsx,tsx}',
        '**/types.ts',
        '**/.storybook/**',
        '**/storybook-static/**',
        'scripts/**',
        'docs/**',
        'public/**',
        'playwright-report/**',
        'test-results/**',
        // Exclude non-component files
        'lib/**/*.{js,ts}',
        'src/lib/**/*.{js,ts}',
        'stores/**/*.{js,ts}',
        'src/schemas/**/*.{js,ts}',
        'src/hooks/useZodForm/**/*.{js,ts}',
        'app/api/**/*.{js,ts}',
        'app/actions/**/*.{js,ts}',
      ],
      include: [
        'components/**/*.{jsx,tsx}',
        'app/**/*.{jsx,tsx}',
        'hooks/**/*.{jsx,tsx}',
        'src/components/**/*.{jsx,tsx}',
        'src/hooks/**/*.{jsx,tsx}',
        'app/task/**/*.{jsx,tsx}',
        'app/environments/**/*.{jsx,tsx}',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        // Critical components require higher coverage
        'components/auth/**/*.{jsx,tsx}': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'components/forms/**/*.{jsx,tsx}': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // UI components can have slightly lower coverage
        'components/ui/**/*.{jsx,tsx}': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
      // Coverage collection settings
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
    },
    include: [
      'components/**/*.test.{jsx,tsx}',
      'app/**/*.test.{jsx,tsx}',
      'hooks/**/*.test.{jsx,tsx}',
      'src/components/**/*.test.{jsx,tsx}',
      'src/hooks/**/*.test.{jsx,tsx}',
      'tests/unit/**/*.test.{jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e/**',
      'tests/integration/**',
      'tests/e2e/**',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
      // Exclude non-component tests
      'lib/**/*.test.{js,ts}',
      'src/lib/**/*.test.{js,ts}',
      'stores/**/*.test.{js,ts}',
      'src/schemas/**/*.test.{js,ts}',
      'src/hooks/useZodForm/**/*.test.{js,ts}',
    ],
    testTimeout: 15_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
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
      '@/fixtures': path.resolve(__dirname, './tests/fixtures'),
      '@/mocks': path.resolve(__dirname, './tests/mocks'),
    },
  },
  // Optimize for component testing
  esbuild: {
    target: 'es2022',
    format: 'esm',
    jsx: 'automatic',
  },
  // Dependencies optimization for component testing
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'react',
      'react-dom',
      'react/jsx-runtime',
    ],
  },
})