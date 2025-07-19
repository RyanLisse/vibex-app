import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Component tests config for React components and hooks
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/unit.ts'],
    pool: 'threads',
    css: true,
    include: [
      'components/**/*.test.{jsx,tsx}',
      'app/**/*.test.{jsx,tsx}',
      'hooks/**/*.test.{jsx,tsx}',
      'src/components/**/*.test.{jsx,tsx}',
      'src/hooks/**/*.test.{jsx,tsx}',
    ],
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
    testTimeout: 10000,
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
    allowOnly: false,
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
    jsx: 'automatic',
  },
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
