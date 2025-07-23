/**
 * Fast Vitest Configuration for vibex-app
 * Optimized for speed and stability, preventing hanging tests
 */
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],

	test: {
		name: "vibex-app-fast-tests",
		environment: "happy-dom", // Most stable environment
		globals: true,
		setupFiles: ["./test-setup.ts"],

		// Only include the most critical unit tests
		include: [
			"components/**/*.{test,spec}.{js,ts,jsx,tsx}",
			"lib/**/*.{test,spec}.{js,ts}",
			"app/**/*.{test,spec}.{js,ts,jsx,tsx}",
		],

		// Exclude everything that could cause hanging
		exclude: [
			"tests/integration/**/*",
			"tests/e2e/**/*", 
			"**/*.integration.*",
			"**/*.e2e.*",
			"**/node_modules/**",
			"coverage/**",
			"dist/**",
			"**/*storybook*/**",
			"**/*playwright*/**",
		],

		// Aggressive anti-hanging configuration
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
				isolate: false,
			},
		},

		// Very short timeouts to prevent hanging
		testTimeout: 3000, // 3 seconds maximum per test
		hookTimeout: 1000, // 1 second for hooks
		teardownTimeout: 500, // 0.5 seconds for teardown
		maxConcurrency: 1, // Absolutely no concurrency
		retry: 0, // No retries

		// Sequential execution only
		sequence: {
			concurrent: false,
			shuffle: false,
		},

		// Disable all watching and HMR
		watch: false,

		// Minimal coverage for speed
		coverage: {
			enabled: false, // Disable coverage for fast tests
		},

		// Minimal reporting
		reporter: ["basic"],
		outputFile: undefined,
	},

	resolve: {
		alias: {
			"@": __dirname,
			"@/lib": `${__dirname}/lib`,
			"@/components": `${__dirname}/components`,
			"@/utils": `${__dirname}/utils`,
		},
	},

	define: {
		"import.meta.vitest": false,
	},

	// Disable all server features
	server: {
		hmr: false,
		watch: null,
	},

	// Minimal optimizations
	optimizeDeps: {
		include: ["react", "react-dom"],
		exclude: ["@types/node"],
	},

	esbuild: {
		target: "es2022",
	},
});