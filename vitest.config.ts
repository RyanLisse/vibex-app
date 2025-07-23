import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Primary Vitest Configuration - TEST INFRASTRUCTURE FIXED
 *
 * FIXES APPLIED:
 * ✅ Bun test runner conflicts resolved
 * ✅ vi.mock compatibility issues fixed
 * ✅ jsdom navigation errors eliminated
 * ✅ Module externalization optimized
 * ✅ Test timeout and performance issues resolved
 * ✅ Setup file conflicts resolved
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths()],

	test: {
		name: "vitest-unified",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test-setup-fixed.ts"],

		// Comprehensive test file inclusion
		include: [
			"**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"!**/e2e/**", // Exclude e2e (Playwright)
			"!**/cypress/**", // Exclude Cypress
		],

		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/.{idea,git,cache,output,temp}/**",
			// Exclude e2e and browser tests
			"**/e2e/**",
			"**/*.e2e.*",
			"**/cypress/**",
			"**/playwright/**",
			// Exclude config files
			"**/*.config.*",
			"**/vite.config.*",
		],

		// Critical: Fix server deps for Bun compatibility
		server: {
			deps: {
				// Externalize Bun-specific modules
				external: [
					/^bun:/,
					/^node:/,
				],
				// Inline critical testing libraries
				inline: [
					/@testing-library\/.*$/,
					/^vitest$/,
					/^@vitest\/.*$/,
					/^react$/,
					/^react-dom$/,
					/^@radix-ui\/.*$/,
					/^happy-dom$/,
					/^jsdom$/,
				]
			}
		},

		// Enhanced jsdom environment
		environmentOptions: {
			jsdom: {
				resources: "usable",
				runScripts: "dangerously",
				pretendToBeVisual: true,
				html: '<!DOCTYPE html><html><head></head><body></body></html>',
				url: "http://localhost:3000",
				// Fix navigation API
				beforeParse(window) {
					// Mock navigation API to prevent "Not implemented" errors
					Object.defineProperty(window, 'navigation', {
						value: {
							navigate: () => Promise.resolve(),
							back: () => Promise.resolve(),
							forward: () => Promise.resolve(),
							canGoBack: true,
							canGoForward: true,
						},
						writable: true,
						configurable: true,
					});
				}
			}
		},

		// Optimized timeouts
		testTimeout: 15000,
		hookTimeout: 10000,
		teardownTimeout: 5000,

		// Performance optimizations
		maxConcurrency: Math.min(6, Math.max(2, require("os").cpus().length - 1)),
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
				useAtomics: true,
			}
		},

		// Reporting
		reporters: process.env.CI ? ["basic", "json"] : ["default"],
		outputFile: {
			json: "./coverage/vitest-results.json"
		},

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov", "json"],
			reportsDirectory: "./coverage",

			include: [
				"lib/**/*.{js,ts,jsx,tsx}",
				"components/**/*.{js,ts,jsx,tsx}",
				"app/**/*.{js,ts,jsx,tsx}",
				"src/**/*.{js,ts,jsx,tsx}",
				"hooks/**/*.{js,ts,jsx,tsx}",
				"utils/**/*.{js,ts,jsx,tsx}",
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
				"**/types/**",
				"**/*.stories.*",
				"**/storybook-static/**",
				"**/e2e/**",
				"**/cypress/**",
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
	},

	// Resolve configuration
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"@/lib": path.resolve(__dirname, "lib"),
			"@/components": path.resolve(__dirname, "components"),
			"@/app": path.resolve(__dirname, "app"),
			"@/utils": path.resolve(__dirname, "utils"),
			"@/hooks": path.resolve(__dirname, "hooks"),
			"@/src": path.resolve(__dirname, "src"),
			"@/types": path.resolve(__dirname, "types"),
			"@/db": path.resolve(__dirname, "db"),
		},
	},

	// Define globals for compatibility
	define: {
		"import.meta.vitest": false,
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
	},

	// Optimize dependencies
	optimizeDeps: {
		include: [
			"vitest",
			"@testing-library/react",
			"@testing-library/jest-dom",
			"@testing-library/user-event",
			"react",
			"react-dom",
			"jsdom",
			"happy-dom",
		],
		exclude: [
			"@electric-sql",
			"@neondatabase",
			"bun:test",
			"node:crypto",
			"node:fs",
			"node:path",
		]
	},

	// CRITICAL FIX: Disable ESBuild to prevent EPIPE errors
	esbuild: false,

	// Build configuration
	build: {
		target: "es2022",
		minify: false,
		sourcemap: true,
	},

	// Development server
	server: {
		fs: {
			allow: [".."]
		}
	}
});
