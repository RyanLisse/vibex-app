/**
 * Integration Test Setup and Configuration
 * 
 * Provides comprehensive setup for integration tests
 * Integrates with test database migration and cleanup utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { 
  testDatabase,
  setupTestDatabase,
  teardownTestDatabase,
  resetTestDatabase,
  withTestTransaction,
  assertDatabaseClean,
} from './test-database-setup';
import { 
  testMigrationRunner,
  runTestMigrations,
  cleanupTestData,
  seedTestData as migrationSeedTestData,
} from './test-migration-runner';

// Test Database Configuration - Extended from migration setup
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || "localhost",
  port: parseInt(process.env.TEST_DB_PORT || "5432"),
  database: process.env.TEST_DB_NAME || "vibex_test",
  username: process.env.TEST_DB_USER || "postgres",
  password: process.env.TEST_DB_PASSWORD || "password",
};

/**
 * Initialize test database connection using migration setup
 */
export async function initializeTestDatabase() {
  try {
    // Use our comprehensive database setup
    await setupTestDatabase();
    
    return { 
      testDatabase,
      migrationRunner: testMigrationRunner,
      status: testDatabase.getStatus()
    };
  } catch (error) {
    throw new Error(`Failed to initialize test database: ${error}`);
  }
}

/**
 * Clean up test database connection using migration teardown
 */
export async function cleanupTestDatabase() {
  try {
    await teardownTestDatabase();
  } catch (error) {
    console.warn('Database cleanup warning:', error);
    // Force cleanup if normal teardown fails
    await testDatabase.forceCleanup();
  }
}

/**
 * Seed test database with fixture data using migration runner
 */
export async function seedTestData() {
  try {
    // Use migration runner's comprehensive seeding
    await migrationSeedTestData();
    
    // Return the test data structure for reference
    return {
      environments: [
        {
          id: "test-env-integration-1",
          name: "Integration Test Env 1",
          userId: "test-user-integration",
        },
        {
          id: "test-env-integration-2",
          name: "Integration Test Env 2", 
          userId: "test-user-integration",
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to seed test data: ${error}`);
  }
}

/**
 * Clean all test data from database using migration runner
 */
export async function cleanTestData() {
  try {
    // Use migration runner's comprehensive cleanup
    await cleanupTestData();
  } catch (error) {
    console.warn('Test data cleanup warning:', error);
    // Attempt force cleanup if normal cleanup fails
    try {
      await testDatabase.forceCleanup();
    } catch (forceError) {
      console.error('Force cleanup also failed:', forceError);
    }
  }
}

/**
 * Setup external service mocks for integration tests
 */
export function setupServiceMocks() {
  // Mock Redis client
  vi.mock("@upstash/redis", () => ({
    Redis: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(0),
      expire: vi.fn().mockResolvedValue(1),
      pipeline: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    })),
  }));

  // Mock Inngest client
  vi.mock("inngest", () => ({
    Inngest: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }),
      createFunction: vi.fn(),
    })),
  }));

  // Additional mocks can be added here as needed
}

/**
 * Global setup for all integration tests with comprehensive database management
 */
export function setupIntegrationTests() {
  beforeAll(async () => {
    // Environment setup
    process.env.NODE_ENV = "test";
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = `postgresql://${TEST_DB_CONFIG.username}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`;
    }
    
    // Setup service mocks
    setupServiceMocks();
    
    // Initialize database with migrations and setup
    await initializeTestDatabase();
  }, 60000); // Extended timeout for database setup

  afterAll(async () => {
    // Comprehensive database cleanup
    await cleanupTestDatabase();
  }, 30000); // Extended timeout for cleanup

  beforeEach(async () => {
    // Reset database to clean state before each test
    await resetTestDatabase();
  }, 20000); // Extended timeout for reset

  afterEach(async () => {
    // Verify database is clean after each test
    try {
      await assertDatabaseClean();
    } catch (error) {
      console.warn('Database cleanup verification failed:', error.message);
      // Force cleanup if verification fails
      await testDatabase.forceCleanup();
    }
    
    // Clear service mocks
    vi.clearAllMocks();
  }, 15000); // Extended timeout for cleanup verification
}

/**
 * Test data factories for common entities
 */
export const testDataFactory = {
  user: (overrides: Partial<any> = {}) => ({
    id: `test-user-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    name: "Test User",
    createdAt: new Date(),
    ...overrides,
  }),

  project: (overrides: Partial<any> = {}) => ({
    id: `test-project-${Date.now()}`,
    name: "Test Project",
    description: "Test project description",
    userId: "test-user-1",
    createdAt: new Date(),
    ...overrides,
  }),

  task: (overrides: Partial<any> = {}) => ({
    id: `test-task-${Date.now()}`,
    title: "Test Task",
    description: "Test task description", 
    status: "pending" as const,
    priority: "medium" as const,
    projectId: "test-project-1",
    userId: "test-user-1",
    createdAt: new Date(),
    ...overrides,
  }),
};

/**
 * Utility functions for integration tests
 */
export const integrationTestUtils = {
  async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  async simulateApiDelay(ms: number = 100) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  },
};

// Export comprehensive database utilities for direct use in tests
export { 
  testDatabase,
  testMigrationRunner,
  withTestTransaction,
  assertDatabaseClean,
  setupTestDatabase,
  teardownTestDatabase,
  resetTestDatabase,
};

// Global test utilities for integration tests
declare global {
  var testUtils: {
    database: typeof testDatabase;
    withTransaction: typeof withTestTransaction;
    resetDatabase: typeof resetTestDatabase;
    assertClean: typeof assertDatabaseClean;
    migrationRunner: typeof testMigrationRunner;
    config: typeof integrationTestConfig;
  };
}

// Make utilities available globally for tests
globalThis.testUtils = {
  database: testDatabase,
  withTransaction: withTestTransaction,
  resetDatabase: resetTestDatabase,
  assertClean: assertDatabaseClean,
  migrationRunner: testMigrationRunner,
  config: integrationTestConfig,
};

// Export enhanced test configuration
export const integrationTestConfig = {
  timeout: {
    database: 60000,    // 60s for database operations
    api: 15000,         // 15s for API calls
    service: 10000,     // 10s for service operations
    setup: 60000,       // 60s for test setup
    cleanup: 30000,     // 30s for cleanup
  },
  
  database: {
    isolateTests: true,
    autoMigrate: true,
    autoSeed: true,
    autoCleanup: true,
  },

  async waitForDatabase() {
    return testDatabase.setup();
  },

  async cleanDatabase() {
    return testDatabase.forceCleanup();
  },

  async resetDatabase() {
    return resetTestDatabase();
  },

  getStatus() {
    return testDatabase.getStatus();
  },

  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return withTestTransaction(callback);
  },
};