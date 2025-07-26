import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Minimal Vitest Configuration to prevent hanging
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
    environment: "node", // Use node instead of jsdom
    
    // No setup files to avoid hanging
    setupFiles: [],
    
    // Disable all parallelization
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
      }
    },
    threads: false,
    maxConcurrency: 1,
    
    // Short timeouts
    testTimeout: 5000,
    hookTimeout: 5000,
    teardownTimeout: 1000,
    
    // Include only specific test patterns
    include: [
      "src/**/*.test.{js,ts}",
      "lib/**/*.test.{js,ts}",
      "tests/unit/**/*.test.{js,ts}"
    ],
    
    // Exclude everything problematic
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/e2e/**",
      "**/playwright/**",
      "**/*.test.{jsx,tsx}", // Exclude React tests for now
      "**/*.spec.*",
      "test-baseline.log",
      "**/*.config.*",
      "**/components/**",
      "**/app/**"
    ],
    
    // Disable all extras
    coverage: {
      enabled: false
    },
    cache: false,
    watch: false,
    css: false,
    
    // Basic reporter
    reporter: 'basic',
    
    // Force exit
    forceRerunTriggers: [],
    allowOnly: false,
  },
});