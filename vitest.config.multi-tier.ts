import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Multi-tier test configuration
    projects: [
      {
        name: 'unit',
        testMatch: [
          'tests/unit/**/*.test.{ts,tsx}',
          'src/**/*.test.{ts,tsx}',
          'lib/**/*.test.{ts,tsx}',
          'components/**/*.test.{ts,tsx}',
          'hooks/**/*.test.{ts,tsx}',
        ],
        environment: 'jsdom',
        setupFiles: ['./tests/setup/unit.ts'],
        pool: 'threads',
        poolOptions: {
          threads: {
            singleThread: false,
            isolate: true,
            maxThreads: 8,
            minThreads: 1,
          },
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          reportsDirectory: './coverage/unit',
          thresholds: {
            global: {
              branches: 85,
              functions: 85,
              lines: 85,
              statements: 85,
            },
          },
        },
      },
      {
        name: 'integration',
        testMatch: [
          'tests/integration/**/*.test.{ts,tsx}',
          'app/api/**/*.test.{ts,tsx}',
          'app/actions/**/*.test.{ts,tsx}',
        ],
        environment: 'jsdom',
        setupFiles: ['./tests/setup/integration.ts'],
        pool: 'threads',
        poolOptions: {
          threads: {
            singleThread: false,
            isolate: true,
            maxThreads: 4,
            minThreads: 1,
          },
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          reportsDirectory: './coverage/integration',
          thresholds: {
            global: {
              branches: 70,
              functions: 70,
              lines: 70,
              statements: 70,
            },
          },
        },
      },
      {
        name: 'component',
        testMatch: [
          'tests/component/**/*.test.{ts,tsx}',
          'app/task/**/*.test.{ts,tsx}',
        ],
        environment: 'jsdom',
        setupFiles: ['./tests/setup/component.ts'],
        pool: 'threads',
        poolOptions: {
          threads: {
            singleThread: false,
            isolate: true,
            maxThreads: 6,
            minThreads: 1,
          },
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html', 'lcov'],
          reportsDirectory: './coverage/component',
          thresholds: {
            global: {
              branches: 75,
              functions: 75,
              lines: 75,
              statements: 75,
            },
          },
        },
      },
    ],
    
    // Global test configuration
    globals: true,
    css: true,
    
    // Performance optimizations
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    
    // Timeouts
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
    
    // Global coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/**',
        'e2e/**',
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
        'memory/**',
        'claude-flow*',
        '*.md',
        '*.json',
        '*.yml',
        '*.yaml',
        'lefthook.yml',
        'commitlint.config.js',
        'postcss.config.*',
        'tailwind.config.*',
        'next.config.*',
        'instrumentation.ts',
        'middleware.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // File patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e/**',
      'tests/e2e/**',
      'playwright-report/**',
      'test-results/**',
      'storybook-static/**',
      'coverage/**',
      '.next/**',
    ],
  },
  
  // Path resolution
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
  
  // Build optimizations for tests
  esbuild: {
    target: 'node18',
    format: 'esm',
  },
  
  // Dependencies optimization
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
    ],
  },
})