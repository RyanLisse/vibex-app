import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Stable component test configuration using happy-dom
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Use happy-dom for better stability
    environment: 'happy-dom',
    
    // Enable global test functions
    globals: true,
    
    // Use simplified setup that works reliably
    setupFiles: ['./tests/setup/unit.ts'],
    
    // Use threads for better performance
    pool: 'threads',
    
    // Enable CSS processing
    css: true,
    
    // Component test patterns
    include: [
      'components/**/*.test.{jsx,tsx}',
      'app/**/*.test.{jsx,tsx}',
      'hooks/**/*.test.{jsx,tsx}',
    ],
    
    // Exclude non-component tests
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
      '**/*.bun.test.*',
      'lib/**/*.test.*',
      'stores/**/*.test.*',
    ],
    
    // Reasonable timeouts
    testTimeout: 10_000,
    hookTimeout: 5_000,
    teardownTimeout: 5_000,
    
    // Test isolation
    isolate: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    
    // Test execution
    retry: 0,
    bail: 1,
    watch: false,
    passWithNoTests: true,
    allowOnly: false,
    
    // Better output
    reporter: ['default'],
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/app': path.resolve(__dirname, './app'),
      '@/test': path.resolve(__dirname, './tests'),
    },
  },
  
  // Build settings
  esbuild: {
    target: 'es2022',
    format: 'esm',
    jsx: 'automatic',
  },
  
  // Optimize dependencies
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
  
  // Environment variables
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.DATABASE_URL': '"postgresql://test:test@localhost:5432/test"',
    'process.env.OPENAI_API_KEY': '"test-key"',
    'process.env.INNGEST_EVENT_KEY': '"test-inngest-key"',
  },
})