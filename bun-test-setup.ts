/**
 * Bun Test Setup
 * Global test setup for Bun test runner (logic tests only)
 */

import { beforeEach, afterEach, mock } from 'bun:test'

// Store original environment for restoration
const originalEnv = { ...process.env }

// Simple cleanup after each test
afterEach(() => {
  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear all Bun mocks
  mock.restore()
})

// Global test configuration
beforeEach(() => {
  // Set consistent test environment
  process.env.NODE_ENV = 'test'
  process.env.VITEST_POOL_ID = '1'

  // Set test-specific environment variables
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.INNGEST_SIGNING_KEY = 'test-key'
  process.env.INNGEST_EVENT_KEY = 'test-event-key'
})

// Mock Next.js router for Bun tests
mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: mock(() => Promise.resolve()),
    back: mock(),
    forward: mock(),
    refresh: mock(),
    replace: mock(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: mock(),
  redirect: mock(),
}))

// Mock Next.js Image component
mock.module('next/image', () => ({
  default: mock(({ src, alt, ...props }) => ({
    type: 'img',
    props: { ...props, src, alt },
  })),
}))

// Mock crypto with proper implementation for Node.js environment
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: mock(() => `test-uuid-${Date.now()}`),
      getRandomValues: mock((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }),
      subtle: {
        digest: mock(),
        importKey: mock(),
        exportKey: mock(),
        generateKey: mock(),
        deriveKey: mock(),
        deriveBits: mock(),
        encrypt: mock(),
        decrypt: mock(),
        sign: mock(),
        verify: mock(),
      },
    },
  })
}

// Mock fetch for Bun tests
if (!globalThis.fetch) {
  globalThis.fetch = mock(async (url, options) => {
    const response = {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => 'OK',
      headers: new Headers(),
      url: url as string,
    }

    // Handle different API endpoints
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
}

// Mock WebSocket API
if (!globalThis.WebSocket) {
  globalThis.WebSocket = class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    CONNECTING = 0
    OPEN = 1
    CLOSING = 2
    CLOSED = 3

    readyState = 1
    addEventListener = mock()
    removeEventListener = mock()
    send = mock()
    close = mock()
  }
}

// Mock performance API
if (!globalThis.performance) {
  Object.defineProperty(globalThis, 'performance', {
    value: {
      now: mock(() => Date.now()),
      mark: mock(),
      measure: mock(),
      getEntriesByType: mock(() => []),
      getEntriesByName: mock(() => []),
      clearMarks: mock(),
      clearMeasures: mock(),
    },
  })
}

// Mock console methods to reduce noise in test output
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = mock((message) => {
    // Only suppress expected test errors
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || message.includes('Error:'))
    ) {
      return
    }
    originalError(message)
  })

  console.warn = mock((message) => {
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
