/**
 * Global Vitest Setup
 * Global test setup for Vitest with jest-dom matchers and testing library integration
 * Used by both component and integration tests
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Store original environment for restoration
const originalEnv = { ...process.env }

// Global cleanup after each test
afterEach(() => {
  // Cleanup React Testing Library
  cleanup()

  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear all vitest mocks and timers
  vi.clearAllTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()

  // Reset DOM state
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  }
})

// Global setup before each test
beforeEach(() => {
  // Set consistent test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VITEST_POOL_ID', '1')

  // Set test-specific environment variables
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
  vi.stubEnv('INNGEST_SIGNING_KEY', 'test-key')
  vi.stubEnv('INNGEST_EVENT_KEY', 'test-event-key')

  // Reset modules
  vi.resetModules()
})

// Mock Next.js router for all tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(() => Promise.resolve()),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: vi.fn(({ alt, ...props }) => {
    // Return a mock element representation for testing
    return { type: 'img', props: { ...props, alt } }
  }),
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: vi.fn(({ children, ...props }) => {
    // Return a mock element representation for testing
    return { type: 'a', props, children }
  }),
}))

// Mock browser APIs that may not be available in test environment
if (typeof global !== 'undefined') {
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
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock fetch for tests
  global.fetch = vi.fn((url, _options) => {
    const response = {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => 'OK',
      headers: new Headers(),
      url: url.toString(),
    }

    // Handle different API endpoints with realistic responses
    if (url.toString().includes('/api/auth/')) {
      return Promise.resolve({
        ...response,
        json: async () => ({ authenticated: true, user: { id: 'test-user' } }),
      })
    }

    if (url.toString().includes('/api/tasks/')) {
      return Promise.resolve({
        ...response,
        json: async () => ({ id: 'test-task', status: 'pending' }),
      })
    }

    return Promise.resolve(response)
  })

  // Mock crypto with proper implementation
  if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: vi.fn(() => `test-uuid-${Date.now()}`),
        getRandomValues: vi.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256)
          }
          return arr
        }),
        subtle: {
          digest: vi.fn(),
          importKey: vi.fn(),
          exportKey: vi.fn(),
          generateKey: vi.fn(),
          deriveKey: vi.fn(),
          deriveBits: vi.fn(),
          encrypt: vi.fn(),
          decrypt: vi.fn(),
          sign: vi.fn(),
          verify: vi.fn(),
        },
      },
    })
  }

  // Mock WebSocket API
  if (!global.WebSocket) {
    global.WebSocket = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    }))

    // WebSocket constants
    global.WebSocket.CONNECTING = 0
    global.WebSocket.OPEN = 1
    global.WebSocket.CLOSING = 2
    global.WebSocket.CLOSED = 3
  }

  // Mock performance API
  if (!global.performance) {
    Object.defineProperty(global, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByType: vi.fn(() => []),
        getEntriesByName: vi.fn(() => []),
        clearMarks: vi.fn(),
        clearMeasures: vi.fn(),
      },
    })
  }
}

// Mock window APIs if available
if (typeof window !== 'undefined') {
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })
}

// Mock console methods to reduce noise in test output
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = vi.fn((message) => {
    // Only suppress expected test errors
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || message.includes('ReactDOMTestUtils'))
    ) {
      return
    }
    originalError(message)
  })

  console.warn = vi.fn((message) => {
    // Only suppress expected test warnings
    if (typeof message === 'string' && message.includes('Warning:')) {
      return
    }
    originalWarn(message)
  })
})

afterEach(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Export useful testing utilities
export const createMockComponent = (name, props = {}) => ({
  type: name,
  props,
  children: [],
})

export const createMockEvent = (type, properties = {}) => ({
  type,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: { value: '' },
  ...properties,
})

export const waitForNextUpdate = () => new Promise((resolve) => setTimeout(resolve, 0))
