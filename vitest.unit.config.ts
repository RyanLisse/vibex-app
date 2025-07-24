import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit Tests Configuration for React Components
 * 
 * This configuration is specifically for React component tests using Vitest.
 * Logic/utility tests should use Bun test runner instead.
 */
export default defineConfig({
	plugins: [
		react({
			jsxRuntime: 'automatic',
			jsxImportSource: 'react',
		}),
		tsconfigPaths()
	],
	test: {
		name: "unit-components",
		environment: "jsdom",
		setupFiles: ["./vitest-setup.js"],
		include: [
			// React component tests only
			"components/**/*.test.{jsx,tsx}",
			"app/**/*.test.{jsx,tsx}",
			"hooks/**/*.test.{jsx,tsx}",
			"src/components/**/*.test.{jsx,tsx}",
			"src/hooks/**/*.test.{jsx,tsx}",
			// Exclude useZodForm which is handled by Bun
			"!src/hooks/useZodForm/**/*.test.{js,ts}"
		],
		exclude: [
			// Standard exclusions
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			// Logic tests (handled by Bun)
			"lib/**/*.test.{js,ts}",
			"stores/**/*.test.{js,ts}",
			"src/lib/**/*.test.{js,ts}",
			"src/schemas/**/*.test.{js,ts}",
			// Integration and E2E tests
			"**/*.integration.test.*",
			"**/*.e2e.test.*",
			"tests/integration/**",
			"tests/e2e/**",
			// Bun-specific tests
			"**/*.bun.test.*"
		],
		// Optimized settings for component tests
		globals: true,
		css: true,
		testTimeout: 10000,
		hookTimeout: 10000,
		teardownTimeout: 5000,
		isolate: true,
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: false,
				isolate: true
			}
		},
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/components",
			include: [
				"components/**/*.{js,jsx,ts,tsx}",
				"app/**/*.{js,jsx,ts,tsx}",
				"hooks/**/*.{js,jsx,ts,tsx}",
				"src/components/**/*.{js,jsx,ts,tsx}",
				"src/hooks/**/*.{js,jsx,ts,tsx}"
			],
			exclude: [
				"**/*.test.*",
				"**/*.stories.*",
				"**/node_modules/**",
				"**/.next/**"
			],
			thresholds: {
				global: {
					branches: 75,
					functions: 75,
					lines: 75,
					statements: 75
				}
			}
		},
		cache: {
			dir: "node_modules/.vitest/components"
		},
		outputFile: {
			json: "./coverage/components/test-results.json"
		}
	}
});