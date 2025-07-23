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

  // Path resolution for vibex-app
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
    }
  },

  // Optimized dependency handling for vibex-app stack
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "framer-motion",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip"
    ],
    exclude: [
      "@electric-sql",
      "@neondatabase",
      "inngest",
      "ioredis",
      "@browserbasehq/sdk",
      "stagehand",
      "@sentry/nextjs"
    ],
    // Force optimization to prevent hanging
    force: false
  },

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

  // Enhanced ESBuild configuration
  esbuild: {
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

  // Environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})