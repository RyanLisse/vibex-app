import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Component tests configuration - for React components with DOM testing
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    name: "components",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/components.ts"],
    include: [
      "components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/coverage/**",
      "**/e2e/**",
      "**/integration/**",
      "**/*.integration.{test,spec}.*",
      "**/*.e2e.{test,spec}.*",
      "**/lib/**/*.{test,spec}.*",
      "**/utils/**/*.{test,spec}.*",
      "**/src/schemas/**/*.{test,spec}.*",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage/components",
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
    testTimeout: 15000,
    hookTimeout: 15000,
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
    },
  },
  define: {
    "import.meta.vitest": false,
  },
});