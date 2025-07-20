import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { mergeConfig } from 'vitest/config'
import { sharedConfig } from './vitest.shared.config'

// Component tests config for React components and hooks
export default mergeConfig(sharedConfig, {
  plugins: [react(), tsconfigPaths()],
  test: {
    name: 'components',
    environment: 'jsdom',
    setupFiles: ['./tests/setup/components.ts'],
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
      'app/api/**/*.test.*',
    ],
    testTimeout: 15_000,
    hookTimeout: 10_000,
    teardownTimeout: 10_000,
    allowOnly: false,
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
