import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, mergeConfig } from "vitest/config";
import { baseConfig } from "./vitest.base.config";

/**
 * Component Tests Configuration
 *
 * Optimized for:
 * - React component testing with jsdom environment
 * - UI interaction and rendering tests
 * - Accessibility testing
 * - Snapshot testing
 * - Browser-like environment simulation
 */
export default mergeConfig(baseConfig, {
	plugins: [react(), tsconfigPaths()],
	test: {
		name: "components",
		environment: "jsdom",
		include: [
			// React components and pages
			"components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/features/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			// Client-side hooks that use React
			"hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [
			// Standard exclusions
			...baseConfig.test.exclude,
			// Non-component test types
			"**/*.e2e.{test,spec}.*",
			"**/*.integration.{test,spec}.*",
			// Server-side code (handled by unit/integration configs)
			"**/lib/**/*.{test,spec}.*",
			"**/utils/**/*.{test,spec}.*",
			"**/api/**/*.{test,spec}.*",
			"**/db/**/*.{test,spec}.*",
			"**/server/**/*.{test,spec}.*",
			// Pure logic tests (handled by unit config)
			"src/schemas/**/*.{test,spec}.*",
			"src/shared/**/*.{test,spec}.*",
			"tests/unit/**/*.{test,spec}.*",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage/components",
			thresholds: {
				global: {
					branches: 75, // Lower threshold for components
					functions: 75,
					lines: 75,
					statements: 75,
				},
			},
			exclude: [
				...baseConfig.test.coverage.exclude,
				"**/*.stories.*",
				"**/storybook/**",
			],
		},
		// Component test optimizations
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
				memoryLimit: "512MB", // Higher memory for DOM simulation
			},
		},
		testTimeout: 15000, // Longer timeout for rendering/interactions
		hookTimeout: 8000,
		teardownTimeout: 3000,
		maxConcurrency: Math.min(4, Math.max(1, require("os").cpus().length - 2)),
		sequence: {
			concurrent: true,
			shuffle: false,
		},
		cache: {
			dir: "node_modules/.vitest/components",
		},
		outputFile: {
			json: "./coverage/components/test-results.json",
		},
	},
	// Additional setup for React testing
	define: {
		...baseConfig.define,
		// React-specific defines
		"process.env.NODE_ENV": '"test"',
	},
});
