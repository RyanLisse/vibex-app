/**
 * Integration Test Setup
 *
 * Configures the test environment for integration tests including:
 * - Database connections
 * - Mock services
 * - Environment variables
 * - Cleanup procedures
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.VITEST = "true";

// Database setup
let testDbSetup = null;

// Mock browser APIs that aren't available in jsdom
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock fetch for integration tests
global.fetch = vi.fn();

// Mock performance API
if (typeof global.performance === "undefined") {
	global["performance"] = { now: () => Date.now() };
}

// Mock crypto API
if (typeof global.crypto === "undefined") {
	global["crypto"] = {
		getRandomValues: vi.fn((arr) => arr.map(() => Math.floor(Math.random() * 256))),
		randomUUID: vi.fn(() => "test-uuid-" + Date.now()),
	};
}

// Setup test environment variables
const TEST_ENV = {
	DATABASE_URL: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test",
	ELECTRIC_URL: process.env.ELECTRIC_URL || "http://localhost:5133",
	ELECTRIC_WEBSOCKET_URL: process.env.ELECTRIC_WEBSOCKET_URL || "ws://localhost:5133",
	ELECTRIC_AUTH_TOKEN: process.env.ELECTRIC_AUTH_TOKEN || "test_auth_token",
	ELECTRIC_USER_ID: process.env.ELECTRIC_USER_ID || "test_user_id",
	ELECTRIC_API_KEY: process.env.ELECTRIC_API_KEY || "test_api_key",
	AUTH_SECRET: process.env.AUTH_SECRET || "test_auth_secret",
	NODE_ENV: "test",
	INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY || "test-signing-key",
	INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY || "test-event-key",
};

// Apply test environment variables
Object.assign(process.env, TEST_ENV);

// Default mock database utilities (fallback)
global.checkDatabaseHealth = vi.fn().mockResolvedValue(true);
global.initializeExtensions = vi.fn().mockResolvedValue(true);

// Global setup for all integration tests
beforeAll(async () => {
	// Check if we have a real database connection
	const hasRealDatabase = Boolean(process.env.DATABASE_URL);

	if (hasRealDatabase) {
		try {
			// Import and setup real database
			const { initializeTestDatabase, setupTestTables, checkDatabaseHealth } = await import(
				"../../db/test-config.real"
			);

			// Initialize database connection
			testDbSetup = {
				initializeTestDatabase,
				setupTestTables,
				checkDatabaseHealth,
				cleanTestData: (await import("../../db/test-config.real")).cleanTestData,
				closeDatabaseConnection: (await import("../../db/test-config.real"))
					.closeDatabaseConnection,
			};

			// Test database connection
			const isHealthy = await testDbSetup.checkDatabaseHealth();
			if (isHealthy) {
				// Setup test tables
				await testDbSetup.setupTestTables();
			}
		} catch (error) {
			// Tests will run with mock database
			testDbSetup = null;
		}
	}
});

// Cleanup after all tests
afterAll(async () => {
	if (testDbSetup?.closeDatabaseConnection) {
		try {
			await testDbSetup.closeDatabaseConnection();
		} catch (error) {
			// Silent cleanup
		}
	}
});

// Clean data before each test
beforeEach(async () => {
	if (testDbSetup?.cleanTestData) {
		try {
			await testDbSetup.cleanTestData();
		} catch (error) {
			// Don't fail tests if cleanup fails
		}
	}
});

// Optional: Additional cleanup after each test
afterEach(async () => {
	// Reset all mocks
	vi.clearAllMocks();

	// Clear any timers
	vi.clearAllTimers();
});

// Export test utilities for use in tests
export { TEST_ENV, testDbSetup };

// Helper function to check if real database is available
export function hasRealDatabase(): boolean {
	return Boolean(process.env.DATABASE_URL) && testDbSetup !== null;
}

// Helper function to get test database instance
export async function getTestDb() {
	if (!hasRealDatabase()) {
		throw new Error("Real database not available for this test");
	}

	return testDbSetup.initializeTestDatabase();
}
