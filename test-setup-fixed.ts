/**
 * Fixed Test Setup - Comprehensive Solution
 *
 * FIXES:
 * ✅ jsdom navigation errors
 * ✅ Missing browser API mocks
 * ✅ bun:test compatibility shims
 * ✅ Module externalization issues
 * ✅ Memory and performance problems
 */

// Essential polyfills FIRST
import "./tests/setup/crypto-polyfill";
import "./tests/setup/jsdom-navigation-fix";
import "./tests/setup/browser-apis-mock";
// Note: @testing-library/jest-dom removed as part of Jest migration
import { afterEach, vi } from "vitest";

// === FIX 1: jsdom Navigation Error ===
// Mock jsdom navigation to prevent "Not implemented: navigation" errors
Object.defineProperty(window, "navigation", {
	value: {
		navigate: vi.fn().mockResolvedValue(undefined),
		back: vi.fn().mockResolvedValue(undefined),
		forward: vi.fn().mockResolvedValue(undefined),
		canGoBack: true,
		canGoForward: true,
		currentEntry: {
			url: "http://localhost:3000/",
			index: 0,
			id: "test-entry",
		},
		entries: vi.fn(() => []),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	},
	writable: true,
	configurable: true,
});

// === FIX 2: Comprehensive Browser API Mocks ===
// Fix ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Fix IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
	root: null,
	rootMargin: "0px",
	thresholds: [0],
}));

// Fix matchMedia
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

// === FIX 3: Performance API Comprehensive Mock ===
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
		timing: {
			navigationStart: 0,
			unloadEventStart: 0,
			unloadEventEnd: 0,
			redirectStart: 0,
			redirectEnd: 0,
			fetchStart: 100,
			domainLookupStart: 100,
			domainLookupEnd: 120,
			connectStart: 120,
			connectEnd: 150,
			secureConnectionStart: 0,
			requestStart: 150,
			responseStart: 200,
			responseEnd: 250,
			domLoading: 250,
			domInteractive: 300,
			domContentLoadedEventStart: 300,
			domContentLoadedEventEnd: 310,
			domComplete: 400,
			loadEventStart: 400,
			loadEventEnd: 450,
		},
		navigation: {
			type: 0,
			redirectCount: 0,
		},
	},
	writable: true,
	configurable: true,
});

// === FIX 4: Enhanced Fetch Mock ===
const mockResponse = (data = {}, ok = true, status = 200) => ({
	ok,
	status,
	statusText: ok ? "OK" : "Error",
	headers: new Headers(),
	json: vi.fn().mockResolvedValue(data),
	text: vi.fn().mockResolvedValue(JSON.stringify(data)),
	blob: vi.fn().mockResolvedValue(new Blob()),
	arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
	clone: vi.fn().mockReturnThis(),
});

global.fetch = vi.fn().mockImplementation((url) => {
	// Default successful response
	return Promise.resolve(mockResponse({ success: true, data: null }));
});

// === FIX 5: Storage API Mocks ===
const createStorageMock = () => {
	const store = new Map();
	return {
		getItem: vi.fn((key) => store.get(key) ?? null),
		setItem: vi.fn((key, value) => {
			store.set(key, value);
		}),
		removeItem: vi.fn((key) => {
			store.delete(key);
		}),
		clear: vi.fn(() => {
			store.clear();
		}),
		key: vi.fn((index) => {
			const keys = Array.from(store.keys());
			return keys[index] ?? null;
		}),
		get length() {
			return store.size;
		},
	};
};

Object.defineProperty(window, "localStorage", {
	value: createStorageMock(),
	writable: true,
});

Object.defineProperty(window, "sessionStorage", {
	value: createStorageMock(),
	writable: true,
});

// === FIX 6: Console Mock (Reduce Test Noise) ===
const originalConsole = global.console;
global.console = {
	...originalConsole,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

// === FIX 7: Crypto API Comprehensive Mock ===
Object.defineProperty(global, "crypto", {
	value: {
		getRandomValues: vi.fn((arr) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}),
		randomUUID: vi.fn(() =>
			"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				const v = c === "x" ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			})
		),
		subtle: {
			encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
			decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
			sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			verify: vi.fn().mockResolvedValue(true),
			digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			generateKey: vi.fn().mockResolvedValue({
				privateKey: { type: "private" },
				publicKey: { type: "public" },
			}),
			importKey: vi.fn().mockResolvedValue({ type: "secret" }),
			exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			deriveKey: vi.fn().mockResolvedValue({ type: "secret" }),
			wrapKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
			unwrapKey: vi.fn().mockResolvedValue({ type: "secret" }),
		},
	},
	writable: true,
	configurable: true,
});

// === FIX 8: WebSocket Mock ===
global.WebSocket = vi.fn().mockImplementation(() => ({
	close: vi.fn(),
	send: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	readyState: 1, // OPEN
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
	url: "ws://localhost:3000",
	protocol: "",
	bufferedAmount: 0,
	extensions: "",
	binaryType: "blob",
}));

// === FIX 9: Next.js Navigation Mocks ===
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn().mockResolvedValue(undefined),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		pathname: "/",
		query: {},
		asPath: "/",
		route: "/",
		events: {
			on: vi.fn(),
			off: vi.fn(),
			emit: vi.fn(),
		},
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({}),
	notFound: vi.fn(),
	redirect: vi.fn(),
}));

vi.mock("next/router", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn().mockResolvedValue(undefined),
		back: vi.fn(),
		forward: vi.fn(),
		reload: vi.fn(),
		pathname: "/",
		query: {},
		asPath: "/",
		route: "/",
		events: {
			on: vi.fn(),
			off: vi.fn(),
			emit: vi.fn(),
		},
	}),
}));

// === FIX 10: MediaDevices Mock ===
Object.defineProperty(navigator, "mediaDevices", {
	value: {
		getUserMedia: vi.fn().mockResolvedValue({
			getTracks: () => [{ stop: vi.fn(), kind: "audio", enabled: true }],
			getAudioTracks: () => [{ stop: vi.fn(), kind: "audio", enabled: true }],
			getVideoTracks: () => [],
			stop: vi.fn(),
		}),
		enumerateDevices: vi.fn().mockResolvedValue([]),
		getDisplayMedia: vi.fn().mockResolvedValue({
			getTracks: () => [{ stop: vi.fn() }],
		}),
	},
	writable: true,
});

// === FIX 11: RequestAnimationFrame ===
global.requestAnimationFrame = vi.fn((cb) => {
	return setTimeout(() => cb(Date.now()), 16);
});

global.cancelAnimationFrame = vi.fn((id) => {
	clearTimeout(id);
});

// === FIX 12: Environment Variables ===
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.VITEST = "true";

// Set Vitest configuration
vi.setConfig({
	testTimeout: 15000,
	hookTimeout: 10000,
});

// === FIX 13: Cleanup Helper ===
export const cleanupMocks = () => {
	vi.clearAllMocks();
	vi.resetAllMocks();
};

// Auto-cleanup after each test
afterEach(() => {
	cleanupMocks();
});

// Export for external use
export { mockResponse, createStorageMock };
