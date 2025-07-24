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
		setupFiles: ["./test-setup-minimal.ts"],

		// Ultra-fast tests only - verified existing files
		include: [
			// Verified core logic tests
			"lib/validation-utils.test.ts",
			"lib/container-types.test.ts",
			"tests/unit/telemetry.test.ts",
			"tests/unit/simple.test.ts",
			"tests/unit/basic-functionality.test.ts",
			
			// Essential schema validation
			"src/schemas/**/*.test.ts",
			
			// Fast hook tests
			"src/hooks/**/*.test.ts"
		],

		// Exclude everything slow or problematic
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"tests/integration/**/*",
			"tests/e2e/**/*",
			"e2e/**/*",
			"**/*.integration.*",
			"**/*.e2e.*",
			"**/*storybook*/**",
			"**/*playwright*/**",
			// Exclude slow component tests
			"components/**/*.test.*",
			"app/**/*.test.*",
			// Exclude complex API tests
			"app/api/**/*.test.*",
			// Exclude database/external service tests
			"lib/electric/**/*.test.*",
			"lib/inngest/**/*.test.*",
			"lib/github/**/*.test.*",
			"lib/auth/**/*.test.*",
		],

		// Aggressive anti-hanging configuration
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
				isolate: false,
			},
		},

		// Ultra-aggressive timeouts for speed
		testTimeout: 1500, // 1.5 seconds max per test
		hookTimeout: 300,  // 0.3 seconds for hooks
		teardownTimeout: 200, // 0.2 seconds for teardown
		maxConcurrency: 1, // No concurrency
		retry: 0, // No retries

		// Sequential execution only
		sequence: {
			concurrent: false,
			shuffle: false,
		},

		// Disable all watching and HMR
		watch: false,

		// Disable coverage for speed
		coverage: {
			enabled: false,
			provider: "v8",
		},

		// Minimal reporting
		reporters: ["basic"],
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

	// CRITICAL FIX: Completely disable ESBuild with detailed config
	esbuild: {
		include: [],
		exclude: ['**/*'],
		drop: ['console', 'debugger'],
		minify: false,
		target: 'esnext'
	},
	// Force Vite's built-in transformations
	transformMode: {
		sse: [],
		web: ['**/*.{ts,js,mts,mjs}']
	},
});