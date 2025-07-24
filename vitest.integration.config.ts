import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Integration Tests Configuration
 *
 * Handles server-side integration tests, API routes, and complex workflows
 */
export default defineConfig({
	plugins: [
		react({
			jsxRuntime: 'automatic',
			jsxImportSource: 'react',
		}),
		tsconfigPaths()
	],
	esbuild: {
		target: 'esnext',
		minify: false,
		keepNames: true,
		sourcemap: true
	},
	test: {
		name: "integration",
		environment: "jsdom",
		setupFiles: ["./tests/setup/integration-setup.ts"],

		// Override base config for integration tests
		testTimeout: 20000,
		hookTimeout: 8000,
		teardownTimeout: 5000,

		// Force single-threaded execution for stability
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: true,
				execArgv: ['--max-old-space-size=4096']
			}
		},

		// Sequential execution to prevent race conditions
		sequence: {
			concurrent: false,
			shuffle: false,
			hooks: 'stack'
		},

		env: {
			DATABASE_URL: "postgresql://test:test@localhost:5432/test",
			ELECTRIC_URL: "http://localhost:5133",
			ELECTRIC_WEBSOCKET_URL: "ws://localhost:5133",
			ELECTRIC_AUTH_TOKEN: "test_auth_token",
			ELECTRIC_USER_ID: "test_user_id",
			ELECTRIC_API_KEY: "test_api_key",
			AUTH_SECRET: "test_auth_secret",
			NODE_ENV: "test",
			INNGEST_SIGNING_KEY: "test-signing-key",
			INNGEST_EVENT_KEY: "test-event-key",
		},
		include: [
			// Integration test directories
			"tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"tests/alerts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"tests/migration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			// API routes (server-side only)
			"app/api/**/*.{test,spec}.{js,ts}",
			"app/actions/**/*.{test,spec}.{js,ts}",
			// Server-side modules with integration requirements
			"db/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/inngest/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/redis/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/electric/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/migration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/monitoring/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/observability/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/workflow/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"lib/wasm/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			// Explicit integration test patterns
			"**/*.integration.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
		],
		exclude: [
			// Standard exclusions
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			// Client-side tests (handled by unit config)
			"**/*.{test,spec}.{jsx,tsx}",
			"**/components/**/*.{test,spec}.*",
			"**/hooks/**/*.{test,spec}.*",
			"**/src/components/**/*.{test,spec}.*",
			"**/src/hooks/**/*.{test,spec}.*",
			// Unit tests (handled by unit config)
			"**/lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"**/utils/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"**/src/schemas/**/*.{test,spec}.*",
			"**/src/shared/**/*.{test,spec}.*",
			"tests/unit/**/*.{test,spec}.*",
			// E2E tests
			"**/*.e2e.{test,spec}.*",
			"**/e2e/**",
			"**/cypress/**",
			"**/playwright/**",
		],

		// Optimized integration test settings
		maxConcurrency: 1, // Force single execution
		pool: "forks",
		isolate: true,
		globals: true,

		retry: 1, // Allow one retry for flaky integration tests
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/integration",
			thresholds: {
				global: {
					branches: 70, // Lower threshold for integration tests
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},
		},

		cache: {
			dir: "node_modules/.vitest/integration",
		},
		outputFile: {
			json: "./coverage/integration/test-results.json",
		},
	}
});
