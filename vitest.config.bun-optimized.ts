import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Bun-Optimized Vitest Configuration
 *
 * This configuration is specifically designed to work with Bun's runtime
 * and avoid the vi.mock compatibility issues.
 */
export default defineConfig({
	plugins: [
		react({
			jsxRuntime: "automatic",
		}),
		tsconfigPaths(),
	],

	test: {
		name: "vitest-bun",
		environment: "happy-dom", // Using happy-dom as it's lighter than jsdom
		globals: true,
		setupFiles: ["./vitest-setup.js"],

		include: [
			"lib/**/*.test.{ts,tsx}",
			"components/**/*.test.{ts,tsx}",
			"hooks/**/*.test.{ts,tsx}",
			"app/**/*.test.{ts,tsx}",
		],

		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/*.e2e.*",
			"**/e2e/**",
		],

		// Run tests sequentially to avoid concurrency issues
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: true,
			},
		},

		// Disable parallelism
		maxConcurrency: 1,
		maxWorkers: 1,
		fileParallelism: false,

		// Mock configuration for Bun compatibility
		mockReset: true,
		clearMocks: true,
		restoreMocks: true,

		// Disable features that cause issues
		coverage: {
			enabled: false,
		},
		typecheck: {
			enabled: false,
		},

		// Use basic reporter to avoid output issues
		reporters: ["basic"],

		// Timeouts
		testTimeout: 10000,
		hookTimeout: 10000,

		// Server configuration
		server: {
			deps: {
				inline: [
					// Inline modules that need transformation
					/@testing-library/,
					/react/,
					/react-dom/,
				],
				external: [
					// External Node.js builtins
					/^node:/,
					/^bun:/,
				],
			},
		},

		// CSS handling
		css: {
			modules: {
				classNameStrategy: "non-scoped",
			},
		},
	},

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"@/lib": path.resolve(__dirname, "lib"),
			"@/components": path.resolve(__dirname, "components"),
			"@/app": path.resolve(__dirname, "app"),
			"@/utils": path.resolve(__dirname, "utils"),
			"@/hooks": path.resolve(__dirname, "hooks"),
			"@/src": path.resolve(__dirname, "src"),
			"@/types": path.resolve(__dirname, "types"),
			"@/db": path.resolve(__dirname, "db"),
		},
	},

	// Disable esbuild to avoid conflicts
	esbuild: false,

	// Minimal optimization
	optimizeDeps: {
		disabled: true,
	},
});
