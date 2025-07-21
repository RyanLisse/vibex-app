import { vi } from "vitest";

// Integration test setup for Node.js environment
// For API, database, and system integration tests

// Mock external services for integration tests
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setContext: vi.fn() })),
}));

// Mock Inngest for integration testing
vi.mock("inngest", () => ({
  Inngest: vi.fn().mockImplementation(() => ({
    createFunction: vi.fn(),
    send: vi.fn(),
  })),
  serve: vi.fn(),
}));

// Mock Redis/IORedis
vi.mock("ioredis", () => {
  return vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
    pipeline: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      exec: vi.fn(),
    })),
    disconnect: vi.fn(),
  }));
});

// Mock database connections
vi.mock("@neondatabase/serverless", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    end: vi.fn(),
  })),
  neon: vi.fn(),
}));

// Mock Electric SQL
vi.mock("@electric-sql/client", () => ({
  Electric: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    sync: vi.fn(),
  })),
}));

// Mock environment variables for integration tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.INNGEST_EVENT_KEY = 'test-key';
process.env.INNGEST_SIGNING_KEY = 'test-signing-key';

// Mock fetch for API integration tests
global.fetch = vi.fn();

// Setup and cleanup for integration tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Global test timeout for integration tests
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000,
});