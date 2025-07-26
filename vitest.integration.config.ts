import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest Configuration for Integration Tests
 * Focused on integration tests that may need more setup
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "~": path.resolve(__dirname, "./"),
    },
  },
  test: {
    globals: true,
    environment: "node", // Use node environment for integration tests
    
    // No setup files to avoid hanging
    setupFiles: [],
    
    // Disable all parallelization to prevent hanging
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
      }
    },
    threads: false,
    maxConcurrency: 1,
    
    // Longer timeouts for integration tests
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 2000,
    
    // Include integration test patterns
    include: [
      "tests/integration/**/*.test.{js,ts}",
      "**/*.integration.test.{js,ts}",
      "src/**/*.integration.{js,ts}"
    ],
    
    // Exclude unit tests and problematic files
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/e2e/**",
      "**/playwright/**",
      "**/*.test.{jsx,tsx}", // Exclude React tests for now
      "**/*.spec.*",
      "tests/unit/**",
      "test-baseline.log",
      "**/*.config.*",
      "**/components/**",
      "**/app/**"
    ],
    
    // Disable extras for faster execution
    coverage: {
      enabled: false
    },
    cache: false,
    watch: false,
    css: false,
    
    // Updated reporter configuration
    reporters: [
      [
        "default",
        {
          summary: false
        }
      ]
    ],
    
    // Force exit
    forceRerunTriggers: [],
    allowOnly: false,
  },
});