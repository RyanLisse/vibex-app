import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest Configuration for Unit Tests
 * Focused on pure unit tests with minimal dependencies
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
    environment: "node", // Use node environment for unit tests
    
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
    
    // Short timeouts for unit tests
    testTimeout: 5000,
    hookTimeout: 5000,
    teardownTimeout: 1000,
    
    // Include only unit test patterns
    include: [
      "src/**/*.test.{js,ts}",
      "lib/**/*.test.{js,ts}",
      "tests/unit/**/*.test.{js,ts}",
      "utils/**/*.test.{js,ts}"
    ],
    
    // Exclude integration tests and problematic files
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/e2e/**",
      "**/playwright/**",
      "**/*.test.{jsx,tsx}", // Exclude React tests for now
      "**/*.spec.*",
      "**/integration/**",
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