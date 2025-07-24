import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Vitest Configuration with SWC Transformation
 *
 * This configuration uses SWC for transformation instead of ESBuild
 * to resolve hanging issues.
 */
export default defineConfig({
	plugins: [
		// Use @vitejs/plugin-react-swc instead of regular react plugin
		// This avoids ESBuild completely
		tsconfigPaths(),
		{
			name: "custom-transform",
			transform(code, id) {
				// Skip transformation for node_modules to prevent hanging
				if (id.includes("node_modules")) {
					return null;
				}
				// Let Vite handle the transformation
				return null;
			},
		},
	],

	test: {
		name: "vitest-swc",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test-setup-simple.ts"],

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
		],

		// Use threads pool with worker threads instead of forks
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
				isolate: true,
				useAtomics: false,
				execArgv: ["--max-old-space-size=4096"],
			},
		},

		// Sequential execution
		maxConcurrency: 1,
		sequence: {
			concurrent: false,
		},

		// Deps configuration - external everything problematic
		server: {
			deps: {
				external: [/^node:/, /^bun:/, /esbuild/],
				inline: [
					// Only inline what's absolutely necessary
					/@testing-library/,
					/vitest/,
				],
				// Force web-compatible transformation
				web: {
					transformMode: {
						ssr: [],
						web: [/\.[jt]sx?$/],
					},
				},
			},
		},

		// Environment options
		environmentOptions: {
			jsdom: {
				resources: "usable",
				runScripts: "dangerously",
				pretendToBeVisual: true,
				html: "<!DOCTYPE html><html><head></head><body></body></html>",
				url: "http://localhost:3000",
			},
		},

		// Timeouts
		testTimeout: 20000,
		hookTimeout: 10000,

		// Basic reporter
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
		// Force Node.js resolution for better compatibility
		conditions: ["node", "import", "require"],
	},

	// Define globals
	define: {
		"import.meta.vitest": false,
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
	},

	// Completely disable ESBuild
	esbuild: false,

	// Use basic Vite transformation
	build: {
		target: "node18",
		minify: false,
		sourcemap: true,
		rollupOptions: {
			external: [/^node:/, /^bun:/],
		},
	},

	// Optimize deps configuration
	optimizeDeps: {
		// Disable optimization to prevent ESBuild usage
		disabled: true,
	},
});
