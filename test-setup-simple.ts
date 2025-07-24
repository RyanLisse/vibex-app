/**
 * Simple Test Setup - Coverage Specialist Fix
 *
 * Minimal test setup to fix esbuild compilation issues
 */

// Vitest setup - no longer using jest-dom
import { vi } from "vitest";

// Provide jest compatibility - check if not already defined
if (!globalThis.vi) {
	try {
		Object.defineProperty(globalThis, "jest", {
			value: vi,
			writable: true,
			configurable: true,
			enumerable: true,
		});
	} catch (e) {
		// Fallback if property definition fails
		(globalThis as any).jest = vi;
	}
}

// Fix jsdom navigation error
Object.defineProperty(window, "navigation", {
	value: {
		navigate: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
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

// Environment variables
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.VITEST = "true";
