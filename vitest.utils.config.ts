import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.working';

/**
 * Utility and Logic Testing Configuration
 * 
 * Optimized for pure logic tests with node environment
 */
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			name: "utils",
			environment: "node",
			include: [
				"lib/**/*.test.{ts,tsx}",
				"lib/**/*.spec.{ts,tsx}",
				"utils/**/*.test.{ts,tsx}",
				"utils/**/*.spec.{ts,tsx}",
				"hooks/**/*.test.{ts,tsx}",
				"hooks/**/*.spec.{ts,tsx}",
				"db/**/*.test.{ts,tsx}",
				"db/**/*.spec.{ts,tsx}",
			],
			exclude: [
				...baseConfig.test.exclude,
				"**/*.integration.*",
				"**/*.e2e.*",
				// Exclude component-related tests
				"**/*.component.*",
				"**/*.ui.*",
			],
			// Minimal setup for utils
			setupFiles: ["./test-utils/utils-setup.ts"],
			// Node environment options
			environmentOptions: undefined,
			// Can use more workers for pure logic tests
			maxWorkers: 2,
			maxConcurrency: 2,
			// Enable isolation for better test independence
			isolate: true,
			poolOptions: {
				forks: {
					singleFork: false,
					isolate: true,
				}
			},
		},
	})
);