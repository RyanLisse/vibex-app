import path from "node:path";
import { defineConfig } from "vitest/config";

// Browser tests configuration - for E2E and browser-specific testing
export default defineConfig({
	test: {
		name: "browser",
		environment: "node", // Node environment for test runner, browser testing handled by Playwright
		globals: true,
		setupFiles: ["./tests/setup/browser.ts"],
		include: [
			"tests/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"**/coverage/**",
			"**/components/**/*.{test,spec}.*",
			"**/lib/**/*.{test,spec}.*",
			"**/utils/**/*.{test,spec}.*",
			"**/src/schemas/**/*.{test,spec}.*",
			"**/app/**/*.{test,spec}.*",
			"**/*.integration.{test,spec}.*",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage/browser",
			exclude: [
				"coverage/**",
				"dist/**",
				"**/node_modules/**",
				"**/test*/**",
				"**/*.d.ts",
				"**/*.config.*",
				"**/cypress/**",
				"**/*.test.*",
				"**/*.spec.*",
			],
		},
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true, // Browser tests should run sequentially
				isolate: true,
			},
		},
		testTimeout: 60000, // Browser tests need more time
		hookTimeout: 30000,
		sequence: {
			concurrent: false, // Browser tests should not run concurrently
		},
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
		},
	},
	define: {
		"import.meta.vitest": false,
	},
});
