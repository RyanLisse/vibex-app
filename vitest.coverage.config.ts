import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Coverage-Optimized Vitest Configuration
 * 
 * Specifically designed for achieving 100% test coverage
 * Lightweight configuration focused on coverage metrics
 */
export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	
	test: {
		name: "coverage-tests",
		environment: "happy-dom", // Fastest environment
		globals: true,
		setupFiles: ["./test-setup-minimal.ts"],
		
		// Include all test files for comprehensive coverage
		include: [
			"**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"!**/e2e/**",
			"!**/node_modules/**",
		],
		
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/e2e/**",
			"**/*.config.*",
		],
		
		// Optimized for coverage collection
		testTimeout: 10000,
		hookTimeout: 5000,
		maxConcurrency: 1, // Single thread for stability
		
		// Comprehensive coverage configuration
		coverage: {
			enabled: true,
			provider: "v8",
			reporter: ["text", "html", "lcov", "json", "text-summary"],
			reportsDirectory: "./coverage/comprehensive",
			
			// Include all source files
			include: [
				"lib/**/*.{js,ts,jsx,tsx}",
				"components/**/*.{js,ts,jsx,tsx}",
				"app/**/*.{js,ts,jsx,tsx}",
				"src/**/*.{js,ts,jsx,tsx}",
				"hooks/**/*.{js,ts,jsx,tsx}",
				"utils/**/*.{js,ts,jsx,tsx}",
			],
			
			// Minimal exclusions for accurate coverage
			exclude: [
				"**/*.d.ts",
				"**/*.test.*",
				"**/*.spec.*",
				"**/*.stories.*",
				"**/node_modules/**",
				"**/coverage/**",
				"**/.next/**",
				"**/dist/**",
				"**/*.config.*",
				"**/e2e/**",
				// Only exclude truly untestable files
				"**/instrumentation.ts",
				"**/middleware.ts",
			],
			
			// Aggressive coverage thresholds for 100% target
			thresholds: {
				global: {
					branches: 100,
					functions: 100,
					lines: 100,
					statements: 100,
				},
			},
			
			// Skip coverage for specific patterns that can't be tested
			skipFull: false,
		},
		
		// Enhanced reporting
		reporters: ["verbose", "json"],
		outputFile: {
			json: "./coverage/comprehensive/test-results.json"
		},
	},
	
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
	
	define: {
		"import.meta.vitest": false,
		global: "globalThis",
		"process.env.NODE_ENV": JSON.stringify("test"),
	},
});