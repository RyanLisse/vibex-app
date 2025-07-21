import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.config";

// Component tests configuration - for React components with DOM testing
export default mergeConfig(sharedConfig, {
	plugins: [react(), tsconfigPaths()],
	test: {
		name: "components",
		environment: "jsdom",
		setupFiles: ["./test-setup.ts"],
		include: [
			"components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"tests/unit/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"tests/unit/features/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
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
			"**/hooks/**/*.{test,spec}.*",
			"**/tests/integration/**",
		],
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/components",
			include: [
				"components/**/*.{js,ts,jsx,tsx}",
				"app/**/*.{js,ts,jsx,tsx}",
				"src/components/**/*.{js,ts,jsx,tsx}",
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
				"**/*.stories.*",
				"**/stories/**",
				"**/storybook-static/**",
				"**/.storybook/**",
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
			},
		},
		// Component-specific optimizations
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
				useAtomics: true,
			},
		},
		testTimeout: 15000,
		hookTimeout: 15000,
		maxConcurrency: 6, // Slightly lower for component tests
	},
});
