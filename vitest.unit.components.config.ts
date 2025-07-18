import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.components.ts'], // Use setup without fake timers
    pool: 'threads', // Use threads instead of forks for better performance

    css: true,
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
      // Exclude tests that use Bun test syntax
      'app/actions/inngest.test.ts',
      'app/actions/vibekit.test.ts',
      'lib/inngest.test.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 5000,
    isolate: false, // Don't isolate to improve performance
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
