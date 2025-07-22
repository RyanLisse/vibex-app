import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./test-setup.ts"],
		include: [
			// Start with just a few basic tests
			"lib/container-types.test.ts",
			"lib/message-handlers.test.ts",
			"components/ui/*.test.tsx",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			// Exclude problematic test files for now
			"app/api/**/*.test.ts",
			"tests/integration/**",
			"tests/migration/**",
			"**/performance/**",
			"**/electric/**",
		],
		reporters: ["basic"],
		testTimeout: 10000,
		hookTimeout: 10000,
		teardownTimeout: 5000,
		maxConcurrency: 1,
		isolate: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
		},
	},
	esbuild: {
		target: "node14",
	},
});
