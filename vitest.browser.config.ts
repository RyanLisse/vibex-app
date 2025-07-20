import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Browser tests config for E2E and browser-specific testing
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
		name: "browser",
		environment: "jsdom", // Fallback to jsdom when browser mode is disabled
		setupFiles: ["./tests/setup/browser.ts"],
		globals: true,
		restoreMocks: true,
		clearMocks: true,
		mockReset: true,
		passWithNoTests: true,
		logHeapUsage: true,
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
			},
		},
		browser: {
			enabled: false, // Disabled until browser tests are ready - use Playwright separately
			provider: "playwright",
			instances: [{ browser: "chromium" }], // Only chromium for faster testing
			headless: true,
		},
		include: [
			"tests/e2e/**/*.spec.{js,ts,jsx,tsx}",
			"tests/browser/**/*.test.{js,ts,jsx,tsx}",
			"**/*.e2e.test.*",
			"**/*.browser.test.*",
		],
		exclude: [
			"node_modules",
			"dist",
			".next",
			"**/*.integration.test.*",
			"**/*.unit.test.*",
			"**/*.bun.test.*",
			"tests/bun-*.test.*",
			"lib/**/*.test.*",
			"components/**/*.test.*",
			"hooks/**/*.test.*",
			"app/**/*.test.*",
			"src/**/*.test.*",
			"stores/**/*.test.*",
			"tests/integration/**",
		],
		testTimeout: 60_000,
		hookTimeout: 30_000,
		teardownTimeout: 30_000,
		bail: 0,
		retry: process.env.CI ? 2 : 1, // E2E tests can be flaky
		reporters: process.env.CI ? ["verbose", "json"] : ["verbose"],
		outputFile: process.env.CI
			? "./test-results/browser-results.json"
			: undefined,
		coverage: {
			enabled: false, // Disable coverage for browser tests
		},
	},
});
