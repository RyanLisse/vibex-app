import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Bundle analyzer for performance optimization
const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
	// Enable React strict mode for better development experience
	reactStrictMode: true,

	// Performance optimizations
	compiler: {
		removeConsole:
			process.env.NODE_ENV === "production"
				? {
						exclude: ["error", "warn"],
					}
				: false,
	},

	// Experimental performance features
	experimental: {
		optimizeCss: true,
		optimizePackageImports: [
			"@radix-ui/react-icons",
			"lucide-react",
			"@tanstack/react-query",
		],
	},

	// Bundle splitting configuration
	webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
		// Existing webpack config
		if (!isServer) {
			// Performance optimizations for client bundles
			config.optimization = {
				...config.optimization,
				splitChunks: {
					...config.optimization.splitChunks,
					chunks: "all",
					cacheGroups: {
						...config.optimization.splitChunks?.cacheGroups,
						vendor: {
							test: /[\\/]node_modules[\\/]/,
							name: "vendors",
							chunks: "all",
							enforce: true,
							priority: 20,
						},
						react: {
							test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
							name: "react",
							chunks: "all",
							enforce: true,
							priority: 30,
						},
						ui: {
							test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
							name: "ui",
							chunks: "all",
							enforce: true,
							priority: 25,
						},
					},
				},
			};
		}

		// Original Node.js fallback configuration
		if (!isServer) {
			// Exclude Node.js modules from client-side bundles
			config.resolve.fallback = {
				...config.resolve.fallback,
				dns: false,
				net: false,
				tls: false,
				fs: false,
				path: false,
				os: false,
				crypto: false,
				stream: false,
				util: false,
				url: false,
				querystring: false,
				http: false,
				https: false,
				zlib: false,
				buffer: false,
				events: false,
				assert: false,
				constants: false,
				child_process: false,
				cluster: false,
				dgram: false,
				module: false,
				perf_hooks: false,
				readline: false,
				repl: false,
				string_decoder: false,
				sys: false,
				timers: false,
				tty: false,
				v8: false,
				vm: false,
				worker_threads: false,
				// Additional browser incompatible modules
				punycode: false,
				domain: false,
				"node:crypto": false,
				"node:fs": false,
				"node:path": false,
				"node:os": false,
				"node:util": false,
				"node:events": false,
				"node:stream": false,
				"node:buffer": false,
				"node:url": false,
				"node:querystring": false,
				"node:http": false,
				"node:https": false,
				"node:zlib": false,
			};

			// Comprehensive server-side package externalization
			config.externals = config.externals || [];
			config.externals.push({
				// Database packages
				ioredis: "ioredis",
				redis: "redis",
				"@redis/client": "@redis/client",
				"@neondatabase/serverless": "@neondatabase/serverless",
				"drizzle-orm": "drizzle-orm",
				"@electric-sql/client": "@electric-sql/client",
				"@electric-sql/pglite": "@electric-sql/pglite",
				// Node.js specific packages
				winston: "winston",
				"winston-daily-rotate-file": "winston-daily-rotate-file",
				inngest: "inngest",
				"inngest-cli": "inngest-cli",
				nodemailer: "nodemailer",
				"prom-client": "prom-client",
				// Testing packages
				vitest: "vitest",
				bun: "bun",
				"@playwright/test": "@playwright/test",
				// WASM modules
				"wa-sqlite": "wa-sqlite",
			});
		}
		return config;
	},

	// Image optimization configuration
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},

	// Environment variables that should be available on the client
	env: {
		NEXT_PUBLIC_APP_URL:
			process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
	},

	// Headers for security and CORS
	async headers() {
		return [
			{
				source: "/api/:path*",
				headers: [
					{ key: "Access-Control-Allow-Credentials", value: "true" },
					{ key: "Access-Control-Allow-Origin", value: "*" },
					{
						key: "Access-Control-Allow-Methods",
						value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
					},
					{
						key: "Access-Control-Allow-Headers",
						value:
							"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
					},
				],
			},
		];
	},
};

// Wrap the config with Sentry
export default withSentryConfig(nextConfig, {
	// For all available options, see:
	// https://github.com/getsentry/sentry-webpack-plugin#options

	org: "ryan-lisse-bv",
	project: "vibex-app-web",

	// Only print logs for uploading source maps in CI
	silent: !process.env.CI,

	// For all available options, see:
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

	// Upload a larger set of source maps for prettier stack traces (increases build time)
	widenClientFileUpload: true,

	// Automatically annotate React components to show their full name in breadcrumbs and session replay
	reactComponentAnnotation: {
		enabled: true,
	},

	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
	// This can increase your server load as well as your hosting bill.
	// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
	// side errors will fail.
	tunnelRoute: "/monitoring",

	// Hides source maps from generated client bundles
	hideSourceMaps: true,

	// Automatically tree-shake Sentry logger statements to reduce bundle size
	disableLogger: true,

	// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
	// See the following for more information:
	// https://docs.sentry.io/product/crons/
	// https://vercel.com/docs/cron-jobs
	automaticVercelMonitors: true,
});
