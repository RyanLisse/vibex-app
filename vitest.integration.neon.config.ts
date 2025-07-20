import react from "@vitejs/plugin-react";
import { mergeConfig } from "vitest/config";
import { sharedConfig } from "./vitest.shared.config";

// Integration tests config with Neon database branching support
export default mergeConfig(sharedConfig, {
	plugins: [react()],
	test: {
		name: "integration-neon",
		environment: "node",
		setupFiles: ["./tests/setup/integration-neon.ts"],
		env: {
			// If TEST_DATABASE_URL is provided, use it; otherwise fall back to in-memory
			DATABASE_URL:
				process.env.TEST_DATABASE_URL || "file::memory:?cache=shared",
			ELECTRIC_URL: "http://localhost:5133",
			ELECTRIC_WEBSOCKET_URL: "ws://localhost:5133",
			ELECTRIC_AUTH_TOKEN: "test_auth_token",
			ELECTRIC_USER_ID: "test_user_id",
			ELECTRIC_API_KEY: "test_api_key",
			AUTH_SECRET: "test_auth_secret",
			NODE_ENV: "test",
			INNGEST_SIGNING_KEY: "test-signing-key",
			INNGEST_EVENT_KEY: "test-event-key",
			// Add Neon-specific env vars if available
			NEON_PROJECT_ID: process.env.NEON_PROJECT_ID || "dark-lab-64080564",
			NEON_API_KEY: process.env.NEON_API_KEY || "",
		},
		include: [
			"tests/integration/**/*.test.{js,ts,jsx,tsx}",
			"app/api/**/*.test.{js,ts}",
			"**/*.integration.test.*",
			"lib/inngest*.test.ts",
			"app/actions/inngest.test.ts",
			"app/actions/vibekit.test.ts",
			"app/api/inngest/route.test.ts",
			"app/api/test-inngest/route.test.ts",
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
		],
		testTimeout: 30_000, // Longer timeout for integration tests
		hookTimeout: 15_000,
		teardownTimeout: 15_000,
		coverage: {
			enabled: false, // Disable coverage for integration tests
		},
		// Pool configuration for parallel test execution
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: false, // Allow parallel execution
				isolate: true, // Isolate each test file
			},
		},
	},
});
