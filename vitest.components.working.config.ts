import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Dedicated component test configuration with proper DOM environment
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Force jsdom environment for DOM access
    environment: 'jsdom',

    // Enable global test functions
    globals: true,

    // Use dedicated component setup file
    setupFiles: ['./tests/setup/components.ts'],

    // Use forks for better isolation with DOM
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Enable CSS processing for styled components
    css: true,

    // Component test file patterns
    include: [
      'components/**/*.test.{jsx,tsx}',
      'app/**/*.test.{jsx,tsx}',
      'hooks/**/*.test.{jsx,tsx}',
      'src/components/**/*.test.{jsx,tsx}',
      'src/hooks/**/*.test.{jsx,tsx}',
    ],

    // Exclude non-component tests
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
      '**/*.bun.test.*',
      'tests/bun-*.test.*',
      'lib/**/*.test.*',
      'src/lib/**/*.test.*',
      'stores/**/*.test.*',
      'src/schemas/**/*.test.*',
      'src/hooks/useZodForm/**/*.test.{js,ts}',
    ],

    // Timeouts for component rendering
    testTimeout: 15_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,

    // Isolation settings for clean DOM state
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,

    // Test execution settings
    retry: 1,
    bail: 1,
    watch: false,
    passWithNoTests: true,
    allowOnly: false,

    // Enhanced reporter for component tests
    reporter: ['default', 'verbose'],
  },

  // Path resolution for imports
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

  // ESBuild configuration for React/JSX
  esbuild: {
    target: 'es2022',
    format: 'esm',
    jsx: 'automatic',
  },

  // Pre-optimize dependencies for faster test startup
  optimizeDeps: {
    include: [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'react',
      'react-dom',
      'react/jsx-runtime',
      'vitest',
      'jsdom',
    ],
  },

  // Define environment variables for tests
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.VITEST': 'true',
  },
})
