import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.working';

/**
 * Component Testing Configuration
 * 
 * Optimized for React component tests with jsdom environment
 */
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			name: "components",
			environment: "jsdom",
			include: [
				"components/**/*.test.{ts,tsx}",
				"components/**/*.spec.{ts,tsx}",
				"app/**/_components/**/*.test.{ts,tsx}",
				"app/**/_components/**/*.spec.{ts,tsx}",
			],
			exclude: [
				...baseConfig.test.exclude,
				"**/*.integration.*",
				"**/*.e2e.*",
			],
			// Component-specific setup
			setupFiles: ["./test-setup-simple.ts", "./test-utils/component-setup.ts"],
			// Shorter timeouts for component tests
			testTimeout: 10000,
			hookTimeout: 10000,
		},
	})
);