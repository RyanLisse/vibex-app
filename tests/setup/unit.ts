import { vi } from "vitest";

// Unit test setup for Node.js environment
// For utilities, services, business logic, and API functions

// Mock browser APIs that might be referenced in utility code
Object.defineProperty(global, "localStorage", {
	value: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	},
});

Object.defineProperty(global, "sessionStorage", {
	value: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	},
});

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock console methods for cleaner test output
global.console = {
	...console,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_ENV = "test";

// Setup for testing utilities
beforeEach(() => {
	vi.clearAllMocks();
	vi.resetModules();
});

afterEach(() => {
	vi.restoreAllMocks();
});
