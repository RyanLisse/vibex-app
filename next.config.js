/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@xyflow/react'],
  webpack: (config, { isServer, buildId, dev }) => {
    // Fix for missing modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        async_hooks: false,
        dns: false,
        stream: false,
        os: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        child_process: false,
      }
    }

    // Use stub logging during build to avoid Node.js API issues
    if (!dev && process.env.NODE_ENV === 'production') {
      const path = require('path')
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/logging/config': path.resolve('./lib/logging/stub.ts'),
        '@/lib/logging/correlation-id-manager': path.resolve('./lib/logging/stub.ts'),
        '@/lib/logging/logger-factory': path.resolve('./lib/logging/stub.ts'),
        '@/lib/logging': path.resolve('./lib/logging/stub.ts'),
      }
    }

    // Ignore certain warnings
    config.ignoreWarnings = [{ module: /node_modules/ }, { file: /node_modules/ }]

    return config
  },
  // Skip type checking during build (we'll do it separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Experimental: Skip static generation for API routes
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Skip building API routes during static generation
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Output configuration
  output: 'standalone',
}

module.exports = nextConfig
