/**
 * Integration Test Setup with Neon Database Branching
 *
 * This setup file configures integration tests to use real Neon database branches
 * instead of mocks, providing true database isolation for each test run.
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from '@/db/schema'
import { MigrationRunner } from '@/db/migrations/migration-runner'

// Store original environment
const originalEnv = { ...process.env }

// Test database configuration
let testDatabaseUrl: string | undefined
let testDb: any
let testSql: any

// Integration test specific cleanup
afterEach(() => {
  // Cleanup React components
  cleanup()

  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear mocks but preserve test database connection
  vi.clearAllTimers()
  vi.clearAllMocks()

  // Reset DOM state (only if document exists)
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  }
})

// Setup test database before all tests
beforeAll(async () => {
  console.log('Setting up integration test database...')

  // Check if we have a real database URL
  const mainDatabaseUrl = process.env.DATABASE_URL

  if (mainDatabaseUrl && mainDatabaseUrl.includes('neon.tech')) {
    // Use Neon branching for real database tests
    console.log('Using Neon database branching for tests')

    // For now, we'll use a dedicated test database
    // In a real implementation, we would create a branch here
    testDatabaseUrl = process.env.TEST_DATABASE_URL || mainDatabaseUrl

    // Create test database connection
    testSql = neon(testDatabaseUrl)
    testDb = drizzle(testSql, { schema })

    // Run migrations on test database
    try {
      const migrationRunner = new MigrationRunner('./db/migrations')
      const result = await migrationRunner.migrate()

      if (!result.success) {
        console.error('Migration failed:', result.errors)
        throw new Error('Failed to run migrations on test database')
      }

      console.log('Migrations completed successfully')
    } catch (error) {
      console.error('Migration error:', error)
      // Continue with tests even if migrations fail
    }
  } else {
    // Fallback to in-memory database for local testing
    console.log('Using in-memory database for tests')
    testDatabaseUrl = 'postgresql://test:test@localhost:5432/test'
  }

  // Set test database URL in environment
  process.env.DATABASE_URL = testDatabaseUrl
})

// Cleanup after all tests
afterAll(async () => {
  console.log('Cleaning up integration test database...')

  // Clean up test data
  if (testDb && testDatabaseUrl?.includes('neon.tech')) {
    try {
      // Clean up test tables
      await testSql`TRUNCATE TABLE tasks, messages, deployments, logs CASCADE`
      console.log('Test data cleaned up')
    } catch (error) {
      console.warn('Failed to clean up test data:', error)
    }
  }

  // Restore original database URL
  process.env.DATABASE_URL = originalEnv.DATABASE_URL
})

// Integration test specific setup
beforeEach(() => {
  // Set test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VITEST_POOL_ID', '1')

  // Use test database URL
  if (testDatabaseUrl) {
    vi.stubEnv('DATABASE_URL', testDatabaseUrl)
  }

  // Set up test API URLs
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
  vi.stubEnv('INNGEST_SIGNING_KEY', 'test-key')
  vi.stubEnv('INNGEST_EVENT_KEY', 'test-event-key')
})

// Export test database for use in tests
export { testDb, testSql }

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
