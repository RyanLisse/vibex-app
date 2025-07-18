/**
 * Bun Test Setup
 * Global test configuration for Bun's built-in test runner
 */

import { beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { cleanup } from '@testing-library/react'

// Store original environment
const originalEnv = { ...process.env }

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  
  // Mock DOM APIs that might not be available in jsdom
  setupDOMPolyfills()
})

// Clean up after each test
afterEach(() => {
  // Cleanup React components
  cleanup()
  
  // Restore environment variables
  process.env = { ...originalEnv }
  
  // Clear document state
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

// Global cleanup
afterAll(() => {
  // Cleanup complete
})

// DOM Polyfills for jsdom compatibility
function setupDOMPolyfills() {
  // Mock IntersectionObserver
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class IntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      root = null
      rootMargin = '0px'
      thresholds = []
      takeRecords() { return [] }
    }
  }

  // Mock ResizeObserver
  if (!global.ResizeObserver) {
    global.ResizeObserver = class ResizeObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  // Mock window.matchMedia
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  // Mock localStorage
  if (!window.localStorage) {
    const storage = new Map<string, string>()
    window.localStorage = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      length: 0,
      key: () => null,
    }
  }

  // Mock sessionStorage
  if (!window.sessionStorage) {
    const storage = new Map<string, string>()
    window.sessionStorage = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      length: 0,
      key: () => null,
    }
  }

  // Mock URL.createObjectURL
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:test'
  }

  // Mock URL.revokeObjectURL
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {}
  }
}

// Export setup function for manual setup in tests
export const setupBunTest = () => {
  setupDOMPolyfills()
}