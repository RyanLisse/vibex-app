import { vi } from 'vitest'

// Mock database modules before any other imports
vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => {
    // Create a mock SQL function that handles basic queries
    const mockSql = vi.fn().mockImplementation(async (query: any) => {
      // Handle template literal calls
      if (Array.isArray(query) && query[0] === 'SELECT 1') {
        return [{ '?column?': 1 }]
      }
      return []
    })

    // Add additional properties/methods as needed
    Object.assign(mockSql, {
      begin: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    })

    return mockSql
  }),
}))

// Mock drizzle-orm
vi.mock('drizzle-orm/neon-serverless', () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  })),
}))

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

// Store original environment
const originalEnv = { ...process.env }

// Integration test specific cleanup
afterEach(() => {
  // Cleanup React components
  cleanup()

  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear mocks but preserve some for integration testing
  vi.clearAllTimers()
  vi.clearAllMocks()

  // Reset DOM state (only if document exists)
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  }
})

// Integration test specific setup
beforeEach(() => {
  // Set test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VITEST_POOL_ID', '1')

  // Set up test database URL if needed
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')

  // Set up test API URLs
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
  vi.stubEnv('INNGEST_SIGNING_KEY', 'test-key')
  vi.stubEnv('INNGEST_EVENT_KEY', 'test-event-key')
})

// Mock Next.js navigation with more realistic behavior
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn().mockImplementation((url) => {
      console.log('Router push:', url)
      return Promise.resolve()
    }),
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

// Mock Next.js Image with better implementation
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, width, height, ...props }) => {
    // Return a mock element representation instead of JSX
    return {
      type: 'img',
      props: {
        ...props,
        src,
        alt,
        width,
        height,
        style: {
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        },
      },
    }
  }),
}))

// Mock browser APIs with more realistic implementations
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '0px',
  thresholds: [],
  takeRecords: vi.fn().mockReturnValue([]),
}))

global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia for Node.js environment (only if window exists)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 768px') ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock localStorage with persistence
const localStorageData: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach((key) => delete localStorageData[key])
  }),
  length: 0,
  key: vi.fn(),
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
}

// Mock sessionStorage with persistence
const sessionStorageData: Record<string, string> = {}
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageData[key]
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStorageData).forEach((key) => delete sessionStorageData[key])
  }),
  length: 0,
  key: vi.fn(),
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })
}

// Mock fetch with more realistic behavior
global.fetch = vi.fn().mockImplementation(async (url, options) => {
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

// Mock crypto with better implementations
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

// Mock WebSocket with event simulation
global.WebSocket = vi.fn().mockImplementation((url) => {
  const ws = {
    url,
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  }

  // Simulate connection
  setTimeout(() => {
    if (ws.onopen) ws.onopen(new Event('open'))
  }, 100)

  return ws
})

// Mock performance with realistic timing
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

// Mock console with selective filtering
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = vi.fn((message) => {
    // Only suppress expected test errors
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || message.includes('Error:'))
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
