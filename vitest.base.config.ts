import path from "node:path";
import type { UserConfig } from "vitest/config";

/**
 * Base Vitest configuration shared across all test types
 * This configuration provides common settings and optimizations
 */
export const baseConfig: UserConfig = {
	test: {
		globals: true,
		setupFiles: ["./test-setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportOnFailure: true,
			exclude: [
				"coverage/**",
				"dist/**",
				"**/node_modules/**",
				"**/test-setup.ts",
				"**/tests/setup/**",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"**/migrations/**",
				"**/*.test.*",
				"**/*.spec.*",
				"**/cypress/**",
				"**/e2e/**",
				"**/playwright/**",
				"**/storybook-static/**",
				"**/.storybook/**",
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
			},
		},
		// Performance optimizations
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				isolate: true,
				useAtomics: true,
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
		teardownTimeout: 5000,
		maxConcurrency: Math.min(8, Math.max(1, require("os").cpus().length - 1)),
		isolate: true,
		reporter: process.env.CI ? ["basic", "json"] : ["basic"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"@/lib": path.resolve(__dirname, "./lib"),
			"@/components": path.resolve(__dirname, "./components"),
			"@/app": path.resolve(__dirname, "./app"),
			"@/hooks": path.resolve(__dirname, "./hooks"),
			"@/utils": path.resolve(__dirname, "./utils"),
			"@/types": path.resolve(__dirname, "./types"),
			"@/stores": path.resolve(__dirname, "./stores"),
			"@/src": path.resolve(__dirname, "./src"),
			"@/db": path.resolve(__dirname, "./db"),
			"@/tests": path.resolve(__dirname, "./tests"),
		},
	},
	define: {
		"import.meta.vitest": false,
	},
	// Optimize for modern environments
	optimizeDeps: {
		include: [
			"vitest",
			"@testing-library/react",
			"@testing-library/jest-dom",
			"@testing-library/user-event",
			"react",
			"react-dom",
		],
		exclude: ["@electric-sql", "@neondatabase"],
	},
	build: {
		target: "es2022",
		minify: false,
		sourcemap: false,
	},
};

export default baseConfig;
