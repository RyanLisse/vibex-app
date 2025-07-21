import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.config";

// Browser tests configuration - for E2E and browser-specific testing
export default mergeConfig(sharedConfig, {
	test: {
		name: "browser",
		environment: "happy-dom", // Better performance than jsdom for browser testing
		globals: true,
		setupFiles: ["./tests/setup/browser.ts"],
		include: [
			"tests/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"**/coverage/**",
			"**/components/**/*.{test,spec}.*",
			"**/lib/**/*.{test,spec}.*",
			"**/utils/**/*.{test,spec}.*",
			"**/src/schemas/**/*.{test,spec}.*",
			"**/app/**/*.{test,spec}.*",
			"**/*.integration.{test,spec}.*",
			"**/tests/integration/**",
			"**/tests/unit/**",
		],
		coverage: {
			enabled: false, // E2E coverage handled separately
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage/browser",
		},
		// Browser test optimizations
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true, // Browser tests should run sequentially
				isolate: true,
			},
		},
		// Extended timeouts for browser operations
		testTimeout: 60000,
		hookTimeout: 30000,
		teardownTimeout: 15000,
		// Sequential execution for browser stability
		sequence: {
			concurrent: false,
		},
		// Conservative retry for browser tests
		retry: 2,
		// Bail on first failure for faster feedback
		bail: 1,
	},
});
