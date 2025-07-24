/**
 * Bun Test Setup - Logic/Utility Tests Only
 *
 * This setup file is specifically for Bun's test runner and should only
 * contain mocks and setup needed for pure logic/utility tests.
 *
 * React components and complex integration tests should use Vitest.
 */

// Environment setup for Bun tests
process.env.NODE_ENV = "test";
process.env.BUN_TEST = "true";

// Mock console to reduce noise in tests
const originalConsole = globalThis.console;
globalThis.console = {
	...originalConsole,
	log: () => {}, // Silent in tests
	debug: () => {},
	info: () => {},
	warn: originalConsole.warn, // Keep warnings
	error: originalConsole.error, // Keep errors
};

// Mock crypto for Node.js compatibility
if (!globalThis.crypto) {
	globalThis.crypto = {
		getRandomValues: (arr: any) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		},
		randomUUID: () =>
			"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				const v = c === "x" ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}),
		subtle: {
			digest: async () => new ArrayBuffer(32),
		},
	} as any;
}

// Mock fetch for API calls in logic tests
globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
	// Default mock response
	return new Response(JSON.stringify({ success: true, data: null }), {
		status: 200,
		statusText: "OK",
		headers: { "Content-Type": "application/json" },
	});
};

// Mock performance API
if (!globalThis.performance) {
	globalThis.performance = {
		now: () => Date.now(),
		mark: () => {},
		measure: () => {},
		clearMarks: () => {},
		clearMeasures: () => {},
		getEntriesByName: () => [],
		getEntriesByType: () => [],
		getEntries: () => [],
		timeOrigin: Date.now(),
	} as any;
}

// Mock basic DOM APIs that might be needed for utility functions
if (!globalThis.window) {
	globalThis.window = {
		location: {
			href: "http://localhost:3000",
			origin: "http://localhost:3000",
			pathname: "/",
			search: "",
			hash: "",
		},
		localStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			length: 0,
			key: () => null,
		},
		sessionStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			length: 0,
			key: () => null,
		},
	} as any;
}

// Export cleanup function for tests that need it
export const cleanupBunMocks = () => {
	// Reset any stateful mocks if needed
};
