import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Store original environment
const originalEnv = { ...process.env }

// Simple cleanup after each test
afterEach(() => {
  // Cleanup React components
  cleanup()

  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear all vitest mocks and timers
  vi.clearAllTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Global test configuration
beforeEach(() => {
  // Set consistent test environment
  vi.stubEnv('NODE_ENV', 'test')

  // Reset document state
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (_props: any) => {
    return 'img'
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '0px',
  thresholds: [],
  takeRecords: vi.fn().mockReturnValue([]),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
