import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Bun-Optimized Vitest Configuration
 *
 * This configuration is specifically optimized for Bun runtime
 * and addresses ESBuild hanging issues.
 */
export default defineConfig({
	plugins: [
		react({
			// Use automatic JSX runtime to avoid transformation issues
			jsxRuntime: "automatic",
			// Disable Fast Refresh for tests
			fastRefresh: false,
			// Use minimal babel configuration
			babel: {
				presets: [],
				plugins: [],
			},
		}),
		tsconfigPaths(),
	],

	test: {
		name: "vitest-bun",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test-setup-jest-mocks.ts", "./test-setup-simple.ts"],

		include: [
			"lib/**/*.{test,spec}.{ts,tsx,js,jsx}",
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
			"**/*.bun.test.*", // Exclude pure Bun tests
		],

		// Bun-specific process configuration
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: false, // Less isolation for better Bun compatibility
				execArgv: ["--max-old-space-size=4096"],
			},
		},

		// Force sequential execution
		maxConcurrency: 1,
		sequence: {
			concurrent: false,
			shuffle: false,
		},

		// Bun-compatible deps configuration
		server: {
			deps: {
				// External all Bun and Node internals
				external: [/^bun:/, /^node:/, /^fs$/, /^path$/, /^url$/, /^crypto$/],
				// Inline only essential test libraries
				inline: [/@testing-library/, /vitest/, /jsdom/],
				// Use fallback mode for better compatibility
				fallbackCJS: true,
			},
		},

		// Minimal environment configuration
		environmentOptions: {
			jsdom: {
				url: "http://localhost:3000",
				resources: "usable",
			},
		},

		// Increased timeouts for Bun
		testTimeout: 30000,
		hookTimeout: 15000,
		teardownTimeout: 10000,

		// Use verbose reporter for better debugging
		reporters: process.env.CI ? ["basic"] : ["verbose"],

		// Disable features that might cause hanging
		css: false,
		coverage: {
			enabled: false,
		},
		typecheck: {
			enabled: false,
		},
	},

	// Resolve configuration for Bun
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
		// Use Bun-compatible module resolution
		extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
		mainFields: ["module", "main"],
	},

	// Define globals
	define: {
		"import.meta.vitest": false,
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
		// Define Bun global
		"globalThis.Bun": "globalThis.Bun",
	},

	// Minimal ESBuild configuration
	esbuild: {
		target: "node18",
		format: "esm",
		platform: "node",
		// Disable minification and optimization
		minify: false,
		treeShaking: false,
		// Keep names for better debugging
		keepNames: true,
		// Use simple loader
		loader: "tsx",
	},

	// Disable optimization to prevent hanging
	optimizeDeps: {
		disabled: true,
		exclude: ["bun"],
		esbuildOptions: {
			target: "node18",
		},
	},

	// Build configuration
	build: {
		target: "esnext",
		minify: false,
		sourcemap: true,
		// Use simple output format
		lib: {
			entry: {},
			formats: ["es"],
		},
	},
});
