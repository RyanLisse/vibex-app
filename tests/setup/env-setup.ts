/**
 * Global test setup file
 * Configures the testing environment with necessary polyfills and utilities
 */

import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

// Mock environment variables for testing
beforeAll(() => {
	// Set up test environment variables
	process.env.NODE_ENV = "test";
	process.env.DATABASE_URL = "test://localhost";
	process.env.ELECTRIC_URL = "http://localhost:5133";
	process.env.ELECTRIC_AUTH_TOKEN = "test-token";
	process.env.AUTH_SECRET = "test-secret-32-characters-long!!";
	process.env.LETTA_API_KEY = "test-letta-key";
	process.env.OPENAI_API_KEY = "test-openai-key";
	process.env.GOOGLE_AI_API_KEY = "test-google-key";

	// Mock localStorage
	Object.defineProperty(global, "localStorage", {
		value: {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		},
		writable: true,
	});

	// Mock console methods to reduce noise in tests
	vi.spyOn(console, "log").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

// Clean up after tests
afterAll(() => {
	vi.restoreAllMocks();
});

// Reset mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
	vi.clearAllTimers();
});
