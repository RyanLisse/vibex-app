import { defineConfig, mergeConfig } from "vitest/config";
import { baseConfig } from "./vitest.base.config";

/**
 * Unit Tests Configuration
 *
 * Optimized for:
 * - Pure business logic testing (lib, utils, schemas, hooks)
 * - Fast execution with high parallelization
 * - Comprehensive coverage collection
 * - Minimal external dependencies
 * - Node.js environment for server-side code
 */
export default mergeConfig(baseConfig, {
	test: {
		name: "unit",
		environment: "node",
		include: [
			// Core business logic
			"lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"utils/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"src/schemas/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"src/hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"src/shared/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"src/lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
		],
		exclude: [
			// Standard exclusions
			...baseConfig.test.exclude,
			// Test type exclusions
			"**/*.e2e.{test,spec}.*",
			"**/*.integration.{test,spec}.*",
			"**/*.browser.{test,spec}.*",
			"**/*.component.{test,spec}.*",
			// React/JSX exclusions (handled by component config)
			"**/*.{test,spec}.{jsx,tsx}",
			"**/components/**/*.{test,spec}.*",
			"**/app/**/*.{test,spec}.*",
			// Heavy integration tests
			"**/db/**/*.{test,spec}.*",
			"**/api/**/*.{test,spec}.*",
			"**/integration/**",
			"**/e2e/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/unit",
			thresholds: {
				global: {
					branches: 85, // Higher threshold for unit tests
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
			exclude: [
				...baseConfig.test.coverage.exclude,
				"**/mocks/**",
				"**/fixtures/**",
				"**/__tests__/**",
			],
		},
		// Optimized for unit test performance
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
				useAtomics: true,
				memoryLimit: "256MB", // Lower memory limit for unit tests
			},
		},
		// Faster timeouts for unit tests
		testTimeout: 5000,
		hookTimeout: 3000,
		teardownTimeout: 1000,
		maxConcurrency: Math.min(12, Math.max(2, require("os").cpus().length)),
		// Optimized for speed
		sequence: {
			concurrent: true,
			shuffle: false,
		},
		cache: {
			dir: "node_modules/.vitest/unit",
		},
		outputFile: {
			json: "./coverage/unit/test-results.json",
		},
	},
});
