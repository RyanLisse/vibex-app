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

		// Only include fast, essential unit tests
		include: [
			// Core business logic tests (fastest)
			"lib/utils.test.ts",
			"lib/container-types.test.ts",
			"lib/message-handlers.test.ts",
			"lib/validation-utils.test.ts",
			"lib/stream-utils.test.ts",
			"lib/telemetry.test.ts",

			// Essential schema tests
			"src/schemas/**/*.test.ts",

			// Critical hook tests (lightweight only)
			"hooks/use-auth-base.test.ts",
			"hooks/use-file-upload.test.ts",
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

		// Aggressive timeouts for speed
		testTimeout: 2000, // 2 seconds max per test
		hookTimeout: 500,  // 0.5 seconds for hooks
		teardownTimeout: 250, // 0.25 seconds for teardown
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

	// CRITICAL FIX: Disable ESBuild to prevent EPIPE errors
	esbuild: false,
});