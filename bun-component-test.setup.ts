// Bun test setup for component tests
import { mock, beforeEach, afterEach } from 'bun:test'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

// Setup JSDOM environment
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
})

// Set global objects
Object.defineProperty(global, 'window', {
  value: dom.window,
  writable: true,
})
Object.defineProperty(global, 'document', {
  value: dom.window.document,
  writable: true,
})
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
})
Object.defineProperty(global, 'HTMLElement', {
  value: dom.window.HTMLElement,
  writable: true,
})
Object.defineProperty(global, 'HTMLDivElement', {
  value: dom.window.HTMLDivElement,
  writable: true,
})
Object.defineProperty(global, 'Element', {
  value: dom.window.Element,
  writable: true,
})
Object.defineProperty(global, 'Node', {
  value: dom.window.Node,
  writable: true,
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js modules
mock.module('next/navigation', () => ({
  useRouter: () => ({
    push: mock(),
    back: mock(),
    forward: mock(),
    refresh: mock(),
    replace: mock(),
    pathname: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: mock(),
  redirect: mock(),
}))

mock.module('next/headers', () => ({
  headers: () => new Headers(),
  cookies: () => ({
    get: mock(),
    set: mock(),
    delete: mock(),
    has: mock(),
  }),
}))

// Mock fetch
global.fetch = mock()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mock().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: mock(),
    removeListener: mock(),
    addEventListener: mock(),
    removeEventListener: mock(),
    dispatchEvent: mock(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = mock().mockImplementation(() => ({
  observe: mock(),
  unobserve: mock(),
  disconnect: mock(),
}))

// Mock ResizeObserver
global.ResizeObserver = mock().mockImplementation(() => ({
  observe: mock(),
  unobserve: mock(),
  disconnect: mock(),
}))
