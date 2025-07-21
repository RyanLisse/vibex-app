import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Integration tests configuration - for API, database, and system integration tests
export default defineConfig({
  plugins: [react()],
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/integration.ts"],
    include: [
      "tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "**/*.integration.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "app/api/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/coverage/**",
      "**/e2e/**",
      "**/*.e2e.{test,spec}.*",
      "**/*.browser.{test,spec}.*",
      "**/components/**/*.{test,spec}.*",
      "**/lib/**/*.{test,spec}.*",
      "**/utils/**/*.{test,spec}.*",
      "**/src/schemas/**/*.{test,spec}.*",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage/integration",
      exclude: [
        "coverage/**",
        "dist/**",
        "**/node_modules/**",
        "**/test*/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/cypress/**",
        "**/*.test.*",
        "**/*.spec.*",
      ],
    },
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Integration tests may need more time and sequential execution
    sequence: {
      concurrent: false,
    },
  },
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
      "@/db": path.resolve(__dirname, "./db"),
    },
  },
  define: {
    "import.meta.vitest": false,
  },
});