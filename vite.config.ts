import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Plugin order optimized for performance
    react({
      // Optimize React plugin for production builds
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: process.env.NODE_ENV === 'production' ? [] : undefined
      }
    }),
    tsconfigPaths({
      // Optimize path resolution performance
      root: ".",
      projects: ["./tsconfig.json"]
    })
  ],

  // Path resolution for vibex-app with browser compatibility
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/app": path.resolve(__dirname, "./app"),
      "@/hooks": path.resolve(__dirname, "./hooks"),
      "@/utils": path.resolve(__dirname, "./utils"),
      "@/types": path.resolve(__dirname, "./types"),
      "@/stores": path.resolve(__dirname, "./stores"),
      "@/src": path.resolve(__dirname, "./src"),
      "@/db": path.resolve(__dirname, "./db"),
      "@/tests": path.resolve(__dirname, "./tests")
    },
    fallback: {
      "querystring": false,
      "http": false,
      "https": false,
      "zlib": false,
      "net": false,
      "tls": false,
      "dns": false,
      "child_process": false,
      "cluster": false,
      "dgram": false,
      "module": false,
      "perf_hooks": false,
      "readline": false,
      "repl": false,
      "string_decoder": false,
      "sys": false,
      "timers": false,
      "tty": false,
      "v8": false,
      "vm": false,
      "worker_threads": false,
      // Node: prefixed imports
      "node:fs": false,
      "node:path": false,
      "node:crypto": false,
      "node:stream": false,
      "node:util": false,
      "node:os": false,
      "node:buffer": false,
      "node:events": false,
      "node:url": false,
      "node:querystring": false,
      "node:http": false,
      "node:https": false,
      "node:zlib": false
    }
  },

  // Enhanced dependency handling for browser compatibility
  optimizeDeps: {
    include: [
      // Core React dependencies - always include for browser
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      // UI libraries - browser compatible
      "framer-motion",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      // Testing libraries for browser environment
      "@testing-library/react",
      "@testing-library/jest-dom",
      "@testing-library/user-event",
      "vitest",
      "jsdom",
      // Common utilities - browser safe
      "clsx",
      "class-variance-authority",
      "tailwind-merge"
    ],
    exclude: [
      // Database packages - server only
      "@electric-sql/client",
      "@electric-sql/pglite", 
      "@neondatabase/serverless",
      "drizzle-orm",
      "ioredis",
      "redis",
      "@redis/client",
      // Server-side packages
      "inngest",
      "inngest-cli",
      "nodemailer",
      "winston",
      "winston-daily-rotate-file",
      "prom-client",
      // Browser automation - server only
      "@browserbasehq/sdk",
      "stagehand",
      "@playwright/test",
      // Bundler tools
      "@sentry/nextjs",
      "@next/bundle-analyzer",
      // Node.js runtime packages
      "bun",
      "bun:test",
      // WASM modules that cause browser issues
      "wa-sqlite"
    ],
    // Force optimization to prevent hanging
    force: false
  },

  // External dependencies - prevent bundling of server-only packages
  external: [
    // Database packages
    "ioredis",
    "redis", 
    "@redis/client",
    "@neondatabase/serverless",
    "drizzle-orm",
    "@electric-sql/client",
    "@electric-sql/pglite",
    // Node.js specific packages  
    "winston",
    "winston-daily-rotate-file",
    "inngest",
    "inngest-cli", 
    "nodemailer",
    "prom-client",
    // Testing packages (when not in test mode)
    ...(process.env.NODE_ENV !== 'test' ? [
      "vitest",
      "bun",
      "@playwright/test"
    ] : []),
    // WASM modules
    "wa-sqlite"
  ],

  // Production build configuration
  build: {
    target: "es2022",
    outDir: "dist",
    assetsDir: "assets",
    // Optimize build performance
    rollupOptions: {
      output: {
        // Optimize chunk splitting
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip'
          ],
          motion: ['framer-motion'],
          icons: ['lucide-react']
        }
      }
    },
    // Improve build performance
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600
  },

  // CRITICAL FIX: Disable ESBuild in test mode to prevent EPIPE errors
  esbuild: process.env.NODE_ENV === 'test' ? false : {
    target: "es2022",
    // Optimize for production
    minify: true,
    sourcemap: false,
    // Modern syntax support
    legalComments: 'none'
  },

  // Server configuration for development
  server: {
    port: 5173,
    host: true,
    open: false,
    // Enable HMR
    hmr: {
      overlay: true
    }
  },

  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    open: false
  },

  // Environment variables and browser globals for compatibility
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // Browser environment globals
    global: 'globalThis',
    'process.env.BROWSER': JSON.stringify(true),
    'process.browser': JSON.stringify(true),
    // Test environment detection
    'import.meta.vitest': process.env.NODE_ENV === 'test' ? 'true' : 'false',
    // Runtime environment flags
    'process.env.RUNTIME': JSON.stringify('browser'),
    'process.env.PLATFORM': JSON.stringify('web')
  }
})