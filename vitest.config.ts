import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Unified Vitest Configuration
 *
 * This configuration handles all test types and fixes:
 * - Bun test runner conflicts
 * - vi.mock compatibility issues
 * - jsdom navigation errors
 * - Module externalization problems
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths()],

	test: {
		name: "unified-tests",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test-setup-fixed.ts"],

		// Include all test files except e2e
		include: [
			"**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			// Exclude e2e tests (handled by Playwright)
			"e2e/**",
			"**/*.e2e.*",
		],

		// Server configuration for module handling
		server: {
			deps: {
				external: [/^bun:/],
				inline: [
					/@testing-library\/.*$/,
					/^vitest$/,
					/^@vitest\/.*$/,
					/^react$/,
					/^react-dom$/,
					/^@radix-ui\/.*$/,
				]
			}
		},

		// Environment options for jsdom
		environmentOptions: {
			jsdom: {
				resources: "usable",
				runScripts: "dangerously",
				pretendToBeVisual: true,
				html: '<!DOCTYPE html><html><head></head><body></body></html>',
				url: "http://localhost:3000"
			}
		},

		// Timeouts
		testTimeout: 15000,
		hookTimeout: 10000,
		teardownTimeout: 5000,

		// Performance settings
		maxConcurrency: Math.min(8, Math.max(2, require("os").cpus().length)),

		// Reporters
		reporters: ["default", "json"],

		outputFile: {
			json: "./coverage/test-results.json"
		},

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov", "json"],
			reportsDirectory: "./coverage",
			include: [
				"lib/**/*.{js,ts,jsx,tsx}",
				"utils/**/*.{js,ts,jsx,tsx}",
				"components/**/*.{js,ts,jsx,tsx}",
				"app/**/*.{js,ts,jsx,tsx}",
				"src/**/*.{js,ts,jsx,tsx}",
				"hooks/**/*.{js,ts,jsx,tsx}",
			],
			exclude: [
				"**/*.d.ts",
				"**/*.test.*",
				"**/*.spec.*",
				"**/node_modules/**",
				"**/coverage/**",
				"**/.next/**",
				"**/dist/**",
				"**/*.config.*",
				"**/types.ts",
				"**/*.stories.*",
			],
			thresholds: {
				global: {
					branches: 60,
					functions: 60,
					lines: 60,
					statements: 60,
				},
			},
		},
	},

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"@/lib": path.resolve(__dirname, "lib"),
			"@/components": path.resolve(__dirname, "components"),
			"@/app": path.resolve(__dirname, "app"),
			"@/utils": path.resolve(__dirname, "utils"),
			"@/hooks": path.resolve(__dirname, "hooks"),
		},
	},

	define: {
		"import.meta.vitest": false,
		global: "globalThis",
	},

	optimizeDeps: {
		include: [
			"vitest",
			"@testing-library/react",
			"@testing-library/jest-dom",
			"@testing-library/user-event",
			"react",
			"react-dom",
			"jsdom"
		],
		exclude: [
			"@electric-sql",
			"@neondatabase",
			"bun:test"
		]
	},

	build: {
		target: "es2022",
		minify: false,
		sourcemap: true
	},

	server: {
		fs: {
			allow: [".."]
		}
	}
});
