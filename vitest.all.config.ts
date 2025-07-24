import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.working';

/**
 * All Tests Configuration
 * 
 * Runs all test types with appropriate environments
 */
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			name: "all-tests",
			// Include all test files
			include: [
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
			],
			// Environment matcher for different test types
			environmentMatchGlobs: [
				// Component tests use jsdom
				['components/**', 'jsdom'],
				['app/**/_components/**', 'jsdom'],
				['**/*.component.test.*', 'jsdom'],
				['**/*.ui.test.*', 'jsdom'],
				// API and server tests use node
				['app/api/**', 'node'],
				['app/actions/**', 'node'],
				['lib/**', 'node'],
				['utils/**', 'node'],
				['hooks/**', 'node'],
				['db/**', 'node'],
				// Default to jsdom for everything else
				['**', 'jsdom'],
			],
			// Combined setup files
			setupFiles: [
				"./test-setup-simple.ts",
				"./test-utils/all-setup.ts",
			],
		},
	})
);