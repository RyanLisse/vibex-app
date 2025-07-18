// Bun test configuration
import { afterEach, beforeEach, describe, expect, it, test } from 'bun:test'

// Setup DOM environment
import { GlobalRegistrator } from '@happy-dom/global-registrator'

// Register happy-dom globally
GlobalRegistrator.register()

// React Testing Library setup
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

// Store original environment
const originalEnv = { ...process.env }

// Setup file for Bun tests
beforeEach(() => {
  // Set consistent test environment
  process.env.NODE_ENV = 'test'

  // Reset document state
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  }
})

afterEach(() => {
  // Cleanup React components
  cleanup()

  // Restore environment variables
  process.env = { ...originalEnv }
})

// Mock Next.js router for Bun tests
import { mock } from 'bun:test'

mock.module('next/router', () => ({
  useRouter: () => ({
    push: mock(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
  }),
}))

mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: mock(),
    replace: mock(),
    back: mock(),
    forward: mock(),
    refresh: mock(),
    pathname: '/',
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock next/image
mock.module('next/image', () => ({
  default: (props: any) => 'img',
}))

// Mock browser APIs
if (typeof global !== 'undefined') {
  // Mock IntersectionObserver
  global.IntersectionObserver = mock(() => ({
    observe: mock(),
    unobserve: mock(),
    disconnect: mock(),
    root: null,
    rootMargin: '0px',
    thresholds: [],
    takeRecords: mock(() => []),
  }))

  // Mock ResizeObserver
  global.ResizeObserver = mock(() => ({
    observe: mock(),
    unobserve: mock(),
    disconnect: mock(),
  }))

  // Mock console methods for tests that expect them
  global.console = {
    ...console,
    log: mock(),
    warn: mock(),
    error: mock(),
  }
}

export { test, expect, describe, it, beforeEach, afterEach }
