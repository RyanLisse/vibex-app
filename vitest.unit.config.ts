import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/**
 * Unit Tests Configuration for React Components
 *
 * Extends base configuration with unit test specific settings
 */
export default mergeConfig(baseConfig, defineConfig({
	test: {
		name: "unit",
		// Override base config for unit tests
		testTimeout: 10000,
		hookTimeout: 8000,
		teardownTimeout: 3000,

		// Force single-threaded execution for stability
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: true,
				execArgv: ['--max-old-space-size=2048']
			}
		},
		include: [
			// Unit tests for utilities and React components
			"lib/**/*.test.{js,ts}",
			"components/**/*.test.{jsx,tsx}",
			"app/**/*.test.{jsx,tsx}",
			"hooks/**/*.test.{js,ts,jsx,tsx}",
			"stores/**/*.test.{js,ts}",
			"utils/**/*.test.{js,ts}"
		],
		exclude: [
			// Integration and E2E tests
			"**/*.integration.test.*",
			"**/*.e2e.test.*",
			"tests/integration/**",
			"tests/e2e/**",
			"tests/api/**",
			// Server-side integration tests
			"app/api/**/*.test.{js,ts}",
			"lib/inngest/**/*.test.{js,ts}",
			"lib/electric/**/*.test.{js,ts}",
			"lib/monitoring/**/*.test.{js,ts}"
		],

		// Unit test specific settings
		css: true,
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage/unit",
			include: [
				"lib/**/*.{js,ts}",
				"components/**/*.{js,jsx,ts,tsx}",
				"app/**/*.{js,jsx,ts,tsx}",
				"hooks/**/*.{js,jsx,ts,tsx}",
				"stores/**/*.{js,ts}",
				"utils/**/*.{js,ts}"
			],
			exclude: [
				"**/*.test.*",
				"**/*.stories.*",
				"**/node_modules/**",
				"**/.next/**",
				"app/api/**",
				"lib/inngest/**",
				"lib/electric/**"
			]
		},

		cache: {
			dir: "node_modules/.vitest/unit"
		}
	}
}));