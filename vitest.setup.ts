import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, vi } from 'vitest'

// Store original environment
const originalEnv = { ...process.env }

// Test server for API integration tests
let testServer: ReturnType<typeof createServer> | null = null
let testServerUrl: string | null = null

// Global setup for integration tests
beforeEach(() => {
  // Set consistent test environment
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
  vi.stubEnv('GITHUB_CLIENT_ID', 'test-github-client-id')
  vi.stubEnv('GITHUB_CLIENT_SECRET', 'test-github-client-secret')
  vi.stubEnv('OPENAI_API_KEY', 'test-openai-api-key')
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-api-key')
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini-api-key')

  // Mock timers for consistent test timing
  vi.useFakeTimers()
})

// Cleanup after each test
afterEach(() => {
  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear all vitest mocks and timers
  vi.clearAllTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()

  // Clean up test server if exists
  if (testServer) {
    testServer.close()
    testServer = null
    testServerUrl = null
  }
})

// Mock Next.js App Router for integration tests
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

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: () => new Headers(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock Web APIs that might be used in integration tests
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
}))

// Mock database connection
vi.mock('@neondatabase/serverless', () => ({
  Pool: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
  Client: vi.fn(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
}))

// Mock Inngest client
vi.mock('inngest', () => ({
  Inngest: vi.fn(() => ({
    send: vi.fn(),
    createFunction: vi.fn(),
  })),
}))

// Mock external AI services
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    startChat: vi.fn(),
  })),
}))

// Utility function to create test server
export function createTestServer(handler: (req: any, res: any) => void) {
  if (testServer) {
    testServer.close()
  }

  testServer = createServer(handler)
  testServer.listen(0)

  const address = testServer.address() as AddressInfo
  testServerUrl = `http://localhost:${address.port}`

  return testServerUrl
}

// Helper to get current test server URL
export function getTestServerUrl() {
  return testServerUrl
}

// Helper functions for integration tests
export const integrationTestHelpers = {
  mockApiResponse: (url: string, response: any) => {
    vi.mocked(fetch).mockImplementation((requestUrl: string | URL) => {
      if (requestUrl.toString().includes(url)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
          status: 200,
        } as Response)
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      } as Response)
    })
  },

  mockApiError: (url: string, error: any, status = 500) => {
    vi.mocked(fetch).mockImplementation((requestUrl: string | URL) => {
      if (requestUrl.toString().includes(url)) {
        return Promise.resolve({
          ok: false,
          status,
          json: () => Promise.resolve(error),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response)
    })
  },

  waitForNextTick: () => new Promise((resolve) => process.nextTick(resolve)),

  advanceTimers: (ms: number) => {
    vi.advanceTimersByTime(ms)
    return integrationTestHelpers.waitForNextTick()
  },
}
