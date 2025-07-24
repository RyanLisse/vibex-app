import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Fixed Vitest Configuration - Alternative ESBuild Configuration
 *
 * This configuration addresses the ESBuild hanging issue by:
 * 1. Disabling ESBuild transformation for test files
 * 2. Using alternative transformation strategies
 * 3. Implementing better process isolation
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths()],

	test: {
		name: "vitest-fixed",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test-setup-simple.ts"],

		// Simplified test file inclusion
		include: [
			"lib/**/*.{test,spec}.{ts,tsx,js,jsx}",
			"src/**/*.{test,spec}.{ts,tsx,js,jsx}",
			"components/**/*.{test,spec}.{ts,tsx,js,jsx}",
			"hooks/**/*.{test,spec}.{ts,tsx,js,jsx}",
			"app/**/*.{test,spec}.{ts,tsx,js,jsx}",
		],

		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/*.e2e.*",
			"**/e2e/**",
			"**/*.config.*",
		],

		// Critical: Alternative process configuration
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: false, // Allow multiple forks for better isolation
				isolate: true,
				execArgv: ["--max-old-space-size=4096"], // Increase memory
			},
		},

		// Disable concurrent execution to prevent hanging
		maxConcurrency: 1,
		sequence: {
			concurrent: false,
		},

		// Server configuration without ESBuild inline
		server: {
			deps: {
				// External modules that shouldn't be processed
				external: [/^node:/, /^bun:/],
				// Don't inline any modules - let Vite handle them
				inline: false,
				// Use web mode for better compatibility
				moduleDirectories: ["node_modules"],
			},
		},

		// Environment configuration
		environmentOptions: {
			jsdom: {
				resources: "usable",
				runScripts: "dangerously",
				pretendToBeVisual: true,
				html: "<!DOCTYPE html><html><head></head><body></body></html>",
				url: "http://localhost:3000",
			},
		},

		// Increase timeouts for stability
		testTimeout: 15000,
		hookTimeout: 10000,
		teardownTimeout: 5000,

		// Disable coverage during testing to avoid additional overhead
		coverage: {
			enabled: false,
		},

		// Use basic reporter
		reporters: ["basic"],
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

	// Define globals
	define: {
		"import.meta.vitest": false,
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
	},

	// Disable ESBuild for test files
	esbuild: false,

	// Use SWC for transformation instead of ESBuild
	// This requires installing @vitejs/plugin-react-swc

	// Alternative: Use plain transformation without optimization
	build: {
		target: "esnext",
		minify: false,
		sourcemap: true,
	},

	// Server configuration
	server: {
		fs: {
			allow: [".."],
		},
	},
});
