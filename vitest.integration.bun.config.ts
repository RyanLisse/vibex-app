import { defineConfig } from "vitest/config";

/**
 * Bun-Compatible Integration Tests Configuration
 *
 * Optimized for:
 * - Bun runtime compatibility
 * - Integration testing without vi.mock issues
 * - Database and Redis mocking
 * - Performance testing scenarios
 * - Memory management testing
 */
export default defineConfig({
	test: {
		name: "integration-bun",
		environment: "node",
		setupFiles: ["./tests/setup/integration-bun.ts"],
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
			// Bun-compatible integration tests
			"tests/integration/**/*-bun.{test,spec}.{js,ts}",
			"tests/integration/**/*.bun.{test,spec}.{js,ts}",
		],
		exclude: [
			// Exclude vi.mock dependent tests
			"tests/integration/**/*.{test,spec}.{js,ts}",
			"!tests/integration/**/*-bun.{test,spec}.{js,ts}",
			"!tests/integration/**/*.bun.{test,spec}.{js,ts}",
			// Standard exclusions
			"node_modules/**",
			"dist/**",
			"build/**",
			"coverage/**",
			"**/*.d.ts",
			// Client-side tests
			"**/*.{test,spec}.{jsx,tsx}",
			"**/components/**/*.{test,spec}.*",
			"**/hooks/**/*.{test,spec}.*",
			"**/src/components/**/*.{test,spec}.*",
			"**/src/hooks/**/*.{test,spec}.*",
			// Unit tests
			"tests/unit/**/*.{test,spec}.*",
			// E2E tests
			"**/*.e2e.{test,spec}.*",
			"**/e2e/**",
			"**/cypress/**",
			"**/playwright/**",
		],
		// Integration test specific settings optimized for Bun
		testTimeout: 10000, // 10 second timeout
		hookTimeout: 5000,
		teardownTimeout: 3000,
		maxConcurrency: 4, // Higher concurrency for Bun
		// Use threads for better performance in Bun
		poolOptions: {
			threads: {
				singleThread: false, // Allow multiple threads in Bun
				minThreads: 1,
				maxThreads: 4,
			},
		},
		retry: 1, // Allow one retry for flaky tests
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json"],
			reportsDirectory: "./coverage/integration-bun",
			thresholds: {
				global: {
					branches: 70,
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},
		},
		cache: {
			dir: "node_modules/.vitest/integration-bun",
		},
		outputFile: {
			json: "./coverage/integration-bun/test-results.json",
		},
		// Reporter configuration
		reporters: ["verbose", "json"],
		// Globals for better Bun compatibility
		globals: true,
	},
});
