// Mock Redis before any imports
import { vi } from "vitest";

vi.mock("redis", () => ({
	createClient: vi.fn(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue("OK"),
		del: vi.fn().mockResolvedValue(1),
		exists: vi.fn().mockResolvedValue(0),
		expire: vi.fn().mockResolvedValue(1),
		ttl: vi.fn().mockResolvedValue(-1),
		ping: vi.fn().mockResolvedValue("PONG"),
		on: vi.fn(),
		off: vi.fn(),
	})),
}));

vi.mock("ioredis", () => ({
	default: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue("OK"),
		del: vi.fn().mockResolvedValue(1),
		exists: vi.fn().mockResolvedValue(0),
		expire: vi.fn().mockResolvedValue(1),
		ttl: vi.fn().mockResolvedValue(-1),
		ping: vi.fn().mockResolvedValue("PONG"),
		on: vi.fn(),
		off: vi.fn(),
	})),
}));

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Store original environment
const originalEnv = { ...process.env };

// Unit test specific cleanup
afterEach(() => {
	// Cleanup React components
	cleanup();

	// Restore environment variables
	process.env = { ...originalEnv };

	// Clear all vitest mocks and timers
	vi.clearAllTimers();
	vi.clearAllMocks();
	vi.restoreAllMocks();

	// Reset DOM state
	document.body.innerHTML = "";
	document.head.innerHTML = "";
});

// Unit test specific setup
beforeEach(() => {
	// Set consistent test environment
	vi.stubEnv("NODE_ENV", "test");
	vi.stubEnv("VITEST_POOL_ID", "1");

	// Reset globals
	vi.resetModules();
});

// Mock external dependencies for unit tests
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		replace: vi.fn(),
		pathname: "/",
		query: {},
		asPath: "/",
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({}),
	notFound: vi.fn(),
	redirect: vi.fn(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
	default: vi.fn(({ alt, ...props }) => {
		// Return a mock element representation instead of JSX
		return { type: "img", props: { ...props, alt } };
	}),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
	default: vi.fn(({ children, ...props }) => {
		// Return a mock element representation instead of JSX
		return { type: "a", props, children };
	}),
}));

// Mock browser APIs
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
	root: null,
	rootMargin: "0px",
	thresholds: [],
	takeRecords: vi.fn().mockReturnValue([]),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock matchMedia (only if window exists - for jsdom environments)
if (typeof window !== "undefined") {
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
}

// Mock localStorage (only if window exists)
if (typeof window !== "undefined") {
	const localStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	};
	Object.defineProperty(window, "localStorage", {
		value: localStorageMock,
	});

	// Mock sessionStorage
	const sessionStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	};
	Object.defineProperty(window, "sessionStorage", {
		value: sessionStorageMock,
	});
}

// Mock fetch for unit tests
global.fetch = vi.fn();

// Mock crypto
Object.defineProperty(global, "crypto", {
	value: {
		randomUUID: vi.fn(() => "test-uuid"),
		getRandomValues: vi.fn(),
		subtle: {
			digest: vi.fn(),
			importKey: vi.fn(),
			exportKey: vi.fn(),
			generateKey: vi.fn(),
			deriveKey: vi.fn(),
			deriveBits: vi.fn(),
			encrypt: vi.fn(),
			decrypt: vi.fn(),
			sign: vi.fn(),
			verify: vi.fn(),
		},
	},
});

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	send: vi.fn(),
	close: vi.fn(),
	readyState: 1,
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
}));

// WebSocket constants
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

// Mock performance
Object.defineProperty(global, "performance", {
	value: {
		now: vi.fn(() => Date.now()),
		mark: vi.fn(),
		measure: vi.fn(),
		getEntriesByType: vi.fn(() => []),
		getEntriesByName: vi.fn(() => []),
		clearMarks: vi.fn(),
		clearMeasures: vi.fn(),
	},
});

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
	console.error = vi.fn();
	console.warn = vi.fn();
});

afterEach(() => {
	console.error = originalError;
	console.warn = originalWarn;
});
