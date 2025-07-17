import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Conditionally load Storybook plugin if available
const getStorybookPlugin = () => {
  try {
    const { storybookTest } = require('@storybook/addon-vitest/vitest-plugin')
    return storybookTest({
      configDir: resolve(__dirname, '.storybook'),
      storybookScript: 'npm run storybook -- --ci',
      storybookUrl: 'http://localhost:6006',
      tags: {
        include: ['test'],
        exclude: ['experimental', 'skip-test'],
      },
    })
  } catch {
    // Storybook Vitest plugin not available, continue without it
    console.log('📚 Storybook-Vitest integration available via separate test-storybook command')
    return null
  }
}

const storybookPlugin = getStorybookPlugin()
const plugins = [react()]
if (storybookPlugin) plugins.push(storybookPlugin)

export default defineConfig({
  plugins,
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types.ts',
        '**/.storybook/**',
        '**/storybook-static/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/components': resolve(__dirname, './components'),
      '@/app': resolve(__dirname, './app'),
      '@/lib': resolve(__dirname, './lib'),
      '@/hooks': resolve(__dirname, './hooks'),
      '@/stores': resolve(__dirname, './stores'),
    },
  },
})
