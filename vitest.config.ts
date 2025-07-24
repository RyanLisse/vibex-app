import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Bulletproof Vitest Configuration
 * 
 * This configuration is designed to work reliably with Bun and avoid hanging issues.
 * Key principles:
 * - Minimal complexity
 * - Proper module resolution
 * - Correct environment setup
 * - Avoid problematic features
 */
export default defineConfig({
	plugins: [
		// React plugin with minimal configuration
		react({
			// Use automatic JSX runtime (no need for React imports)
			jsxRuntime: 'automatic',
			// Minimal babel config
			babel: {
				parserOpts: {
					plugins: ['jsx', 'typescript']
				},
				// Disable babel caching to avoid issues
				babelrc: false,
				configFile: false,
			}
		}),
	],

	test: {
		// Test framework configuration
		globals: true,
		environment: "jsdom",
		setupFiles: ["./test-setup-simple.ts"],

		// File patterns
		include: [
			"**/*.test.{ts,tsx}",
			"**/*.spec.{ts,tsx}",
		],
		
		// Mock modules that cause issues
		deps: {
			registerNodeLoader: true,
			interopDefault: true,
			moduleDirectories: ['node_modules', 'test-utils'],
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
			"**/*.e2e.*",
			"**/e2e/**",
			"**/*.integration.*",
			"**/scripts/**",
			"**/tests/e2e/**",
		],

		// Pool configuration - use forks for stability
		pool: "forks",
		poolOptions: {
			forks: {
				// Single fork to avoid concurrency issues
				singleFork: true,
				// Minimal isolation
				isolate: false,
				// No special exec arguments
				execArgv: [],
			}
		},

		// Disable concurrency
		maxConcurrency: 1,
		maxWorkers: 1,
		
		// Disable file parallelism
		fileParallelism: false,
		
		// Sequential execution
		sequence: {
			concurrent: false,
		},

		// Server configuration
		server: {
			deps: {
				// Inline all dependencies except Node built-ins
				inline: [
					// React and related packages
					"react",
					"react-dom",
					"@testing-library/react",
					"@testing-library/dom",
					"@testing-library/jest-dom",
					"@testing-library/user-event",
					// UI components
					"@radix-ui/*",
					"class-variance-authority",
					"clsx",
					"tailwind-merge",
					// Other common deps
					"framer-motion",
					"lucide-react",
					"zustand",
				],
				// External Node built-ins and Bun modules
				external: [
					/^node:/,
					/^bun:/,
					"fs",
					"path",
					"crypto",
					"stream",
					"util",
					"events",
					"buffer",
					"process",
					"child_process",
					"worker_threads",
					"os",
					"net",
					"tls",
					"http",
					"https",
					"zlib",
					"vm",
					"v8",
					"perf_hooks",
				],
				// Fallback to node for CJS modules
				fallbackCJS: true,
			}
		},

		// CSS handling
		css: {
			// Process CSS modules
			modules: {
				classNameStrategy: 'stable'
			}
		},

		// Environment options
		environmentOptions: {
			jsdom: {
				url: "http://localhost:3000",
				resources: "usable",
			}
		},

		// Timeouts
		testTimeout: 30000,
		hookTimeout: 30000,
		teardownTimeout: 10000,

		// Coverage disabled by default (can be enabled with --coverage)
		coverage: {
			enabled: false,
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'coverage/**',
				'dist/**',
				'**/[.]**',
				'packages/*/test?(s)/**',
				'**/*.d.ts',
				'**/virtual:*',
				'**/__x00__*',
				'**/\x00*',
				'cypress/**',
				'test?(s)/**',
				'test?(-*).?(c|m)[jt]s?(x)',
				'**/*{.,-}{test,spec,bench,benchmark}?(-d).?(c|m)[jt]s?(x)',
				'**/__tests__/**',
				'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
				'**/vitest.{workspace,projects}.[jt]s?(on)',
				'**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}',
			],
		},

		// Type checking disabled
		typecheck: {
			enabled: false,
		},

		// Threading disabled
		threads: false,
		
		// Isolation disabled
		isolate: false,

		// Reporter
		reporters: process.env.CI ? ['default', 'json'] : ['default'],
		outputFile: process.env.CI ? 'test-results.json' : undefined,
		
		// Mock configuration
		mockReset: true,
		clearMocks: true,
		restoreMocks: true,

		// Watch mode disabled by default
		watch: false,
		watchExclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],

		// API disabled
		api: false,
		
		// Browser mode disabled
		browser: {
			enabled: false,
		},

		// Retry configuration
		retry: process.env.CI ? 2 : 0,

		// Bail on first failure in CI
		bail: process.env.CI ? 1 : 0,
	},

	// Module resolution
	resolve: {
		alias: {
			// Main aliases
			"@": path.resolve(__dirname, "."),
			"@/lib": path.resolve(__dirname, "lib"),
			"@/components": path.resolve(__dirname, "components"),
			"@/app": path.resolve(__dirname, "app"),
			"@/utils": path.resolve(__dirname, "utils"),
			"@/hooks": path.resolve(__dirname, "hooks"),
			"@/src": path.resolve(__dirname, "src"),
			"@/types": path.resolve(__dirname, "types"),
			"@/db": path.resolve(__dirname, "db"),
			// Test utilities
			"@/test-utils": path.resolve(__dirname, "test-utils"),
		},
		// Extensions to try when resolving modules
		extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
		// Main fields to check in package.json
		mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
		// Conditions for exports field
		conditions: ['import', 'module', 'browser', 'default'],
	},

	// Define global constants
	define: {
		'process.env.NODE_ENV': JSON.stringify('test'),
		'process.env.VITEST': JSON.stringify('true'),
		'global': 'globalThis',
	},

	// ESBuild configuration
	esbuild: {
		// Use automatic JSX transform
		jsx: 'automatic',
		jsxDev: false,
		// Target modern JavaScript
		target: 'esnext',
		// Don't minify in tests
		minify: false,
		// Keep names for better debugging
		keepNames: true,
		// Source maps for debugging
		sourcemap: true,
	},

	// Optimization settings
	optimizeDeps: {
		// Include commonly used dependencies
		include: [
			'react',
			'react-dom',
			'react/jsx-runtime',
			'react/jsx-dev-runtime',
			'@testing-library/react',
			'@testing-library/dom',
			'@testing-library/jest-dom',
		],
		// Exclude problematic packages
		exclude: [
			'@neondatabase/serverless',
			'@electric-sql/client',
			'@electric-sql/pglite',
			'better-sqlite3',
			'wa-sqlite',
			'inngest',
			'ws',
		],
		// ESBuild options for dependency optimization
		esbuildOptions: {
			target: 'esnext',
			jsx: 'automatic',
		},
		// Force optimization in test mode
		force: true,
	},

	// Build configuration
	build: {
		target: 'esnext',
		minify: false,
		sourcemap: true,
		// External packages that shouldn't be bundled
		rollupOptions: {
			external: [
				/node:.*/,
				/^bun:.*/,
			],
		},
	},

	// SSR configuration
	ssr: {
		// External all Node built-ins
		external: [
			'fs',
			'path',
			'crypto',
			'stream',
			'util',
			'events',
			'buffer',
			'process',
			'child_process',
			'worker_threads',
			'os',
			'net',
			'tls',
			'http',
			'https',
			'zlib',
			'vm',
			'v8',
			'perf_hooks',
		],
		// Don't external anything else
		noExternal: true,
		// Target Node environment
		target: 'node',
	},

	// Log level
	logLevel: process.env.CI ? 'error' : 'info',
	
	// Clear screen disabled in CI
	clearScreen: !process.env.CI,
});