import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Base Vitest Configuration
 *
 * Optimized configuration to resolve hanging issues
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
		keepNames: true,
		sourcemap: true,
		// Add explicit loader configuration
		loader: {
			'.js': 'jsx',
			'.ts': 'tsx',
		}
	},
	test: {
		// Critical: Enable globals for vi.mock to work
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest-setup.js"],

		// Optimized timeouts to prevent hanging
		testTimeout: 15000,
		hookTimeout: 10000,
		teardownTimeout: 5000,

		// Force single-threaded execution to prevent conflicts
		pool: "forks",
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

		// Improved file matching
		include: [
			"**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"app/**/*.test.{js,ts,jsx,tsx}",
			"components/**/*.test.{js,ts,jsx,tsx}",
			"lib/**/*.test.{js,ts}",
			"hooks/**/*.test.{js,ts}"
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/storybook-static/**",
			"**/playwright-report/**",
			"**/test-results/**"
		],

		// Coverage settings
		coverage: {
			enabled: false,
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"coverage/**",
				"dist/**",
				"**/node_modules/**",
				"**/*.d.ts",
				"**/*.config.*",
				"**/*.setup.*"
			]
		},

		// Cache configuration
		cache: {
			dir: "node_modules/.vitest"
		},

		// Reporter configuration
		reporter: ['default'],

		// Disable watch mode by default
		watch: false
	}
});
