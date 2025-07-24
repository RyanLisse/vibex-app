import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.working';

/**
 * API and Route Testing Configuration
 * 
 * Optimized for Next.js API routes and server-side code
 */
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			name: "api",
			environment: "node",
			include: [
				"app/api/**/*.test.{ts,tsx}",
				"app/api/**/*.spec.{ts,tsx}",
				"app/actions/**/*.test.{ts,tsx}",
				"app/actions/**/*.spec.{ts,tsx}",
			],
			exclude: [
				...baseConfig.test.exclude,
				"**/*.integration.*",
				"**/*.e2e.*",
			],
			// API-specific setup
			setupFiles: ["./test-utils/api-setup.ts"],
			// Environment variables for API tests
			env: {
				NODE_ENV: "test",
				NEXT_PUBLIC_APP_URL: "http://localhost:3000",
				DATABASE_URL: "postgresql://test:test@localhost:5432/test",
			},
			// Server configuration for API tests
			server: {
				deps: {
					inline: [
						// Next.js specific
						"next",
						"next/server",
						"next/headers",
						"next/navigation",
						// Auth libraries
						"@auth/core",
						"next-auth",
						// API utilities
						"zod",
						"axios",
					],
					external: [
						...baseConfig.test.server.deps.external,
						// Database drivers
						"pg",
						"@neondatabase/serverless",
						"better-sqlite3",
					],
				}
			},
		},
	})
);