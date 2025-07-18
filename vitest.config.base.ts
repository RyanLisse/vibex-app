import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Base configuration shared across all test configs
export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    // DO NOT use fake timers globally
    // They cause hanging with async operations
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
})