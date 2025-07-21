import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests configuration - for utilities, services, and business logic
export default defineConfig({
	test: {
		name: "unit",
		environment: "node",
		globals: true,
		setupFiles: ["./tests/setup/unit.ts"],
		include: [
			"lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"utils/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/schemas/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"src/hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"**/coverage/**",
			"**/e2e/**",
			"**/integration/**",
			"**/*.integration.{test,spec}.*",
			"**/*.e2e.{test,spec}.*",
			"**/*.browser.{test,spec}.*",
			"**/components/**/*.{test,spec}.*",
			"**/app/**/*.{test,spec}.*",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage/unit",
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
				singleThread: false,
				isolate: true,
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
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
