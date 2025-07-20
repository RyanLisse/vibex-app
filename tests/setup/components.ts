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

import { cleanup } from "@testing-library/react";

// Force DOM environment validation
if (typeof window === "undefined") {
	throw new Error(
		"DOM environment not available - ensure jsdom is properly configured",
	);
}

if (typeof document === "undefined") {
	throw new Error(
		"Document not available - ensure jsdom is properly initialized",
	);
}

console.log("✅ DOM Environment initialized:", {
	window: typeof window !== "undefined",
	document: typeof document !== "undefined",
	location: typeof location !== "undefined",
	navigator: typeof navigator !== "undefined",
});

// Store original environment
const originalEnv = { ...process.env };

// Component test specific cleanup
afterEach(() => {
	// Cleanup React components - critical for DOM tests
	cleanup();

	// Restore environment variables
	process.env = { ...originalEnv };

	// Clear all vitest mocks and timers
	vi.clearAllTimers();
	vi.clearAllMocks();
	vi.restoreAllMocks();

	// Reset DOM state completely
	if (document.body) {
		document.body.innerHTML = "";
	}
	if (document.head) {
		document.head.innerHTML = "";
	}

	// Clear any pending tasks only if timers are mocked
	if (vi.isFakeTimers()) {
		vi.runAllTimers();
	}
});

// Component test specific setup
beforeEach(() => {
	// Set consistent test environment
	vi.stubEnv("NODE_ENV", "test");
	vi.stubEnv("VITEST_POOL_ID", "1");
	vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
	vi.stubEnv("OPENAI_API_KEY", "test-key");
	vi.stubEnv("INNGEST_EVENT_KEY", "test-event-key");
	vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
	vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");

	// Reset modules for clean state
	vi.resetModules();

	// Ensure DOM is clean
	if (document.body) {
		document.body.innerHTML = "";
	}
});

// Mock Next.js navigation hooks
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
	default: vi.fn(({ alt, src, ...props }) => {
		return {
			type: "img",
			props: { ...props, alt, src },
		};
	}),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
	default: vi.fn(({ children, href, ...props }) => {
		return {
			type: "a",
			props: { ...props, href },
			children,
		};
	}),
}));

// Essential browser APIs for React components
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

// Mock matchMedia for responsive components
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

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn(),
});

Object.defineProperty(window, "localStorage", {
	value: createStorageMock(),
});

Object.defineProperty(window, "sessionStorage", {
	value: createStorageMock(),
});

// Mock fetch for API calls in components
global.fetch = vi.fn();

// Mock crypto API
Object.defineProperty(global, "crypto", {
	value: {
		randomUUID: vi.fn(() => "test-uuid-123"),
		getRandomValues: vi.fn((arr) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}),
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

// Mock performance API
Object.defineProperty(global, "performance", {
	value: {
		now: vi.fn(() => Date.now()),
		mark: vi.fn(),
		measure: vi.fn(),
		getEntriesByType: vi.fn(() => []),
		getEntriesByName: vi.fn(() => []),
		clearMarks: vi.fn(),
		clearMeasures: vi.fn(),
		timing: {},
		navigation: {},
	},
});

// Mock WebSocket for real-time components
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

// Mock requestAnimationFrame for animations
global.requestAnimationFrame = vi.fn((cb) => {
	setTimeout(cb, 16);
	return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock URL constructor for URL parsing (use native URL if available)
if (typeof URL === "undefined") {
	global.URL = vi.fn().mockImplementation((url, base) => ({
		href: url,
		origin: "http://localhost",
		protocol: "http:",
		hostname: "localhost",
		port: "",
		pathname: "/",
		search: "",
		hash: "",
		toString: () => url,
		searchParams: {
			get: vi.fn(),
			set: vi.fn(),
			has: vi.fn(),
			delete: vi.fn(),
			toString: vi.fn(() => ""),
		},
	}));
}

// Clean up console noise in tests
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

// Ensure proper cleanup on exit
process.on("exit", () => {
	cleanup();
});
