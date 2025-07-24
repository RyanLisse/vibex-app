import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * No-Hang Vitest Configuration
 *
 * This configuration is specifically designed to prevent hanging issues
 * by using the most stable settings and avoiding problematic features.
 */
export default defineConfig({
	plugins: [
		react({
			// Minimal babel configuration to avoid transformation issues
			babel: {
				parserOpts: {
					plugins: ["jsx", "typescript"],
				},
			},
		}),
		tsconfigPaths(),
	],

	test: {
		name: "vitest-no-hang",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test-setup-simple.ts"],

		// Only include essential test files
		include: [
			"lib/**/*.test.{ts,tsx}",
			"components/**/*.test.{ts,tsx}",
			"hooks/**/*.test.{ts,tsx}",
		],

		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/*.e2e.*",
			"**/e2e/**",
			"**/*.integration.*",
			"**/*.config.*",
		],

		// Use single thread to avoid concurrency issues
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: false, // Less isolation = less hanging
				execArgv: [],
			},
		},

		// Force sequential execution
		maxConcurrency: 1,
		maxWorkers: 1,
		sequence: {
			concurrent: false,
		},

		// Minimal server configuration
		server: {
			deps: {
				// External all potentially problematic modules
				external: [
					/^node:/,
					/^bun:/,
					/^fs$/,
					/^path$/,
					/^crypto$/,
					/^stream$/,
					/^util$/,
					/^events$/,
					/^buffer$/,
					/^process$/,
					/^child_process$/,
					/^worker_threads$/,
					/^os$/,
					/^net$/,
					/^tls$/,
					/^http$/,
					/^https$/,
					/^zlib$/,
					/^vm$/,
					/^v8$/,
					/^perf_hooks$/,
				],
			},
		},

		// Simple environment configuration
		environmentOptions: {
			jsdom: {
				url: "http://localhost:3000",
			},
		},

		// Conservative timeouts
		testTimeout: 30000,
		hookTimeout: 20000,
		teardownTimeout: 10000,

		// Disable all non-essential features
		coverage: {
			enabled: false,
		},
		typecheck: {
			enabled: false,
		},
		css: false,
		threads: false,
		isolate: false,

		// Simple reporter
		reporters: ["basic"],

		// Disable watch mode features
		watch: false,
		watchExclude: ["**/node_modules/**", "**/.git/**"],

		// Disable API features that might cause hanging
		api: false,

		// Don't use browser mode
		browser: {
			enabled: false,
		},

		// Disable file parallelism
		fileParallelism: false,
	},

	// Simple resolve configuration
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

	// Minimal globals
	define: {
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
	},

	// Use React's automatic JSX transform to avoid ESBuild
	esbuild: {
		jsx: "automatic",
		jsxDev: false,
		minify: false,
		target: "esnext",
	},

	// Disable all optimizations
	optimizeDeps: {
		entries: [],
		exclude: ["*"],
		include: [],
		force: false,
	},

	// Simple build configuration
	build: {
		target: "esnext",
		minify: false,
		sourcemap: false,
		rollupOptions: {
			external: [/node:.*/, /^bun:.*/],
		},
	},

	// Disable SSR
	ssr: {
		noExternal: true,
		target: "node",
	},

	// Log level for debugging
	logLevel: "warn",
});
