import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Fixed Vitest Configuration - Comprehensive Test Infrastructure
 * 
 * FIXES:
 * ✅ Bun vs Vitest compatibility
 * ✅ jsdom navigation errors  
 * ✅ Missing mocks and imports
 * ✅ Browser compatibility issues
 * ✅ Module resolution problems
 */
export default defineConfig({
  plugins: [react()],
  
  test: {
    // Core Configuration
    name: "fixed-tests",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test-setup-fixed.ts"],
    
    // Test Pattern Matching
    include: [
      "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "!**/node_modules/**"
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/e2e/**",
      "**/*.e2e.*"
    ],

    // Module Handling - Fix bun:test compatibility
    deps: {
      external: [/^bun:/],
      inline: [
        // Force inline to avoid externalization issues
        /@testing-library\/.*$/,
        /^vitest$/,
        /^@vitest\/.*$/
      ]
    },

    // Pool Configuration - Optimized
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true,
        memoryLimit: "512MB"
      }
    },

    // Timeouts - Reasonable defaults
    testTimeout: 15000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    // Performance Settings
    maxConcurrency: Math.min(8, Math.max(2, require("os").cpus().length)),
    
    // Reporters - Fixed deprecated 'basic' reporter
    reporters: [
      ["default", { summary: false }],
      "json"
    ],
    
    outputFile: {
      json: "./coverage/test-results-fixed.json"
    },

    // Coverage Configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage/fixed",
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      exclude: [
        "coverage/**",
        "dist/**",
        "**/node_modules/**",
        "**/test*/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/migrations/**",
        "**/*.test.*",
        "**/*.spec.*",
        "**/mocks/**",
        "**/fixtures/**"
      ]
    },

    // Sequence Control
    sequence: {
      concurrent: true,
      shuffle: false
    },

    // Cache Configuration
    cache: {
      dir: "node_modules/.vitest/fixed"
    }
  },

  // Resolve Configuration - Fix module resolution
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/app": path.resolve(__dirname, "./app"),
      "@/hooks": path.resolve(__dirname, "./hooks"),
      "@/utils": path.resolve(__dirname, "./utils"),
      "@/types": path.resolve(__dirname, "./types"),
      "@/stores": path.resolve(__dirname, "./stores"),
      "@/src": path.resolve(__dirname, "./src"),
      "@/db": path.resolve(__dirname, "./db"),
      "@/tests": path.resolve(__dirname, "./tests"),
      // Fix bun:test imports
      "bun:test": path.resolve(__dirname, "./lib/test-utils/bun-test-shim.ts")
    },
    conditions: ["browser", "module", "import", "default"]
  },

  // Define global variables
  define: {
    "import.meta.vitest": false,
    global: "globalThis"
  },

  // Optimization
  optimizeDeps: {
    include: [
      "vitest",
      "@testing-library/react",
      "@testing-library/jest-dom", 
      "@testing-library/user-event",
      "react",
      "react-dom",
      "jsdom"
    ],
    exclude: [
      "@electric-sql",
      "@neondatabase",
      "bun:test"
    ]
  },

  // Build Configuration
  build: {
    target: "es2022",
    minify: false,
    sourcemap: true
  },

  // Server Configuration for tests
  server: {
    fs: {
      allow: [".."]
    }
  }
});