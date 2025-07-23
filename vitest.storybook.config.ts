/**
 * Vitest Configuration for Storybook Tests
 * Optimized to prevent hanging and service stopped errors
 */
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  test: {
    name: "storybook-tests",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./.storybook/vitest.setup.ts"],

    // Include Storybook test patterns
    include: [
      "**/*.stories.@(js|jsx|ts|tsx)",
      ".storybook/**/*.test.@(js|jsx|ts|tsx)",
    ],

    // Exclude non-storybook tests
    exclude: [
      "**/node_modules/**",
      "coverage/**",
      "dist/**",
      "tests/unit/**",
      "tests/integration/**",
      "tests/e2e/**",
      "**/*.{test,spec}.{js,ts,jsx,tsx}"
    ],

    // Optimized settings for Storybook
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: false,
      },
    },

    // Increased timeouts for Storybook compilation
    testTimeout: 15000, // 15 seconds for Storybook stories
    hookTimeout: 10000, // 10 seconds for setup hooks
    teardownTimeout: 5000,
    maxConcurrency: 1,
    retry: 0,

    // Force sequential execution
    sequence: {
      concurrent: false,
      shuffle: false,
    },

    // Disable file watching
    watch: false,

    // Minimal coverage for Storybook
    coverage: {
      provider: "v8",
      reporter: ["text"],
      reportsDirectory: "./coverage/storybook",
      include: [
        "components/**/*.{js,ts,jsx,tsx}",
        "src/stories/**/*.{js,ts,jsx,tsx}",
      ],
      exclude: [
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*",
        "**/node_modules/**",
        "coverage/**",
      ],
    },
  },

  resolve: {
    alias: {
      "@": __dirname,
      "@/lib": `${__dirname}/lib`,
      "@/components": `${__dirname}/components`,
      "@/app": `${__dirname}/app`,
    },
  },

  define: {
    "import.meta.vitest": false,
    "process.env.NODE_ENV": '"test"',
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@testing-library/react",
      "@storybook/nextjs-vite",
      "@storybook/test",
      "vitest"
    ],
    exclude: [
      "@types/node",
      "@electric-sql/pglite",
      "@electric-sql/pglite-react",
      "inngest",
      "ioredis",
      "@browserbasehq/sdk",
      "stagehand",
      "better-sqlite3",
    ],
  },

  esbuild: {
    target: "es2022",
  },

  // Server configuration to prevent hanging
  server: {
    hmr: false,
    watch: null,
  },
});