import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Security headers configuration
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self';
  connect-src 'self' https://api.openai.com https://api.anthropic.com https://sentry.io https://*.sentry.io ws://localhost:* wss://localhost:*;
  media-src 'self';
  object-src 'none';
  frame-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const securityHeaders = [
	{
		key: "X-DNS-Prefetch-Control",
		value: "on",
	},
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{
		key: "X-Frame-Options",
		value: "SAMEORIGIN",
	},
	{
		key: "X-Content-Type-Options",
		value: "nosniff",
	},
	{
		key: "Referrer-Policy",
		value: "origin-when-cross-origin",
	},
	{
		key: "X-XSS-Protection",
		value: "1; mode=block",
	},
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=()",
	},
	{
		key: "Content-Security-Policy",
		value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
	},
];

const nextConfig: NextConfig = {
	// Enable production optimizations
	productionBrowserSourceMaps: false,
	poweredByHeader: false,

	// Security headers
	async headers() {
		return [
			{
				// Apply these headers to all routes
				source: "/:path*",
				headers: securityHeaders,
			},
			{
				// Additional headers for API routes
				source: "/api/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store, max-age=0",
					},
				],
			},
		];
	},

	// Performance optimizations
	experimental: {
		instrumentationHook: true,
		turbo: {
			rules: {
				// Custom Turbopack rules for better performance
			},
		},
		optimizePackageImports: [
			"lucide-react",
			"@radix-ui/react-*",
			"@tanstack/react-query",
			"recharts",
			"d3-force",
			"shiki",
			"@xyflow/react",
		],
		webVitalsAttribution: ["CLS", "LCP"],
	},

	// Image optimization
	images: {
		formats: ["image/webp", "image/avif"],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60,
	},

	// Bundle optimization
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},

	// Performance budgets
	onDemandEntries: {
		maxInactiveAge: 25 * 1000, // 25 seconds
		pagesBufferLength: 2,
	},
	webpack: (config, { isServer }) => {
		// Handle Node.js modules that shouldn't be bundled for client
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				dns: false,
				child_process: false,
				aws4: false,
				async_hooks: false,
				crypto: false,
				stream: false,
				util: false,
				buffer: false,
				os: false,
				path: false,
			};
		}

		// Ignore OpenTelemetry instrumentation warnings
		config.ignoreWarnings = [
			...(config.ignoreWarnings || []),
			/Critical dependency: the request of a dependency is an expression/,
			/Module not found: Can't resolve '@opentelemetry\/winston-transport'/,
			/Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
		];

		return config;
	},
};

// Check if Sentry is configured
const isSentryConfigured = !!(
	process.env.SENTRY_ORG &&
	process.env.SENTRY_PROJECT &&
	process.env.SENTRY_AUTH_TOKEN &&
	(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
);

// Export config with conditional Sentry wrapping
export default isSentryConfigured
	? withSentryConfig(nextConfig, {
			// For all available options, see:
			// https://github.com/getsentry/sentry-webpack-plugin#options

			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN,

			// Only print logs for uploading source maps in CI
			silent: !process.env.CI,

			// For all available options, see:
			// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

			// Upload a larger set of source maps for prettier stack traces (increases build time)
			widenClientFileUpload: true,

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
		})
	: nextConfig;
