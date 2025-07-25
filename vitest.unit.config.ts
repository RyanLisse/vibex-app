import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Consolidated Unit Tests Configuration
 *
 * Handles both utilities (JS/TS) and React components (JSX/TSX)
 * This replaces the previous separate Bun and Vitest configurations
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
		name: "unit",
		environment: "jsdom",
		setupFiles: ["./vitest-setup.js"],

		// Optimized settings to prevent hanging
		testTimeout: 10000,
		hookTimeout: 8000,
		teardownTimeout: 3000,

		// Force single-threaded execution for stability
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: true,
				execArgv: ['--max-old-space-size=2048']
			}
		},

		include: [
			// All unit tests - both utilities and React components
			"lib/**/*.test.{js,ts}",
			"src/lib/**/*.test.{js,ts}",
			"src/schemas/**/*.test.{js,ts}",
			"stores/**/*.test.{js,ts}",
			"utils/**/*.test.{js,ts}",
			"components/**/*.test.{jsx,tsx}",
			"app/**/*.test.{jsx,tsx}",
			"hooks/**/*.test.{jsx,tsx}",
			"src/components/**/*.test.{jsx,tsx}",
			"src/hooks/**/*.test.{jsx,tsx}",
			"src/shared/**/*.test.{js,ts}",
			"src/types/**/*.test.{js,ts}"
		],
		exclude: [
			// Standard exclusions
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			// Integration and E2E tests
			"**/*.integration.test.*",
			"**/*.e2e.test.*",
			"tests/integration/**",
			"tests/e2e/**",
			// API routes and server-side integration tests
			"app/api/**/*.test.{js,ts}",
			"app/actions/**/*.test.{js,ts}",
			"lib/inngest/**/*.test.{js,ts}",
			"lib/redis/**/*.test.{js,ts}",
			"lib/electric/**/*.test.{js,ts}",
			"lib/migration/**/*.test.{js,ts}",
			"lib/monitoring/**/*.test.{js,ts}",
			"lib/observability/**/*.test.{js,ts}",
			"lib/workflow/**/*.test.{js,ts}",
			"lib/wasm/**/*.test.{js,ts}"
		],

		// Unit test specific settings
		globals: true,
		css: true,
		isolate: true,

		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage/unit",
			include: [
				"lib/**/*.{js,ts}",
				"src/lib/**/*.{js,ts}",
				"src/schemas/**/*.{js,ts}",
				"stores/**/*.{js,ts}",
				"utils/**/*.{js,ts}",
				"components/**/*.{js,jsx,ts,tsx}",
				"app/**/*.{js,jsx,ts,tsx}",
				"hooks/**/*.{js,jsx,ts,tsx}",
				"src/components/**/*.{js,jsx,ts,tsx}",
				"src/hooks/**/*.{js,jsx,ts,tsx}",
				"src/shared/**/*.{js,ts}",
				"src/types/**/*.{js,ts}"
			],
			exclude: [
				"**/*.test.*",
				"**/*.stories.*",
				"**/node_modules/**",
				"**/.next/**",
				// Exclude integration-specific modules
				"app/api/**",
				"app/actions/**",
				"lib/inngest/**",
				"lib/redis/**",
				"lib/electric/**",
				"lib/migration/**",
				"lib/monitoring/**",
				"lib/observability/**",
				"lib/workflow/**",
				"lib/wasm/**"
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
			dir: "node_modules/.vitest/unit"
		},
		outputFile: {
			json: "./coverage/unit/test-results.json"
		}
	}
});