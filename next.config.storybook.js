/** @type {import('next').NextConfig} */
const nextConfig = {
	// Minimal Next.js configuration for Storybook compatibility
	reactStrictMode: true,

	// Disable experimental features that might conflict with Storybook
	experimental: {},

	// Minimal webpack configuration for Storybook
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Simplified fallback configuration
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			};
		}
		return config;
	},

	// Disable image optimization for Storybook
	images: {
		unoptimized: true,
	},

	// Disable API routes in Storybook context
	async rewrites() {
		return [];
	},

	// Disable headers that might interfere with Storybook
	async headers() {
		return [];
	},
};

module.exports = nextConfig;
