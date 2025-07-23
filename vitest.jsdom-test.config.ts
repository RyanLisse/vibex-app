import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // JSDOM environment for DOM testing
    environment: 'jsdom',
    globals: true,
    
    // Only test our simple component file
    include: ['streaming-indicator-simple.test.tsx'],
    
    // Minimal setup - just the essential test-setup
    setupFiles: ['./test-setup.ts'],
    
    // Short timeouts to fail fast
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 2000,
    
    // No coverage to avoid hanging
    coverage: {
      enabled: false
    },
    
    // Use forks with single worker to prevent hanging
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false, // Don't isolate to reduce overhead
        maxForks: 1,
        minForks: 1
      }
    },
    
    // Sequential execution
    maxConcurrency: 1,
    sequence: {
      concurrent: false,
      shuffle: false,
      hooks: 'stack'
    },
    
    // Disable file parallelism
    fileParallelism: false,
    
    // Simple reporting
    reporters: ['basic'],
    
    // No retries
    retry: 0
  }
});