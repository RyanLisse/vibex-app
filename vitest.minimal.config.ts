import { defineConfig } from "vitest/config";

/**
 * Minimal Vitest Configuration
 * 
 * This is the most basic possible Vitest configuration to test
 * if the hanging issue is caused by our configuration complexity.
 */
export default defineConfig({
	test: {
		// Minimal configuration
		globals: false,
		environment: "node",
		// Short timeouts to fail fast if hanging
		testTimeout: 5000,
		hookTimeout: 5000,
		teardownTimeout: 2000,
		// Disable features that might cause hanging
		watch: false,
		coverage: {
			enabled: false,
		},
		// Minimal pool configuration
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
				isolate: false,
			},
		},
		// No setup files
		setupFiles: [],
		// Minimal file matching
		include: ["minimal-test.js"],
		exclude: ["node_modules/**", ".next/**", "dist/**"],
	},
});
