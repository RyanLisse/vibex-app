import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.config";

// Integration tests config for API routes, database, and Inngest
export default mergeConfig(sharedConfig, {
	plugins: [react()],
	test: {
		name: "integration",
		environment: "node",
		setupFiles: ["./tests/setup/integration.ts"],
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
			"tests/integration/**/*.test.{js,ts,jsx,tsx}",
			"app/api/**/*.test.{js,ts}",
			"**/*.integration.test.*",
			"lib/inngest*.test.ts",
			"app/actions/inngest.test.ts",
			"app/actions/vibekit.test.ts",
			"app/api/inngest/route.test.ts",
			"db/**/*.test.ts",
		],
		exclude: [
			"node_modules",
			"dist",
			".next",
			"**/*.e2e.test.*",
			"**/*.bun.test.*",
			"tests/bun-*.test.*",
			"components/**/*.test.*",
			"hooks/**/*.test.*",
			"lib/**/*.test.{js,ts}",
			"!lib/inngest*.test.ts",
			"src/**/*.test.*",
			"stores/**/*.test.*",
			"tests/unit/**",
			"tests/e2e/**",
		],
		// Integration test timeouts
		testTimeout: 30000,
		hookTimeout: 15000,
		teardownTimeout: 10000,
		// Conservative concurrency for integration tests
		maxConcurrency: 2,
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/integration",
			include: [
				"app/api/**/*.{js,ts}",
				"lib/inngest*.{js,ts}",
				"app/actions/**/*.{js,ts}",
				"db/**/*.{js,ts}",
			],
			exclude: [
				"coverage/**",
				"dist/**",
				"**/node_modules/**",
				"**/test*/**",
				"**/*.d.ts",
				"**/*.config.*",
				"**/*.test.*",
				"**/*.spec.*",
				"**/migrations/**",
			],
			thresholds: {
				global: {
					branches: 70,
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},
		},
		// Single-threaded for integration stability
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
				isolate: true,
			},
		},
		retry: 1, // Allow one retry for flaky integration tests
		// Sequential execution for database consistency
		sequence: {
			concurrent: false,
		},
	},
});
