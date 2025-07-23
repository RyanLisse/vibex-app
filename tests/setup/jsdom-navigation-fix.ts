/**
 * JSDOM Navigation Fix
 * Comprehensive solution for "Not implemented: navigation" errors in jsdom
 */

import { vi } from "vitest";

// Navigation API Mock - Fixes "Not implemented: navigation" error
const createNavigationMock = () => ({
  navigate: vi.fn().mockImplementation((url: string, options?: any) => {
    // Simulate navigation by updating location
    if (typeof url === "string") {
      window.location.href = url;
    }
    return Promise.resolve({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    });
  }),
  
  back: vi.fn().mockImplementation(() => {
    window.history.back();
    return Promise.resolve({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    });
  }),
  
  forward: vi.fn().mockImplementation(() => {
    window.history.forward();
    return Promise.resolve({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    });
  }),
  
  reload: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    });
  }),
  
  traverseTo: vi.fn().mockResolvedValue({
    committed: Promise.resolve(),
    finished: Promise.resolve(),
  }),
  
  // Properties
  canGoBack: true,
  canGoForward: false,
  
  // Current entry mock
  currentEntry: {
    url: "http://localhost:3000/",
    index: 0,
    id: "test-entry-1",
    key: "test-key-1",
    sameDocument: true,
    getState: vi.fn(() => ({})),
  },
  
  // Entries mock
  entries: vi.fn(() => []),
  
  // Event handling
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  
  // Navigation timing
  activation: {
    from: null,
    navigationType: "reload",
  },
  
  // Transition mock
  transition: null,
});

// History API Enhanced Mock
const createHistoryMock = () => ({
  length: 1,
  scrollRestoration: "auto" as ScrollRestoration,
  state: null,
  
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  
  pushState: vi.fn((state, title, url) => {
    if (url) {
      window.location.href = new URL(url, window.location.origin).href;
    }
  }),
  
  replaceState: vi.fn((state, title, url) => {
    if (url) {
      window.location.href = new URL(url, window.location.origin).href;
    }
  }),
});

// Location API Enhanced Mock
const createLocationMock = (initialUrl = "http://localhost:3000/") => {
  const url = new URL(initialUrl);
  
  return {
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    
    assign: vi.fn((url: string) => {
      window.location.href = url;
    }),
    
    replace: vi.fn((url: string) => {
      window.location.href = url;
    }),
    
    reload: vi.fn(),
    
    toString: () => url.href,
  };
};

// Apply mocks to window object
export const setupNavigationMocks = () => {
  // Navigation API
  Object.defineProperty(window, "navigation", {
    value: createNavigationMock(),
    writable: true,
    configurable: true,
  });
  
  // Enhanced History API
  Object.defineProperty(window, "history", {
    value: createHistoryMock(),
    writable: true,
    configurable: true,
  });
  
  // Enhanced Location API
  Object.defineProperty(window, "location", {
    value: createLocationMock(),
    writable: true,
    configurable: true,
  });
  
  // URL constructor polyfill for older environments
  if (typeof global.URL === "undefined") {
    global.URL = window.URL;
  }
  
  // URLSearchParams polyfill
  if (typeof global.URLSearchParams === "undefined") {
    global.URLSearchParams = window.URLSearchParams;
  }
};

// Auto-setup when imported
setupNavigationMocks();

export { createNavigationMock, createHistoryMock, createLocationMock };