import { afterEach, beforeEach, vi } from 'vitest'

// Store original environment
const originalEnv = { ...process.env }

// Unit test specific cleanup
afterEach(() => {
  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear all vitest mocks and timers
  vi.clearAllTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Unit test specific setup
beforeEach(() => {
  // Set consistent test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('VITEST_POOL_ID', '1')

  // Reset modules
  vi.resetModules()
})

// Mock fetch for unit tests
global.fetch = vi.fn()

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid'),
    getRandomValues: vi.fn(),
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

// Mock console methods for cleaner test output
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterEach(() => {
  console.error = originalError
  console.warn = originalWarn
})