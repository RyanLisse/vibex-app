/**
 * Simplified Integration Test Setup
 *
 * This setup provides a middle ground between full mocking and real database branching.
 * It uses conditional imports to avoid mocking when a real database is available.
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

// Store original environment
const originalEnv = { ...process.env }

// Check if we have a real database URL
const hasRealDatabase =
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL !== 'postgresql://test:test@localhost:5432/test' &&
  process.env.DATABASE_URL.includes('neon.tech')

// Only mock database modules if we don't have a real database
if (!hasRealDatabase) {
  // Mock @neondatabase/serverless
  vi.mock('@neondatabase/serverless', () => ({
    neon: vi.fn(() => {
      const mockSql = vi.fn().mockImplementation(async (query: any, ...params: any[]) => {
        if (Array.isArray(query)) {
          const queryStr = query[0]
          if (queryStr === 'SELECT 1') {
            return [{ '?column?': 1 }]
          }
          if (queryStr === 'SELECT 1 as value') {
            return [{ value: 1 }]
          }
          if (queryStr.includes('SELECT current_timestamp')) {
            return [{ now: new Date().toISOString() }]
          }
          if (queryStr === 'BEGIN' || queryStr === 'COMMIT' || queryStr === 'ROLLBACK') {
            return []
          }
          if (queryStr === 'ANALYZE') {
            return []
          }
        }

        if (typeof query === 'string') {
          if (
            query.includes('pg_indexes') ||
            query.includes('pg_tables') ||
            query.includes('pg_stat_') ||
            query.includes('pg_extension') ||
            query.includes('information_schema')
          ) {
            return []
          }
          if (
            query.toLowerCase().includes('create') ||
            query.toLowerCase().includes('drop') ||
            query.toLowerCase().includes('alter') ||
            query.toLowerCase().includes('vacuum') ||
            query.toLowerCase().includes('reindex')
          ) {
            return []
          }
        }

        return []
      })

      Object.setPrototypeOf(mockSql, Function.prototype)
      return mockSql
    }),
    neonConfig: {
      fetchConnectionCache: true,
    },
  }))

  // Mock drizzle-orm
  vi.mock('drizzle-orm/neon-serverless', () => ({
    drizzle: vi.fn(() => {
      const mockDb: any = {
        select: vi.fn(() => mockDb),
        where: vi.fn(() => mockDb),
        orderBy: vi.fn(() => mockDb),
        limit: vi.fn(() => mockDb),
        insert: vi.fn((table) => mockDb),
        values: vi.fn().mockImplementation(async () => {
          return { rowCount: 1 }
        }),
        update: vi.fn((table) => mockDb),
        set: vi.fn(() => mockDb),
        delete: vi.fn((table) => mockDb),
        execute: vi.fn().mockResolvedValue([]),
        from: vi.fn().mockImplementation((table: any) => {
          if (table?.name === 'migrations' || table?._?.name === 'migrations') {
            // Return empty array for migrations table queries
            const chainMock = {
              where: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              execute: vi.fn().mockResolvedValue([]),
              then: vi.fn().mockImplementation((resolve) => resolve([])),
            }
            return chainMock
          }
          return mockDb
        }),
        // Add promise-like behavior for direct awaiting
        then: vi.fn().mockImplementation((resolve) => resolve([])),
      }

      return mockDb
    }),
  }))

  // Mock drizzle-orm operators
  vi.mock('drizzle-orm', () => ({
    desc: vi.fn((column) => ({ type: 'desc', column })),
    asc: vi.fn((column) => ({ type: 'asc', column })),
    eq: vi.fn((a, b) => ({ type: 'eq', a, b })),
    ne: vi.fn((a, b) => ({ type: 'ne', a, b })),
    gt: vi.fn((a, b) => ({ type: 'gt', a, b })),
    gte: vi.fn((a, b) => ({ type: 'gte', a, b })),
    lt: vi.fn((a, b) => ({ type: 'lt', a, b })),
    lte: vi.fn((a, b) => ({ type: 'lte', a, b })),
    and: vi.fn((...conditions) => ({ type: 'and', conditions })),
    or: vi.fn((...conditions) => ({ type: 'or', conditions })),
    sql: vi.fn((strings, ...values) => ({ type: 'sql', strings, values })),
  }))

  // Mock migration runner with proper test data
  vi.mock('@/db/migrations/migration-runner', () => {
    const mockMigrationFiles = [
      {
        name: '001_create_test_table',
        checksum: 'a'.repeat(64),
        up: 'CREATE TABLE test_users',
        down: 'DROP TABLE IF EXISTS test_users',
      },
      {
        name: '002_add_user_settings',
        checksum: 'b'.repeat(64),
        up: 'CREATE TABLE test_user_settings',
        down: 'DROP TABLE IF EXISTS test_user_settings',
      },
      {
        name: '003_add_user_preferences',
        checksum: 'c'.repeat(64),
        up: 'ALTER TABLE test_users ADD COLUMN preferences',
        down: 'ALTER TABLE test_users DROP COLUMN preferences',
      },
      {
        name: '004_invalid_migration',
        checksum: 'd'.repeat(64),
        up: 'INVALID SQL',
        down: 'DROP TABLE IF EXISTS invalid_table',
      },
      {
        name: '005_dangerous_migration',
        checksum: 'e'.repeat(64),
        up: 'DROP TABLE test_users',
        down: '',
      },
    ]

    return {
      MigrationRunner: vi.fn().mockImplementation((path) => ({
        migrate: vi.fn().mockResolvedValue({
          success: true,
          executed: ['001_create_test_table', '002_add_user_settings', '003_add_user_preferences'],
          errors: [],
          warnings: [],
          executionTime: 100,
        }),
        rollback: vi.fn().mockResolvedValue({
          success: true,
          rolledBack: '003_add_user_preferences',
        }),
        getStatus: vi.fn().mockResolvedValue({
          executed: [],
          pending: ['001_create_test_table', '002_add_user_settings', '003_add_user_preferences'],
          total: 3,
        }),
        createMigration: vi.fn().mockImplementation(async (name) => {
          const timestamp = Date.now()
          return `/root/repo/tests/fixtures/migrations/${timestamp}_${name}.sql`
        }),
        validateSchema: vi.fn().mockResolvedValue({
          valid: true,
          issues: [],
          recommendations: [],
        }),
        getDatabaseStats: vi.fn().mockResolvedValue({
          tables: [
            { name: 'test_users', rowCount: 0, indexes: 2 },
            { name: 'test_user_settings', rowCount: 0, indexes: 1 },
          ],
          totalSize: '8 MB',
          connectionCount: 1,
          extensions: ['uuid-ossp', 'pgcrypto'],
        }),
        optimizeDatabase: vi.fn().mockResolvedValue({
          success: true,
          operations: ['Updated table statistics (ANALYZE)'],
        }),
        loadMigrationFiles: vi.fn().mockReturnValue(mockMigrationFiles),
        validateMigrations: vi.fn().mockResolvedValue({
          valid: false,
          errors: ['004_invalid_migration: syntax error'],
          warnings: ['005_dangerous_migration: contains DROP TABLE'],
        }),
      })),
      migrationRunner: {
        migrate: vi.fn().mockResolvedValue({
          success: true,
          executed: [],
          errors: [],
          warnings: [],
          executionTime: 100,
        }),
        rollback: vi.fn().mockResolvedValue({
          success: true,
          rolledBack: 'test-migration',
        }),
        getStatus: vi.fn().mockResolvedValue({
          executed: [],
          pending: [],
          total: 0,
        }),
      },
    }
  })

  // Mock database schema
  vi.mock('@/db/schema', () => ({
    migrations: { name: 'migrations' },
    tasks: {},
    messages: {},
    deployments: {},
    logs: {},
    users: {},
    accounts: {},
    sessions: {},
    verificationTokens: {},
    authenticators: {},
    aiChat: {},
    eventLogs: {},
    observabilityRuns: {},
    observabilityLogs: {},
    observabilityTraces: {},
  }))
}

// Integration test specific cleanup
afterEach(() => {
  cleanup()
  process.env = { ...originalEnv }
  vi.clearAllTimers()
  vi.clearAllMocks()

  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  }
})

// Setup test database before all tests
beforeAll(async () => {
  console.log(
    `Setting up integration tests with ${hasRealDatabase ? 'real database' : 'mocked database'}...`
  )

  if (hasRealDatabase) {
    // When using a real database, we can run actual migrations
    console.log('Using real Neon database for tests')

    // Import database modules dynamically to avoid mocking
    const { checkDatabaseHealth } = await import('@/db/config')
    const { MigrationRunner } = await import('@/db/migrations/migration-runner')

    try {
      const isHealthy = await checkDatabaseHealth()
      if (!isHealthy) {
        console.warn('Database health check failed, continuing with tests')
      }

      // Run migrations if needed
      const migrationRunner = new MigrationRunner('./db/migrations')
      const status = await migrationRunner.getStatus()

      if (status.pending.length > 0) {
        console.log(`Running ${status.pending.length} pending migrations...`)
        const result = await migrationRunner.migrate()

        if (!result.success) {
          console.error('Migration failed:', result.errors)
        } else {
          console.log('Migrations completed successfully')
        }
      }
    } catch (error) {
      console.error('Database setup error:', error)
    }
  }
})

// Cleanup after all tests
afterAll(async () => {
  console.log('Cleaning up integration tests...')

  if (hasRealDatabase) {
    try {
      // Clean up test data if using real database
      const { sql } = await import('@/db/config')

      // Only clean up test-specific tables
      await sql`DELETE FROM tasks WHERE id LIKE 'test-%'`
      await sql`DELETE FROM messages WHERE id LIKE 'test-%'`
      console.log('Test data cleaned up')
    } catch (error) {
      console.warn('Failed to clean up test data:', error)
    }
  }
})

// Integration test specific setup
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VITEST_POOL_ID', '1')

  // Set up test API URLs
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
  vi.stubEnv('INNGEST_SIGNING_KEY', 'test-key')
  vi.stubEnv('INNGEST_EVENT_KEY', 'test-event-key')
})

// Mock Next.js navigation
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

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, width, height, ...props }) => {
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

// Mock browser APIs
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

// Mock matchMedia
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

// Mock localStorage
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

// Mock sessionStorage
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

// Mock fetch
global.fetch = vi.fn().mockImplementation(async (url, options) => {
  const response = {
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => 'OK',
    headers: new Headers(),
    url: url as string,
  }

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

// Mock crypto
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

// Mock WebSocket
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

  setTimeout(() => {
    if (ws.onopen) ws.onopen(new Event('open'))
  }, 100)

  return ws
})

// Mock performance
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

// Mock console
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = vi.fn((message) => {
    if (
      typeof message === 'string' &&
      (message.includes('Warning:') || message.includes('Error:'))
    ) {
      return
    }
    originalError(message)
  })

  console.warn = vi.fn((message) => {
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
