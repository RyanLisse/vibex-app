import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Final Vitest Configuration for Bun Compatibility
 *
 * This configuration properly handles all mocking requirements
 */
export default defineConfig({
	plugins: [
		react({
			jsxRuntime: "automatic",
			fastRefresh: false,
		}),
		tsconfigPaths(),
	],

	test: {
		name: "vitest-final",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.mocks.ts", "./test-setup-simple.ts"],

		include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],

		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/*.config.*",
			"**/scripts/**",
		],

		// Simple pool configuration
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: false,
				isolate: true,
			},
		},

		// Server configuration
		server: {
			deps: {
				inline: [
					// Inline all mocked modules for proper resolution
					/^(?!.*node_modules).*$/,
				],
				external: [
					// Only external native modules
					/^node:/,
					/^bun:/,
				],
			},
		},

		// Environment options
		environmentOptions: {
			jsdom: {
				url: "http://localhost:3000",
				resources: "usable",
				pretendToBeVisual: true,
			},
		},

		// Timeouts
		testTimeout: 30000,
		hookTimeout: 30000,

		// Reporter
		reporters: ["default"],

		// Disable coverage and typecheck
		coverage: {
			enabled: false,
		},
		typecheck: {
			enabled: false,
		},

		// CSS handling
		css: {
			modules: {
				classNameStrategy: "non-scoped",
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
		extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
	},

	// Define globals
	define: {
		"import.meta.vitest": false,
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
		"process.env.NEXT_PUBLIC_APP_URL": JSON.stringify("http://localhost:3000"),
	},

	// ESBuild configuration
	esbuild: {
		target: "es2022",
		format: "esm",
		jsx: "automatic",
		jsxDev: false,
		minify: false,
		keepNames: true,
	},

	// Build configuration
	build: {
		target: "es2022",
		minify: false,
		sourcemap: true,
	},

	// Optimization
	optimizeDeps: {
		include: [
			"react",
			"react-dom",
			"@testing-library/react",
			"@testing-library/dom",
			"@testing-library/user-event",
		],
		exclude: ["bun"],
		esbuildOptions: {
			target: "es2022",
		},
	},
});
