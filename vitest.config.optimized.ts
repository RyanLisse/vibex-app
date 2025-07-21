import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.config";

// Unit tests configuration - for utilities, services, and business logic
export default mergeConfig(sharedConfig, {
	test: {
		name: "unit",
		environment: "jsdom",
		setupFiles: ["./test-setup.ts"],
		include: [
			"lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"utils/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/schemas/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
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
			"**/*.browser.{test,spec}.*",
			"**/components/**/*.{test,spec}.*",
			"**/app/**/*.{test,spec}.*",
			"**/tests/integration/**",
			"**/tests/e2e/**",
		],
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/unit",
			include: [
				"lib/**/*.{js,ts,jsx,tsx}",
				"utils/**/*.{js,ts,jsx,tsx}",
				"src/schemas/**/*.{js,ts,jsx,tsx}",
				"src/hooks/**/*.{js,ts,jsx,tsx}",
				"hooks/**/*.{js,ts,jsx,tsx}",
			],
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
				"**/migrations/**",
				"**/stories/**",
				"**/*.stories.*",
			],
			thresholds: {
				global: {
					branches: 85,
					functions: 85,
					lines: 85,
					statements: 85,
				},
			},
		},
		// Optimized for unit test performance
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
				useAtomics: true,
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
		maxConcurrency: 8,
	},
});
