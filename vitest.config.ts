import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.config";

/**
 * Optimized Unit Tests Configuration
 *
 * Focuses on:
 * - Pure business logic testing (lib, utils, schemas)
 * - Fast execution with optimal parallelization
 * - Comprehensive coverage collection
 * - Minimal external dependencies
 */
export default mergeConfig(sharedConfig, {
	test: {
		name: "unit",
		environment: "jsdom", // jsdom for utility functions that might use DOM APIs
		setupFiles: ["./test-setup.ts"],
		include: [
			// Core business logic
			"lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"utils/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/schemas/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/shared/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [
			// Standard exclusions
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"**/coverage/**",
			// Test type exclusions
			"**/e2e/**",
			"**/integration/**",
			"**/*.integration.{test,spec}.*",
			"**/*.e2e.{test,spec}.*",
			"**/*.browser.{test,spec}.*",
			// Component exclusions (handled by components config)
			"**/components/**/*.{test,spec}.*",
			"**/app/**/*.{test,spec}.*",
			// Heavy integration tests
			"**/db/**/*.{test,spec}.*",
			"**/api/**/*.{test,spec}.*",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/unit",
			// More comprehensive coverage for unit tests
			thresholds: {
				global: {
					branches: 85, // Higher threshold for unit tests
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
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
				// Unit test specific exclusions
				"**/mocks/**",
				"**/fixtures/**",
				"**/__tests__/**",
			],
		},
		// Optimized for unit test performance
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false, // Parallel execution for unit tests
				isolate: true,
				useAtomics: true,
				memoryLimit: "256MB", // Lower memory limit for unit tests
			},
		},
		// Faster timeouts for unit tests
		testTimeout: 5000, // 5s should be enough for unit tests
		hookTimeout: 3000,
		teardownTimeout: 1000,
		// Optimized concurrency for unit tests
		maxConcurrency: Math.min(12, Math.max(2, require("os").cpus().length)),
		// Minimal reporting for speed
		reporters: process.env.CI ? ["basic", "json"] : ["basic"],
		outputFile: {
			json: "./coverage/unit/test-results.json",
		},
		// Skip expensive operations in unit tests
		sequence: {
			concurrent: true,
			shuffle: false,
		},
		// Cache test results
		cache: {
			dir: "node_modules/.vitest/unit",
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
			"@/src": path.resolve(__dirname, "./src"),
		},
	},
	define: {
		"import.meta.vitest": false,
	},
});
