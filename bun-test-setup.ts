/**
 * Bun Test Setup
 * Global test configuration for Bun's built-in test runner
 * For utility/logic tests only - NO React components
 */

import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test'
import { GlobalWindow } from 'happy-dom'

// Store original environment
const originalEnv = { ...process.env }

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'

  // Set up minimal DOM environment for utilities only
  setupMinimalDOMEnvironment()
})

// Clean up after each test
afterEach(() => {
  // Restore environment variables
  process.env = { ...originalEnv }

  // Clear minimal document state
  if (global.document) {
    global.document.body.innerHTML = ''
    global.document.head.innerHTML = ''
  }
})

// Global cleanup
afterAll(() => {
  // Cleanup complete
})

// Set up minimal DOM environment for utility tests only
function setupMinimalDOMEnvironment() {
  const window = new GlobalWindow()

  // Set up only essential DOM objects for utility functions
  global.window = window as unknown as Window & typeof globalThis
  global.document = window.document
  global.localStorage = window.localStorage
  global.sessionStorage = window.sessionStorage
  global.location = window.location
  global.navigator = window.navigator

  // Mock essential browser APIs for utilities
  setupUtilityAPIs()
}

// Mock essential browser APIs for utility functions only
function setupUtilityAPIs() {
  // Mock fetch if not available (for API utility tests)
  if (!global.fetch) {
    global.fetch = async () => new Response()
  }

  // Mock URL.createObjectURL for file utilities
  if (!global.window.URL.createObjectURL) {
    global.window.URL.createObjectURL = () => 'blob:test'
  }

  // Mock URL.revokeObjectURL for file utilities
  if (!global.window.URL.revokeObjectURL) {
    global.window.URL.revokeObjectURL = () => {
      // No-op for tests
    }
  }

  // Mock matchMedia for responsive utilities
  if (!global.window.matchMedia) {
    global.window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {
        // No-op for tests
      },
      removeListener: () => {
        // No-op for tests
      },
      addEventListener: () => {
        // No-op for tests
      },
      removeEventListener: () => {
        // No-op for tests
      },
      dispatchEvent: () => false,
    })
  }
}

// Export setup function for manual setup in tests
export const setupBunTest = () => {
  setupMinimalDOMEnvironment()
}
