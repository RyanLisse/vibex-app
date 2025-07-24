import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/**
 * Integration Tests Configuration
 *
 * Extends base configuration with integration test specific settings
 */
export default mergeConfig(baseConfig, defineConfig({
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
			"tests/integration/**/*.{test,spec}.{js,ts}",
			"app/api/**/*.{test,spec}.{js,ts}",
			"lib/inngest/**/*.{test,spec}.{js,ts}",
			"lib/electric/**/*.{test,spec}.{js,ts}",
			"lib/monitoring/**/*.{test,spec}.{js,ts}",
			// Explicit integration test patterns
			"**/*.integration.{test,spec}.{js,ts}",
		],
		exclude: [
			// Client-side tests (handled by unit config)
			"**/*.{test,spec}.{jsx,tsx}",
			"components/**/*.{test,spec}.*",
			"hooks/**/*.{test,spec}.*",
			// Unit tests (handled by unit config)
			"lib/**/*.{test,spec}.{js,ts}",
			"utils/**/*.{test,spec}.{js,ts}",
			// E2E tests
			"**/*.e2e.{test,spec}.*",
			"tests/e2e/**",
			"playwright/**"
		],

		retry: 1, // Allow one retry for flaky integration tests
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json"],
			reportsDirectory: "./coverage/integration"
		},

		cache: {
			dir: "node_modules/.vitest/integration"
		}
	}
}));
