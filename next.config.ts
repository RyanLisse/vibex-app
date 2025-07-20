import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
      }
    }

    // Ignore OpenTelemetry instrumentation warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve '@opentelemetry\/winston-transport'/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
    ]

    return config
  },
}

export default nextConfig
