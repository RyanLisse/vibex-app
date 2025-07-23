import { defineConfig } from 'vitest/config';

/**
 * EMERGENCY TEST CONFIGURATION
 * 
 * This configuration is designed to bypass all the hanging issues
 * by using the absolute minimum setup possible.
 */
export default defineConfig({
  test: {
    // Use the most basic environment
    environment: 'node',
    
    // No globals to avoid potential conflicts
    globals: false,
    
    // Only test our emergency file
    include: ['emergency.test.ts'],
    
    // Very short timeouts to fail fast
    testTimeout: 3000,
    hookTimeout: 1000,
    teardownTimeout: 500,
    
    // No setup files to avoid complex mocking
    setupFiles: [],
    
    // No coverage to avoid v8 hanging
    coverage: {
      enabled: false
    },
    
    // Force single worker to avoid process issues
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false, // Don't isolate to avoid overhead
        minForks: 1,
        maxForks: 1
      }
    },
    
    // No concurrency
    maxConcurrency: 1,
    
    // Sequential execution
    sequence: {
      concurrent: false,
      shuffle: false,
      hooks: 'stack'
    },
    
    // Disable file parallelism
    fileParallelism: false,
    
    // Simple reporting
    reporters: ['basic'],
    
    // No output files
    outputFile: undefined
  }
});