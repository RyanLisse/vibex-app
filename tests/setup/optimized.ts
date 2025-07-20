/**
 * Optimized test setup for maximum compatibility and reliability
 * This setup avoids complex mocking and focuses on essential test infrastructure
 */

import { vi } from 'vitest'

// Only set up essential global mocks to avoid conflicts
// Avoid complex window/DOM mocking that causes issues

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock fetch for HTTP-based tests
global.fetch = vi.fn()

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.OTEL_ENABLED = 'false' // Disable telemetry in tests

// Mock crypto for auth tests (minimal implementation)
if (!globalThis.crypto) {
  const mockCrypto = {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    }),
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
      importKey: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
    },
  }
  
  Object.defineProperty(globalThis, 'crypto', {
    value: mockCrypto,
    writable: true,
  })
}

// Mock btoa/atob for base64 encoding in tests
if (!globalThis.btoa) {
  globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
}

if (!globalThis.atob) {
  globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString('binary')
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})