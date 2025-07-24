/**
 * Global Test Setup Configuration
 *
 * This file sets up the global test environment for all test files.
 * It includes necessary polyfills, mocks, and test utilities.
 */

import { vi } from "vitest";

// Mock fetch globally for all tests
global.fetch = vi.fn();

// Mock performance API
Object.defineProperty(global, "performance", {
	value: {
		now: vi.fn(() => Date.now()),
		mark: vi.fn(),
		measure: vi.fn(),
		clearMarks: vi.fn(),
		clearMeasures: vi.fn(),
		getEntriesByName: vi.fn(() => []),
		getEntriesByType: vi.fn(() => []),
		getEntries: vi.fn(() => []),
		timeOrigin: Date.now(),
	},
	writable: true,
	configurable: true,
});

// Mock console methods to reduce test noise
global.console = {
	...console,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

// Mock window object for browser-like environment (if it doesn't exist)
if (typeof window === "undefined") {
	(global as any).window = {
		location: {
			href: "http://localhost:3000",
			origin: "http://localhost:3000",
			protocol: "http:",
			hostname: "localhost",
			port: "3000",
			pathname: "/",
			search: "",
			hash: "",
			reload: vi.fn(),
			assign: vi.fn(),
		},
		localStorage: {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			key: vi.fn(),
			length: 0,
		},
		sessionStorage: {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			key: vi.fn(),
			length: 0,
		},
	};
} else {
	// Mock localStorage
	const localStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		key: vi.fn(),
		length: 0,
	};
	Object.defineProperty(window, "localStorage", {
		value: localStorageMock,
	});

	// Mock sessionStorage
	Object.defineProperty(window, "sessionStorage", {
		value: localStorageMock,
	});
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
	close: vi.fn(),
	send: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	readyState: WebSocket.CONNECTING,
}));

// Mock crypto for WASM tests
Object.defineProperty(global, "crypto", {
	value: {
		getRandomValues: vi.fn((arr: any) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}),
		randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).substr(2, 9)),
	},
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
	encode(str: string) {
		return new Uint8Array(Buffer.from(str, "utf8"));
	}
};

global.TextDecoder = class {
	decode(arr: Uint8Array) {
		return Buffer.from(arr).toString("utf8");
	}
};

// Mock navigator and MediaDevices for voice tests
if (typeof navigator === "undefined") {
	(global as any).navigator = {
		mediaDevices: {
			getUserMedia: vi.fn().mockResolvedValue({
				getTracks: () => [{ stop: vi.fn() }],
			}),
		},
		userAgent: "test-user-agent",
		clipboard: {
			writeText: vi.fn().mockResolvedValue(undefined),
			readText: vi.fn().mockResolvedValue(""),
		},
	};
} else {
	Object.defineProperty(navigator, "mediaDevices", {
		value: {
			getUserMedia: vi.fn().mockResolvedValue({
				getTracks: () => [{ stop: vi.fn() }],
			}),
		},
		writable: true,
	});

	Object.defineProperty(navigator, "clipboard", {
		value: {
			writeText: vi.fn().mockResolvedValue(undefined),
			readText: vi.fn().mockResolvedValue(""),
		},
		writable: true,
	});
}

// Set up environment variables for tests
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Increase timeout for integration tests
vi.setConfig({
	testTimeout: 30000,
	hookTimeout: 30000,
});
