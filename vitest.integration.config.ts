import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Integration tests config for API routes, database, and Inngest
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
			"@/components": path.resolve(__dirname, "./components"),
			"@/lib": path.resolve(__dirname, "./lib"),
			"@/hooks": path.resolve(__dirname, "./hooks"),
			"@/app": path.resolve(__dirname, "./app"),
			"@/features": path.resolve(__dirname, "./src/features"),
			"@/shared": path.resolve(__dirname, "./src/shared"),
			"@/test": path.resolve(__dirname, "./tests"),
			"@/fixtures": path.resolve(__dirname, "./tests/fixtures"),
			"@/mocks": path.resolve(__dirname, "./tests/mocks"),
			"@/db": path.resolve(__dirname, "./db"),
			"@/stores": path.resolve(__dirname, "./stores"),
			"@/src": path.resolve(__dirname, "./src"),
		},
	},
	optimizeDeps: {
		exclude: ["fsevents", "playwright", "playwright-core", "chromium-bidi"],
	},
	build: {
		rollupOptions: {
			external: ["fsevents", "playwright", "playwright-core", "chromium-bidi"],
		},
	},
	esbuild: {
		target: "es2022",
		format: "esm",
	},
	test: {
		name: "integration",
		environment: "node",
		setupFiles: ["./tests/setup/integration.ts"],
		globals: true,
		restoreMocks: true,
		clearMocks: true,
		mockReset: true,
		passWithNoTests: true,
		logHeapUsage: true,
		// Use forks for integration tests for better isolation
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: false,
				isolate: true,
			},
		},
		env: {
			// Flexible database URL - can use real DB or fallback to in-memory
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
			"**/*.browser.test.*",
			"**/*.bun.test.*",
			"tests/bun-*.test.*",
			"components/**/*.test.*",
			"hooks/**/*.test.*",
			"lib/**/*.test.{js,ts}",
			"!lib/inngest*.test.ts",
			"src/**/*.test.*",
			"stores/**/*.test.*",
			"tests/e2e/**",
			"tests/browser/**",
		],
		testTimeout: 30_000, // Longer timeout for integration tests
		hookTimeout: 15_000,
		teardownTimeout: 15_000,
		bail: 0,
		retry: process.env.CI ? 2 : 0,
		reporters: process.env.CI ? ["verbose", "json"] : ["verbose"],
		outputFile: process.env.CI
			? "./test-results/integration-results.json"
			: undefined,
		coverage: {
			enabled: false, // Disable coverage for integration tests to improve performance
		},
	},
});
