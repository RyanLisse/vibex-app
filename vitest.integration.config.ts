import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Integration Tests Configuration
 *
 * Optimized for:
 * - API route testing
 * - Database integration
 * - External service integration (Inngest, Electric SQL)
 * - End-to-end workflow testing
 * - Real environment simulation
 */
export default defineConfig({
	// CRITICAL FIX: Disable ESBuild to prevent EPIPE errors
	esbuild: false,
	
	plugins: [
		react({
			jsxRuntime: 'automatic',
			jsxImportSource: 'react',
		}), 
		tsconfigPaths()
	],
	test: {
		name: "integration",
		environment: "node",
		setupFiles: ["./test-setup-fixed.ts"],
		env: {
			// Test environment variables
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
			// Client-side tests (handled by other configs)
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
			// Bun-specific tests
			"**/*.bun.{test,spec}.*",
			"tests/bun-*.{test,spec}.*",
			// Problematic client-side integration tests
			"tests/integration/**/*.test.tsx",
			"tests/integration/**/ai-chat-testing.test.ts",
			"tests/integration/**/cache-invalidation.test.ts",
		],
		// Integration test specific settings
		testTimeout: 30000, // Longer timeout for integration tests
		hookTimeout: 15000,
		teardownTimeout: 10000,
		maxConcurrency: 2, // Limit parallel tests to prevent resource conflicts
		// Single thread execution to prevent race conditions
		poolOptions: {
			threads: {
				singleThread: true,
			},
		},
		retry: 1, // Allow one retry for flaky integration tests
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json"],
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
	},
});
