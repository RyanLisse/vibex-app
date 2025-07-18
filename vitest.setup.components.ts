import { afterEach, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Store original environment
const originalEnv = { ...process.env }

// Setup for component tests - NO FAKE TIMERS
beforeEach(() => {
  // Set consistent test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
  
  // Clear mocks but don't use fake timers
  vi.clearAllMocks()
})

// Cleanup after each test
afterEach(() => {
  // Restore environment variables
  process.env = { ...originalEnv }
  
  // Clear all vitest mocks
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Mock Next.js modules for component tests
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
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: () => new Headers(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
  }),
}))

// Mock fetch for component tests
global.fetch = vi.fn()

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))